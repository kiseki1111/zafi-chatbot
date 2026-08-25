const fs = require('fs');
let data = fs.readFileSync('database_dump.sql', 'utf8');
data = data.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "');
data = data.replace(/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "');
data = data.replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');
fs.writeFileSync('database_dump.sql', data);
