import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from 'src/modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { apiKeyId?: string }>();
    const rawKey = this.extractApiKey(request);

    if (!rawKey) {
      throw new UnauthorizedException('API key is required');
    }

    const apiKey = await this.apiKeysService.findByRawKey(rawKey);
    if (!apiKey) {
      throw new UnauthorizedException('API key is invalid');
    }

    request.apiKeyId = apiKey.id;
    void this.apiKeysService.touchLastUsed(apiKey.id).catch(() => undefined);

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    const header = request.headers['x-api-key'];
    if (typeof header === 'string' && header.trim()) {
      return header.trim();
    }
    if (Array.isArray(header) && header[0]?.trim()) {
      return header[0].trim();
    }
    return undefined;
  }
}
