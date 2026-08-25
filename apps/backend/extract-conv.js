const fs = require('fs');
const data = fs.readFileSync('../../message_dump.sql', 'utf8');
const lines = data.split('\n');
const convIds = new Set();
for (const line of lines) {
  const match = line.match(/^\('([a-f0-9\-]{36})',\s*'[^']+',\s*'([a-f0-9\-]{36})'/);
  if (match) {
    convIds.add(match[2]);
  }
}
console.log(Array.from(convIds));
