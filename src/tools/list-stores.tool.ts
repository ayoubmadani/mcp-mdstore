import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

@Injectable()
export class ListStoresTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_stores',
      {
        title: 'عرض المتاجر',
        description:
          'يعرض متاجر المستخدم على MdStore مع معرّف كل متجر. role=owner: متجره، كل الأدوات متاحة. ' +
          'role=member: متجر شخص آخر مشترك معه — يستعمل فقط ما في permissions ' +
          '(store.update: بيانات المتجر والحالة، seo.manage: SEO المتجر، theme.change: الثيم، product.crud: المنتجات واستيراد AliExpress وتوليد الصور، ' +
          'category.crud: التصنيفات، domain.crud: الدومينات). صفحات الهبوط والشحن واختبارات A/B للمالك فقط. ' +
          'canUse=false يعني لا وصول حالياً (reason: PLAN_EXPIRED خطة المالك، MEMBER_SUSPENDED، GROUP_DISABLED، NO_GROUP بلا مجموعة) — لا تحاول أي عملية عليه وأخبر المستخدم بالسبب. ' +
          'إن رجع خطأ PERMISSION_DENIED أو OWNER_ONLY فأخبر المستخدم أن صاحب المتجر لم يمنحه هذه الصلاحية ولا تعِد المحاولة.',
      },
      () => toToolResult(() => this.mdstore.listStores(apiKey)),
    );
  }
}
