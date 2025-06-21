import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateServerDto } from "./dto/create-server.dto";

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.server.findMany({
      include: {
        sides: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.server.findUnique({
      where: { id },
      include: {
        sides: true,
      },
    });
  }

  async create(createServerDto: CreateServerDto) {
    return this.prisma.server.create({
      data: {
        name: createServerDto.name,
      },
    });
  }
}
