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

const packet = 'artifacts/goal-checks/range-storage-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const quote = (value: string) => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
const row = (...values: (string | null)[]) =>
  '(' + values.map((v) => (v === null ? '' : quote(v))).join(',') + ')'
const array = (...values: (string | null)[]) =>
  '{' + values.map((v) => (v === null ? 'NULL' : quote(v))).join(',') + '}'
const literal = (value: string, type: string) => '$stored$' + value + '$stored$::public.' + type

it('preserves stored scalar and array bound facets through ranges, multiranges and recursive containers with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-range-stored-storage-'))
  try {
    await pg.exec(`CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION;
      CREATE TYPE doc_span AS RANGE(subtype=tsvector,multirange_type_name=doc_ranges);
      CREATE TYPE state_span AS RANGE(subtype=float8[],multirange_type_name=state_ranges);
      CREATE TYPE span_span AS RANGE(subtype=doc_span,multirange_type_name=span_ranges);
      CREATE DOMAIN imported_span AS doc_span;
      CREATE TYPE document_window AS(span doc_span,state state_span,members doc_ranges);
      CREATE TYPE window_group AS(items document_window[],state state_ranges);`)
    const document = '[a,zzzzzzzzzz)',
      state = '["{1,2,3}","{9,9,9}")',
      members = '{[a,b),[c,d),[e,f),[g,h),[i,j)}',
      states =
        '{["{1,2,3}","{2,2,3}"),["{3,2,3}","{4,2,3}"),["{5,2,3}","{6,2,3}"),["{7,2,3}","{8,2,3}"),["{9,2,3}","{10,2,3}")}',
      record = row(document, state, members),
      nested = row(array(record, null, record), states),
      doc = literal(document, 'doc_span'),
      stat = literal(state, 'state_span'),
      multi = literal(members, 'doc_ranges'),
      value = literal(record, 'document_window'),
      groupLiteral = literal(nested, 'window_group')
    const forms = Object.entries({
      document: `lower(${doc})=source::tsvector`,
      members: `lower(${multi})=source::tsvector`,
      unbounded: `upper(${literal('(,a]', 'doc_span')})=source::tsvector`,
      empty: `isempty(${literal('empty', 'doc_span')}) AND source IS NULL`,
      empty_members: `isempty(${literal('{}', 'doc_ranges')}) AND source IS NULL`,
      domain: `lower(${literal(document, 'imported_span')})=source::tsvector`,
      array: `lower((${literal(array(document, null, document), 'doc_span[]')})[1])=source::tsvector`,
      member_array: `lower((${literal(array(members, null, members), 'doc_ranges[]')})[1])=source::tsvector`,
      record: `lower((${value}).span)=source::tsvector`,
      record_members: `lower((${value}).members)=source::tsvector`,
      nested: `lower(((${groupLiteral}).items[1]).span)=source::tsvector`,
      nested_span: `lower(lower(${literal('[' + quote('[a,b)') + ',' + quote('[c,d)') + ')', 'span_span')}))=source::tsvector`,
      state: `(float8_accum(lower(${stat}),observation::float8))[1]>1`,
      state_members: `(float8_accum(lower(${literal(states, 'state_ranges')}),observation::float8))[1]>1`,
      state_record: `(float8_accum(lower((${value}).state),observation::float8))[1]>1`,
      state_nested: `(float8_accum(lower((${groupLiteral}).state),observation::float8))[1]>1`,
    }).map(([name, sql], selector) => ({
      name,
      sql,
      selector,
      definition: `CHECK(CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${sql}) IS NOT DISTINCT FROM expected END)`,
    }))
    await pg.exec(
      `CREATE TABLE range_storage(selector int4,source text,observation int4,expected bool,bypass bool,${forms.map((f) => `CONSTRAINT "${f.name}" ${f.definition}`).join(',')}) WITH(fillfactor=90)`,
    )
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (
      label: string,
      catalog: Awaited<ReturnType<typeof snapshotCatalog>>,
      f: (typeof forms)[number],
      origin: 'source' | 'stored',
      transform?: (constraint: (typeof catalog.tables)[number]['constraints'][number]) => void,
    ) => {
      const table = catalog.tables.find((t) => t.name === 'range_storage')!,
        constraint = structuredClone(table.constraints.find((c) => c.name === f.name)!)
      if (origin === 'source') constraint.definition = f.definition
      transform?.(constraint)
      plans.push({
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: label },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            constraint,
            [],
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      })
    }
    const observe = async (
      label: string,
      f: (typeof forms)[number],
      origins: readonly string[],
    ) => {
      for (const source of ['a', 'bb', 'a:0', null])
        for (const observation of [4, null])
          for (const expected of [true, false, null])
            for (const bypass of [false, true]) {
              let state: string | undefined
              try {
                await pg.query('INSERT INTO range_storage VALUES($1,$2,$3,$4,$5)', [
                  f.selector,
                  source,
                  observation,
                  expected,
                  bypass,
                ])
              } catch (e) {
                state = (e as { code: string }).code
              }
              const outcome: Outcome =
                state === '23514' ? { kind: 'False' } : state ? failure(state) : { kind: 'True' }
              const value: Row = {
                selector: known(f.selector),
                source: known(source),
                observation: known(observation),
                expected: known(expected),
                bypass: known(bypass),
              }
              for (const origin of origins)
                fixtures.push({
                  name: label + '_' + f.name + '_' + origin,
                  row: value,
                  expected: outcome,
                })
              references.push({
                label,
                name: f.name,
                source,
                observation,
                expected,
                bypass,
                state,
                outcome,
              })
            }
    }
    const before = await snapshotCatalog(pg)
    for (const f of forms) {
      for (const origin of ['source', 'stored'] as const)
        add('before_' + f.name + '_' + origin, before, f, origin)
      await observe('before', f, ['source', 'stored'])
    }
    for (const name of ['document', 'state']) {
      const saved = (
        await pg.query<{ oid: number; tree: string }>(
          "SELECT oid,conbin::text tree FROM pg_constraint WHERE conrelid='range_storage'::regclass AND conname=$1",
          [name],
        )
      ).rows[0]!
      let replaced = false
      const tree = saved.tree.replace(
        /(\{CONST\b(?=[^{}]*:constlen -1)(?=[^{}]*:constbyval false)[^{}]*:constvalue) (\d+) \[([^\]]*)\]/u,
        (_all, prefix: string, length: string, body: string) => {
          const original = Buffer.from(
            body
              .trim()
              .split(/\s+/u)
              .map((v) => Number(v) & 255),
          )
          expect(original.length).toBe(Number(length))
          const little = original.readUInt32LE(0) / 4 === original.length
          if (!little) expect(original.readUInt32BE(0)).toBe(original.length)
          const write = (data: Buffer, size: number, offset: number) => {
            if (little) data.writeInt32LE(size, offset)
            else data.writeInt32BE(size, offset)
          }
          const start = 8,
            oldSize = little ? original[start]! >>> 1 : original[start]! & 127
          expect(oldSize).toBe(name === 'document' ? 10 : 45)
          let changed: Buffer
          if (name === 'document') {
            changed = Buffer.concat([
              original.subarray(0, start + oldSize),
              Buffer.from([0]),
              original.subarray(start + oldSize),
            ])
            changed[start] = little ? (oldSize + 1) * 2 + 1 : (oldSize + 1) | 128
          } else {
            const bitmap = Buffer.alloc(8)
            bitmap[0] = 7
            changed = Buffer.concat([
              original.subarray(0, start + 21),
              bitmap,
              original.subarray(start + 21),
            ])
            changed[start] = little ? (oldSize + 8) * 2 + 1 : (oldSize + 8) | 128
            write(changed, 32, start + 5)
          }
          write(changed, changed.length * (little ? 4 : 1), 0)
          replaced = true
          return (
            prefix +
            ' ' +
            changed.length +
            ' [ ' +
            [...changed].map((v) => (v > 127 ? v - 256 : v)).join(' ') +
            ' ]'
          )
        },
      )
      expect(replaced).toBe(true)
      await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
        tree,
        saved.oid,
      ])
      await pg.exec('ALTER TABLE range_storage SET(fillfactor=90)')
    }
    const after = await snapshotCatalog(pg),
      oldTable = before.tables.find((t) => t.name === 'range_storage')!,
      newTable = after.tables.find((t) => t.name === 'range_storage')!
    expect(newTable.constraints.map((c) => c.definition)).toEqual(
      oldTable.constraints.map((c) => c.definition),
    )
    expect(diffCatalogs(before, after).modified.map((e) => e.entityId)).toContain(
      'public.range_storage',
    )
    expect(
      newTable.constraints.find((c) => c.name === 'document')!.tsvectorConstants!.containers![0]!
        .storage![0]!.nativeBytes,
    ).toBe(14)
    expect(
      newTable.constraints.find((c) => c.name === 'state')!.arrayConstants!.constants[0]!
        .storage![0]!.nullBitmap,
    ).toBe(true)
    for (const f of forms.filter((f) => ['document', 'state'].includes(f.name))) {
      add('padded_' + f.name + '_stored', after, f, 'stored')
      await observe('padded', f, ['stored'])
      for (const mode of ['missing', 'stale', 'extra']) {
        const label = mode + '_' + f.name
        add(label, after, f, 'stored', (constraint) => {
          if (f.name === 'document') {
            if (mode === 'missing') delete constraint.tsvectorConstants
            else {
              const context = constraint.tsvectorConstants!
              if (mode === 'stale') context.definition += ' '
              else context.containers![0]!.storage!.push({ nativeBytes: 13, lexemeCount: 1 })
            }
          } else {
            if (mode === 'missing') delete constraint.arrayConstants
            else {
              const context = constraint.arrayConstants!
              if (mode === 'stale') context.definition += ' '
              else
                context.constants[0]!.storage!.push({
                  path: '/2',
                  dimensions: 1,
                  elements: 3,
                  nullBitmap: false,
                })
            }
          }
        })
        for (const bypass of [false, true])
          fixtures.push({
            name: label,
            row: {
              selector: known(f.selector),
              source: known('a'),
              observation: known(4),
              expected: known(true),
              bypass: known(bypass),
            },
            expected: { kind: bypass ? 'True' : 'Unknown' },
          })
      }
    }
    const group = prepareCheckRustGroup(plans, {
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
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
    await runCheckParity(
      root,
      'rangestorage',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
