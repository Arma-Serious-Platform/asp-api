import { BadGatewayException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { MissionGameSide } from "@prisma/client";
import { Multer } from "multer";

type PboParserSlotUnit = {
  id: number;
  name: string;
};

type PboParserSlot = {
  callsign: string;
  count: number;
  units: PboParserSlotUnit[];
};

type PboParserResponse = {
  slots?: Partial<Record<"west" | "east" | "independent", PboParserSlot[]>>;
};

type MissionSlotsBySide = Partial<Record<MissionGameSide, PboParserSlot[]>>;

const PBO_SIDE_TO_MISSION_SIDE: Record<"west" | "east" | "independent", MissionGameSide> = {
  west: MissionGameSide.BLUE,
  east: MissionGameSide.RED,
  independent: MissionGameSide.GREEN,
};

@Injectable()
export class PboParserService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PBO_PARSER_URL?.trim() ?? "";

    if (!this.baseUrl) {
      throw new InternalServerErrorException("PBO_PARSER_URL is not configured");
    }
  }

  async parseMissionSlots(file: Multer.File): Promise<MissionSlotsBySide> {
    const formData = new FormData();
    const fileBuffer = Buffer.from(file.buffer);
    const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
    formData.append("pbo", blob, file.originalname);

    const response = await fetch(`${this.baseUrl}/slots`, {
      method: "POST",
      body: formData,
    }).catch(() => {
      throw new BadGatewayException("Unable to connect to PBO parser service");
    });

    if (!response.ok) {
      throw new BadGatewayException("PBO parser service returned an error");
    }

    const data = (await response.json()) as PboParserResponse;
    const mappedSlots: MissionSlotsBySide = {};

    for (const pboSide of Object.keys(PBO_SIDE_TO_MISSION_SIDE) as Array<keyof typeof PBO_SIDE_TO_MISSION_SIDE>) {
      const missionSide = PBO_SIDE_TO_MISSION_SIDE[pboSide];
      if (data.slots?.[pboSide]) {
        mappedSlots[missionSide] = data.slots[pboSide];
      }
    }

    return mappedSlots;
  }
}
