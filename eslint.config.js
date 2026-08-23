// ---------------------------------------------------------------------------
// ESLint, added 2026-08-24 — the script existed in package.json from the start
// and had NEVER RUN: there was no config file anywhere in the package or the
// workspace, so `pnpm run lint` failed for everyone with the v9 migration
// notice. Nothing here had ever been linted.
//
// The config is deliberately small, and the smallness is a measurement rather
// than modesty. `tsconfig.json` already runs `strict`, `noUnusedLocals`,
// `noUnusedParameters`, `noFallthroughCasesInSwitch` and
// `noUncheckedIndexedAccess`, so the whole stylistic and unused-symbol layer
// of a stock config is redundant here. What tsc CANNOT do is the type-aware
// promise analysis, and that is what this adds.
//
// Measured on the first run over 26k lines: **11 problems, of which 2 were
// real defects** — `catalog-census.test.ts` and `node-census.test.ts` both
// called the walk without awaiting it, so their `try/catch` could not fire
// (an async rejection never reaches a synchronous catch) and the recording
// happened in a microtask the loop did not wait for. Both censuses measured
// correctly only because the next iteration's `await parseSql` flushed the
// queue. That is the class of bug this config exists for.
//
// `require-await` was tried and REMOVED: 3 hits, all three legitimate — an
// interface method returning `Promise<never>`, a stub `Evaluate` callback
// that must be async by signature, and a vitest test callback. A rule with
// three false positives and no true ones is noise, and noise is how a lint
// step gets ignored.
// ---------------------------------------------------------------------------
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // The three that found something. A floating promise in this codebase
      // is not a style question: the walk is async at its entry points and
      // the harnesses drive it in loops, which is exactly where an unawaited
      // call reads as working and measures something else.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
    },
  },
  {
    // A library does not print. `logger.ts` is the one place that may, which
    // is the whole reason it exists.
    files: ["src/**/*.ts"],
    ignores: ["src/logger.ts"],
    rules: { "no-console": "error" },
  },
);
