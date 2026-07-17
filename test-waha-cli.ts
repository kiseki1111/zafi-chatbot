import * as readline from 'readline';
import axios from 'axios';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const WEBHOOK_URL = 'http://localhost:3000/api/v1/waha/webhook';
const POLL_URL = 'http://localhost:3000/api/v1/waha/cli-poll';
const MOCK_SESSION = 'CLI_TEST_SESSION';
const SENDER = 'cli-user-001@c.us';

console.log('=============================================');
console.log('🤖 WAHA Omnichannel CLI Tester (Replica) 🤖');
console.log('=============================================');
console.log('Ketik pesan Anda di bawah ini, lalu tekan Enter.');
console.log('👉 Ketik "/image <url_gambar>" untuk pura-pura mengirim gambar.');
console.log('Contoh: /image https://picsum.photos/200');
console.log('Ketik "exit" atau "quit" untuk keluar.\n');

// Polling for bot responses
setInterval(async () => {
  try {
    const res = await axios.get(POLL_URL);
    // NestJS response interceptor wraps the response in { statusCode, data }
    const messages = res.data?.data || res.data;
    
    if (messages && Array.isArray(messages) && messages.length > 0) {
      messages.forEach((msg: any) => {
        console.log('\n\x1b[32m%s\x1b[0m', '================ BOT ================');
        console.log('\x1b[32m%s\x1b[0m', msg.text);
        console.log('\x1b[32m%s\x1b[0m', '=====================================\n');
      });
      process.stdout.write('You: ');
    }
  } catch (error) {
    // silently ignore poll errors (e.g. server restarting)
  }
}, 2000);

function askQuestion() {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Dadah! 👋');
      process.exit(0);
    }

    if (!input.trim()) {
      askQuestion();
      return;
    }

    let body = input;
    let mediaUrl: string | undefined = undefined;

    if (input.startsWith('/image')) {
      const parts = input.split(' ');
      mediaUrl = parts[1] || 'https://picsum.photos/800/600'; // dummy fallback
      body = parts.slice(2).join(' ') || '(mengirim gambar)';
      console.log(`\x1b[36m[MOCK] Mengirim gambar dengan URL: ${mediaUrl}\x1b[0m`);
    }

    try {
      const payload = {
        event: 'message',
        session: MOCK_SESSION,
        payload: {
          from: SENDER,
          body: body,
          mediaUrl: mediaUrl,
          timestamp: Math.floor(Date.now() / 1000),
          id: { _serialized: `mock_id_${Date.now()}` }
        }
      };

      await axios.post(WEBHOOK_URL, payload);
    } catch (error: any) {
      console.error('\x1b[31m❌ Gagal mengirim webhook:', error.message, '\x1b[0m');
    }

    // Wait a tiny bit before prompting again to allow logs to interleave better
    setTimeout(askQuestion, 100);
  });
}

askQuestion();
