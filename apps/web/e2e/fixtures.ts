import { test as base } from "@playwright/test";

/**
 * Every browser context and API client in the suite is a different person
 * arriving from a different address, as through Render's proxy: the
 * production build trusts one proxy hop (TRUST_PROXY_HOPS=1 in
 * playwright.config.ts) and limits sign-ins per address. Without this the
 * whole suite would be one household behind one router, and would meet
 * Better Auth's three-sign-ins-per-ten-seconds limit — correctly.
 * Outside production mode the header is ignored (no proxy is trusted).
 */
export const asPerson = (): Record<string, string> => ({
  "x-forwarded-for": `10.${rand()}.${rand()}.${rand()}`,
});
const rand = () => Math.floor(Math.random() * 254) + 1;

export const test = base.extend({
  extraHTTPHeaders: async ({}, use) => use(asPerson()),
});
export { expect } from "@playwright/test";
