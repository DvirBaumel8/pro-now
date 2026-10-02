import type { CatalogResponse, DepartmentCode } from "@pro-now/types";
import { pilotServiceById, pilotServiceIdForDatabaseCode } from "@pro-now/types";
import { departmentCodeByServiceId } from "@pro-now/ui";

import type { WorldShopPosition } from "./scene/street";
import { WORLD_SHOPS } from "./scene/street";
import type { WorldTrade } from "./types";

const INTERIOR_BY_SHOP: Partial<Record<string, string>> = {
  home: "home_workshop_hero",
  appliance: "appliance_workshop_hero",
  care: "care_studio_hero",
  hair: "hair_barbershop_hero",
  auto: "auto_garage_hero",
  pets: "pets_salon_hero",
};

/**
 * Adapts the server's market catalogue into the shops the world can render.
 * The server decides which services exist; each one is placed by its
 * customer-facing department (the pilot catalogue's), not by the database's
 * department, whose codes (`HOME_REPAIRS`, `AUTO`, …) are a different set.
 * The pilot id is also what the customer app's request composer expects.
 *
 * Now handles multiple shops per department (e.g. hair + nails for BEAUTY,
 * pets + vet for PETS) by assigning all matching services to each shop.
 */
export function worldTradesFromCatalog(catalog: CatalogResponse): Readonly<Record<string, WorldTrade>> {
  const shopsByDepartment = new Map<DepartmentCode, WorldShopPosition[]>();
  for (const shop of WORLD_SHOPS) {
    const list = shopsByDepartment.get(shop.departmentCode) ?? [];
    list.push(shop);
    shopsByDepartment.set(shop.departmentCode, list);
  }

  const servicesByDepartment = new Map<DepartmentCode, WorldTrade["services"][number][]>();

  for (const department of catalog.departments) {
    for (const category of department.categories) {
      for (const service of category.services) {
        const pilotId = pilotServiceIdForDatabaseCode(service.code);
        const departmentCode = pilotId ? departmentCodeByServiceId[pilotId] : undefined;
        if (!pilotId || !departmentCode) continue;
        const pilot = pilotServiceById[pilotId];
        const services = servicesByDepartment.get(departmentCode) ?? [];
        services.push({ id: pilotId, nameHe: pilot?.nameHe ?? service.nameHe, descriptionHe: pilot?.descriptionHe ?? null });
        servicesByDepartment.set(departmentCode, services);
      }
    }
  }

  const trades: Record<string, WorldTrade> = {};
  for (const [departmentCode, shops] of shopsByDepartment) {
    const services = servicesByDepartment.get(departmentCode);
    if (!services) continue;
    for (const shop of shops) {
      trades[shop.shopId] = {
        shopId: shop.shopId,
        departmentCode,
        nameHe: shop.labelHe,
        services,
        interiorAssetId: INTERIOR_BY_SHOP[shop.shopId] ?? null,
      };
    }
  }

  return trades;
}
