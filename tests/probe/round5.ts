// Round 5 — pinning the ROWS FROM naming rule exactly, and the XMLTABLE /
// JSON_TABLE spellings round 4 fumbled.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO trow_holder (id, rows, row1) VALUES (1, ARRAY[ROW(1,'z')::trow], ROW(2,'y')::trow)`,
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay')`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
];

const probes: Probe[] = [
  {
    id: "N1-rowsfrom-one-scalar-alias",
    note: "one scalar arm, relation alias",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 2)) AS z`,
  },
  {
    id: "N2-rowsfrom-one-scalar-alias-collist",
    note: "one scalar arm, alias column list",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 2)) AS z(w)`,
  },
  {
    id: "N3-rowsfrom-two-scalars-alias",
    note: "two scalar arms, relation alias only",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 2), generate_series(1, 3)) AS z`,
  },
  {
    id: "N4-rowsfrom-one-composite-alias",
    note: "one composite arm, relation alias — the alias names the RELATION, not the columns",
    sql: `SELECT * FROM ROWS FROM (sw4_tab_srf(1)) AS z`,
  },
  {
    id: "N5-rowsfrom-one-userscalar-alias",
    note: "one user scalar-returning arm",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a')) AS z`,
  },
  {
    id: "N6-rowsfrom-one-scalar-noalias",
    note: "one scalar arm, no alias",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 2))`,
  },
  {
    id: "N7-rowsfrom-one-scalar-alias-ordinality",
    note: "one scalar arm with WITH ORDINALITY and an alias",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 2)) WITH ORDINALITY AS z`,
  },
  {
    id: "N8-xmltable-ordinality-notnull",
    note: "XMLTABLE's FOR ORDINALITY and a NOT NULL column",
    sql: `SELECT * FROM XMLTABLE('/r/i' PASSING XMLPARSE(DOCUMENT '<r><i><a>1</a></i><i><a>2</a></i></r>')
            COLUMNS n FOR ORDINALITY, a integer PATH 'a' NOT NULL)`,
  },
  {
    id: "N9-xmltable-notnull-missing",
    note: "a NOT NULL XMLTABLE column whose path matches nothing (PostgreSQL raises)",
    sql: `SELECT * FROM XMLTABLE('/r/i' PASSING XMLPARSE(DOCUMENT '<r><i><b>1</b></i></r>')
            COLUMNS n FOR ORDINALITY, a integer PATH 'a' NOT NULL)`,
  },
  {
    id: "N10-jsontable-notnull-sibling",
    note: "a NOT NULL JSON_TABLE column in one sibling NESTED path",
    sql: `SELECT * FROM JSON_TABLE('{"a":[1,2],"b":[3]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (av integer PATH '$' NOT NULL ERROR ON ERROR),
            NESTED PATH '$.b[*]' COLUMNS (bv integer PATH '$')))`,
  },
  {
    id: "N11-array-agg-ordered",
    note: "array_agg with an ORDER BY inside the call",
    sql: `SELECT * FROM unnest((SELECT array_agg(q.row1 ORDER BY q.id) FROM trow_holder q)) x`,
    seed: SEED,
  },
  {
    id: "N12-array-agg-filter",
    note: "array_agg with a FILTER that admits nothing",
    sql: `SELECT * FROM unnest((SELECT array_agg(q.row1) FILTER (WHERE false) FROM trow_holder q)) x`,
    seed: SEED,
  },
  {
    id: "N13-jsontable-sibling-in-left-join",
    note: "the sibling-NESTED shape under an outer join — does a presence group form?",
    sql: `SELECT c.id, j.na, j.nb FROM customers c LEFT JOIN
            JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
              NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
              NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j ON c.id = 99`,
    seed: SEED,
  },
];

await runProbes(probes);
