-- FINDING 5, over-refusal half — under `SET search_path = app_s, public`
-- PostgreSQL resolves app_s.app_only; the engine refuses with
-- `UnsupportedNodeError(from-item, "unresolvable relation app_only")`.
-- Sound (the caller's escape is PREPARE plus all-nullable) but a pure
-- consumer cost, and the same missing input as the shadowing half.
-- @refused: from-item / unresolvable relation app_only
SELECT * FROM app_only
