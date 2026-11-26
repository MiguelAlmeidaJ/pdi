-- Managers do not participate in the career progression flow, so their
-- admission and professional-experience dates may be omitted.
ALTER TABLE "User" ALTER COLUMN "hiredAt" DROP NOT NULL;
