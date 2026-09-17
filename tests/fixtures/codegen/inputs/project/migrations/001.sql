CREATE TABLE items (
 id integer PRIMARY KEY DEFAULT 1,
 payload jsonb NOT NULL,
 unchecked jsonb,
 maybe jsonb,
 literal json NOT NULL DEFAULT 'null',
 numbers jsonb,
 audit jsonb
);
