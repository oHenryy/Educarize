-- Código público de verificação do certificado (impresso no PDF, com QR code).
ALTER TABLE "Certificate" ADD COLUMN "verificationCode" TEXT;

-- Certificados já emitidos recebem um código aleatório.
UPDATE "Certificate"
SET "verificationCode" = upper(substr(md5(random()::text || "id"), 1, 12))
WHERE "verificationCode" IS NULL;

ALTER TABLE "Certificate" ALTER COLUMN "verificationCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");
