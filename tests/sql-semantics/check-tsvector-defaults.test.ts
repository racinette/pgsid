import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../src/catalog/diff.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { tsvectorDefaultSchema } from './check-tsvector-default-fixtures.js'

const packet = 'artifacts/goal-checks/tsvector-defaults-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('preserves reached scalar, domain, array and record defaults through range constructors with native storage and INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-defaults-'))
  try {
    await pg.exec(tsvectorDefaultSchema)
    const forms = Object.entries({
      scalar: 'lower(vector_defaults())=source::tsvector',
      upper: 'upper(vector_defaults())=source::tsvector',
      supplied: 'lower(vector_defaults(source::tsvector))=source::tsvector',
      named: 'lower(vector_defaults(hi=>source::tsvector))=source::tsvector',
      supplied_all:
        "lower(vector_defaults(source::tsvector,'zzzzzzzzzz'::tsvector))=source::tsvector",
      tail: 'upper(vector_tail(source::tsvector))=source::tsvector',
      tail_named: "upper(vector_tail(source::tsvector,bounds=>'[]'))=source::tsvector",
      constructed: 'lower(vector_constructed())=source::tsvector',
      null_default: 'lower(vector_null()) IS NOT DISTINCT FROM source::tsvector',
      domain: 'lower(vector_domain_defaults())=source::tsvector',
      domain_input: 'lower(vector_domain_defaults(source::vector_domain))=source::tsvector',
      array: '(lower(vector_array_defaults()))[1]=source::tsvector',
      array_whole: 'lower(vector_array_defaults())=ARRAY[source::tsvector,NULL::tsvector]',
      array_constructed: '(lower(vector_array_constructed()))[1]=source::tsvector',
      record: '(lower(vector_record_defaults())).value=source::tsvector',
      record_whole: 'lower(vector_record_defaults())=ROW(source::tsvector,1)::vector_record',
      record_constructed: '(lower(vector_record_constructed())).value=source::tsvector',
      roundtrip: 'lower((vector_defaults()::text)::vector_range)=source::tsvector',
      array_roundtrip:
        '(lower((vector_array_defaults()::text)::vector_array_range))[1]=source::tsvector',
      record_roundtrip:
        '(lower((vector_record_defaults()::text)::vector_record_range)).value=source::tsvector',
    }).map(([name, raw], selector) => {
      const sql = raw.replace(/\b(vector_[a-z_]+)\b/gu, 'public.$1')
      return {
        name,
        sql,
        selector,
        definition: `CHECK(CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${sql}) IS NOT DISTINCT FROM expected END)`,
      }
    })
    await pg.exec(
      `CREATE TABLE vector_default_checks(selector int4,source text,expected bool,bypass bool,${forms.map((f) => `CONSTRAINT "${f.name}" ${f.definition}`).join(',')})`,
    )
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const observe = async (
      label: string,
      catalog: Awaited<ReturnType<typeof snapshotCatalog>>,
      selected: typeof forms,
    ) => {
      const table = catalog.tables.find((t) => t.name === 'vector_default_checks')!
      for (const form of selected) {
        const constraint = table.constraints.find((c) => c.name === form.name)!
        for (const origin of ['source', 'stored'] as const) {
          plans.push({
            identity: {
              schema: 'public',
              kind: 'table',
              owner: table.name,
              constraint: label + '_' + form.name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'source' ? { ...constraint, definition: form.definition } : constraint,
                [],
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
              )!.expression,
            ),
          })
        }
        for (const source of ['a', 'b', 'a b', 'bad', 'zzzzzzzzzz', null, 'a:0'])
          for (const variant of [0, 1, 2]) {
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ v: boolean | null }>(
                  `SELECT (${form.sql}) v FROM(SELECT $1::text source) q`,
                  [source],
                )
              ).rows[0]!.v
            } catch (e) {
              state = (e as { code: string }).code
            }
            const expected = variant === 1 ? !value : value,
              bypass = variant === 2
            let failure: string | undefined
            try {
              await pg.query('INSERT INTO vector_default_checks VALUES($1,$2,$3,$4)', [
                form.selector,
                source,
                expected,
                bypass,
              ])
            } catch (e) {
              failure = (e as { code: string }).code
            }
            const outcome: Outcome = bypass
              ? { kind: 'True' }
              : state
                ? error(state)
                : { kind: variant === 1 ? 'False' : 'True' }
            expect(failure, label + '/' + form.name + '/' + source + '/' + variant).toBe(
              outcome.kind === 'Error' ? state : outcome.kind === 'False' ? '23514' : undefined,
            )
            const row: Row = {
              selector: known(form.selector),
              source: known(source),
              expected: known(expected),
              bypass: known(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: label + '_' + form.name + '_' + origin,
                row,
                expected: outcome,
              })
            references.push({ label, name: form.name, source, variant, value, state, failure })
          }
      }
    }
    const before = await snapshotCatalog(pg)
    await observe('original', before, forms)
    await pg.exec('CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION')
    const saved = (
        await pg.query<{ oid: number; tree: string }>(
          "SELECT oid,proargdefaults::text tree FROM pg_proc WHERE oid='vector_defaults(tsvector,tsvector)'::regprocedure",
        )
      ).rows[0]!,
      scalarOid = (await pg.query<{ oid: number }>("SELECT 'tsvector'::regtype::oid oid")).rows[0]!
        .oid
    let replaced = false
    const padded = saved.tree.replace(
      new RegExp(
        '(\\{CONST :consttype ' + scalarOid + '\\b[^{}]*:constvalue) (\\d+) \\[([^\\]]*)\\]',
        'u',
      ),
      (_all, prefix: string, length: string, body: string) => {
        const original = Buffer.from(
          body
            .trim()
            .split(/\s+/u)
            .map((v) => Number(v) & 255),
        )
        expect(original.length).toBe(Number(length))
        expect(original.length).toBe(13)
        const bytes = Buffer.concat([original, Buffer.from([0])])
        if (original.readUInt32LE(0) / 4 === original.length) bytes.writeUInt32LE(bytes.length * 4)
        else {
          expect(original.readUInt32BE(0)).toBe(original.length)
          bytes.writeUInt32BE(bytes.length)
        }
        replaced = true
        return (
          prefix +
          ' ' +
          bytes.length +
          ' [ ' +
          [...bytes].map((v) => (v > 127 ? v - 256 : v)).join(' ') +
          ' ]'
        )
      },
    )
    expect(replaced).toBe(true)
    await pg.query('UPDATE pg_proc SET proargdefaults=$1::text::pg_node_tree WHERE oid=$2', [
      padded,
      saved.oid,
    ])
    await pg.exec('ALTER FUNCTION vector_defaults(tsvector,tsvector) COST 2')
    const after = await snapshotCatalog(pg),
      beforeCall = before.rangeTypes
        .find((t) => t.name === 'vector_range')!
        .callables!.find((c) => c.name === 'vector_defaults')!,
      afterCall = after.rangeTypes
        .find((t) => t.name === 'vector_range')!
        .callables!.find((c) => c.name === 'vector_defaults')!
    expect(afterCall.defaultExprs).toEqual(beforeCall.defaultExprs)
    expect(beforeCall.defaultTsvectorConstants![0]?.constants[0]?.storage?.nativeBytes).toBe(13)
    expect(afterCall.defaultTsvectorConstants![0]?.constants[0]?.storage?.nativeBytes).toBe(14)
    expect(diffCatalogs(before, after).modified.map((e) => e.entityId)).toContain(
      'public.vector_defaults(lo tsvector, hi tsvector)',
    )
    await observe(
      'padded',
      after,
      forms.filter((f) =>
        ['scalar', 'upper', 'supplied', 'named', 'supplied_all'].includes(f.name),
      ),
    )
    expect(references).toContainEqual(
      expect.objectContaining({
        label: 'original',
        name: 'scalar',
        source: 'a',
        variant: 0,
        value: true,
      }),
    )
    expect(references).toContainEqual(
      expect.objectContaining({
        label: 'padded',
        name: 'scalar',
        source: 'a',
        variant: 0,
        value: false,
      }),
    )
    const table = after.tables.find((t) => t.name === 'vector_default_checks')!,
      constraint = table.constraints.find((c) => c.name === 'named')!
    for (const mode of ['missing', 'stale', 'duplicate', 'wrong_count', 'invalid_size']) {
      const profiles = structuredClone(after.rangeTypes),
        callable = profiles
          .find((t) => t.name === 'vector_range')!
          .callables!.find((c) => c.name === 'vector_defaults')!
      if (mode === 'missing') delete callable.defaultTsvectorConstants
      else {
        const context = callable.defaultTsvectorConstants![0]!,
          constant = context.constants[0]!
        if (mode === 'stale') context.definition += ' '
        if (mode === 'duplicate') context.constants.push(structuredClone(constant))
        if (mode === 'wrong_count') constant.storage!.lexemeCount = 2
        if (mode === 'invalid_size') constant.storage!.nativeBytes = 8
      }
      plans.push({
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: mode },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            constraint,
            [],
            after.domains,
            'stored',
            profiles,
            after.compositeTypeGraph,
          )!.expression,
        ),
      })
      for (const bypass of [false, true])
        fixtures.push({
          name: mode,
          row: {
            selector: known(3),
            source: known('zzzzzzzzzz'),
            expected: known(false),
            bypass: known(bypass),
          },
          expected: { kind: bypass ? 'True' : 'Unknown' },
        })
    }
    const group = prepareCheckRustGroup(plans, {
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
    })
    group.checks.forEach((check, index) =>
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ': ' + check.reason : ''),
      ).toBe('supported'),
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'reference.json'),
      JSON.stringify(
        {
          nativeInserts: references.length,
          fixtures: fixtures.length,
          checks: plans.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(join(packet, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'tsvectordefaults',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    console.log(
      `tsvector defaults: ${references.length} native INSERTs, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
