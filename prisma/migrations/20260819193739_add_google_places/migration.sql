-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "googleMapsUri" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "googleRating" REAL;
ALTER TABLE "Restaurant" ADD COLUMN "googleSyncedAt" DATETIME;
ALTER TABLE "Restaurant" ADD COLUMN "googleUserRatingCount" INTEGER;

-- CreateTable
CREATE TABLE "RestaurantReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "relativeTime" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantReview_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RestaurantReview_restaurantId_idx" ON "RestaurantReview"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_googlePlaceId_key" ON "Restaurant"("googlePlaceId");

