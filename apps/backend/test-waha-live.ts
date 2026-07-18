import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WahaService } from './src/modules/waha/waha.service';
import * as readline from 'readline';

async function bootstrap() {
  console.log('🤖 Memulai koneksi ke WAHA API...');
  
  // Create Nest app context without listening to HTTP
  const app = await NestFactory.createApplicationContext(AppModule);
  const wahaService = app.get(WahaService);
  
  try {
    // 1. Check Connection / Sessions
    console.log('🔍 Mengambil daftar sesi WAHA...');
    const sessions = await wahaService.getSessions();
    console.log(`✅ Berhasil terhubung ke WAHA API! Ditemukan ${sessions.length} sesi.`);
    
    let activeSessionName: string = '';
    
    sessions.forEach((session: any, index: number) => {
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

    // 2. Ask for phone number
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
        const testImageUrl = "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // Gambar rumah
        await wahaService.sendImage(activeSessionName, targetPhone, testImageUrl, "Ini adalah gambar testing otomatis. 🏡");
        console.log('✅ Pesan gambar berhasil terkirim!');
        
        console.log('\n🎉 PENGETESAN WAHA SELESAI DAN BERHASIL!');
      } catch (err: any) {
        console.error('\n❌ Gagal mengirim pesan:', err.message);
        if (err.response) {
          console.error('Detail Error WAHA:', err.response.data);
        }
      } finally {
        rl.close();
        await app.close();
      }
    });

  } catch (error: any) {
    console.error('\n❌ Gagal terhubung ke WAHA API:', error.message);
    await app.close();
  }
}

bootstrap();
