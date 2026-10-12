import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'لون بصيغة #RRGGBB');

@Injectable()
export class CreateStoreTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'create_store',
      {
        title: 'إنشاء متجر',
        description:
          'ينشئ متجراً جديداً على MdStore. الدومين هو النطاق الفرعي: "mystore" يصبح mystore.mdstore.top. ' +
          'جهّز المتجر كاملاً بدل تركه فارغاً: ' +
          '(1) ابحث على الإنترنت عن صورة هيرو أفقية عالية الجودة تناسب نشاط المتجر، من مصدر مجاني الاستعمال ' +
          '(Unsplash أو Pexels)، ومرّر رابط الصورة المباشر (https، ينتهي بملف صورة أو رابط images.unsplash.com/images.pexels.com) ' +
          '— المنصة تنزّلها وتحفظها في تخزينها. ' +
          '(2) اختر لوناً أساسياً وثانوياً متناسقين مع النشاط والصورة. ' +
          '(3) اكتب عنوان هيرو قصيراً جذاباً ووصفاً من سطر واحد بلغة المتجر. ' +
          '(4) نص شريط علوي قصير (مثل التوصيل/الدفع عند الاستلام). ' +
          '(5) قبل الإنشاء استدعِ list_available_themes، واختر الثيم الأقرب لنشاط المتجر حسب الوصف والوسوم ومرّر themeId؛ ' +
          'إذا لم يوجد ثيم مناسب أو القائمة فارغة فاترك themeId ليأخذ الثيم الافتراضي. اذكر للمستخدم الثيم الذي اخترته. ' +
          'اللغة الافتراضية العربية والعملة DZD ما لم يطلب المستخدم غير ذلك.',
        inputSchema: {
          name: z.string().min(1).describe('اسم المتجر'),
          domain: z.string().min(1).describe('النطاق الفرعي للمتجر، مثل "mystore" (بدون .mdstore.top)'),
          language: z.enum(['ar', 'fr', 'en']).optional().describe('لغة المتجر (الافتراضي ar)'),
          currency: z.string().optional().describe('العملة (الافتراضي DZD)'),
          primaryColor: hex.optional().describe('اللون الأساسي #RRGGBB'),
          secondaryColor: hex.optional().describe('اللون الثانوي #RRGGBB'),
          heroImageUrl: z.string().url().optional().describe('رابط صورة الهيرو المباشر (https)'),
          heroTitle: z.string().max(120).optional().describe('عنوان الهيرو'),
          heroSubtitle: z.string().max(250).optional().describe('وصف الهيرو'),
          topBarText: z.string().max(120).optional().describe('نص الشريط العلوي'),
          cart: z.boolean().optional().describe('تفعيل السلة (الافتراضي حسب المنصة)'),
          themeId: z.string().uuid().optional().describe('معرّف الثيم الأقرب للنشاط (من list_available_themes)'),
        },
      },
      (input) =>
        toToolResult(() =>
          this.mdstore.createStore(apiKey, {
            name: input.name,
            subdomain: input.domain,
            language: input.language ?? 'ar',
            currency: input.currency ?? 'DZD',
            cart: input.cart,
            design: { primaryColor: input.primaryColor, secondaryColor: input.secondaryColor },
            hero: { imageUrl: input.heroImageUrl, title: input.heroTitle, subtitle: input.heroSubtitle },
            topBar: input.topBarText
              ? { enabled: true, text: input.topBarText, color: input.primaryColor }
              : {},
            themeId: input.themeId,
          }),
        ),
    );
  }
}
