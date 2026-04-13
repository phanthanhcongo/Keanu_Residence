-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'ADMIN', 'SUPER_ADMIN', 'SALES');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('UPCOMING', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'LOCKED', 'RESERVED', 'SOLD', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "phoneNumber" VARCHAR(20),
    "email" VARCHAR(255),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "dateOfBirth" DATE,
    "gender" VARCHAR(20),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "avatarUrl" VARCHAR(500),
    "password" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "interest" VARCHAR(50),
    "refreshTokenHash" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "ghlContactId" VARCHAR(255),
    "profileCompletionSkipped" BOOLEAN DEFAULT false,
    "referral" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_otp" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "email_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_otp" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "phone_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "developer" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255),
    "launchDate" DATE NOT NULL,
    "launchTime" VARCHAR(10) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "status" "ProjectStatus" NOT NULL DEFAULT 'UPCOMING',
    "logoUrl" VARCHAR(500),
    "primaryColor" VARCHAR(7),
    "secondaryColor" VARCHAR(7),
    "heroImageUrl" VARCHAR(500),
    "videoUrl" VARCHAR(500),
    "termsUrl" VARCHAR(500),
    "policyUrl" VARCHAR(500),
    "reservationDuration" INTEGER NOT NULL DEFAULT 10,
    "depositAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "unitNumber" VARCHAR(50) NOT NULL,
    "unitType" VARCHAR(50) NOT NULL,
    "floor" INTEGER,
    "size" DECIMAL(10,2) NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "launchPrice" DECIMAL(12,2),
    "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "shortlistCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "floorPlanUrl" VARCHAR(500),
    "imageUrls" JSONB,
    "features" JSONB,
    "xPosition" INTEGER,
    "yPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "depositAmount" DECIMAL(10,2) NOT NULL,
    "paymentIntentId" VARCHAR(255),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" VARCHAR(50),
    "buyerName" VARCHAR(255),
    "buyerEmail" VARCHAR(255),
    "buyerPhone" VARCHAR(20),
    "source" VARCHAR(100),
    "campaign" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "reservationId" UUID,
    "invoiceId" VARCHAR(255) NOT NULL,
    "paymentId" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(50) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(100) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entityId" UUID,
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "appId" VARCHAR(255),
    "providerType" VARCHAR(50) NOT NULL,
    "providerName" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'inactive',
    "credentials" JSONB NOT NULL,
    "config" JSONB,
    "lastTestedAt" TIMESTAMP(3),
    "testResult" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_manipulation" (
    "id" SERIAL NOT NULL,
    "delta" INTEGER NOT NULL,
    "milestone" TIMESTAMP(0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_manipulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_phoneNumber_idx" ON "user"("phoneNumber");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_isDeleted_idx" ON "user"("isDeleted");

-- CreateIndex
CREATE INDEX "email_otp_email_createdAt_idx" ON "email_otp"("email", "createdAt");

-- CreateIndex
CREATE INDEX "email_otp_isDeleted_idx" ON "email_otp"("isDeleted");

-- CreateIndex
CREATE INDEX "phone_otp_phoneNumber_createdAt_idx" ON "phone_otp"("phoneNumber", "createdAt");

-- CreateIndex
CREATE INDEX "phone_otp_isDeleted_idx" ON "phone_otp"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "project_slug_key" ON "project"("slug");

-- CreateIndex
CREATE INDEX "project_slug_idx" ON "project"("slug");

-- CreateIndex
CREATE INDEX "project_launchDate_idx" ON "project"("launchDate");

-- CreateIndex
CREATE INDEX "project_isDeleted_idx" ON "project"("isDeleted");

-- CreateIndex
CREATE INDEX "unit_projectId_status_idx" ON "unit"("projectId", "status");

-- CreateIndex
CREATE INDEX "unit_price_idx" ON "unit"("price");

-- CreateIndex
CREATE INDEX "unit_launchPrice_idx" ON "unit"("launchPrice");

-- CreateIndex
CREATE INDEX "unit_unitType_idx" ON "unit"("unitType");

-- CreateIndex
CREATE INDEX "unit_isDeleted_idx" ON "unit"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "unit_projectId_unitNumber_key" ON "unit"("projectId", "unitNumber");

-- CreateIndex
CREATE INDEX "shortlist_userId_idx" ON "shortlist"("userId");

-- CreateIndex
CREATE INDEX "shortlist_isDeleted_idx" ON "shortlist"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_userId_unitId_key" ON "shortlist"("userId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_paymentIntentId_key" ON "reservation"("paymentIntentId");

-- CreateIndex
CREATE INDEX "reservation_userId_idx" ON "reservation"("userId");

-- CreateIndex
CREATE INDEX "reservation_unitId_idx" ON "reservation"("unitId");

-- CreateIndex
CREATE INDEX "reservation_status_idx" ON "reservation"("status");

-- CreateIndex
CREATE INDEX "reservation_expiresAt_idx" ON "reservation"("expiresAt");

-- CreateIndex
CREATE INDEX "reservation_isDeleted_idx" ON "reservation"("isDeleted");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_paymentId_idx" ON "payment"("paymentId");

-- CreateIndex
CREATE INDEX "activity_log_userId_createdAt_idx" ON "activity_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_log_action_idx" ON "activity_log"("action");

-- CreateIndex
CREATE INDEX "activity_log_isDeleted_idx" ON "activity_log"("isDeleted");

-- CreateIndex
CREATE INDEX "integration_userId_idx" ON "integration"("userId");

-- CreateIndex
CREATE INDEX "integration_appId_idx" ON "integration"("appId");

-- CreateIndex
CREATE INDEX "integration_providerName_idx" ON "integration"("providerName");

-- CreateIndex
CREATE INDEX "integration_status_idx" ON "integration"("status");

-- CreateIndex
CREATE INDEX "integration_isDeleted_idx" ON "integration"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "integration_userId_providerName_key" ON "integration"("userId", "providerName");

-- CreateIndex
CREATE INDEX "user_manipulation_milestone_idx" ON "user_manipulation"("milestone");

-- AddForeignKey
ALTER TABLE "email_otp" ADD CONSTRAINT "email_otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_otp" ADD CONSTRAINT "phone_otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist" ADD CONSTRAINT "shortlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist" ADD CONSTRAINT "shortlist_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
