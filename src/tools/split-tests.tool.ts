import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// اختبارات A/B لصفحات الهبوط: رابط واحد يوزّع الزوار على 2–3 صفحات، وإحصائيات كل صفحة
@Injectable()
export class SplitTestsTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_split_tests',
      {
        title: 'عرض اختبارات A/B',
        description: 'يعرض اختبارات A/B لمتجر: الاسم، الرابط، الدومينات المربوطة، الصفحات ونسبها، الحالة، والفائزة إن وُجدت.',
        inputSchema: { storeId: z.string().uuid().describe('معرّف المتجر') },
      },
      ({ storeId }) => toToolResult(() => this.mdstore.listSplitTests(apiKey, storeId)),
    );

    server.registerTool(
      'create_split_test',
      {
        title: 'إنشاء اختبار A/B',
        description:
          'ينشئ اختباراً على دومين خاص به يوزّع الزوار على 2 إلى 3 صفحات هبوط منشورة من نفس المتجر ' +
          '(استدعِ list_landing_pages لأخذ معرّفاتها) — **كلها لنفس المنتج** (الخادم يرفض غير ذلك). نفس الزائر يرى نفس الصفحة دائماً، وكل زيارة وطلب يُسجَّلان باسم صفحته. ' +
          'weight نسبة الزوار لكل صفحة (افتراضياً متساوية). ' +
          'الدومين إلزامي — واحد من اثنين: domain = دومين جديد (مثل promo-x.mdstore.top يعمل فوراً، أو دومين خاص يحتاج DNS) ويُحتسب في حد دومينات الخطة؛ ' +
          'أو domainId = دومين صفحة هبوط موجود (من list_domains) فيبقى رابط الإعلانات نفسه وتصبح صفحته إحدى المتنافسات (أضفها في variants). ' +
          'الصفحات يجب أن تختلف في عنصر واحد واضح (العنوان، الصورة، السعر/العرض، ترتيب الأقسام) حتى تكون النتيجة مفيدة.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          name: z.string().min(1).max(120).describe('اسم الاختبار، مثل: «عنوان سعر vs عنوان جودة»'),
          domain: z.string().max(253).optional().describe('دومين جديد للاختبار، مثل promo-x.mdstore.top'),
          variants: z
            .array(z.object({
              builderPageId: z.string().uuid().describe('معرّف صفحة هبوط منشورة'),
              weight: z.number().int().min(1).max(100).optional().describe('نسبة الزوار (افتراضياً متساوية)'),
            }))
            .min(2).max(3)
            .describe('الصفحات المتنافسة'),
          domainId: z.string().uuid().optional().describe('أو: دومين صفحة هبوط موجود يتحول للاختبار'),
        },
      },
      (input) => toToolResult(() => this.mdstore.createSplitTest(apiKey, input)),
    );

    server.registerTool(
      'get_split_test_stats',
      {
        title: 'نتائج اختبار A/B',
        description:
          'لكل صفحة في الاختبار: الزيارات، الطلبات، الطلبات المؤكدة، المبيعات المؤكدة، نسبة التحويل (طلبات ÷ زيارات) والتحويل المؤكد. ' +
          'عند التحليل: قارن التحويل المؤكد أولاً، ولا تحكم قبل ~100 زيارة لكل صفحة؛ إن كان الفرق صغيراً مع بيانات قليلة قل ذلك صراحة.',
        inputSchema: { splitTestId: z.string().uuid().describe('معرّف الاختبار') },
      },
      ({ splitTestId }) => toToolResult(() => this.mdstore.splitTestStats(apiKey, splitTestId)),
    );

    server.registerTool(
      'set_split_test_winner',
      {
        title: 'اعتماد الصفحة الفائزة',
        description:
          'يعتمد صفحة كفائزة: كل زوار رابط الاختبار يذهبون إليها من الآن ويتوقف احتساب الإحصائيات (تبقى للمراجعة). ' +
          'أكّد مع المستخدم قبل التنفيذ.',
        inputSchema: {
          splitTestId: z.string().uuid().describe('معرّف الاختبار'),
          builderPageId: z.string().uuid().describe('الصفحة الفائزة (من صفحات الاختبار)'),
        },
      },
      ({ splitTestId, builderPageId }) => toToolResult(() => this.mdstore.setSplitTestWinner(apiKey, splitTestId, builderPageId)),
    );

    server.registerTool(
      'update_split_test',
      {
        title: 'تعديل اختبار A/B',
        description:
          'يغيّر اسم الاختبار، أو صفحاته ونسبها، أو يوقفه/يستأنفه (isActive). الإيقاف يرسل كل الزوار لأول صفحة دون اعتماد فائزة. ' +
          'الاستئناف يلغي الفائزة المعتمدة.',
        inputSchema: {
          splitTestId: z.string().uuid().describe('معرّف الاختبار'),
          name: z.string().min(1).max(120).optional(),
          variants: z
            .array(z.object({ builderPageId: z.string().uuid(), weight: z.number().int().min(1).max(100).optional() }))
            .min(2).max(3).optional(),
          isActive: z.boolean().optional(),
        },
      },
      ({ splitTestId, ...input }) => toToolResult(() => this.mdstore.updateSplitTest(apiKey, splitTestId, input)),
    );
  }
}
