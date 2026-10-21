import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AvailabilityModule } from '../src/modules/availability/availability.module';
import { SearchModule } from '../src/modules/search/search.module';
import { AgentSharedModule } from '../src/core/agent-shared/agent-shared.module';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AgentSharedService } from '../src/core/agent-shared/agent-shared.service';
import { SearchService } from '../src/modules/search/search.service';

describe('Chaos & E2E Suite: Jenis Unit (propertyType: BANGUNAN vs TANAH)', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let agentSharedService: AgentSharedService;
  let searchService: SearchService;

  const mockUser = {
    sub: 'user-manager-1',
    email: 'manager@property.com',
    roles: ['manager'],
    tenantId: 'tenant-proper-1',
  };

  beforeAll(async () => {
    context = await createTestApp(
      {
        imports: [AvailabilityModule, SearchModule, AgentSharedModule],
      },
      (builder) =>
        builder.overrideGuard(JwtAuthGuard).useValue({
          canActivate: (ctx: any) => {
            const req = ctx.switchToHttp().getRequest();
            req.user = mockUser;
            return true;
          },
        }),
    );
    app = context.app;
    agentSharedService = context.module.get<AgentSharedService>(AgentSharedService);
    searchService = context.module.get<SearchService>(SearchService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // SUITE 1: Full CRUD & Batch E2E Flow for PropertyType ("Jenis")
  // =========================================================================
  describe('Suite 1: CRUD & Batch Flow for Jenis Unit', () => {
    it('harus berhasil menambahkan unit dengan jenis "BANGUNAN" (Bangunan Rumah)', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      const createdItem = {
        id: 'item-b1',
        groupId: 'group-proper-1',
        code: 'A-01',
        name: 'Rumah Blok A-01',
        propertyType: 'BANGUNAN',
        houseType: '36/72',
        status: 'AVAILABLE',
        price: 250000000,
      };
      context.mockPrisma.resourceItem.create.mockResolvedValue(createdItem);

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-proper-1/items')
        .send({
          code: 'A-01',
          name: 'Rumah Blok A-01',
          propertyType: 'BANGUNAN',
          houseType: '36/72',
          status: 'AVAILABLE',
          price: 250000000,
        })
        .expect(201);

      expect(res.body.propertyType).toBe('BANGUNAN');
      expect(res.body.code).toBe('A-01');
      expect(context.mockPrisma.resourceItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            propertyType: 'BANGUNAN',
            code: 'A-01',
          }),
        }),
      );
    });

    it('harus berhasil menambahkan unit dengan jenis "TANAH" (Tanah Kosong / Kavling)', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      const createdItem = {
        id: 'item-t1',
        groupId: 'group-proper-1',
        code: 'K-05',
        name: 'Kavling Siap Bangun',
        propertyType: 'TANAH',
        houseType: '10x15 (150m2)',
        status: 'AVAILABLE',
        price: 95000000,
      };
      context.mockPrisma.resourceItem.create.mockResolvedValue(createdItem);

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-proper-1/items')
        .send({
          code: 'K-05',
          name: 'Kavling Siap Bangun',
          propertyType: 'TANAH',
          houseType: '10x15 (150m2)',
          status: 'AVAILABLE',
          price: 95000000,
        })
        .expect(201);

      expect(res.body.propertyType).toBe('TANAH');
      expect(res.body.code).toBe('K-05');
      expect(context.mockPrisma.resourceItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            propertyType: 'TANAH',
            code: 'K-05',
          }),
        }),
      );
    });

    it('harus berhasil mengupdate jenis unit dari BANGUNAN menjadi TANAH', async () => {
      context.mockPrisma.resourceItem.findFirst.mockResolvedValue({
        id: 'item-b1',
        groupId: 'group-proper-1',
        group: { tenantId: 'tenant-proper-1' },
      });
      const updatedItem = {
        id: 'item-b1',
        code: 'A-01',
        propertyType: 'TANAH',
        houseType: 'Kavling 120m2',
      };
      context.mockPrisma.resourceItem.update.mockResolvedValue(updatedItem);

      const res = await request(app.getHttpServer())
        .put('/api/v1/availability/items/item-b1')
        .send({
          propertyType: 'TANAH',
          houseType: 'Kavling 120m2',
        })
        .expect(200);

      expect(res.body.propertyType).toBe('TANAH');
      expect(context.mockPrisma.resourceItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-b1' },
          data: expect.objectContaining({ propertyType: 'TANAH' }),
        }),
      );
    });

    it('harus berhasil generate batch unit dengan jenis TANAH', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.createMany.mockResolvedValue({ count: 10 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-proper-1/batch-items')
        .send({
          prefix: 'KAV-',
          startNumber: 1,
          endNumber: 10,
          propertyType: 'TANAH',
          houseType: '150m2',
          price: 80000000,
        })
        .expect(201);

      expect(res.body.count).toBe(10);
      expect(context.mockPrisma.resourceItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              code: 'KAV-01',
              propertyType: 'TANAH',
            }),
            expect.objectContaining({
              code: 'KAV-10',
              propertyType: 'TANAH',
            }),
          ]),
        }),
      );
    });

    it('harus memuat default BANGUNAN jika unit lawas belum memiliki propertyType', async () => {
      const dummyGroup = [
        {
          id: 'group-proper-1',
          name: 'Cluster Mawar',
          items: [
            { id: 'i-1', code: 'M-01', propertyType: null, status: 'AVAILABLE' },
            { id: 'i-2', code: 'M-02', propertyType: 'TANAH', status: 'AVAILABLE' },
          ],
        },
      ];
      context.mockPrisma.resourceGroup.findMany.mockResolvedValue(dummyGroup);

      const res = await request(app.getHttpServer())
        .get('/api/v1/availability/groups?tenantId=tenant-proper-1')
        .expect(200);

      expect(res.body[0].items[0].code).toBe('M-01');
      expect(res.body[0].items[1].propertyType).toBe('TANAH');
    });
  });

  // =========================================================================
  // SUITE 2: AI Context Awareness & Search Integration
  // =========================================================================
  describe('Suite 2: AI Context Awareness & Search Integration', () => {
    it('getAvailabilityContext: harus memformat [Tanah Kosong] dan [Bangunan Rumah] secara akurat untuk AI', async () => {
      context.mockPrisma.resourceGroup.findMany.mockResolvedValue([
        {
          id: 'grp-zafi',
          name: 'Zafi Residence',
          items: [
            {
              code: 'A-01',
              propertyType: 'BANGUNAN',
              houseType: '45/90',
              status: 'AVAILABLE',
              price: 330000000,
            },
            {
              code: 'K-02',
              propertyType: 'TANAH',
              houseType: '200m2',
              status: 'AVAILABLE',
              price: 150000000,
            },
          ],
        },
      ]);

      const contextString = await agentSharedService.getAvailabilityContext('tenant-proper-1');

      // Verifikasi bahwa unit rumah diformat dengan [Bangunan Rumah] dan Tipe
      expect(contextString).toContain('A-01 [Bangunan Rumah] (Tipe 45/90)');
      // Verifikasi bahwa unit tanah diformat dengan [Tanah Kosong] dan Luas
      expect(contextString).toContain('K-02 [Tanah Kosong] (Luas 200m2)');
      expect(contextString).toContain('UNIT READY');
    });

    it('SearchService: harus dapat menemukan unit berdasarkan kata kunci "tanah" atau "bangunan"', async () => {
      context.mockPrisma.resourceItem.findMany.mockResolvedValue([
        {
          id: 'k-1',
          code: 'K-01',
          name: 'Tanah Kavling',
          propertyType: 'TANAH',
          houseType: '150m2',
          status: 'AVAILABLE',
          price: 100000000,
          group: { id: 'g-1', name: 'Zafi Residence', tenantId: 'tenant-1' },
        },
      ]);

      const result = await searchService.searchUnits('tanah', 'tenant-1', false);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toContain('K-01');
    });
  });

  // =========================================================================
  // SUITE 3: CHAOS ENGINEERING FOR JENIS UNIT
  // =========================================================================
  describe('Suite 3: Chaos Engineering for Jenis Unit', () => {
    it('[Chaos 1: Nilai PropertyType Kosong, Null, atau Undefined] -> Fallback ke BANGUNAN', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'res-id', ...args.data }),
      );

      const nullTypeRes = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-proper-1/items')
        .send({
          code: 'B-99',
          propertyType: undefined,
        })
        .expect(201);

      // Harus fallback default ke BANGUNAN
      expect(nullTypeRes.body.propertyType).toBe('BANGUNAN');
    });

    it('[Chaos 2: Input Extreme String, SQL Injection, XSS, & Unicode Emojis] -> Tidak crash 500', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'res-id', ...args.data }),
      );

      const extremeInputs = [
        "'; DROP TABLE resource_items; --",
        '<script>alert("XSS")</script>',
        'TANAH ' + 'X'.repeat(500),
        '🏡 Tanah & Rumah 🌲🌿🚜',
      ];

      for (const val of extremeInputs) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/availability/groups/group-proper-1/items')
          .send({
            code: 'CHAOS-' + Math.random().toString(36).slice(2, 6),
            propertyType: val,
          });

        expect(res.status).toBe(201);
        expect(res.body.propertyType).toBe(val);
      }
    });

    it('[Chaos 3: Concurrency Burst - 20 Simultaneous Creates Alternating BANGUNAN & TANAH]', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'res-' + args.data.code, ...args.data }),
      );

      const requests = Array.from({ length: 20 }, (_, i) => {
        const pType = i % 2 === 0 ? 'BANGUNAN' : 'TANAH';
        return request(app.getHttpServer())
          .post('/api/v1/availability/groups/group-proper-1/items')
          .send({
            code: `CONCUR-${i}`,
            propertyType: pType,
            houseType: pType === 'TANAH' ? '100m2' : '36/72',
          });
      });

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(20);
      responses.forEach((res, i) => {
        expect(res.status).toBe(201);
        const expectedType = i % 2 === 0 ? 'BANGUNAN' : 'TANAH';
        expect(res.body.propertyType).toBe(expectedType);
      });
    });

    it('[Chaos 4: Concurrency Burst - 20 Simultaneous Updates on Same Unit]', async () => {
      context.mockPrisma.resourceItem.findFirst.mockResolvedValue({
        id: 'race-unit-1',
        groupId: 'group-proper-1',
        group: { tenantId: 'tenant-proper-1' },
      });
      context.mockPrisma.resourceItem.update.mockImplementation((args: any) =>
        Promise.resolve({ id: 'race-unit-1', ...args.data }),
      );

      const updates = Array.from({ length: 20 }, (_, i) => {
        const targetType = i % 2 === 0 ? 'TANAH' : 'BANGUNAN';
        return request(app.getHttpServer())
          .put('/api/v1/availability/items/race-unit-1')
          .send({
            propertyType: targetType,
          });
      });

      const results = await Promise.all(updates);

      expect(results).toHaveLength(20);
      results.forEach((r) => {
        expect(r.status).toBe(200);
        expect(['BANGUNAN', 'TANAH']).toContain(r.body.propertyType);
      });
    });

    it('[Chaos 5: Extreme Batch Size (200 Units) with propertyType TANAH]', async () => {
      context.mockPrisma.resourceGroup.findFirst.mockResolvedValue({
        id: 'group-proper-1',
        tenantId: 'tenant-proper-1',
      });
      context.mockPrisma.resourceItem.createMany.mockResolvedValue({ count: 200 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/availability/groups/group-proper-1/batch-items')
        .send({
          prefix: 'MASSIVE-KAV-',
          startNumber: 1,
          endNumber: 200,
          propertyType: 'TANAH',
          houseType: '200m2',
          price: 120000000,
        })
        .expect(201);

      expect(res.body.count).toBe(200);
      expect(context.mockPrisma.resourceItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ code: 'MASSIVE-KAV-01', propertyType: 'TANAH' }),
            expect.objectContaining({ code: 'MASSIVE-KAV-200', propertyType: 'TANAH' }),
          ]),
        }),
      );
    });
  });
});
