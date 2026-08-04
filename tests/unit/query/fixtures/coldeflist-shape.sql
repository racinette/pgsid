-- A column definition list (`AS z(a integer, b text)`) is what makes a
-- record-returning call legal at all, and it fully determines the shape:
-- one column per ColumnDef, by its name. The engine once read only the
-- alias NAME list and fell through to a single conservative column. Every
-- column is nullable — a record's fields carry no constraints — and both
-- witness here: the second object omits b, the third omits everything.
SELECT * FROM jsonb_to_recordset('[{"a":1,"b":"x"},{"a":null,"b":null},{}]'::jsonb)
  AS z(a integer, b text)
-- @nullable   (a)
-- @nullable   (b)
