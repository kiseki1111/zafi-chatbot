"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const axios_1 = __importDefault(require("axios"));
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
setInterval(async () => {
    try {
        const res = await axios_1.default.get(POLL_URL);
        const messages = res.data?.data || res.data;
        if (messages && Array.isArray(messages) && messages.length > 0) {
            messages.forEach((msg) => {
                console.log('\n\x1b[32m%s\x1b[0m', '================ BOT ================');
                console.log('\x1b[32m%s\x1b[0m', msg.text);
                console.log('\x1b[32m%s\x1b[0m', '=====================================\n');
            });
            process.stdout.write('You: ');
        }
    }
    catch (error) {
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
        let mediaUrl = undefined;
        if (input.startsWith('/image')) {
            const parts = input.split(' ');
            mediaUrl = parts[1] || 'https://picsum.photos/800/600';
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
            await axios_1.default.post(WEBHOOK_URL, payload);
        }
        catch (error) {
            console.error('\x1b[31m❌ Gagal mengirim webhook:', error.message, '\x1b[0m');
        }
        setTimeout(askQuestion, 100);
    });
}
askQuestion();
//# sourceMappingURL=test-waha-cli.js.map