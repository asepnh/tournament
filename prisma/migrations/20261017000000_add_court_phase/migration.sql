-- CreateEnum
CREATE TYPE "CourtPhase" AS ENUM ('POOL', 'ELIMINATION');

-- AlterTable
ALTER TABLE "Court" ADD COLUMN "phase" "CourtPhase" NOT NULL DEFAULT 'POOL';
