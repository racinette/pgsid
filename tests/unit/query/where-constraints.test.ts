import { describe, it, expect } from "vitest";
import { parseSql } from "../../../src/ast.js";
import { inferJoinNullability } from "../../../src/query/join-nullability.js";
import { applyWhereConstraints } from "../../../src/query/where-constraints.js";
import type { AliasNullability } from "../../../src/query/types.js";

async function constraints(sql: string, joinNullability?: AliasNullability[]) {
  const parsed = await parseSql(sql);
  const stmt = parsed.stmts![0]!.stmt!;
  const jn = joinNullability ?? inferJoinNullability(stmt);
  return applyWhereConstraints(stmt, jn);
}

describe("applyWhereConstraints — basic detection", () => {
  it("WHERE col IS NOT NULL → col guaranteed", async () => {
    const r = await constraints("SELECT a FROM t WHERE a IS NOT NULL");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("WHERE col = 5 → col guaranteed (comparison)", async () => {
    const r = await constraints("SELECT a FROM t WHERE a = 5");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
  });

  it("WHERE col > 0 → col guaranteed", async () => {
    const r = await constraints("SELECT a FROM t WHERE a > 0");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
  });

  it("WHERE 5 = col → col guaranteed (column on right side)", async () => {
    const r = await constraints("SELECT a FROM t WHERE 5 = a");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
  });

  it("WHERE col IN (1,2,3) → col guaranteed (AEXPR_IN)", async () => {
    const r = await constraints("SELECT a FROM t WHERE a IN (1,2,3)");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
  });

  it("WHERE col = ANY(ARRAY[1,2]) → col guaranteed (AEXPR_OP_ANY)", async () => {
    const r = await constraints("SELECT a FROM t WHERE a = ANY(ARRAY[1,2])");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
  });

  it("WHERE col LIKE 'x%' → col guaranteed", async () => {
    const r = await constraints("SELECT a FROM t WHERE a LIKE 'x%'");
    expect(r.guaranteedNonNull).toEqual(new Set(["a"]));
  });

  it("WHERE col IS NULL → NOT guaranteed (implies the opposite)", async () => {
    const r = await constraints("SELECT a FROM t WHERE a IS NULL");
    expect(r.guaranteedNonNull).toEqual(new Set());
  });
});

describe("applyWhereConstraints — boolean structure", () => {
  it("WHERE col1 IS NOT NULL AND col2 > 0 → both guaranteed", async () => {
    const r = await constraints(
      "SELECT a FROM t WHERE col1 IS NOT NULL AND col2 > 0",
    );
    expect(r.guaranteedNonNull).toEqual(new Set(["col1", "col2"]));
  });

  it("WHERE col IS NOT NULL OR other IS NOT NULL → nothing guaranteed (OR)", async () => {
    const r = await constraints(
      "SELECT a FROM t WHERE col IS NOT NULL OR other IS NOT NULL",
    );
    expect(r.guaranteedNonNull).toEqual(new Set());
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("WHERE col1 = 5 AND (col2 = 6 OR col3 = 7) → only col1 guaranteed (OR skipped)", async () => {
    const r = await constraints(
      "SELECT a FROM t WHERE col1 = 5 AND (col2 = 6 OR col3 = 7)",
    );
    expect(r.guaranteedNonNull).toEqual(new Set(["col1"]));
  });

  it("WHERE NOT (a = 5) → nothing guaranteed (NOT skipped)", async () => {
    const r = await constraints("SELECT a FROM t WHERE NOT (a = 5)");
    expect(r.guaranteedNonNull).toEqual(new Set());
  });

  it("nested AND of ANDs — all conjuncts apply", async () => {
    const r = await constraints(
      "SELECT a FROM t WHERE a IS NOT NULL AND (b = 1 AND c > 2)",
    );
    expect(r.guaranteedNonNull).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("applyWhereConstraints — strict function (deferred)", () => {
  it("WHERE func(col) = x → NOT detected (strict fn detection deferred)", async () => {
    const r = await constraints("SELECT a FROM t WHERE lower(a) = 'x'");
    // The leaf A_Expr(=) has lexpr = FuncCall (not a ColumnRef) and
    // rexpr = A_Const — so no direct ColumnRef operand is detected.
    expect(r.guaranteedNonNull).toEqual(new Set());
  });

  it("WHERE col + 1 = 5 → col NOT detected (math nesting)", async () => {
    const r = await constraints("SELECT a FROM t WHERE a + 1 = 5");
    // lexpr of the outer (=) is A_Expr(+), not a ColumnRef.
    expect(r.guaranteedNonNull).toEqual(new Set());
  });
});

describe("applyWhereConstraints — alias promotion", () => {
  it("LEFT JOIN ... WHERE t.col IS NOT NULL → t promoted to required", async () => {
    const r = await constraints(
      "SELECT a FROM t1 LEFT JOIN t2 ON t2.id = t1.id WHERE t2.col IS NOT NULL",
    );
    // joinNullability: t2 is optional (joinNullable: true).
    expect(r.promotedAliases).toEqual(new Set(["t2"]));
    expect(r.guaranteedNonNull).toEqual(new Set(["t2.col"]));
  });

  it("LEFT JOIN ... WHERE t.col = 5 → t promoted (comparison promotes too)", async () => {
    const r = await constraints(
      "SELECT a FROM t1 LEFT JOIN t2 ON t2.id = t1.id WHERE t2.col = 5",
    );
    expect(r.promotedAliases).toEqual(new Set(["t2"]));
    expect(r.guaranteedNonNull).toEqual(new Set(["t2.col"]));
  });

  it("LEFT JOIN ... WHERE t.col IS NULL → t NOT promoted (IS NULL)", async () => {
    const r = await constraints(
      "SELECT a FROM t1 LEFT JOIN t2 ON t2.id = t1.id WHERE t2.col IS NULL",
    );
    expect(r.promotedAliases).toEqual(new Set());
    expect(r.guaranteedNonNull).toEqual(new Set());
  });

  it("LEFT JOIN ... WHERE t2.col IS NOT NULL OR t2.other IS NOT NULL → NOT promoted (OR)", async () => {
    const r = await constraints(
      "SELECT a FROM t1 LEFT JOIN t2 ON t2.id = t1.id " +
      "WHERE t2.col IS NOT NULL OR t2.other IS NOT NULL",
    );
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("required-side alias guaranteed but not promoted", async () => {
    // t1 is required (left side of LEFT JOIN). WHERE t1.col IS NOT NULL
    // guarantees t1.col but does NOT promote t1 (it's already required).
    const r = await constraints(
      "SELECT a FROM t1 LEFT JOIN t2 ON t2.id = t1.id WHERE t1.col IS NOT NULL",
    );
    expect(r.guaranteedNonNull).toEqual(new Set(["t1.col"]));
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("promotion via explicit joinNullability input", async () => {
    // Even without a real LEFT JOIN in the query, passing joinNullability
    // with an optional alias drives promotion.
    const parsed = await parseSql("SELECT a FROM t WHERE t.col IS NOT NULL");
    const stmt = parsed.stmts![0]!.stmt!;
    const r = applyWhereConstraints(stmt, [
      { alias: "t", joinNullable: true },
    ]);
    expect(r.promotedAliases).toEqual(new Set(["t"]));
    expect(r.guaranteedNonNull).toEqual(new Set(["t.col"]));
  });
});

describe("applyWhereConstraints — edge cases", () => {
  it("no WHERE clause → empty result", async () => {
    const r = await constraints("SELECT a FROM t");
    expect(r.guaranteedNonNull).toEqual(new Set());
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("non-SELECT statement → empty result", async () => {
    const parsed = await parseSql("INSERT INTO t VALUES (1)");
    const stmt = parsed.stmts![0]!.stmt!;
    const r = applyWhereConstraints(stmt, []);
    expect(r.guaranteedNonNull).toEqual(new Set());
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("qualified ref to required alias is guaranteed but not promoted", async () => {
    const r = await constraints(
      "SELECT a FROM t1 INNER JOIN t2 ON t2.id = t1.id WHERE t2.col IS NOT NULL",
    );
    expect(r.guaranteedNonNull).toEqual(new Set(["t2.col"]));
    expect(r.promotedAliases).toEqual(new Set());
  });

  it("WHERE col = other_col (both columns) → both guaranteed", async () => {
    const r = await constraints("SELECT a FROM t WHERE a = b");
    expect(r.guaranteedNonNull).toEqual(new Set(["a", "b"]));
  });

  it("WHERE * → A_Star not treated as a column", async () => {
    // SELECT * is in the target list, not WHERE; this just confirms a WHERE
    // with no column refs yields nothing.
    const r = await constraints("SELECT 1 FROM t WHERE 1 = 1");
    expect(r.guaranteedNonNull).toEqual(new Set());
  });
});
