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
          'إذا لم يوجد ثيم مناسب أو القائمة فارغة فاترك themeId ليأخذ الثيم الافتراضي، ثم استدعِ browse_theme_catalog ' +
          'واقترح على المستخدم 2 إلى 3 ثيمات من المعرض تناسب نشاط متجره (الاسم، السعر، لماذا يناسب) يمكنه شراؤها من صفحة القوالب. ' +
          'اذكر للمستخدم الثيم الذي اخترته. ' +
          '(6) بعد الإنشاء استدعِ update_store_seo بعنوان Google (30–60 حرفاً) ووصف (70–160 حرفاً) بلغة المتجر يناسبان نشاطه. ' +
          '(6) المتجر يُنشأ بدون أي تصنيفات أو منتجات تجريبية، فاملأه بمحتوى حقيقي خاص بنشاطه: ' +
          '2 إلى 5 تصنيفات (categories) و 4 إلى 8 منتجات (products) واقعية لهذا النشاط بالضبط، ' +
          'بأسعار منطقية بالدينار الجزائري، ووصف قصير مقنع بلغة المتجر (HTML بسيط مسموح)، وربط كل منتج بتصنيفه بالاسم. ' +
          'لكل منتج ابحث على الإنترنت عن صورة أو صورتين حقيقيتين تطابقان المنتج من مصدر مجاني (Unsplash أو Pexels) ' +
          'ومرّر الروابط المباشرة — المنصة تنزّلها وتحفظها. لا تكرر نفس الصورة لمنتجين. ' +
          'إذا تجاوز عدد المنتجات حد خطة المستخدم يُرفض الزائد ويظهر في النتيجة — أخبر المستخدم. ' +
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
          categories: z
            .array(
              z.object({
                name: z.string().min(1).max(100).describe('اسم التصنيف بلغة المتجر'),
                imageUrl: z.string().url().optional().describe('صورة التصنيف (رابط مباشر)'),
              }),
            )
            .max(10)
            .optional()
            .describe('تصنيفات المتجر الخاصة بنشاطه'),
          products: z
            .array(
              z.object({
                name: z.string().min(1).max(200).describe('اسم المنتج بلغة المتجر'),
                price: z.number().min(0).describe('سعر البيع (دج)'),
                originalPrice: z.number().min(0).optional().describe('السعر قبل التخفيض (يظهر مشطوباً)'),
                description: z.string().optional().describe('وصف قصير مقنع (HTML بسيط مسموح)'),
                images: z.array(z.string().url()).min(1).max(4).describe('روابط صور حقيقية للمنتج من Unsplash/Pexels'),
                category: z.string().optional().describe('اسم التصنيف (من categories أعلاه)'),
                stock: z.number().int().min(0).optional().describe('المخزون (الافتراضي 100)'),
                addons: z
                  .array(z.object({ name: z.string().min(1).max(100), price: z.number().min(0) }))
                  .max(10)
                  .optional()
                  .describe('إضافات اختيارية بسعرها (للمطاعم مثلاً: صلصة حارة +0)'),
              }),
            )
            .max(20)
            .optional()
            .describe('منتجات المتجر الخاصة بنشاطه'),
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
            categories: input.categories,
            products: input.products,
          }),
        ),
    );
  }
}
