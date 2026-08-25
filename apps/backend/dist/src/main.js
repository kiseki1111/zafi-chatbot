"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const helmet_1 = __importDefault(require("helmet"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'));
    const configService = app.get(config_1.ConfigService);
    const isSecurityBypass = process.env.SECURITY_BYPASS_MODE === 'true';
    if (isSecurityBypass) {
        console.warn('⚠️  SECURITY BYPASS MODE IS ACTIVE: Helmet strict mode disabled');
        app.use((0, helmet_1.default)({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
        }));
    }
    else {
        app.use((0, helmet_1.default)());
    }
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:3001', 'https://app.zafiproperti.com'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    const port = process.env.PORT;
    if (!port) {
        throw new Error("PORT environment variable is not set!");
    }
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map