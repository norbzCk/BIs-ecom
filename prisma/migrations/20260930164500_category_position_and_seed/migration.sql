-- Curated display order for the storefront Browse grid. Without it the grid
-- falls back to alphabetical, which does not match how the shop is laid out.
ALTER TABLE "categories" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "categories_position_idx" ON "categories"("position");

-- Remove the placeholder category left over from initial setup. It has no
-- products, so the products -> categories RESTRICT rule is not in the way.
DELETE FROM "categories" WHERE "name" = 'apex';

-- The six storefront categories, in the order the Browse grid shows them.
-- ON CONFLICT keeps this migration idempotent: re-running it fixes the
-- positions instead of failing on the categories unique index.
INSERT INTO "categories" ("name", "description", "position", "created_at", "updated_at")
VALUES
  ('Computers', 'Laptops, desktops and workstations for work and play.', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Monitors', 'Displays sized for desks, from 24-inch to ultrawide.', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Mice', 'Pointing devices for gaming, office and travel.', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Keyboards', 'Mechanical, membrane and low-profile boards.', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Audio', 'Headphones, headsets, speakers and microphones.', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Accessories', 'Cables, docks, adapters and everything else a desk needs.', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE
SET "position" = EXCLUDED."position",
    "description" = EXCLUDED."description",
    "updated_at" = CURRENT_TIMESTAMP;
