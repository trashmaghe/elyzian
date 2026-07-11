-- AlterTable
ALTER TABLE "TicketRef" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "TicketRef_glpiTicketId_idx" ON "TicketRef"("glpiTicketId");
