CREATE TABLE t (id int);
DO $$
BEGIN
  PERFORM 1;
END
$$;
CREATE INDEX t_id_idx ON t (id);
