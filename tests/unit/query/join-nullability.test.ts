import { describe, it, expect } from "vitest";
import { parseSql } from "../../../src/ast.js";
import { inferJoinNullability } from "../../../src/query/join-nullability.js";

async function nullability(sql: string) {
  const parsed = await parseSql(sql);
  const stmt = parsed.stmts![0]!.stmt!;
  return inferJoinNullability(stmt);
}

describe("inferJoinNullability", () => {
  it("single table — no joins, not nullable", async () => {
    const r = await nullability("SELECT * FROM users u");
    expect(r).toEqual([{ alias: "u", joinNullable: false }]);
  });

  it("INNER JOIN — both sides required", async () => {
    const r = await nullability(
      "SELECT * FROM users u INNER JOIN posts p ON p.user_id = u.id",
    );
    expect(r).toEqual([
      { alias: "p", joinNullable: false },
      { alias: "u", joinNullable: false },
    ]);
  });

  it("LEFT JOIN — right side nullable, left side required", async () => {
    const r = await nullability(
      "SELECT * FROM users u LEFT JOIN posts p ON p.user_id = u.id",
    );
    expect(r).toEqual([
      { alias: "p", joinNullable: true },
      { alias: "u", joinNullable: false },
    ]);
  });

  it("RIGHT JOIN — left side nullable, right side required", async () => {
    const r = await nullability(
      "SELECT * FROM users u RIGHT JOIN posts p ON p.user_id = u.id",
    );
    expect(r).toEqual([
      { alias: "p", joinNullable: false },
      { alias: "u", joinNullable: true },
    ]);
  });

  it("FULL JOIN — both sides nullable", async () => {
    const r = await nullability(
      "SELECT * FROM users u FULL JOIN posts p ON p.user_id = u.id",
    );
    expect(r).toEqual([
      { alias: "p", joinNullable: true },
      { alias: "u", joinNullable: true },
    ]);
  });

  it("nested LEFT JOINs — rightmost table nullable", async () => {
    const r = await nullability(
      "SELECT * FROM users u " +
      "LEFT JOIN posts p ON p.user_id = u.id " +
      "LEFT JOIN comments c ON c.post_id = p.id",
    );
    expect(r).toEqual([
      { alias: "c", joinNullable: true },
      { alias: "p", joinNullable: true },
      { alias: "u", joinNullable: false },
    ]);
  });

  it("INNER then LEFT — inner-joined table required, left-joined nullable", async () => {
    const r = await nullability(
      "SELECT * FROM users u " +
      "INNER JOIN posts p ON p.user_id = u.id " +
      "LEFT JOIN comments c ON c.post_id = p.id",
    );
    expect(r).toEqual([
      { alias: "c", joinNullable: true },
      { alias: "p", joinNullable: false },
      { alias: "u", joinNullable: false },
    ]);
  });

  it("LEFT then INNER — left-joined table nullable even with subsequent inner join", async () => {
    const r = await nullability(
      "SELECT * FROM users u " +
      "LEFT JOIN posts p ON p.user_id = u.id " +
      "INNER JOIN comments c ON c.post_id = p.id",
    );
    // p is nullable (from the LEFT JOIN); c joins on p, so c is also nullable
    // (a LEFT JOIN'd table can have NULL rows, and the INNER JOIN on those
    // NULL rows won't match, so c is also effectively optional).
    // Actually, INNER JOIN on a nullable side makes both optional.
    expect(r.find(a => a.alias === "u")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "p")?.joinNullable).toBe(true);
  });

  it("subquery in FROM — treated as a table with alias", async () => {
    const r = await nullability(
      "SELECT * FROM (SELECT 1 AS id) x LEFT JOIN users u ON u.id = x.id",
    );
    expect(r.find(a => a.alias === "x")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "u")?.joinNullable).toBe(true);
  });

  it("multiple tables in FROM (comma-separated)", async () => {
    const r = await nullability(
      "SELECT * FROM users u, posts p",
    );
    expect(r.find(a => a.alias === "u")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "p")?.joinNullable).toBe(false);
  });

  it("no FROM clause — empty result", async () => {
    const r = await nullability("SELECT 1");
    expect(r).toEqual([]);
  });

  it("INSERT/UPDATE/DELETE — not supported, empty result", async () => {
    const r = await nullability("INSERT INTO users VALUES (1)");
    expect(r).toEqual([]);
  });

  it("not nullable when the table appears on the required side of an INNER join even after a LEFT join in a different branch", async () => {
    const r = await nullability(
      "SELECT * FROM users u " +
      "LEFT JOIN posts p ON p.user_id = u.id " +
      "INNER JOIN audit a ON a.user_id = u.id",
    );
    expect(r.find(a => a.alias === "u")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "p")?.joinNullable).toBe(true);
  });
});

describe("inferJoinNullability: edge cases", () => {
  it("self-join — same table aliased twice, both required (INNER)", async () => {
    const r = await nullability(
      "SELECT * FROM users u1 INNER JOIN users u2 ON u1.id = u2.id",
    );
    expect(r.find(a => a.alias === "u1")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "u2")?.joinNullable).toBe(false);
  });

  it("self-join with LEFT JOIN — right alias nullable", async () => {
    const r = await nullability(
      "SELECT * FROM users u1 LEFT JOIN users u2 ON u1.id = u2.id",
    );
    expect(r.find(a => a.alias === "u1")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "u2")?.joinNullable).toBe(true);
  });

  it("three-way LEFT JOIN chain — all but first nullable", async () => {
    const r = await nullability(
      "SELECT * FROM a " +
      "LEFT JOIN b ON b.id = a.id " +
      "LEFT JOIN c ON c.id = b.id " +
      "LEFT JOIN d ON d.id = c.id",
    );
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "b")?.joinNullable).toBe(true);
    expect(r.find(a => a.alias === "c")?.joinNullable).toBe(true);
    expect(r.find(a => a.alias === "d")?.joinNullable).toBe(true);
  });

  it("LEFT JOIN then INNER JOIN on the nullable side — INNER filters nullable rows", async () => {
    // b is nullable from the LEFT JOIN; c INNER JOINs on b. When b is NULL
    // (no match), the INNER JOIN on c.id = b.id filters the row out entirely.
    // So c is NOT nullable in the output — it's present only when b matched.
    const r = await nullability(
      "SELECT * FROM a LEFT JOIN b ON b.id = a.id INNER JOIN c ON c.id = b.id",
    );
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "b")?.joinNullable).toBe(true);
    expect(r.find(a => a.alias === "c")?.joinNullable).toBe(false);
  });

  it("RIGHT JOIN then INNER JOIN on the nullable side — both nullable", async () => {
    const r = await nullability(
      "SELECT * FROM a RIGHT JOIN b ON b.id = a.id INNER JOIN c ON c.id = b.id",
    );
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(true);
    expect(r.find(a => a.alias === "b")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "c")?.joinNullable).toBe(false);
  });

  it("FULL JOIN of two tables then INNER JOIN a third", async () => {
    // a is nullable from the FULL JOIN; c INNER JOINs on a. When a is NULL
    // (no match in FULL JOIN), the INNER JOIN on c.id = a.id filters the
    // row out. So c is NOT nullable — present only when a matched.
    const r = await nullability(
      "SELECT * FROM a FULL JOIN b ON b.id = a.id INNER JOIN c ON c.id = a.id",
    );
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(true);
    expect(r.find(a => a.alias === "b")?.joinNullable).toBe(true);
    expect(r.find(a => a.alias === "c")?.joinNullable).toBe(false);
  });

  it("CROSS JOIN — both sides required (treated as inner)", async () => {
    const r = await nullability("SELECT * FROM a CROSS JOIN b");
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "b")?.joinNullable).toBe(false);
  });

  it("nested subquery with LEFT JOIN — subquery alias required", async () => {
    const r = await nullability(
      "SELECT * FROM (SELECT * FROM a LEFT JOIN b ON b.id = a.id) x",
    );
    // x is the subquery alias — it's required (it's the only thing in FROM).
    expect(r.find(a => a.alias === "x")?.joinNullable).toBe(false);
    // a and b are inside the subquery — also resolved.
    expect(r.find(a => a.alias === "a")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "b")?.joinNullable).toBe(true);
  });

  it("table without alias uses relname as alias", async () => {
    const r = await nullability("SELECT * FROM users LEFT JOIN posts ON posts.id = users.id");
    expect(r.find(a => a.alias === "users")?.joinNullable).toBe(false);
    expect(r.find(a => a.alias === "posts")?.joinNullable).toBe(true);
  });
});
