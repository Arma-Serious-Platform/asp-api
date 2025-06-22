import { UserRole } from "@prisma/client";

declare module 'express' {
  interface Request {
    role?: UserRole;
  }
}

declare module 'gamedig' {
  interface QueryResult {
    name: string;
    map: string;
    maxPlayers: number;
    players: Player[];
    ping: number;
  }
}
