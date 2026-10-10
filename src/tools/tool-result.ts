import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MdstoreApiError } from '../mdstore/mdstore.client';

// يشغّل استدعاء md-store-api ويحوّل النتيجة أو رسالة الخطأ إلى رد أداة MCP.
export async function toToolResult(
  call: () => Promise<unknown>,
): Promise<CallToolResult> {
  try {
    const data = await call();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    if (err instanceof MdstoreApiError) {
      return { isError: true, content: [{ type: 'text', text: err.message }] };
    }
    throw err;
  }
}
