import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MdstoreClient, type PageNode } from '../mdstore/mdstore.client';
import { toToolResult } from './tool-result';

const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    title: z.string(),
    subtitle: z.string().optional(),
    imageUrl: z.string().url().optional(),
    buttonText: z.string().optional(),
  }),
  z.object({
    type: z.literal('productGrid'),
    title: z.string().optional(),
    productIds: z.array(z.string().uuid()).optional(),
  }),
  z.object({
    type: z.literal('text'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('footer'),
    text: z.string(),
  }),
]);

type Section = z.infer<typeof sectionSchema>;

// شجرة مسطحة: كل قسم عقدة في المستوى الأول، و children دائماً مصفوفة فارغة.
function toTree(sections: Section[]): PageNode[] {
  return sections.map(({ type, ...props }) => ({
    id: randomUUID(),
    type,
    props,
    children: [],
  }));
}

@Injectable()
export class CreateLandingPageTool {
  constructor(private readonly mdstore: MdstoreClient) {}

  register(server: McpServer, apiKey: string) {
    server.registerTool(
      'create_landing_page',
      {
        title: 'إنشاء صفحة هبوط',
        description:
          'ينشئ صفحة هبوط في أحد متاجر المستخدم من قائمة أقسام بالترتيب: hero (بطل)، productGrid (شبكة منتجات)، text (نص)، footer (تذييل).',
        inputSchema: {
          storeId: z.string().uuid().describe('معرّف المتجر'),
          name: z.string().min(1).describe('اسم الصفحة'),
          productId: z
            .string()
            .uuid()
            .optional()
            .describe('معرّف المنتج المرتبط بالصفحة'),
          sections: z
            .array(sectionSchema)
            .min(1)
            .describe('أقسام الصفحة بالترتيب'),
        },
      },
      ({ storeId, name, productId, sections }) =>
        toToolResult(() =>
          this.mdstore.createLandingPage(apiKey, {
            storeId,
            name,
            productId,
            tree: toTree(sections),
          }),
        ),
    );
  }
}
