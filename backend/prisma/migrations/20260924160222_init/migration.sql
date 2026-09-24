-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('ACTIVE', 'ACHIEVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('ESSENTIAL', 'NON_ESSENTIAL');

-- CreateEnum
CREATE TYPE "csv_upload_status" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "transaction_source" AS ENUM ('MANUAL', 'CSV');

-- CreateEnum
CREATE TYPE "saving_calculation_status" AS ENUM ('ON_TRACK', 'AT_RISK', 'DEFICIT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "destination_country" TEXT,
    "target_currency" TEXT NOT NULL,
    "target_date" DATE NOT NULL,
    "target_amount" DECIMAL(14,2) NOT NULL,
    "status" "goal_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "category_type" NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_uploads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "csv_upload_status" NOT NULL DEFAULT 'PROCESSING',

    CONSTRAINT "csv_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT,
    "csv_upload_id" TEXT,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "transaction_type" NOT NULL,
    "description" TEXT,
    "source" "transaction_source" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "target_currency" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saving_calculations" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "rate_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "daily_target" DECIMAL(14,2) NOT NULL,
    "predicted_rate" DECIMAL(18,6) NOT NULL,
    "status" "saving_calculation_status" NOT NULL DEFAULT 'ON_TRACK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saving_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_recommendations" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "cut_amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "budget_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "csv_uploads_user_id_idx" ON "csv_uploads"("user_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_idx" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_target_currency_date_key" ON "exchange_rates"("base_currency", "target_currency", "date");

-- CreateIndex
CREATE INDEX "saving_calculations_goal_id_date_idx" ON "saving_calculations"("goal_id", "date");

-- CreateIndex
CREATE INDEX "alerts_goal_id_idx" ON "alerts"("goal_id");

-- CreateIndex
CREATE INDEX "budget_recommendations_alert_id_idx" ON "budget_recommendations"("alert_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_uploads" ADD CONSTRAINT "csv_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_csv_upload_id_fkey" FOREIGN KEY ("csv_upload_id") REFERENCES "csv_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_calculations" ADD CONSTRAINT "saving_calculations_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_calculations" ADD CONSTRAINT "saving_calculations_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "exchange_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
