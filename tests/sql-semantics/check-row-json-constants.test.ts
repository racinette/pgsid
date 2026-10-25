import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves omitted raw JSON and logical JSONB constants through source/stored row evaluation', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-json-constants-')),
    artifact = 'artifacts/goal-checks/row-json-constants-active'
  try {
    await pg.exec('CREATE TYPE result_row AS(n int4,old int4)')
    const documents = [
      null,
      'null',
      '-123456789012345678901234567890.12345678901234567890',
      ' "é\\u263a\\ud83d\\ude0a" ',
      '{ "zz":[1.2300,-0.0000],"a":1,"a":9007199254740993.2300,"items":[{"n":3},{"n":-1}],"é":"😊" }',
      '["x",1.2300,null,{"n":0}]',
      '{' +
        Array.from({ length: 70 }, (_, i) => JSON.stringify('key' + i) + ':' + i + '.000').join(
          ',',
        ) +
        '}',
    ]
    const forms: {
      name: string
      family: 'json' | 'jsonb'
      document: string | null
      expression: string
      reference: string
      kind: 'plain' | 'wire' | 'text'
    }[] = []
    for (const family of ['json', 'jsonb'] as const) {
      await pg.exec(`CREATE TYPE saved_${family} AS(n int4,old ${family})`)
      const values =
        family === 'json'
          ? [...documents, String.raw`{"a":"\ud800"}`, String.raw`{"a":"\u0000"}`]
          : documents
      for (const [index, document] of values.entries()) {
        const name = family + '_' + index,
          value = document === null ? `NULL::${family}` : `$doc$${document}$doc$::${family}`,
          observe = (predicate: string) =>
            `ROW(n,CASE WHEN ${predicate} THEN n/d ELSE NULL::int4 END)::result_row IS NOT NULL`
        const cases = [
          {
            tag: 'present',
            expression: `ROW(n,${value})::saved_${family} IS NOT NULL`,
            reference: 'NULL::text',
            kind: 'plain' as const,
          },
          {
            tag: 'absent',
            expression: `ROW(n,${value})::saved_${family} IS NULL`,
            reference: 'NULL::text',
            kind: 'plain' as const,
          },
          {
            tag: 'wire',
            expression: observe(`${family}_send(${value})=wire`),
            reference: `encode(${family}_send(value),'hex')`,
            kind: 'wire' as const,
          },
          {
            tag: 'text',
            expression: observe(`${value}::text COLLATE "C"=expected COLLATE "C"`),
            reference: 'value::text',
            kind: 'text' as const,
          },
          {
            tag: 'field',
            expression: observe(`(${value}->>label) COLLATE "C"=expected COLLATE "C"`),
            reference: 'value->>label',
            kind: 'text' as const,
          },
          {
            tag: 'field_wire',
            expression: observe(`${family}_send(${value}->label)=wire`),
            reference: `encode(${family}_send(value->label),'hex')`,
            kind: 'wire' as const,
          },
          {
            tag: 'element_wire',
            expression: observe(`${family}_send(${value}-> -1)=wire`),
            reference: `encode(${family}_send(value-> -1),'hex')`,
            kind: 'wire' as const,
          },
          {
            tag: 'element_text',
            expression: observe(`(${value}->> -1) COLLATE "C"=expected COLLATE "C"`),
            reference: 'value->> -1',
            kind: 'text' as const,
          },
          {
            tag: 'length',
            expression: `ROW(n,${family}_array_length(CASE WHEN d>0 THEN ${value} ELSE '[]'::${family} END))::result_row IS NOT NULL`,
            reference: 'NULL::text',
            kind: 'plain' as const,
          },
        ]
        if (family === 'jsonb')
          cases.push({
            tag: 'path',
            expression: observe(
              `jsonb_path_exists(${value},'$.items[*] ? (@.n > 0)'::jsonpath,'{}'::jsonb,false)`,
            ),
            reference: 'NULL::text',
            kind: 'plain',
          })
        for (const c of cases)
          forms.push({
            name: name + '_' + c.tag,
            family,
            document,
            expression: c.expression,
            reference: c.reference,
            kind: c.kind,
          })
        await pg.exec(
          `CREATE TEMP TABLE ref_${name}(value ${family});INSERT INTO ref_${name} VALUES(${value})`,
        )
      }
    }
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,label text,wire bytea,expected text,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    await pg.exec(
      'ALTER TYPE saved_json DROP ATTRIBUTE old; ALTER TYPE saved_jsonb DROP ATTRIBUTE old; ALTER TYPE result_row DROP ATTRIBUTE old',
    )
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = table.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            table,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      join(artifact, 'contexts.json'),
      JSON.stringify(
        c.tables
          .filter((t) => t.name.startsWith('evolving_'))
          .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
        null,
        2,
      ) + '\n',
    )
    const input = (value: number | string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const label of ['a', 'é', 'missing']) {
        let ref: string | null = null
        try {
          ref = (
            await pg.query<{ value: string | null }>(
              `SELECT ${f.reference} value FROM ref_${f.family}_${f.name.split('_')[1]} CROSS JOIN(SELECT $1::text label) args`,
              [label],
            )
          ).rows[0]!.value
        } catch (e) {
          expect(['22P02', '22P05']).toContain((e as { code: string }).code)
        }
        for (const [n, d, wrong, bypass] of [
          [1, 1, false, false],
          [1, 0, false, false],
          [1, 0, true, false],
          [null, 1, false, false],
          [1, null, false, false],
          [1, 1, true, false],
          [1, 0, false, true],
        ] as const) {
          const wire = f.kind === 'wire' ? (wrong ? '00' : ref) : null,
            expectedText = f.kind === 'text' ? (wrong ? 'wrong' : ref) : null,
            params = [
              n,
              d,
              label,
              wire === null ? null : Buffer.from(wire, 'hex'),
              expectedText,
              bypass,
            ]
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5,$6)`, params)
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5,$6)`, params)
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const expected: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = {
              n: input(n),
              d: input(d),
              label: input(label),
              wire: input(wire),
              expected: input(expectedText),
              bypass: input(bypass),
            }
          native.push({ name: f.name, row, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + origin, row, expected })
        }
      }
    await writeFile(join(artifact, 'native-reference.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-json-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
