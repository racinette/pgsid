import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkUnknownMessage } from '../../src/codegen/shared/check-diagnostics.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it.each([undefined, false, true])(
  'quotes identifiers with explicit keyword rules and context %s',
  async (quoteAllIdentifiers) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-quote-ident-')),
      artifact = 'artifacts/goal-checks/quote-ident-context-active',
      label = quoteAllIdentifiers === undefined ? 'missing' : quoteAllIdentifiers ? 'on' : 'off'
    const definitions: Record<string, string> = {
      quoted: 'pg_catalog.quote_ident(source)',
      varying: 'pg_catalog.quote_ident(source::varchar)',
      padded: 'pg_catalog.quote_ident(source::bpchar)',
      selected: 'pg_catalog.quote_ident(CASE WHEN pick THEN source ELSE NULL::text END)',
      present: 'pg_catalog.quote_ident(source) IS NOT NULL',
      array: 'jsonb_build_array(pg_catalog.quote_ident(source),NULL)',
      record: 'row_to_json(ROW(pg_catalog.quote_ident(source),source))',
      constant: "pg_catalog.quote_ident('plain_identifier')",
      invariant: "pg_catalog.quote_ident('select')",
      child_error: 'pg_catalog.quote_ident(source||(1/zero)::text)',
    }
    try {
      for (const [name, sql] of Object.entries(definitions))
        await pg.exec(
          `CREATE TABLE quoted_${name}(source text COLLATE "C",expected text COLLATE "C",pick boolean,bypass boolean,zero integer,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${sql})::text COLLATE "C" IS NOT DISTINCT FROM expected END))`,
        )
      const c = await snapshotCatalog(pg),
        plans = Object.entries(definitions).flatMap(([name, sql]) => {
          const table = c.tables.find((t) => t.name === 'quoted_' + name)!,
            constraint = table.constraints[0]!
          return (['source', 'stored'] as const).map((origin) => ({
            name: name + '_' + origin,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: origin,
            },
            expression: lowerTableCheck(
              table,
              constraint,
              c.enums,
              c.domains,
              origin,
              c.rangeTypes,
              c.compositeTypeGraph,
              origin === 'source'
                ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql})::text COLLATE "C" IS NOT DISTINCT FROM expected END)`
                : undefined,
            )!.expression,
          }))
        }),
        group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          ...(quoteAllIdentifiers === undefined ? {} : { quoteAllIdentifiers }),
        }),
        fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        native: unknown[] = []
      for (const [i, k] of group.checks.entries())
        expect(k.kind, plans[i]!.name + ('reason' in k ? ': ' + k.reason : '')).toBe('supported')
      if (quoteAllIdentifiers === undefined)
        expect(checkUnknownMessage(plans[0]!.expression)).toContain('quoteAllIdentifiers')
      const keywords = (
          await pg.query<{ word: string; catcode: string }>(
            'SELECT word,catcode FROM pg_get_keywords() ORDER BY word',
          )
        ).rows,
        special = [
          '',
          'a',
          'plain_identifier',
          '_a1',
          'a_1',
          'a$b',
          '$a',
          '1a',
          'A',
          'MixedCase',
          'é',
          '😀',
          'select',
          'between',
          'authorization',
          'merge',
          'abc def',
          'a"b',
          '"',
          'a\\b',
          'a\nb',
          'a\tb',
          'a\rb',
          ' trailing ',
          'x'.repeat(200),
          'é'.repeat(70),
          null,
        ],
        samples = [
          ...keywords.map((k) => ({ value: k.word, all: false })),
          ...special.map((value) => ({ value, all: true })),
        ],
        input = (value: string | number | boolean | null): Row[string] =>
          value === null ? { kind: 'Null' } : { kind: 'Value', value }
      for (const sample of samples)
        for (const [name, sql] of Object.entries(definitions)) {
          if (!sample.all && name !== 'quoted') continue
          const references: (string | null)[] = []
          for (const setting of ['off', 'on']) {
            await pg.exec('SET quote_all_identifiers=' + setting)
            references.push(
              (
                await pg.query<{ value: string | null }>(
                  `SELECT (${sql})::text value FROM (SELECT $1::text source,true pick,1 zero) q`,
                  [sample.value],
                )
              ).rows[0]!.value,
            )
          }
          const expectedValue = references[quoteAllIdentifiers ? 1 : 0]!,
            depends = references[0] !== references[1]
          await pg.exec('SET quote_all_identifiers=' + (quoteAllIdentifiers ? 'on' : 'off'))
          const params = [sample.value, expectedValue, true, false, 1]
          await pg.query(`INSERT INTO quoted_${name} VALUES($1,$2,$3,$4,$5)`, params)
          native.push({ name, source: sample.value, references })
          const row: Row = {
              source: input(sample.value),
              expected: input(expectedValue),
              pick: input(true),
              bypass: input(false),
              zero: input(1),
            },
            expected: Outcome = {
              kind: quoteAllIdentifiers === undefined && depends ? 'Unknown' : 'True',
            }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          if (sample.all) {
            await expect(
              pg.query(`INSERT INTO quoted_${name} VALUES($1,$2,$3,$4,$5)`, [
                sample.value,
                'wrong expected value',
                true,
                false,
                1,
              ]),
            ).rejects.toMatchObject({ code: '23514' })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, expected: input('wrong expected value') },
                expected: {
                  kind: quoteAllIdentifiers === undefined && depends ? 'Unknown' : 'False',
                },
              })
          }
        }
      for (const name of Object.keys(definitions))
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: {
              source: { kind: 'Unknown' },
              expected: { kind: 'Unknown' },
              pick: { kind: 'Unknown' },
              zero: { kind: 'Unknown' },
              bypass: input(true),
            },
            expected: { kind: 'True' },
          })
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: 'quoted_' + origin,
          row: {
            source: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            expected: input(null),
            pick: input(true),
            bypass: input(false),
            zero: input(1),
          },
          expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        })
        fixtures.push({
          name: 'quoted_' + origin,
          row: {
            source: { kind: 'Unknown' },
            expected: input('anything'),
            pick: input(true),
            bypass: input(false),
            zero: input(1),
          },
          expected: { kind: 'Unknown' },
        })
        const row: Row = {
          source: input('a'),
          expected: input(null),
          pick: input(true),
          bypass: input(false),
          zero: input(0),
        }
        await expect(
          pg.query('INSERT INTO quoted_child_error VALUES($1,$2,$3,$4,$5)', [
            'a',
            null,
            true,
            false,
            0,
          ]),
        ).rejects.toMatchObject({ code: '22012' })
        fixtures.push({
          name: 'child_error_' + origin,
          row,
          expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        })
      }
      await mkdir(artifact, { recursive: true })
      await writeFile(
        join(artifact, label + '-native.json'),
        JSON.stringify(native, null, 2) + '\n',
      )
      await writeFile(
        join(artifact, label + '-fixtures.json'),
        JSON.stringify(fixtures, null, 2) + '\n',
      )
      await runCheckParity(
        root,
        'example.com/quote-ident-' + label,
        group,
        plans.map((p) => p.name),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600000,
)
