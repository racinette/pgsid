import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'

it('keeps structural and ASCII range ordering known while deferring reached CRC encoding and raw comparator magnitudes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-range-context-'))
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec('CREATE TYPE contextual_query_span AS RANGE(subtype=tsquery)')
    const bodies: Record<string, string> = { ordered: 'v<w', raw: 'range_cmp(v,w)=-1' }
    const definition = (body: string) => `CHECK(CASE WHEN bypass THEN true ELSE ${body} END)`
    for (const [name, body] of Object.entries(bodies))
      await pg.exec(
        `CREATE TABLE context_${name}(v contextual_query_span,w contextual_query_span,bypass bool,CONSTRAINT rule ${definition(body)})`,
      )
    const catalog = await snapshotCatalog(pg),
      profile = customRangeProfiles(catalog)[0]!
    const variants = [
      {
        name: 'declared',
        settings: { serverEncoding: 'UTF8' as const, defaultCollation: 'C' as const },
      },
      { name: 'unspecified', settings: { defaultCollation: 'C' as const } },
    ]
    const programs = variants.map((variant) =>
      prepareCheckRustGroup(
        Object.entries(bodies).map(([name]) => {
          const table = catalog.tables.find((t) => t.name === 'context_' + name)!
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: variant.name + '_' + name,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints[0]!,
                [],
                catalog.domains,
                'stored',
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
              )!.expression,
            ),
          }
        }),
        variant.settings,
      ),
    )
    for (const program of programs)
      program.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const evaluatorSource = programs.map((p) => p.evaluatorSource!).join('\n')
    const group = {
      ...programs[0]!,
      checks: programs.flatMap((p) => p.checks),
      evaluatorSource,
      source: assembleCheckRust({
        source: evaluatorSource,
        callables: [
          ...new Set([...evaluatorSource.matchAll(/\b(sql__[a-z0-9_]+)\(/gu)].map((m) => m[1]!)),
        ],
      }),
      requiresRegex: false,
    }
    const quote = (q: string) => "'" + q.replaceAll("'", "''") + "'"
    const span = (q: string) => `contextual_query_span(${quote(q)}::tsquery,NULL)`
    const cases = [
      { name: 'ascii', left: span('a'), right: span('bb'), encoding: false, magnitude: false },
      { name: 'unicode_crc', left: span('é'), right: span('ê'), encoding: true, magnitude: false },
      {
        name: 'unicode_identical',
        left: span('é'),
        right: span('é'),
        encoding: false,
        magnitude: false,
      },
      {
        name: 'unicode_size',
        left: span('é'),
        right: span('日本'),
        encoding: false,
        magnitude: false,
      },
      {
        name: 'node_count',
        left: span('a'),
        right: span('a & (b & c)'),
        encoding: false,
        magnitude: false,
      },
      {
        name: 'collision',
        left: span('fGEtsNKMDB'),
        right: span('6P7Sag1hsi'),
        encoding: false,
        magnitude: true,
      },
      {
        name: 'empty',
        left: "'empty'::contextual_query_span",
        right: span('é'),
        encoding: false,
        magnitude: false,
      },
      {
        name: 'unbounded',
        left: "'(,)'::contextual_query_span",
        right: "'(,)'::contextual_query_span",
        encoding: false,
        magnitude: false,
      },
      {
        name: 'null',
        left: 'NULL::contextual_query_span',
        right: span('a'),
        encoding: false,
        magnitude: false,
      },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const sample of cases) {
      const source = `SELECT ${sample.left} v,${sample.right} w`,
        v = await readRangeFixture(pg, source, 'v', profile.rangeType),
        w = await readRangeFixture(pg, source, 'w', profile.rangeType)
      for (const bypass of [false, true])
        for (const [name, body] of Object.entries(bodies)) {
          const from = `FROM (${source}) bounds CROSS JOIN(SELECT $1::bool bypass) options`
          const value = (
            await pg.query<{ v: boolean | null }>(
              `SELECT CASE WHEN bypass THEN true ELSE ${body} END v ${from}`,
              [bypass],
            )
          ).rows[0]!.v
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO context_${name} SELECT v,w,bypass ${from}`, [bypass])
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(value === false ? '23514' : undefined)
          inserts++
          const row: Row = { v: known(v), w: known(w), bypass: known(bypass) }
          for (const variant of variants) {
            const deferred =
              !bypass &&
              ((sample.encoding && variant.name === 'unspecified') ||
                (sample.magnitude && name === 'raw'))
            const expected: Outcome = deferred
              ? { kind: 'Unknown' }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            fixtures.push({ name: variant.name + '_' + name, row, expected })
            references.push({
              sample: sample.name,
              variant: variant.name,
              name,
              bypass,
              native: value,
              expected,
            })
          }
          if (v && !v.empty && sample.name === 'node_count') {
            const missing = structuredClone(v)
            const leaf = missing.bounds[0]!
            if (leaf.kind !== 'Tsquery') throw Error('Missing query leaf')
            leaf.value.nativeBytes = -1
            for (const variant of variants)
              fixtures.push({
                name: variant.name + '_' + name,
                row: { ...row, v: known(missing) },
                expected: { kind: value === null ? 'Null' : value ? 'True' : 'False' },
              })
          }
        }
    }
    await runCheckParity(
      root,
      'queryrangecontext',
      group,
      variants.flatMap((v) => Object.keys(bodies).map((n) => v.name + '_' + n)),
      fixtures,
    )
    const packet = 'artifacts/goal-checks/tsquery-ranges-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/context-reference.json',
      JSON.stringify({ nativeInserts: inserts, fixtures: fixtures.length, references }, null, 2) +
        '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
