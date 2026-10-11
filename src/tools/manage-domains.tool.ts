import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// دومينات المتجر: عرض، إضافة، فحص الحالة، حذف، تخصيص لصفحة هبوط
@Injectable()
export class ManageDomainsTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_domains',
      {
        title: 'عرض الدومينات',
        description:
          'يعرض دومينات متجر: الاسم، مفعّل أم لا، فرعي (mdstore.top) أم خارجي، ونطاقه (store للمتجر كله أو landing_page لصفحة هبوط واحدة).',
        inputSchema: { storeId: z.string().uuid().describe('معرّف المتجر') },
      },
      ({ storeId }) => toToolResult(() => this.mdstore.listDomains(apiKey, storeId)),
    );

    server.registerTool(
      'add_domain',
      {
        title: 'إضافة دومين',
        description:
          'يربط دوميناً بمتجر. دومين فرعي بصيغة name.mdstore.top يعمل فوراً (3 كحد أقصى لكل متجر). ' +
          'دومين خارجي (مثل mystore.com) يُرجع سجلات DNS التي يجب أن يضعها المستخدم عند مزوّد الدومين، ' +
          'ثم يُفحص بـ check_domain_status. مرّر builderPageId لتخصيص الدومين كاملاً لصفحة هبوط واحدة.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          domain: z.string().min(3).describe('الدومين بدون http و www، مثل mystore.com أو bebe.mdstore.top'),
          builderPageId: z.string().uuid().optional().describe('معرّف صفحة الهبوط (اختياري) — يجعل الدومين يعرضها وحدها'),
        },
      },
      (input) => toToolResult(() => this.mdstore.addDomain(apiKey, input)),
    );

    server.registerTool(
      'check_domain_status',
      {
        title: 'فحص حالة الدومين',
        description:
          'يفحص الآن ربط دومين خارجي (DNS والتحقق) ويحدّث حالته. isActive=true يعني أن الدومين يعمل. ' +
          'إذا كان misconfigured=true فسجلات DNS غير صحيحة بعد أو لم تنتشر (قد يستغرق ذلك حتى 48 ساعة).',
        inputSchema: { domainId: z.string().uuid().describe('معرّف الدومين (من list_domains)') },
      },
      ({ domainId }) => toToolResult(() => this.mdstore.checkDomainStatus(apiKey, domainId)),
    );

    server.registerTool(
      'delete_domain',
      {
        title: 'حذف دومين',
        description: 'يفصل الدومين عن المتجر ويحذفه نهائياً (لا يمكن استرجاعه). اطلب تأكيد المستخدم قبل الحذف.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          domainId: z.string().uuid().describe('معرّف الدومين'),
        },
      },
      ({ storeId, domainId }) => toToolResult(() => this.mdstore.deleteDomain(apiKey, storeId, domainId)),
    );

    server.registerTool(
      'assign_domain_to_landing_page',
      {
        title: 'تخصيص دومين لصفحة هبوط',
        description: 'يجعل دوميناً موجوداً يعرض صفحة هبوط واحدة فقط بدل المتجر كله.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          domainId: z.string().uuid().describe('معرّف الدومين'),
          builderPageId: z.string().uuid().describe('معرّف صفحة الهبوط (من list_landing_pages)'),
        },
      },
      ({ storeId, domainId, builderPageId }) =>
        toToolResult(() => this.mdstore.assignDomainToPage(apiKey, storeId, domainId, builderPageId)),
    );

    server.registerTool(
      'unassign_domain_from_landing_page',
      {
        title: 'فك تخصيص الدومين',
        description: 'يعيد الدومين ليعرض المتجر كاملاً بدل صفحة هبوط واحدة.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          domainId: z.string().uuid().describe('معرّف الدومين'),
        },
      },
      ({ storeId, domainId }) => toToolResult(() => this.mdstore.unassignDomainFromPage(apiKey, storeId, domainId)),
    );
  }
}
