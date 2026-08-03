-- Data state: sparse.
--
-- One row in each of the four tables at the top of the FK graph, and nothing
-- below them. Every table that hangs off those four is empty, so a join onto
-- one is unmatched while its driving side still produces a row — the shape that
-- distinguishes "no rows at all" from "a row whose right-hand side is NULL".
--
-- The single customer has a NULL name, so a nullable column is nullable here
-- even at this volume.
--
-- Explicit ids stay below 1000: the identity columns in `schema.sql` start
-- there, so a fixture that inserts without an id never collides with a row
-- written by a data state.

-- Exactly one row in t, u and v. A scalar subquery over a whole table
-- (`(SELECT id FROM t)`) raises on two rows and returns nothing on none, so a
-- one-row table is the only state under which it can be observed at all.
INSERT INTO t (id, name, val, active) VALUES (1, NULL, 'x', true);
-- The one `u` row carries the status the promotion fixtures filter on, so
-- their liveness does not depend on a random draw producing that value.
INSERT INTO u (id, t_id, email, val, status) VALUES (1, 1, 'u1@b.c', NULL, 'active');
INSERT INTO v (id, u_id, amount) VALUES (1, 1, NULL);
-- The conflict seed: an ON CONFLICT (id) statement inserting id 1 takes its
-- DO UPDATE arm here and its plain-insert arm under `empty` — the two paths
-- a conditional rejection site needs both of. NULL name keeps the nullable
-- column witnessable through the conflict path too.
INSERT INTO ck (id, name, val) VALUES (1, NULL, 'sv');

-- Generated-column rows: one with b NULL (witnesses `label`'s NULL — the
-- strict || propagates it) and one with b present (liveness for fixtures
-- filtering on b). `gm` is deliberately absent from `dense`, so a LEFT
-- JOIN onto it null-extends there — the joinState-gate witness.
INSERT INTO gm (a, b) VALUES (1, NULL);
INSERT INTO gm (a, b) VALUES (2, 'bee');

INSERT INTO categories (id, parent_id, slug, name) VALUES (1, NULL, 'root', 'Root');
INSERT INTO customers (id, email, name) VALUES (1, 'a@b.c', NULL);
INSERT INTO products (id, category_id, sku, name, price) VALUES (1, NULL, 'S1', 'P1', 10);
INSERT INTO orders (id, customer_id, status, placed_at) VALUES (1, 1, 'fulfilled', now());

-- CHECK-conditional rows: one guest per discriminator arm the fixtures filter
-- on. guest 1 shares t's single id (1) with a status OUTSIDE the CHECK's
-- WHEN set, so the LEFT-JOIN-gate fixture's ON equality matches while its
-- status conjunct fails — the null-extension witness. The housed guest's NULL
-- vip_reason witnesses the NOT ENFORCED negative; badge is non-null on every
-- row because NOT VALID still gates new writes.
INSERT INTO guest (id, status, arrived_at, room, note, vip_reason, badge) VALUES
  (1, 'in-flight',   NULL,  NULL,    NULL,           NULL, 'b-1'),
  (2, 'housed',      now(), 'r-201', NULL,           NULL, 'b-2'),
  (3, 'arrived',     now(), NULL,    'early arrival', 'repeat visitor', 'b-3'),
  (4, 'checked-out', NULL,  NULL,    'left on time', NULL, 'b-4');
