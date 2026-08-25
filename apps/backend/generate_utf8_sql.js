const { execSync } = require('child_process');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function run() {
    console.log('Generating Prisma SQL...');
    const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel ./src/infrastructure/prisma/schema.prisma --script', { encoding: 'utf8' });
    
    console.log('Applying IF NOT EXISTS replacements...');
    let data = sql.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "')
                  .replace(/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "')
                  .replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');
                  
    console.log('Hashing passwords...');
    const pw = await bcrypt.hash('Admin@123', 12);
    const u1 = crypto.randomUUID();
    const u2 = crypto.randomUUID();
    
    console.log('Generating seed data...');
    const seed = `

-- SEED DATA
INSERT INTO "users" ("id", "name", "email", "password", "role", "is_active", "created_at", "updated_at") VALUES ('${u1}', 'Super Admin', 'superadmin@umkm.id', '${pw}', 'SUPERADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
INSERT INTO "users" ("id", "name", "email", "password", "role", "is_active", "created_at", "updated_at") VALUES ('${u2}', 'Customer Service', 'cs@umkm.id', '${pw}', 'USER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
`;
    
    fs.writeFileSync('full_database_dump_utf8.sql', data + seed, 'utf8');
    console.log('Successfully created full_database_dump_utf8.sql');
}
run();
