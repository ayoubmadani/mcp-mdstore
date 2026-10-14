import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

// الحد الافتراضي 100KB لا يكفي لـ upload_image (صورة base64)؛ Vercel نفسه يقطع عند 4.5MB
const BODY_LIMIT = '5mb';

// على Vercel: لا app.listen — نصدّر handler يعيد استعمال نفس تطبيق Express بين الطلبات.
// محلياً: تشغيل عادي على PORT.
let cachedServer: ((req: unknown, res: unknown) => void) | undefined;

async function getServer() {
  if (!cachedServer) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useBodyParser('json', { limit: BODY_LIMIT });
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance() as (req: unknown, res: unknown) => void;
  }
  return cachedServer!;
}

if (!process.env.VERCEL) {
  NestFactory.create<NestExpressApplication>(AppModule).then((app) => {
    app.useBodyParser('json', { limit: BODY_LIMIT });
    return app.listen(process.env.PORT ?? 7001);
  });
}

export default async function handler(req: unknown, res: unknown) {
  const server = await getServer();
  return server(req, res);
}
