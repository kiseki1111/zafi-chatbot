import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 10 }, // Pemanasan
    { duration: '40s', target: 30 }, // Beban stabil
    { duration: '20s', target: 0 },  // Pendinginan
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3030';

export default function () {
  group('1. Public Endpoints (Health & Availability)', function () {
    const resGroups = http.get(`${BASE_URL}/api/v1/availability/groups`);
    check(resGroups, {
      'get groups status is 200': (r) => r.status === 200,
    });
  });

  group('2. Authentication Rate-Limiting & Security Test', function () {
    const loginPayload = JSON.stringify({
      email: 'stress-test@example.com',
      passwordPlain: 'WrongPassword123!',
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const resLogin = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, params);
    check(resLogin, {
      'auth correctly rejects invalid login (401 or 429)': (r) =>
        r.status === 401 || r.status === 429,
    });
  });

  sleep(1);
}
