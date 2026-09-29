import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { seed } from 'prisma/seed';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { HttpErrorLoggingFilter } from './shared/filters/http-error-logging.filter';
import { requestIdMiddleware } from './shared/middleware/request-id.middleware';
import cookieParser from 'cookie-parser';
import { PublicApiModule } from './modules/public-api/public-api.module';

async function bootstrap() {
  await seed();
  const app = await NestFactory.create(AppModule);
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.use(requestIdMiddleware);
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Api-Key'],
    exposedHeaders: ['X-Request-Id'],
  });

  const theme = new SwaggerTheme();

  const publicRateTtl = Number(process.env.PUBLIC_API_RATE_TTL ?? 60);
  const publicRateLimit = Number(process.env.PUBLIC_API_RATE_LIMIT ?? 60);

  const publicConfig = new DocumentBuilder()
    .setTitle('ASP Public API')
    .setDescription(
      `Read-only integration API authenticated with an API key.\n\n` +
        `Pass the key via the \`X-Api-Key\` header.\n\n` +
        `Rate limit: ${publicRateLimit} requests per ${publicRateTtl} seconds per API key.`,
    )
    .setVersion(process.env.npm_package_version ?? '0.0.1')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Api-Key',
        in: 'header',
      },
      'X-Api-Key',
    )
    .build();

  const publicDocument = SwaggerModule.createDocument(app, publicConfig, {
    include: [PublicApiModule],
  });
  SwaggerModule.setup('swagger/public', app, publicDocument, {
    customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
    explorer: true,
    jsonDocumentUrl: '/swagger/public/json',
  });

  if (process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Arma Serious Platform API')
      .setDescription('The core ASP API service')
      .setVersion(process.env.npm_package_version ?? '0.0.1')
      .build();

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
