const fs = require('fs');
const data = fs.readFileSync('../../message_dump.sql', 'utf8');
console.log('Contains conversations insert?', data.includes('INSERT INTO "conversations"'));
