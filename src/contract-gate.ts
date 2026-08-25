// ---------------------------------------------------------------------------
// The arity-and-order gate — the consumer boundary.
//
// `inferQueryContract` returns POSITIONAL arrays. A consumer zips them against
// what PostgreSQL reports for the same statement, and nothing has ever checked
// that the two lists describe the same columns before they are zipped.
//
// A mismatch misassigns every flag past the point of divergence, and does so
// while looking authoritative: the count matches, the names read correctly
// because the consumer takes them from PostgreSQL, and the generated types
// compile. An ordinary defect makes ONE claim wrong; this makes every claim
// after position k wrong, silently.
//
// ARITY IS NOT ENOUGH, and the count is the argument. Across four adversarial
// sweeps this gate carries thirteen defects it would have caught, FOUR of them
// arity-preserving: a permuted MERGE `RETURNING *`, `(p).*` reading the alias
// where PostgreSQL reads the column, a quoted `TABLE(…)` name split at a
// space, and a one-arm `ROWS FROM` ignoring the relation alias. A length check
// passes all four. Only the ORDERED NAME SEQUENCE catches them.
//
// It verifies a POSITIONAL join and never joins by name — names are not
// unique (`SELECT a, a FROM t` is legal, and the corpus contains it). Where
// the engine reports an EMPTY name it compares nothing at that position:
// `FigureColname` stays unimplemented by decision, so `SELECT 1 + 1` is `""`
// here and `?column?` there, and a name comparison would fire on every
// unaliased expression (measured — `SELECT CASE WHEN true THEN 1 END` is
// `""` vs `case`, `SELECT ARRAY[1,2]` is `""` vs `array`).
//
// On any mismatch the contract DEGRADES rather than being repaired: every
// column nullable, no presence groups, no rejection sets, and the outcome
// carried where a consumer must look at it. A wrong claim is worse than no
// claim, and the point of the gate is that the wrongness stops being silent.
// ---------------------------------------------------------------------------

import type { QueryContract } from "./query/nullability-walk.js";

/**
 * What PostgreSQL says a statement's shape is, WITHOUT executing it.
 *
 * The narrowest thing that works, and it must not run the statement: a gate
 * that executed would fire triggers, advance sequences and write rows for
 * every DML query a consumer analysed. PGlite's `describeQuery` is the
 * reference implementation and the whole adapter is:
 *
 *     const describe = async sql => {
 *       const d = await pg.describeQuery(sql);
 *       return { columns: d.resultFields.map(f => f.name), params: d.queryParams.length };
 *     };
 *
 * Measured over the fixture corpus: 515 of 515 statements describe, DML with
 * RETURNING and `$n` parameters included, and nothing executes (a sequence
 * beside the probe does not advance).
 */
export interface DescribedShape {
  /** Output column names in order. Duplicates are preserved and meaningful. */
  columns: readonly string[];
  /** How many `$n` parameters PostgreSQL resolved for the statement. */
  params: number;
}

export type DescribeStatement = (sql: string) => Promise<DescribedShape>;

/**
 * Why the gate refused, or that it did not. Every arm carries both sides,
 * because a consumer reporting this has to be able to say what disagreed —
 * "the shapes differ" is not a diagnostic anyone can act on.
 */
export type GateOutcome =
  | { kind: "agreed" }
  | {
      kind: "column-arity";
      engine: readonly string[];
      database: readonly string[];
    }
  | {
      kind: "column-order";
      /** The first position whose names disagree. */
      at: number;
      engine: readonly string[];
      database: readonly string[];
    }
  | { kind: "param-arity"; engine: number; database: number }
  /** `describe` threw: PostgreSQL could not plan the statement, or the
   *  consumer's adapter failed. Either way there is nothing to compare
   *  against and no claim may be trusted. */
  | { kind: "undescribed"; detail: string };

export interface GatedContract extends QueryContract {
  gate: GateOutcome;
}

/** Whether the outcome permits the engine's claims to be used as they are. */
export const gateAgreed = (outcome: GateOutcome): boolean => outcome.kind === "agreed";

/**
 * Compare the engine's shape against the database's.
 *
 * Pure, and separate from `gateContract` on purpose: the comparison is the
 * part worth reading, and a consumer that already holds both shapes (a
 * language server with a cached description, say) can ask it directly.
 */
export function compareShapes(
  engine: { columns: readonly string[]; params: number },
  database: DescribedShape,
): GateOutcome {
  if (engine.params !== database.params) {
    return { kind: "param-arity", engine: engine.params, database: database.params };
  }
  if (engine.columns.length !== database.columns.length) {
    return { kind: "column-arity", engine: engine.columns, database: database.columns };
  }
  for (let i = 0; i < engine.columns.length; i++) {
    // An empty engine name compares as nothing: see the header — the walk
    // does not implement FigureColname, so an unaliased expression has no
    // name to compare and the position degrades to the arity check above.
    const name = engine.columns[i]!;
    if (name !== "" && name !== database.columns[i]) {
      return { kind: "column-order", at: i, engine: engine.columns, database: database.columns };
    }
  }
  return { kind: "agreed" };
}

/**
 * The contract with every claim removed, keeping only the shape a consumer
 * still has to emit something for.
 *
 * The names come from the DATABASE where there is one, because those are the
 * names the consumer's rows will actually arrive under; where `describe`
 * itself failed there is no database answer and the engine's own names are
 * all that is left. Nothing else survives: a presence group or a rejection
 * set is a claim about POSITIONS, and positions are exactly what the gate
 * just refused to vouch for.
 */
function degraded(contract: QueryContract, names: readonly string[]): QueryContract {
  return {
    outputs: names.map(name => ({ name, notNull: false })),
    params: contract.params.map(p => ({ number: p.number, notNull: false })),
    paramRejectionSets: [],
    outputPresenceGroups: [],
    alwaysRaises: false,
  };
}

/**
 * Gate a contract against PostgreSQL's own description of the same statement.
 *
 * `sql` must be the text the contract was inferred from. That is the one
 * invariant the gate cannot check for itself, and getting it wrong turns the
 * gate into a source of the exact failure it exists to catch — so a consumer
 * should thread one statement through both calls rather than re-deriving the
 * text.
 */
export async function gateContract(
  sql: string,
  contract: QueryContract,
  describe: DescribeStatement,
): Promise<GatedContract> {
  let database: DescribedShape;
  try {
    database = await describe(sql);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ...degraded(contract, contract.outputs.map(o => o.name)),
      gate: { kind: "undescribed", detail },
    };
  }

  const outcome = compareShapes(
    { columns: contract.outputs.map(o => o.name), params: contract.params.length },
    database,
  );
  if (outcome.kind === "agreed") return { ...contract, gate: outcome };
  return { ...degraded(contract, database.columns), gate: outcome };
}
