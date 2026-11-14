import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../../src/features/web-dashboard/auth/auth.module';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { createMockConfigService } from '../mocks/config-service.mock';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mock_hashed_pw'),
}));

jest.mock('axios');

/**
 * Skenario: login chatbot via federasi ZAF Console (SSO). Console HANYA dipercaya untuk tenant yang
 * sudah ditautkan staf (Customer.chatbotTenantId) DAN sedang punya subscription Chatbot aktif -- lihat
 * SsoService di repo zafi-console. Semua panggilan ke Console di-mock lewat axios di sini; pembuktian
 * end-to-end terhadap Console asli (DB nyata) ada di zafi-console/apps/api/test/sso.e2e-spec.ts.
 */
describe('Skenario SSO: federasi login Chatbot <-> ZAF Console', () => {
  let context: TestAppContext;
  let app: INestApplication;
  const CONSOLE_SSO_KEY = 'e2e-test-console-sso-key-not-for-production-use';

  function buildApp(configOverrides: Record<string, any> = {}) {
    return createTestApp({ imports: [AuthModule] }, (builder) =>
      builder
        .overrideProvider(ConfigService)
        .useValue(createMockConfigService(configOverrides)),
    );
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  const login = (email: string, passwordPlain: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, passwordPlain });

  describe('CONSOLE_SSO_KEY belum diisi: federasi mati total, murni lokal', () => {
    beforeEach(async () => {
      context = await buildApp({ CONSOLE_SSO_KEY: undefined });
      app = context.app;
    });

    it('tidak pernah memanggil Console sama sekali', async () => {
      context.mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'legacy@example.com',
        password: 'hashed_pw',
        role: 'manager',
        tenantId: 'tenant-legacy',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await login('legacy@example.com', 'CorrectLocalPassword');

      expect(res.status).toBe(200);
      expect(res.body.user.tenantId).toBe('tenant-legacy');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('CONSOLE_SSO_KEY diisi: federasi aktif', () => {
    beforeEach(async () => {
      context = await buildApp({
        CONSOLE_SSO_KEY,
        CONSOLE_API_URL: 'http://console.local',
      });
      app = context.app;
    });

    it('memanggil endpoint Console yang benar dengan Bearer key yang benar', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: false, chatbotTenantId: null },
      });
      context.mockPrisma.user.findUnique.mockResolvedValue(null);

      await login('siapa@zafii.test', 'apapun');

      expect(axios.post).toHaveBeenCalledWith(
        'http://console.local/api/integration/v1/sso/verify',
        { email: 'siapa@zafii.test', password: 'apapun' },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${CONSOLE_SSO_KEY}`,
          }),
        }),
      );
    });

    it('REGRESSI (hijack): Console valid tapi belum ditautkan/tidak entitled TIDAK boleh membajak user lokal dengan email sama di tenant lain', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, chatbotTenantId: null },
      });
      context.mockPrisma.user.findUnique.mockResolvedValue({
        id: 'victim-1',
        email: 'owner@tokoA.com',
        password: 'hashed_password_asli_victim',
        role: 'manager',
        tenantId: 'tenant-victim',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // password attacker != password lokal victim

      const res = await login('owner@tokoA.com', 'password-attacker');

      expect(res.status).toBe(401);
      expect(context.mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('ditautkan tapi tenant itu tidak ada di database chatbot ini: tidak auto-provision, jatuh ke lokal lalu gagal (401)', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, chatbotTenantId: 'tenant-tidak-ada' },
      });
      context.mockPrisma.user.findUnique.mockResolvedValue(null);
      context.mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const res = await login('baru@zafii.test', 'apapun');

      expect(res.status).toBe(401);
      expect(context.mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('ditautkan DAN tenant ada: login berhasil, user dipasang (upsert) di tenant itu, cookie access_token terpasang', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { valid: true, chatbotTenantId: 'tenant-linked-001' },
      });
      context.mockPrisma.user.findUnique.mockResolvedValue(null); // belum pernah login lewat chatbot
      context.mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-linked-001' });
      context.mockPrisma.user.upsert.mockResolvedValue({
        id: 'u-new',
        email: 'owner@linked.com',
        name: 'owner',
        role: 'manager',
        tenantId: 'tenant-linked-001',
        tenant: { id: 'tenant-linked-001', metadata: {} },
      });

      const res = await login('owner@linked.com', 'apapun-yang-valid-di-console');

      expect(res.status).toBe(200);
      expect(res.body.user.tenantId).toBe('tenant-linked-001');
      expect(res.headers['set-cookie']?.[0]).toContain('access_token=');
      expect(context.mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'owner@linked.com' } }),
      );
    });

    it('Console tidak terjangkau (network error): jatuh ke pengecekan password lokal, tetap bisa login', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      context.mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'offline@example.com',
        password: 'hashed_pw',
        role: 'manager',
        tenantId: 'tenant-offline',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await login('offline@example.com', 'CorrectLocalPassword');

      expect(res.status).toBe(200);
      expect(res.body.user.tenantId).toBe('tenant-offline');
    });

    it('Console membalas bentuk data tak terduga (bukan {valid,chatbotTenantId}): diperlakukan sebagai tidak dipercaya, bukan crash', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: {} });
      context.mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await login('entah@zafii.test', 'apapun');

      expect(res.status).toBe(401);
    });

    /**
     * Jawaban langsung untuk "kalau akun di Console baru diberi subscription Chatbot, apakah langsung
     * bisa terkoneksi tanpa restart apa pun?" -- dari sisi chatbot: SETIAP login memanggil Console
     * secara real-time, tidak ada cache di antaranya. Dua panggilan login berurutan dengan jawaban
     * Console yang BERUBAH (meniru staf menautkan + pelanggan subscribe di antara dua percobaan login)
     * harus langsung menghasilkan hasil yang berbeda, tanpa restart proses apa pun.
     */
    it('SKENARIO UTAMA: login #1 sebelum subscription (gagal) -> login #2 setelah subscription aktif di Console (berhasil), tanpa restart apa pun', async () => {
      // Login #1: pelanggan sudah daftar & ditautkan staf, TAPI belum subscribe Chatbot -- Console
      // membalas chatbotTenantId: null (lihat SsoService.isEntitledToChatbot).
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, chatbotTenantId: null },
      });
      context.mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const first = await login('progressif@zafii.test', 'PasswordSama123');
      expect(first.status).toBe(401);
      expect(context.mockPrisma.user.upsert).not.toHaveBeenCalled();

      // Pelanggan subscribe paket Chatbot di Console (status jadi ACTIVE) -- di sisi Console ini
      // sudah dibuktikan langsung tercermin di sso.e2e-spec.ts. Di sini: panggilan login BERIKUTNYA
      // (tanpa restart proses chatbot apa pun) langsung memakai jawaban baru itu.
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { valid: true, chatbotTenantId: 'tenant-progresif-001' },
      });
      context.mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      context.mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 'tenant-progresif-001',
      });
      context.mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 'u-progresif',
        email: 'progressif@zafii.test',
        name: 'progressif',
        role: 'manager',
        tenantId: 'tenant-progresif-001',
        tenant: { id: 'tenant-progresif-001', metadata: {} },
      });

      const second = await login('progressif@zafii.test', 'PasswordSama123');
      expect(second.status).toBe(200);
      expect(second.body.user.tenantId).toBe('tenant-progresif-001');
    });
  });
});
