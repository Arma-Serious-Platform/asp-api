import { UserRole } from "@prisma/client";
import { Request } from "express";

export type RequestType = Request & { roles: UserRole[]; userId: string };
