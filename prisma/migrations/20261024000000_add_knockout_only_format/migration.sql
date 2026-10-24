-- AlterEnum
ALTER TYPE "TournamentFormat" ADD VALUE 'KNOCKOUT_ONLY';

-- AlterTable: teams in a knockout-only tournament have no group
ALTER TABLE "Team" ALTER COLUMN "groupId" DROP NOT NULL;
