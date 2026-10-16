import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// أدوات مدير المنصة لخدمة المواقع (الدول ← المناطق/الولايات ← البلديات) — لمفتاح mdsa_ فقط.
// القراءة بلا PIN، وكل تعديل يطلب PIN جديداً (نفس تدفّق أدوات الثيمات).

const PIN_FIELDS = {
  pin: z.string().regex(/^\d{6}$/).optional().describe('رمز PIN من 6 أرقام يعطيه المستخدم لهذا التحدّي'),
  challenge_token: z.string().optional().describe('التوكن الذي أرجعته الأداة في الاستدعاء الأول'),
};
const PIN_HELP =
  'يحتاج PIN جديداً: استدعِ الأداة أولاً بدون pin و challenge_token فترجع أسماء الرموز؛ اعرض التغيير على المستخدم ' +
  'واطلب الـ PIN (لا تخمّنه)، ثم أعد الاستدعاء بنفس البيانات مع pin و challenge_token.';

const country = z.string().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()).describe('رمز الدولة ISO من حرفين (DZ، MA، TN…)');
const levelNames = z.object({ ar: z.string().min(1), fr: z.string().optional(), en: z.string().optional() });
const locality = z.object({
  id: z.number().int().min(1).describe('رقم ثابت وفريد داخل الدولة — لا تغيّره بعد الاستعمال'),
  name: z.string().min(1).describe('الاسم باللاتينية'),
  ar_name: z.string().min(1),
  post_code: z.string().optional(),
});
const region = z.object({
  id: z.number().int().min(1).describe('رقم المنطقة الثابت (للجزائر: رقم الولاية 1–58)'),
  code: z.string().optional().describe('اختياري — يُولَّد تلقائياً مثل DZ-16'),
  name: z.string().min(1),
  ar_name: z.string().min(1),
  localities: z.array(locality).min(1),
});

@Injectable()
export class AdminLocationsTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
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
      'admin_list_countries',
      {
        title: 'الدول (أدمن)',
        description: 'يعرض دول خدمة المواقع: الرمز، الاسم، العملة، مفتاح الهاتف، أسماء المستويات (ولاية/بلدية…) ومفعّلة أم لا.',
        inputSchema: {},
      },
      () => toToolResult(() => this.mdstore.adminListCountries(apiKey)),
    );

    server.registerTool(
      'admin_list_regions',
      {
        title: 'مناطق دولة (أدمن)',
        description: 'يعرض مناطق دولة (الولايات للجزائر) مع عدد البلديات. مع regionId يرجع منطقة واحدة بكل بلدياتها.',
        inputSchema: { country, regionId: z.number().int().min(1).optional() },
      },
      ({ country: cc, regionId }) => toToolResult(() => this.mdstore.adminListRegions(apiKey, cc, regionId)),
    );

    server.registerTool(
      'admin_upsert_country',
      {
        title: 'إضافة/تعديل دولة (أدمن)',
        description:
          'يضيف دولة جديدة أو يعدّل بياناتها (العملة، مفتاح الهاتف، أسماء المستويات، التفعيل). ' +
          'أضف دولة جديدة بـ active=false حتى تكتمل مناطقها، ثم فعّلها. ' + PIN_HELP,
        inputSchema: {
          code: country,
          name: z.string().min(1).describe('بالإنجليزية'),
          ar_name: z.string().min(1),
          fr_name: z.string().optional(),
          currency: z.string().regex(/^[A-Z]{3}$/).describe('ISO 4217 مثل DZD، MAD، TND'),
          phone_prefix: z.string().regex(/^\+\d{1,4}$/).describe('مثل +212'),
          phone_pattern: z.string().optional().describe('regex للرقم المحلي (اختياري)'),
          levels: z.object({ region: levelNames, locality: levelNames }).describe('أسماء المستويين، مثلاً الجهة/المدينة'),
          active: z.boolean(),
          ...PIN_FIELDS,
        },
      },
      ({ pin, challenge_token, ...meta }) =>
        withPin('admin_upsert_country', meta, pin, challenge_token, (p, t) => this.mdstore.adminUpsertCountry(apiKey, meta, p, t)),
    );

    server.registerTool(
      'admin_upsert_region',
      {
        title: 'إضافة/تعديل منطقة (أدمن)',
        description:
          'يضيف منطقة (ولاية) مع كل بلدياتها أو يستبدلها إن كان رقمها موجوداً. الطريقة المفضّلة لبناء دولة منطقةً منطقة. ' +
          'للجزائر: يحدّث أيضاً جدولي الولايات والبلديات في المنصة (إضافة/تحديث بلا حذف). ' + PIN_HELP,
        inputSchema: { country, region, ...PIN_FIELDS },
      },
      ({ country: cc, region: r, pin, challenge_token }) =>
        withPin('admin_upsert_region', { country: cc, region: { id: r.id, name: r.name, ar_name: r.ar_name, localities: r.localities.length } }, pin, challenge_token,
          (p, t) => this.mdstore.adminUpsertRegion(apiKey, cc, r, p, t)),
    );

    server.registerTool(
      'admin_set_country_regions',
      {
        title: 'استبدال كل مناطق دولة (أدمن)',
        description:
          'يستبدل كل مناطق دولة وبلدياتها دفعة واحدة (للاستيراد الكامل). يرفض الأرقام المكررة والمناطق بلا بلديات. ' +
          'المنطقة غير الموجودة في القائمة تُحذف من الخدمة — فاستعمله بحذر، و admin_upsert_region للتعديلات الصغيرة. ' + PIN_HELP,
        inputSchema: { country, regions: z.array(region).min(1), ...PIN_FIELDS },
      },
      ({ country: cc, regions, pin, challenge_token }) =>
        withPin('admin_set_country_regions', { country: cc, regions: regions.length, localities: regions.reduce((n, r) => n + r.localities.length, 0) }, pin, challenge_token,
          (p, t) => this.mdstore.adminSetRegions(apiKey, cc, regions, p, t)),
    );
  }
}
