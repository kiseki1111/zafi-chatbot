import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TestAppContext } from '../helpers/create-test-app';
import { ChatsModule } from '../../src/modules/chats/chats.module';
import { AvailabilityModule } from '../../src/modules/availability/availability.module';
import { WahaModule } from '../../src/modules/waha/waha.module';
import { AuthModule } from '../../src/features/web-dashboard/auth/auth.module';
import { KnowledgeModule } from '../../src/modules/knowledge/knowledge.module';
import { TenantModule } from '../../src/features/web-dashboard/tenant/tenant.module';

describe('Security Suite A: Route Guard Inventory & Whitelist Audit', () => {
  let context: TestAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SECURITY_BYPASS_MODE = 'false';
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'route_guard_inventory_secret_1234567890';

    context = await createTestApp({
      imports: [
        AuthModule,
        ChatsModule,
        AvailabilityModule,
        WahaModule,
        KnowledgeModule,
        TenantModule,
      ],
    });
    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Verifikasi Endpoint Sensitif Wajib Ditolak Tanpa Token (401)', () => {
    it('GET /api/v1/chats/stream tanpa token harus ditolak 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/chats/stream')
        .expect(401);
    });

    it('POST /api/v1/availability/groups/mock-id/generate-siteplan tanpa token harus 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/availability/groups/mock-id/generate-siteplan')
        .expect(401);
    });

    it('POST /api/v1/availability/groups/mock-id/save-layout tanpa token harus 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/availability/groups/mock-id/save-layout')
        .send({ layout: {} })
        .expect(401);
    });

    it('GET /api/v1/waha/instances/mock-id/logs tanpa token harus 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/waha/instances/mock-id/logs')
        .expect(401);
    });

    it('GET /api/v1/waha/cli-poll tanpa token harus 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/waha/cli-poll')
        .expect(401);
    });
  });

  describe('2. Negative Control: Endpoint Yang Sah Publik Tetap Terbuka Sesuai Desain', () => {
    it('POST /api/v1/auth/login dapat diakses tanpa token (bukan 401 unhandled guard)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'bad@user.com', passwordPlain: 'wrongpass' });
      // Menghasilkan 401 dari auth logic (kredensial salah), bukan guard error
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Alamat email atau password keliru');
    });

    it('GET /api/v1/availability/groups?tenantId=all tanpa token menghasilkan array kosong / aman tanpa bocor PII', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/availability/groups?tenantId=all')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});
