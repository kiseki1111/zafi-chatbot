const fs = require('fs');
const data = fs.readFileSync('../../message_dump.sql', 'utf8');

// The SQL insert statement looks like:
// ('message_id', 'remote_jid', 'conversation_id', 'sender_type', ...)
// Let's parse all the conversation_ids!

const regex = /^\('([^']+)',\s*'([^']*)',\s*'([^']+)'/gm;
const convIds = new Set();
let match;
while ((match = regex.exec(data)) !== null) {
  // match[3] is the conversation_id
  convIds.add(match[3]);
}

const arr = Array.from(convIds);
console.log('Conversation IDs found:', arr.length);
if (arr.length > 0) {
  console.log('Sample:', arr[0]);
}

fs.writeFileSync('conv_ids.json', JSON.stringify(arr));
