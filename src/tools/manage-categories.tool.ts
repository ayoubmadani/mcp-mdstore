import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// تصنيفات المتجر: عرض، إنشاء، تعديل، حذف
@Injectable()
export class ManageCategoriesTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_categories',
      {
        title: 'عرض التصنيفات',
        description: 'يعرض تصنيفات متجر (مع التصنيفات الفرعية: level و parentId). استعمله لإيجاد categoryId.',
        inputSchema: { storeId: z.string().uuid().describe('معرّف المتجر') },
      },
      ({ storeId }) => toToolResult(() => this.mdstore.listCategories(apiKey, storeId)),
    );

    server.registerTool(
      'create_category',
      {
        title: 'إنشاء تصنيف',
        description: 'ينشئ تصنيفاً في متجر. لتصنيف فرعي مرّر parentId للتصنيف الأب.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          name: z.string().min(1).max(100).describe('اسم التصنيف'),
          description: z.string().optional().describe('وصف التصنيف'),
          imageUrl: z.string().url().optional().describe('صورة التصنيف'),
          parentId: z.string().uuid().optional().describe('معرّف التصنيف الأب (لتصنيف فرعي)'),
        },
      },
      ({ storeId, ...input }) => toToolResult(() => this.mdstore.createCategory(apiKey, storeId, input)),
    );

    server.registerTool(
      'update_category',
      {
        title: 'تعديل تصنيف',
        description: 'يعدّل تصنيفاً — أرسل فقط ما تريد تغييره. parentId=null يجعله تصنيفاً رئيسياً.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          categoryId: z.string().uuid().describe('معرّف التصنيف'),
          name: z.string().min(1).max(100).optional().describe('الاسم الجديد'),
          description: z.string().optional().describe('الوصف'),
          imageUrl: z.string().url().optional().describe('الصورة'),
          parentId: z.string().uuid().nullable().optional().describe('التصنيف الأب (null = رئيسي)'),
          isActive: z.boolean().optional().describe('ظاهر في المتجر أم لا'),
        },
      },
      ({ storeId, categoryId, ...input }) =>
        toToolResult(() => this.mdstore.updateCategory(apiKey, storeId, categoryId, input)),
    );

    server.registerTool(
      'delete_category',
      {
        title: 'حذف تصنيف',
        description: 'يحذف تصنيفاً مع تصنيفاته الفرعية (قابل للاسترجاع من لوحة التحكم). اطلب تأكيد المستخدم قبل الحذف.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          categoryId: z.string().uuid().describe('معرّف التصنيف'),
        },
      },
      ({ storeId, categoryId }) => toToolResult(() => this.mdstore.deleteCategory(apiKey, storeId, categoryId)),
    );
  }
}
