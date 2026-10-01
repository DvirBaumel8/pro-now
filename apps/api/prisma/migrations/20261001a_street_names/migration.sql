
-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "geoPrecision" TEXT,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "localityCode" INTEGER,
ADD COLUMN     "streetCode" INTEGER;

-- CreateTable
CREATE TABLE "street_names" (
    "localityCode" INTEGER NOT NULL,
    "streetCode" INTEGER NOT NULL,
    "localityName" TEXT NOT NULL,
    "streetName" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "localityStreets" INTEGER NOT NULL,

    CONSTRAINT "street_names_pkey" PRIMARY KEY ("localityCode","streetCode")
);

