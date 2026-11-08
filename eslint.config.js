import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  globalIgnores(["**/.next/", "**/next-env.d.ts", "**/node_modules/"]),
  {
    files: ["**/*.{ts,tsx}"],
    // Type-aware rules catch floating promises and unsafe `any` — the bugs that matter in async server code.
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
  },
  { files: ["apps/web/**"], extends: [nextVitals], settings: { next: { rootDir: "apps/web" } } },
  { files: ["*.js"], extends: [tseslint.configs.disableTypeChecked] },
]);
