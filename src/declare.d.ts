import { UserRole } from "@prisma/client";

declare module 'express' {
  interface Request {
    role?: UserRole;
  }
}