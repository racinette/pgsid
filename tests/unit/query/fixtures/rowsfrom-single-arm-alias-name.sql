-- A lone `ROWS FROM` arm returning a SCALAR takes the RELATION ALIAS as its
-- column name — sweep-4 finding 6, where the engine answered `dom_lenient`
-- and PostgreSQL's RowDescription says `z`.
--
-- The rule is the lone-function rule and nothing else. `ROWS FROM` is not
-- part of it, and the gate that said otherwise disagreed with the gate one
-- line below it about what "single" means.
--
-- Arity-preserving and NAME-only: nothing but an ordered-name comparison can
-- see this defect, which is the fourth of that kind and the argument for the
-- consumer-boundary gate. It survives re-export (a CTE over it reports the
-- wrong name too) and a qualified star reaches it as well; a VIEW does not,
-- because PostgreSQL re-renders the definition with an explicit alias column
-- list, which is why no view fixture could ever have caught it.
--
-- The column is notNull for the ordinary reason and the padding does not
-- reach it: one arm has no partner to be padded against.
SELECT z.*   -- @notNull   (named `z`, not `dom_lenient`)
FROM ROWS FROM (dom_lenient('a')) AS z
