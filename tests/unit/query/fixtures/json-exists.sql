-- The one provable member of the SQL/JSON path-query family (measured):
-- JSON_EXISTS over a non-null context returns true/false with ON ERROR
-- defaulting to FALSE — while a nullable context propagates (je_n, meta is
-- NULL on dense's first event) and UNKNOWN ON ERROR reintroduces NULL
-- (je_u: strict mode errors on the missing key of the second event).
-- JSON_VALUE stays nullable FOREVER, handlers or not: a found JSON null
-- maps to SQL NULL and neither handler fires on a successful match — jv is
-- witnessed by the second event's missing key.
SELECT
  JSON_EXISTS(e.data, '$.id') AS je,                          -- @notNull
  JSON_EXISTS(e.meta, '$.src') AS je_n,                       -- @nullable
  JSON_EXISTS(e.data, 'strict $.id' UNKNOWN ON ERROR) AS je_u, -- @nullable
  JSON_VALUE(e.data, '$.id') AS jv                            -- @nullable
FROM events e
