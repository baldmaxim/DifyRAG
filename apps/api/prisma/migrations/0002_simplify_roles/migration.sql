-- Simplify UserRole enum to two values: admin, user.
-- Existing rows are remapped: super_admin/admin -> admin, everything else -> user.
-- ProjectMemberRole is a separate enum and is intentionally left untouched.

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "UserRole_new" AS ENUM ('admin', 'user');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role"::text IN ('super_admin', 'admin') THEN 'admin'
      ELSE 'user'
    END
  )::"UserRole_new";

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
