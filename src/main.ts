import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// على Vercel: لا app.listen — نصدّر handler يعيد استعمال نفس تطبيق Express بين الطلبات.
// محلياً: تشغيل عادي على PORT.
let cachedServer: ((req: unknown, res: unknown) => void) | undefined;

async function getServer() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer!;
}

if (!process.env.VERCEL) {
  NestFactory.create(AppModule).then((app) => app.listen(process.env.PORT ?? 7001));
}

export default async function handler(req: unknown, res: unknown) {
  const server = await getServer();
  return server(req, res);
}
