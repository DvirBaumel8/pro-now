// PRO NOW — shared ESLint flat config.
//
// One config for the whole monorepo so that "lint clean" means the same
// thing in every workspace (/CLAUDE.md §7 Definition of Done). Each
// workspace re-exports this file so `eslint src` behaves identically
// whether it is run at the root or inside a workspace.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      // The codebase deliberately marks intentionally-unused bindings with a
      // leading underscore (e.g. placeholder handler params in the realtime
      // scaffold); everything else stays an error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Server authority and money correctness depend on explicit types;
      // an accidental `any` is a defect, not a style choice (/CLAUDE.md §3).
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Browser/React Native surfaces.
    files: ["apps/customer-mobile/**/*.{ts,tsx}", "apps/pro-mobile/**/*.{ts,tsx}", "apps/admin/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
  }
);
