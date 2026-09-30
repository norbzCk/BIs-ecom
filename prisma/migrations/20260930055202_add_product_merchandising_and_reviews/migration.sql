-- AlterTable
ALTER TABLE "products" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "compare_at_price" DECIMAL(12,2),
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rating" DECIMAL(2,1),
ADD COLUMN     "released_at" TIMESTAMP(3),
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT,
    "rating" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE INDEX "products_featured_idx" ON "products"("featured");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
