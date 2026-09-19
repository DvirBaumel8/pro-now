-- PRO NOW — baseline migration (0_init)
--
-- Generated from apps/api/prisma/schema.prisma by
-- tools/prisma-ddl/generate.py, then applied to a real PostgreSQL 16
-- + PostGIS 3.4 and checked back against the catalog by
-- tools/prisma-ddl/verify.py. Do not edit by hand: change the
-- schema and regenerate, or the two will drift.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'IDENTITY_PENDING', 'IDENTITY_REVIEW', 'IDENTITY_VERIFIED', 'BUSINESS_PENDING', 'CREDENTIALS_PENDING', 'SERVICE_REVIEW', 'APPROVED', 'LIMITED', 'SUSPENDED', 'REVERIFY_REQUIRED', 'REJECTED');
CREATE TYPE "ProPresenceState" AS ENUM ('OFFLINE', 'STARTING_SHIFT', 'AVAILABLE', 'OFFER_RECEIVED', 'RESERVED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'SERVICING', 'COMPLETING', 'ENDING_SHIFT');
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'REVERIFY_REQUIRED');
CREATE TYPE "PriceModel" AS ENUM ('FIXED', 'HOURLY', 'VISIT_QUOTE', 'DISTANCE_TIME');
CREATE TYPE "BookingMode" AS ENUM ('NOW', 'BOOK', 'REQUEST', 'HYBRID');
CREATE TYPE "ProfessionalServiceStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'DISABLED', 'SUSPENDED');
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'SEARCHING', 'OFFERING', 'PRO_ASSIGNED', 'PRO_EN_ROUTE', 'PRO_ARRIVED', 'DIAGNOSIS', 'WAITING_QUOTE_APPROVAL', 'IN_PROGRESS', 'COMPLETION_PENDING', 'COMPLETED', 'PAYMENT_PENDING', 'PAYMENT_CAPTURED', 'REVIEW_PENDING', 'CLOSED', 'CANCELLED', 'DISPUTED');
CREATE TYPE "DispatchOfferStatus" AS ENUM ('CREATED', 'SENT', 'VIEWED', 'ACCEPTED', 'SKIPPED', 'EXPIRED', 'REVOKED');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "profilePhotoRef" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT'::"VerificationStatus",
    "presenceState" "ProPresenceState" NOT NULL DEFAULT 'OFFLINE'::"ProPresenceState",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_verifications" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "nameMatch" BOOLEAN,
    "livenessPassed" BOOLEAN,
    "documentValid" BOOLEAN,
    "reasonCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "tradingName" TEXT,
    "taxStatus" TEXT,
    "yearsExperience" INTEGER,
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "vehicleType" TEXT,
    "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED'::"BusinessVerificationStatus",
    "verifiedAt" TIMESTAMP(3),
    "verificationSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_documents" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_credentials" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT,
    "issuer" TEXT,
    "documentRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "professional_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'NOW'::"BookingMode",
    "priceModel" "PriceModel" NOT NULL,
    "typicalDurationMinutesMin" INTEGER,
    "typicalDurationMinutesMax" INTEGER,
    "trustTier" TEXT NOT NULL,
    "equipmentNotes" TEXT,
    "customerInputsNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_variants" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "priceDeltaMinorUnits" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "service_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_add_ons" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "priceMinorUnits" INTEGER NOT NULL,
    CONSTRAINT "service_add_ons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_requirements" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "service_requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_services" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "ProfessionalServiceStatus" NOT NULL DEFAULT 'DRAFT'::"ProfessionalServiceStatus",
    "basePriceMinorUnits" INTEGER,
    "minimumBillableMinutes" INTEGER,
    "perKmMinorUnits" INTEGER,
    "minimumFareMinorUnits" INTEGER,
    "travelRadiusMeters" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_areas" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_activations" (
    "id" TEXT NOT NULL,
    "marketCode" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT false,
    "providerOnboardingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dispatchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    CONSTRAINT "market_activations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "formatted" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "placeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_sessions" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "enabledServiceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "jobsOffered" INTEGER NOT NULL DEFAULT 0,
    "jobsAccepted" INTEGER NOT NULL DEFAULT 0,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "availability_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_locations" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "headingDegrees" DOUBLE PRECISION,
    "speedMps" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "assignedProfessionalId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT'::"JobStatus",
    "description" TEXT,
    "structuredAnswers" JSONB,
    "approvedQuoteId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_media" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_events" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dispatch_offers" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "DispatchOfferStatus" NOT NULL DEFAULT 'CREATED'::"DispatchOfferStatus",
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "scoreSnapshot" DOUBLE PRECISION,
    "etaSecondsSnapshot" INTEGER,
    "payoutMinorUnitsSnapshot" INTEGER,
    CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "versionHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "totalMinorUnits" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPriceMinorUnits" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OTHER',
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED'::"PaymentStatus",
    "amountMinorUnits" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "providerName" TEXT NOT NULL,
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "amountMinorUnits" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payout_accounts" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "payoutAccountId" TEXT NOT NULL,
    "amountMinorUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountMinorUnits" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "text" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_dimensions" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    CONSTRAINT "review_dimensions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_reputation_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "external_reputation_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_external_profiles" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalProfileId" TEXT NOT NULL,
    "profileUrl" TEXT,
    "linkStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_external_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_rating_snapshots" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_rating_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_signals" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_actions" (
    "id" TEXT NOT NULL,
    "riskSignalId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "actorAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blocked_relationships" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocked_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- Indexes
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "customer_profiles_userId_key" ON "customer_profiles"("userId");
CREATE UNIQUE INDEX "professional_profiles_userId_key" ON "professional_profiles"("userId");
CREATE UNIQUE INDEX "identity_verifications_professionalId_key" ON "identity_verifications"("professionalId");
CREATE UNIQUE INDEX "business_profiles_professionalId_key" ON "business_profiles"("professionalId");
CREATE INDEX "business_profiles_verificationStatus_idx" ON "business_profiles"("verificationStatus");
CREATE INDEX "professional_documents_professionalId_idx" ON "professional_documents"("professionalId");
CREATE INDEX "professional_credentials_professionalId_type_expiresAt_idx" ON "professional_credentials"("professionalId", "type", "expiresAt");
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");
CREATE INDEX "categories_departmentId_idx" ON "categories"("departmentId");
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");
CREATE INDEX "service_variants_serviceId_idx" ON "service_variants"("serviceId");
CREATE INDEX "service_add_ons_serviceId_idx" ON "service_add_ons"("serviceId");
CREATE INDEX "service_requirements_serviceId_idx" ON "service_requirements"("serviceId");
CREATE UNIQUE INDEX "professional_services_professionalId_serviceId_key" ON "professional_services"("professionalId", "serviceId");
CREATE INDEX "professional_services_serviceId_status_idx" ON "professional_services"("serviceId", "status");
CREATE INDEX "service_areas_professionalId_idx" ON "service_areas"("professionalId");
CREATE UNIQUE INDEX "market_activations_marketCode_serviceId_key" ON "market_activations"("marketCode", "serviceId");
CREATE INDEX "addresses_customerId_idx" ON "addresses"("customerId");
CREATE INDEX "availability_sessions_professionalId_status_idx" ON "availability_sessions"("professionalId", "status");
CREATE INDEX "professional_locations_professionalId_receivedAt_idx" ON "professional_locations"("professionalId", "receivedAt");
CREATE UNIQUE INDEX "jobs_approvedQuoteId_key" ON "jobs"("approvedQuoteId");
CREATE UNIQUE INDEX "jobs_idempotencyKey_key" ON "jobs"("idempotencyKey");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
CREATE INDEX "jobs_customerId_idx" ON "jobs"("customerId");
CREATE INDEX "jobs_assignedProfessionalId_idx" ON "jobs"("assignedProfessionalId");
CREATE INDEX "job_media_jobId_idx" ON "job_media"("jobId");
CREATE INDEX "job_events_jobId_createdAt_idx" ON "job_events"("jobId", "createdAt");
CREATE INDEX "dispatch_offers_jobId_status_idx" ON "dispatch_offers"("jobId", "status");
CREATE INDEX "dispatch_offers_professionalId_status_idx" ON "dispatch_offers"("professionalId", "status");
CREATE UNIQUE INDEX "dispatch_offers_jobId_professionalId_status_key" ON "dispatch_offers"("jobId", "professionalId", "status");
CREATE INDEX "quotes_jobId_version_idx" ON "quotes"("jobId", "version");
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
CREATE INDEX "payments_jobId_idx" ON "payments"("jobId");
CREATE UNIQUE INDEX "payment_events_providerEventId_key" ON "payment_events"("providerEventId");
CREATE INDEX "ledger_entries_paymentId_idx" ON "ledger_entries"("paymentId");
CREATE UNIQUE INDEX "payout_accounts_professionalId_key" ON "payout_accounts"("professionalId");
CREATE UNIQUE INDEX "reviews_jobId_key" ON "reviews"("jobId");
CREATE UNIQUE INDEX "reviews_reviewerId_jobId_key" ON "reviews"("reviewerId", "jobId");
CREATE INDEX "reviews_professionalId_idx" ON "reviews"("professionalId");
CREATE UNIQUE INDEX "external_reputation_sources_code_key" ON "external_reputation_sources"("code");
CREATE INDEX "professional_external_profiles_professionalId_idx" ON "professional_external_profiles"("professionalId");
CREATE INDEX "chat_messages_threadId_createdAt_idx" ON "chat_messages"("threadId", "createdAt");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "risk_signals_professionalId_idx" ON "risk_signals"("professionalId");
CREATE UNIQUE INDEX "blocked_relationships_customerId_professionalId_key" ON "blocked_relationships"("customerId", "professionalId");
CREATE UNIQUE INDEX "admin_users_userId_key" ON "admin_users"("userId");
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- Foreign keys
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_documents" ADD CONSTRAINT "professional_documents_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_add_ons" ADD CONSTRAINT "service_add_ons_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_activations" ADD CONSTRAINT "market_activations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "availability_sessions" ADD CONSTRAINT "availability_sessions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_locations" ADD CONSTRAINT "professional_locations_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignedProfessionalId_fkey" FOREIGN KEY ("assignedProfessionalId") REFERENCES "professional_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_media" ADD CONSTRAINT "job_media_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "payout_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "customer_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_dimensions" ADD CONSTRAINT "review_dimensions_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_external_profiles" ADD CONSTRAINT "professional_external_profiles_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_external_profiles" ADD CONSTRAINT "professional_external_profiles_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "external_reputation_sources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_rating_snapshots" ADD CONSTRAINT "external_rating_snapshots_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "professional_external_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "risk_signals" ADD CONSTRAINT "risk_signals_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "risk_actions" ADD CONSTRAINT "risk_actions_riskSignalId_fkey" FOREIGN KEY ("riskSignalId") REFERENCES "risk_signals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
