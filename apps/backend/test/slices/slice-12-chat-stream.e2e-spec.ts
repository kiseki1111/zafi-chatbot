import { ChatStreamService, ChatStreamEvent } from '../../src/modules/chats/chat-stream.service';
import { firstValueFrom, toArray, take } from 'rxjs';

describe('Security Suite D: ChatStreamService Cross-Tenant SSE Isolation', () => {
  let service: ChatStreamService;

  beforeEach(() => {
    service = new ChatStreamService();
  });

  it('1. Listener Tenant A hanya menerima event milik Tenant A, bukan Tenant B', (done) => {
    const receivedEvents: any[] = [];

    // Subscribe sebagai user tenant-A
    const sub = service.subscribe(undefined, undefined, 'tenant-a', false).subscribe({
      next: (msgEvent: any) => {
        receivedEvents.push(msgEvent.data);
      },
    });

    // Emit pesan milik tenant-A
    service.emit({
      type: 'message',
      data: {
        conversationId: 'conv-a',
        instanceName: 'wa-a',
        tenantId: 'tenant-a',
        message: { content: 'Halo dari tenant A' },
      },
    });

    // Emit pesan milik tenant-B (tidak boleh diterima tenant-A)
    service.emit({
      type: 'message',
      data: {
        conversationId: 'conv-b',
        instanceName: 'wa-b',
        tenantId: 'tenant-b',
        message: { content: 'Pesan rahasia tenant B' },
      },
    });

    setTimeout(() => {
      sub.unsubscribe();
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].tenantId).toBe('tenant-a');
      expect(receivedEvents[0].message.content).toBe('Halo dari tenant A');
      done();
    }, 50);
  });

  it('2. Superadmin menerima semua event lintas-tenant saat mode isSuperadmin = true', (done) => {
    const superadminEvents: any[] = [];

    const sub = service.subscribe(undefined, undefined, null, true).subscribe({
      next: (msgEvent: any) => {
        superadminEvents.push(msgEvent.data);
      },
    });

    service.emit({
      type: 'message',
      data: { conversationId: 'c1', tenantId: 't1', message: { text: '1' } },
    });
    service.emit({
      type: 'message',
      data: { conversationId: 'c2', tenantId: 't2', message: { text: '2' } },
    });

    setTimeout(() => {
      sub.unsubscribe();
      expect(superadminEvents).toHaveLength(2);
      done();
    }, 50);
  });
});
