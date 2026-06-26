const fs = require('fs');
let file = 'src/modules/users/repositories/user.repository.ts';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(/dto\.password/g, 'dto.passwordPlain');
fs.writeFileSync(file, content, 'utf-8');
