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
        description: 'يعرض متاجر المستخدم على MdStore مع معرّف كل متجر.',
      },
      () => toToolResult(() => this.mdstore.listStores(apiKey)),
    );
  }
}
