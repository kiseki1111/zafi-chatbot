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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const waha_service_1 = require("./src/modules/waha/waha.service");
const readline = __importStar(require("readline"));
async function bootstrap() {
    console.log('🤖 Memulai koneksi ke WAHA API...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const wahaService = app.get(waha_service_1.WahaService);
    try {
        console.log('🔍 Mengambil daftar sesi WAHA...');
        const sessions = await wahaService.getSessions();
        console.log(`✅ Berhasil terhubung ke WAHA API! Ditemukan ${sessions.length} sesi.`);
        let activeSessionName = '';
        sessions.forEach((session, index) => {
            console.log(`   ${index + 1}. Session Name: ${session.name} | Status: ${session.status}`);
            if (session.status === 'WORKING') {
                activeSessionName = session.name;
            }
        });
        if (!activeSessionName) {
            console.log('\n❌ Tidak ada sesi WAHA yang berstatus WORKING.');
            console.log('Silakan buat sesi dan scan QR Code terlebih dahulu lewat Dashboard.');
            process.exit(0);
        }
        console.log(`\n✅ Akan menggunakan sesi aktif: ${activeSessionName}`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('\n📱 Masukkan nomor WA tujuan untuk ditest (format: 62812xxx@c.us): ', async (targetPhone) => {
            if (!targetPhone || !targetPhone.includes('@c.us')) {
                console.log('❌ Format nomor salah. Harus diakhiri dengan @c.us');
                process.exit(1);
            }
            try {
                console.log(`\n⏳ Mengirim teks percobaan ke ${targetPhone}...`);
                await wahaService.sendMessage(activeSessionName, targetPhone, "Halo! Ini adalah pesan testing otomatis dari sistem CRM Omnichannel Zafi. 🚀");
                console.log('✅ Pesan teks berhasil terkirim!');
                console.log(`\n⏳ Mengirim gambar percobaan ke ${targetPhone}...`);
                const testImageUrl = "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                await wahaService.sendImage(activeSessionName, targetPhone, testImageUrl, "Ini adalah gambar testing otomatis. 🏡");
                console.log('✅ Pesan gambar berhasil terkirim!');
                console.log('\n🎉 PENGETESAN WAHA SELESAI DAN BERHASIL!');
            }
            catch (err) {
                console.error('\n❌ Gagal mengirim pesan:', err.message);
                if (err.response) {
                    console.error('Detail Error WAHA:', err.response.data);
                }
            }
            finally {
                rl.close();
                await app.close();
            }
        });
    }
    catch (error) {
        console.error('\n❌ Gagal terhubung ke WAHA API:', error.message);
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=test-waha-live.js.map