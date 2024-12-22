import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { DatabaseModule } from './database/database.module';
import { PostModule } from './post/post.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';

const envSchema = z.object({
  POSTGRES_HOST: z.string().nonempty('POSTGRES_HOST is required'),
  POSTGRES_PORT: z.string().regex(/^\d+$/, 'POSTGRES_PORT must be a number'),
  POSTGRES_USER: z.string().nonempty('POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z.string().nonempty('POSTGRES_PASSWORD is required'),
  POSTGRES_DB: z.string().nonempty('POSTGRES_DB is required'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').optional(),
  JWT_REFRESH_SECRET: z.string().nonempty('JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_SECRET: z.string().nonempty('JWT_ACCESS_SECRET is required'),
  OPENAI_API_KEY: z.string().nonempty('OPENAI_API_KEY is required'),
  OPENAI_API_MODEL: z.string().nonempty('OPENAI_API_MODEL is required'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: '.env',
      validate: (config) => {
        const parsed = envSchema.safeParse(config);
        if (!parsed.success) {
          // Collect all errors into a single error message
          const errorMessage = parsed.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          throw new Error(`Environment validation error: ${errorMessage}`);
        }
        return parsed.data; // Return the validated data
      },
    }),
    DatabaseModule,
    PostModule,
    UserModule,
    AuthModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
