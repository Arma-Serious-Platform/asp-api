-- CreateTable
CREATE TABLE "OidcClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientSecretEncrypted" TEXT,
    "redirectUris" TEXT[],
    "postLogoutRedirectUris" TEXT[],
    "backchannelLogoutUri" TEXT,
    "allowedScopes" TEXT[],
    "firstParty" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OidcClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OidcPayload" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "grantId" TEXT,
    "uid" TEXT,
    "userCode" TEXT,
    "accountId" TEXT,
    "aspSessionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OidcPayload_pkey" PRIMARY KEY ("type","id")
);

-- CreateTable
CREATE TABLE "OidcConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OidcConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OidcClient_clientId_key" ON "OidcClient"("clientId");

-- CreateIndex
CREATE INDEX "OidcClient_createdById_idx" ON "OidcClient"("createdById");

-- CreateIndex
CREATE INDEX "OidcPayload_grantId_idx" ON "OidcPayload"("grantId");

-- CreateIndex
CREATE INDEX "OidcPayload_uid_idx" ON "OidcPayload"("uid");

-- CreateIndex
CREATE INDEX "OidcPayload_userCode_idx" ON "OidcPayload"("userCode");

-- CreateIndex
CREATE INDEX "OidcPayload_accountId_idx" ON "OidcPayload"("accountId");

-- CreateIndex
CREATE INDEX "OidcPayload_aspSessionId_idx" ON "OidcPayload"("aspSessionId");

-- CreateIndex
CREATE INDEX "OidcPayload_expiresAt_idx" ON "OidcPayload"("expiresAt");

-- CreateIndex
CREATE INDEX "OidcConsent_clientId_idx" ON "OidcConsent"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OidcConsent_userId_clientId_key" ON "OidcConsent"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "OidcClient" ADD CONSTRAINT "OidcClient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OidcConsent" ADD CONSTRAINT "OidcConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OidcConsent" ADD CONSTRAINT "OidcConsent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OidcClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
