-- Data state: dense.
--
-- Every table populated, with NULLs in every nullable column. Volume is not the
-- point — each row below exists to construct a specific structural situation
-- that random data will not reliably reach. NULLs come from structure (an
-- unmatched outer join, an empty group, a soft-deleted row nothing references),
-- and structure is built, not stumbled into.
--
-- Explicit ids stay below 1000: the identity columns in `schema.sql` start
-- there, so a fixture that inserts without an id never collides with a row
-- written by a data state.

-- Category 3 is soft-deleted, so a join filtered on `deleted_at IS NULL` drops
-- it while the products above it remain.
INSERT INTO categories (id, parent_id, slug, name) VALUES
  (1, NULL, 'root', 'Root'), (2, 1, 'sub', 'Sub'), (3, NULL, 'del', 'Deleted');
UPDATE categories SET deleted_at = now() WHERE id = 3;

-- Customer 5's name is product 1's sku. An INTERSECT of two unrelated text
-- columns is otherwise empty, and an empty set operation returns no rows to
-- check the merged column's nullability on.
INSERT INTO customers (id, email, name) VALUES
  (1, 'a@b.c', 'Alice'), (2, 'b@b.c', NULL), (3, 'c@b.c', 'Carol'),
  (4, 'd@b.c', NULL), (5, 'e@b.c', 'S1');
-- A NULL name alongside a non-NULL deleted_at makes the conjunction
-- "name IS NULL AND deleted_at IS NULL" FALSE rather than TRUE, so a CASE
-- guarded on it really does fall through to its ELSE with name still NULL.
UPDATE customers SET deleted_at = now() WHERE id = 4;

-- Products 1, 5 and 6 share category 1, so that category holds more than two
-- live products — the threshold the "category norm" predicates in the
-- correlated-subquery fixtures compare against. Their prices (10, 20, 30)
-- average to 20, which no single one of them equals, so a predicate demanding
-- a product differ from its category average still admits rows.
--
-- Product 3 has no category at all: a nullable FK left NULL is what witnesses
-- nullability on the join-onto-categories path.
--
-- Products 7 and 8 carry the sentinels the NULLIF fixtures compare a sku
-- against. NULLIF only yields NULL on a row where its two arguments are equal,
-- so no amount of unrelated data witnesses it.
INSERT INTO products (id, category_id, sku, name, price) VALUES
  (1, 1, 'S1', 'P1', 10), (2, 2, 'S2', 'P2', 900), (3, NULL, 'S3', 'P3', 5),
  (5, 1, 'S5', 'P5', 20), (6, 1, 'S6', 'P6', 30),
  (7, 2, 'UNKNOWN', 'P7', 15), (8, 2, 'x', 'P8', 25);
-- Product 4 is soft-deleted and nothing references it, so a statement that
-- deletes or updates "the soft-deleted products" has a row to work on and does
-- not trip a foreign key on the way.
INSERT INTO products (id, category_id, sku, name, price, deleted_at) VALUES
  (4, 1, 'S4', 'P4', 40, now());

-- Order 4 is fulfilled and has no shipment, which is what makes a
-- "ship the fulfilled orders that have not shipped" pipeline select anything;
-- order 1 is fulfilled but already shipped, so it is the negative case.
INSERT INTO orders (id, customer_id, status, placed_at) VALUES
  (1, 1, 'fulfilled', now()), (2, 2, 'pending', now()), (3, 1, 'shipped', now()),
  (4, 1, 'fulfilled', now());

-- Item 4 belongs to order 2, whose customer has a NULL name. A dashboard query
-- that joins orders to their items drops every order with none, so a customer
-- column is only observably NULL when a NULL-named customer's order has an
-- item.
--
-- Item 5 sells product 6, which no review references. A correlated
-- `avg(rating)` is NULL exactly for a product that has been ordered and never
-- reviewed, and the fixtures that compute one filter to products with an
-- order OR a review — so without this row the NULL branch is reachable by no
-- state at all. Product 6's price (30) still differs from category 1's
-- average (20), which those same fixtures also demand.
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 2, 10), (2, 1, 2, 60, 900), (3, 3, 3, 1, 5), (4, 2, 1, 3, 10),
  (5, 3, 6, 1, 30);

INSERT INTO reviews (id, product_id, customer_id, rating, comment) VALUES
  (1, 1, 1, 5, 'great'), (2, 1, 2, 1, NULL), (3, 2, 3, 4, 'ok');

INSERT INTO addresses (id, customer_id, line1, line2, city, state, postal_code) VALUES
  (1, 1, 'L1', NULL, 'City', 'ST', NULL);

-- Tag 99 has no matching product, so a MERGE against products fires
-- WHEN NOT MATCHED BY SOURCE and returns NULL for every source column.
INSERT INTO tags (id, name) VALUES (1, 'new'), (2, 'sale'), (99, 'orphan-tag');
INSERT INTO product_tags (product_id, tag_id) VALUES (1, 1), (1, 2);

INSERT INTO coupons (id, code, discount_percent, expires_at) VALUES (1, 'C1', 10, NULL);

INSERT INTO shipments (id, order_id, carrier, tracking_no, shipped_at, delivered_at)
  VALUES (1, 1, 'UPS', NULL, now(), NULL), (2, 3, 'DHL', 'T2', now(), now());

-- Event 2's document has no "id" key. `data->'id'` is strict and both operands
-- are non-null, yet it still returns NULL for a key that is not there — which
-- is the whole reason operator strictness cannot license non-nullness, and is
-- observable only on a document missing the key.
INSERT INTO events (id, data, meta) VALUES
  (1, '{"id":1}'::jsonb, NULL), (2, '{"other":2}'::jsonb, '{"src":"x"}'::jsonb);

-- fk_chi is an inheritance CHILD of fk_par, which carries a NOT NULL foreign
-- key onto orders — and a parent's FK is not copied to a child (measured), so
-- this row dangles legally. `FROM fk_par` scans the tree and reads it, which
-- is what witnesses the tree gate on foreign-key entailment.
INSERT INTO fk_chi (id, o_id) VALUES (901, 90001);

-- A materialized view holds its own rows: refresh it once the tables it
-- reads are populated, or every claim over it is unwitnessable for a reason
-- that is an artefact of load order.
REFRESH MATERIALIZED VIEW warehouse_totals;
