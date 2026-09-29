import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("compiled API runtime", () => {
  it("can be imported by plain Node without tsx", () => {
    execFileSync("npm", ["run", "build", "-w", "apps/api"], {
      cwd: repoRoot,
      stdio: "ignore",
    });

    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        'import("./apps/api/dist/server.js").then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); })',
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          DATABASE_URL: "postgresql://u:p@localhost:5432/pronow",
          AUTH_SECRET: "a-test-secret-that-is-at-least-32-chars",
        },
        encoding: "utf8",
      }
    );

    expect(result.status, result.stderr).toBe(0);
  });

  it("serves the health endpoint from the compiled bundle under plain Node", () => {
    execFileSync("npm", ["run", "build", "-w", "apps/api"], {
      cwd: repoRoot,
      stdio: "ignore",
    });

    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import("./apps/api/dist/server.js").then(async ({ buildServer }) => {
          const app = await buildServer({ logger: false });
          const response = await app.inject({ method: "GET", url: "/health" });
          console.log(JSON.stringify({ status: response.statusCode, body: response.json() }));
          await app.close();
          process.exit(response.statusCode === 200 && response.json().ok === true ? 0 : 1);
        }).catch((error) => { console.error(error); process.exit(1); })`,
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          DATABASE_URL: "postgresql://u:p@localhost:5432/pronow",
          AUTH_SECRET: "a-test-secret-that-is-at-least-32-chars",
        },
        encoding: "utf8",
      }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"status":200');
    expect(result.stdout).toContain('"ok":true');
  });
});
