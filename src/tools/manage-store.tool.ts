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
      'get_store_seo',
      {
        title: 'عرض SEO المتجر',
        description: 'يعرض إعدادات SEO لمتجر: عنوان ووصف Google، الكلمات المفتاحية، صورة المشاركة، رموز تحقق Google/Bing، والسماح بالفهرسة. القيمة null = يُستعمل الافتراضي (اسم المتجر، نص الهيرو، صورة الهيرو).',
        inputSchema: { storeId: z.string().uuid().describe('معرّف المتجر') },
      },
      ({ storeId }) => toToolResult(() => this.mdstore.getStoreSeo(apiKey, storeId)),
    );

    server.registerTool(
      'update_store_seo',
      {
        title: 'تعديل SEO المتجر',
        description:
          'يعدّل SEO متجر (كيف يظهر في Google وعند مشاركة رابطه) — أرسل فقط ما تريد تغييره، و"" يحذف القيمة. ' +
          'اكتب العنوان والوصف بلغة المتجر: العنوان 30–60 حرفاً (اسم المتجر + ما يبيعه + ميزة، مثل التوصيل لكل الولايات)، ' +
          'والوصف 70–160 حرفاً يشرح المنتجات ويدعو للشراء. لا تحشو كلمات مفتاحية. ' +
          'صورة المشاركة رابط https مباشر بمقاس قريب من 1200×630. ' +
          'رموز التحقق: يقبل الوسم <meta …> كاملاً أو الرمز وحده — لا تخترعها، اطلبها من المستخدم. ' +
          'allowIndexing=false يخفي المتجر من Google (لمتجر قيد التجهيز فقط).',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          metaTitle: z.string().max(70).optional().describe('عنوان Google (حتى 70 حرفاً، الأفضل 30–60)'),
          metaDescription: z.string().max(170).optional().describe('وصف Google (حتى 170 حرفاً، الأفضل 70–160)'),
          keywords: z.string().max(300).optional().describe('كلمات مفتاحية مفصولة بفواصل'),
          ogImageUrl: z.string().max(500).optional().describe('صورة المشاركة (https) أو "" لحذفها'),
          googleVerification: z.string().max(300).optional().describe('رمز/وسم Google Search Console'),
          bingVerification: z.string().max(300).optional().describe('رمز/وسم Bing Webmaster'),
          allowIndexing: z.boolean().optional().describe('السماح لمحركات البحث بالفهرسة'),
        },
      },
      ({ storeId, ...input }) => toToolResult(() => this.mdstore.updateStoreSeo(apiKey, storeId, input)),
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
