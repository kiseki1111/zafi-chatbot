import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../core/prisma/prisma.service';

const sharp = require('sharp');

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroups(tenantId: string) {
    try {
      let filterWhere: any = {};
      // ponytail: strict isolation - prevent leaking perumahan across accounts
      if (tenantId === 'all') {
        filterWhere = {};
      } else if (tenantId) {
        filterWhere = { tenantId };
      } else {
        return [];
      }

      return await this.prisma.resourceGroup.findMany({
        where: filterWhere,
        include: {
          items: {
            orderBy: { code: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      console.error('Error getGroups in AvailabilityService:', error);
      return [];
    }
  }

  async createGroup(
    tenantId: string,
    data: {
      name: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
      pricingTemplates?: any;
    },
  ) {
    try {
      let validTenantId: string | null = null;
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        if (tenant) {
          validTenantId = tenant.id;
        }
      }

      return await this.prisma.resourceGroup.create({
        data: {
          tenantId: validTenantId,
          name: data.name,
          category: data.category || 'properti',
          description: data.description || null,
          siteplanImage: data.siteplanImage || null,
          pricingTemplates: (data.pricingTemplates || []) as any,
        } as any,
        include: { items: true },
      });
    } catch (error: any) {
      console.error('Error createGroup in AvailabilityService:', error);
      throw error;
    }
  }

  async updateGroup(
    id: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
      pricingTemplates?: any;
    },
    tenantId?: string,
  ) {
    if (tenantId) {
      const group = await this.prisma.resourceGroup.findFirst({
        where: { id, tenantId },
      });
      if (!group) throw new NotFoundException('Group not found or access denied');
    }
    return this.prisma.resourceGroup.update({
      where: { id },
      data: data as any,
      include: { items: true },
    });
  }

  async deleteGroup(id: string, tenantId?: string) {
    if (tenantId) {
      const group = await this.prisma.resourceGroup.findFirst({
        where: { id, tenantId },
      });
      if (!group) throw new NotFoundException('Group not found or access denied');
    }
    return this.prisma.resourceGroup.delete({
      where: { id },
    });
  }

  async addItem(
    groupId: string,
    data: {
      code: string;
      name?: string;
      propertyType?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
    tenantId?: string,
  ) {
    if (tenantId) {
      const group = await this.prisma.resourceGroup.findFirst({
        where: { id: groupId, tenantId },
      });
      if (!group) throw new NotFoundException('Group not found or access denied');
    }
    return this.prisma.resourceItem.create({
      data: {
        groupId,
        code: data.code,
        name: data.name,
        propertyType: data.propertyType || 'BANGUNAN',
        houseType: data.houseType,
        status: data.status || 'AVAILABLE',
        price: data.price,
        capacity: data.capacity || 1,
        notes: data.notes,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      },
    });
  }

  async addBatchItems(
    groupId: string,
    prefix: string,
    startNumber: number,
    endNumber: number,
    houseType?: string,
    price?: number,
    tenantId?: string,
    propertyType: string = 'BANGUNAN',
  ) {
    if (tenantId) {
      const group = await this.prisma.resourceGroup.findFirst({
        where: { id: groupId, tenantId },
      });
      if (!group) throw new NotFoundException('Group not found or access denied');
    }
    const itemsData: any[] = [];
    for (let i = startNumber; i <= endNumber; i++) {
      const code = `${prefix}${i < 10 ? '0' + i : i}`;
      itemsData.push({
        groupId,
        code,
        propertyType: propertyType || 'BANGUNAN',
        houseType: houseType || null,
        status: 'AVAILABLE',
        price: price || null,
        capacity: 1,
      });
    }

    return this.prisma.resourceItem.createMany({
      data: itemsData,
      skipDuplicates: true,
    });
  }

  async updateItem(
    id: string,
    data: {
      code?: string;
      name?: string;
      propertyType?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
    tenantId?: string,
  ) {
    if (tenantId) {
      const item = await this.prisma.resourceItem.findFirst({
        where: { id, group: { tenantId } },
      });
      if (!item) throw new NotFoundException('Item not found or access denied');
    }
    return this.prisma.resourceItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string, tenantId?: string) {
    if (tenantId) {
      const item = await this.prisma.resourceItem.findFirst({
        where: { id, group: { tenantId } },
      });
      if (!item) throw new NotFoundException('Item not found or access denied');
    }
    return this.prisma.resourceItem.delete({
      where: { id },
    });
  }

  // ponytail: render SVG to JPG for visual siteplan delivery via WhatsApp
  private escapeXml(unsafe: string): string {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  buildSiteplanSvg(groupName: string, items: any[], customLayout?: any): string {
    const width = 1600;
    const height = 900;

    // Natural alphanumeric sorting (A1, A2, A3... A10 instead of A1, A10, A11... A2)
    const sortedItems = [...items].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }),
    );

    const getColor = (item: any) => {
      const s = String(item.status || '').toUpperCase();
      const n = String(item.notes || '').toUpperCase();
      if (s === 'OCCUPIED' || s === 'TERJUAL' || n.includes('TERJUAL')) return '#EF4444';
      if (s === 'BOOKED' || s === 'PROSES_BANK' || n.includes('PROSES BANK') || n.includes('PROSES')) return '#F97316';
      if (s === 'AVAILABLE' || s === 'READY' || n.includes('READY')) return '#22C55E';
      if (s === 'MAINTENANCE' || n.includes('CONTOH') || n.includes('BOOKING')) return '#3B82F6';
      if (n.includes('CASH') || n.includes('TYPE 40') || String(item.houseType || '').includes('40')) return '#06B6D4';
      return '#22C55E';
    };

    const readyCount = sortedItems.filter((i) => (i.status || '').toUpperCase() === 'AVAILABLE').length;
    const bookedCount = sortedItems.filter((i) => (i.status || '').toUpperCase() === 'BOOKED').length;
    const soldCount = sortedItems.filter((i) => (i.status || '').toUpperCase() === 'OCCUPIED').length;

    let roadsSvg = '';
    let fasosSvg = '';
    let unitsSvg = '';

    const unitW = Number(customLayout?.unitWidth) || 48;
    const unitH = Number(customLayout?.unitHeight) || 68;

    // 1. Render Roads
    if (Array.isArray(customLayout?.roads) && customLayout.roads.length > 0) {
      customLayout.roads.forEach((r: any) => {
        const rw = ((r.width || 80) / 100) * width;
        const rh = ((r.height || 10) / 100) * height;
        const rx = ((r.x || 50) / 100) * width - rw / 2;
        const ry = ((r.y || 50) / 100) * height - rh / 2;
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;
        const rot = Number(r.rotation) || 0;
        const roadTitle = this.escapeXml(r.name || 'JALAN KOMPLEK');

        roadsSvg += `
          <g transform="rotate(${rot}, ${cx}, ${cy})">
            <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#334155" rx="6"/>
            <line x1="${rx}" y1="${ry + rh / 2}" x2="${rx + rw}" y2="${ry + rh / 2}" stroke="#FBBF24" stroke-width="3" stroke-dasharray="15,10"/>
            <text x="${cx}" y="${cy + 5}" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">${roadTitle}</text>
          </g>
        `;
      });
    } else {
      // Default central road
      const roadY = 410;
      const roadH = 80;
      const defaultRoadTitle = this.escapeXml(`JALAN KOMPLEK ${groupName.toUpperCase()}`);
      roadsSvg = `
        <g id="road">
          <rect x="60" y="${roadY}" width="${width - 120}" height="${roadH}" fill="#334155" rx="6"/>
          <line x1="60" y1="${roadY + roadH / 2}" x2="${width - 60}" y2="${roadY + roadH / 2}" stroke="#FBBF24" stroke-width="3" stroke-dasharray="15,10"/>
          <text x="${width / 2}" y="${roadY + roadH / 2 + 6}" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
            ${defaultRoadTitle}
          </text>
        </g>
      `;
    }

    // 2. Render Fasos
    if (Array.isArray(customLayout?.fasos) && customLayout.fasos.length > 0) {
      customLayout.fasos.forEach((f: any) => {
        const fx = ((f.x || 50) / 100) * width - (((f.width || 8) / 100) * width) / 2;
        const fy = ((f.y || 24) / 100) * height - (((f.height || 10) / 100) * height) / 2;
        const fw = ((f.width || 8) / 100) * width;
        const fh = ((f.height || 10) / 100) * height;
        const fasosTitle = this.escapeXml(f.name || 'FASOS');

        fasosSvg += `
          <g>
            <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="2"/>
            <text x="${fx + fw / 2}" y="${fy + fh / 2}" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#92400E" text-anchor="middle" dominant-baseline="middle">${fasosTitle}</text>
          </g>
        `;
      });
    } else {
      fasosSvg = `
        <g id="fasos">
          <rect x="${width * 0.48 - 60}" y="190" width="120" height="${unitH}" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="2"/>
          <text x="${width * 0.48}" y="${190 + unitH / 2}" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#92400E" text-anchor="middle" dominant-baseline="middle">FASOS</text>
        </g>
      `;
    }

    // 3. Render Units (using custom coordinates or auto-straight 2-row layout)
    const hasCustomPositions = customLayout?.unitPositions && Object.keys(customLayout.unitPositions).length > 0;

    if (hasCustomPositions) {
      sortedItems.forEach((item) => {
        const pos = customLayout.unitPositions[item.code] || { x: 50, y: 50 };
        const ux = (pos.x / 100) * width - unitW / 2;
        const uy = (pos.y / 100) * height - unitH / 2;
        const color = getColor(item);
        const itemCodeEscaped = this.escapeXml(item.code);
        const houseTypeEscaped = this.escapeXml(item.houseType ? 'T-' + item.houseType : '');

        unitsSvg += `
          <g id="unit-${itemCodeEscaped}">
            <rect x="${ux}" y="${uy}" width="${unitW}" height="${unitH}" rx="4" fill="${color}" stroke="#1E293B" stroke-width="1.5"/>
            <text x="${ux + unitW / 2}" y="${uy + unitH / 2 - 4}" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${itemCodeEscaped}</text>
            <text x="${ux + unitW / 2}" y="${uy + unitH - 10}" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#FFFFFF" opacity="0.9" text-anchor="middle">${houseTypeEscaped}</text>
          </g>
        `;
      });
    } else {
      // Natural straight 2-row layout
      const blockA = sortedItems.filter((i) => i.code.startsWith('A') || i.code.startsWith('a'));
      const blockB = sortedItems.filter((i) => i.code.startsWith('B') || i.code.startsWith('b'));
      const others = sortedItems.filter(
        (i) => !i.code.startsWith('A') && !i.code.startsWith('a') && !i.code.startsWith('B') && !i.code.startsWith('b'),
      );

      let row1 = blockA;
      let row2 = blockB;
      if (row1.length === 0 && row2.length === 0) {
        const half = Math.ceil(sortedItems.length / 2);
        row1 = sortedItems.slice(0, half);
        row2 = sortedItems.slice(half);
      } else if (others.length > 0) {
        row2 = [...row2, ...others];
      }

      const marginX = 80;
      const usableW = width - marginX * 2;
      const maxCount = Math.max(row1.length, row2.length, 1);
      const computedUnitW = Math.max(34, Math.min(50, Math.floor((usableW - 140) / maxCount)));

      const renderStraightRow = (rowItems: any[], startY: number, hasFasosCenter = false) => {
        let elements = '';
        const fasosIndex = Math.floor(rowItems.length / 2);
        let curX = marginX;

        rowItems.forEach((item, idx) => {
          if (hasFasosCenter && idx === fasosIndex) {
            curX += computedUnitW * 2 + 10;
          }

          const color = getColor(item);
          const itemCodeEscaped = this.escapeXml(item.code);
          const houseTypeEscaped = this.escapeXml(item.houseType ? 'T-' + item.houseType : '');

          elements += `
            <g id="unit-${itemCodeEscaped}">
              <rect x="${curX}" y="${startY}" width="${computedUnitW}" height="${unitH}" rx="4" fill="${color}" stroke="#1E293B" stroke-width="1.5"/>
              <text x="${curX + computedUnitW / 2}" y="${startY + unitH / 2 - 4}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${itemCodeEscaped}</text>
              <text x="${curX + computedUnitW / 2}" y="${startY + unitH - 10}" font-family="Arial, sans-serif" font-size="8.5" font-weight="700" fill="#FFFFFF" opacity="0.9" text-anchor="middle">${houseTypeEscaped}</text>
            </g>
          `;
          curX += computedUnitW + 4;
        });
        return elements;
      };

      unitsSvg += renderStraightRow(row1, 200, true);
      unitsSvg += renderStraightRow(row2, 530, false);
    }

    const groupTitle = this.escapeXml(`SITE PLAN ${groupName.toUpperCase()}`);

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#FFFFFF"/>
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="12" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>

        <!-- Header -->
        <text x="${width / 2}" y="65" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="2">
          ${groupTitle}
        </text>
        <text x="${width / 2}" y="95" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#64748B" text-anchor="middle">
          Total: ${sortedItems.length} Unit | Unit Ready: ${readyCount} | Proses Bank: ${bookedCount} | Sudah Terjual: ${soldCount}
        </text>

        <!-- Roads & Fasos -->
        ${roadsSvg}
        ${fasosSvg}

        <!-- Units -->
        ${unitsSvg}

        <!-- Legenda -->
        <g id="legend" transform="translate(80, 710)">
          <rect x="0" y="0" width="${width - 160}" height="120" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
          <text x="25" y="30" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#0F172A">LEGENDA STATUS KAVLING:</text>
          
          <!-- Item 1: Terjual -->
          <rect x="25" y="46" width="30" height="20" rx="3" fill="#EF4444" stroke="#1E293B" stroke-width="1.5"/>
          <text x="65" y="61" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E293B">SUDAH TERJUAL</text>

          <!-- Item 2: Proses Bank -->
          <rect x="240" y="46" width="30" height="20" rx="3" fill="#F97316" stroke="#1E293B" stroke-width="1.5"/>
          <text x="280" y="61" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E293B">UNIT PROSES BANK</text>

          <!-- Item 3: Unit Ready -->
          <rect x="490" y="46" width="30" height="20" rx="3" fill="#22C55E" stroke="#1E293B" stroke-width="1.5"/>
          <text x="530" y="61" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E293B">UNIT READY (TERSEDIA)</text>

          <!-- Item 4: Rumah Contoh -->
          <rect x="25" y="80" width="30" height="20" rx="3" fill="#3B82F6" stroke="#1E293B" stroke-width="1.5"/>
          <text x="65" y="95" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E293B">RUMAH CONTOH / BOOKING</text>

          <!-- Item 5: Konsumen Cash -->
          <rect x="240" y="80" width="30" height="20" rx="3" fill="#06B6D4" stroke="#1E293B" stroke-width="1.5"/>
          <text x="280" y="95" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E293B">KONSUMEN CASH / KHUSUS</text>

          <!-- Item 6: Fasos -->
          <rect x="490" y="80" width="30" height="20" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"/>
          <text x="530" y="95" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E293B">FASILITAS UMUM (FASOS)</text>

          <!-- Watermark Update -->
          <text x="${width - 190}" y="95" font-family="Arial, sans-serif" font-size="11" font-style="italic" fill="#94A3B8" text-anchor="end">
            *Diperbarui Real-time Otomatis oleh Sistem ZAF Sales AI
          </text>
        </g>
      </svg>
    `;
  }

  async getLiveSiteplanJpeg(groupId: string): Promise<Buffer> {
    const group = await this.prisma.resourceGroup.findUnique({
      where: { id: groupId },
      include: { items: { orderBy: { code: 'asc' } } },
    });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);

    let customLayout: any = null;
    let templates = group.pricingTemplates as any;
    if (typeof templates === 'string') {
      try { templates = JSON.parse(templates); } catch {}
    }
    if (templates?.siteplanLayout) {
      customLayout = templates.siteplanLayout;
    }

    const svg = this.buildSiteplanSvg(group.name, group.items || [], customLayout);
    const jpegBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();

    const filename = `siteplan-${group.id}.jpg`;
    const targetDirs = [
      path.join(process.cwd(), 'uploads', 'incoming'),
      path.join(process.cwd(), 'apps', 'backend', 'uploads', 'incoming'),
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'incoming'),
    ];
    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), jpegBuffer);
      } catch (e) {}
    }

    return jpegBuffer;
  }

  async generateSiteplanImage(groupId: string, tenantId?: string): Promise<{ url: string; fullUrl: string; filename: string }> {
    const group = await this.prisma.resourceGroup.findUnique({
      where: { id: groupId },
      include: {
        items: {
          orderBy: { code: 'asc' },
        },
      },
    });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const items = group.items || [];
    const filename = `siteplan-${group.id}.jpg`;
    const relativeUrl = `/uploads/incoming/${filename}`;

    let customLayout: any = null;
    let templates = group.pricingTemplates as any;
    if (typeof templates === 'string') {
      try { templates = JSON.parse(templates); } catch {}
    }
    if (templates?.siteplanLayout) {
      customLayout = templates.siteplanLayout;
    }

    const svg = this.buildSiteplanSvg(group.name, items, customLayout);
    const jpegBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();

    const targetDirs = [
      path.join(process.cwd(), 'uploads', 'incoming'),
      path.join(process.cwd(), 'apps', 'backend', 'uploads', 'incoming'),
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'incoming'),
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, filename), jpegBuffer);
      } catch (e) {}
    }

    let currentMedias: any[] = [];
    if (group.siteplanImage) {
      try {
        const raw = group.siteplanImage.trim();
        if (raw.startsWith('[')) {
          currentMedias = JSON.parse(raw);
        } else if (raw) {
          currentMedias = [{ id: 'legacy', name: 'Siteplan Utama', url: raw, type: 'image' }];
        }
      } catch (e) {}
    }

    const mediaId = `siteplan-${group.id}`;
    const mediaItem = {
      id: mediaId,
      name: `Denah Siteplan ${group.name}`,
      url: relativeUrl,
      type: 'image',
      description: `Denah visual siteplan resmi ${group.name} dengan status kavling terbaru`,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = currentMedias.findIndex((m: any) => m.id === mediaId || m.name?.includes('Siteplan'));
    if (existingIdx !== -1) {
      currentMedias[existingIdx] = mediaItem;
    } else {
      currentMedias.unshift(mediaItem);
    }

    await this.prisma.resourceGroup.update({
      where: { id: group.id },
      data: {
        siteplanImage: JSON.stringify(currentMedias),
      },
    });

    return {
      url: relativeUrl,
      fullUrl: relativeUrl,
      filename,
    };
  }

  async saveSiteplanLayout(
    groupId: string,
    body: { layout?: any; imageBase64?: string },
    tenantId?: string,
  ) {
    const group = await this.prisma.resourceGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    // Persist layout to pricingTemplates
    let templates = group.pricingTemplates as any;
    if (typeof templates === 'string') {
      try { templates = JSON.parse(templates); } catch { templates = {}; }
    }
    if (Array.isArray(templates)) {
      templates = { list: templates, siteplanLayout: body.layout };
    } else if (typeof templates === 'object' && templates !== null) {
      templates.siteplanLayout = body.layout;
    } else {
      templates = { siteplanLayout: body.layout };
    }

    await this.prisma.resourceGroup.update({
      where: { id: group.id },
      data: {
        pricingTemplates: templates as any,
      },
    });

    const filename = `siteplan-${group.id}.jpg`;
    const relativeUrl = `/uploads/incoming/${filename}`;

    if (body.imageBase64) {
      const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 95 }).toBuffer();

      const targetDirs = [
        path.join(process.cwd(), 'uploads', 'incoming'),
        path.join(process.cwd(), 'apps', 'backend', 'uploads', 'incoming'),
        path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', 'incoming'),
      ];

      for (const dir of targetDirs) {
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(path.join(dir, filename), jpegBuffer);
        } catch (e) {}
      }

      let currentMedias: any[] = [];
      if (group.siteplanImage) {
        try {
          const raw = group.siteplanImage.trim();
          if (raw.startsWith('[')) {
            currentMedias = JSON.parse(raw);
          } else if (raw) {
            currentMedias = [{ id: 'legacy', name: 'Siteplan Utama', url: raw, type: 'image' }];
          }
        } catch (e) {}
      }

      const mediaId = `siteplan-${group.id}`;
      const mediaItem = {
        id: mediaId,
        name: `Denah Siteplan ${group.name}`,
        url: relativeUrl,
        type: 'image',
        description: `Denah visual siteplan resmi ${group.name} dengan status kavling terbaru`,
        createdAt: new Date().toISOString(),
      };

      const existingIdx = currentMedias.findIndex((m: any) => m.id === mediaId || m.name?.includes('Siteplan'));
      if (existingIdx !== -1) {
        currentMedias[existingIdx] = mediaItem;
      } else {
        currentMedias.unshift(mediaItem);
      }

      await this.prisma.resourceGroup.update({
        where: { id: group.id },
        data: {
          siteplanImage: JSON.stringify(currentMedias),
        },
      });

      return { success: true, url: relativeUrl, filename };
    }

    return this.generateSiteplanImage(groupId, tenantId);
  }
}
