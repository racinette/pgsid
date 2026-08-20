import { deparseSync } from "pgsql-deparser";
import type { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog, TypeSetAudit } from "../../../src/query/types.js";

/**
 * Shared machinery for the type-union suite (type-unions.test.ts).
 *
 * The engine side reads `WalkOptions.typeSetAudit`, so what is asserted is
 * what the walk really used, at the nesting level it really used it —
 * not a re-derivation that could drift from the walk's own reading.
 *
 * The PostgreSQL side reads the RowDescription of a ZERO-ROW query. A
 * `WHERE false` statement still reports the resolved type of every output
 * column, so the oracle costs one round trip and touches no data. That is
 * what makes an exhaustive sweep affordable.
 */

/** One expression the walk typed, keyed by its deparsed SQL. */
export interface Reading {
  /** Every set read for this expression text, in walk order. A single
   *  expression can be read more than once — see the consistency test. */
  sets: (string[] | null)[];
}

/** Deparse one expression node back to SQL. */
export function exprSql(expr: unknown): string | null {
  try {
    return deparseSync({
      SelectStmt: {
        targetList: [{ ResTarget: { val: expr as never } }],
        op: "SETOP_NONE",
      },
    } as never)
      .replace(/^SELECT\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return null;
  }
}

/** Every type set the walk reads while analysing `sql`, keyed by expression. */
export async function readingsFor(
  sql: string,
  catalog: NullabilityCatalog,
): Promise<Map<string, Reading>> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const audit: TypeSetAudit[] = [];
  await inferNullability(stmt, catalog, { typeSetAudit: audit });
  const out = new Map<string, Reading>();
  for (const rec of audit) {
    const key = exprSql(rec.expr);
    if (key === null) continue;
    const existing = out.get(key);
    if (existing) existing.sets.push(rec.set);
    else out.set(key, { sets: [rec.set] });
  }
  return out;
}

/**
 * How a value of `typeName` is REPORTED on the wire — domains followed to
 * their base, aliases canonicalized. PostgreSQL's RowDescription smashes
 * domains (a `pos` column over `integer` reports `integer`, measured), so a
 * union member naming a domain and an oracle answer naming its base are the
 * same claim and must compare equal.
 *
 * Returns null for a name PostgreSQL does not know, and "*" for a
 * PSEUDO-type: `anycompatiblearray` in a union means the polymorphic
 * parameter was never resolved, which contains every concrete type it could
 * stand for. Sound to accept, so containment does — and the census counts
 * them separately, because accepting them is exactly where precision hides.
 */
export async function wireRendering(pg: PGlite, typeName: string): Promise<string | null> {
  const bare = typeName.endsWith("[]") ? typeName.slice(0, -2) : typeName;
  const suffix = typeName.endsWith("[]") ? "[]" : "";
  let name = bare;
  for (let hop = 0; hop < 8; hop++) {
    let row;
    try {
      row = (
        await pg.query<{ typtype: string; base: string | null; rendered: string }>(
          `SELECT t.typtype,
                  CASE WHEN t.typbasetype <> 0 THEN format_type(t.typbasetype, null) END AS base,
                  format_type(t.oid, null) AS rendered
             FROM pg_type t WHERE t.oid = to_regtype($1)`,
          [name],
        )
      ).rows[0];
    } catch {
      return null;
    }
    if (!row) return null;
    if (row.typtype === "p") return "*";
    if (row.typtype === "d" && row.base) {
      name = row.base;
      continue;
    }
    return row.rendered + suffix;
  }
  return null;
}

/** Does the walk's union CONTAIN what PostgreSQL resolved? The governing
 *  invariant: a union is "what this could be", so the real answer must be a
 *  member. A pseudo-type member stands for anything and satisfies it. */
export async function unionContains(
  pg: PGlite,
  set: readonly string[],
  oracle: string,
): Promise<boolean> {
  const target = await wireRendering(pg, oracle);
  for (const member of set) {
    const rendered = await wireRendering(pg, member);
    if (rendered === "*" || (rendered !== null && rendered === target)) return true;
  }
  return false;
}

/**
 * What PostgreSQL resolves `expr` to, in the scope of `sql` — the probe is
 * spliced into the statement's own target list, so aliases, joins and the
 * WHERE clause all resolve exactly as they do for the real query. Null when
 * PostgreSQL rejects the probe, which happens for expressions belonging to
 * an INNER scope (a CTE's interior) and for positions a probe column may not
 * occupy (a non-grouped column under GROUP BY). Those are reported by the
 * census rather than silently skipped.
 */
export async function oracleType(
  pg: PGlite,
  sql: string,
  expr: string,
): Promise<string | null> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const sel = (stmt as Record<string, unknown>)["SelectStmt"] as
    | { targetList?: unknown[]; whereClause?: unknown }
    | undefined;
  if (!sel?.targetList) return null;
  let probed: string;
  try {
    const probeExpr = (await parseSql(`SELECT ${expr}`)).stmts![0]!.stmt!;
    const probeTarget = (probeExpr as Record<string, unknown>)["SelectStmt"] as {
      targetList?: unknown[];
    };
    probed = deparseSync({
      ...(stmt as object),
      SelectStmt: {
        ...sel,
        targetList: [...sel.targetList, ...(probeTarget.targetList ?? [])],
      },
    } as never);
  } catch {
    return null;
  }
  try {
    const r = await pg.query(`SELECT * FROM (${probed}) AS __probe WHERE false`);
    const fields = r.fields as { dataTypeID: number }[];
    const oid = fields[fields.length - 1]?.dataTypeID;
    if (oid === undefined) return null;
    const nm = await pg.query<{ t: string }>(`SELECT format_type($1::oid, null) AS t`, [
      String(oid),
    ]);
    return nm.rows[0]?.t ?? null;
  } catch {
    return null;
  }
}
