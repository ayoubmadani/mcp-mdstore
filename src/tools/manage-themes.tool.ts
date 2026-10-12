import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// ثيمات التاجر: عرض المتاح له بدون دفع، وتطبيق ثيم على متجر
@Injectable()
export class ManageThemesTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_available_themes',
      {
        title: 'عرض الثيمات المتاحة',
        description:
          'يعرض الثيمات التي يمكن للمستخدم استعمالها بدون دفع: ثيماته المشتراة (source=owned) ' +
          'وثيمات خطة اشتراكه النشطة (source=plan)، مع الوصف والوسوم والنوع. ' +
          'استعمله قبل create_store أو لتغيير ثيم متجر، واختر الثيم الأقرب لنشاط المتجر حسب الوصف والوسوم.',
        inputSchema: {
          language: z.enum(['ar', 'fr', 'en']).optional().describe('لغة الأسماء والأوصاف (الافتراضي ar)'),
        },
      },
      ({ language }) => toToolResult(() => this.mdstore.listAvailableThemes(apiKey, language)),
    );

    server.registerTool(
      'browse_theme_catalog',
      {
        title: 'تصفح معرض الثيمات',
        description:
          'يعرض كل ثيمات المنصة (الاسم، الوصف، الوسوم، النوع، السعر، الصورة) مع available: هل يستطيع المستخدم تطبيقه الآن. ' +
          'استعمله عندما لا يجد في list_available_themes ثيماً يناسب نشاط المتجر: اقترح على المستخدم 2 إلى 3 ثيمات ' +
          'تناسب نشاطه بالضبط (بالاسم والسعر وسبب الاقتراح)، واذكر أنه يستطيع شراءها من صفحة «القوالب» في لوحة التحكم ' +
          'أو ترقية خطته، ثم طبّقها بـ apply_theme بعد أن تصبح متاحة. لا يشتري هذا الأداة أي شيء.',
        inputSchema: {
          language: z.enum(['ar', 'fr', 'en']).optional().describe('لغة الأسماء والأوصاف (الافتراضي ar)'),
          search: z.string().optional().describe('كلمة للتصفية (اسم، وسم، نوع) مثل food أو pizza'),
        },
      },
      ({ language, search }) => toToolResult(() => this.mdstore.browseThemeCatalog(apiKey, language, search)),
    );

    server.registerTool(
      'apply_theme',
      {
        title: 'تطبيق ثيم على متجر',
        description:
          'يغيّر ثيم متجر موجود إلى ثيم من list_available_themes. ' +
          'لا يشتري ثيمات: إذا لم يكن الثيم مملوكاً أو ضمن الخطة يُرفض.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          themeId: z.string().uuid().describe('معرّف الثيم (من list_available_themes)'),
        },
      },
      ({ storeId, themeId }) => toToolResult(() => this.mdstore.applyTheme(apiKey, storeId, themeId)),
    );
  }
}
