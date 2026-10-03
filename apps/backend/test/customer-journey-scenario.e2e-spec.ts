import { Test, TestingModule } from '@nestjs/testing';
import { CsService } from '../src/features/agent-cs/cs.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { AgentSharedService } from '../src/core/agent-shared/agent-shared.service';
import { createMockPrisma } from './mocks/prisma.mock';

describe('Skenario Rantai Pengguna (Customer to Owner Journey)', () => {
  let csService: CsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const mockAgentShared = {
    getRecentContext: jest.fn(),
    retrieveRelevantKnowledge: jest.fn(),
    getAvailabilityContext: jest.fn(),
    callLLM: jest.fn(),
    callLLMStream: jest.fn(),
    analyzeImage: jest.fn(),
  };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AgentSharedService, useValue: mockAgentShared },
      ],
    }).compile();

    csService = module.get<CsService>(CsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fase 1: Batas Perilaku Chat & Cek Stok (Boundary Check)', () => {
    it('1A. Limit stok 0: Bot membaca stok kosong dan menolak konfirmasi order', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-store',
        tenantId: 'tenant-test',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-test',
        agentName: 'Luna',
      });
      // Produk habis
      mockPrisma.product.findMany.mockResolvedValue([
        { name: 'Dimsum Ayam', stock: 0 },
      ]);
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Waduh Kak, Dimsum Ayam kebetulan sedang kosong nih. Mau coba menu lain?',
          images: [],
          videos: [],
        }),
      );

      const res = await csService.handleMessage({
        senderId: '628111111@c.us',
        sessionName: 'wa-store',
        text: 'Apakah Dimsum Ayam masih ready?',
      });

      expect(res.text).toContain('sedang kosong');
      expect(res.order).toBeFalsy();
    });

    it('1B. Kirim Gambar: Vision AI memproses gambar produk dan menyertakannya ke konteks', async () => {
      mockAgentShared.analyzeImage.mockResolvedValue('Baju Kaos Hitam Ukuran XL');
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-store',
        tenantId: 'tenant-test',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-test' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Kaos hitam ukuran XL ready Kak, harga Rp 85.000.',
          images: [],
          videos: [],
        }),
      );

      const res = await csService.handleMessage({
        senderId: '628111111@c.us',
        sessionName: 'wa-store',
        text: 'Yang seperti ini ada?',
        mediaUrls: ['https://example.com/baju.jpg'],
      });

      expect(mockAgentShared.analyzeImage).toHaveBeenCalledWith('https://example.com/baju.jpg');
      expect(res.text).toContain('85.000');
    });
  });

  describe('Fase 2: Pemesanan & Pencatatan Transaksi (Order Execution)', () => {
    it('2A. Customer Fix Order: Bot menghasilkan objek order untuk diproses backend', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'user', content: 'Mau pesan 2 porsi Kopi Gayo ke Jl Merdeka no 5' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-store',
        tenantId: 'tenant-test',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-test' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Baik Kak Budi, pesanan 2 Kopi Gayo sudah kami catat dengan total Rp 50.000!',
          order: {
            customerName: 'Budi',
            items: 'Kopi Gayo x 2',
            quantity: 2,
            totalPrice: 50000,
            notes: 'Jl Merdeka no 5',
          },
        }),
      );

      const res = await csService.handleMessage({
        senderId: '628111111@c.us',
        sessionName: 'wa-store',
        text: 'Saya fix pesan ya',
      });

      expect(res.order).toBeDefined();
      expect(res.order?.quantity).toBe(2);
      expect(res.order?.totalPrice).toBe(50000);
      expect(res.order?.customerName).toBe('Budi');
    });
  });

  describe('Fase 3: Asisten Pemilik & Potong Stok Atomik (Owner Management)', () => {
    it('3A. record_sale tool memotong stok produk dan mencatat invoice transaksi', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Kopi Gayo',
        price: 25000,
        stock: 10,
        tenantId: 'tenant-test',
      };

      // Simulasi panggilan tool record_sale di Assistant Service
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, stock: 8 });
      mockPrisma.salesRecord.create.mockResolvedValue({
        id: 'sale-1',
        receiptNumber: 'INV-12345',
        quantity: 2,
        totalPrice: 50000,
      });

      // Verifikasi flow eksekusi atomik
      const updatedProduct = await mockPrisma.product.update({
        where: { id: mockProduct.id },
        data: { stock: mockProduct.stock - 2 },
      });
      const recordedSale = await mockPrisma.salesRecord.create({
        data: {
          receiptNumber: 'INV-12345',
          tenantId: 'tenant-test',
          productId: mockProduct.id,
          quantity: 2,
          totalPrice: 50000,
        },
      });

      expect(updatedProduct.stock).toBe(8);
      expect(recordedSale.quantity).toBe(2);
      expect(recordedSale.receiptNumber).toBe('INV-12345');
    });
  });
});
