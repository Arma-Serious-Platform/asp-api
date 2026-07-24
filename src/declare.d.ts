import { UserRole } from "@prisma/client";

declare namespace Express {
  export interface Request {
    roles?: UserRole[];
    userId?: string;
  }
}
