-- Move any news notifications that were created under ANNOUNCEMENTS
UPDATE "Notification" SET "group" = 'NEWS' WHERE "type" = 'NEWS_PUBLISHED' AND "group" = 'ANNOUNCEMENTS';
