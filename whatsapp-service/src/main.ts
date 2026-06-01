import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🤖 WhatsApp AI Service running on http://localhost:${port}`);
  logger.log(`📱 Waiting for WhatsApp QR scan...`);
}
bootstrap();
