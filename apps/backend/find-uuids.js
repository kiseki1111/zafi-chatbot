const fs = require('fs');
const data = fs.readFileSync('../../message_dump.sql', 'utf8');
const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const allUuids = data.match(uuidRegex) || [];
console.log('Total UUIDs found:', allUuids.length);
// Write them to a JSON file so we can insert them just in case
fs.writeFileSync('all_uuids.json', JSON.stringify(Array.from(new Set(allUuids))));
