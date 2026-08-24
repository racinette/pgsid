import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { builtinModules } from "node:module";

// ---------------------------------------------------------------------------
// The package manifest, censused against what `src/` actually imports.
//
// Found 2026-08-24: `pgsql-deparser` was a devDependency, and three modules
// under `src/` imported it at RUNTIME — `subtree-evaluator.ts`,
// `srf-cardinality.ts`, `type-delegation.ts`. Anyone installing this package
// and calling the engine would have got a missing module.
//
// It survived for the same reason everything else at that boundary survives:
// nothing consumes `src/`. `tsup` builds `src/index.ts`, which does not exist;
// `pnpm dev` runs it too. Every suite here runs from the repo, where the dev
// tree is installed and a devDependency resolves exactly like a dependency, so
// no test could tell the difference — which is what makes this a MANIFEST
// question rather than a behaviour one, and why it belongs in a census rather
// than in a fixture.
//
// Both directions are asserted. A missing runtime dependency breaks the
// consumer; a declared one nothing imports is a promise the package does not
// keep, and this repo has five of those.
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..", "..");

interface Manifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as Manifest;
const dependencies = manifest.dependencies ?? {};
const devDependencies = manifest.devDependencies ?? {};

/**
 * Runtime dependencies `src/` does not import, each with the reason it is
 * declared anyway. Every entry here is a promise the package makes and does
 * not use; listing them is what keeps the second assertion below a live check
 * rather than a permanent failure.
 *
 * All five were measured unimported across `src/` AND `tests/` on 2026-08-24 —
 * they are the remains of a language-server and file-watcher surface that was
 * never built. Nothing decides whether they stay; they are recorded so that
 * decision is visible rather than implied.
 */
const DECLARED_BUT_UNIMPORTED: Record<string, string> = {
  chokidar: "file watching for a language server that was never built",
  "fast-glob": "same, unused",
  picomatch: "same, unused",
  "vscode-languageserver": "same, unused",
  "vscode-languageserver-textdocument": "same, unused",
  "@electric-sql/pglite-plpgsql-check":
    "a PGlite extension the TEST harnesses load by name; `src/` never imports it, and it must ship with the runtime that does",
};

const BUILTINS = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);

/** Every `.ts` file under `src/`, recursively. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/**
 * The bare module specifiers a file imports, reduced to package names —
 * `node:fs` and `fs` drop out as builtins, `@scope/pkg/sub` reduces to
 * `@scope/pkg`, and a relative path is not a package at all.
 *
 * TYPE-ONLY imports count. `import type { PGlite }` erases at build time, but
 * the declaration file `tsup` emits still references the package, so a
 * consumer type-checking against this package needs it resolvable.
 */
function importedPackages(file: string): string[] {
  const out: string[] = [];
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    // Line-anchored on purpose. A bare `from "…"` search matches PROSE — this
    // codebase writes "distinct from 'lit'" and "optional because of a deeper
    // one" inside doc comments, and the first draft of this census reported
    // four of those as undeclared packages.
    const isImportLine =
      /^import\b/.test(line) || /^export\b/.test(line) || /^\}\s*from\b/.test(line);
    if (!isImportLine) continue;
    const m = /(?:^|\bfrom\s*)["']([^"']+)["']\s*;?$/.exec(line);
    const spec = m?.[1];
    if (spec === undefined) continue;
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    if (BUILTINS.has(spec)) continue;
    const parts = spec.split("/");
    out.push(spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!);
  }
  return out;
}

describe("runtime dependencies", () => {
  const bySource = new Map<string, string[]>();
  for (const file of sources(join(ROOT, "src"))) {
    for (const pkg of importedPackages(file)) {
      bySource.set(pkg, [...(bySource.get(pkg) ?? []), file.slice(ROOT.length + 1)]);
    }
  }

  it("everything `src/` imports is a runtime dependency", () => {
    const misplaced = [...bySource.entries()]
      .filter(([pkg]) => !dependencies[pkg])
      .map(([pkg, files]) =>
        `${pkg} (${devDependencies[pkg] ? "devDependency" : "undeclared"}) — imported by ${files.join(", ")}`,
      )
      .sort();
    expect(
      misplaced,
      `Imported by \`src/\` and not a runtime dependency. A consumer that ` +
        `installs this package gets a missing module; every suite here passes ` +
        `regardless, because the dev tree resolves both alike:\n  ` +
        misplaced.join("\n  "),
    ).toEqual([]);
  });

  it("every runtime dependency is imported, or recorded as not", () => {
    const unused = Object.keys(dependencies)
      .filter(pkg => !bySource.has(pkg) && !DECLARED_BUT_UNIMPORTED[pkg])
      .sort();
    expect(
      unused,
      `Declared as a runtime dependency and imported nowhere under \`src/\`. ` +
        `Drop it, or add it to DECLARED_BUT_UNIMPORTED with the reason it ` +
        `stays:\n  ${unused.join(", ")}`,
    ).toEqual([]);
  });

  it("the recorded exemptions are still unimported", () => {
    // The converse, and the one that rots: an exemption whose package HAS
    // acquired an import reads as an open question that is already answered.
    const nowUsed = Object.keys(DECLARED_BUT_UNIMPORTED)
      .filter(pkg => bySource.has(pkg))
      .sort();
    expect(
      nowUsed,
      `On DECLARED_BUT_UNIMPORTED, and \`src/\` imports it now — drop the ` +
        `exemption:\n  ${nowUsed.join(", ")}`,
    ).toEqual([]);
  });

  it("`pgsql-deparser` in particular, since three modules need it", () => {
    // The finding this census was written for, pinned by name so a revert is
    // a named failure rather than a count.
    expect(bySource.get("pgsql-deparser")?.sort()).toEqual([
      "src/query/srf-cardinality.ts",
      "src/query/subtree-evaluator.ts",
      "src/query/type-delegation.ts",
    ]);
    expect(dependencies["pgsql-deparser"]).toBeDefined();
    expect(devDependencies["pgsql-deparser"]).toBeUndefined();
  });
});
