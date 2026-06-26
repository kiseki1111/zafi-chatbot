const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf-8');
    for (let r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
}

// 1. auth.controller.ts
replaceInFile('src/modules/auth/controllers/auth.controller.ts', [
    { search: /'\.\/dto\/login\.dto'/g, replace: "'../dto/login.dto'" },
    { search: /'\.\.\/\.\.\/common\/guards\/jwt-auth\.guard'/g, replace: "'../../../common/guards/jwt-auth.guard'" },
    { search: /'\.\.\/\.\.\/common\/decorators\/public\.decorator'/g, replace: "'../../../common/decorators/public.decorator'" }
]);

// 2. auth.service.ts
replaceInFile('src/modules/auth/services/auth.service.ts', [
    { search: /'\.\/dto\/login\.dto'/g, replace: "'../dto/login.dto'" }
]);

// 3. permissions.controller.ts
replaceInFile('src/modules/permissions/controllers/permissions.controller.ts', [
    { search: /'\.\.\/\.\.\/common\//g, replace: "'../../../common/" }
]);

// 4. roles.module.ts
if (fs.existsSync('src/modules/roles/roles.module.ts')) {
    replaceInFile('src/modules/roles/roles.module.ts', [
        { search: /'\.\/roles\.controller'/g, replace: "'./controllers/roles.controller'" },
        { search: /'\.\/roles\.service'/g, replace: "'./services/roles.service'" },
        { search: /'\.\/roles\.repository'/g, replace: "'./repositories/roles.repository'" }
    ]);
}

// 5. roles.controller.ts
replaceInFile('src/modules/roles/controllers/roles.controller.ts', [
    { search: /'\.\/roles\.service'/g, replace: "'../services/roles.service'" },
    { search: /'\.\/dto\//g, replace: "'../dto/" },
    { search: /'\.\.\/\.\.\/common\//g, replace: "'../../../common/" }
]);

// 6. roles.service.ts
replaceInFile('src/modules/roles/services/roles.service.ts', [
    { search: /'\.\/roles\.repository'/g, replace: "'../repositories/roles.repository'" },
    { search: /'\.\/dto\//g, replace: "'../dto/" }
]);

// 7. roles.repository.ts
replaceInFile('src/modules/roles/repositories/roles.repository.ts', [
    { search: /'\.\.\/\.\.\/infrastructure\//g, replace: "'../../../infrastructure/" }
]);

// 8. users.module.ts
if (fs.existsSync('src/modules/users/users.module.ts')) {
    replaceInFile('src/modules/users/users.module.ts', [
        { search: /'\.\/users\.controller'/g, replace: "'./controllers/users.controller'" },
        { search: /'\.\/users\.service'/g, replace: "'./services/users.service'" },
        { search: /'\.\/users\.repository'/g, replace: "'./repositories/users.repository'" }
    ]);
}

// 9. users.controller.ts
replaceInFile('src/modules/users/controllers/users.controller.ts', [
    { search: /'\.\/users\.service'/g, replace: "'../services/users.service'" },
    { search: /'\.\/dto\//g, replace: "'../dto/" },
    { search: /'\.\.\/\.\.\/common\//g, replace: "'../../../common/" }
]);

// 10. users.service.ts
replaceInFile('src/modules/users/services/users.service.ts', [
    { search: /'\.\/users\.repository'/g, replace: "'../repositories/users.repository'" },
    { search: /'\.\/dto\//g, replace: "'../dto/" }
]);

// 11. users.repository.ts
replaceInFile('src/modules/users/repositories/users.repository.ts', [
    { search: /'\.\.\/\.\.\/infrastructure\//g, replace: "'../../../infrastructure/" }
]);

// 12. users/repositories/user.repository.ts (if exists and we need to fix it)
if (fs.existsSync('src/modules/users/repositories/user.repository.ts')) {
    replaceInFile('src/modules/users/repositories/user.repository.ts', [
        { search: /'\.\.\/dto\/pagination-query\.dto'/g, replace: "'../../../shared/dto/pagination-query.dto'" },
        { search: /'\.\.\/\.\.\/infrastructure\//g, replace: "'../../../infrastructure/" }
    ]);
}

console.log('Imports fixed.');
