import { Get, Param, Query, UseGuards } from "@nestjs/common";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { MissionsService } from "./missions.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

export class MissionsController {
  constructor(private readonly missionsService: MissionsService) { }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Query() findMissionsDto: FindMissionsDto) {
    return this.missionsService.findAll(findMissionsDto);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.missionsService.findOne(id);
  // }
}