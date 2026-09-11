# Phase 3 & 4: Production Quality + Testing

> Generated from full codebase audit. All items are actionable tasks with exact file paths and line numbers.

---

## Phase 3: Production Quality

### 3.1 Input Validation DTOs

Buat DTO class dengan `class-validator` untuk semua write endpoints. Style: class sederhana dengan decorator, error message Indonesia.

**Dependencies sudah ada:** `class-validator@^0.15.1`, `class-transformer@^0.5.1`, `ValidationPipe` global sudah aktif di `main.ts:38-44`.

#### 3.1.1 Tenant DTOs

**File baru:** `apps/backend/src/features/web-dashboard/tenant/dto/`

| DTO | Field | Endpoint |
|---|---|---|
| `update-settings.dto.ts` | `agentName?`, `agentTone?`, `phone?`, `greetingMsg?`, `ownerChatId?`, `systemPrompt?`, `operatingHours?`, `address?` | `PATCH /api/v1/tenant/:userId/settings` |
| `create-product.dto.ts` | `name` (@IsString @IsNotEmpty), `category` (@IsString @IsNotEmpty), `price` (@IsNumber @IsPositive), `stock` (@IsNumber @IsInt @Min(0)), `description?`, `attributes?` | `POST /api/v1/tenant/:userId/products` |
| `update-product.dto.ts` | Semua field optional kecuali validasi tipe tetap berlaku | `PATCH /api/v1/tenant/:userId/products/:productId` |
| `create-knowledge.dto.ts` | `content` (@IsString @IsNotEmpty) | `POST /api/v1/tenant/:userId/knowledge` |
| `update-knowledge.dto.ts` | `content` (@IsString @IsNotEmpty) | `PATCH /api/v1/tenant/:userId/knowledge/:knowledgeId` |

**Update:** `apps/backend/src/features/web-dashboard/tenant/tenant.controller.ts`
- Ganti inline `@Body()` type dengan DTO class
- Tambahkan import DTO

#### 3.1.2 WAHA DTOs

**File baru:** `apps/backend/src/modules/waha/dto/`

| DTO | Field | Endpoint |
|---|---|---|
| `create-instance.dto.ts` | `name` (@IsString @IsNotEmpty), `webhookUrl?` (@IsOptional @IsUrl), `channelAccountId?`, `tenantId?` | `POST /api/v1/waha/instances` |
| `send-message.dto.ts` | `chatId` (@IsString @IsNotEmpty), `text` (@IsString @IsNotEmpty) | `POST /api/v1/waha/instances/:id/send` |

**Update:** `apps/backend/src/modules/waha/waha.controller.ts`
- Ganti inline body types dengan DTO class
- Skip DTO untuk webhook endpoint (terlalu dinamis)

#### 3.1.3 Availability DTOs

**File baru:** `apps/backend/src/modules/availability/dto/`

| DTO | Field | Endpoint |
|---|---|---|
| `create-group.dto.ts` | `name` (@IsString @IsNotEmpty), `category?`, `description?`, `siteplanImage?` | `POST /api/v1/availability/groups` |
| `update-group.dto.ts` | `name?`, `category?`, `description?`, `siteplanImage?` | `PUT /api/v1/availability/groups/:id` |
| `create-item.dto.ts` | `code` (@IsString @IsNotEmpty), `name?`, `houseType?`, `status?` (@IsOptional @IsIn(['AVAILABLE','RESERVED','SOLD'])), `price?` (@IsOptional @IsNumber), `capacity?`, `notes?`, `customerName?`, `customerPhone?` | `POST /api/v1/availability/groups/:groupId/items` |
| `update-item.dto.ts` | Semua field optional | `PUT /api/v1/availability/items/:id` |
| `batch-items.dto.ts` | `prefix` (@IsString @IsNotEmpty), `startNumber` (@IsNumber @IsInt), `endNumber` (@IsNumber @IsInt), `houseType?`, `price?` | `POST /api/v1/availability/groups/:groupId/batch-items` |

**Update:** `apps/backend/src/modules/availability/availability.controller.ts`

#### 3.1.4 Follow-Up DTOs

**File baru:** `apps/backend/src/modules/waha/follow-up/dto/`

| DTO | Field | Endpoint |
|---|---|---|
| `update-followup-config.dto.ts` | `isEnabled?` (@IsOptional @IsBoolean), `scheduleTime?` (@IsOptional @IsString), `inactivityHours?` (@IsOptional @IsNumber @IsInt @Min(1) @Max(168)), `followUpPrompt?` (@IsOptional @IsString) | `PUT /api/v1/followup/config` |
| `trigger-followup.dto.ts` | `instanceName?` (@IsOptional @IsString) | `POST /api/v1/followup/trigger` |

**Update:** `apps/backend/src/modules/waha/follow-up/follow-up.controller.ts`

#### 3.1.5 Knowledge DTOs

**File baru:** `apps/backend/src/modules/knowledge/dto/`

| DTO | Field | Endpoint |
|---|---|---|
| `create-knowledge-text.dto.ts` | `title` (@IsString @IsNotEmpty), `content` (@IsString @IsNotEmpty) | `POST /api/v1/knowledge/text` |
| `update-knowledge.dto.ts` | `title` (@IsString @IsNotEmpty), `content` (@IsString @IsNotEmpty), `tenantId?` | `PUT /api/v1/knowledge/:id` |

**Update:** `apps/backend/src/modules/knowledge/knowledge.controller.ts`

#### 3.1.6 Simulator DTO

**File baru:** `apps/backend/src/features/simulator/dto/`

| DTO | Field | Endpoint |
|---|---|---|
| `simulator.dto.ts` | `message` (@IsString @IsNotEmpty), `simulateAs` (@IsIn(['customer','owner'])), `tenantId` (@IsString), `chatId` (@IsString) | `POST /api/v1/agent/simulator` |

**Update:** `apps/backend/src/features/simulator/simulator.controller.ts`

#### 3.1.7 Auth DTO

**File baru:** `apps/backend/src/features/web-dashboard/auth/dto/refresh-token.dto.ts`

| DTO | Field | Endpoint |
|---|---|---|
| `refresh-token.dto.ts` | `userId` (@IsString @IsNotEmpty), `refreshTokenPlain` (@IsString @IsNotEmpty) | `POST /api/v1/auth/refresh` |

**Update:** `apps/backend/src/features/web-dashboard/auth/controllers/auth.controller.ts`

---

### 3.2 Consistent Error Handling

#### 3.2.1 Replace `console.error/warn` dengan NestJS Logger

| File | Lines | Change |
|---|---|---|
| `modules/knowledge/knowledge.service.ts` | 65, 68, 110, 113, 134 | Tambah `private readonly logger = new Logger(KnowledgeService.name)` di class, ganti `console.warn` → `this.logger.warn`, `console.error` → `this.logger.error` |
| `modules/availability/availability.service.ts` | 28, 54 | Tambah `private readonly logger = new Logger(AvailabilityService.name)` di class, ganti `console.error` → `this.logger.error` |

#### 3.2.2 Add Logging ke Silent `.catch(() => null)`

| File | Line | Change |
|---|---|---|
| `modules/waha/waha.service.ts` | 62 | `.catch((e) => { this.logger.warn(`Tenant lookup failed for startSession: ${e.message}`); return null; })` |
| `modules/waha/waha.controller.ts` | 70 | `.catch((e) => { this.logger.warn(`Failed to delete instance from DB: ${e.message}`); })` |
| `modules/waha/waha.controller.ts` | 148 | `.catch((e) => { this.logger.warn(`Failed to mark message as SENT: ${e.message}`); })` |
| `modules/waha/waha.controller.ts` | 154 | `.catch((e) => { this.logger.warn(`Failed to mark message as ERROR: ${e.message}`); })` |
| `modules/waha/waha.controller.ts` | 189 | `.catch((e) => { this.logger.warn(`Failed to upsert instance in webhook: ${e.message}`); })` |

---

### 3.3 SQL Injection Fix

**File:** `features/agent-assistant/agent-assistant.service.ts`
**Lines:** 655-660

**Sebelum:**
```ts
if (type === 'percentage') {
  const multiplier = 1 + (amount / 100);
  await this.prisma.$executeRawUnsafe(
    `UPDATE products SET price = price * ${multiplier} WHERE tenant_id = $1`, tenantId
  );
} else {
  await this.prisma.$executeRawUnsafe(
    `UPDATE products SET price = price + ${amount} WHERE tenant_id = $1`, tenantId
  );
}
```

**Sesudah:**
```ts
if (type === 'percentage') {
  const multiplier = 1 + (amount / 100);
  await this.prisma.$executeRawUnsafe(
    'UPDATE products SET price = price * $2::numeric WHERE tenant_id = $1',
    tenantId,
    multiplier,
  );
} else {
  await this.prisma.$executeRawUnsafe(
    'UPDATE products SET price = price + $2::numeric WHERE tenant_id = $1',
    tenantId,
    amount,
  );
}
```

---

### 3.4 Atomic Transaction for `record_sale`

**File:** `features/agent-assistant/agent-assistant.service.ts`
**Lines:** 386-449

Wrap stock decrement + `salesRecord.create` dalam `this.prisma.$transaction(async (tx) => { ... })`.

**Detail:**
1. Pindahkan `product.findFirst` ke dalam transaction
2. Pindahkan `product.update` (stock decrement) ke dalam transaction
3. Pindahkan `salesRecord.create` ke dalam transaction
4. Return result dari transaction, lalu proses response di luar transaction
5. Jika transaction gagal, return error message

---

### 3.5 Deduplicate OpenAI Clients

#### 3.5.1 KnowledgeAiService

**File:** `features/knowledge-ingest/services/knowledge-ai.service.ts`

**Sebelum:**
```ts
import OpenAI from 'openai';
// ...
private openai: OpenAI;
constructor(private readonly configService: ConfigService) {
  this.openai = new OpenAI({ apiKey: this.configService.get<string>('OPENAI_API_KEY') });
}
```

**Sesudah:**
```ts
import { Inject, Injectable } from '@nestjs/common';
import { OPENAI_CLIENT } from '../../../core/openai/openai.module';
import type OpenAI from 'openai';
// ...
private openai: OpenAI | null;
constructor(@Inject(OPENAI_CLIENT) openaiClient: OpenAI | null) {
  this.openai = openaiClient;
}
```

Tambah null check di semua method yang menggunakan `this.openai`.

#### 3.5.2 ImageParser

**File:** `features/knowledge-ingest/services/parsers/image-parser.ts`

Sama seperti 3.5.1 — inject `OPENAI_CLIENT` instead of `new OpenAI()`.

---

## Phase 4: Testing

### 4.1 Test Infrastructure Setup

#### 4.1.1 Create Directory Structure

```
apps/backend/test/
├── jest-e2e.json
├── mocks/
│   ├── prisma.mock.ts
│   └── config-service.mock.ts
└── helpers/
    └── create-test-module.ts
```

#### 4.1.2 `test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

#### 4.1.3 `test/mocks/prisma.mock.ts`

Buat factory function yang return mock PrismaService dengan semua method yang dibutuhkan (findUnique, findMany, create, update, delete, count, $transaction, $executeRawUnsafe).

```ts
export const createMockPrisma = () => ({
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  tenant: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  contact: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  conversation: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  message: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  product: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
  knowledgeBase: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  followUp: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
  followUpConfig: { findUnique: jest.fn(), upsert: jest.fn() },
  salesRecord: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
  resourceGroup: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  resourceItem: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  whatsappInstance: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
  $executeRawUnsafe: jest.fn(),
});
```

#### 4.1.4 `test/mocks/config-service.mock.ts`

```ts
export const createMockConfigService = (overrides?: Record<string, string>) => ({
  get: jest.fn((key: string) => overrides?.[key] ?? process.env[key] ?? null),
});
```

#### 4.1.5 `test/helpers/create-test-module.ts`

Helper untuk create TestingModule dengan mock defaults.

#### 4.1.6 Update `apps/backend/package.json`

Pastikan `test:e2e` script ada dan指向正确:
```json
"test:e2e": "jest --config ./test/jest-e2e.json"
```

---

### 4.2 Unit Tests

#### 4.2.1 Auth Service Tests

**File baru:** `apps/backend/src/features/web-dashboard/auth/auth.service.spec.ts`

**Test cases:**
- `login()` — correct credentials → returns user + tokens
- `login()` — wrong password → throws UnauthorizedException
- `login()` — non-existent email → throws UnauthorizedException
- `register()` — valid data → creates user + returns tokens
- `register()` — duplicate email → throws ConflictException
- `refreshToken()` — valid refresh token → returns new token pair
- `refreshToken()` — invalid/expired token → throws UnauthorizedException
- `logout()` — valid token → deletes refresh token from DB

**Dependencies to mock:** PrismaService, JwtService, ConfigService

#### 4.2.2 CS Service Tests

**File baru:** `apps/backend/src/features/agent-cs/cs.service.spec.ts`

**Test cases:**
- `handleIncomingMessage()` — text message → calls LLM, returns response
- `handleIncomingMessage()` — image message → calls analyzeImage, returns response
- `handleIncomingMessage()` — with knowledge → includes knowledge in context
- `handleIncomingMessage()` — stock query → includes real-time stock data
- `handleIncomingMessage()` — LLM returns JSON with text → returns text response
- `handleIncomingMessage()` — LLM returns JSON with order → creates order
- `handleIncomingMessage()` — LLM fails → returns fallback message

**Dependencies to mock:** PrismaService, AgentSharedService, WahaService, OmnichannelQueue

#### 4.2.3 Tenant Service Tests

**File baru:** `apps/backend/src/features/web-dashboard/tenant/tenant.service.spec.ts`

**Test cases:**
- `getDashboardOverview()` — returns correct metrics structure
- `getDashboardOverview()` — tenant with no data → returns zeros
- `createProduct()` — valid data → creates product + syncs knowledge
- `updateProduct()` — valid data → updates product
- `deleteProduct()` — product exists → deletes product
- `deleteProduct()` — product has sales → throws error

**Dependencies to mock:** PrismaService, KnowledgeService, AgentSharedService

#### 4.2.4 Follow-Up Service Tests

**File baru:** `apps/backend/src/modules/waha/follow-up/follow-up.service.spec.ts`

**Test cases:**
- `getConfig()` — no config exists → creates default
- `getConfig()` — config exists → returns existing
- `getInactiveContacts()` — with inactive contacts → returns filtered list
- `getInactiveContacts()` — contact already followed up → excluded
- `getInactiveContacts()` — all contacts active → returns empty
- `generateFollowUpMessage()` — no recent messages → returns default message
- `generateFollowUpMessage()` — has recent messages → calls LLM
- `processFollowUps()` — enabled + inactive contacts → processes all
- `processFollowUps()` — disabled → returns processed:0

**Dependencies to mock:** PrismaService, AgentSharedService, WahaService

#### 4.2.5 Agent-Assistant Service Tests

**File baru:** `apps/backend/src/features/agent-assistant/agent-assistant.service.spec.ts`

**Test cases:**
- `record_sale` tool — valid product → decrements stock + creates sales record
- `record_sale` tool — product not found → returns error message
- `record_sale` tool — with variant → decrements variant stock
- `build_sales_query` tool — valid params → executes SQL query
- `bulk_update_price` tool — percentage type → applies multiplier correctly
- `bulk_update_price` tool — fixed type → adds amount correctly

**Dependencies to mock:** PrismaService, AgentSharedService, KnowledgeService

---

### 4.3 E2E Tests

#### 4.3.1 Auth Flow E2E

**File baru:** `apps/backend/test/auth.e2e-spec.ts`

**Flow:**
1. `POST /api/v1/auth/register` → 201, returns user + tokens
2. `POST /api/v1/auth/login` → 200, returns user + tokens
3. `GET /api/v1/tenant/{userId}/dashboard` with valid token → 200
4. `GET /api/v1/tenant/{userId}/dashboard` without token → 401
5. `POST /api/v1/auth/logout` with valid token → 200

**Setup:** Gunakan test database atau mock Prisma di module test.

#### 4.3.2 Knowledge Flow E2E

**File baru:** `apps/backend/test/knowledge.e2e-spec.ts`

**Flow:**
1. `POST /api/v1/knowledge/text` → 201, creates knowledge
2. `GET /api/v1/knowledge?tenantId=...` → 200, returns list
3. `PUT /api/v1/knowledge/{id}` → 200, updates knowledge
4. `DELETE /api/v1/knowledge/{id}?tenantId=...` → 200, deletes
5. `GET /api/v1/knowledge?tenantId=...` → 200, empty list

#### 4.3.3 Follow-Up Flow E2E

**File baru:** `apps/backend/test/followup.e2e-spec.ts`

**Flow:**
1. `GET /api/v1/followup/config` → 200, returns config
2. `PUT /api/v1/followup/config` → 200, updates config
3. `GET /api/v1/followup/stats` → 200, returns stats
4. `GET /api/v1/followup/list` → 200, returns list
5. `POST /api/v1/followup/trigger` → 201, triggers follow-up (may timeout if WAHA down)

---

## Execution Order

1. **3.5.1-3.5.2** — Deduplicate OpenAI clients (kecil, clear win)
2. **3.3** — SQL injection fix (1 edit, critical)
3. **3.4** — Atomic transaction for record_sale (1 method refactor)
4. **3.2.1-3.2.2** — Error handling cleanup (5 files, simple replacements)
5. **3.1.1-3.1.7** — DTOs (18 endpoints, create files + update controllers)
6. **4.1** — Test infrastructure setup
7. **4.2.1-4.2.5** — Unit tests
8. **4.3.1-4.3.3** — E2E tests

---

## Notes

- **Tidak mengubah security** — auth guards, IDOR, hardcoded secrets, bypass mode TIDAK disentuh
- **Tidak mengubah RAG** — knowledge retrieval tetap flat text, tidak pakai vector search
- **Tidak mengubah email verification** — fitur ini tidak dibuat
- **Tidak mengubah feature scope** — tidak ada fitur baru, hanya quality improvements
- Setelah semua selesai, run `npx nest build` untuk verify compilation
- Setelah semua selesai, run `npm test` untuk verify semua test pass
