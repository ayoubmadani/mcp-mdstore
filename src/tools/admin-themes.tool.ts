import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// أدوات مدير المنصة — تُسجَّل فقط لمفتاح mdsa_ (لا تظهر أبداً لمفتاح تاجر).
// كل عملية تعديل تطلب PIN جديداً: الأداة ترجع أولاً أسماء الرموز، والمدير يعطي الرقم لـ Claude.
// Sweet Delights Pastry Theme → sweet-delights-pastry-theme
const slugify = (name: string) => {
  const base = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base.endsWith('-theme') || base === 'theme' ? base : `${base}-theme`;
};

@Injectable()
export class AdminThemesTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'admin_list_theme_types',
      {
        title: 'أنواع الثيمات (أدمن)',
        description:
          'يعرض أنواع الثيمات (id والاسم) لاختيار typeId عند إنشاء ثيم. ' +
          'hidden=true يعني أن ثيمات هذا النوع لا تظهر للتجار في معرض الثيمات (مثل testing و custom) — لا تختره لثيم عادي.',
        inputSchema: {},
      },
      () => toToolResult(() => this.mdstore.adminListThemeTypes(apiKey)),
    );

    server.registerTool(
      'admin_create_theme_type',
      {
        title: 'إنشاء نوع ثيم (أدمن)',
        description:
          'ينشئ نوع ثيم جديد (فئة نشاط مثل «Food & Restaurants»). استعمله عندما لا يناسب أي نوع موجود في admin_list_theme_types — ' +
          'تحقق أولاً أنه غير موجود. الاسم بالإنجليزية بصيغة الأنواع الحالية (مثل «Beauty & Cosmetics»). ' +
          'يحتاج PIN جديداً: استدعِ الأداة أولاً بدون pin و challenge_token فترجع أسماء الرموز، ' +
          'اطلب الـ PIN من المستخدم (لا تخمّنه)، ثم أعد الاستدعاء مع pin و challenge_token.',
        inputSchema: {
          name: z.string().min(1).max(100).describe('اسم النوع بالإنجليزية، مثل: Food & Restaurants'),
          pin: z.string().regex(/^\d{6}$/).optional().describe('رمز PIN من 6 أرقام يعطيه المستخدم لهذا التحدّي'),
          challenge_token: z.string().optional().describe('التوكن الذي أرجعته الأداة في الاستدعاء الأول'),
        },
      },
      ({ name, pin, challenge_token }) =>
        toToolResult(async () => {
          if (!pin || !challenge_token) {
            const { label, challenge_token: token } = await this.mdstore.adminPinChallenge(apiKey);
            return {
              status: 'pin_required',
              name,
              challenge: label,
              challenge_token: token,
              instructions:
                `اطلب من المستخدم رمز PIN للتحدّي ${label} (6 أرقام)، ثم أعد استدعاء admin_create_theme_type ` +
                'بنفس الاسم مع pin و challenge_token. صالح 5 دقائق.',
            };
          }
          return this.mdstore.adminCreateThemeType(apiKey, name, pin, challenge_token);
        }),
    );

    server.registerTool(
      'admin_create_theme',
      {
        title: 'إنشاء ثيم (أدمن)',
        description:
          'ينشئ سجل ثيم جديد في المنصة (غير مفعّل حتى يُرفع ملفه ويُفعَّل من لوحة الأدمن). ' +
          'المستخدم يعطي فكرة القالب فقط (مثلاً: «قالب لمحلات الحلويات») وأنت تصنع كل الحقول بنفسك: ' +
          'اسم جذاب بالعربية والفرنسية والإنجليزية بصيغة «قالب …» / «Thème …» / «… Theme»، ' +
          'وصف تسويقي قصير لكل لغة يذكر النشاط المستهدف، slug إنجليزي بشرطات ينتهي بـ -theme، ' +
          '3 إلى 6 وسوم إنجليزية بشرطات، صورة معاينة من images.unsplash.com تناسب النشاط (بصيغة ?w=800)، ' +
          'و typeId الأقرب من admin_list_theme_types (استدعها أولاً؛ تجنّب الأنواع hidden، وإن لم يناسب أي نوع اقترح إنشاء واحد بـ admin_create_theme_type). السعر 0 ما لم يحدد المستخدم غيره. ' +
          'اعرض الـ JSON على المستخدم قبل طلب الـ PIN. ' +
          'يحتاج PIN جديداً في كل مرة: استدعِ الأداة أولاً بدون pin و challenge_token فترجع أسماء الرموز ' +
          '(مثل ZZMMHH) و challenge_token. اطلب من المستخدم رمز PIN لهذه الأسماء — لا تخمّن الرمز ولا تعِد استعمال رمز سابق — ' +
          'ثم أعد الاستدعاء بنفس بيانات الثيم مع pin و challenge_token. التحدّي صالح 5 دقائق ولعملية واحدة.',
        inputSchema: {
          name_en: z.string().min(1).max(200).describe('الاسم بالإنجليزية، مثل: Sweet Delights Pastry Theme'),
          name_ar: z.string().min(1).max(200).describe('الاسم بالعربية، مثل: قالب حلويات المذاق الرفيع'),
          name_fr: z.string().min(1).max(200).describe('الاسم بالفرنسية، مثل: Thème Douceurs & Pâtisserie'),
          slug: z
            .string()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .optional()
            .describe('يطابق اسم ملف الثيم؛ يُشتق من name_en إن لم يُعطَ (مثل sweet-delights-pastry-theme)'),
          price: z.number().min(0).optional().describe('السعر (الافتراضي 0 = مجاني)'),
          desc_en: z.string().min(1).describe('وصف تسويقي قصير بالإنجليزية'),
          desc_ar: z.string().min(1).describe('وصف تسويقي قصير بالعربية'),
          desc_fr: z.string().min(1).describe('وصف تسويقي قصير بالفرنسية'),
          imageUrl: z.string().url().describe('صورة معاينة من images.unsplash.com تناسب النشاط'),
          tag: z.array(z.string()).max(8).optional().describe('3-6 وسوم إنجليزية بشرطات، مثل pastry, sweets, warm-colors'),
          typeId: z.string().uuid().describe('نوع الثيم (من admin_list_theme_types)'),
          pin: z.string().regex(/^\d{6}$/).optional().describe('رمز PIN من 6 أرقام يعطيه المستخدم لهذا التحدّي'),
          challenge_token: z.string().optional().describe('التوكن الذي أرجعته الأداة في الاستدعاء الأول'),
        },
      },
      ({ pin, challenge_token, ...input }) =>
        toToolResult(async () => {
          const theme = {
            ...input,
            slug: input.slug ?? slugify(input.name_en),
            price: input.price ?? 0,
            tag: input.tag ?? [],
          };
          if (!pin || !challenge_token) {
            const { label, challenge_token: token } = await this.mdstore.adminPinChallenge(apiKey);
            return {
              status: 'pin_required',
              theme,
              challenge: label,
              challenge_token: token,
              instructions:
                `اعرض بيانات الثيم أعلاه على المستخدم، واطلب منه رمز PIN للتحدّي ${label} (6 أرقام)، ` +
                'ثم أعد استدعاء admin_create_theme بنفس البيانات مع pin و challenge_token. صالح 5 دقائق.',
            };
          }
          return this.mdstore.adminCreateTheme(apiKey, theme, pin, challenge_token);
        }),
    );
  }
}
