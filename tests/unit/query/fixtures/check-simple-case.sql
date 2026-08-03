-- Simple CASE in a CHECK, desugared: `CASE code WHEN 'assigned'` IS the
-- equality `code = 'assigned'`, synthesized by the kernel and judged by the
-- ordinary fragment — the WHERE discharges it and the arm's combo IS NOT
-- NULL is notFALSE. opened_at records the NEXT boundary: proving it needs
-- the combo conclusion of the FIRST constraint fed into the second's OR as
-- a fact, and CHECK derivations do not chain — each runs from row-implied
-- evidence alone.
-- @unwitnessable 1: known imprecision — inter-CHECK chaining. The first
-- constraint forces combo non-null on every returned row and the second
-- then forces opened_at, so no witness can exist; the engine derives each
-- CHECK independently and cannot see the chain. Recorded in the register.
SELECT
  combo,      -- @notNull
  opened_at   -- @nullable
FROM locker
WHERE code = 'assigned'
