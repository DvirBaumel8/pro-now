import { departmentCodeByServiceId } from "@pro-now/ui";
import type { CustomerCategory } from "@pro-now/types";

/**
 * The services a customer category covers in this catalogue — the demo's
 * rule: a category is several departments wide, so a tap on one shows what
 * it contains rather than opening its first service.
 */
export function servicesForCategory<T extends { id: string }>(category: CustomerCategory, services: readonly T[]): T[] {
  return services.filter((s) => {
    const department = departmentCodeByServiceId[s.id];
    return department !== undefined && category.departments.includes(department);
  });
}
