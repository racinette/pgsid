CREATE TABLE documents (
  payload jsonb NOT NULL,
  unchecked jsonb NOT NULL,
  forced jsonb NOT NULL,
  maybe jsonb,
  strict jsonb
);
