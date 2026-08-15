// ---------------------------------------------------------------------------
// The generator registries for the fixture schema.
//
// Two tiers, resolved most-specific-first (see `generate.ts` for the full
// resolution order). Neither tier ever returns NULL: whether a cell is NULL is
// the framework's decision, taken from the catalog before the generator runs.
//
// A type entry has to satisfy every CHECK its type carries, which is why a
// domain gets its own entry rather than inheriting its base type's generator —
// `discount_percent` is `numeric` constrained to 0..100, and the plain numeric
// generator would violate it about as often as not.
//
// A column entry exists when a value has to fall inside a *query's* vocabulary
// rather than merely its type's: `orders.status` must sometimes be
// `'fulfilled'` because fixtures filter on it, and a random string would leave
// those fixtures returning nothing.
// ---------------------------------------------------------------------------

import {
  nullRate,
  type ColumnGenerator,
  type GeneratorRegistry,
  type NullPolicy,
} from "./generate.js";

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

const WORDS = [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
] as const;

/**
 * A deliberately tiny vocabulary for the free-text columns of `t` and `u`.
 * `set-intersect.sql` intersects `t.val` with `u.val`; drawn from a large
 * space the two would never meet and the fixture would assert nothing.
 */
const SHARED_VALS = ["x", "y", "z", "a"] as const;

const TIMESTAMPS = [
  "2024-01-15 09:30:00+00",
  "2024-02-29 23:59:59+00",
  "2024-06-01 12:00:00+00",
  "2024-11-03 04:15:00+00",
  "2025-03-21 18:45:00+00",
] as const;

// ---------------------------------------------------------------------------
// Tier 2: by type
// ---------------------------------------------------------------------------

const publicTypeGenerators: Record<string, ColumnGenerator> = {
  integer: rand => rand.int(1, 500),
  bigint: rand => rand.int(1, 500),
  smallint: rand => rand.int(1, 100),
  text: (rand, ctx) => `${rand.pick(WORDS)}-${ctx.row}`,
  boolean: rand => rand.chance(0.5),
  numeric: rand => rand.decimal(1, 1000, 2),
  "double precision": rand => rand.decimal(0, 1000, 4),
  "timestamp with time zone": rand => rand.pick(TIMESTAMPS),
  "timestamp without time zone": rand => rand.pick(TIMESTAMPS).slice(0, 19),
  date: rand => rand.pick(TIMESTAMPS).slice(0, 10),
  jsonb: (rand, ctx) => ({ id: ctx.row + 1, kind: rand.pick(WORDS) }),
  json: (rand, ctx) => ({ id: ctx.row + 1, kind: rand.pick(WORDS) }),

  // Domains. Each has to satisfy its own CHECK.
  nn_text: (rand, ctx) => `${rand.pick(WORDS)}-${ctx.row}`,
  non_empty_text: rand => rand.pick(WORDS),
  positive_amount: rand => rand.decimal(0.01, 500, 2),
  discount_percent: rand => rand.decimal(0, 100, 2),
  // A domain over a DOMAIN has to satisfy BOTH checks: positive_amount's
  // `> 0` and its own cap.
  capped_amount: rand => rand.decimal(0.01, 500, 2),
  // The enum's own labels are the only legal values.
  shipment_state: rand => rand.pick(["pending", "in_transit", "delivered", "returned"]),
};

const typeSpecificGenerators: Record<string, Record<string, ColumnGenerator>> = {
  public: publicTypeGenerators,
  // The second schema draws from the same type vocabulary; nothing about a
  // value depends on which schema its table lives in.
  billing: publicTypeGenerators,
};

// ---------------------------------------------------------------------------
// Tier 1: by column
// ---------------------------------------------------------------------------

/** 1, 2, 3, … — for the key columns of tables that declare no primary key. */
const sequential: ColumnGenerator = (_rand, ctx) => ctx.row + 1;

/**
 * A three-element `sku_pair[]` in text form: one whole element, one with an
 * empty qty, one with an empty sku. An unnest expansion's field columns are
 * all nullable, and a NULL FIELD inside a present element is the only thing
 * that witnesses them — a whole-composite NULL never reaches the expansion.
 * Assigned to all three of pair_holder's columns: an array of the composite,
 * a domain over that array, and an array of a domain over the element all
 * accept the identical literal.
 */
const skuPairArray: ColumnGenerator = rand =>
  `{"(${rand.pick(WORDS)},${rand.int(1, 9)})","(${rand.pick(WORDS)},)","(,${rand.int(1, 9)})"}`;

/** Uniform over an already-generated column of another table. */
function drawFrom(table: string, column: string): ColumnGenerator {
  return (rand, ctx) => {
    const candidates = ctx.values(table, column).filter(v => v !== null && v !== undefined);
    if (candidates.length === 0) {
      throw new Error(`${table}.${column} produced no non-NULL values to draw from`);
    }
    return rand.pick(candidates);
  };
}

const columnSpecificGenerators: Record<
  string,
  Record<string, Record<string, ColumnGenerator>>
> = {
  public: {
    // -- t / u / v ---------------------------------------------------------
    // These three declare no keys and no foreign keys, but the fixtures join
    // them as though they did (`ON u.t_id = t.id`). The join predicate is what
    // makes the reference real, so the generator has to honour it: without
    // this, every one of the ~35 fixtures over t/u/v returns zero rows.
    t: {
      id: sequential,
      name: rand => rand.pick(SHARED_VALS),
      val: rand => rand.pick(SHARED_VALS),
    },
    u: {
      id: sequential,
      // A quarter of the rows dangle. `u` declares no foreign key, and the
      // RIGHT and FULL JOIN fixtures over it need a right-hand row with no
      // left-hand match — with every reference resolving, an outer join is an
      // inner join and its NULL-extended columns are never observed.
      t_id: (rand, ctx) => {
        const ids = ctx.values("t", "id").filter(v => typeof v === "number") as number[];
        if (ids.length === 0) throw new Error("t generated no ids for u.t_id to reference");
        if (rand.chance(0.25)) return Math.max(...ids) + 1 + rand.int(0, 5);
        return rand.pick(ids);
      },
      email: (_rand, ctx) => `u${ctx.row + 1}@example.com`,
      val: rand => rand.pick(SHARED_VALS),
      status: rand => rand.pick(["active", "inactive", "pending"]),
    },
    v: {
      id: sequential,
      u_id: drawFrom("u", "id"),
      amount: rand => rand.decimal(1, 500, 2),
    },

    // -- e-commerce --------------------------------------------------------
    categories: {
      slug: (_rand, ctx) => `cat-${ctx.row + 1}`,
      name: (rand, ctx) => `${rand.pick(WORDS)} category ${ctx.row + 1}`,
    },
    customers: {
      email: (_rand, ctx) => `c${ctx.row + 1}@example.com`,
      // A quarter of the names are the literal several fixtures compare
      // against (`c.name = 'x'`); the rest defer to the text generator rather
      // than restating what a text column looks like.
      name: (rand, ctx) => (rand.chance(0.25) ? "x" : ctx.ofType()),
    },
    products: {
      sku: (_rand, ctx) => `SKU-${ctx.row + 1}`,
      name: rand => rand.pick(WORDS),
      // Spanning the thresholds fixtures compare against (5, 100, 500).
      price: rand => rand.pick([5, 12.5, 99, 150, 480, 900]),
    },
    orders: {
      status: rand => rand.pick(["pending", "fulfilled", "shipped", "cancelled"]),
    },
    order_items: {
      // Above and below the "bulk order" thresholds fixtures test (10, 50).
      quantity: rand => rand.pick([1, 2, 5, 12, 60, 80]),
      unit_price: rand => rand.decimal(1, 900, 2),
    },
    reviews: {
      rating: rand => rand.int(1, 5),
      comment: rand => `${rand.pick(WORDS)} review`,
    },
    addresses: {
      line1: (rand, ctx) => `${ctx.row + 1} ${rand.pick(WORDS)} street`,
      line2: rand => `unit ${rand.int(1, 40)}`,
      city: rand => rand.pick(WORDS),
      state: rand => rand.pick(["CA", "NY", "TX", "WA"]),
      postal_code: rand => String(rand.int(10000, 99999)),
      country: rand => rand.pick(["US", "CA", "GB"]),
    },
    tags: {
      name: (rand, ctx) => `${rand.pick(WORDS)}-tag-${ctx.row + 1}`,
    },
    coupons: {
      code: (_rand, ctx) => `CODE-${ctx.row + 1}`,
    },
    shipments: {
      carrier: rand => rand.pick(["UPS", "DHL", "FedEx"]),
      tracking_no: (rand, ctx) => `TRK${rand.int(1000, 9999)}-${ctx.row}`,
    },
    payment_methods: {
      name: rand => rand.pick(["card", "invoice", "transfer", "voucher"]),
    },
    events: {
      // Fixtures read `data->>'id'` and `data->>'missing'`, so the document
      // needs the first key and must not have the second.
      data: (rand, ctx) => ({ id: ctx.row + 1, kind: rand.pick(WORDS) }),
      meta: rand => ({ source: rand.pick(WORDS) }),
    },
    multi_stmt_log: {
      id: sequential,
      val: rand => rand.pick(SHARED_VALS),
    },
    guest: {
      id: sequential,
      // The CHECK-entailment fixtures filter on every one of these; which
      // dependent columns are NULL is the null policies' job, keyed off the
      // status already assigned to the row (see below).
      status: rand => rand.pick(["in-flight", "arrived", "housed", "checked-out"]),
    },
    txn: {
      id: sequential,
      // Spanning the generated verdict's arms; the NULL policy below adds
      // the fourth (IS NULL → manual-check). verdict itself is GENERATED
      // and never filled.
      fraud_score: rand => rand.pick([80, 90, 50, 40, 10, 5]),
    },
    audit_log: {
      id: sequential,
      kind: rand => rand.pick(["manual", "auto"]),
      n: rand => rand.pick([1, 2]),
    },
    nd: {
      // Under PGlite's bytewise stub only 'a' takes the CHECK's first arm
      // (x IS NULL); 'A' and 'z' route through the second (x IS NOT NULL).
      tag: rand => rand.pick(["a", "A", "z"]),
    },
    locker: {
      code: rand => rand.pick(["assigned", "free"]),
    },
    chain3: {
      stage: rand => rand.pick(["go", "idle"]),
    },
    stock: {
      qty: rand => rand.pick([0, 3, 12]),
    },
    subscription: {
      plan: rand => rand.pick(["team", "solo"]),
      seats: (rand, ctx) =>
        ctx.current("plan") === "team" ? rand.pick([2, 5]) : rand.pick([0, 1]),
    },

    // The atom-oracle demand experiment (schema.sql): the framework does
    // not read CHECKs, so the values must satisfy them. tri's a stays
    // above 5; bcorr's b picks the CHECK's arm and a satisfies it.
    tri: {
      id: sequential,
      a: rand => rand.pick([6, 8, 42]),
    },
    bcorr: {
      id: sequential,
      b: rand => rand.pick([true, false]),
      a: (rand, ctx) =>
        ctx.current("b") === true ? rand.pick([1, 4]) : rand.pick([6, 9]),
    },

    // The application event log. Same range rule as every other partitioned
    // pair here: `order_events` routes its rows and the two partitions are
    // seeded directly, and all three share one unique index, so the parent
    // takes the low end of each range and the partitions the high end of
    // their own. Alternating puts the parent's rows in BOTH partitions, so
    // `order_event_notes` — whose key points at the partitioned table and is
    // therefore CLONED once per partition — has references into each.
    order_events: { id: (_rand, ctx) => (ctx.row % 2 === 0 ? ctx.row + 1 : ctx.row + 100) },
    order_events_early: { id: (_rand, ctx) => ctx.row + 50 },
    order_events_late: { id: (_rand, ctx) => ctx.row + 150 },

    // The composite-key pair, and the one place this registry has to hold a
    // CROSS-COLUMN invariant rather than a per-column one.
    //
    // `leg_no` makes the composite primary key unique on its own, so a
    // shipment drawn twice does not collide. And `leg_scans` must reference a
    // pair that EXISTS: the foreign-key tier draws each column independently
    // from the target column, which for a composite key produces a pair the
    // cross product allows and the table does not. `ctx.values` answers in ROW
    // ORDER, so zipping the two columns of `shipment_legs` recovers the real
    // pairs — `shipment_id` comes from the FK tier, and `leg_no` is then the
    // leg that actually belongs to it.
    shipment_legs: { leg_no: (_rand, ctx) => ctx.row + 1 },

    // The exclusion constraint forbids two rows sharing (warehouse, slot), so
    // `slot` is made unique per row and the pair cannot collide however the
    // warehouse is drawn.
    dock_slots: { slot: (_rand, ctx) => ctx.row + 1 },
    leg_scans: {
      leg_no: (rand, ctx) => {
        const shipmentIds = ctx.values("public.shipment_legs", "shipment_id");
        const legNos = ctx.values("public.shipment_legs", "leg_no");
        const want = ctx.current("shipment_id");
        const matching = legNos.filter((_, i) => shipmentIds[i] === want);
        if (matching.length === 0) {
          throw new Error(
            `leg_scans.shipment_id drew ${String(want)}, which no shipment_legs row carries`,
          );
        }
        return rand.pick(matching);
      },
    },

    // The NATURAL/USING key pair. `sw4_r.id` draws from `sw4_c.id` through the
    // foreign-key tier, so the USING join always matches; `v` is the column
    // that decides the NATURAL one, which shares BOTH names and so joins on
    // `id AND v`. Drawn from the type tier the two `v`s are `word-row` strings
    // that never collide, and the presence group of
    // `fk-entail-natural-extra-conjunct.sql` then never observes its PRESENT
    // arm — the same reason `t.val` and `u.val` share SHARED_VALS. A tiny
    // vocabulary makes both arms happen.
    sw4_c: { v: rand => rand.pick(SHARED_VALS) },
    sw4_r: { v: rand => rand.pick(SHARED_VALS) },

    // The bpchar padding tables and their varchar control. 'a' is the token
    // the fixtures compare against; bpchar pads it to 'a   ' on write.
    bp: { k: rand => rand.pick(["a", "b", "zz"]) },
    bp2: { k: rand => rand.pick(["a", "b", "zz"]) },
    vc: { k: rand => rand.pick(["a", "b", "zz"]) },

    // The partitioned pair: both the parent (whose inserts route) and the
    // partition (seeded directly) must stay inside part_1's range — an id
    // outside 0..100 has no partition and the INSERT raises.
    part_p: { id: rand => rand.int(0, 99) },
    part_1: { id: rand => rand.int(0, 99) },
    // The sub-partitioned branch draws from ITS range, the way mv_2 does —
    // seeding a partition directly means the value has to land inside it.
    part_2: { id: rand => rand.int(100, 149) },
    part_2a: { id: rand => rand.int(100, 149) },

    // The sweep-4 partitioned pair, and the range rule has two more jobs here
    // than it does for part_p.
    //
    // First, sw4_pp carries a PRIMARY KEY (a foreign key needs one to point
    // at), so the parent's ROUTED rows and the partitions' DIRECTLY SEEDED
    // ones share a unique index and must not collide. Disjoint by
    // construction rather than by luck: the parent takes the low end of each
    // range, the partitions the high end of their own.
    //
    // Second, the parent's rows must reach BOTH partitions. `sw4_pref.p_id`
    // draws from the parent's own rows, so a parent seeded entirely into
    // sw4_pp1 leaves nothing referencing sw4_pp2 — and the partition-clone
    // fixture's presence group then never observes its PRESENT arm, which the
    // witness rule rightly refuses. Alternating rows puts references in both.
    sw4_pp: { id: (_rand, ctx) => (ctx.row % 2 === 0 ? ctx.row + 1 : ctx.row + 100) },
    sw4_pp1: { id: (_rand, ctx) => ctx.row + 50 },
    sw4_pp2: { id: (_rand, ctx) => ctx.row + 150 },

    // The referencing-partitioned pair: the parent routes, the partition is
    // seeded directly, and both must stay inside sw4_rs1's range.
    sw4_rs: { id: (_rand, ctx) => ctx.row + 1 },
    sw4_rs1: { id: (_rand, ctx) => ctx.row + 50 },

    // The trigger-bearing partitioned pair, same range rule. The partition
    // trigger nulls a and rescues a NULL b on every insert, seeding
    // included.
    trig_part: { id: rand => rand.int(0, 99) },
    trig_part_1: { id: rand => rand.int(0, 99) },

    // The row-movement partitions. Parent and first partition stay inside
    // mv_1's range so the movement fixtures' `SET id = id + 100` always
    // lands inside mv_2; mv_2's own seeds draw from its range (and its
    // BEFORE INSERT trigger nulls a on the way in, seeding included).
    mv_p: { id: rand => rand.int(0, 99) },
    mv_1: { id: rand => rand.int(0, 99) },
    mv_2: { id: rand => rand.int(100, 199) },

    // The mechanism-B inheritance pair: DISJOINT id ranges, so the param
    // fixture's WHERE can address child rows alone — the state in which
    // the NULL binding is accepted and the dropped claim is honest. The
    // parent's a is NOT NULL by its own flag, so the framework never
    // NULL-injects it; the child's stays nullable.
    pnn_p: { id: rand => rand.int(1, 100) },
    pnn_c: { id: rand => rand.int(201, 300) },

    // The composite-column table. `sku_pair` has no type-tier generator;
    // the text format casts on insert. A third of the non-NULL values
    // carry an empty qty — a NULL FIELD inside a non-NULL composite, which
    // is the witness the whole-composite NULLs (framework-injected) cannot
    // provide on their own.
    cc: {
      id: sequential,
      // The three composite shapes by row index: whole, empty qty, empty
      // sku. A NULL FIELD inside a present composite is the only witness for
      // a field claim that survives an equality JOIN on the whole composite
      // — record equality treats NULL fields as EQUAL (measured), so those
      // rows do match and reach `(p).*`. By row index rather than by chance:
      // at this table's row count a rate left it to luck, and the
      // merged-column fixture then had nothing to witness with.
      p: (rand, ctx) =>
        ctx.row % 3 === 0
          ? `(${rand.pick(WORDS)},${rand.int(1, 9)})`
          : ctx.row % 3 === 1
            ? `(${rand.pick(WORDS)},)`
            : `(,${rand.int(1, 9)})`,
    },

    // The composite-ARRAY table (adversarial-3 findings 3 and 4): the same
    // two-element array in three spellings — the plain array, a domain over
    // it, and an array of a domain over the element. Every array carries one
    // element with an empty qty, which is what witnesses the `qty` nullable
    // claim an unnest expansion makes: the field is NULL while the element
    // itself is not, so a whole-composite NULL cannot stand in for it.
    // Half the ranges are EMPTY, which is the only input that makes
    // lower()/upper() return NULL — the witness for
    // builtin-range-lower-upper.sql.
    rng: {
      id: sequential,
      span: (rand, ctx) => (ctx.row % 2 === 0 ? "empty" : `[${rand.int(1, 5)},${rand.int(6, 9)})`),
    },

    pair_holder: {
      id: sequential,
      pairs: skuPairArray,
      dpairs: skuPairArray,
      dompairs: skuPairArray,
    },

    // The same shape one type-kind over: an array of a TABLE's ROW TYPE.
    // Every element carries a NULL `b`, which is what witnesses the field
    // claims an unnest expansion makes — a row type carries column types
    // and no constraints, so `a` is nullable here too and gets one as well.
    trow_holder: {
      id: sequential,
      rows: rand => `{"(${rand.int(1, 9)},)","(,${rand.pick(WORDS)})"}`,
      // The BARE row-type column, by row index rather than by chance — the
      // composite-star fixture needs BOTH a present composite (so the field
      // claims are read off a real row) and an absent one (so their nullable
      // claims are witnessed), and at this table's row count a rate leaves
      // that to luck. Every third row is NULL; the rest carry a whole trow.
      row1: (rand, ctx) => (ctx.row % 3 === 2 ? null : `(${rand.int(1, 9)},${rand.pick(WORDS)})`),
    },

    // The NO INHERIT pair. Parent rows must satisfy their own CHECKs (the
    // framework does not know CHECK constraints, and a violating INSERT
    // would abort the whole state); the children are exactly the rows those
    // CHECKs never constrained, so they get the status the fixtures filter
    // on and the NULLs that witness the dropped claims.
    ni2_p: {
      status: rand => rand.pick(["open", "closed", "ack"]),
    },
    ni2_c: {
      status: rand => rand.pick(["open", "closed"]),
    },

    // Infinite temporal values are the point of this table — extract's
    // non-monotonic fields are NULL exactly there (finding 11), so seeding
    // only finite values would leave that fixture's nullable claims
    // unwitnessed. `interval` has no type-tier generator; both columns own
    // their draws.
    inf_t: {
      id: sequential,
      ts: rand =>
        rand.chance(0.5)
          ? rand.pick(["infinity", "-infinity"])
          : rand.pick(TIMESTAMPS).slice(0, 19),
      iv: rand =>
        rand.chance(0.5) ? rand.pick(["infinity", "-infinity"]) : rand.pick(["3 days", "2 hours", "1 mon"]),
    },
  },
};

// ---------------------------------------------------------------------------
// Row counts
// ---------------------------------------------------------------------------

const rowCounts: Record<string, Record<string, [number, number]>> = {
  public: {
    // A category needs more than two products for the "category norm"
    // predicates in the correlated-subquery fixtures to admit any row.
    categories: [2, 3],
    products: [8, 12],
    orders: [6, 10],
    order_items: [8, 14],
    reviews: [8, 14],
    // Composite PK drawn from two FKs: over-generate, since duplicate pairs
    // are dropped.
    product_tags: [10, 16],
    // Six rows so the rotating NULL policy below gives each of the three
    // array columns two NULLs.
    pair_holder: [6, 6],
    // Six rows so the composite column has present values of both shapes
    // (with and without a qty) as well as its NULLs.
    cc: [6, 6],
  },
};

// ---------------------------------------------------------------------------
// NULL policies
//
// How often a nullable column is NULL is what produces witnesses, so it is a
// per-column decision rather than one figure for the whole dataset. Each column
// draws its NULL decisions from its own seeded stream: retuning one leaves
// every other column's data byte-identical.
// ---------------------------------------------------------------------------

const nullPolicies: {
  byType?: Record<string, Record<string, NullPolicy>>;
  byColumn?: Record<string, Record<string, Record<string, NullPolicy>>>;
} = {
  byColumn: {
    public: {
      // Soft-delete columns: a mostly-live table with a few deleted rows is
      // the shape fixtures filter on. NULL here means "not deleted", so a high
      // rate is the realistic one — and both sides of `deleted_at IS NULL`
      // need rows for the filter to prove anything.
      categories: { deleted_at: nullRate(0.7) },
      customers: { deleted_at: nullRate(0.7) },
      products: { deleted_at: nullRate(0.7) },
      orders: { deleted_at: nullRate(0.7) },

      // A shipment that has shipped but not arrived is the state that makes
      // `delivered_at` witness anything, so leave `shipped_at` mostly filled.
      shipments: { shipped_at: nullRate(0.2), delivered_at: nullRate(0.6) },

      // `u.status` is compared against a literal by the promotion fixtures.
      // NULLs there only shrink the number of rows that reach the comparison.
      u: { status: nullRate(0.1) },

      // Unnesting a NULL array produces NO rows, so the column a fixture
      // unnests takes its NULLs out of the sample rather than witnessing
      // anything — and the composite-element fixtures unnest a DIFFERENT one
      // of these three each. Rotating the NULL by row index means whichever
      // column a fixture unnests, the rows that survive still carry a NULL
      // in each of the other two. A rate would leave it to luck at this
      // table's row count.
      // One NULL composite in three: enough to witness the whole-column
      // claim, few enough that the equality self-join still has rows.
      cc: { p: (_rand, ctx) => ctx.row % 4 === 3 },

      pair_holder: {
        pairs: (_rand, ctx) => ctx.row % 3 === 0,
        dpairs: (_rand, ctx) => ctx.row % 3 === 1,
        dompairs: (_rand, ctx) => ctx.row % 3 === 2,
      },

      // guest's CHECK constraints tie each column's NULLness to the status
      // assigned earlier in the row (columns fill in catalog order, so
      // `current` can read it). arrived_at is forced BOTH ways by the CASE —
      // NULL exactly when the status is outside the WHEN set. room and note
      // are only forced non-NULL by their arm; elsewhere they stay random so
      // both fixtures' witnesses survive. badge never goes NULL: NOT VALID
      // still gates new writes.
      guest: {
        arrived_at: (_rand, ctx) =>
          ctx.current("status") !== "arrived" && ctx.current("status") !== "housed",
        room: (rand, ctx) => (ctx.current("status") === "housed" ? false : rand.chance(0.5)),
        note: (rand, ctx) => (ctx.current("status") === "checked-out" ? false : rand.chance(0.5)),
        badge: () => false,
      },

      // The NO INHERIT pair: the parents' own rows satisfy their CHECKs
      // (ni_p's x never NULL; ni2_p's note non-NULL exactly when status is
      // 'open'), while the CHILDREN — which the constraints were never
      // copied to — put NULLs behind both fixtures' tree scans. ni2_c's
      // rate leans NULL on the 'open' rows the fixtures filter down to.
      ni_p: { x: () => false },
      ni_c: { x: nullRate(0.5) },
      ni2_p: {
        note: (rand, ctx) => (ctx.current("status") === "open" ? false : rand.chance(0.5)),
      },
      ni2_c: {
        note: (rand, ctx) => (ctx.current("status") === "open" ? rand.chance(0.7) : rand.chance(0.3)),
      },

      // A NULL fraud_score is the generated verdict's fourth arm
      // (manual-check), which the ambiguous-verdict fixture witnesses with.
      txn: { fraud_score: nullRate(0.25) },

      // The atom-oracle experiment: a NULL `a` passes both CHECKs (the
      // guard goes UNKNOWN) and is the null-extension case the kernel red
      // targets survive, so it stays in the sample. bcorr's `b` never goes
      // NULL — the value tier picked `a` for the arm `b` selected, and a
      // NULLed `b` would reroute the row to the ELSE arm it may violate.
      tri: { a: nullRate(0.25) },
      bcorr: { b: () => false, a: nullRate(0.25) },

      // Each CHECK CASE ties a column's NULLness to the discriminator
      // assigned earlier in the row, same pattern as guest.
      audit_log: {
        actor: (rand, ctx) => (ctx.current("kind") === "manual" ? false : rand.chance(0.5)),
        bot_id: (rand, ctx) => (ctx.current("kind") === "auto" ? false : rand.chance(0.5)),
        n: nullRate(0.2),
        a: (rand, ctx) => (ctx.current("n") === 1 ? false : rand.chance(0.5)),
        b: (rand, ctx) => (ctx.current("n") === 2 ? false : rand.chance(0.5)),
      },

      // nd's CHECK forces x NULL exactly on (bytewise) 'a' rows.
      nd: { x: (_rand, ctx) => ctx.current("tag") === "a" },

      // locker's simple-CASE CHECK forces combo on assigned rows; the
      // implication CHECK forces opened_at wherever combo is present.
      locker: {
        combo: (_rand, ctx) => ctx.current("code") !== "assigned",
        opened_at: (rand, ctx) =>
          ctx.current("combo") === null ? rand.chance(0.5) : false,
      },

      // chain3's links: each column is forced by the previous one's
      // presence, so the policies mirror the constraints link by link.
      chain3: {
        a: (rand, ctx) => (ctx.current("stage") === "go" ? false : rand.chance(0.6)),
        b: (rand, ctx) => ctx.current("a") === null && rand.chance(0.6),
        c: (rand, ctx) => ctx.current("b") === null && rand.chance(0.6),
      },

      // stock: a zero-qty item must carry its discontinuation timestamp.
      stock: {
        discontinued_at: (rand, ctx) =>
          (ctx.current("qty") as number) > 0 ? rand.chance(0.5) : false,
      },

      // subscription: seats over one force the overflow contact (CHECK₂),
      // whatever the plan; the seats policy itself follows CHECK₁'s arm.
      subscription: {
        seats: (rand, ctx) => ctx.current("plan") !== "team" && rand.chance(0.4),
        overflow_contact: (rand, ctx) => {
          const seats = ctx.current("seats");
          return typeof seats === "number" && seats > 1 ? false : rand.chance(0.5);
        },
      },

      // bp: the CHECK admits a NULL x exactly where k's padded value equals
      // 'a ' — writing it there is the padding witness the fixtures return.
      bp: { x: (_rand, ctx) => ctx.current("k") === "a" },
      // bp2: the CASE's first arm FORCES x NULL on 'a' rows; other rows
      // match no arm, so the NULL CASE result admits them either way.
      bp2: { x: (rand, ctx) => ctx.current("k") === "a" || rand.chance(0.4) },
      // vc: x non-null everywhere — the control never writes the literal
      // 'a ' rows that would admit a NULL.
      vc: { x: () => false },
    },
  },
};

export const fixtureGeneratorRegistry: GeneratorRegistry = {
  byType: typeSpecificGenerators,
  byColumn: columnSpecificGenerators,
  rowCounts,
  nullPolicies,
};
