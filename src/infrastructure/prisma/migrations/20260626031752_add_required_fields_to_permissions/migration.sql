/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resource,action]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resource` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "permissions_action_key";

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'default_name';
ALTER TABLE "permissions" ADD COLUMN "resource" TEXT NOT NULL DEFAULT 'default_resource';

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

