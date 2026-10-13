-- @world checks
CREATE TABLE calendar_imports (
  id integer PRIMARY KEY,
  raw_day text,
  expected_day date,
  skip_import boolean,
  CONSTRAINT calendar_import_value CHECK (
    CASE WHEN skip_import THEN true ELSE raw_day::date IS NOT DISTINCT FROM expected_day END
  )
);

CREATE TABLE local_clock_imports (
  id integer PRIMARY KEY,
  calendar_id integer NOT NULL REFERENCES calendar_imports (id),
  raw_time text,
  expected_time timestamp,
  skip_import boolean,
  CONSTRAINT local_clock_import_value CHECK (
    CASE WHEN skip_import THEN true ELSE raw_time::timestamp IS NOT DISTINCT FROM expected_time END
  )
);

CREATE TABLE instant_imports (
  id integer PRIMARY KEY,
  calendar_id integer NOT NULL REFERENCES calendar_imports (id),
  raw_time text,
  expected_time timestamptz,
  skip_import boolean,
  CONSTRAINT instant_import_value CHECK (
    CASE WHEN skip_import THEN true ELSE raw_time::timestamptz IS NOT DISTINCT FROM expected_time END
  )
);
