import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HrisAssistantRelayService } from './hris-assistant-relay.service';
import { WahaService } from './waha.service';
import axios from 'axios';

jest.mock('axios');

describe('HrisAssistantRelayService', () => {
  let service: HrisAssistantRelayService;
  let wahaService: { sendText: jest.Mock };

  function build(envOverrides: Record<string, string | undefined> = {}) {
    const env: Record<string, string | undefined> = {
      HRIS_ASSISTANT_WAHA_SESSION: 'hrd-nomor-khusus',
      CONSOLE_ASSISTANT_CHANNEL_KEY: 'channel-key-benar',
      CONSOLE_API_URL: 'http://console.test',
      ...envOverrides,
    };
    const config = { get: (key: string) => env[key] };
    wahaService = { sendText: jest.fn().mockResolvedValue({ id: 'ok' }) };

    return Test.createTestingModule({
      providers: [
        HrisAssistantRelayService,
        { provide: ConfigService, useValue: config },
        { provide: WahaService, useValue: wahaService },
      ],
    })
      .compile()
      .then((m: TestingModule) => m.get<HrisAssistantRelayService>(HrisAssistantRelayService));
  }

  beforeEach(() => jest.clearAllMocks());

  describe('dedicatedSession()', () => {
    it('balas nama session dari env kalau diisi', async () => {
      service = await build();
      expect(service.dedicatedSession()).toBe('hrd-nomor-khusus');
    });

    it('balas null kalau env kosong -- fitur dianggap mati', async () => {
      service = await build({ HRIS_ASSISTANT_WAHA_SESSION: '' });
      expect(service.dedicatedSession()).toBeNull();
    });

    it('balas null kalau env tidak diset sama sekali', async () => {
      service = await build({ HRIS_ASSISTANT_WAHA_SESSION: undefined });
      expect(service.dedicatedSession()).toBeNull();
    });
  });

  describe('relay()', () => {
    it('CONSOLE_ASSISTANT_CHANNEL_KEY belum diset -> tidak pernah memanggil Console/WAHA', async () => {
      service = await build({ CONSOLE_ASSISTANT_CHANNEL_KEY: undefined });
      await service.relay('hrd-nomor-khusus', '628123@c.us', 'halo');
      expect(axios.post).not.toHaveBeenCalled();
      expect(wahaService.sendText).not.toHaveBeenCalled();
    });

    it('memanggil Console dengan phone (tanpa @c.us) + text, header Bearer channel key', async () => {
      service = await build();
      (axios.post as jest.Mock).mockResolvedValue({ data: { handled: true, reply: 'Sisa cuti 10 hari' } });

      await service.relay('hrd-nomor-khusus', '628123456789@c.us', 'sisa cuti saya berapa?');

      expect(axios.post).toHaveBeenCalledWith(
        'http://console.test/api/integration/v1/assistant/messages',
        { phone: '628123456789', text: 'sisa cuti saya berapa?' },
        expect.objectContaining({ headers: { Authorization: 'Bearer channel-key-benar' } }),
      );
    });

    it('Console balas handled:true -> kirim balasan via WAHA ke session+chatId yang sama', async () => {
      service = await build();
      (axios.post as jest.Mock).mockResolvedValue({ data: { handled: true, reply: 'Sisa cuti 10 hari' } });

      await service.relay('hrd-nomor-khusus', '628123456789@c.us', 'sisa cuti saya berapa?');

      expect(wahaService.sendText).toHaveBeenCalledWith(
        'hrd-nomor-khusus',
        '628123456789@c.us',
        'Sisa cuti 10 hari',
      );
    });

    it('Console balas handled:false (nomor belum terdaftar) -> tidak kirim apapun via WAHA', async () => {
      service = await build();
      (axios.post as jest.Mock).mockResolvedValue({ data: { handled: false } });

      await service.relay('hrd-nomor-khusus', '628000000000@c.us', 'halo');

      expect(wahaService.sendText).not.toHaveBeenCalled();
    });

    it('handled:true tapi reply kosong -> tidak kirim apapun (jangan kirim pesan kosong ke WhatsApp)', async () => {
      service = await build();
      (axios.post as jest.Mock).mockResolvedValue({ data: { handled: true, reply: '' } });

      await service.relay('hrd-nomor-khusus', '628123@c.us', 'halo');

      expect(wahaService.sendText).not.toHaveBeenCalled();
    });

    it('Console tidak terjangkau (timeout) -> gagal aman, tidak melempar exception', async () => {
      service = await build();
      (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        service.relay('hrd-nomor-khusus', '628123@c.us', 'halo'),
      ).resolves.toBeUndefined();
      expect(wahaService.sendText).not.toHaveBeenCalled();
    });

    it('WAHA gagal kirim -> tidak melempar exception ke pemanggil', async () => {
      service = await build();
      (axios.post as jest.Mock).mockResolvedValue({ data: { handled: true, reply: 'balasan' } });
      wahaService.sendText.mockRejectedValue(new Error('WAHA down'));

      await expect(
        service.relay('hrd-nomor-khusus', '628123@c.us', 'halo'),
      ).resolves.toBeUndefined();
    });
  });
});
