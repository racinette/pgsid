-- @unwitnessable 0: over_fn is deliberately ambiguous so the engine must not consult either overload; the executed text overload returns a NOT NULL domain
-- over_fn is deliberately overloaded. Which overload runs is PostgreSQL's
-- resolution choice, so metadata resolution refuses to pick one and both
-- analyses stay conservative: the text overload returns a NOT NULL domain,
-- but claiming that without knowing the overload would be guessing.
-- @args ["x"]
-- @param 1 nullable
SELECT over_fn($1) AS c1  -- @nullable
