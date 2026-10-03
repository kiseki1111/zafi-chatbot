import http from 'k6/http';
import { check, sleep } from 'k6';

// Konfigurasi skenario uji beban k6 (Spike & Stress Test)
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up ke 20 pengguna virtual (VUs)
    { duration: '1m', target: 50 },   // Tingkatkan beban ke 50 VUs (simulasi pesan WA masuk massal)
    { duration: '20s', target: 100 }, // Spike test 100 VUs
    { duration: '30s', target: 0 },   // Ramp-down pendinginan
  ],
  thresholds: {
    // 95% request harus selesai di bawah 800ms
    http_req_duration: ['p(95)<800'],
    // Error rate toleransi di bawah 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3030';

export default function () {
  const randomSender = `62812${Math.floor(10000000 + Math.random() * 90000000)}@c.us`;

  // Payload simulasi pesan teks webhook masuk dari WAHA (WhatsApp HTTP API)
  const payload = JSON.stringify({
    event: 'message',
    session: 'default',
    payload: {
      id: `wamid.HBgL${Date.now()}_${Math.random()}`,
      timestamp: Math.floor(Date.now() / 1000),
      from: randomSender,
      fromMe: false,
      body: 'Halo admin, apakah ada stok produk dan harga terbarunya?',
      hasMedia: false,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-waha-api-key': __ENV.WAHA_API_KEY || 'ZafitechDunia12345#',
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/waha/webhook`, payload, params);

  check(res, {
    'status code is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response duration < 500ms': (r) => r.timings.duration < 500,
  });

  // Jeda alami antar pesan WhatsApp
  sleep(0.5 + Math.random() * 1.5);
}
