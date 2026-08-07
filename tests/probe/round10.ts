// Round 10 — the ROWS FROM padding, all six shapes the sweep measured plus
// the controls the fix must not overshoot.
//
// A1-A4 and A17/FF2 are finding 1's shapes: a declared NOT NULL domain
// surviving the padding, through the scalar return, the SETOF return, the
// STRICT SETOF handed NULL (no rows at all), the TABLE(...) spelling, the
// same with WITH ORDINALITY, and an alias column list renaming the padded
// column. A5/A19/A20 are the controls: `WITH ORDINALITY`'s own counter is
// present on every row and must stay notNull, the coldeflist arm carries no
// flags to lose, and a LONE arm keeps its claim.
import { runProbes, type Probe } from "./harness.js";

const probes: Probe[] = [
  {
    id: "A1-nonstrict-scalar-domain-short-by-two",
    note: "finding 1: a NOT NULL domain return beside a three-row arm",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x`,
  },
  {
    id: "A2-setof-domain-short-by-two",
    note: "SETOF <NOT NULL domain>, short by two",
    sql: `SELECT * FROM ROWS FROM (sw4_dom_rows(1), generate_series(1, 3)) AS x`,
  },
  {
    id: "A3-strict-setof-no-rows",
    note: "STRICT SETOF handed NULL — no rows at all, padded over the whole length",
    sql: `SELECT * FROM ROWS FROM (sw4_dom_srf(NULL::integer), generate_series(1, 3)) AS x`,
  },
  {
    id: "A4-strict-table-return",
    note: "STRICT RETURNS TABLE(a nn_text, b integer) handed NULL",
    sql: `SELECT * FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3)) AS x`,
  },
  {
    id: "A17-padding-with-ordinality",
    note: "the same plus WITH ORDINALITY — the counter is NOT padded",
    sql: `SELECT * FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3))
            WITH ORDINALITY AS x`,
  },
  {
    id: "FF2-padding-alias-collist",
    note: "an alias column list renaming the padded column",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x(p, q)`,
  },
  {
    id: "A19-coldeflist-arm",
    note: "control: the coldeflist arm's declared columns carry no flags to lose",
    sql: `SELECT * FROM ROWS FROM (sw4_rec(1) AS (v text, n integer), generate_series(1, 3)) AS x`,
  },
  {
    id: "A20-lone-arm-keeps-claim",
    note: "control: a LONE arm has no padding partner and keeps its claim",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a')) AS x`,
  },
  {
    id: "A5-ordinality-alone",
    note: "control: WITH ORDINALITY on a lone arm — the counter stays notNull",
    sql: `SELECT * FROM ROWS FROM (sw4_tab_srf(1)) WITH ORDINALITY AS x`,
  },
  {
    id: "A18-longer-arm-first",
    note: "the padded arm SECOND rather than first — order is not the rule",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 3), dom_lenient('a')) AS x`,
  },
  {
    id: "G1-target-list-srf-control",
    note: "the target list's padding rule, finding 1's twin one clause over — already correct",
    sql: `SELECT dom_lenient('a'), generate_series(1, 3)`,
  },
];

await runProbes(probes);
