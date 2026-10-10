import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export type RequestWithApiKey = Request & { mdstoreApiKey: string };

// يقرأ مفتاح MdStore من ترويسة Authorization، أو من الرابط نفسه (/mcp/<المفتاح>)
// لأن موصلات claude.ai المخصصة لا تسمح بترويسات — فقط رابط (أو OAuth).
// لا يتحقق من صلاحيته — md-store-api هي من تقرر ذلك.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const [scheme, headerKey] = (req.headers.authorization ?? '').split(' ');
    const pathKey = (req.params as Record<string, string> | undefined)?.key;
    const key = scheme === 'Bearer' && headerKey ? headerKey : pathKey;

    if (!key) {
      throw new UnauthorizedException(
        'مفتاح API مفقود. استعمل الرابط https://<الخادم>/mcp/<المفتاح> أو الترويسة Authorization: Bearer <المفتاح> — ولّد المفتاح من لوحة تحكم MdStore.',
      );
    }

    req.mdstoreApiKey = key;
    return true;
  }
}
