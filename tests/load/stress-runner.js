/**
 * HIGH-PERFORMANCE STRESS & LOAD TESTING RUNNER
 * Targets: Live Backend Server at http://localhost:3030
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3030';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '25', 10);
const TOTAL_REQUESTS = parseInt(process.env.REQUESTS || '300', 10);

async function runScenario(scenarioName, targetUrl, method, getBody, headers = {}) {
  console.log(`\n============================================================`);
  console.log(` SKENARIO STRESS TEST: ${scenarioName}`);
  console.log(` Target     : ${targetUrl}`);
  console.log(` Concurrency: ${CONCURRENCY} workers`);
  console.log(` Total Req  : ${TOTAL_REQUESTS} requests`);
  console.log(`============================================================`);

  const latencies = [];
  let statusCounts = {};
  let serverErrors = 0;
  let clientErrors = 0;
  let successes = 0;
  let completed = 0;

  const startTime = Date.now();

  async function worker(workerId) {
    while (true) {
      const reqIndex = completed++;
      if (reqIndex >= TOTAL_REQUESTS) break;

      const reqStart = performance.now();
      try {
        const body = getBody ? JSON.stringify(getBody(reqIndex)) : undefined;
        const res = await fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body,
        });

        const reqEnd = performance.now();
        const duration = reqEnd - reqStart;
        latencies.push(duration);

        statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
        if (res.status >= 200 && res.status < 300) {
          successes++;
        } else if (res.status >= 400 && res.status < 500) {
          clientErrors++;
        } else if (res.status >= 500) {
          serverErrors++;
        }
      } catch (err) {
        serverErrors++;
        statusCounts['NETWORK_ERR'] = (statusCounts['NETWORK_ERR'] || 0) + 1;
      }

      if ((reqIndex + 1) % 50 === 0 || reqIndex + 1 === TOTAL_REQUESTS) {
        process.stdout.write(`\r  Progress: ${Math.min(reqIndex + 1, TOTAL_REQUESTS)} / ${TOTAL_REQUESTS} requests completed...`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  const totalDuration = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (latencies.length / totalDuration).toFixed(1);

  console.log(`\n\n--- HASIL METRIK PERFORMA ---`);
  console.log(`  Durasi Total  : ${totalDuration.toFixed(2)} detik`);
  console.log(`  Throughput    : \x1b[36m${rps} Requests/detik\x1b[0m`);
  console.log(`  Sukses (2xx)  : \x1b[32m${successes}\x1b[0m`);
  console.log(`  Client (4xx)  : ${clientErrors}`);
  console.log(`  Server (5xx)  : ${serverErrors > 0 ? `\x1b[31m${serverErrors}\x1b[0m` : '\x1b[32m0 (Zero Crash)\x1b[0m'}`);
  console.log(`  Status Breakdown: ${JSON.stringify(statusCounts)}`);
  console.log(`\n--- LATENCY RESPONSE TIME ---`);
  console.log(`  Min Latency   : ${min.toFixed(2)} ms`);
  console.log(`  Avg Latency   : ${avg.toFixed(2)} ms`);
  console.log(`  Median (p50)  : ${p50.toFixed(2)} ms`);
  console.log(`  95th % (p95)  : \x1b[33m${p95.toFixed(2)} ms\x1b[0m`);
  console.log(`  99th % (p99)  : ${p99.toFixed(2)} ms`);
  console.log(`------------------------------------------------------------\n`);
}

async function main() {
  console.log('\n============================================================');
  console.log('   STRESS & LOAD TESTING SUITE (PRE-PRODUCTION)            ');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log('============================================================');

  // Skenario 1: Public Read Throughput (Catalog & Groups)
  await runScenario(
    '1. High-Throughput Public API (Availability Catalog)',
    `${BASE_URL}/api/v1/availability/groups`,
    'GET'
  );

  // Skenario 2: Inbound Webhook Spike (WAHA WhatsApp Message Ingestion)
  await runScenario(
    '2. Inbound Webhook Concurrent Spike (WhatsApp WAHA Messages)',
    `${BASE_URL}/api/v1/waha/webhook`,
    'POST',
    (i) => ({
      event: 'message',
      session: 'default',
      payload: {
        id: `wamid.stress_${Date.now()}_${i}`,
        timestamp: Math.floor(Date.now() / 1000),
        from: `62812${(10000000 + (i % 50)).toString()}@c.us`,
        fromMe: false,
        body: `Pesan uji beban ke-${i}`,
        hasMedia: false,
      },
    }),
    {
      'x-webhook-secret': process.env.WAHA_WEBHOOK_SECRET || 'rahasia_waha_webhook_super_aman_789!',
    }
  );
}

main();
