import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

@Injectable()
export class ImportProductFromLinkTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'import_product_from_link',
      {
        title: 'إنشاء منتج من رابط AliExpress',
        description:
          'ينشئ منتجاً في متجر المستخدم على MdStore من رابط منتج AliExpress: المنصة تجلب الاسم والوصف والصور ' +
          'والخصائص (الألوان/المقاسات) تلقائياً. ' +
          'إذا أرسل المستخدم صورة منتج أو وصفاً فقط: ابحث أولاً على الإنترنت عن نفس المنتج في AliExpress ' +
          'واختر رابط صفحة المنتج (aliexpress.com/item/<رقم>.html)، واعرضه على المستخدم للتأكيد. ' +
          'سعر البيع بالدينار الجزائري مطلوب — اسأل المستخدم عنه إن لم يذكره. ' +
          'استعمل list_stores لمعرفة storeId إن لم يكن معروفاً.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          url: z.string().url().describe('رابط منتج AliExpress (أو رقم المنتج)'),
          price: z.number().positive().describe('سعر البيع في المتجر (دج)'),
          stock: z.number().int().min(0).optional().describe('الكمية المتوفرة'),
          name: z.string().min(1).max(200).optional().describe('اسم بديل للمنتج (اختياري)'),
          language: z.enum(['ar', 'fr', 'en']).optional().describe('لغة جلب الاسم والوصف'),
        },
      },
      ({ storeId, ...input }) =>
        toToolResult(() => this.mdstore.importAliexpressProduct(apiKey, storeId, input)),
    );
  }
}
