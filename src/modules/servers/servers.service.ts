import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateServerDto } from "./dto/create-server.dto";
import { FindServersDto } from "./dto/find-servers.dto";
import { Prisma } from "@prisma/client";
import { EditServerDto } from "./dto/edit-server.dto";

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(findServersDto: FindServersDto) {
    const options: Prisma.ServerFindManyArgs = {};

    if (findServersDto.status) {
      options.where = {
        status: findServersDto.status,
      };
    }

    if (typeof findServersDto.skip === 'number') {
      options.skip = findServersDto.skip;
    }

    if (typeof findServersDto.take === 'number') {
      options.take = findServersDto.take;
    }

    return this.prisma.server.findMany(options);
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
    const server = await this.prisma.server.findUnique({
      where: {
        name: createServerDto.name,
      },
    });

    if (server) {
      throw new BadRequestException('Server with this name already exists');
    }

    return this.prisma.server.create({
      data: createServerDto,
      include: {
        sides: true
      }
    });
  }

  async update(id: string, editServerDto: EditServerDto) {
    const server = await this.prisma.server.findUnique({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return this.prisma.server.update({
      where: { id },
      data: editServerDto,
    });
  }
}
