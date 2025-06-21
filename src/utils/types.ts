import { UserRole } from "@prisma/client";

export type RequestType = Request & { role: UserRole, userId: string };