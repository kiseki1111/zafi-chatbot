import { Test, TestingModule } from '@nestjs/testing';
import { HrisAssistantService } from './hris-assistant.service';
import { HrisService } from './hris.service';
import { OPENAI_CLIENT, OPENAI_MODEL } from '../../core/openai/openai.module';

describe('HrisAssistantService (Per-Tenant AI Asisten HRD - Opsi B)', () => {
  let service: HrisAssistantService;
  let mockHrisService: {
    lookupKaryawan: jest.Mock;
    getCutiBalance: jest.Mock;
    getPresensiSummary: jest.Mock;
    getSlipGaji: jest.Mock;
    getDailyAttendance: jest.Mock;
    getPendingRequests: jest.Mock;
    getEmployeesSummary: jest.Mock;
  };
  let mockOpenAI: {
    chat: {
      completions: {
        create: jest.Mock;
      };
    };
  };

  async function buildService(openaiClientOverride?: any) {
    mockHrisService = {
      lookupKaryawan: jest.fn(),
      getCutiBalance: jest.fn(),
      getPresensiSummary: jest.fn(),
      getSlipGaji: jest.fn(),
      getDailyAttendance: jest.fn(),
      getPendingRequests: jest.fn(),
      getEmployeesSummary: jest.fn(),
    };
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrisAssistantService,
        { provide: HrisService, useValue: mockHrisService },
        {
          provide: OPENAI_CLIENT,
          useValue: openaiClientOverride === undefined ? mockOpenAI : openaiClientOverride,
        },
        { provide: OPENAI_MODEL, useValue: 'gpt-4o-mini' },
      ],
    }).compile();

    return module.get<HrisAssistantService>(HrisAssistantService);
  }

  beforeEach(async () => {
    service = await buildService();
  });

  it('normalizePhone menghapus @c.us, @s.whatsapp.net, dan @lid', () => {
    expect(service.normalizePhone('628123456@c.us')).toBe('628123456');
    expect(service.normalizePhone('628123456@s.whatsapp.net')).toBe('628123456');
    expect(service.normalizePhone('12345@lid')).toBe('12345');
  });

  it('mengabaikan pesan jika tenantId null atau teks kosong', async () => {
    expect(await service.handleMessage(null, '628123@c.us', 'halo')).toEqual({ handled: false });
    expect(await service.handleMessage('t-1', '628123@c.us', '   ')).toEqual({ handled: false });
    expect(mockHrisService.lookupKaryawan).not.toHaveBeenCalled();
  });

  it('membalas ramah jika HRIS tenant belum dikonfigurasi di Console SSO', async () => {
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: false,
      message: 'Integrasi HRIS belum dikonfigurasi untuk perusahaan ini.',
    });

    const res = await service.handleMessage('tenant-a', '628111@c.us', 'cek cuti');
    expect(res.handled).toBe(true);
    expect(res.reply).toContain('belum aktif');
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
  });

  it('mengabaikan (handled: false) jika nomor pengirim bukan karyawan terdaftar di HRIS tenant', async () => {
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: false,
      message: 'Karyawan tidak ditemukan',
    });

    const res = await service.handleMessage('tenant-a', '628999@c.us', 'halo');
    expect(res).toEqual({ handled: false });
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
  });

  it('karyawan biasa (Staff) hanya mendapat personal tools dan NIK dikunci ke NIK sendiri', async () => {
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: true,
      data: {
        nik: 'NIK-007',
        name: 'Budi Santoso',
        position: 'Staf Operasional',
        department: 'Operasional',
      },
    });
    mockHrisService.getCutiBalance.mockResolvedValueOnce({ success: true, data: { sisa_cuti: 8 } });

    mockOpenAI.chat.completions.create
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'cek_sisa_cuti', arguments: '{}' },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Halo Budi, sisa cuti tahunan Anda saat ini adalah 8 hari.',
            },
          },
        ],
      });

    const res = await service.handleMessage('tenant-a', '62812345@c.us', 'sisa cuti saya berapa?');

    expect(res.handled).toBe(true);
    expect(res.reply).toContain('8 hari');
    expect(res.toolsUsed).toEqual(['cek_sisa_cuti']);
    expect(mockHrisService.getCutiBalance).toHaveBeenCalledWith('tenant-a', 'NIK-007');

    // Pastikan hanya 3 personal tools yang diberikan ke OpenAI (tanpa HR tools)
    const passedTools = mockOpenAI.chat.completions.create.mock.calls[0][0].tools;
    const toolNames = passedTools.map((t: any) => t.function.name);
    expect(toolNames).toEqual(['cek_sisa_cuti', 'cek_presensi_saya', 'cek_slip_gaji_saya']);
  });

  it('karyawan Staff ditolak jika AI memaksa memanggil HR-only tool (presensi_harian)', async () => {
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: true,
      data: { nik: 'NIK-007', name: 'Budi', position: 'Staff', department: 'Gudang' },
    });

    mockOpenAI.chat.completions.create
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call-hr',
                  type: 'function',
                  function: { name: 'presensi_harian', arguments: '{}' },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Maaf, data tersebut khusus HR/Manager.' } }],
      });

    const res = await service.handleMessage('tenant-a', '62812345@c.us', 'siapa yang telat hari ini?');
    expect(res.handled).toBe(true);
    expect(mockHrisService.getDailyAttendance).not.toHaveBeenCalled();
  });

  it('HR / Manager mendapat akses personal tools + HR tools dan memanggil HrisService tenant yang tepat', async () => {
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: true,
      data: {
        nik: 'NIK-HR-1',
        name: 'Siti HRD',
        position: 'HRD Manager',
        department: 'Human Resources',
      },
    });
    mockHrisService.getDailyAttendance.mockResolvedValueOnce({
      success: true,
      data: { hadir: 24, terlambat: 2 },
    });

    mockOpenAI.chat.completions.create
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call-daily',
                  type: 'function',
                  function: { name: 'presensi_harian', arguments: '{"tanggal":"2026-11-27"}' },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Rekap 2026-11-27: 24 hadir, 2 terlambat.' } }],
      });

    const res = await service.handleMessage('tenant-b', '628777@c.us', 'rekap absen hari ini');
    expect(res.handled).toBe(true);
    expect(res.reply).toContain('24 hadir');
    expect(mockHrisService.getDailyAttendance).toHaveBeenCalledWith('tenant-b', '2026-11-27');

    const passedTools = mockOpenAI.chat.completions.create.mock.calls[0][0].tools;
    expect(passedTools.map((t: any) => t.function.name)).toEqual([
      'cek_sisa_cuti',
      'cek_presensi_saya',
      'cek_slip_gaji_saya',
      'presensi_harian',
      'pengajuan_menunggu',
      'ringkasan_karyawan',
    ]);
  });

  it('isolasi memori multi-tenant & perintah /reset menghapus riwayat percakapan', async () => {
    mockHrisService.lookupKaryawan.mockResolvedValue({
      success: true,
      data: { nik: 'NIK-1', name: 'Alam', position: 'Manager', department: 'Operasional' },
    });
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'Siap, Alam.' } }],
    });

    await service.handleMessage('tenant-a', '628111@c.us', 'halo pertama');
    await service.handleMessage('tenant-a', '628111@c.us', 'pertanyaan kedua');

    // Call ke-2 harus membawa history call ke-1 (system + 2 history + user = 4 messages)
    const secondMessages = mockOpenAI.chat.completions.create.mock.calls[1][0].messages;
    expect(secondMessages).toHaveLength(4);

    // Tenant B dengan nomor sama tidak melihat history Tenant A
    await service.handleMessage('tenant-b', '628111@c.us', 'halo di tenant b');
    const tenantBMessages = mockOpenAI.chat.completions.create.mock.calls[2][0].messages;
    expect(tenantBMessages).toHaveLength(2); // system + user saja

    // /reset di tenant-a membersihkan history tenant-a
    const resetRes = await service.handleMessage('tenant-a', '628111@c.us', '/reset');
    expect(resetRes.handled).toBe(true);
    expect(resetRes.reply).toContain('direset');
  });

  it('tetap aman jika OPENAI_CLIENT null atau melempar error', async () => {
    // Gunakan service utama dulu untuk tes OpenAI error sebelum buildService(null) mengganti mock
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: true,
      data: { nik: 'NIK-1', name: 'Alam', position: 'Staff', department: 'IT' },
    });
    mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI timeout'));
    const errRes = await service.handleMessage('tenant-a', '628111@c.us', 'halo');
    expect(errRes.handled).toBe(true);
    expect(errRes.reply).toContain('gangguan');

    const noAiService = await buildService(null);
    mockHrisService.lookupKaryawan.mockResolvedValueOnce({
      success: true,
      data: { nik: 'NIK-1', name: 'Alam', position: 'Staff', department: 'IT' },
    });
    const noAiRes = await noAiService.handleMessage('tenant-a', '628111@c.us', 'halo');
    expect(noAiRes.handled).toBe(true);
    expect(noAiRes.reply).toContain('belum dikonfigurasi');
  });
});
