// Section A — the strict short-circuit, and what the FROM item's column list
// assembles around it.
import { runProbes, type Probe } from "./harness.js";

const DDL = [
  // VARIADIC and strict.
  `CREATE FUNCTION sw4_var(VARIADIC a text[]) RETURNS nn_text
     LANGUAGE sql STRICT AS $$ SELECT 'x'::nn_text $$`,
  // A strict function whose body the walk can read, over a table.
  `CREATE FUNCTION sw4_name(p integer) RETURNS text
     LANGUAGE sql STRICT AS $$ SELECT c.email FROM customers c WHERE c.id = p $$`,
  // A view over a strict call.
  `CREATE VIEW sw4_view AS SELECT dom_lenient(c.name) AS d, dom_strict(c.name) AS s FROM customers c`,
];

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', NULL), (2, 'b@x', 'bee')`,
  `INSERT INTO t (id, name, val, active) VALUES (1, 'n', NULL, true)`,
];

const probes: Probe[] = [
  {
    id: "A1-rowsfrom-pad-domain",
    note: "ROWS FROM pads the shorter arm; the declared NOT NULL domain reading is not cleared",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3))`,
  },
  {
    id: "A2-rowsfrom-pad-setof-domain",
    note: "same, SETOF domain: one row against generate_series' three",
    sql: `SELECT * FROM ROWS FROM (sw4_dom_rows(1), generate_series(1, 3))`,
  },
  {
    id: "A3-rowsfrom-strict-srf-noRows",
    note: "returnsSet is excluded from the short-circuit: a strict SRF handed NULL returns NO rows, and ROWS FROM pads them in",
    sql: `SELECT * FROM ROWS FROM (sw4_dom_srf(NULL::integer), generate_series(1, 3))`,
  },
  {
    id: "A4-rowsfrom-strict-table-srf",
    note: "the TABLE(...) spelling of the same",
    sql: `SELECT * FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3))`,
  },
  {
    id: "A5-rowsfrom-control-longest",
    note: "control: the domain arm is the LONGEST, so nothing is padded",
    sql: `SELECT * FROM ROWS FROM (sw4_dom_rows(3), generate_series(1, 2))`,
  },
  {
    id: "A6-lateral-left-strict-srf",
    note: "LEFT JOIN LATERAL over a strict SRF that returns nothing",
    sql: `SELECT t.id, s FROM t LEFT JOIN LATERAL sw4_dom_srf(NULL::integer) s ON true`,
    seed: SEED,
  },
  {
    id: "A7-named-notation-nullable",
    note: "named notation, nullable argument: the reorder must still see the NULL",
    sql: `SELECT dom_strict(x => c.name) AS d FROM customers c`,
    seed: SEED,
  },
  {
    id: "A8-named-notation-unknown-name",
    note: "a named argument whose name matches no parameter",
    sql: `SELECT def_two(1, c => 5) AS d`,
  },
  {
    id: "A9-variadic-strict-null-element",
    note: "VARIADIC strict: a NULL ELEMENT does not stop the call, a NULL array does",
    sql: `SELECT sw4_var('a', c.name) AS d FROM customers c`,
    seed: SEED,
  },
  {
    id: "A10-variadic-strict-array-spelling",
    note: "VARIADIC array spelling with a NULL array",
    sql: `SELECT sw4_var(VARIADIC NULL::text[]) AS d`,
  },
  {
    id: "A11-strict-operator-backing",
    note: "the strict operator ==== over a nullable column",
    sql: `SELECT t.val ==== 'x' AS d FROM t`,
    seed: SEED,
  },
  {
    id: "A12-strict-through-view",
    note: "a strict call inside a view definition",
    sql: `SELECT v.d, v.s FROM sw4_view v`,
    seed: SEED,
  },
  {
    id: "A13-strict-through-cte",
    note: "a strict call inside a CTE",
    sql: `WITH x AS (SELECT dom_strict(c.name) AS s FROM customers c) SELECT x.s FROM x`,
    seed: SEED,
  },
  {
    id: "A14-strict-arg-is-shortcircuiting-call",
    note: "the argument is itself a call that short-circuits",
    sql: `SELECT dom_strict(dom_strict(c.name)) AS s FROM customers c`,
    seed: SEED,
  },
  {
    id: "A15-aggregate-filter-empty",
    note: "an aggregate over a NOT NULL domain with a FILTER that admits nothing",
    sql: `SELECT nn_agg(c.email) FILTER (WHERE false) AS a FROM customers c`,
    seed: SEED,
  },
  {
    id: "A16-strict-body-inline-with-ordinality",
    note: "WITH ORDINALITY over a strict SRF handed NULL",
    sql: `SELECT * FROM sw4_dom_srf(NULL::integer) WITH ORDINALITY`,
  },
  {
    id: "A17-strict-srf-rowsfrom-ordinality",
    note: "ROWS FROM padding plus ordinality",
    sql: `SELECT * FROM ROWS FROM (sw4_dom_srf(NULL::integer), generate_series(1, 2)) WITH ORDINALITY`,
  },
  {
    id: "A18-strict-body-read-nonnull-arg",
    note: "control: a strict body read with a provably non-null argument",
    sql: `SELECT sw4_name(o.id) AS e FROM orders o`,
  },
];

await runProbes(probes, DDL);
