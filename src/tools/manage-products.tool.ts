import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// عرض وتعديل وحذف منتجات متجر
@Injectable()
export class ManageProductsTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_products',
      {
        title: 'عرض المنتجات',
        description: 'يعرض منتجات متجر (المعرّف، الاسم، السعر، المخزون، الحالة). استعمله لإيجاد productId قبل التعديل أو الحذف.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          search: z.string().optional().describe('بحث بالاسم'),
          page: z.number().int().min(1).optional().describe('الصفحة (50 منتجاً في كل صفحة)'),
        },
      },
      ({ storeId, search, page }) => toToolResult(() => this.mdstore.listProducts(apiKey, storeId, search, page)),
    );

    server.registerTool(
      'update_product',
      {
        title: 'تعديل منتج',
        description:
          'يعدّل منتجاً موجوداً — أرسل فقط الحقول التي تريد تغييرها، والباقي يبقى كما هو. ' +
          'images يستبدل كل صور المنتج. لإخفاء المنتج من المتجر: isActive=false.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          productId: z.string().uuid().describe('معرّف المنتج (من list_products)'),
          name: z.string().min(1).max(200).optional().describe('الاسم الجديد'),
          price: z.number().min(0).optional().describe('سعر البيع (دج)'),
          originalPrice: z.number().min(0).optional().describe('السعر قبل التخفيض (يظهر مشطوباً)'),
          stock: z.number().int().min(0).optional().describe('الكمية'),
          description: z.string().optional().describe('الوصف (HTML مسموح)'),
          isActive: z.boolean().optional().describe('ظاهر في المتجر أم لا'),
          images: z.array(z.string().url()).optional().describe('روابط الصور (تستبدل الصور الحالية)'),
        },
      },
      ({ storeId, productId, ...input }) =>
        toToolResult(() => this.mdstore.updateProduct(apiKey, storeId, productId, input)),
    );

    server.registerTool(
      'delete_product',
      {
        title: 'حذف منتج',
        description: 'يحذف منتجاً من المتجر (حذف قابل للاسترجاع من لوحة التحكم). اطلب تأكيد المستخدم قبل الحذف.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          productId: z.string().uuid().describe('معرّف المنتج'),
        },
      },
      ({ storeId, productId }) => toToolResult(() => this.mdstore.deleteProduct(apiKey, storeId, productId)),
    );
  }
}
