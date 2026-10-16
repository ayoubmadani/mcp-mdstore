import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

// أسعار التوصيل: حسابات شحن بأسماء (لكل حساب أسعاره وولاياته) وكل متجر يستعمل حساباً
@Injectable()
export class ManageShippingTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'list_shipping_profiles',
      {
        title: 'عرض حسابات الشحن',
        description:
          'يعرض حسابات الشحن للتاجر: لكل حساب أسعار توصيل وولايات خاصة به، والمتاجر التي تستعمله (stores). ' +
          'الحساب الافتراضي (isDefault) تستعمله كل المتاجر التي لم يُختر لها حساب.',
        inputSchema: {},
      },
      () => toToolResult(() => this.mdstore.listShippingProfiles(apiKey)),
    );

    server.registerTool(
      'create_shipping_profile',
      {
        title: 'إنشاء حساب شحن',
        description:
          'ينشئ حساب شحن جديداً باسم (مثلاً: أسعار العاصمة) يبدأ بنسخة من أسعار حساب موجود، ' +
          'ثم عدّل أسعاره بـ update_shipping_prices واربطه بمتجر بـ set_store_shipping_profile.',
        inputSchema: {
          name: z.string().min(1).max(80).describe('اسم الحساب'),
          copyFromId: z.string().uuid().optional().describe('نسخ الأسعار من هذا الحساب (الافتراضي إن لم يُحدَّد)'),
        },
      },
      ({ name, copyFromId }) => toToolResult(() => this.mdstore.createShippingProfile(apiKey, name, copyFromId)),
    );

    server.registerTool(
      'set_store_shipping_profile',
      {
        title: 'اختيار حساب الشحن لمتجر',
        description: 'يجعل المتجر يستعمل أسعار وولايات حساب شحن معيّن. profileId = null للرجوع للحساب الافتراضي.',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          profileId: z.string().uuid().nullable().describe('معرّف حساب الشحن (من list_shipping_profiles) أو null'),
        },
      },
      ({ storeId, profileId }) => toToolResult(() => this.mdstore.setStoreShippingProfile(apiKey, storeId, profileId)),
    );

    server.registerTool(
      'get_shipping_prices',
      {
        title: 'عرض أسعار التوصيل',
        description:
          'يعرض أسعار التوصيل لكل ولاية في حساب شحن (للمنزل، للمكتب، الإرجاع، مفعّلة أم لا، وأنواع التوصيل المتاحة homeEnabled/officeEnabled). ' +
          'بدون profileId = الحساب الافتراضي.',
        inputSchema: {
          profileId: z.string().uuid().optional().describe('معرّف حساب الشحن (من list_shipping_profiles)'),
        },
      },
      ({ profileId }) => toToolResult(() => this.mdstore.getShippingPrices(apiKey, profileId)),
    );

    server.registerTool(
      'update_shipping_prices',
      {
        title: 'تعديل أسعار التوصيل',
        description:
          'يعدّل أسعار ولايات في حساب شحن. يُغيَّر فقط ما تمرّره لكل ولاية؛ isActive=false يخفي الولاية من نموذج الطلب. ' +
          'استعمل get_shipping_prices لمعرفة أرقام الولايات (wilayaId من 1 إلى 58).',
        inputSchema: {
          profileId: z.string().uuid().optional().describe('معرّف حساب الشحن (الافتراضي إن لم يُحدَّد)'),
          prices: z
            .array(
              z.object({
                wilayaId: z.number().int().min(1).describe('رقم الولاية'),
                priceHome: z.number().min(0).optional().describe('سعر التوصيل للمنزل (دج)'),
                priceOffice: z.number().min(0).optional().describe('سعر التوصيل للمكتب (دج)'),
                priceReturn: z.number().min(0).optional().describe('تكلفة الإرجاع (دج)'),
                isActive: z.boolean().optional().describe('التوصيل متاح لهذه الولاية'),
                homeEnabled: z.boolean().optional().describe('التوصيل للمنزل متاح (false = مكتب فقط)'),
                officeEnabled: z.boolean().optional().describe('التوصيل للمكتب متاح (false = منزل فقط)'),
              }),
            )
            .min(1)
            .max(69),
        },
      },
      ({ profileId, prices }) => toToolResult(() => this.mdstore.updateShippingPrices(apiKey, prices, profileId)),
    );

    server.registerTool(
      'get_shipping_communes',
      {
        title: 'بلديات ولاية في التوصيل',
        description:
          'يعرض بلديات ولاية مع حالة التوصيل في كل بلدية داخل حساب الشحن: homeEnabled و officeEnabled ' +
          '(الاثنان false = البلدية معطّلة ولا تظهر للزبون). restrictedCommunes في get_shipping_prices يعطي عدد البلديات المقيّدة لكل ولاية.',
        inputSchema: {
          wilayaId: z.number().int().min(1).describe('رقم الولاية'),
          profileId: z.string().uuid().optional().describe('معرّف حساب الشحن (الافتراضي إن لم يُحدَّد)'),
        },
      },
      ({ wilayaId, profileId }) => toToolResult(() => this.mdstore.getShippingCommunes(apiKey, wilayaId, profileId)),
    );

    server.registerTool(
      'update_shipping_communes',
      {
        title: 'تعطيل/تفعيل بلديات',
        description:
          'يعطّل بلديات داخل ولاية أو يعيد تفعيلها في حساب شحن. لكل بلدية: homeEnabled و officeEnabled ' +
          '(false/false = معطّلة كلياً؛ true/true = تتبع إعداد الولاية). يُغيَّر فقط ما تمرّره. ' +
          'استعمل get_shipping_communes لمعرفة أرقام البلديات. الطلبات إلى بلدية معطّلة تُرفض.',
        inputSchema: {
          wilayaId: z.number().int().min(1).describe('رقم الولاية'),
          profileId: z.string().uuid().optional().describe('معرّف حساب الشحن (الافتراضي إن لم يُحدَّد)'),
          communes: z
            .array(z.object({
              communeId: z.number().int().min(1),
              homeEnabled: z.boolean(),
              officeEnabled: z.boolean(),
            }))
            .min(1)
            .max(200),
        },
      },
      ({ wilayaId, profileId, communes }) => toToolResult(() => this.mdstore.updateShippingCommunes(apiKey, wilayaId, communes, profileId)),
    );
  }
}
