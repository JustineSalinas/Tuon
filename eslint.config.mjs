import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, minified pdf.js worker — third-party build output, not ours
    // to lint. It has to sit in public/ so the browser can load it from a
    // same-origin URL (see lib/pdf).
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
