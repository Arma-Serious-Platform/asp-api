import { PartialType } from "@nestjs/mapped-types";
import { CreateSideDto } from "./create-side.dto";

export class UpdateSideDto extends PartialType(CreateSideDto) { }
