-- AlterTable: Add LinkedIn OAuth fields to users
ALTER TABLE "users" ADD COLUMN     "linkedin_id" TEXT,
ADD COLUMN     "linkedin_access_token" TEXT,
ADD COLUMN     "linkedin_refresh_token" TEXT,
ADD COLUMN     "linkedin_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "linkedin_connected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_linkedin_id_key" ON "users"("linkedin_id");

-- AlterTable: Add LinkedIn publishing fields to posts
ALTER TABLE "posts" ADD COLUMN     "linkedin_post_urn" TEXT,
ADD COLUMN     "published_to_linkedin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "published_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "posts_linkedin_post_urn_key" ON "posts"("linkedin_post_urn");
