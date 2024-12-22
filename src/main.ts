import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  // Sử dụng cookie-parser middleware
  app.use(cookieParser());
  console.log(`Application running on: http://localhost:${process.env.PORT}`);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
