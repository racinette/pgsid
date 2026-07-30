-- Data state: uniform.
--
-- Deliberately narrow: two products in one category, and a *uniform* fan-out of
-- exactly seven reviews per product.
--
-- The uniformity is what the state is for. A scalar subquery of the form
--
--     (SELECT count(*) FROM reviews r WHERE r.product_id = p.id UNION SELECT 7)
--
-- returns two rows — and so raises "more than one row returned by a subquery
-- used as an expression" — for every product whose review count is not 7. The
-- set-operation cases in `scalar-subquery-zero-row-guards.sql` are only
-- executable when *every* product row the query visits has exactly that many
-- reviews, which no state built around varied volume can offer.
--
-- Explicit ids stay below 1000: the identity columns in `schema.sql` start
-- there, so a fixture that inserts without an id never collides with a row
-- written by a data state.

INSERT INTO categories (id, parent_id, slug, name) VALUES (1, NULL, 'root', 'Root');

INSERT INTO customers (id, email, name) VALUES
  (1, 'u1@b.c', 'Uma'), (2, 'u2@b.c', NULL);

INSERT INTO products (id, category_id, sku, name, price) VALUES
  (1, 1, 'U1', 'P1', 10), (2, 1, 'U2', 'P2', 250);

-- Seven reviews for product 1 and seven for product 2. The count is what
-- matters; the ratings vary so an aggregate over them is not constant.
INSERT INTO reviews (id, product_id, customer_id, rating, comment) VALUES
  (1, 1, 1, 5, 'great'), (2, 1, 2, 4, NULL), (3, 1, 1, 3, 'fine'),
  (4, 1, 2, 2, NULL), (5, 1, 1, 1, 'poor'), (6, 1, 2, 5, 'again'),
  (7, 1, 1, 4, NULL),
  (8, 2, 2, 1, NULL), (9, 2, 1, 2, 'meh'), (10, 2, 2, 3, NULL),
  (11, 2, 1, 4, 'good'), (12, 2, 2, 5, 'best'), (13, 2, 1, 3, NULL),
  (14, 2, 2, 2, 'weak');

INSERT INTO orders (id, customer_id, status, placed_at) VALUES
  (1, 1, 'fulfilled', now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 3, 10);
