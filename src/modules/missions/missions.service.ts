import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { ASP_BUCKET } from "src/infrastructure/minio/minio.lib";
import { MinioService } from "src/infrastructure/minio/minio.service";

export class MissionsService {
  constructor(private readonly prisma: PrismaService, private readonly minioService: MinioService) { }

  async findAll(dto: FindMissionsDto) {
    const { search, authorId, minSlots, maxSlots, status } = dto;

    return await this.prisma.mission.findMany({
      where: {
        name: { contains: search, mode: 'insensitive' },
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            squad: {
              select: {
                id: true,
                tag: true
              }
            }
          },
        },
      },
    });
  }

  async createMission(dto: CreateMissionDto, image?: File) {

    let fileId = '';
    if (image) {
      const file = await this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, image);

      fileId = file.id;
    }

    // await this.prisma.mission.create({

    // });

  }
}