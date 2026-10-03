import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ModuleMetadata } from '@nestjs/common';
import { PrismaModule } from '../../src/core/prisma/prisma.module';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createMockPrisma } from '../mocks/prisma.mock';
import { createMockConfigService } from '../mocks/config-service.mock';

export interface TestAppContext {
  app: INestApplication;
  module: TestingModule;
  mockPrisma: ReturnType<typeof createMockPrisma>;
  mockConfig: ReturnType<typeof createMockConfigService>;
}

export async function createTestApp(
  metadata: ModuleMetadata,
  customizeBuilder?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestAppContext> {
  const mockPrisma = createMockPrisma();
  const mockConfig = createMockConfigService();

  const imports = [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ...(metadata.imports || []),
  ];

  let builder = Test.createTestingModule({
    ...metadata,
    imports,
  })
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .overrideProvider(ConfigService)
    .useValue(mockConfig);

  if (customizeBuilder) {
    builder = customizeBuilder(builder);
  }

  const module = await builder.compile();
  const app = module.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();

  return {
    app,
    module,
    mockPrisma,
    mockConfig,
  };
}
