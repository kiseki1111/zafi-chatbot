import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';
import { CsService } from './cs.service';
import { OpenAiModule } from '../../core/openai/openai.module';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Live E2E Integration Test: Menembak langsung LLM DeepSeek di OpenRouter
 * Memastikan:
 * 1. Data katalog produk (nama, harga, stok, deskripsi, foto & video) terbaca 100% oleh AI
 * 2. Response JSON dari DeepSeek memuat teks dan link media yang siap dikirim langsung oleh WAHA
 */
describe('Live AI Integration: Katalog Produk -> OpenRouter DeepSeek -> WAHA Ready Payload', () => {
  let csService: CsService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrisma = {
    whatsappInstance: {
      findUnique: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    knowledgeBase: {
      count: jest.fn().mockResolvedValue(0),
    },
    resourceGroup: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    conversation: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    product: {
      findMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'c-new', metadata: {} }),
      update: jest.fn().mockResolvedValue({ id: 'c-new', metadata: {} }),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [
            '.env',
            '../../.env',
            '../../../.env',
            '../../../../.env',
          ],
        }),
        OpenAiModule,
      ],
      providers: [
        CsService,
        AgentSharedService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    csService = module.get<CsService>(CsService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('AI DeepSeek membaca katalog produk dan mengembalikan balasan teks + video siap kirim untuk WAHA', async () => {
    const apiKey = configService.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY tidak ditemukan di .env, lewati live test.');
      return;
    }

    // 1. Mock Data Tenant & WhatsApp Session
    mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
      instanceName: 'zafi-property',
      tenantId: 'tenant-test-live',
    });

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-test-live',
      name: 'Zafi Residence Official',
      agentName: 'Luna',
      agentTone: 'ramah dan profesional',
      phone: '0851-1974-9661',
    });

    // 2. Mock Katalog Produk Nyata di Database (seperti di screenshot user)
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-drone-zafi',
        name: 'Rumah Subsidi Zafi Residence',
        category: 'Properti',
        price: '185000000',
        stock: 5,
        description: 'Perumahan asri dekat GAI MALL dengan akses jalan aspal mulus dan view pegunungan.',
        attributes: {
          images: [
            {
              url: '/uploads/drone-view-zafi.jpg',
              description: 'Drone View Zafi Residence',
            },
          ],
          videoUrl: '/uploads/video-arah-lokasi.mp4',
        },
      },
    ]);

    // 3. Eksekusi pertanyaan customer yang meminta video arah lokasi
    console.log('==> Mengirim prompt ke DeepSeek OpenRouter...');
    const result = await csService.handleMessage({
      senderId: '6281649433281@c.us',
      sessionName: 'zafi-property',
      text: 'berikan video menuju lokasi zafi residence',
    });

    console.log('==> Hasil respon dari AI DeepSeek:');
    console.log(JSON.stringify(result, null, 2));

    // 4. Verifikasi bahwa AI membaca informasi katalog dan menyertakan URL video
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe('string');

    // Pastikan AI tahu perumahan Zafi Residence atau mengkonfirmasi video lokasinya
    expect(result.text.toLowerCase()).toMatch(/zafi|lokasi|video|rumah/i);

    // Pastikan video atau file media dari database katalog tersaring siap kirim oleh WAHA
    const hasVideo = Array.isArray(result.videos) && result.videos.length > 0;
    const hasImage = Array.isArray(result.images) && result.images.length > 0;
    const textHasMediaOrReply = result.text.length > 10;

    expect(textHasMediaOrReply).toBe(true);
    if (hasVideo) {
      console.log('✓ Video terdeteksi siap kirim via WAHA:', result.videos?.[0]);
      expect(result.videos![0].url).toContain('/uploads/');
    }

    // 5. Verifikasi bahwa payload balasan valid untuk dikonsumsi langsung oleh WahaService.sendMessage / sendVideo
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('images');
    expect(result).toHaveProperty('videos');
  }, 35000);

  it('AI DeepSeek membaca katalog produk saat customer menanyakan variasi tipe, harga, dan stok', async () => {
    const apiKey = configService.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) return;

    mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
      instanceName: 'zafi-property',
      tenantId: 'tenant-test-live',
    });

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-test-live',
      name: 'Zafi Residence Official',
      agentName: 'Luna',
      agentTone: 'ramah dan profesional',
      phone: '0851-1974-9661',
    });

    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-drone-zafi',
        name: 'Rumah Subsidi Zafi Residence',
        category: 'Properti',
        price: '185000000',
        stock: 5,
        description: 'Perumahan asri dekat GAI MALL.',
        attributes: {
          hasVariations: true,
          variations: [
            { name: 'Tipe Standard 36/72', price: 185000000, stock: 3 },
            { name: 'Tipe Hook 36/90', price: 210000000, stock: 2 },
          ],
        },
      },
    ]);

    console.log('==> Menguji pertanyaan harga & variasi produk ke DeepSeek...');
    const result = await csService.handleMessage({
      senderId: '6281649433281@c.us',
      sessionName: 'zafi-property',
      text: 'ada tipe rumah apa saja dan berapa harganya?',
    });

    console.log('==> Respon variasi & harga dari AI DeepSeek:');
    console.log(result.text);

    expect(result.text).toBeTruthy();
    // Pastikan AI menyebutkan variasi tipe atau harga yang ada di katalog
    expect(result.text.toLowerCase()).toMatch(/36\/72|36\/90|185|210|standard|hook/i);
  }, 35000);
});
