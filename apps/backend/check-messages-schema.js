const fs = require('fs');
const data = fs.readFileSync('../../message_dump.sql', 'utf8');
const match = data.match(/CREATE TABLE "messages" \(([^;]+)\)/);
if (match) {
  console.log(match[1]);
} else {
  console.log('No CREATE TABLE "messages" found');
}
