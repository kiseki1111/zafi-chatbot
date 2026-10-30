import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SearchService, SearchCategoryResult } from './search.service';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  private getCtx(req: any): { tenantId: string | null; isSuperadmin: boolean } {
    const user = req?.user;
    return {
      tenantId: user?.tenantId || null,
      isSuperadmin:
        Array.isArray(user?.roles) && user.roles.includes('superadmin'),
    };
  }

  /**
   * GET /api/v1/search?q=...&category=all|contacts|messages|knowledge|units|products
   * REST standar — mengembalikan seluruh hasil setelah semua query selesai.
   */
  @Get()
  async search(
    @Query('q') q: string,
    @Query('category') category = 'all',
    @Req() req: any,
  ) {
    if (!q || q.trim().length < 1) return { results: [] };
    const query = q.trim();
    const { tenantId, isSuperadmin } = this.getCtx(req);

    let results: SearchCategoryResult[];

    switch (category) {
      case 'contacts':
        results = [
          await this.searchService.searchContacts(
            query,
            tenantId,
            isSuperadmin,
          ),
        ];
        break;
      case 'messages':
        results = [
          await this.searchService.searchMessages(
            query,
            tenantId,
            isSuperadmin,
          ),
        ];
        break;
      case 'knowledge':
        results = [
          await this.searchService.searchKnowledge(
            query,
            tenantId,
            isSuperadmin,
          ),
        ];
        break;
      case 'units':
        results = [
          await this.searchService.searchUnits(query, tenantId, isSuperadmin),
        ];
        break;
      case 'products':
        results = [
          await this.searchService.searchProducts(
            query,
            tenantId,
            isSuperadmin,
          ),
        ];
        break;
      default:
        results = await this.searchService.searchAll(
          query,
          tenantId,
          isSuperadmin,
        );
    }

    return { q: query, results };
  }

  /**
   * GET /api/v1/search/stream?q=...
   * Server-Sent Events — emisi hasil parsial begitu tiap kategori selesai.
   * Frontend bisa render kontak sebelum pesan (yang biasanya lebih lambat) selesai.
   */
  @Get('stream')
  async searchStream(
    @Query('q') q: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!q || q.trim().length < 1) {
      res.status(400).json({ error: 'q is required' });
      return;
    }

    const query = q.trim();
    const { tenantId, isSuperadmin } = this.getCtx(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data: SearchCategoryResult) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Luncurkan tiap kategori secara independen; emisi segera setelah selesai
    // Urutan: kontak → unit → knowledge → produk → pesan (dari tercepat ke terlambat)
    const promises = [
      this.searchService
        .searchContacts(query, tenantId, isSuperadmin)
        .then(send),
      this.searchService.searchUnits(query, tenantId, isSuperadmin).then(send),
      this.searchService
        .searchKnowledge(query, tenantId, isSuperadmin)
        .then(send),
      this.searchService
        .searchProducts(query, tenantId, isSuperadmin)
        .then(send),
      this.searchService
        .searchMessages(query, tenantId, isSuperadmin)
        .then(send),
    ];

    try {
      await Promise.allSettled(promises);
    } finally {
      if (!res.writableEnded) {
        res.write('data: {"category":"__done__","items":[],"totalMs":0}\n\n');
        res.end();
      }
    }
  }
}
