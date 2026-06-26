const fs = require('fs');

let filterContent = fs.readFileSync('src/common/filters/http-exception.filter.ts', 'utf-8');
filterContent = filterContent.replace(/GlobalExceptionFilter/g, 'HttpExceptionFilter');
fs.writeFileSync('src/common/filters/http-exception.filter.ts', filterContent, 'utf-8');

let interceptorContent = fs.readFileSync('src/common/interceptors/transform.interceptor.ts', 'utf-8');
interceptorContent = interceptorContent.replace(/ResponseInterceptor/g, 'TransformInterceptor');
fs.writeFileSync('src/common/interceptors/transform.interceptor.ts', interceptorContent, 'utf-8');
