CREATE DOMAIN user_id AS integer;
CREATE TABLE arrays (
  id integer PRIMARY KEY,
  ordinary integer[] NOT NULL,
  matrix integer[] NOT NULL,
  cube integer[],
  flexible integer[] NOT NULL,
  optional_flexible integer[],
  owners user_id[] NOT NULL
);
CREATE VIEW array_view AS SELECT matrix, flexible FROM arrays;
