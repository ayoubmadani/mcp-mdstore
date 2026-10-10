import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export type RequestWithApiKey = Request & { mdstoreApiKey: string };

// يقرأ مفتاح MdStore من ترويسة Authorization: Bearer، أو api-key / x-api-key، أو من الرابط (/mcp/<المفتاح>)
// لأن موصلات claude.ai المخصصة لا تسمح بترويسات — فقط رابط (أو OAuth).
// لا يتحقق من صلاحيته — md-store-api هي من تقرر ذلك.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const [scheme, headerKey] = (req.headers.authorization ?? '').split(' ');
    const pathKey = (req.params as Record<string, string> | undefined)?.key;
    // ترويسة api-key / x-api-key (اختيار جاهز في موصلات claude.ai)
    const rawApiKey = req.headers['api-key'] ?? req.headers['x-api-key'];
    const apiKeyHeader = (Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey)?.trim();
    const key = (scheme === 'Bearer' && headerKey) || apiKeyHeader || pathKey;

    if (!key) {
      throw new UnauthorizedException(
        'مفتاح API مفقود. استعمل الرابط https://<الخادم>/mcp/<المفتاح> أو الترويسة Authorization: Bearer <المفتاح> — ولّد المفتاح من لوحة تحكم MdStore.',
      );
    }

    req.mdstoreApiKey = key;
    return true;
  }
}
