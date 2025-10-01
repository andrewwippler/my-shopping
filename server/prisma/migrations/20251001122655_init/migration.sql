-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picked" BOOLEAN NOT NULL DEFAULT false,
    "person" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "list" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skip" (
    "id" SERIAL NOT NULL,
    "last_skipped" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Skip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");
