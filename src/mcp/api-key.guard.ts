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
    // نقبل المفتاح من أي مصدر وبأي صيغة: «Bearer mdk_…» أو «mdk_…» وحده،
    // في authorization أو api-key أو x-api-key، أو في الرابط /mcp/<المفتاح>
    const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
    const candidates = [
      first(req.headers.authorization),
      first(req.headers['api-key']),
      first(req.headers['x-api-key']),
      (req.params as Record<string, string> | undefined)?.key ?? '',
    ];
    const key = candidates
      .map((v) => v.trim().replace(/^Bearer\s+/i, '').trim())
      .find((v) => v.length > 0);

    if (!key) {
      throw new UnauthorizedException(
        'مفتاح API مفقود. استعمل الرابط https://<الخادم>/mcp/<المفتاح> أو الترويسة Authorization: Bearer <المفتاح> — ولّد المفتاح من لوحة تحكم MdStore.',
      );
    }

    req.mdstoreApiKey = key;
    return true;
  }
}
