/*
  Warnings:

  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entity_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entity_type` on the `audit_logs` table. All the data in the column will be lost.
  - The `details` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `endpoint` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_hash` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "refresh_tokens_token_key";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "createdAt",
DROP COLUMN "entity_id",
DROP COLUMN "entity_type",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endpoint" TEXT NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "module" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "user_agent" TEXT,
DROP COLUMN "details",
ADD COLUMN     "details" JSONB;

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "revokedAt",
DROP COLUMN "token",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "token_hash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);
