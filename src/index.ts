import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'

const pg = await PGlite.create({
  extensions: { plpgsql_check },
})

await pg.exec('CREATE EXTENSION IF NOT EXISTS plpgsql_check;')

await pg.exec(`
  CREATE OR REPLACE FUNCTION public.my_function()
  RETURNS void
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RAISE NOTICE 'hello from plpgsql';
  END;
  $$;
`)

console.log(await pg.query(
  `SELECT * FROM plpgsql_check_function_tb('public.my_function()');`
));
