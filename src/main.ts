/* eslint-disable @typescript-eslint/no-floating-promises */
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { seed } from 'prisma/seed';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { HttpErrorLoggingFilter } from './shared/filters/http-error-logging.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  await seed();
  const app = await NestFactory.create(AppModule);
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new HttpErrorLoggingFilter(httpAdapter));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      skipMissingProperties: false,
      skipUndefinedProperties: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : true;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = new DocumentBuilder()
    .setTitle('Arma Serious Platform API')
    .setDescription('The core ASP API service')
    .setVersion(process.env.npm_package_version ?? '0.0.1')
    .build();

  if (process.env.ENABLE_SWAGGER === 'true') {
    const theme = new SwaggerTheme();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, documentFactory, {
      customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
      explorer: true,
      jsonDocumentUrl: '/swagger/json',
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
