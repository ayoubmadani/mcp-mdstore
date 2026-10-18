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

const PIN_FIELDS = {
  pin: z.string().regex(/^\d{6}$/).optional().describe('رمز PIN من 6 أرقام يعطيه المستخدم لهذا التحدّي'),
  challenge_token: z.string().optional().describe('التوكن الذي أرجعته الأداة في الاستدعاء الأول'),
};
const PIN_HELP =
  'يحتاج PIN جديداً: استدعِ الأداة أولاً بدون pin و challenge_token فترجع أسماء الرموز؛ اعرض التغيير على المستخدم ' +
  'واطلب الـ PIN (لا تخمّنه)، ثم أعد الاستدعاء بنفس البيانات مع pin و challenge_token.';

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

    // خطوتان: بدون PIN ← تحدٍّ (والتغيير المطلوب للعرض)، ومع PIN ← تنفيذ
    const withPin = (tool: string, preview: unknown, pin: string | undefined, token: string | undefined, run: (pin: string, token: string) => Promise<unknown>) =>
      toToolResult(async () => {
        if (!pin || !token) {
          const { label, challenge_token } = await this.mdstore.adminPinChallenge(apiKey);
          return {
            status: 'pin_required',
            change: preview,
            challenge: label,
            challenge_token,
            instructions: `اعرض التغيير على المستخدم واطلب رمز PIN للتحدّي ${label} (6 أرقام)، ثم أعد استدعاء ${tool} بنفس البيانات مع pin و challenge_token. صالح 5 دقائق.`,
          };
        }
        return run(pin, token);
      });

    server.registerTool(
      'admin_list_themes',
      {
        title: 'كل الثيمات (أدمن)',
        description: 'يعرض كل الثيمات حتى غير المفعّلة: id، slug، الاسم، السعر، مفعّل أم لا، النوع، والخطط التي تشمله. استعمله لإيجاد themeId.',
        inputSchema: { search: z.string().optional().describe('بحث بالاسم (3 لغات) أو slug') },
      },
      ({ search }) => toToolResult(() => this.mdstore.adminListThemes(apiKey, search)),
    );

    server.registerTool(
      'admin_update_theme',
      {
        title: 'تعديل سعر/تفعيل ثيم (أدمن)',
        description: 'يغيّر سعر شراء ثيم (دج، 0 = مجاني) و/أو يفعّله أو يعطّله في معرض الثيمات. ' + PIN_HELP,
        inputSchema: {
          themeId: z.string().uuid().describe('من admin_list_themes'),
          price: z.number().min(0).optional().describe('السعر الجديد (دج)'),
          isActive: z.boolean().optional().describe('true لإظهاره في المعرض، false لإخفائه'),
          ...PIN_FIELDS,
        },
      },
      ({ themeId, price, isActive, pin, challenge_token }) =>
        withPin('admin_update_theme', { themeId, price, isActive }, pin, challenge_token,
          (p, t) => this.mdstore.adminUpdateTheme(apiKey, themeId, { price, isActive }, p, t)),
    );

    server.registerTool(
      'admin_list_plans',
      {
        title: 'خطط الاشتراك (أدمن)',
        description: 'يعرض خطط الاشتراك: id، الاسم، السعر الشهري والسنوي، مفعّلة أم لا، والحدود (features).',
        inputSchema: {},
      },
      () => toToolResult(() => this.mdstore.adminListPlans(apiKey)),
    );

    server.registerTool(
      'admin_update_plan',
      {
        title: 'تعديل خطة (أدمن)',
        description:
          'يعدّل خطة اشتراك: الأسعار، التفعيل، و/أو الحدود. features جزئية — يُغيَّر فقط ما تمرّره ' +
          '(storeNumber، productNumber، productImagesNumber، totalImagesNumber، landingPageNumber، domainNumber، maxMembers، aliexpressImportsPerDay، shippingProfileNumber، imagePagesPerMonth، ' +
          'pixelFacebookNumber، pixelTiktokNumber، isNtfy، commission). يؤثر على كل المشتركين في الخطة. ' + PIN_HELP,
        inputSchema: {
          planId: z.string().uuid().describe('من admin_list_plans'),
          monthlyPrice: z.number().min(0).optional(),
          yearlyPrice: z.number().min(0).optional(),
          isActive: z.boolean().optional(),
          features: z
            .object({
              storeNumber: z.number().int().min(0).optional(),
              productNumber: z.number().int().min(0).optional(),
              productImagesNumber: z.number().int().min(0).optional(),
              totalImagesNumber: z.number().int().min(0).optional(),
              landingPageNumber: z.number().int().min(0).optional(),
              domainNumber: z.number().int().min(0).optional(),
              maxMembers: z.number().int().min(0).optional().describe('أعضاء الفريق (مستخدمون مختلفون عبر كل متاجر المالك) — 0 = لا مشاركة'),
              shippingProfileNumber: z.number().int().min(1).optional().describe('حسابات الشحن (مجموعات أسعار التوصيل) شاملاً الافتراضي — 1 = الافتراضي فقط'),
              imagePagesPerMonth: z.number().int().min(0).optional().describe('صفحات الصور بالذكاء الاصطناعي شهرياً — 0 = غير متاحة'),
              aliexpressImportsPerDay: z.number().int().min(0).optional().describe('منتجات يمكن جلبها من AliExpress في اليوم (بتوقيت الجزائر) — 0 = غير متاح'),
              pixelFacebookNumber: z.number().int().min(0).optional(),
              pixelTiktokNumber: z.number().int().min(0).optional(),
              isNtfy: z.boolean().optional(),
              commission: z.number().min(0).optional(),
            })
            .optional(),
          ...PIN_FIELDS,
        },
      },
      ({ planId, pin, challenge_token, ...changes }) =>
        withPin('admin_update_plan', { planId, ...changes }, pin, challenge_token,
          (p, t) => this.mdstore.adminUpdatePlan(apiKey, planId, changes, p, t)),
    );

    server.registerTool(
      'admin_set_plan_themes',
      {
        title: 'إضافة/إزالة ثيمات من خطة (أدمن)',
        description:
          'يضيف ثيمات إلى خطة (يصبح متاحاً مجاناً لكل مشتركيها) أو يزيلها منها. ثيمات custom و testing لا تظهر للتجار حتى لو أُضيفت. ' +
          'النتيجة لكل ثيم ok أو error. ' + PIN_HELP,
        inputSchema: {
          planId: z.string().uuid().describe('من admin_list_plans'),
          action: z.enum(['add', 'remove']),
          themeIds: z.array(z.string().uuid()).min(1).max(100).describe('من admin_list_themes'),
          ...PIN_FIELDS,
        },
      },
      ({ planId, action, themeIds, pin, challenge_token }) =>
        withPin('admin_set_plan_themes', { planId, action, themeIds }, pin, challenge_token,
          (p, t) => this.mdstore.adminSetPlanThemes(apiKey, planId, action, themeIds, p, t)),
    );

    server.registerTool(
      'admin_request_pin',
      {
        title: 'طلب تحدّي PIN (أدمن)',
        description:
          'يرجع أسماء الرموز (مثل ZZMMHH) و challenge_token لعملية أدمن واحدة. استعمله قبل admin_publish_theme_code ' +
          '(حتى لا يُرسل الكود الكبير مرتين). اطلب الـ PIN من المستخدم — لا تخمّنه. صالح 5 دقائق ولعملية واحدة.',
        inputSchema: {},
      },
      () => toToolResult(() => this.mdstore.adminPinChallenge(apiKey)),
    );

    server.registerTool(
      'admin_publish_theme_code',
      {
        title: 'رفع كود ثيم (أدمن)',
        description:
          'يرفع كود ثيم: ملف TSX واحد كامل يتبع skill «mdstore-theme-creator» (اقرأها والقالب المرجعي قبل الكتابة). ' +
          'الاستيرادات المسموحة فقط: react، react-dom، next/link، next/image، next/navigation، axios، zustand، zustand/middleware، ' +
          'lucide-react، framer-motion، isomorphic-dompurify، uuid، @mdstore/theme-kit (لا @/ ولا ملفات أخرى). ' +
          'يصدّر default و Home و Details و Cart و StaticPage (و Success اختياري). ' +
          'إلزامي: ar/fr/en، الشحن بـ storeId، الإضافات، ولاية واحدة تُختار وتُقفل، نوع التوصيل حسب الولاية (deliveryShown + data-delivery-option). ' +
          'السرعة: أيقونات lucide بالاسم فقط (لا import * as) فيدمج الخادم المستعمل منها فقط؛ تجنّب framer-motion (ثقيلة) واستعمل CSS؛ ' +
          'الهيرو وصورة المنتج الرئيسية fetchPriority="high" وباقي الصور loading="lazy"؛ لا حركة infinite أو blur على مساحات كبيرة. ' +
          'الخادم يفحص الاستيرادات والـ exports، يبنيه (minify)، ويرفعه إلى themes/<slug>.js — ' +
          'وإن فشل يرجع الخطأ ورقم السطر فأصلحه وأعد الرفع (بتحدٍّ جديد). الـ slug يجب أن يكون لثيم موجود (admin_create_theme). ' +
          'خطوات: admin_request_pin ← اطلب الـ PIN من المستخدم ← هذه الأداة مع pin و challenge_token. ' +
          'لا تكتب الكود في رد المحادثة — مرّره هنا مباشرة.',
        inputSchema: {
          slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).describe('slug الثيم (موجود مسبقاً)'),
          code: z.string().min(200).max(600_000).describe('كود TSX الكامل للثيم'),
          pin: z.string().regex(/^\d{6}$/).describe('رمز PIN من 6 أرقام يعطيه المستخدم'),
          challenge_token: z.string().describe('من admin_request_pin'),
        },
      },
      ({ slug, code, pin, challenge_token }) =>
        toToolResult(() => this.mdstore.adminPublishThemeCode(apiKey, slug, code, pin, challenge_token)),
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
