import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SidesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.side.findMany();
  }

  async findOne(id: string) {
    return this.prisma.side.findUnique({
      where: { id },
      include: {
        squads: {
          select: {
            id: true,
            name: true,
            tag: true,
            logoUrl: true,
          },
        },
      },
    });
  }
}
