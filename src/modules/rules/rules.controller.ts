import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UpdateRulesDto } from './dto/update-rules.dto';
import { RulesService } from './rules.service';

@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  find() {
    return this.rulesService.find();
  }

  @Put()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  update(@Body() dto: UpdateRulesDto) {
    return this.rulesService.update(dto);
  }
}
