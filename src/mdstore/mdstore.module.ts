import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MdstoreClient } from './mdstore.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('MDSTORE_API_BASE_URL'),
      }),
    }),
  ],
  providers: [MdstoreClient],
  exports: [MdstoreClient],
})
export class MdstoreModule {}
