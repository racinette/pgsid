/**
 * The purpose-built corpus for the type-union suite. The fixture corpus was
 * measured first and could not serve: it produced 994 readings of which 751
 * were "no claim" and exactly 3 were multi-member, so a suite sampling it
 * would assert almost nothing about unions. These cases exist to make the
 * union machinery WORK — many-overload names, mixed numeric operands, and
 * nesting deep enough that an inner union types an outer call.
 *
 * `probe` strings are DEPARSER output, not source text: the audit is keyed
 * by the walk's own rendering, so `x::integer` appears as `x::int` and
 * `greatest(…)` as `GREATEST(…)`. A probe that matches nothing fails loudly
 * rather than passing vacuously.
 */
export const UNION_SCHEMA = `
CREATE TABLE m (
  i integer NOT NULL, j integer NOT NULL, b bigint NOT NULL,
  n numeric NOT NULL, f double precision NOT NULL, r real NOT NULL,
  t text NOT NULL, v varchar(20) NOT NULL,
  d date NOT NULL, ts timestamptz NOT NULL, iv interval NOT NULL,
  arr text[] NOT NULL, jb jsonb NOT NULL
);
CREATE DOMAIN pos AS integer NOT NULL;
CREATE TYPE mood AS ENUM ('lo', 'hi');
CREATE TABLE dm (p pos NOT NULL, e mood NOT NULL);
`;

export interface UnionCase {
  /** The statement the walk analyses. */
  sql: string;
  /** Deparsed expression → the set the walk must read for it. `null` means
   *  the walk makes no claim; an array is asserted EXACTLY, so a change in
   *  precision — in either direction — shows up here as a diff. */
  expect: Record<string, string[] | null>;
}

export const UNION_CASES: Record<string, UnionCase[]> = {
  // Same-type operands resolve to one candidate and the union is a
  // singleton. These are the control: nothing here should ever widen.
  "arithmetic, same type": [
    { sql: "SELECT abs(m.i + m.j) AS v FROM m", expect: { "m.i + m.j": ["integer"], "m.i": ["integer"] } },
    { sql: "SELECT abs(m.i + m.b) AS v FROM m", expect: { "m.i + m.b": ["bigint"] } },
    { sql: "SELECT abs(m.f + m.i) AS v FROM m", expect: { "m.f + m.i": ["double precision"] } },
    { sql: "SELECT abs(m.i + 1) AS v FROM m", expect: { "m.i + 1": ["integer"] } },
    { sql: "SELECT abs(m.n + 1.5) AS v FROM m", expect: { "m.n + 1.5": ["numeric"] } },
  ],

  // MIXED numeric operands are where the union earns its name. PostgreSQL
  // picks exactly one; the walk keeps every candidate an implicit coercion
  // could reach, because it does not implement the preferred-type tiebreak
  // (docs/type-aware-overloads.md declares that a non-goal). Sound, wide,
  // and the width is the thing to watch.
  "arithmetic, mixed operands — the union is real": [
    { sql: "SELECT abs(m.i + m.n) AS v FROM m", expect: { "m.i + m.n": ["double precision", "numeric", "real"] } },
    { sql: "SELECT abs(m.r + m.n) AS v FROM m", expect: { "m.r + m.n": ["double precision", "real"] } },
    { sql: "SELECT abs(m.n * 2) AS v FROM m", expect: { "m.n * 2": ["double precision", "numeric", "real"] } },
  ],

  // A DOMAIN operand is not smashed to its base before elimination, so every
  // numeric `+` survives — five candidates for an expression PostgreSQL calls
  // `integer`. The widest union the corpus produces, and the clearest single
  // precision target.
  "domains and enums": [
    { sql: "SELECT abs(dm.p + 1) AS v FROM dm", expect: { "dm.p": ["public.pos"], "dm.p + 1": ["bigint", "double precision", "integer", "numeric", "real"] } },
    { sql: "SELECT length(dm.e::text) AS v FROM dm", expect: { "dm.e": ["public.mood"], "dm.e::text": ["text"] } },
  ],

  "concatenation": [
    { sql: "SELECT length(m.t || m.t) AS v FROM m", expect: { "m.t || m.t": ["text"] } },
    { sql: "SELECT length(m.t || m.i) AS v FROM m", expect: { "m.t || m.i": ["text"] } },
    // A varchar operand does not eliminate the ARRAY concatenation overload,
    // so a polymorphic member rides along beside the right answer.
    { sql: "SELECT length(m.t || m.v) AS v FROM m", expect: { "m.t || m.v": ["anycompatiblearray", "text"] } },
    { sql: "SELECT length(m.t || 'x') AS v FROM m", expect: { "m.t || 'x'": ["anycompatiblearray", "text"] } },
    { sql: "SELECT array_length(m.arr || m.arr, 1) AS v FROM m", expect: { "m.arr || m.arr": ["anycompatiblearray"] } },
    // BOTH operands unknown: nothing types it, and the walk says so rather
    // than guessing `text`. The subtree evaluator folds this one instead.
    { sql: "SELECT length('a' || 'b') AS v FROM m", expect: { "'a' || 'b'": null } },
  ],

  "function calls with overloads": [
    { sql: "SELECT abs(abs(m.i)) AS v FROM m", expect: { "abs(m.i)": ["integer"] } },
    { sql: "SELECT abs(abs(m.n)) AS v FROM m", expect: { "abs(m.n)": ["numeric"] } },
    { sql: "SELECT abs(round(m.n)) AS v FROM m", expect: { "round(m.n)": ["numeric"] } },
    { sql: "SELECT abs(round(m.n, 2)) AS v FROM m", expect: { "round(m.n, 2)": ["numeric"] } },
    { sql: "SELECT abs(round(m.f)) AS v FROM m", expect: { "round(m.f)": ["double precision"] } },
    { sql: "SELECT abs(length(m.t)) AS v FROM m", expect: { "length(m.t)": ["integer"] } },
    { sql: "SELECT length(substr(m.t, 1, 3)) AS v FROM m", expect: { "substr(m.t, 1, 3)": ["text"] } },
    { sql: "SELECT abs(date_part('day', m.ts)) AS v FROM m", expect: { "date_part('day', m.ts)": ["double precision"] } },
    { sql: "SELECT length(to_char(m.ts, 'YYYY')) AS v FROM m", expect: { "to_char(m.ts, 'YYYY')": ["text"] } },
  ],

  // The point of the suite: an inner union must type an outer call. Every
  // level is asserted, so a regression names the level it happened at.
  "nesting, depth 2-3": [
    {
      sql: "SELECT abs(abs(m.i + m.j) + m.i) AS v FROM m",
      expect: {
        "m.i + m.j": ["integer"],
        "abs(m.i + m.j)": ["integer"],
        "abs(m.i + m.j) + m.i": ["integer"],
      },
    },
    {
      sql: "SELECT abs(round(m.n * 2, 1)) AS v FROM m",
      // The inner multiplication is 3-wide, and `round(numeric, integer)`
      // narrows it back to one on the way out — the union doing its job.
      expect: { "m.n * 2": ["double precision", "numeric", "real"], "round(m.n * 2, 1)": ["numeric"] },
    },
    {
      sql: "SELECT length(substr(m.t, 1, abs(m.i))) AS v FROM m",
      expect: { "abs(m.i)": ["integer"], "substr(m.t, 1, abs(m.i))": ["text"] },
    },
    {
      sql: "SELECT abs(length(m.t || m.t) + 1) AS v FROM m",
      expect: {
        "m.t || m.t": ["text"],
        "length(m.t || m.t)": ["integer"],
        "length(m.t || m.t) + 1": ["integer"],
      },
    },
  ],

  // A cast's type name comes from the AST, so it carries the spelling the
  // PARSER produced — `int8`, not the `bigint` a column of that type reads
  // as. Sound (both canonicalize to the same type, which is why containment
  // passes) but inconsistent, and pinned here so the inconsistency is on the
  // record rather than a surprise to the next reader of a union.
  "casts": [
    { sql: "SELECT abs(CAST(m.i AS bigint)) AS v FROM m", expect: { "CAST(m.i AS bigint)": ["int8"] } },
    // ... and the same spelling then propagates: `int4 + integer` still
    // resolves to one candidate, whose RETURN is the catalog's `integer`.
    { sql: "SELECT abs(m.n::integer + 1) AS v FROM m", expect: { "m.n::int": ["int4"], "m.n::int + 1": ["integer"] } },
  ],

  // Datetime arithmetic, reached through a comparison so the operands are
  // READ — `GREATEST` is a MinMaxExpr and asks for no operand types, which
  // is itself worth knowing.
  "date and interval": [
    { sql: "SELECT (m.d + 1) < m.d AS v FROM m", expect: { "m.d + 1": ["date"] } },
    { sql: "SELECT (m.ts + m.iv) < m.ts AS v FROM m", expect: { "m.ts + m.iv": ["timestamp with time zone"] } },
    { sql: "SELECT (m.d + m.iv) < m.ts AS v FROM m", expect: { "m.d + m.iv": ["timestamp without time zone"] } },
  ],

  // The kinds that never type. Each has a well-defined result type in
  // PostgreSQL and a resolution rule the catalog already implements
  // (`closedCommonTypes`, used by the subtree evaluator for exactly these
  // nodes) — `operandTypeSet` simply never asks. Pinned as null so the day
  // one of them starts answering is a visible diff, not a silent one.
  "the untyped kinds": [
    { sql: "SELECT abs((CASE WHEN m.i > 0 THEN m.i ELSE m.j END)) AS v FROM m", expect: { "CASE WHEN m.i > 0 THEN m.i ELSE m.j END": null } },
    { sql: "SELECT abs(COALESCE(m.i, m.j)) AS v FROM m", expect: { "COALESCE(m.i, m.j)": null } },
    { sql: "SELECT abs((SELECT max(m2.i) FROM m m2)) AS v FROM m", expect: { "(SELECT max(m2.i) FROM m AS m2)": null } },
    { sql: "SELECT array_length(ARRAY[m.t, m.t], 1) AS v FROM m", expect: { "ARRAY[m.t, m.t]": null } },
  ],
};

/**
 * Statements where one expression is read MORE THAN ONCE. The walk must not
 * answer differently at different reading sites — see the consistency test,
 * which is red: a column in a JOIN condition reads untyped while the same
 * column in the target list types, because `promotionOperatorIsStrict`
 * declares a `scope` parameter that neither call site passes.
 */
export const CONSISTENCY_CASES: { sql: string; expr: string }[] = [
  {
    sql: "SELECT a.i + b.i AS v FROM m a JOIN m b ON a.i < b.i",
    expr: "a.i",
  },
  {
    sql: "WITH c AS (SELECT m.i AS x FROM m) SELECT a.x + b.x AS v FROM c a JOIN c b ON a.x < b.x",
    expr: "a.x",
  },
  {
    sql: "SELECT m.i + m.j AS v FROM m WHERE m.i < m.j",
    expr: "m.i",
  },
];
