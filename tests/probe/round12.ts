// Round 12 — the partition-clone capture, and the hazard fixing it makes LIVE.
//
// The report is emphatic that these are two changes that must land together:
// once the declared key is recovered, `ONLY <partitioned parent>` becomes a
// real rank-1, because a partitioned table holds NONE of its own rows and the
// key's guarantee is about the tree.
//
// K1 is the unsound capture (joining the partition the map landed on).
// K2 is the imprecision it caused (joining the DECLARED parent).
// K3 is the hazard: the same declared parent scanned ONLY.
// K4/K5 are the INHERITANCE controls — the opposite way round and SAFE, since
// a parent holds its own rows and the key's target index covers them.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO sw4_pp (id, k) VALUES (1, 'a'), (150, 'b')`,
  `INSERT INTO sw4_pref (id, p_id) VALUES (10, 1), (11, 150)`,
  `INSERT INTO sw4_ip (id, k) VALUES (1, 'a')`,
  `INSERT INTO sw4_iref (id, p_id) VALUES (10, 1)`,
];

const probes: Probe[] = [
  {
    id: "K1-clone-partition-join",
    note: "finding 4: joining the partition the map landed on",
    seed: SEED,
    sql: `SELECT p.id AS pid, p.k FROM sw4_pref r LEFT JOIN sw4_pp2 p ON p.id = r.p_id`,
  },
  {
    id: "K2-declared-parent-join",
    note: "the imprecision the same capture caused — this claim is RECOVERABLE",
    seed: SEED,
    sql: `SELECT p.id AS pid, p.k FROM sw4_pref r LEFT JOIN sw4_pp p ON p.id = r.p_id`,
  },
  {
    id: "K3-only-partitioned-parent",
    note: "THE HAZARD: ONLY a partitioned parent scans no rows at all",
    seed: SEED,
    sql: `SELECT p.id AS pid FROM sw4_pref r LEFT JOIN ONLY sw4_pp p ON p.id = r.p_id`,
  },
  {
    id: "K4-inheritance-parent-tree",
    note: "control: the inheritance parent, tree scan — safe and should promote",
    seed: SEED,
    sql: `SELECT p.id AS pid FROM sw4_iref r LEFT JOIN sw4_ip p ON p.id = r.p_id`,
  },
  {
    id: "K5-only-inheritance-parent",
    note: "control: ONLY an INHERITANCE parent is where the match lives — must still promote",
    seed: SEED,
    sql: `SELECT p.id AS pid FROM sw4_iref r LEFT JOIN ONLY sw4_ip p ON p.id = r.p_id`,
  },
  {
    id: "K6-only-referencing-side",
    note: "ONLY on the REFERENCING side of a partitioned key — a different question",
    seed: SEED,
    sql: `SELECT p.id AS pid FROM ONLY sw4_pref r LEFT JOIN sw4_pp p ON p.id = r.p_id`,
  },
];

await runProbes(probes);
