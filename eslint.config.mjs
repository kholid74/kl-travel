import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Layer boundaries from docs/architecture.md §4. */
const UI_RESTRICTED_IMPORTS = {
  patterns: [
    {
      group: ["@/repositories/mock", "@/repositories/mock/*"],
      message: "UI must not touch the mock persistence layer; go through services or stores.",
    },
    {
      group: ["@/data/seed", "@/data/seed/*", "@/data/fixtures", "@/data/fixtures/*"],
      message: "Read seed/fixture content through services/catalog-server (or data/media for images).",
    },
  ],
};

const DOMAIN_RESTRICTED_IMPORTS = {
  patterns: [
    {
      group: ["react", "react/*", "next", "next/*", "zustand", "zustand/*"],
      message: "domain/ is framework-free.",
    },
    {
      group: ["@/repositories", "@/repositories/*", "@/services", "@/services/*", "@/stores", "@/stores/*", "@/components", "@/components/*", "@/features", "@/features/*", "@/data", "@/data/*"],
      message: "domain/ may only depend on itself and lib/.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", UI_RESTRICTED_IMPORTS],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "localStorage", message: "Persist data through the data layer or ui-store." },
      ],
      "no-restricted-globals": ["error", { name: "localStorage", message: "Persist data through the data layer or ui-store." }],
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: { "no-restricted-imports": ["error", DOMAIN_RESTRICTED_IMPORTS] },
  },
  {
    // Tests may build seed data directly.
    files: ["src/app/**/*.test.ts", "src/components/**/*.test.ts", "src/features/**/*.test.ts", "src/domain/**/*.test.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/**"]),
]);

export default eslintConfig;
