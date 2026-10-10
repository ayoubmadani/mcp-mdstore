import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'لون بصيغة #RRGGBB');

// عرض وتعديل إعدادات متجر، وعرض صفحات الهبوط
@Injectable()
export class ManageStoreTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'get_store',
      {
        title: 'عرض إعدادات المتجر',
        description: 'يعرض إعدادات متجر: الاسم، الدومين، اللغة، الألوان، الهيرو، الشريط العلوي، التواصل.',
        inputSchema: { storeId: z.string().uuid().describe('معرّف المتجر') },
      },
      ({ storeId }) => toToolResult(() => this.mdstore.getStore(apiKey, storeId)),
    );

    server.registerTool(
      'update_store',
      {
        title: 'تعديل المتجر',
        description:
          'يعدّل إعدادات متجر موجود — أرسل فقط ما تريد تغييره. ' +
          'لتغيير صورة الهيرو: ابحث عن صورة أفقية مناسبة من مصدر مجاني (Unsplash/Pexels) ومرّر رابطها المباشر https — المنصة تحفظها في تخزينها.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          name: z.string().min(1).optional().describe('اسم المتجر'),
          language: z.enum(['ar', 'fr', 'en']).optional().describe('لغة المتجر'),
          primaryColor: hex.optional().describe('اللون الأساسي'),
          secondaryColor: hex.optional().describe('اللون الثانوي'),
          heroImageUrl: z.string().url().optional().describe('صورة الهيرو (https)'),
          heroTitle: z.string().max(120).optional().describe('عنوان الهيرو'),
          heroSubtitle: z.string().max(250).optional().describe('وصف الهيرو'),
          topBarText: z.string().max(120).optional().describe('نص الشريط العلوي'),
          topBarEnabled: z.boolean().optional().describe('إظهار الشريط العلوي'),
          phone: z.string().optional().describe('هاتف المتجر'),
          whatsapp: z.string().optional().describe('واتساب المتجر'),
          email: z.string().email().optional().describe('بريد المتجر'),
        },
      },
      ({ storeId, ...input }) => toToolResult(() => this.mdstore.updateStore(apiKey, storeId, input)),
    );

    server.registerTool(
      'list_landing_pages',
      {
        title: 'عرض صفحات الهبوط',
        description: 'يعرض صفحات الهبوط في متجر.',
        inputSchema: { storeId: z.string().uuid().describe('معرّف المتجر') },
      },
      ({ storeId }) => toToolResult(() => this.mdstore.listLandingPages(apiKey, storeId)),
    );
  }
}
