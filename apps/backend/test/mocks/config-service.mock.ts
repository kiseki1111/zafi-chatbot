export const createMockConfigService = (overrides?: Record<string, any>) => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    if (overrides && key in overrides) {
      return overrides[key];
    }
    const envDefaults: Record<string, any> = {
      PORT: '3030',
      JWT_ACCESS_SECRET: 'test_jwt_access_secret_12345',
      JWT_REFRESH_SECRET: 'test_jwt_refresh_secret_12345',
      JWT_EXPIRES_IN: '1d',
      JWT_REFRESH_EXPIRES_IN: '7d',
      SECURITY_BYPASS_MODE: 'false',
      WAHA_API_URL: 'http://localhost:3000',
      WAHA_API_KEY: 'test_waha_api_key',
      OPENAI_API_KEY: 'test_openai_api_key',
    };
    return envDefaults[key] ?? process.env[key] ?? defaultValue ?? null;
  }),
});
