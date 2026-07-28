import { describe, it, expect } from "vitest";
import { parseSql } from "../../../src/ast.js";
import { inferExprNotNull } from "../../../src/query/expr-nullability.js";

/** Parse `SELECT <expr> FROM t` and return the target-list expression node. */
async function exprOf(sql: string) {
  const parsed = await parseSql(sql);
  const stmt = parsed.stmts![0]!.stmt as Record<string, unknown>;
  const select = stmt["SelectStmt"] as { targetList?: Node[] };
  const target = select.targetList![0] as Record<string, unknown>;
  const rt = target["ResTarget"] as { val: Node };
  return rt.val;
}

async function notNull(sql: string): Promise<boolean> {
  return inferExprNotNull(await exprOf(sql));
}

describe("inferExprNotNull — literals", () => {
  it("SELECT 'literal' → non-null", async () => {
    expect(await notNull("SELECT 'literal' FROM t")).toBe(true);
  });

  it("SELECT 42 → non-null (integer literal)", async () => {
    expect(await notNull("SELECT 42 FROM t")).toBe(true);
  });

  it("SELECT true → non-null (boolean literal)", async () => {
    expect(await notNull("SELECT true FROM t")).toBe(true);
  });

  it("SELECT NULL → nullable (NULL literal)", async () => {
    expect(await notNull("SELECT NULL FROM t")).toBe(false);
  });

  it("SELECT NULL::text → nullable (cast of NULL)", async () => {
    expect(await notNull("SELECT NULL::text FROM t")).toBe(false);
  });
});

describe("inferExprNotNull — columns and casts", () => {
  it("SELECT col → nullable (conservative)", async () => {
    expect(await notNull("SELECT col FROM t")).toBe(false);
  });

  it("SELECT col::text → nullable (inherits ColumnRef)", async () => {
    expect(await notNull("SELECT col::text FROM t")).toBe(false);
  });

  it("SELECT 'lit'::text → non-null (cast of non-null literal)", async () => {
    expect(await notNull("SELECT 'lit'::text FROM t")).toBe(true);
  });
});

describe("inferExprNotNull — null tests and comparisons", () => {
  it("SELECT col IS NULL → non-null (returns bool)", async () => {
    expect(await notNull("SELECT col IS NULL FROM t")).toBe(true);
  });

  it("SELECT col IS NOT NULL → non-null (returns bool)", async () => {
    expect(await notNull("SELECT col IS NOT NULL FROM t")).toBe(true);
  });

  it("SELECT col + 1 → nullable (math, three-valued)", async () => {
    expect(await notNull("SELECT col + 1 FROM t")).toBe(false);
  });

  it("SELECT col = 5 → nullable (comparison, three-valued)", async () => {
    expect(await notNull("SELECT col = 5 FROM t")).toBe(false);
  });

  it("SELECT col1 = col2 → nullable (comparison)", async () => {
    expect(await notNull("SELECT col1 = col2 FROM t")).toBe(false);
  });
});

describe("inferExprNotNull — coalesce / case", () => {
  it("SELECT COALESCE(col, 'literal') → non-null (literal arg provably non-null)", async () => {
    expect(await notNull("SELECT COALESCE(col, 'literal') FROM t")).toBe(true);
  });

  it("SELECT COALESCE(col, col2) → nullable (both args are ColumnRefs)", async () => {
    expect(await notNull("SELECT COALESCE(col, col2) FROM t")).toBe(false);
  });

  it("SELECT COALESCE(col1, col2, 'lit') → non-null", async () => {
    expect(await notNull("SELECT COALESCE(col1, col2, 'lit') FROM t")).toBe(true);
  });

  it("SELECT CASE WHEN col IS NULL THEN '' ELSE col END → nullable (conservative)", async () => {
    expect(
      await notNull("SELECT CASE WHEN col IS NULL THEN '' ELSE col END FROM t"),
    ).toBe(false);
  });

  it("SELECT CASE WHEN true THEN 'x' END → nullable (conservative even with literal result)", async () => {
    expect(await notNull("SELECT CASE WHEN true THEN 'x' END FROM t")).toBe(false);
  });
});

describe("inferExprNotNull — aggregates and functions", () => {
  it("SELECT count(*) → non-null (count never returns NULL)", async () => {
    expect(await notNull("SELECT count(*) FROM t")).toBe(true);
  });

  it("SELECT count(col) → non-null (count never returns NULL)", async () => {
    expect(await notNull("SELECT count(col) FROM t")).toBe(true);
  });

  it("SELECT max(col) → nullable (NULL over zero rows)", async () => {
    expect(await notNull("SELECT max(col) FROM t")).toBe(false);
  });

  it("SELECT sum(col) → nullable (NULL over zero rows)", async () => {
    expect(await notNull("SELECT sum(col) FROM t")).toBe(false);
  });

  it("SELECT lower(col) → nullable (strict scalar, but args are ColumnRefs)", async () => {
    expect(await notNull("SELECT lower(col) FROM t")).toBe(false);
  });

  it("SELECT lower('lit') → nullable (conservative — no strictness at AST level)", async () => {
    expect(await notNull("SELECT lower('lit') FROM t")).toBe(false);
  });
});

describe("inferExprNotNull — sublinks and booleans", () => {
  it("SELECT EXISTS (SELECT 1 FROM t) → non-null", async () => {
    expect(await notNull("SELECT EXISTS (SELECT 1 FROM t) FROM t")).toBe(true);
  });

  it("SELECT NOT EXISTS (SELECT 1 FROM t) → non-null", async () => {
    expect(
      await notNull("SELECT NOT EXISTS (SELECT 1 FROM t) FROM t"),
    ).toBe(true);
  });

  it("SELECT (SELECT 1 FROM t) → nullable (scalar subquery, conservative)", async () => {
    expect(await notNull("SELECT (SELECT 1 FROM t) FROM t")).toBe(false);
  });

  it("SELECT col1 AND col2 → nullable (AND, three-valued)", async () => {
    expect(await notNull("SELECT col1 AND col2 FROM t")).toBe(false);
  });

  it("SELECT col1 OR col2 → nullable (OR, three-valued)", async () => {
    expect(await notNull("SELECT col1 OR col2 FROM t")).toBe(false);
  });

  it("SELECT NOT (col = 5) → nullable (NOT of nullable predicate)", async () => {
    expect(await notNull("SELECT NOT (col = 5) FROM t")).toBe(false);
  });
});

describe("inferExprNotNull — row / array / minmax", () => {
  it("SELECT row(1, 2) → non-null", async () => {
    expect(await notNull("SELECT row(1, 2) FROM t")).toBe(true);
  });

  it("SELECT ARRAY[1, 2] → non-null", async () => {
    expect(await notNull("SELECT ARRAY[1, 2] FROM t")).toBe(true);
  });

  it("SELECT greatest(col, col2) → nullable (MinMaxExpr, conservative)", async () => {
    expect(await notNull("SELECT greatest(col, col2) FROM t")).toBe(false);
  });
});

describe("inferExprNotNull — misc / unknown", () => {
  it("SELECT col COLLATE \"C\" → nullable (inherits ColumnRef)", async () => {
    expect(await notNull('SELECT col COLLATE "C" FROM t')).toBe(false);
  });

  it("SELECT 'lit' COLLATE \"C\" → non-null (collate preserves non-null literal)", async () => {
    expect(await notNull('SELECT \'lit\' COLLATE "C" FROM t')).toBe(true);
  });

  it("unrecognized expression node → nullable (conservative)", async () => {
    // A_Indirection (col[1]) — not explicitly handled → false.
    const parsed = await parseSql("SELECT col[1] FROM t");
    const stmt = parsed.stmts![0]!.stmt as Record<string, unknown>;
    const select = stmt["SelectStmt"] as { targetList?: Node[] };
    const target = select.targetList![0] as Record<string, unknown>;
    const val = (target["ResTarget"] as { val: Node }).val;
    expect(inferExprNotNull(val)).toBe(false);
  });
});
