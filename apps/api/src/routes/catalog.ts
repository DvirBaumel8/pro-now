import type { FastifyInstance } from "fastify";
import type { CatalogCategoryView, CatalogDepartmentView } from "@pro-now/types";
import { PILOT_MARKET_CODE } from "../config/market.js";

/**
 * GET /v1/catalog — see /docs/06-API-SPEC.md. Always filtered through
 * MarketActivation.customerVisible; taxonomy existing in the DB is never
 * sufficient to show a category (/docs/05-DATABASE.md §Market activation).
 */
export default async function catalogRoutes(app: FastifyInstance) {
  app.get("/v1/catalog", async (req, reply) => {
    const marketCode = (req.query as { market?: string })?.market ?? PILOT_MARKET_CODE;

    const activations = await app.prisma.marketActivation.findMany({
      where: { marketCode, customerVisible: true },
      include: {
        service: { include: { category: { include: { department: true } } } },
      },
    });

    type DepartmentAccumulator = Omit<CatalogDepartmentView, "categories"> & {
      categories: Map<string, CatalogCategoryView>;
    };
    const departments = new Map<string, DepartmentAccumulator>();

    for (const activation of activations) {
      const svc = activation.service;
      const cat = svc.category;
      const dept = cat.department;

      if (!departments.has(dept.code)) {
        departments.set(dept.code, { code: dept.code, nameHe: dept.nameHe, nameEn: dept.nameEn, categories: new Map() });
      }
      const deptEntry = departments.get(dept.code)!;
      if (!deptEntry.categories.has(cat.code)) {
        deptEntry.categories.set(cat.code, { code: cat.code, nameHe: cat.nameHe, nameEn: cat.nameEn, services: [] });
      }
      deptEntry.categories.get(cat.code)!.services.push({
        id: svc.id,
        code: svc.code,
        nameHe: svc.nameHe,
        nameEn: svc.nameEn,
        priceModel: svc.priceModel,
        trustTier: svc.trustTier,
      });
    }

    const result = Array.from(departments.values()).map((d) => ({
      ...d,
      categories: Array.from(d.categories.values()),
    }));

    return reply.send({ marketCode, departments: result });
  });
}
