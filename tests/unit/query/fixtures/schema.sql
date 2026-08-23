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
-- candidates disagree and keep refusing. plpgsql throughout, which was once
-- required (fnBodyAsts collided on the name) and is now only what keeps these
-- subjects about CONSENSUS rather than about body reading.
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

-- Overloads whose VERDICTS diverge, for the typed selection: the integer
-- row returns a NOT NULL domain, the text row can return NULL. plpgsql on
-- purpose — no body read, so the name-keyed body map is never consulted
-- and the selection is observable through priority 1 alone.
CREATE FUNCTION pick(a integer) RETURNS nn_text
  LANGUAGE plpgsql AS $$ BEGIN RETURN 'i'; END $$;
CREATE FUNCTION pick(a text) RETURNS text
  LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;

-- Deliberately overloaded: resolveFunctionMetadata must refuse to pick one,
-- keeping both the output analysis (the text overload returns a NOT NULL
-- domain) and the argument analysis conservative for calls to this name.
-- plpgsql rather than sql, which once mattered because the overloads would
-- have collided in fnBodyAsts and now only keeps the subject narrow.
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
  deleted_at   timestamptz,
  -- Nullable, because an order exists before it is paid for. Its key is added
  -- after `payment_methods` below, which is declared later in this file.
  payment_method_id integer
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

-- The key from `orders`, declared here because `payment_methods` is. It is the
-- only key reaching this table, which had none — so it sat outside the join
-- graph entirely, and its `active` flag was the schema's only BOOLEAN column a
-- generated query could have projected.
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_fk
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id);

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

-- Application tables carrying the catalog features that used to exist only on
-- single-purpose probe relations (`sw4_*`, `fk_*`). Those stay for the
-- fixtures that pin them and are excluded from generation; these are what a
-- generator ranges over, so a generated query looks like one somebody would
-- write. Each shape below is the ordinary reason an application has it.

-- A high-volume event log, partitioned by id range the way one is. This is
-- also the REFERENCING-side-partitioned shape: the key onto `orders` is
-- recorded once per partition, all with the same target.
CREATE TABLE order_events (
  id       integer NOT NULL,
  order_id integer NOT NULL REFERENCES orders(id),
  kind     text NOT NULL,
  note     text,
  PRIMARY KEY (id)
) PARTITION BY RANGE (id);
CREATE TABLE order_events_early PARTITION OF order_events FOR VALUES FROM (0) TO (100);
CREATE TABLE order_events_late  PARTITION OF order_events FOR VALUES FROM (100) TO (200);

-- A note attached to an event. Its key points AT a partitioned table, so
-- pg_constraint records one CLONE per partition on top of the declared row,
-- and none of the clones means "every note matches THIS partition" —
-- sweep-4 finding 4, in a shape an application would actually write.
CREATE TABLE order_event_notes (
  id       integer NOT NULL PRIMARY KEY,
  event_id integer NOT NULL REFERENCES order_events(id),
  body     text NOT NULL
);

-- Refunds, with the legacy inheritance a long-lived schema accumulates: the
-- parent declares the key and the child does NOT inherit it (measured), so a
-- tree scan of `refunds` reads archive rows the key never checked.
CREATE TABLE refunds (
  id       integer NOT NULL PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id),
  amount   positive_amount NOT NULL
);
CREATE TABLE refunds_archive () INHERITS (refunds);

-- The other direction: a key pointing AT an inheritance parent. A parent holds
-- its OWN rows, so `ONLY warehouses` is exactly where the match lives — the
-- opposite of the partitioned case, where the parent holds none.
-- `code` is UNIQUE, the way a warehouse code is. contype 'u' had never reached
-- the snapshot from this schema — every referenced side was a PRIMARY KEY — so
-- the constraint kind the walk captures and does not read had no instance.
CREATE TABLE warehouses (
  id   integer NOT NULL PRIMARY KEY,
  code text NOT NULL UNIQUE
);
CREATE TABLE warehouses_overflow () INHERITS (warehouses);
CREATE TABLE stock_moves (
  id           integer NOT NULL PRIMARY KEY,
  warehouse_id integer NOT NULL REFERENCES warehouses(id),
  qty          integer NOT NULL
);

-- A DEFERRABLE key: the invoice and its order are written together and checked
-- at commit, which is the reason to declare one — and it is violable
-- mid-transaction, so the engine may not reason from it.
CREATE TABLE invoices (
  id       integer NOT NULL PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) DEFERRABLE INITIALLY IMMEDIATE,
  total    positive_amount NOT NULL
);

-- A key added to a table that already had history, NOT VALID so the migration
-- does not rewrite it. Pre-existing rows are unchecked.
CREATE TABLE legacy_order_notes (
  id       integer NOT NULL PRIMARY KEY,
  order_id integer NOT NULL,
  body     text NOT NULL
);
ALTER TABLE legacy_order_notes
  ADD CONSTRAINT legacy_order_notes_order_fk
  FOREIGN KEY (order_id) REFERENCES orders(id) NOT VALID;

-- A 1:1 extension table whose PRIMARY KEY is its foreign key, so it shares the
-- parent's column name — the ordinary shape in which `USING (id)` or a NATURAL
-- join synthesises exactly the key equality and nothing else.
CREATE TABLE order_gift_wrap (
  id      integer NOT NULL PRIMARY KEY REFERENCES orders(id),
  message text
);

-- A shipment moving in several hops, keyed by (shipment, leg) — the ordinary
-- reason a table has a composite primary key.
CREATE TABLE shipment_legs (
  shipment_id integer NOT NULL REFERENCES shipments(id),
  leg_no      integer NOT NULL,
  carrier     text NOT NULL,
  PRIMARY KEY (shipment_id, leg_no)
);

-- A scan event on one leg. Its foreign key is COMPOSITE, which is the input
-- the entailment gate REJECTS: `resolveForeignKey` reads single-column keys
-- only, and a gate with nothing to reject is untested. The engine must decline
-- the whole key rather than half-read one column of it.
CREATE TABLE leg_scans (
  id          integer NOT NULL PRIMARY KEY,
  shipment_id integer NOT NULL,
  leg_no      integer NOT NULL,
  location    text,
  FOREIGN KEY (shipment_id, leg_no) REFERENCES shipment_legs(shipment_id, leg_no)
);

-- A state machine's states, the ordinary reason a schema declares an enum.
CREATE TYPE shipment_state AS ENUM ('pending', 'in_transit', 'delivered', 'returned');

-- A domain over a DOMAIN: money that is positive (the base domain's rule) and
-- also within a declared cap. Domains resolve transitively, which is a
-- different code path from a domain over a base type.
CREATE DOMAIN capped_amount AS positive_amount CHECK (VALUE <= 100000);

-- Shipment tracking, carrying the column kinds a long-lived application schema
-- accumulates and this one had none of: an ENUM state, a domain over a domain,
-- a VIRTUAL generated column (computed on read, PG18 — a different mode from
-- the STORED one `gm` carries), and an identity the application may never
-- supply a value for.
CREATE TABLE shipment_tracking (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id    integer NOT NULL REFERENCES shipments(id),
  state          shipment_state NOT NULL,
  declared_value capped_amount,
  weight_kg      numeric NOT NULL,
  weight_g       numeric GENERATED ALWAYS AS (weight_kg * 1000) VIRTUAL
);

-- No two bookings of the same warehouse dock slot. An EXCLUDE constraint is
-- how a schema says that; `ConstraintType` has admitted 'exclusion' all along
-- with nothing to produce one.
CREATE TABLE dock_slots (
  id           integer NOT NULL PRIMARY KEY,
  warehouse_id integer NOT NULL REFERENCES warehouses(id),
  slot         integer NOT NULL,
  EXCLUDE USING btree (warehouse_id WITH =, slot WITH =)
);

-- A key the team declared and asked PostgreSQL not to enforce (PG18), because
-- the writer is a bulk loader whose rows arrive out of order. `convalidated`
-- is false for it, which is the bit the entailment gate reads — so this is the
-- input that gate rejects, distinct from the NOT VALID one above.
CREATE TABLE inbound_receipts (
  id           integer NOT NULL PRIMARY KEY,
  warehouse_id integer NOT NULL,
  qty          integer NOT NULL,
  CONSTRAINT inbound_receipts_wh_fk FOREIGN KEY (warehouse_id)
    REFERENCES warehouses(id) NOT ENFORCED
);

-- A procedure. It has no call site in a SELECT, so no generated query reaches
-- it; what it exercises is the SNAPSHOT's prokind 'p' branch, which had no
-- instance.
CREATE PROCEDURE close_shipment(p_id integer)
LANGUAGE sql AS $$
  UPDATE shipments SET delivered_at = now() WHERE id = p_id;
$$;

-- A second schema, because an application has one. `billing.invoices` repeats
-- a table NAME public already carries — the shape `inPath`'s first-schema-wins
-- rule decides — and `fee` is carried by both schemas with different argument
-- types, which is the case unqualified lookup must MERGE across the path
-- rather than resolve by first schema.
CREATE SCHEMA billing;
CREATE TABLE billing.invoices (
  id       integer NOT NULL PRIMARY KEY,
  order_id integer NOT NULL,
  exported boolean NOT NULL DEFAULT false
);
CREATE FUNCTION fee(amount integer) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT amount / 20 $$;
CREATE FUNCTION billing.fee(amount numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT amount * 0.03 $$;

-- A materialized view over the warehouse tables. It holds its own rows, so it
-- must be REFRESHed once the data states have loaded — the data files and
-- `fixture-data/generate.ts` each end with one.
CREATE MATERIALIZED VIEW warehouse_totals AS
  SELECT w.id AS warehouse_id, w.code AS code, count(sm.id) AS moves
  FROM warehouses w
  LEFT JOIN stock_moves sm ON sm.warehouse_id = w.id
  GROUP BY w.id, w.code;

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
-- The catalog-adapter keeps every statement and hands the walk the last one
-- (SELECT) plus the ones before it. The SELECT has a FROM clause and is not an
-- aggregate, so on its own it could return zero rows — and it cannot, because
-- the INSERT one statement earlier wrote the very row its WHERE looks for.
-- The comment here used to say "→ function returns NULL", which was the
-- ENGINE's verdict written down as if it were PostgreSQL's.
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

-- Controls for the rule that reads an earlier INSERT to settle a later scan's
-- row count. Each body is `multi_stmt_fn`'s shape with ONE thing changed, and
-- PostgreSQL returns NULL for every one of them.
--
-- `ms_ctl` carries no constraints, so the repeated inserts a per-row call
-- makes are all legal; `ms_conflict` has the primary key the ON CONFLICT
-- control needs, which is also what makes that control witness itself — the
-- first row inserts, and every row after it conflicts and inserts nothing.
CREATE TABLE ms_ctl (id integer NOT NULL, val text NOT NULL);
CREATE TABLE ms_conflict (id integer PRIMARY KEY, val text NOT NULL);

-- A second write to the same table, which can take the row back out. This is
-- the gate the STATEMENT ORDER matters for.
CREATE FUNCTION ms_ctl_delete(x text) RETURNS text LANGUAGE sql
  AS $$ INSERT INTO ms_ctl VALUES (1, 'd:' || $1);
        DELETE FROM ms_ctl WHERE val = 'd:' || $1;
        SELECT val FROM ms_ctl WHERE val = 'd:' || $1 $$;

-- The value written is not the value looked for.
CREATE FUNCTION ms_ctl_other(x text) RETURNS text LANGUAGE sql
  AS $$ INSERT INTO ms_ctl VALUES (2, 'a:' || $1);
        SELECT val FROM ms_ctl WHERE val = 'b:' || $1 $$;

-- ON CONFLICT DO NOTHING can insert nothing, and the row it conflicted WITH
-- need not be the row the scan wants — here it never is, since the conflict is
-- on `id` and the scan reads `val`.
CREATE FUNCTION ms_ctl_conflict(x text) RETURNS text LANGUAGE sql
  AS $$ INSERT INTO ms_conflict VALUES (3, 'c:' || $1) ON CONFLICT DO NOTHING;
        SELECT val FROM ms_conflict WHERE val = 'c:' || $1 $$;

-- INSERT ... SELECT can insert zero rows; only a single-row VALUES plainly
-- writes one.
CREATE FUNCTION ms_ctl_select(x text) RETURNS text LANGUAGE sql
  AS $$ INSERT INTO ms_ctl SELECT 4, 'i:' || $1 WHERE false;
        SELECT val FROM ms_ctl WHERE val = 'i:' || $1 $$;

-- The scan side can still throw the row away after finding it: LIMIT here,
-- HAVING below. OFFSET is gated with them and shares their controls' logic.
CREATE FUNCTION ms_ctl_limit(x text) RETURNS text LANGUAGE sql
  AS $$ INSERT INTO ms_ctl VALUES (5, 'l:' || $1);
        SELECT val FROM ms_ctl WHERE val = 'l:' || $1 LIMIT 0 $$;

CREATE FUNCTION ms_ctl_having(x text) RETURNS text LANGUAGE sql
  AS $$ INSERT INTO ms_ctl VALUES (6, 'h:' || $1);
        SELECT val FROM ms_ctl WHERE val = 'h:' || $1
        GROUP BY val HAVING count(*) > 5 $$;

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

-- The kernel's atom-oracle demand experiment (docs/subtree-evaluation.md,
-- "The kernel's atom oracle"; demand discipline: rungs charter on
-- conviction). Two branch-correlated CHECK shapes, here so the discovery
-- distribution can show whether CASE guards over their constrained columns
-- arise often enough to carry weight. tri is same-operand trichotomy
-- (notFALSE(a > 5) refutes `a <= 5` with no values consulted); bcorr is
-- arm selection under WHERE evidence. A NULL `a` passes both CHECKs, so
-- the data generator always has a conforming row.
CREATE TABLE tri (
  id integer PRIMARY KEY,
  a  integer,
  CHECK (a > 5)
);
-- Column order matters to the data generator: `b` precedes `a` so the
-- value tier can pick an `a` that satisfies the arm `b` selected.
CREATE TABLE bcorr (
  id integer PRIMARY KEY,
  b  boolean,
  a  integer,
  CHECK (CASE WHEN b THEN a < 5 ELSE a >= 5 END)
);

-- The interval-exclusivity shape families (docs/subtree-evaluation.md,
-- "Interval exclusivity over btree strategies"), one table per shape the
-- emptiness algebra distinguishes, with data whose BOUNDARY rows are the
-- witnesses the guard columns need (g = 5 fires `g <= 5`; NaN satisfies
-- `f > 5` under btree order). stx exists for the REFUSAL record: its
-- claim would be true, and the collation gate must keep refusing it —
-- held by an @unwitnessable annotation, not silence. ivdt's record
-- FLIPPED when design B landed (2026-08-16): its ISO anchors order
-- (check-interval-datetime.sql) and the refusal lives on in the
-- ambiguous-form column there.
CREATE TABLE ivp (p int, CHECK (p = 5));
CREATE TABLE ivge (g int, CHECK (g >= 5));
CREATE TABLE ivf (f float8, CHECK (f > 5));
CREATE TABLE ivnm (n numeric, CHECK (n > 5.5));
CREATE TABLE ivne (z int, CHECK (z <> 5));
CREATE TABLE ivstx (s text, CHECK (s > 'm'));
CREATE TABLE ivstxc (s text COLLATE "C", CHECK (s > 'm'));
CREATE TABLE ivstxeq (s text COLLATE "C", CHECK (s = 'alpha'));
CREATE TABLE ivdt (d date, CHECK (d > '2020-01-01'));

-- A metrics log partitioned by DATE range — the single most common
-- real-world source of constant-date constraints, and the argued-real
-- ground where the partition-bound and datetime rungs compose
-- (docs/subtree-evaluation.md, both charters): the bound renders its
-- anchors as ISO-shaped date casts, the value-shape gate admits them,
-- and a direct partition scan orders date anchors. `day` is deliberately
-- NOT declared NOT NULL: its notNull on direct scans is the bound's own
-- claim, which the integer families' declared keys could not witness.
CREATE TABLE daily_metrics (day date, v integer) PARTITION BY RANGE (day);
CREATE TABLE daily_metrics_q1 PARTITION OF daily_metrics FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE daily_metrics_q2 PARTITION OF daily_metrics FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- A courier ledger split by explicit region lists — the everyday LIST
-- deployment, and the list-membership rung's argued-real ground
-- (docs/subtree-evaluation.md, "List membership exclusion"): a direct
-- scan of courier_north carries the bound's notNull prefix AND its
-- membership, which excludes any point outside {north, east}.
-- courier_south lists NULL — the claims-nothing twin: no prefix, and the
-- IS NULL arm keeps the whole fact outside the point/interval machinery.
CREATE TABLE courier_jobs (region text, ref integer) PARTITION BY LIST (region);
CREATE TABLE courier_north PARTITION OF courier_jobs FOR VALUES IN ('north', 'east');
CREATE TABLE courier_south PARTITION OF courier_jobs FOR VALUES IN (NULL, 'south');

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

-- The inheritance attnotnull divergence (adversarial finding 3).
-- `ALTER TABLE ONLY parent … SET NOT NULL` is legal (measured): parent
-- attnotnull=true, child false, and a child-stored NULL comes back through
-- a tree scan of the parent. CHECK constraints cannot reach this shape —
-- they are copied to every child's own pg_constraint and cannot be dropped
-- or invalidated there (measured).
CREATE TABLE inh_p (id integer, a text);
CREATE TABLE inh_c () INHERITS (inh_p);
ALTER TABLE ONLY inh_p ALTER COLUMN a SET NOT NULL;

-- Write-path rewriting (adversarial finding 2): RETURNING reports the row
-- AFTER PostgreSQL's rewrite stage. trig_t's BEFORE trigger nulls a written
-- value; iot_v's INSTEAD OF trigger reports whatever NEW it builds, the
-- view's own definition expressions never evaluated (measured — the literal
-- lit comes back NULL); rule_src's DO INSTEAD rule replaces the statement
-- outright, which the engine refuses (pinned in unsupported-nodes.test.ts).
-- DELETE needs none of this: a modified OLD is ignored for both trigger
-- forms and the reported row is the row as read (measured).
CREATE TABLE trig_t (id integer PRIMARY KEY, a text, b text NOT NULL);
CREATE FUNCTION trig_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.a := NULL; RETURN NEW; END $$;
CREATE TRIGGER trig_before BEFORE INSERT OR UPDATE ON trig_t
  FOR EACH ROW EXECUTE FUNCTION trig_fn();

CREATE TABLE rule_src (id integer NOT NULL, a text NOT NULL);
CREATE TABLE rule_dst (id integer, a text);
CREATE RULE r_ins AS ON INSERT TO rule_src DO INSTEAD
  INSERT INTO rule_dst VALUES (NEW.id, NULL) RETURNING id, a;

CREATE TABLE iot_base (id integer PRIMARY KEY, k text NOT NULL);
CREATE VIEW iot_v AS SELECT id, k, 'x'::text AS lit FROM iot_base;
CREATE FUNCTION iot_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO iot_base VALUES (NEW.id, NEW.k);
  NEW.k := NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER iot_t INSTEAD OF INSERT ON iot_v
  FOR EACH ROW EXECUTE FUNCTION iot_fn();

-- A user record-returning function (adversarial finding 13): the column
-- definition list at the call site is what makes it legal at all, and it
-- fully determines the shape — including when catalog metadata EXISTS and
-- would otherwise resolve "SETOF record" to a single scalar column.
CREATE FUNCTION rec_pairs() RETURNS SETOF record LANGUAGE sql
  AS $$ SELECT 1, 'a'::text $$;

-- A partitioned table (adversarial finding 11): relkind 'p', once absent
-- from the snapshot entirely, so star expansion silently contributed zero
-- columns. The parent is now captured alongside its partitions, and an
-- unresolvable relation REFUSES instead of falling back.
CREATE TABLE part_p (id integer NOT NULL, k text) PARTITION BY RANGE (id);
CREATE TABLE part_1 PARTITION OF part_p FOR VALUES FROM (0) TO (100);
-- `part_2` is itself PARTITIONED — the schema's only two-level tree. Every
-- other partition and inheritance tree here is one level deep, so the subtree
-- walks behind notNullTree, writeRewritesTree, resolveGenerationExprTree and
-- resolveForeignKeyTree never left their base case: a grandchild was never
-- reached, and `hasDescendants` was never asked of a relation that is itself
-- a descendant.
CREATE TABLE part_2 PARTITION OF part_p FOR VALUES FROM (100) TO (200)
  PARTITION BY RANGE (id);
CREATE TABLE part_2a PARTITION OF part_2 FOR VALUES FROM (100) TO (150);
-- The trigger sits on the GRANDCHILD. A write naming part_p routes two levels
-- down and fires it (measured), so `writeRewritesTree` has to union over the
-- whole subtree rather than over immediate children — the one fact a
-- single-level tree cannot distinguish.
CREATE FUNCTION part_gc_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.k := NULL; RETURN NEW; END $$;
CREATE TRIGGER part_gc_before BEFORE INSERT ON part_2a
  FOR EACH ROW EXECUTE FUNCTION part_gc_fn();

-- STRICT is not TOTAL (adversarial finding 5): a declared-strict function
-- returns NULL for NULL input and says nothing about non-null input.
-- strict_nullish/strict_nullish_pl return NULL outright; lookup_name is the
-- realistic shape — a strict lookup whose row need not exist; <-> reaches
-- the same hole through an operator's backing function.
CREATE FUNCTION strict_nullish(x text) RETURNS text
  LANGUAGE sql STRICT AS $$ SELECT NULL::text $$;
CREATE FUNCTION strict_nullish_pl(x text) RETURNS text
  LANGUAGE plpgsql STRICT AS $$ BEGIN RETURN NULL; END $$;
CREATE FUNCTION lookup_name(p integer) RETURNS text
  LANGUAGE sql STRICT AS $$ SELECT c.name FROM customers c WHERE c.id = p $$;
CREATE FUNCTION strict_none(a text, b text) RETURNS text
  LANGUAGE sql STRICT AS $$ SELECT NULL::text $$;
CREATE OPERATOR <-> (LEFTARG = text, RIGHTARG = text, FUNCTION = strict_none);

-- A non-null INITCOND fixes the EMPTY-input result only (adversarial
-- finding 6): agg_nullify's transition returns NULL for every row,
-- agg_finalnull's FINALFUNC does — both measured returning NULL over
-- non-empty input while the INITCOND rule claimed otherwise.
CREATE FUNCTION nullify_sfunc(state bigint, val integer) RETURNS bigint
  LANGUAGE sql AS $$ SELECT NULL::bigint $$;
CREATE AGGREGATE agg_nullify(integer) (SFUNC = nullify_sfunc, STYPE = bigint, INITCOND = '0');
CREATE FUNCTION final_null(state bigint) RETURNS bigint
  LANGUAGE sql AS $$ SELECT NULL::bigint $$;
CREATE AGGREGATE agg_finalnull(integer)
  (SFUNC = count_it_sfunc, STYPE = bigint, INITCOND = '0', FINALFUNC = final_null);

-- Two more aggregates, each the control for one gate of the fold rule that
-- reads count_it's transition. Both are non-null claims the rule must REFUSE,
-- and PostgreSQL returns NULL for both, so a gate that stops working is
-- falsified rather than merely unannotated.
--
-- agg_strict_noinit: no INITCOND, so the state starts NULL — and because the
-- transition is STRICT, PostgreSQL SKIPS every NULL input instead of calling
-- it, so over an all-NULL group nothing transitions and the NULL initial
-- state is the result. Its transition body is the same non-null-preserving
-- `state + 1` count_it uses, which is the point: only the missing INITCOND
-- separates the two.
-- STYPE is `integer` rather than count_it's `bigint` because PostgreSQL
-- REFUSES the initcond-free strict form otherwise ("must not omit initial
-- value when transition function is strict and transition type is not
-- compatible with input type" — measured). The reason is the same fact this
-- control turns on: with a strict transition and no INITCOND, the first input
-- value BECOMES the initial state, so the two types have to agree.
CREATE FUNCTION strict_step_sfunc(state integer, val integer) RETURNS integer
  LANGUAGE sql STRICT AS $$ SELECT state + 1 $$;
CREATE AGGREGATE agg_strict_noinit(integer) (SFUNC = strict_step_sfunc, STYPE = integer);

-- agg_sum_step: INITCOND '0' and a transition that READS its value argument.
-- The fold rule walks a transition under its weakest hypothesis — state
-- assumed non-null, every value argument assumed NULL — and this is the
-- aggregate that makes the choice matter: `state + val` is non-null only
-- when `val` is, so assuming the arguments non-null would claim this one and
-- PostgreSQL answers NULL for any group holding a NULL.
CREATE FUNCTION sum_step_sfunc(state bigint, val integer) RETURNS bigint
  LANGUAGE sql AS $$ SELECT state + val $$;
CREATE AGGREGATE agg_sum_step(integer) (SFUNC = sum_step_sfunc, STYPE = bigint, INITCOND = '0');

-- agg_ambiguous: the transition function's NAME is overloaded, and the two
-- bodies disagree about nullability. `SFUNC = amb_sfunc` with STYPE bigint
-- over an integer input resolves to the (bigint, integer) overload, which
-- returns NULL — so the honest answer is nullable, and reaching for the OTHER
-- overload's `state + 1` would be unsound rather than conservative.
--
-- Two layers refuse this and only one is active. The adapter declines to
-- resolve an ambiguous SQL-bodied name at all, so the fold rule never gets a
-- body; behind that, the fold rule rebuilds the signature key and compares.
-- The second is redundant TODAY and is what would have to hold if the first
-- were lifted — which is a live possibility, since that guard is recorded as
-- inert in this corpus.
CREATE FUNCTION amb_sfunc(state bigint, val integer) RETURNS bigint
  LANGUAGE sql AS $$ SELECT NULL::bigint $$;
CREATE FUNCTION amb_sfunc(state bigint, val text) RETURNS bigint
  LANGUAGE sql AS $$ SELECT state + 1 $$;
CREATE AGGREGATE agg_ambiguous(integer) (SFUNC = amb_sfunc, STYPE = bigint, INITCOND = '0');

-- The hooks are the relation SET's, not the named relation's (post-phase
-- probe, 2026-08-05): tuple routing fires the PARTITION's BEFORE ROW
-- trigger for an INSERT through the parent, and an UPDATE through an
-- inheritance parent fires the CHILD's trigger for child rows (both
-- measured). trig_part's partition trigger nulls a and rescues a NULL b;
-- inh_c gains a BEFORE UPDATE trigger nulling a — the parent inh_p
-- carries no trigger at all.
CREATE TABLE trig_part (id integer NOT NULL, a text, b text NOT NULL)
  PARTITION BY RANGE (id);
CREATE TABLE trig_part_1 PARTITION OF trig_part FOR VALUES FROM (0) TO (100);
CREATE FUNCTION trig_part_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.a := NULL;
  IF NEW.b IS NULL THEN NEW.b := 'rescued'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trig_part_before BEFORE INSERT ON trig_part_1
  FOR EACH ROW EXECUTE FUNCTION trig_part_fn();
CREATE TRIGGER inh_c_before BEFORE UPDATE ON inh_c
  FOR EACH ROW EXECUTE FUNCTION trig_fn();

-- Infinite temporal values (adversarial-2 finding 11): extract/date_part
-- return NULL for every non-monotonic field of an infinite timestamp, date
-- or interval — month/day/hour of 'infinity' are NULL while epoch/year are
-- ±Infinity — which is why the pair is out of STRICT_TOTAL_BUILTINS. The
-- columns are NOT NULL so the NULLs the fixture witnesses are the
-- function's own, not the input's.
CREATE TABLE inf_t (id integer NOT NULL, ts timestamp NOT NULL, iv interval NOT NULL);

-- CHECK … NO INHERIT (adversarial-2 finding 2): never copied to a child's
-- pg_constraint — the ONLY CHECK divergence route PostgreSQL permits (ONLY
-- ADD, child DROP, per-child enforceability, ONLY VALIDATE were all
-- measured refused) — so a tree scan of a parent with descendants must not
-- read it, while `FROM ONLY` may. ni_p carries the bare form, ni2_p the
-- discriminated form the entailment kernel exists for; both children are
-- unconstrained and their generated rows are the witnesses.
CREATE TABLE ni_p (id integer NOT NULL, x text, CHECK (x IS NOT NULL) NO INHERIT);
CREATE TABLE ni_c () INHERITS (ni_p);
CREATE TABLE ni2_p (id integer NOT NULL, status text NOT NULL, note text,
  CONSTRAINT ni2_note CHECK (status <> 'open' OR note IS NOT NULL) NO INHERIT);
CREATE TABLE ni2_c () INHERITS (ni2_p);

-- Partition row movement (adversarial-2 finding 1): an UPDATE through the
-- parent that moves a row to another partition is performed as DELETE +
-- INSERT, so the DESTINATION partition's BEFORE **INSERT** trigger fires
-- and may replace NEW wholesale (measured). mv_2's trigger nulls `a` and
-- rescues a NULL `b` — the same shape as trig_part's, reached through a
-- command the statement never spelled.
CREATE TABLE mv_p (id integer NOT NULL, a text, b text NOT NULL) PARTITION BY RANGE (id);
CREATE TABLE mv_1 PARTITION OF mv_p FOR VALUES FROM (0) TO (100);
CREATE TABLE mv_2 PARTITION OF mv_p FOR VALUES FROM (100) TO (200);
CREATE FUNCTION mv_fn() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN NEW.a := NULL; NEW.b := coalesce(NEW.b, 'rescued'); RETURN NEW; END $$;
CREATE TRIGGER mv_before BEFORE INSERT ON mv_2
  FOR EACH ROW EXECUTE FUNCTION mv_fn();

-- The LANGUAGE sql body's DML path (adversarial-2 finding 6): both bodies
-- target relations the top-level walk already handles — iot_v's INSTEAD OF
-- trigger and rule_src's DO INSTEAD rule — but reach them through the body
-- inliner, which is the THIRD caller of the DML scope builders and once
-- called buildDmlScope directly, bypassing every rewrite-hook response.
CREATE FUNCTION body_ins_view(p text) RETURNS text LANGUAGE sql AS $$
  INSERT INTO iot_v (id, k) VALUES (99, p) RETURNING lit $$;
CREATE FUNCTION body_ins_rule() RETURNS text LANGUAGE sql AS $$
  INSERT INTO rule_src (id, a) VALUES (7, 'a') RETURNING a $$;

-- Generation divergence across the tree (adversarial-2 finding 3): a child
-- MAY define its own generation expression for an inherited column —
-- measured, and the only accepted inheritance divergence besides CHECK …
-- NO INHERIT. gen_c computes d = nullif(a, a), which is NULL on every row,
-- while the parent's formula (a * 2) proves non-null; the snapshot's
-- generationDivergesInTree bit is what keeps a tree scan from evaluating
-- the parent's formula against the child's rows.
CREATE TABLE gen_p (a integer NOT NULL, d integer GENERATED ALWAYS AS (a * 2) STORED);
CREATE TABLE gen_c (d integer GENERATED ALWAYS AS (nullif(a, a)) STORED) INHERITS (gen_p);

-- A plain grouping subject (adversarial-2 findings 9/10): every column NOT
-- NULL and no CHECKs, so a grouping-set NULL is attributable to the
-- super-aggregate row alone, and a rejection-site claim to the site alone.
CREATE TABLE gs (a integer NOT NULL, b text NOT NULL, c text NOT NULL);

-- A SETOF function over a NOT NULL domain (adversarial-2 finding 7): its
-- per-call notNull claim is entirely correct, and the target-list padding
-- rule is what keeps that claim from surviving beside a longer SRF.
CREATE FUNCTION one_sku() RETURNS SETOF non_empty_text LANGUAGE sql AS $$
  SELECT 'only'::non_empty_text $$;

-- A composite COLUMN whose name collides with its own relation's alias in
-- the clash fixture (adversarial-2 finding 13): `(p).*` is the
-- parenthesized VALUE spelling, which PostgreSQL resolves to the column —
-- fields sku and qty — while the alias reading would expand id and p at
-- the same arity. The ordered-name gate territory, pinned in fixtures.
CREATE TABLE cc (id integer NOT NULL, p sku_pair);

-- The mechanism-B inheritance hole, param face (adversarial-2 finding 8):
-- the NOT NULL lives on the parent ONLY, so a child-stored row accepts the
-- NULL binding the parent's own flag would reject. The generators keep the
-- two id ranges disjoint so a fixture can pin the child-only reading.
CREATE TABLE pnn_p (id integer NOT NULL, a text);
CREATE TABLE pnn_c () INHERITS (pnn_p);
ALTER TABLE ONLY pnn_p ALTER COLUMN a SET NOT NULL;

-- A RETURNS TABLE whose column names need quoting (adversarial-3 finding
-- 7): `pg_get_function_result` renders them with quote_ident, and
-- columnsForReturnType split each part at its first SPACE — which lands
-- inside `"my col"` and never at all inside `"Upper"`. The names are the
-- whole defect (the arity is right either way), so the fixture is
-- ordered-name material; `"a,b"` and `"e""f"` pin the comma and the
-- escaped quote, which the top-level splitter has to see through too, and
-- the nn_text column pins that the TYPE half of the split still resolves.
-- The body returns NULL in every column the domain does not forbid it in,
-- so the fixture's nullable claims are witnessed rather than merely
-- unfalsified.
CREATE FUNCTION q_cols()
  RETURNS TABLE("my col" integer, "Upper" nn_text, "a,b" text, "e""f" text, plain text)
  LANGUAGE sql AS $$ SELECT NULL::integer, 'u'::nn_text, NULL::text, NULL::text, NULL::text $$;

-- Domains over a composite, and over an ARRAY of one (adversarial-3
-- findings 3 and 4). `resolveCompositeType` was backed by a snapshot query
-- reading `typtype = 'c'` alone, so a domain over a composite was "not a
-- composite" everywhere the engine asks — two sites refused legal SQL and a
-- third answered one column. The three columns of pair_holder are the three
-- spellings: the plain array, the domain OVER the array, and the array OF
-- the domain.
CREATE DOMAIN d_sku AS sku_pair;
CREATE DOMAIN sku_pair_arr AS sku_pair[];
CREATE TABLE pair_holder (
  id       integer NOT NULL,
  pairs    sku_pair[],
  dpairs   sku_pair_arr,
  dompairs d_sku[]
);
CREATE FUNCTION mk_pairs() RETURNS sku_pair[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[ROW('a', 1)::sku_pair, ROW('b', NULL)::sku_pair] $$;

-- An OVERLOADED SETOF function (adversarial-3 finding 2): set-returningness
-- was asked through the single-candidate shortcut, which answers null for
-- any overloaded name, so this call was invisible to the target-list
-- padding rule while staying perfectly visible to the notNull rule — which
-- reads the SAME two candidates' NOT NULL domain return by consensus. Both
-- overloads return a set, so consensus answers it exactly.
CREATE FUNCTION ov_sku(x integer) RETURNS SETOF non_empty_text LANGUAGE sql AS $$
  SELECT 'ov1'::non_empty_text $$;
CREATE FUNCTION ov_sku(x text) RETURNS SETOF non_empty_text LANGUAGE sql AS $$
  SELECT 'ov2'::non_empty_text $$;

-- The overloaded pair whose bodies DISAGREE about row count, which is what
-- makes the body map's signature key load-bearing rather than merely tidier
-- (2026-08-22). The trap is loaded: the INTEGER overload is the one the
-- collided name key kept (measured — the snapshot lists this name's rows text
-- first, so integer is written last and wins the Map), and it is the one that
-- yields a single row, while srf-padding-overload-body-split.sql calls the
-- TEXT overload and scans products. The same construction as ov_pair one
-- section down, aimed at the padding bound rather than at the column flags.
--
-- Which body a collision would have kept is an ORDERING fact and nothing
-- pins it, so this pair proves the key change bites TODAY and not that it
-- keeps biting. The one-entry-per-signature assertion in catalog-census
-- is the part that does not depend on the order.
CREATE FUNCTION ov_rows(x integer) RETURNS SETOF non_empty_text LANGUAGE sql AS $$
  SELECT 'one'::non_empty_text $$;
CREATE FUNCTION ov_rows(x text) RETURNS SETOF non_empty_text LANGUAGE sql AS $$
  SELECT p.sku::non_empty_text FROM products p $$;

-- User functions whose signatures are IDENTICAL to pg_catalog functions
-- (adversarial-3 finding 6). PostgreSQL searches pg_catalog implicitly and
-- FIRST unless the path names it, so under the default path these are
-- HIDDEN and never run — while the engine read them as the single candidate
-- and claimed their NOT NULL domain return, and expanded json_each's SETOF
-- sku_pair over PostgreSQL's key/value. They exist to keep the fixture that
-- pins the precedence honest: dropping them would make it assert nothing.
CREATE FUNCTION public.min_scale(v numeric) RETURNS non_empty_text
  LANGUAGE sql IMMUTABLE AS $$ SELECT 'user'::non_empty_text $$;
CREATE FUNCTION public.to_number(a text, b text) RETURNS non_empty_text
  LANGUAGE sql IMMUTABLE AS $$ SELECT 'user'::non_empty_text $$;
CREATE FUNCTION public.json_each(j json) RETURNS SETOF sku_pair
  LANGUAGE sql IMMUTABLE AS $$ SELECT ROW('a', 1)::sku_pair $$;

-- A TABLE's ROW TYPE as an array element. A relation's row type is a
-- composite too, and it lives in neither `compositeTypes` nor the domain
-- map — types and relations share one namespace, so the element-type
-- resolver has to take the same two-step `columnsForReturnType` takes for
-- `SETOF <table>` versus `SETOF <composite>`. Found while auditing what the
-- sweep-3 fixes left behind: it is finding 3's own class, one spelling past
-- the six the report measured.
CREATE TABLE trow (a integer NOT NULL, b text);
-- `row1` is a BARE table row type, beside `rows`' array of one. The array
-- spelling reaches the element-type resolver; the bare one reaches
-- expandCompositeStar, which refused it until the same two-step fallback
-- landed there too.
CREATE TABLE trow_holder (id integer NOT NULL, rows trow[], row1 trow);

-- Functions whose output columns live in their ARGUMENT list rather than in
-- their rendered return type. `pg_get_function_result` is lossy for these:
-- out_pair renders `SETOF record` and one_row_composite renders
-- `TABLE(r sku_pair)`, while PostgreSQL emits [lo, hi] and [sku, qty]. The
-- same defect queryBuiltinTableFunctions was built to fix for BUILTINS,
-- left standing for user functions until the post-sweep-3 audit.
CREATE FUNCTION out_pair(x integer, OUT lo integer, OUT hi nn_text)
  RETURNS SETOF record LANGUAGE sql AS $$ SELECT x, 'h'::nn_text $$;
CREATE FUNCTION one_row_composite() RETURNS TABLE(r sku_pair)
  LANGUAGE sql AS $$ SELECT ROW('s', NULL)::sku_pair $$;

-- The three gates on reading a body for a ROW return. Each is measured, and
-- each has a fixture holding it from both sides.
--
-- (a) NOT set-returning: a body that can return ZERO rows makes the function
-- return one row of all NULLs (measured), so it must guarantee its single row
-- before its columns are believed. `first_item` cannot (LIMIT), `one_pair`
-- can — the same zero-row gate the scalar body inliner applies.
CREATE FUNCTION first_item(p_order_id integer) RETURNS order_items
  LANGUAGE sql AS $$ SELECT * FROM order_items WHERE order_id = $1 LIMIT 1 $$;
CREATE FUNCTION one_pair() RETURNS sku_pair
  LANGUAGE sql AS $$ SELECT 'a'::text, 1 $$;

-- (b) SINGLE CANDIDATE: an overloaded name's bodies each prove something
-- about their OWN signature and nothing about the others', so the flags must
-- stay conservative until the overload is resolved. The shapes agree, so the
-- consensus rule answers the column list without resolving it. The bodies are
-- ordered so that reading the wrong one would be WRONG: the call below takes
-- the integer overload, which emits NULLs, while the text overload defined
-- after it emits values.
--
-- Until 2026-08-22 this was also a MAP-KEY trap — fnBodyAsts was keyed by
-- `schema.name`, so the two bodies shared one entry. The key is the full
-- signature now and the collision is gone; what still refuses the read is
-- resolveFunctionMetadata's single-candidate shortcut, which is the reason
-- that was always doing the work. ov_rows above is the trap built for the
-- key itself.
CREATE FUNCTION ov_pair(x integer) RETURNS SETOF sku_pair
  LANGUAGE sql AS $$ SELECT NULL::text, NULL::integer $$;
CREATE FUNCTION ov_pair(x text) RETURNS SETOF sku_pair
  LANGUAGE sql AS $$ SELECT 'p'::text, 1 $$;

-- The foreign keys a join may NOT reason from (the imprecision closure's
-- class B). Each is a validated-looking key that guarantees nothing, and each
-- was measured against PG18 before the gate was written.
--
-- fk_nv: NOT VALID — pre-existing rows are unchecked, so a row with no parent
-- can be read back through the join. `convalidated` is what the adapter reads,
-- and it is also false for a PG18 NOT ENFORCED key and after
-- `ALTER CONSTRAINT … NOT ENFORCED` on an already-validated one (measured),
-- so one bit covers all three routes.
CREATE TABLE fk_nv (id integer PRIMARY KEY, o_id integer NOT NULL);
ALTER TABLE fk_nv ADD CONSTRAINT fk_nv_order
  FOREIGN KEY (o_id) REFERENCES orders(id) NOT VALID;

-- fk_df: DEFERRABLE — violable mid-transaction and observable there, with
-- INITIALLY IMMEDIATE no protection (`SET CONSTRAINTS ALL DEFERRED` measured).
CREATE TABLE fk_df (id integer PRIMARY KEY,
  o_id integer NOT NULL REFERENCES orders(id) DEFERRABLE);

-- fk_par/fk_chi: INHERITANCE — a parent's foreign key is NOT copied to a
-- child (pg_constraint records it on the parent alone, and a violating child
-- row inserts without complaint — measured), so a TREE scan of fk_par reads
-- rows the key never saw. The data states seed exactly such a row.
CREATE TABLE fk_par (id integer PRIMARY KEY, o_id integer NOT NULL REFERENCES orders(id));
CREATE TABLE fk_chi () INHERITS (fk_par);

-- An EMPTY range in a NOT NULL column. `lower()` and `upper()` each have a
-- total `(text)` form and an `(anyrange)` form that returns NULL for an empty
-- range, and the walk dispatches builtins by NAME — so the totality table
-- claimed notNull for both meanings. Found by auditing the curated tables
-- against PostgreSQL's own source rather than by hand.
CREATE TABLE rng (id integer NOT NULL, span int4range NOT NULL);

-- A `LANGUAGE sql` body whose last statement carries a WINDOW call. The
-- body's row-count gate asks `guaranteesSingleRow`, which reads "an
-- aggregate with no GROUP BY collapses to exactly one row" — and the
-- aggregate test it used counted a WINDOWED call as an aggregate. A window
-- call collapses nothing: this body returns one row per row of `t`, so over
-- an empty `t` it returns NO row and the function returns NULL. Found by
-- auditing AGGREGATE_NAMES against pg_catalog, where `row_number` and four
-- siblings are prokind 'w'.
CREATE FUNCTION window_body() RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) OVER () FROM t
$$;

-- ====================================================================
-- The function-call axis (docs/generated-surface.md item 4's residue).
--
-- The generator called exactly ONE function — `max` — while this schema
-- defined 66, so nothing in the corpus reached a variadic parameter, a
-- defaulted argument, an INOUT parameter, a user aggregate or window
-- function, or a `LANGUAGE sql` body being read back. These six exist to
-- give that axis a vocabulary; each is deliberately able to return NULL,
-- because the generated suite requires every nullable claim to be
-- witnessed by a real one.
-- ====================================================================

-- VARIADIC. The candidate refusal this comment used to blame is not on this
-- path: a single catalog candidate resolves, so the call inlines the body
-- (measured, variadic-body-inlines-to-a-nullif.blame.sql). What makes the
-- call nullable is `nullif(..., '')`, which is also what makes the claim
-- witnessable — array_to_string ignores NULLs and would otherwise return ''
-- forever.
CREATE FUNCTION gfn_var(VARIADIC xs text[]) RETURNS text
  LANGUAGE sql AS $$ SELECT nullif(array_to_string(xs, ','), '') $$;

-- A DEFAULTED argument: the lower bound of the arity window
-- (`argCount >= required`), which every other candidate in this schema
-- leaves untested because required always equals inputs.
CREATE FUNCTION gfn_def(a integer, b integer DEFAULT 7) RETURNS integer
  LANGUAGE sql AS $$ SELECT a + b $$;

-- An INOUT parameter: an input for the arity filter and an output column
-- for functionOutputColumns, in one declaration.
CREATE FUNCTION gfn_io(INOUT a text) LANGUAGE sql AS $$ SELECT upper(a) $$;

-- SECURITY DEFINER: captured, unread, and asserted nowhere until now.
CREATE FUNCTION gfn_sd(a text) RETURNS text
  LANGUAGE sql SECURITY DEFINER AS $$ SELECT a $$;

-- An aggregate with NO INITCOND — NULL over zero input rows, which is the
-- branch `aggInitVal` gates and which the three existing user aggregates
-- (all INITCOND '0') cannot reach.
-- The `nullif` is load-bearing: GROUP BY guarantees no empty group, so the
-- zero-row NULL is unreachable under a grouped projection. Folding all-NULL
-- input to NULL gives the claim a witness from real data instead.
CREATE FUNCTION gfn_sfunc(s text, v text) RETURNS text
  LANGUAGE sql AS $$ SELECT nullif(coalesce(s, '') || coalesce(v, ''), '') $$;
CREATE AGGREGATE gfn_noinit(text) (SFUNC = gfn_sfunc, STYPE = text);

-- A USER window function. `CREATE FUNCTION … WINDOW` is documented as
-- C-only and PostgreSQL nonetheless accepts and runs a LANGUAGE sql one
-- (measured), which is what makes this reachable at all. It is not in
-- NEVER_NULL_WINDOW_FNS, so the walk must fall through to conservative.
CREATE FUNCTION gfn_win(x text) RETURNS text WINDOW
  LANGUAGE sql AS $$ SELECT x $$;

-- A SETOF <table> function for the FROM-item axis. `SETOF u` ERASES u's NOT
-- NULLs — PostgreSQL re-imposes nothing, measured — so the only sound source
-- of a guarantee is the BODY, which the walk reads back and ORs into the
-- declared list (the imprecision closure's class A).
--
-- `SELECT *` rather than an explicit column list, and that is deliberate: a
-- schema variant may ADD a column to u (composite-key does), and an explicit
-- list would then fail to match the declared return type. The star expansion
-- is handled — the read-back recovers u.id and u.email either way, measured
-- with and without the extra column.
CREATE FUNCTION gfn_urows(k integer) RETURNS SETOF u
  LANGUAGE sql AS $$ SELECT * FROM u WHERE u.t_id = k $$;

-- A composite whose fields are BOTH text, for the composite-star projection.
-- sku_pair would have done except that its `qty integer` can only be fed from
-- the generator's one integer slot, which is t.id — NOT NULL, so that field's
-- (correctly conservative) nullable claim would go unwitnessed wherever t is
-- present. Two text fields take the two nullable text slots and are witnessed
-- by ordinary data.
CREATE TYPE gfn_pair AS (p text, q text);

-- ====================================================================
-- What a CALL passes, and what strictness does with it.
--
-- Two mechanisms meet here. A defaulted parameter the call omits is
-- SUBSTITUTED — PostgreSQL evaluates the declared expression and the body
-- computes with it — so the value is the default's, not NULL. And a STRICT
-- function handed a NULL argument does not run at all: it returns NULL
-- (one row of all NULLs for a composite return, no rows for a set), past
-- both its body and any NOT NULL domain in its declaration. A default that
-- is itself NULL is where the two meet.
-- ====================================================================

-- The substitution, in the three flavours a default expression comes in: a
-- literal, a call the walk can prove total, and a call that can yield NULL.
-- def_lit and def_call are total over a non-null first argument; def_null's
-- `nullif(1, 1)` is NULL, so its sum is, and real data witnesses it.
CREATE FUNCTION def_lit(a integer, b integer DEFAULT 7) RETURNS integer
  LANGUAGE sql AS $$ SELECT a + b $$;
CREATE FUNCTION def_call(a integer, b integer DEFAULT length('abc')) RETURNS integer
  LANGUAGE sql AS $$ SELECT a + b $$;
CREATE FUNCTION def_null(a integer, b integer DEFAULT nullif(1, 1)) RETURNS integer
  LANGUAGE sql AS $$ SELECT a + b $$;

-- Two defaults, so a NAMED call can skip the middle one: `def_two(x, c => 5)`
-- supplies the first and the last and leaves `b` to its declaration.
CREATE FUNCTION def_two(a integer, b integer DEFAULT 2, c integer DEFAULT 3)
  RETURNS integer LANGUAGE sql AS $$ SELECT a + b + c $$;

-- STRICT with a NULL default: the call supplies one argument, PostgreSQL
-- substitutes NULL for the other, and strictness then returns NULL without
-- running the body — which is `SELECT a`, a non-null value that never
-- reaches the caller.
CREATE FUNCTION def_strict(a integer, b integer DEFAULT NULL) RETURNS integer
  LANGUAGE sql STRICT AS $$ SELECT a $$;

-- STRICT past a NOT NULL DOMAIN. The domain is enforced on a value the
-- function RETURNS, and a short-circuited call returns none: dom_strict of a
-- NULL is NULL, nn_text or not. dom_lenient is the control — it runs, so the
-- domain holds.
CREATE FUNCTION dom_strict(x text) RETURNS nn_text
  LANGUAGE sql STRICT AS $$ SELECT 'd'::nn_text $$;
CREATE FUNCTION dom_lenient(x text) RETURNS nn_text
  LANGUAGE sql AS $$ SELECT 'd'::nn_text $$;

-- STRICT with a ROW return, for the FROM position: one row of all NULLs, and
-- the fields the body proves are exactly the ones that come back NULL.
CREATE FUNCTION pair_strict(x integer, y integer DEFAULT NULL) RETURNS sku_pair
  LANGUAGE sql STRICT AS $$ SELECT 'p'::text, 1 $$;

-- An AGGREGATE over a NOT NULL domain. Over zero input rows there is no
-- transition and no final value, so the result is NULL whatever the declared
-- return type says — the domain is enforced on a value this call never
-- produces.
CREATE FUNCTION nn_sfunc(s nn_text, v text) RETURNS nn_text
  LANGUAGE sql AS $$ SELECT coalesce(v, 'z')::nn_text $$;
CREATE AGGREGATE nn_agg(text) (SFUNC = nn_sfunc, STYPE = nn_text);

-- An OUT parameter BETWEEN the inputs, with the defaulted one after it.
-- PostgreSQL accepts the declaration and stores the default against the third
-- POSITION (measured), so the flags come from counting input arguments, not
-- all of them — the count-everything reading marked `x` and left `b`
-- required, which puts a legal one-argument call outside the arity window.
-- A call's own positional arguments stop lining up with the parameter list
-- here, which is why the walk binds nothing past `x`.
CREATE FUNCTION mid_out(a integer, OUT x integer, b integer DEFAULT NULL)
  LANGUAGE sql STRICT AS $$ SELECT a $$;

-- The fourth adversarial sweep's DDL ---------------------------------------
--
-- Folded in by that sweep's fix phase, as the three prior ones folded theirs.
-- What is NOT here is as deliberate: the sweep's section-B objects (a default
-- that is itself a defaulted call, the volatile and session-dependent
-- spellings, an overloaded name whose picked candidate defaults to NULL) and
-- its self-referencing-key table produced no finding and reach no shape the
-- corpus lacks, so they stayed in the probe loop and retired with it.

-- `ROWS FROM` NULL-PADS every arm shorter than the longest, and a function
-- returning a NOT NULL DOMAIN is the one shape whose DECLARED column reading
-- carries a notNull into that padding. Three declarations reach it: a
-- non-strict SETOF, the same STRICT (a NULL argument returns NO rows, so it
-- is padded over its whole length), and the TABLE(...) spelling.
CREATE FUNCTION sw4_dom_rows(n integer) RETURNS SETOF nn_text
  LANGUAGE sql AS $$ SELECT 'v'::nn_text FROM generate_series(1, n) $$;
CREATE FUNCTION sw4_dom_srf(n integer) RETURNS SETOF nn_text
  LANGUAGE sql STRICT AS $$ SELECT 'v'::nn_text FROM generate_series(1, n) $$;
CREATE FUNCTION sw4_tab_srf(n integer) RETURNS TABLE(a nn_text, b integer)
  LANGUAGE sql STRICT AS $$ SELECT 'v'::nn_text, n $$;

-- The non-strict SETOF twin that IGNORES its argument, for the strictness
-- gate on `recordStrictSrfImplications`. `sw4_dom_rows` above looks like the
-- control and is not: its body is `… FROM generate_series(1, n)`, so a NULL
-- argument empties the series and the call filters the source row after all,
-- for a reason that has nothing to do with the function's own strictness.
-- This one returns its row whatever it is handed, which is what makes the
-- gate observable (strict-srf-strictness-gate.sql).
CREATE FUNCTION sw4_ignores_arg(n integer) RETURNS SETOF integer
  LANGUAGE sql AS $$ SELECT 1 $$;

-- A record-returning call, for the `ROWS FROM` column-definition-list arm:
-- its declared columns carry no flags, so it is the arm with nothing to lose
-- to the padding and the control that says so.
CREATE FUNCTION sw4_rec(n integer) RETURNS SETOF record
  LANGUAGE sql AS $$ SELECT 'v'::text, 1 FROM generate_series(1, n) $$;

-- A foreign key whose REFERENCED side is a PARTITIONED parent. PostgreSQL
-- records it more than once: the declared constraint plus one CLONE per
-- partition, so the capture has to tell them apart. TWO partitions,
-- deliberately — a clone says nothing about which partition a referencing row
-- lands in, and one partition cannot show that.
CREATE TABLE sw4_pp (id integer NOT NULL PRIMARY KEY, k text) PARTITION BY RANGE (id);
CREATE TABLE sw4_pp1 PARTITION OF sw4_pp FOR VALUES FROM (0) TO (100);
CREATE TABLE sw4_pp2 PARTITION OF sw4_pp FOR VALUES FROM (100) TO (200);
CREATE TABLE sw4_pref (
  id   integer NOT NULL PRIMARY KEY,
  p_id integer NOT NULL REFERENCES sw4_pp(id)
);

-- The OTHER cloning direction, and the one a naive clone filter breaks: a key
-- declared on a PARTITIONED REFERENCING table is cloned per partition too,
-- all clones sharing one referenced table. Each is the only key its partition
-- has, so a query naming the partition directly needs it.
CREATE TABLE sw4_rt (id integer NOT NULL PRIMARY KEY, k text);
CREATE TABLE sw4_rs (id integer NOT NULL, t_id integer NOT NULL REFERENCES sw4_rt(id))
  PARTITION BY RANGE (id);
CREATE TABLE sw4_rs1 PARTITION OF sw4_rs FOR VALUES FROM (0) TO (100);

-- The INHERITANCE control, and it is the opposite way round: a parent holds
-- its OWN rows, so `ONLY sw4_ip` is exactly where the key's match lives.
CREATE TABLE sw4_ip (id integer NOT NULL PRIMARY KEY, k text);
CREATE TABLE sw4_ic () INHERITS (sw4_ip);
CREATE TABLE sw4_iref (
  id   integer NOT NULL PRIMARY KEY,
  p_id integer NOT NULL REFERENCES sw4_ip(id)
);

-- A key whose two columns share a NAME, so a USING or NATURAL join
-- synthesises exactly the key equality — the control for the join recording.
CREATE TABLE sw4_c (id integer NOT NULL PRIMARY KEY, v text);
CREATE TABLE sw4_r (
  rid integer NOT NULL PRIMARY KEY,
  id  integer NOT NULL REFERENCES sw4_c(id),
  v   text
);

-- A relation sharing no column name with anything: a NATURAL join against it
-- merges nothing and is a CROSS JOIN in disguise.
CREATE TABLE sw4_none (zz integer);

-- A non-strict function returning a NOT NULL DOMAIN whose body is
-- NULL-PRESERVING. Every other such function here returns a CONSTANT, which
-- is why the class went unreached: `dom_lenient` proves nothing about its
-- argument and these two reject it.
CREATE FUNCTION sw4_dom_id(x text) RETURNS nn_text
  LANGUAGE sql AS $$ SELECT x::nn_text $$;
CREATE FUNCTION sw4_dom_echo(x text) RETURNS nn_text
  LANGUAGE sql AS $$ SELECT x $$;

-- The WIDE control for the parameter contract: nothing catalog-visible says
-- this rejects NULL, and no static analysis can see that it does.
CREATE FUNCTION sw4_raiser(x text) RETURNS text LANGUAGE plpgsql AS
  $$ BEGIN IF x IS NULL THEN RAISE 'nope'; END IF; RETURN x; END $$;

-- ---------------------------------------------------------------------------
-- The sqlc-register shapes (docs/sqlc-disagreements.md, adjudicated
-- 2026-08-20). Each object below exists to make one register entry's
-- PostgreSQL truth EXECUTABLE here rather than prose there — the register
-- records what was observed, these hold it to it.
-- ---------------------------------------------------------------------------

-- `CREATE TABLE … AS SELECT` copies column names and TYPES and nothing else:
-- the source's NOT NULL does not travel (measured). `LIKE` is the contrast
-- that must keep working — not-null constraints ARE copied there, always,
-- without INCLUDING CONSTRAINTS. Register: `create_table_as/GetFirst`.
CREATE TABLE ctas_src (val text NOT NULL, note text);
CREATE TABLE ctas_dst AS SELECT * FROM ctas_src;
CREATE TABLE like_dst (LIKE ctas_src);

-- INHERITS in the direction inherit-attnotnull-divergence.sql does not carry:
-- the CHILD declares NOT NULL on an inherited column and the PARENT does not.
-- The constraint merge runs parent → child only, so a tree scan of the parent
-- stays nullable and a parent-stored NULL comes back through it. Register:
-- `ddl_create_table_inherits/GetAllOrganisations`.
CREATE TABLE cnn_p (id integer NOT NULL, legal_name text);
CREATE TABLE cnn_c (legal_name text NOT NULL) INHERITS (cnn_p);

-- NOT NULL on an ARRAY column binds the array, never its ELEMENTS: a NULL
-- element satisfies the constraint and reaches an unnest expansion as a NULL.
-- Register: `unnest_with_ordinality/GetValues`.
CREATE TABLE arr_nn (id integer NOT NULL, vals text[] NOT NULL);

-- A sequence, for the totality of the sequence functions: `nextval` is
-- VOLATILE, so it is outside the immutable-only totality capture, and it is
-- not on the curated always-non-null name list either — yet it raises or
-- returns a bigint and never answers NULL. Register: `nextval/GetNextID`.
CREATE SEQUENCE seq_probe;

-- A LANGUAGE sql body that applies a BUILTIN to its own parameter. Both
-- claim notNull now: `cat1`'s shape (an operator over the parameters) always
-- did, and the FUNCTION call joined it when the body context began carrying
-- declared argument types for `$n` to read (body-builtin-parameter-type.sql).
-- The asymmetry that remains is by NAME, not by `$n` — see
-- body-parameter-by-name-is-untyped.blame.sql.
CREATE FUNCTION body_upper(x text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT UPPER($1) $$;
CREATE FUNCTION body_concat(a text, b text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT $1 || ' ' || $2 $$;

-- User functions colliding with a builtin BY NAME ONLY — different argument
-- types, so PostgreSQL eliminates them and runs the builtin under any search
-- path. The identical-signature shadows above (min_scale, to_number,
-- json_each) pin the precedence question; these pin the ELIMINATION one, which
-- is the half the function overload merge turns on
-- (docs/function-overload-merge.md): a name-only collision must cost the
-- builtin nothing where the argument types are known, and the merged pool is
-- what makes that true rather than the bare-name gate that used to open every
-- subtree using the name.
--
-- They sit in the SHARED schema on purpose. Every fixture that calls `scale`
-- or `length` now resolves against a polluted name, so the elimination is
-- exercised by the whole corpus instead of by one case that agrees with it.
CREATE FUNCTION public.scale(x boolean) RETURNS integer
  LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$;
CREATE FUNCTION public.length(x boolean) RETURNS integer
  LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$;

-- Relations named after pg_catalog TYPES — the type half of the bare-name
-- gate work (bare-name-gates-red.test.ts, 2026-08-20). `line` for order
-- lines and `date` for a calendar are ordinary names for ordinary tables,
-- and each one used to cost the whole query every datetime and
-- immutable-I/O fold: the gate assumed a user type of that name always wins
-- the spelling. It does not. pg_catalog is searched FIRST unless the search
-- path names it explicitly, so under this corpus's path the builtin wins
-- every one of these — measured, and `bare-name-gates-red.test.ts` holds
-- both sides of it, including the `search_path = public, pg_catalog` case
-- where the rowtypes really do win and the engine cedes.
--
-- They sit in the SHARED schema for the reason `scale(boolean)` does: the
-- rule is then exercised by every fixture that casts or reads a date,
-- rather than by the one case that agrees with it.
CREATE TABLE "date" (x integer);
CREATE TABLE "jsonb" (x integer);
CREATE TABLE "numeric" (x integer);
CREATE TABLE "line" (x integer);
