import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { UpdateRulesDto } from './dto/update-rules.dto';

const RULES_SETTING_KEY = 'rules.content';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async find() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: RULES_SETTING_KEY },
    });

    return {
      content: typeof setting?.value === 'string' ? setting.value : '',
    };
  }

  async update(dto: UpdateRulesDto) {
    const setting = await this.prisma.siteSetting.upsert({
      where: { key: RULES_SETTING_KEY },
      create: {
        key: RULES_SETTING_KEY,
        value: dto.content,
      },
      update: {
        value: dto.content,
      },
    });

    return {
      content: typeof setting.value === 'string' ? setting.value : '',
    };
  }
}
