import { MissionStatus, MissionType } from '@prisma/client';
import { ASP_BUCKET } from './minio.lib';

/** MinIO bucket for a mission version PBO from review status and mission type. */
export function resolveMissionVersionBucket(
  status: MissionStatus,
  missionType: MissionType,
): ASP_BUCKET {
  if (
    status === MissionStatus.PENDING_APPROVAL ||
    status === MissionStatus.CHANGES_REQUESTED ||
    status === MissionStatus.IN_REVIEW
  ) {
    return ASP_BUCKET.TESTING_MISSIONS;
  }

  if (missionType === MissionType.mini) {
    return ASP_BUCKET.MINI_MISSIONS;
  }

  return ASP_BUCKET.BIG_MISSIONS;
}
