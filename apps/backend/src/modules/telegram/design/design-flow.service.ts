import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { DesignAiService } from './design-ai.service';
import { DesignImageService } from './design-image.service';
import { DesignSessionService } from './design-session.service';

// ─── Helper: Bangun pesan konfirmasi dengan 4 opsi tombol ────────────────────
function buildConfirmationMenu(
  summaryId: string,
  englishPrompt: string,
  title = 'Berikut kesimpulan desainmu:',
): string {
  return (
    `📋 *${title}*\n\n` +
    `${summaryId}\n\n` +
    `✨ *Prompt AI (Inggris):*\n${englishPrompt}\n\n` +
    `_Apakah kesimpulan ini sudah benar?_\n\n` +
    `✅ Ketik *sudah* → langsung generate gambar\n` +
    `✏️ Ketik *revisi* → ubah teks deskripsi\n` +
    `🏠 Ketik *aset* → tambahkan foto properti/rumah\n` +
    `🖼️ Ketik *referensi* → tambahkan gambar referensi desain`
  );
}
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DesignFlowService {
  private readonly logger = new Logger(DesignFlowService.name);

  constructor(
    private readonly aiService: DesignAiService,
    private readonly imageService: DesignImageService,
    private readonly sessionService: DesignSessionService,
  ) {}

  // ─── Generate & kirim gambar ke user ─────────────────────────────────────
  async generateAndSendImage(
    bot: TelegramBot,
    userId: string,
    session: any,
  ): Promise<void> {
    const data = session.data as any;
    const base64Aset = data.aset_image;
    const referensiImages: string[] = data.referensi_images || [];
    const instruksiUser = data.summary_id || data.summary || '';

    // Mode generateWithReference: ada gambar aset DAN minimal 1 referensi
    if (base64Aset && referensiImages.length > 0) {
      await bot.sendMessage(
        userId,
        '⏳ *Sedang menganalisis gambar aset & referensi dengan GPT-4o, lalu membuat poster...*\n\nProses ini memakan waktu 60–120 detik. Mohon tunggu ya! 🙏',
        { parse_mode: 'Markdown' },
      );

      const base64Referensi = referensiImages[0];
      const imageSize = data.image_size || '1024x1536';

      const result = await this.imageService.generateWithReference(
        base64Aset,
        base64Referensi,
        instruksiUser,
        imageSize,
      );

      if (result.success) {
        const imageBuffer = this.imageService.base64ToBuffer(result.imageBase64!);
        const publicUrl = await this.sessionService.saveAssetToSupabase(
          userId,
          result.imageBase64!,
          { prompt: result.generatedPrompt },
        );

        await bot.sendPhoto(userId, imageBuffer, {
          caption:
            `✅ *Poster berhasil dibuat!*\n\n` +
            `🤖 *Prompt AI yang digunakan:*\n${result.generatedPrompt!.substring(0, 800)}${result.generatedPrompt!.length > 800 ? '...' : ''}\n\n` +
            `Mau mulai desain baru? Ketik /baru\nIngin perbaiki desain ini? Ketik *revisi*`,
          parse_mode: 'Markdown',
        });

        await this.sessionService.saveGeneration(
          userId,
          result.generatedPrompt ?? null,
          publicUrl,
          'with_reference',
        );
        await this.sessionService.updateSession(userId, 'selesai', {});
      } else {
        await bot.sendMessage(
          userId,
          `❌ Maaf, gagal generate poster. Error: ${result.error}\n\nKetik /baru untuk mulai ulang.`,
        );
        await this.sessionService.saveGeneration(
          userId,
          instruksiUser,
          null,
          'with_reference',
          'failed',
        );
      }
      return;
    }

    // Mode generate biasa (text-to-image)
    await bot.sendMessage(
      userId,
      '⏳ *Sedang membuat desainmu...*\n\nMohon tunggu 30–60 detik ya!',
      { parse_mode: 'Markdown' },
    );

    const finalPrompt = data.summary;
    const imageSize = data.image_size || '1024x1792';
    const result = await this.imageService.generate(finalPrompt, imageSize);

    if (result.success) {
      const imageBuffer = this.imageService.base64ToBuffer(result.imageBase64!);
      const publicUrl = await this.sessionService.saveAssetToSupabase(
        userId,
        result.imageBase64!,
        { prompt: finalPrompt },
      );

      await bot.sendPhoto(userId, imageBuffer, {
        caption:
          `✅ *Desainmu sudah jadi!*\n\n` +
          `Mau mulai desain baru? Ketik /baru\nIngin perbaiki desain ini? Ketik *revisi*`,
        parse_mode: 'Markdown',
      });

      await this.sessionService.saveGeneration(userId, finalPrompt, publicUrl, 'freeform');
      await this.sessionService.updateSession(userId, 'selesai', {});
    } else {
      await bot.sendMessage(
        userId,
        `❌ Maaf, gagal generate gambar. Error: ${result.error}\n\nKetik /baru untuk mulai ulang.`,
      );
      await this.sessionService.saveGeneration(
        userId,
        finalPrompt,
        null,
        'freeform',
        'failed',
      );
    }
  }

  // ─── Main handler ─────────────────────────────────────────────────────────
  async handle(bot: TelegramBot, msg: any): Promise<void> {
    const userId = msg.chat.id.toString();
    const text: string | undefined = msg.text?.trim();
    const photo = msg.photo;

    if (!text && !photo) return;

    // ── /start atau /baru ──────────────────────────────────────────────────
    if (text === '/start' || text === '/baru') {
      await this.sessionService.createSession(userId);
      await bot.sendMessage(
        userId,
        '🎨 *Halo! Selamat datang di Design Bot!*\n\nSilakan berikan deskripsi atau prompt bebas tentang desain poster yang ingin kamu buat.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // ── Ambil session ──────────────────────────────────────────────────────
    let session = await this.sessionService.getSession(userId);

    if (!session || this.sessionService.isExpired(session)) {
      await this.sessionService.createSession(userId);
      await bot.sendMessage(
        userId,
        '🎨 *Halo!* Sesi kamu telah berakhir. Silakan berikan deskripsi desain yang ingin kamu buat.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const currentStep = session.step;
    const sessionData = session.data as any;

    // ══════════════════════════════════════════════════════════════════════
    // STEP 1 ─ prompting
    // ══════════════════════════════════════════════════════════════════════
    if (currentStep === 'prompting') {
      if (!text) {
        await bot.sendMessage(userId, '📝 Silakan kirimkan deskripsi teks desain kamu terlebih dahulu.');
        return;
      }

      await bot.sendMessage(userId, '⏳ *Sedang menyusun kesimpulan dari prompt kamu...*', {
        parse_mode: 'Markdown',
      });

      const summaryResult = await this.aiService.summarizePrompt(text);
      if (!summaryResult) {
        await bot.sendMessage(userId, '❌ Maaf, terjadi kesalahan saat menyusun kesimpulan. Coba ulangi prompt kamu.');
        return;
      }

      await this.sessionService.updateSession(userId, 'konfirmasi', {
        summary: summaryResult.english_prompt,
        summary_id: summaryResult.summary_id,
        image_size: summaryResult.image_size,
        aset_image: null,
        referensi_images: [],
      });

      await bot.sendMessage(
        userId,
        buildConfirmationMenu(summaryResult.summary_id, summaryResult.english_prompt),
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2 ─ konfirmasi
    // ══════════════════════════════════════════════════════════════════════
    if (currentStep === 'konfirmasi') {
      if (!text) {
        await bot.sendMessage(userId, '📝 Silakan balas dengan teks: *sudah / revisi / aset / referensi*', {
          parse_mode: 'Markdown',
        });
        return;
      }

      const lowerText = text.toLowerCase().trim();

      if (['sudah', 'ya', 'yes', 'benar', 'betul', 'oke', 'ok', 'lanjut', 'gas'].includes(lowerText)) {
        return this.generateAndSendImage(bot, userId, session);
      }

      if (lowerText === 'revisi') {
        await this.sessionService.updateSession(userId, 'menunggu_revisi', { ...sessionData });
        await bot.sendMessage(
          userId,
          '✏️ *Silakan masukkan teks revisi kamu.*\n\nContoh: "Tambahkan harga 500 juta, warna lebih cerah"\n\nSetelah kamu ketik, kesimpulan akan diperbarui otomatis.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (['aset', 'foto', 'foto rumah', 'foto properti', 'punya foto', 'ada foto'].includes(lowerText)) {
        await this.sessionService.updateSession(userId, 'menunggu_aset', {
          ...sessionData,
          aset_image: null,
          aset_notes: [],
        });
        await bot.sendMessage(
          userId,
          '🏠 *Kirimkan foto rumah/properti* yang akan menjadi hero poster.\n\n' +
          'Boleh tambahkan catatan teks (harga, keterangan, dll.).\n' +
          'Kalau sudah, ketik *sudah* untuk kembali ke kesimpulan.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (['referensi', 'punya referensi', 'ada referensi'].includes(lowerText)) {
        await this.sessionService.updateSession(userId, 'menunggu_referensi', {
          ...sessionData,
          referensi_notes: [],
          referensi_images: [],
        });
        await bot.sendMessage(
          userId,
          '🖼️ *Kirimkan gambar referensi desain poster* yang ingin ditiru layoutnya.\n\n' +
          'Boleh kirim lebih dari satu gambar dan tambahkan catatan teks.\n' +
          'Kalau sudah, ketik *sudah* untuk kembali ke kesimpulan.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await bot.sendMessage(
        userId,
        '❓ Pilihan tidak dikenali. Silakan balas dengan salah satu:\n\n' +
        '✅ *sudah* → generate gambar sekarang\n' +
        '✏️ *revisi* → ubah deskripsi\n' +
        '🏠 *aset* → kirim foto properti\n' +
        '🖼️ *referensi* → kirim gambar referensi desain',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3a ─ menunggu_revisi
    // ══════════════════════════════════════════════════════════════════════
    if (currentStep === 'menunggu_revisi') {
      if (!text) {
        await bot.sendMessage(userId, '📝 Silakan masukkan teks revisi kamu.');
        return;
      }

      await bot.sendMessage(userId, '⏳ *Sedang merevisi kesimpulan desainmu...*', {
        parse_mode: 'Markdown',
      });

      const prevContext = sessionData.summary_id || sessionData.summary;
      const newSummaryResult = await this.aiService.summarizePrompt(text, prevContext);

      if (!newSummaryResult) {
        await bot.sendMessage(userId, '❌ Maaf, terjadi kesalahan saat merevisi. Coba ketik ulang revisinya.');
        return;
      }

      await this.sessionService.updateSession(userId, 'konfirmasi', {
        ...sessionData,
        summary: newSummaryResult.english_prompt,
        summary_id: newSummaryResult.summary_id,
        image_size: newSummaryResult.image_size || sessionData.image_size,
      });

      await bot.sendMessage(
        userId,
        buildConfirmationMenu(
          newSummaryResult.summary_id,
          newSummaryResult.english_prompt,
          'Kesimpulan desainmu yang direvisi:',
        ),
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3b ─ menunggu_aset
    // ══════════════════════════════════════════════════════════════════════
    if (currentStep === 'menunggu_aset') {
      const lowerText = text ? text.toLowerCase().trim() : '';
      let asetImage: string | null = sessionData.aset_image || null;
      const asetNotes: string[] = sessionData.aset_notes || [];

      if (lowerText === 'sudah' || lowerText === 'done' || lowerText === 'selesai') {
        if (!asetImage) {
          await bot.sendMessage(
            userId,
            '❌ Kamu belum mengirimkan foto properti. Silakan kirim dulu, atau ketik /baru untuk batal.',
          );
          return;
        }

        await bot.sendMessage(userId, '⏳ *Memproses foto aset dan memperbarui kesimpulan...*', {
          parse_mode: 'Markdown',
        });

        const catatanAset = asetNotes.join('\n');
        const prevContext = sessionData.summary_id || sessionData.summary || '';
        const konteks =
          prevContext + (catatanAset ? `\n\nCatatan aset: ${catatanAset}` : '');

        const newSummaryResult = await this.aiService.summarizePrompt(
          `Foto properti/aset telah diterima. ${catatanAset ? 'Catatan user: ' + catatanAset : 'Gunakan foto properti sebagai hero image poster.'}`,
          konteks,
        );

        const updatedData: any = { ...sessionData, aset_image: asetImage, aset_notes: asetNotes };

        if (newSummaryResult) {
          updatedData.summary = newSummaryResult.english_prompt;
          updatedData.summary_id = newSummaryResult.summary_id;
          updatedData.image_size = newSummaryResult.image_size || sessionData.image_size;
        }

        await this.sessionService.updateSession(userId, 'konfirmasi', updatedData);

        const summaryToShow = updatedData.summary_id || updatedData.summary || '(Gunakan foto properti sebagai hero image)';
        const promptToShow = updatedData.summary || '';
        await bot.sendMessage(
          userId,
          buildConfirmationMenu(summaryToShow, promptToShow, 'Kesimpulan diperbarui dengan foto aset:'),
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (text && lowerText !== 'aset' && lowerText !== 'referensi') {
        asetNotes.push(text);
      }

      if (photo && photo.length > 0) {
        const fileId = photo[photo.length - 1].file_id;
        try {
          const fileLink = await bot.getFileLink(fileId);
          const fetchResponse = await fetch(fileLink);
          const arrayBuffer = await fetchResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          if (!asetImage) {
            asetImage = base64;
            await this.sessionService.updateSession(userId, 'menunggu_aset', {
              ...sessionData,
              aset_image: asetImage,
              aset_notes: asetNotes,
            });
            await bot.sendMessage(
              userId,
              '✅ *Foto properti diterima!*\n\n' +
              '📝 Boleh tambahkan catatan teks (harga, keterangan khusus, dll.) — opsional\n\n' +
              'Kalau sudah, ketik *sudah* untuk kembali ke kesimpulan.',
              { parse_mode: 'Markdown' },
            );
          } else {
            await bot.sendMessage(
              userId,
              '⚠️ Foto aset sudah ada. Jika kamu ingin menambahkan *gambar referensi desain*, ' +
              'silakan kembali ke menu konfirmasi dengan ketik *sudah*, lalu pilih *referensi*.',
              { parse_mode: 'Markdown' },
            );
          }
          return;
        } catch (e) {
          this.logger.error('Gagal mendownload gambar aset:', e);
          await bot.sendMessage(userId, '❌ Gagal membaca gambarmu. Coba kirim ulang.');
          return;
        }
      }

      await this.sessionService.updateSession(userId, 'menunggu_aset', {
        ...sessionData,
        aset_image: asetImage,
        aset_notes: asetNotes,
      });

      await bot.sendMessage(
        userId,
        asetImage
          ? '✅ _Catatan dicatat!_ Ketik *sudah* kalau sudah selesai, atau tambahkan catatan lagi.'
          : '📸 _Catatan dicatat!_ Silakan kirim foto properti/rumah kamu.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3c ─ menunggu_referensi
    // ══════════════════════════════════════════════════════════════════════
    if (currentStep === 'menunggu_referensi') {
      const lowerText = text ? text.toLowerCase().trim() : '';
      const referensiNotes: string[] = sessionData.referensi_notes || [];
      const referensiImages: string[] = sessionData.referensi_images || [];

      if (lowerText === 'sudah' || lowerText === 'done' || lowerText === 'selesai') {
        if (referensiNotes.length === 0 && referensiImages.length === 0) {
          await bot.sendMessage(
            userId,
            '❌ Kamu belum memberikan gambar atau catatan apapun. Silakan kirim referensi desainnya, atau ketik /baru untuk batal.',
          );
          return;
        }

        await bot.sendMessage(
          userId,
          '⏳ *Menganalisis referensi desain dan memperbarui kesimpulan...*',
          { parse_mode: 'Markdown' },
        );

        const combinedNotes = referensiNotes.join('\n');
        const prevContext = sessionData.summary_id || sessionData.summary;

        const newSummaryResult = await this.aiService.analyzeMultipleImagesAndSummarize(
          prevContext,
          referensiImages,
          combinedNotes,
        );

        if (!newSummaryResult) {
          await bot.sendMessage(userId, '❌ Maaf, terjadi kesalahan saat menganalisis referensi. Coba ketik /baru.');
          return;
        }

        await this.sessionService.updateSession(userId, 'konfirmasi', {
          ...sessionData,
          summary: newSummaryResult.english_prompt,
          summary_id: newSummaryResult.summary_id,
          image_size: newSummaryResult.image_size || sessionData.image_size,
          referensi_images: referensiImages,
        });

        await bot.sendMessage(
          userId,
          buildConfirmationMenu(
            newSummaryResult.summary_id,
            newSummaryResult.english_prompt,
            'Kesimpulan diperbarui dengan referensi visual:',
          ),
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (text) referensiNotes.push(text);

      if (photo && photo.length > 0) {
        const fileId = photo[photo.length - 1].file_id;
        try {
          const fileLink = await bot.getFileLink(fileId);
          const fetchResponse = await fetch(fileLink);
          const arrayBuffer = await fetchResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          referensiImages.push(base64);
        } catch (e) {
          this.logger.error('Gagal mendownload gambar referensi:', e);
          await bot.sendMessage(userId, '❌ Gagal membaca gambarmu. Coba kirim ulang gambar tersebut.');
          return;
        }
      }

      await this.sessionService.updateSession(userId, 'menunggu_referensi', {
        ...sessionData,
        referensi_notes: referensiNotes,
        referensi_images: referensiImages,
      });

      await bot.sendMessage(
        userId,
        `✅ _${referensiImages.length > 0 ? `${referensiImages.length} gambar referensi` : 'Catatan'} diterima!_ ` +
        `Kirim lagi atau ketik *sudah* kalau sudah selesai.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 4 ─ selesai
    // ══════════════════════════════════════════════════════════════════════
    if (currentStep === 'selesai') {
      if (text && text.toLowerCase().trim() === 'revisi') {
        await this.sessionService.updateSession(userId, 'menunggu_revisi', {
          ...sessionData,
          revisi_notes: [],
          revisi_images: [],
        });
        await bot.sendMessage(
          userId,
          '✏️ *Silakan masukkan teks revisi kamu.*\n\nContoh: "Ganti warna latar menjadi biru, tambah harga 800 juta"\n\nKesimpulan akan diperbarui otomatis.',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      await bot.sendMessage(
        userId,
        '✅ Desain sebelumnya sudah selesai.\n\n' +
        'Ketik /baru untuk membuat desain baru.\n' +
        'Atau ketik *revisi* jika ingin memperbaiki desain terakhir.',
        { parse_mode: 'Markdown' },
      );
    }
  }
}
