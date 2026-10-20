import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  multirangeProbe,
  multirangeMetadataNames,
  multirangeMetadata,
} from './check-multirange-probe.js'

it('retains SQL-coerced multirange members and structural CHECK outcomes in Rust, Go and TypeScript before schema admission', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-values-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, i) =>
      [...multirangeMetadataNames, 'bounds'].map((name, mode) => ({
        metadata,
        name,
        mode,
        table: `multirange_owned_${i}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE ${name === 'bounds' ? 'lower(spans) IS NOT DISTINCT FROM lower(head) AND upper(spans) IS NOT DISTINCT FROM upper(tail)' : name + '(spans) IS NOT DISTINCT FROM expected'} END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(spans ${f.metadata.multirange},expected boolean,head ${f.metadata.identity},tail ${f.metadata.identity},bypass boolean,CHECK(${f.sql}))`,
      )
    const checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      entries: string[] = []
    for (const f of forms) {
      const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: f.table,
        constraint: 'owned_value',
      })
      entries.push(`pub fn ${entryName}(spans:MultirangeValue,expected:BoolValue,head:RangeValue,tail:RangeValue,count:Int4Value,bypass:BoolValue)->CheckOutcome {
 let value=multirange_require_type(spans,${rustStringLiteral(f.metadata.multirange)},${rustStringLiteral(f.metadata.identity)},${rustStringLiteral(f.metadata.subtype)},${arrayElementFamily(f.metadata.subtype)});
 let result=multirange_fixture_check(value,expected,head,tail,count,bypass,${f.mode},${arrayElementFamily(f.metadata.subtype)});check_from_bool(result)
}`)
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          {
            name: 'spans',
            rustName: 'spans',
            type: f.metadata.multirange,
            rustType: 'MultirangeValue',
          },
          {
            name: 'expected',
            rustName: 'expected',
            type: 'pg_catalog.bool',
            rustType: 'BoolValue',
          },
          { name: 'head', rustName: 'head', type: f.metadata.identity, rustType: 'RangeValue' },
          { name: 'tail', rustName: 'tail', type: f.metadata.identity, rustType: 'RangeValue' },
          { name: 'count', rustName: 'count', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
        ],
      })
    }
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({
        source: evaluatorSource,
        callables: multirangeMetadataNames.map((name) => multirangeMetadata(name).rustName),
      })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multirange_value_probe.rs', source: multirangeProbe })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      checks,
      requiresRegex: false,
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      retainedMembers = 0
    for (const metadata of Object.values(PG18_RANGE_TYPES)) {
      const ranges = rangeCoreSamples(metadata.identity).ranges,
        one = ranges[5]!,
        two = ranges[10]!
      const inputs = [
        null,
        '{}',
        '{empty}',
        '{(,)}',
        `{${one}}`,
        `{${one},${two}}`,
        `{${two},${one}}`,
        `{${one},${one}}`,
        `{empty,${one},empty}`,
        `{${ranges.at(-1)}}`,
        `{${ranges.at(-2)}}`,
      ]
      for (const text of inputs) {
        const payload = await readMultirangeFixture(pg, metadata.multirange, text)
        retainedMembers += payload?.ranges.length ?? 0
        const bounds = (
          await pg.query<{ head: string | null; tail: string | null }>(
            `SELECT (SELECT span::text FROM unnest($1::${metadata.multirange}) WITH ORDINALITY AS parts(span,n) ORDER BY n LIMIT 1) head,(SELECT span::text FROM unnest($1::${metadata.multirange}) WITH ORDINALITY AS parts(span,n) ORDER BY n DESC LIMIT 1) tail`,
            [text],
          )
        ).rows[0]!
        const flags = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${multirangeMetadataNames.map((name) => name + '($1::' + metadata.multirange + ') AS ' + name).join(',')}`,
            [text],
          )
        ).rows[0]!
        for (const f of forms.filter((f) => f.metadata.identity === metadata.identity))
          for (const mismatch of [false, true])
            for (const bypass of [false, true]) {
              const expectedBool =
                f.name === 'bounds'
                  ? null
                  : mismatch
                    ? flags[f.name] === null
                      ? true
                      : !flags[f.name]
                    : flags[f.name]!
              const head = mismatch && f.name === 'bounds' ? one : bounds.head,
                tail = bounds.tail
              let expected: Outcome
              try {
                const result = (
                  await pg.query<{ result: boolean | null }>(
                    `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5) RETURNING (${f.sql}) result`,
                    [text, expectedBool, head, tail, bypass],
                  )
                ).rows[0]!.result
                expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
              } catch (error) {
                expect((error as { code: string }).code).toBe('23514')
                expected = { kind: 'False' }
              }
              inserts++
              const first = await readRangeFixture(
                  pg,
                  `SELECT $1::${metadata.identity} span`,
                  'span',
                  metadata.identity,
                  [head],
                ),
                last = await readRangeFixture(
                  pg,
                  `SELECT $1::${metadata.identity} span`,
                  'span',
                  metadata.identity,
                  [tail],
                )
              const row: Row = {
                spans: payload ? { kind: 'Value', value: payload } : { kind: 'Null' },
                expected:
                  expectedBool === null ? { kind: 'Null' } : { kind: 'Value', value: expectedBool },
                head: first ? { kind: 'Value', value: first } : { kind: 'Null' },
                tail: last ? { kind: 'Value', value: last } : { kind: 'Null' },
                count: payload ? { kind: 'Value', value: payload.ranges.length } : { kind: 'Null' },
                bypass: { kind: 'Value', value: bypass },
              }
              fixtures.push({ name: f.table, row, expected })
            }
      }
    }
    await runCheckParity(
      directory,
      'multirangevalues',
      group,
      forms.map((f) => f.table),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-values', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-values/report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          types: Object.values(PG18_RANGE_TYPES).map((m) => m.multirange),
          retainedMembers,
          structuralAccessors: multirangeMetadataNames,
          sqlSchemaAdmission: 'pending; CHECK entries exercise the logical representation directly',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
