import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

@Injectable()
export class GenerateProductImagesTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'generate_product_images',
      {
        title: 'توليد صور منتج بالذكاء الاصطناعي',
        description:
          'يولّد صوراً احترافية لمنتج موجود (Higgsfield) انطلاقاً من صورته الأصلية، ويحفظها ويضيفها إلى صور المنتج. ' +
          'اكتب prompt بالإنجليزية يصف المشهد (الخلفية، الإضاءة، الأسلوب) مع الحفاظ على شكل المنتج. ' +
          'التوليد يأخذ حتى دقيقتين لكل صورة — ابدأ بصورة واحدة.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          productId: z.string().uuid().describe('معرّف المنتج (من list_products)'),
          prompt: z.string().max(1000).optional().describe('وصف المشهد بالإنجليزية (اختياري — يوجد وصف افتراضي لصورة منتج احترافية)'),
          count: z.number().int().min(1).max(4).optional().describe('عدد الصور (1–4، الافتراضي 1)'),
          aspectRatio: z.string().optional().describe('نسبة الأبعاد مثل 1:1 أو 4:5 أو 9:16'),
          addToProduct: z.boolean().optional().describe('إضافة الصور إلى المنتج (الافتراضي نعم)'),
        },
      },
      ({ storeId, productId, ...input }) =>
        toToolResult(() => this.mdstore.generateProductImages(apiKey, storeId, productId, input)),
    );
  }
}
