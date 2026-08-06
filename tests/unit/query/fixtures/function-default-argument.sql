-- A defaulted parameter the call OMITS is substituted, not left unbound: the
-- body computes with the declared expression, and `a + b` over a non-null id
-- is total because `b` is 7. The expression is WALKED like any other, which
-- is what separates the three flavours here — a literal, a call the totality
-- table proves non-null, and `nullif(1, 1)`, which is NULL and takes the sum
-- with it. An argument the call DOES supply always wins, NULL included.
--
-- def_two is the named-notation reading: `c => 5` fills the last parameter,
-- the middle one is still omitted, and the substitution has to land on the
-- position the DECLARATION gives it rather than the one the call wrote.
SELECT
  def_lit(t.id)          AS d_lit,    -- @notNull
  def_call(t.id)         AS d_call,   -- @notNull
  def_null(t.id)         AS d_null,   -- @nullable
  def_two(t.id, c => 5)  AS d_named,  -- @notNull
  def_lit(t.id, NULL)    AS d_given   -- @nullable
FROM t
