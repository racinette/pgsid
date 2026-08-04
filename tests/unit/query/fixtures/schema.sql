-- Base migration for nullability-walk fixtures.
-- All tables, functions, and domains the fixtures reference.

-- Tables -------------------------------------------------------------

CREATE TABLE t (
  id     integer  NOT NULL,
  name   text,
  val    text,
  active boolean NOT NULL
);

CREATE TABLE u (
  id     integer NOT NULL,
  t_id   integer NOT NULL,
  email  text    NOT NULL,
  val    text,
  status text
);

CREATE TABLE v (
  id     integer  NOT NULL,
  u_id   integer  NOT NULL,
  amount numeric
);

-- Domains ------------------------------------------------------------

CREATE DOMAIN nn_text AS text NOT NULL;

-- Functions ----------------------------------------------------------

-- Strict scalar function: lower_strict(text) → text
CREATE FUNCTION lower_strict(x text) RETURNS text
  LANGUAGE sql STRICT
  AS $$ SELECT $1 $$;

-- User-defined aggregate: count_it(integer) → bigint
CREATE FUNCTION count_it_sfunc(state bigint, val integer) RETURNS bigint
  LANGUAGE sql
  AS 'SELECT state + 1';

CREATE AGGREGATE count_it(integer) (
  SFUNC    = count_it_sfunc,
  STYPE    = bigint,
  INITCOND = '0'
);

-- LANGUAGE sql function with old-style body: double_val(integer)
CREATE FUNCTION double_val(x integer) RETURNS integer
  LANGUAGE sql
  AS $$ SELECT $1 $$;

-- LANGUAGE sql function with BEGIN ATOMIC body: pass_through(text)
CREATE FUNCTION pass_through(x text) RETURNS text
  LANGUAGE sql
  BEGIN ATOMIC
    SELECT $1;
  END;

-- Function returning a NOT NULL domain: always_text(text) → nn_text
CREATE FUNCTION always_text(x text) RETURNS nn_text
  LANGUAGE sql
  AS $$ SELECT 'hello' $$;

-- Function with a NOT NULL domain PARAMETER: coercing an argument to nn_text
-- applies the domain constraint, so a NULL argument raises at the call
-- (mechanism A in docs/argument-nullability.md).
CREATE FUNCTION takes_nn(x nn_text) RETURNS text
  LANGUAGE sql
  AS $$ SELECT x $$;

-- Conflict-key table for ON CONFLICT coverage: t/u/v deliberately carry no
-- unique constraints, so the conflict target lives here. `val` is the
-- conditional mechanism-B site (NOT NULL constraint, checked only when the
-- DO UPDATE arm fires); `tag` is the conditional mechanism-A site (domain
-- type — a parameter assigned to it is TYPED nn_text and rejected at Bind,
-- arm or no arm). The `sparse` data state seeds id 1 so the conflict arm
-- fires there and not under `empty` — both paths stay executed.
CREATE TABLE ck (
  id   integer PRIMARY KEY,
  name text,
  val  text    NOT NULL DEFAULT 'v',
  tag  nn_text DEFAULT 'g'
);

-- A non-strict operator: lenient_eq returns TRUE even for NULL operands, so
-- `x === y` never filters a row. Exists to pin the engine's first measured
-- unsoundness — WHERE promotion trusting arbitrary operators — as a
-- permanent regression case (where-promotion-non-strict-op.sql).
CREATE FUNCTION lenient_eq(a text, b text) RETURNS boolean
  LANGUAGE sql
  AS $$ SELECT true $$;
CREATE OPERATOR === (LEFTARG = text, RIGHTARG = text, FUNCTION = lenient_eq);

-- The strict counterpart: ==== is backed by a STRICT function, so its
-- declared strictness (pg_operator.oprcode → pg_proc.proisstrict, captured
-- by the snapshot) licenses WHERE-side promotion and narrowing exactly like
-- a builtin comparison — the pair pins both directions of the operator
-- trust boundary (custom-operator.sql).
CREATE FUNCTION strict_same(a text, b text) RETURNS boolean
  LANGUAGE sql STRICT
  AS $$ SELECT a = b $$;
CREATE OPERATOR ==== (LEFTARG = text, RIGHTARG = text, FUNCTION = strict_same);

-- Generated columns (Wave 5c): the generation expression is walked at the
-- reading site with its refs bound to the read entry, so `doubled` is
-- notNull (a is NOT NULL, * is strict+total), `label` is nullable (b is
-- nullable, || is strict), and `safe_label` is notNull per-row — which is
-- exactly what makes it the LEFT-JOIN counterexample: a NULL-extended row
-- nulls it anyway, so the joinState gate must win (pinned in
-- generated-left-join-gate.sql). Writes to these columns cannot exist:
-- PREPARE rejects them (pinned in param-mechanism.test.ts).
CREATE TABLE gm (
  a          integer NOT NULL,
  b          text,
  doubled    integer GENERATED ALWAYS AS (a * 2) STORED,
  label      text    GENERATED ALWAYS AS (b || '!') STORED,
  safe_label text    GENERATED ALWAYS AS (coalesce(b, 'anon')) STORED
);

-- Overload-consensus subjects (Wave 5): names whose arity-compatible
-- candidates AGREE on the asked property, so the conclusion holds whichever
-- overload PostgreSQL resolves — the counterpart of over_fn below, whose
-- candidates disagree and keep refusing. plpgsql throughout: fnBodyAsts is
-- keyed by name alone, and sql-bodied overloads would collide there.
CREATE FUNCTION clean2(x text) RETURNS text
  LANGUAGE plpgsql STRICT
  AS $$ BEGIN RETURN x; END $$;
CREATE FUNCTION clean2(x integer) RETURNS text
  LANGUAGE plpgsql STRICT
  AS $$ BEGIN RETURN x::text; END $$;

CREATE FUNCTION tag_of(x integer) RETURNS nn_text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN 'i'; END $$;
CREATE FUNCTION tag_of(x text) RETURNS nn_text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN 't'; END $$;

-- Arity filtering's subject: a one-argument call can only be the first
-- overload, so its nn_text parameter types the argument (mechanism A).
CREATE FUNCTION ship(label nn_text) RETURNS text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN label; END $$;
CREATE FUNCTION ship(label nn_text, note text) RETURNS text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN label || note; END $$;

-- An OVERLOADED operator whose candidates agree on strictness: the
-- predicate gate works by consensus, while output-side body dispatch
-- stays single-candidate (the bodies differ).
CREATE FUNCTION same_ii(a integer, b integer) RETURNS boolean
  LANGUAGE plpgsql STRICT
  AS $$ BEGIN RETURN a = b; END $$;
CREATE FUNCTION same_tt(a text, b text) RETURNS boolean
  LANGUAGE plpgsql STRICT
  AS $$ BEGIN RETURN a = b; END $$;
CREATE OPERATOR #=# (LEFTARG = integer, RIGHTARG = integer, FUNCTION = same_ii);
CREATE OPERATOR #=# (LEFTARG = text, RIGHTARG = text, FUNCTION = same_tt);

-- Deliberately overloaded: resolveFunctionMetadata must refuse to pick one,
-- keeping both the output analysis (the text overload returns a NOT NULL
-- domain) and the argument analysis conservative for calls to this name.
-- plpgsql rather than sql so the overloads never collide in fnBodyAsts,
-- which is keyed by name alone.
CREATE FUNCTION over_fn(x text) RETURNS nn_text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN 'o'; END $$;
CREATE FUNCTION over_fn(x integer) RETURNS text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN 'i'; END $$;

-- LANGUAGE sql function with two params, old-style body using $1/$2:
-- concat_val(text, text) → text — returns $2 if $1 is not null
CREATE FUNCTION concat_val(a text, b text) RETURNS text
  LANGUAGE sql
  AS $$ SELECT $2 $$;

-- LANGUAGE sql function with two params, BEGIN ATOMIC body using named params:
-- pass_two(text, text) → text — returns the second param
CREATE FUNCTION pass_two(a text, b text) RETURNS text
  LANGUAGE sql
  BEGIN ATOMIC
    SELECT b;
  END;

-- ====================================================================
-- E-commerce schema (realistic SaaS domain).
-- The original t/u/v tables and functions above are retained so existing
-- fixtures keep working. Everything below extends the schema with a
-- self-referencing hierarchy, soft-delete columns, foreign keys, views,
-- and additional functions for complex fixture queries.
-- ====================================================================

-- Tables ---------------------------------------------------------------

-- Self-referencing category hierarchy (for recursive CTEs).
CREATE TABLE categories (
  id          integer  NOT NULL PRIMARY KEY,
  parent_id   integer  REFERENCES categories(id),
  slug        text     NOT NULL,
  name        text     NOT NULL,
  deleted_at  timestamptz
);

-- Customers (soft-delete via deleted_at).
CREATE TABLE customers (
  id          integer  NOT NULL PRIMARY KEY,
  email       text     NOT NULL,
  name        text,
  deleted_at  timestamptz
);

-- Products (nullable category FK for uncatalogued products; soft-delete).
CREATE TABLE products (
  id           integer  NOT NULL PRIMARY KEY,
  category_id  integer  REFERENCES categories(id),
  sku          text     NOT NULL,
  name         text     NOT NULL,
  price        numeric  NOT NULL,
  deleted_at   timestamptz
);

-- Orders (customer FK is NOT NULL; soft-delete).
CREATE TABLE orders (
  id           integer  NOT NULL PRIMARY KEY,
  customer_id  integer  NOT NULL REFERENCES customers(id),
  status       text     NOT NULL,
  placed_at    timestamptz NOT NULL,
  deleted_at   timestamptz
);

-- Order line items (both FKs NOT NULL).
--
-- `id` is an identity column: fixtures insert line items without naming a key,
-- as application code does. It starts at 1000 so that a data state supplying
-- explicit ids (all of which are below 1000) leaves the identity sequence with
-- room that no existing row occupies.
CREATE TABLE order_items (
  id           integer  NOT NULL PRIMARY KEY
                        GENERATED BY DEFAULT AS IDENTITY (START WITH 1000),
  order_id     integer  NOT NULL REFERENCES orders(id),
  product_id   integer  NOT NULL REFERENCES products(id),
  quantity     integer  NOT NULL,
  unit_price   numeric  NOT NULL
);

-- Product reviews (nullable comment; both FKs NOT NULL).
CREATE TABLE reviews (
  id           integer  NOT NULL PRIMARY KEY,
  product_id   integer  NOT NULL REFERENCES products(id),
  customer_id  integer  NOT NULL REFERENCES customers(id),
  rating       integer  NOT NULL,
  comment      text
);

-- Views ----------------------------------------------------------------

-- Simple updatable view. PG does NOT propagate attnotnull to view columns —
-- pg_attribute reports false for all five. The walk recovers the base
-- columns' nullability by analyzing this definition.
CREATE VIEW active_products AS
  SELECT id, category_id, sku, name, price
  FROM products
  WHERE deleted_at IS NULL;

-- Aggregate view. GROUP BY emits no empty groups and unit_price/quantity are
-- NOT NULL, so count(*) and the sum are both non-null at the view level;
-- an outer join onto the view is what makes them nullable at a use site.
CREATE VIEW order_summary AS
  SELECT
    order_id,
    count(*)    AS item_count,
    sum(unit_price * quantity) AS total
  FROM order_items
  GROUP BY order_id;

-- ====================================================================
-- Extended schema for extreme fixtures.
-- Only new entities are added here; existing tables/functions are not
-- modified.
-- ====================================================================

-- Domains ---------------------------------------------------------------

-- numeric NOT NULL, strictly positive.
CREATE DOMAIN positive_amount AS numeric NOT NULL CHECK (VALUE > 0);

-- text NOT NULL, non-empty.
CREATE DOMAIN non_empty_text AS text NOT NULL CHECK (length(VALUE) > 0);

-- numeric NOT NULL, 0-100 range.
CREATE DOMAIN discount_percent AS numeric NOT NULL CHECK (VALUE >= 0 AND VALUE <= 100);

-- Tables ---------------------------------------------------------------

-- Payment methods (all columns NOT NULL).
CREATE TABLE payment_methods (
  id     integer NOT NULL PRIMARY KEY,
  name   text   NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- Addresses with nullable columns (line2, postal_code) and a self-reference.
CREATE TABLE addresses (
  id                 integer NOT NULL PRIMARY KEY,
  customer_id        integer NOT NULL REFERENCES customers(id),
  line1              text NOT NULL,
  line2              text,
  city               text NOT NULL,
  state              text NOT NULL,
  postal_code        text,
  country            text NOT NULL DEFAULT 'US',
  default_address_id integer REFERENCES addresses(id)
);

-- Tags for many-to-many product tagging.
-- `id` is an identity column (see `order_items` for why it starts high):
-- `insert_tag` below inserts without naming a key, and is called once per row
-- of the outer query, so a fixed key would collide with itself on the second
-- row.
CREATE TABLE tags (
  id   integer NOT NULL PRIMARY KEY
                GENERATED BY DEFAULT AS IDENTITY (START WITH 1000),
  name text NOT NULL
);

CREATE TABLE product_tags (
  product_id integer NOT NULL REFERENCES products(id),
  tag_id     integer NOT NULL REFERENCES tags(id),
  PRIMARY KEY (product_id, tag_id)
);

-- Coupons with a discount_percent domain column.
CREATE TABLE coupons (
  id                integer NOT NULL PRIMARY KEY,
  code              text NOT NULL,
  discount_percent  discount_percent NOT NULL,
  expires_at        timestamptz
);

-- Shipments linking to orders with nullable timestamps. `id` is an identity
-- column (see `order_items`): the shipping-pipeline fixtures insert a shipment
-- per selected order without naming a key.
CREATE TABLE shipments (
  id           integer NOT NULL PRIMARY KEY
                       GENERATED BY DEFAULT AS IDENTITY (START WITH 1000),
  order_id     integer NOT NULL REFERENCES orders(id),
  carrier      text NOT NULL,
  tracking_no  text,
  shipped_at   timestamptz,
  delivered_at timestamptz
);

-- Views -----------------------------------------------------------------

-- View over a FULL JOIN (both sides optional in every column).
CREATE VIEW order_shipment_summary AS
  SELECT
    o.id   AS order_id,
    s.id   AS shipment_id,
    s.carrier
  FROM orders o
  FULL JOIN shipments s ON s.order_id = o.id;

-- Functions -------------------------------------------------------------

-- LANGUAGE sql function with 3 params, old-style body using $1/$2/$3.
-- Returns the concatenation of all three params. Since || is an A_Expr
-- (operator), the walk treats the body as nullable regardless of arg
-- nullability (conservative).
CREATE FUNCTION format_address_3(line1 text, line2 text, city text) RETURNS text
  LANGUAGE sql
  AS $$ SELECT $1 || COALESCE(', ' || $2, '') || ', ' || $3 $$;

-- Strict function with 3 params: non-null only if ALL args are non-null.
CREATE FUNCTION strict_concat_3(a text, b text, c text) RETURNS text
  LANGUAGE sql STRICT
  AS $$ SELECT $1 || $2 || $3 $$;

-- Function returning a NOT NULL domain (positive_amount).
CREATE FUNCTION always_positive(x numeric) RETURNS positive_amount
  LANGUAGE sql
  AS $$ SELECT 1 $$;

-- Function returning a NOT NULL domain (non_empty_text).
CREATE FUNCTION safe_name(x text) RETURNS non_empty_text
  LANGUAGE sql
  AS $$ SELECT 'safe' $$;

-- Function returning SETOF order_items (table function in FROM).
CREATE FUNCTION get_order_items(p_order_id integer) RETURNS SETOF order_items
  LANGUAGE sql
  AS $$ SELECT * FROM order_items WHERE order_id = $1 $$;

-- LANGUAGE sql function (BEGIN ATOMIC) with 3 named params, body uses
-- all three. Used to test named-param body recursion with 3 args.
CREATE FUNCTION build_label(a text, b text, c text) RETURNS text
  LANGUAGE sql
  BEGIN ATOMIC
    SELECT a || '-' || b || '-' || c;
  END;

-- Strict function with 3 params and BEGIN ATOMIC body.
CREATE FUNCTION strict_build(a text, b text, c text) RETURNS text
  LANGUAGE sql STRICT
  BEGIN ATOMIC
    SELECT a || b || c;
  END;

-- Multi-statement LANGUAGE sql function: INSERT then SELECT from table.
-- The catalog-adapter takes the last statement (SELECT). The walk must
-- detect that this SELECT has a FROM clause and is not an aggregate →
-- can return zero rows → function returns NULL.
CREATE TABLE multi_stmt_log (
  id     integer NOT NULL,
  val    text   NOT NULL
);

CREATE FUNCTION multi_stmt_fn(x text) RETURNS text
  LANGUAGE sql
  AS $$ INSERT INTO multi_stmt_log VALUES (1, $1); SELECT val FROM multi_stmt_log WHERE val = $1 $$;

-- Multi-statement LANGUAGE sql with BEGIN ATOMIC body and named params.
-- The last statement is SELECT b FROM table (has FROM → can be zero rows).
CREATE FUNCTION multi_stmt_atomic(a text, b text) RETURNS text
  LANGUAGE sql
  BEGIN ATOMIC
    INSERT INTO multi_stmt_log VALUES (2, a);
    SELECT b FROM multi_stmt_log WHERE val = a;
  END;

-- Multi-statement STRICT LANGUAGE sql (old-style, positional $1).
-- Strict = skip body when any arg is NULL. When all args are non-null,
-- the walk's strict dispatch returns true without analyzing the body.
CREATE FUNCTION strict_multi(x text) RETURNS text
  LANGUAGE sql STRICT
  AS $$ INSERT INTO multi_stmt_log VALUES (3, $1); SELECT $1 $$;

-- Multi-statement STRICT LANGUAGE sql (BEGIN ATOMIC, named params).
-- Same strict dispatch; body has multiple statements but is never
-- analyzed by the walk (strict short-circuits before body recursion).
CREATE FUNCTION strict_multi_atomic(a text, b text) RETURNS text
  LANGUAGE sql STRICT
  BEGIN ATOMIC
    INSERT INTO multi_stmt_log VALUES (4, a);
    SELECT b;
  END;

-- LANGUAGE plpgsql function returning a NOT NULL domain.
-- Priority 1 (NOT NULL domain return) wins over the language dispatch,
-- so even though we can't analyze plpgsql bodies, the result is non-null.
CREATE FUNCTION plpgsql_domain_fn(x text) RETURNS nn_text
  LANGUAGE plpgsql
  AS $$ BEGIN RETURN 'hello'; END; $$;

-- Table with JSONB columns for JSONB operator/function testing.
CREATE TABLE events (
  id     integer NOT NULL PRIMARY KEY,
  data   jsonb  NOT NULL,
  meta   jsonb
);

-- LANGUAGE sql function wrapping INSERT...RETURNING (single-row VALUES).
-- The walk detects single-row VALUES INSERT → single-row-guaranteed →
-- propagates the RETURNING column's nullability (tags.id is NOT NULL).
-- The key comes from the identity column and the name falls back to a literal,
-- so the function is callable once per row of a query and with a NULL argument
-- — both of which fixtures do.
CREATE FUNCTION insert_tag(p_name text) RETURNS integer
  LANGUAGE sql
  AS $$ INSERT INTO tags (name) VALUES (COALESCE($1, 'unnamed')) RETURNING id $$;

-- LANGUAGE sql function wrapping UPDATE...RETURNING (can match zero rows).
-- The walk returns nullable (the UPDATE's WHERE may match nothing).
CREATE FUNCTION update_tag_price(p_id integer, p_name text) RETURNS text
  LANGUAGE sql
  AS $$ UPDATE tags SET name = $2 WHERE id = $1 RETURNING name $$;

-- LANGUAGE sql function wrapping INSERT ... ON CONFLICT DO NOTHING RETURNING.
-- Contrast with insert_tag above: VALUES still supplies exactly one row, but
-- ON CONFLICT DO NOTHING suppresses it on a key collision and RETURNING
-- reports only rows actually written — so the function can return NULL.
CREATE FUNCTION insert_tag_upsert(p_id integer, p_name text) RETURNS integer
  LANGUAGE sql
  AS $$ INSERT INTO tags (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id $$;

-- Set-returning function with an explicit column list. A domain's NOT NULL is
-- part of the type and IS enforced on function output; a plain column
-- constraint is not (see get_order_items and the fixture that covers it).
CREATE FUNCTION order_lines(p_order_id integer)
  RETURNS TABLE(line_id integer, label nn_text, qty integer)
  LANGUAGE sql
  AS $$ SELECT oi.id, oi.id::text, oi.quantity FROM order_items oi WHERE oi.order_id = $1 $$;

-- Set-returning function over a NOT NULL domain: the element type carries the
-- constraint, so the single output column is non-null.
CREATE FUNCTION active_skus() RETURNS SETOF non_empty_text
  LANGUAGE sql
  AS $$ SELECT p.sku FROM products p WHERE p.deleted_at IS NULL $$;

-- Standalone composite type (not a table), used as a SETOF element type.
-- A composite's NOT NULL-free field list is the whole story: like a table row
-- type, it carries types only.
CREATE TYPE sku_pair AS (sku text, qty integer);

CREATE FUNCTION sku_pairs() RETURNS SETOF sku_pair
  LANGUAGE sql
  AS $$ SELECT p.sku, 1 FROM products p $$;

-- ---------------------------------------------------------------------------
-- CHECK-conditional nullability (the entailment kernel).
-- A status-discriminated nullable column is the motivating shape: which
-- columns are NULL is a function of a discriminator the CHECK constraints
-- spell out and queries filter on. Column order matters to the data
-- generator: `status` precedes the columns whose NULL policies read it.
-- ---------------------------------------------------------------------------
CREATE TABLE guest (
  id          integer PRIMARY KEY,
  status      text NOT NULL,
  arrived_at  timestamptz,
  room        text,
  note        text,
  vip_reason  text,
  badge       text,
  -- The motivating conditional: single-WHEN CASE over an OR of equalities.
  CONSTRAINT guest_arrival_state CHECK (
    CASE WHEN status = 'arrived' OR status = 'housed'
         THEN arrived_at IS NOT NULL
         ELSE arrived_at IS NULL END),
  -- Implication spelled as OR: falsifying the first disjunct by the
  -- builtin negator pairing leaves the IS NOT NULL remainder notFALSE.
  CONSTRAINT guest_housed_room CHECK (status <> 'housed' OR room IS NOT NULL),
  -- AND-concatenated: one constraint, two independent notFALSE facts.
  CONSTRAINT guest_status_note CHECK (
    status IN ('in-flight', 'arrived', 'housed', 'checked-out')
    AND (status <> 'checked-out' OR note IS NOT NULL))
);

-- The convalidated=false negatives, one per rendering. Both are goal-deriving
-- shapes the engine MUST ignore (convalidated=false covers both — measured):
-- NOT ENFORCED constraints never gate writes, so vip_reason CAN be NULL in
-- fixture data (the witnessable negative); NOT VALID still gates NEW writes,
-- so no fixture row can violate guest_badge_claimed and the engine ignoring
-- it is held by the fixture annotation instead.
ALTER TABLE guest ADD CONSTRAINT guest_vip_reason
  CHECK (vip_reason IS NOT NULL) NOT ENFORCED;
ALTER TABLE guest ADD CONSTRAINT guest_badge_claimed
  CHECK (badge IS NOT NULL) NOT VALID;

-- A plain projection view over guest: the origin-tracking fixtures filter it
-- from OUTSIDE, which only narrows because each view column carries its
-- provenance (rowPath) out of the definition.
CREATE VIEW guest_directory AS
  SELECT id, status, arrived_at, room, note FROM guest;

-- ---------------------------------------------------------------------------
-- Collation-gated distinctness (Wave 9).
-- ---------------------------------------------------------------------------

-- The user's motivating shape verbatim: a generated discriminator whose CASE
-- ties each verdict to a fraud_score condition. Filtering on the verdict
-- selects an arm; the arm's condition is what the kernel derives.
CREATE TABLE txn (
  id integer PRIMARY KEY,
  fraud_score numeric,
  verdict text GENERATED ALWAYS AS (
    CASE WHEN fraud_score >= 75 THEN 'fraud'
         WHEN fraud_score >= 30 THEN 'manual-check'
         WHEN fraud_score < 30 THEN 'no-fraud'
         WHEN fraud_score IS NULL THEN 'manual-check'
         ELSE NULL END) STORED
);

-- Multi-WHEN CHECK CASEs: reaching the second arm requires falsifying the
-- first, which distinctness grants for kind (text, deterministic collation)
-- and must refuse for n (numeric: 1 and 1.0 are distinct tokens, equal
-- values).
CREATE TABLE audit_log (
  id integer PRIMARY KEY,
  kind text NOT NULL,
  actor text,
  bot_id text,
  n integer,
  a text,
  b text,
  CHECK (CASE WHEN kind = 'manual' THEN actor IS NOT NULL
              WHEN kind = 'auto' THEN bot_id IS NOT NULL END),
  CHECK (CASE WHEN n = 1 THEN a IS NOT NULL WHEN n = 2 THEN b IS NOT NULL END)
);

-- The collation gate's counterexample. Under a real case-insensitive ICU
-- collation, WHERE tag = 'A' returns the stored tag='a' row; ungated
-- byte-distinctness would falsify that row's TRUE first arm, step to the
-- second, and claim x non-null — which the row's NULL x falsifies. The
-- gate refuses nondeterministic collations, so the claim stays nullable.
-- MEASURED PGlite limitation: the catalog records collisdeterministic=false
-- (which is all the engine consumes), but comparisons behave bytewise —
-- 'a' = 'A' is false here — so the witness row is unreachable and the
-- fixture pins the refusal by annotation instead.
CREATE COLLATION ci (provider = icu, locale = 'und-u-ks-level2', deterministic = false);
CREATE TABLE nd (
  tag text COLLATE ci NOT NULL,
  x text,
  CHECK (CASE WHEN tag = 'a' THEN x IS NULL
              WHEN tag IS NOT NULL THEN x IS NOT NULL END)
);

-- Wave 11: simple-CASE CHECK desugaring and negative-guard entailment.
-- The first CHECK is `CASE code WHEN …` — the implicit equality the kernel
-- synthesizes; the second is the implication the ELSE branch of a
-- `CASE WHEN combo IS NULL …` projection discharges via a NOT-taken total
-- guard (FALSE(combo IS NULL) → the OR's live disjunct).
CREATE TABLE locker (
  code      text NOT NULL,
  combo     text,
  opened_at timestamptz,
  CHECK (CASE code WHEN 'assigned' THEN combo IS NOT NULL ELSE true END),
  CHECK (combo IS NULL OR opened_at IS NOT NULL)
);

-- Wave 11b: the derivation fixpoint's depth subject — three constraints,
-- each consuming the previous one's harvested conclusion.
CREATE TABLE chain3 (
  stage text NOT NULL,
  a text,
  b text,
  c timestamptz,
  CHECK (stage <> 'go' OR a IS NOT NULL),
  CHECK (a IS NULL OR b IS NOT NULL),
  CHECK (b IS NULL OR c IS NOT NULL)
);

-- Wave 11c: comparison totality for negative guards. qty is NOT NULL, so
-- `qty > 0` can never evaluate NULL — the CASE's ELSE certifies its
-- falsity, and the CHECK written around the SAME literal consumes it.
CREATE TABLE stock (
  qty integer NOT NULL,
  discontinued_at timestamptz,
  CHECK (qty > 0 OR discontinued_at IS NOT NULL)
);

-- The comparison-harvest residue's subject (register: harvested facts are
-- NullTests only): CHECK₁'s arm concludes seats > 1, which CHECK₂'s
-- same-token `seats <= 1` disjunct would consume — once comparisons whose
-- operands the fixpoint has pinned are harvested.
CREATE TABLE subscription (
  plan text NOT NULL,
  seats integer,
  overflow_contact text,
  CHECK (CASE WHEN plan = 'team' THEN seats IS NOT NULL AND seats > 1 ELSE true END),
  CHECK (seats <= 1 OR overflow_contact IS NOT NULL)
);

-- The bpchar padding gate (adversarial finding 4). character(n) comparison
-- strips trailing blanks BEFORE the collation is consulted — 'a'::char(4) =
-- 'a ' is TRUE (measured) — so distinct tokens can name equal values and
-- literal distinctness is never sound for bpchar, however deterministic the
-- collation. bp reaches the hazard through an OR-CHECK, bp2 through a
-- multi-WHEN CASE; vc is the varchar control, where trailing blanks stay
-- significant, the tokens really are distinct, and the same derivation is
-- sound — ('a', NULL) is refused there (measured).
CREATE TABLE bp (k char(4) NOT NULL, x text, CHECK (k = 'a ' OR x IS NOT NULL));
CREATE TABLE bp2 (k char(4) NOT NULL, x text,
  CHECK (CASE WHEN k = 'a' THEN x IS NULL WHEN k = 'a ' THEN x IS NOT NULL END));
CREATE TABLE vc (k varchar(4) NOT NULL, x text, CHECK (k = 'a ' OR x IS NOT NULL));
