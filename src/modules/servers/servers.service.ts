import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { GameDig } from 'gamedig';
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { Prisma, Server } from "@prisma/client";
import { CreateServerDto } from "./dto/create-server.dto";
import { FindServersDto } from "./dto/find-servers.dto";
import { EditServerDto } from "./dto/edit-server.dto";

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService) { }

  private async getServerInfo(server: Server) {
    return GameDig.query({
      type: 'arma3',
      host: server.ip,
      port: server.port,
    }).then((result) => {

      return {
        ...server,
        info: {
          name: result.name ?? null,
          game: (result?.raw as any)?.game as string ?? null,
          map: result.map ?? null,
          maxPlayers: result.maxplayers ?? null,
          players: result.numplayers ?? null,
          ping: result.ping ?? null,
        }
      }
    }).catch(() => {
      return server;
    });
  }

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

    const servers = await this.prisma.server.findMany(options);

    if (findServersDto.fetchActualInfo) {
      return Promise.all(servers.map((server) => this.getServerInfo(server)));
    } else {
      return servers;
    }

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

  async delete(id: string) {
    return this.prisma.server.delete({
      where: { id },
    });
  }
}
