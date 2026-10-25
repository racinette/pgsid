import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('recovers omitted text expressions, selected collations, relabels and I/O casts after type evolution', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-text-evolution-')),
    artifact = 'artifacts/goal-checks/row-text-evolution-active'
  try {
    await pg.exec(`CREATE TYPE trow AS(n int4,old text);
CREATE TYPE irow AS(n int4,old int4);CREATE TYPE vrow AS(n int4,old varchar);
CREATE TYPE crow AS(n int4,old char);CREATE TYPE brow AS(n int4,old bool);`)
    const forms: Record<string, string> = {
      literal: "ROW(n,$value$a😊'\\b$value$::text)::trow IS NOT NULL",
      literal_choice:
        'ROW(n,CASE WHEN label COLLATE "C"=$value$a😊\'\\b$value$::text THEN NULL::text ELSE label END)::trow IS NOT NULL',
      narrow_literal: "ROW(n,'a '::char(2))::crow IS NOT NULL",
      varchar_literal: "ROW(n,'a😊b'::varchar(2))::vrow IS NOT NULL",
      length: 'ROW(n,length(label))::irow IS NOT NULL',
      lower: `ROW(n,CASE WHEN lower(label COLLATE "C")='abc' THEN NULL::text ELSE label END)::trow IS NOT NULL`,
      explicit_default: 'ROW(n,length(label COLLATE "default"))::irow IS NOT NULL',
      relabel: 'ROW(n,label::varchar)::vrow IS NOT NULL',
      relabel_choice: `ROW(n,CASE WHEN label::varchar COLLATE "C"='abc' THEN NULL::varchar ELSE label::varchar END)::vrow IS NOT NULL`,
      typmod: 'ROW(n,label::varchar(2))::vrow IS NOT NULL',
      typmod_choice: `ROW(n,CASE WHEN label::varchar(2) COLLATE "C"='ab' THEN NULL::varchar ELSE label::varchar END)::vrow IS NOT NULL`,
      padding: 'ROW(n,label::char(2))::crow IS NOT NULL',
      padding_choice: `ROW(n,CASE WHEN label::char(2) COLLATE "C"='a '::char(2) THEN NULL::char ELSE label::char END)::crow IS NOT NULL`,
      input: 'ROW(n,label::int4)::irow IS NOT NULL',
      input_field: '(ROW(n,label::int4)::irow).n>=1',
      input_json: 'to_jsonb(ROW(n,label::int4)::irow) IS NOT NULL',
      output: 'ROW(n,(n/d)::text)::trow IS NOT NULL',
      output_field: '(ROW(n,(n/d)::text)::trow).n>=1',
      bool_input: 'ROW(n,label::bool)::brow IS NOT NULL',
      text_cat: `ROW(n,label || 'tail')::trow IS NOT NULL`,
      coalesce: `ROW(n,COALESCE(label,'abc'))::trow IS NOT NULL`,
      regex: `ROW(n,label COLLATE "C" ~ '^a')::brow IS NOT NULL`,
      regex_error: `ROW(n,label COLLATE "C" ~ '[')::brow IS NOT NULL`,
      regex_field: `(ROW(n,label COLLATE "C" ~ '[')::brow).n>=1`,
      prepared: `ROW(n,1/length(''))::irow IS NOT NULL`,
      prepared_input: `ROW(n,('bad'::text || ''::text)::int4)::irow IS NOT NULL`,
      pruned: `CASE WHEN true THEN true ELSE ROW(n,1/length(''))::irow IS NOT NULL END`,
    }
    for (const [name, expression] of Object.entries(forms)) {
      await pg.exec(`CREATE TABLE evolving_${name}(n int4,d int4,label text COLLATE "C",pick bool,bypass bool,
        CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${expression} END))`)
      await pg.exec(`CREATE TABLE null_${name}(n int4,d int4,label text COLLATE "C",pick bool,bypass bool,
        CONSTRAINT valid CHECK((CASE WHEN bypass THEN true ELSE ${expression} END) IS NULL))`)
    }
    await pg.exec(`ALTER TYPE trow DROP ATTRIBUTE old;ALTER TYPE irow DROP ATTRIBUTE old;
ALTER TYPE vrow DROP ATTRIBUTE old;ALTER TYPE crow DROP ATTRIBUTE old;ALTER TYPE brow DROP ATTRIBUTE old;`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'evolving_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete ?? true, name).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext ?? null)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(false)
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        { n: 0, d: 0, label: '', pick: true },
        { n: 1, d: 0, label: 'bad', pick: false },
        { n: 1, d: 1, label: 'abc', pick: true },
        { n: null, d: 0, label: null, pick: true },
        { n: -2, d: 1, label: 'a ', pick: false },
        { n: 2, d: null, label: "a😊'\\b", pick: null },
        { n: 2, d: 1, label: '123', pick: true },
        { n: 2, d: 1, label: 'true', pick: false },
      ]
    for (const [name] of Object.entries(forms))
      for (const sample of samples)
        for (const bypass of [false, true]) {
          let error: string | undefined
          try {
            await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3,$4,$5)`, [
              sample.n,
              sample.d,
              sample.label,
              sample.pick,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
          }
          let nullResult = false
          if (!error) {
            try {
              await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4,$5)`, [
                sample.n,
                sample.d,
                sample.label,
                sample.pick,
                bypass,
              ])
              nullResult = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          }
          const expected: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: nullResult ? 'Null' : 'True' },
            row: Row = {
              n: known(sample.n),
              d: known(sample.d),
              label: known(sample.label),
              pick: known(sample.pick),
              bypass: known(bypass),
            }
          reference.push({ name, ...sample, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
    for (const [name] of Object.entries(forms))
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            pick: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: name.startsWith('prepared')
            ? {
                kind: 'Error',
                value: { state: parseInt(name === 'prepared_input' ? '22P02' : '22012', 36) },
              }
            : { kind: 'True' },
        })
      }
    await writeFile(
      join(artifact, 'native-reference.json'),
      JSON.stringify(reference, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-text-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
