import { Module } from "@nestjs/common";
import { PboParserService } from "./pbo-parser.service";

@Module({
  providers: [PboParserService],
  exports: [PboParserService],
})
export class PboParserModule {}
