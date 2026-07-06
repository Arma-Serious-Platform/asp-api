import { UserRole } from "@prisma/client";
import { Request } from "express";

export type RequestType = Request & { role: UserRole; userId: string };