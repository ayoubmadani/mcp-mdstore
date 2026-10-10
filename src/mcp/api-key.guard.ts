import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export type RequestWithApiKey = Request & { mdstoreApiKey: string };

// يقرأ مفتاح MdStore من ترويسة Authorization ويضعه في الطلب ليصل إلى
// الأدوات. لا يتحقق من صلاحيته — md-store-api هي من تقرر ذلك.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const [scheme, key] = (req.headers.authorization ?? '').split(' ');

    if (scheme !== 'Bearer' || !key) {
      throw new UnauthorizedException(
        'مفتاح API مفقود. أضف الترويسة: Authorization: Bearer <المفتاح> — يمكنك توليد المفتاح من لوحة تحكم MdStore.',
      );
    }

    req.mdstoreApiKey = key;
    return true;
  }
}
