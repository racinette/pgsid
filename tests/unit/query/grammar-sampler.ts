// SQL corpus for the node-type census: a sampler of the grammar surface —
// every target-list expression form, FROM-item kind, and statement shape we
// know how to write. Its job is to make node types *appear*, so the census can
// tell classified constructs from unconsidered ones.
//
// Queries need only parse; they are never required to be sensible.

export const GRAMMAR_SAMPLER: string[] = [

  // --- target-list expression forms ---
  `SELECT 1, 'a', true, NULL, 1.5, B'101', X'ff'`,
  `SELECT p.id + 1, p.id * 2, -p.id, p.sku || 'x' FROM products p`,
  `SELECT p.id = 1, p.id BETWEEN 1 AND 2, p.id IN (1,2), p.sku LIKE 'a%' FROM products p`,
  `SELECT p.sku SIMILAR TO 'a', p.sku ~ 'a', p.sku IS NULL, p.id IS NOT NULL FROM products p`,
  `SELECT (p.id > 1) IS TRUE, NOT (p.id > 1), p.id IS DISTINCT FROM 1 FROM products p`,
  `SELECT CASE WHEN p.id=1 THEN 'a' ELSE 'b' END, CASE p.id WHEN 1 THEN 'a' END FROM products p`,
  `SELECT COALESCE(p.name,'x'), NULLIF(p.name,'x'), GREATEST(1,2), LEAST(1,2) FROM products p`,
  `SELECT p.price::text, CAST(p.price AS text), p.sku COLLATE "C" FROM products p`,
  `SELECT count(*), sum(p.id), count(*) FILTER (WHERE p.id>0) FROM products p`,
  `SELECT string_agg(p.sku, ',' ORDER BY p.sku), array_agg(DISTINCT p.id) FROM products p`,
  `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p.id) FROM products p`,
  `SELECT rank() OVER w, sum(p.id) OVER (PARTITION BY p.category_id ORDER BY p.id
     ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) FROM products p WINDOW w AS (ORDER BY p.id)`,
  `SELECT grouping(p.id), p.id FROM products p GROUP BY GROUPING SETS ((p.id), ())`,
  `SELECT EXISTS(SELECT 1 FROM products), (SELECT max(id) FROM products),
          ARRAY(SELECT id FROM products), 1 IN (SELECT id FROM products)`,
  `SELECT CURRENT_DATE, CURRENT_TIMESTAMP, SESSION_USER, CURRENT_SCHEMA, localtime`,
  `SELECT XMLELEMENT(NAME foo, 'bar'), XMLFOREST(p.sku AS s) FROM products p`,
  `SELECT XMLSERIALIZE(DOCUMENT xml '<a/>' AS text)`,
  `SELECT JSON_OBJECT('k': 1), JSON_ARRAY(1,2), JSON_SCALAR(1)`,
  `SELECT JSON_VALUE(e.data, '$.a' RETURNING text), JSON_QUERY(e.data, '$'),
          JSON_EXISTS(e.data, '$.a') FROM events e`,
  `SELECT e.data IS JSON, e.data IS JSON OBJECT FROM events e`,
  `SELECT p.id::text FROM products p WHERE p.id = ANY(ARRAY[1,2]) AND p.id = ALL(ARRAY[1])`,
  `SELECT (SELECT p2 FROM products p2 LIMIT 1).sku FROM products p`,
  `SELECT $1, $1::int`,
  // --- FROM-item forms ---
  `SELECT * FROM products TABLESAMPLE BERNOULLI (10)`,
  `SELECT * FROM (VALUES (1,2)) v(a,b)`,
  `SELECT * FROM generate_series(1,3) g`,
  `SELECT * FROM generate_series(1,3) WITH ORDINALITY t(a,b)`,
  `SELECT * FROM ROWS FROM (generate_series(1,2), generate_series(1,2)) z(a,b)`,
  `SELECT * FROM get_order_items(1) g`,
  `SELECT * FROM XMLTABLE('/r' PASSING xml '<r><a>1</a></r>' COLUMNS a int PATH 'a') x`,
  `SELECT * FROM JSON_TABLE('{"a":1}'::jsonb, '$' COLUMNS (a int PATH '$.a')) jt`,
  `SELECT * FROM products p, LATERAL (SELECT p.id) l`,
  `SELECT * FROM products p JOIN order_items oi USING (id)`,
  `SELECT * FROM products p NATURAL JOIN order_items oi`,
  `SELECT * FROM products p CROSS JOIN order_items oi`,
  `SELECT * FROM active_products`,
  // --- statement-level forms ---
  `SELECT DISTINCT ON (p.category_id) p.id FROM products p ORDER BY p.category_id, p.id`,
  `SELECT p.id FROM products p ORDER BY p.id NULLS FIRST LIMIT 1 OFFSET 1`,
  `SELECT p.id FROM products p FOR UPDATE SKIP LOCKED`,
  `SELECT p.id FROM products p GROUP BY ROLLUP(p.id) HAVING count(*) > 0`,
  `SELECT p.id FROM products p UNION SELECT 1 INTERSECT SELECT 2 EXCEPT SELECT 3`,
  `WITH x AS MATERIALIZED (SELECT 1 AS a) SELECT * FROM x`,
  `WITH RECURSIVE r AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM r WHERE n<3)
     SEARCH BREADTH FIRST BY n SET o CYCLE n SET c USING pth SELECT * FROM r`,
  `INSERT INTO tags (id,name) VALUES (1,'a') ON CONFLICT (id) DO UPDATE SET name='b' RETURNING *`,
  `INSERT INTO tags (id,name) SELECT 1,'a' RETURNING id, name`,
  `UPDATE tags SET name='x' FROM products p WHERE tags.id=p.id RETURNING tags.*, p.sku`,
  `UPDATE tags SET (id,name) = (SELECT 1,'a') RETURNING id`,
  `DELETE FROM tags USING products p WHERE tags.id=p.id RETURNING tags.id`,
  `MERGE INTO tags t USING products p ON t.id=p.id
     WHEN MATCHED THEN UPDATE SET name=p.sku
     WHEN NOT MATCHED BY SOURCE THEN DELETE RETURNING t.id, p.sku`,
  `INSERT INTO tags (id,name) VALUES (DEFAULT,'a') RETURNING id`,
  `UPDATE tags SET name='x' RETURNING WITH (OLD AS o) o.name, tags.name`,
  `DELETE FROM tags WHERE CURRENT OF my_cursor RETURNING id`,

  // --- the SQL/JSON constructors and aggregates ---
  // Each of these is a distinct node type, not a FuncCall, so none of them is
  // reached by the JSON_OBJECT/JSON_ARRAY forms above.
  `SELECT JSON('{\"a\":1}'), JSON_SERIALIZE(JSON('{\"a\":1}'))`,
  `SELECT JSON_OBJECTAGG(p.sku: p.id), JSON_ARRAYAGG(p.id) FROM products p`,
  `SELECT JSON_ARRAY(SELECT id FROM products)`,
  `SELECT JSON_VALUE(e.data, '$.a' PASSING 1 AS x) FROM events e`,
];
