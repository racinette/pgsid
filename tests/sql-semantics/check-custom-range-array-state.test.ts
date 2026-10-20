import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import { customRangeSchema, customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeArrayFixture, rangeArrayText } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

it('retains useful custom array structure around partial cells and defers only reached comparisons and errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-array-state-'))
  try {
    await pg.exec(customRangeSchema)
    let catalog = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(catalog).filter((p) =>
        ['integer_span', 'reverse_span'].includes(p.name),
      ),
      forms = profiles.flatMap((profile) =>
        [false, true].flatMap((multi) =>
          Object.entries({ count: 'cardinality(a)=3', upper: 'upper(a[1])=3', equal: 'a=a' })
            .filter(([name]) => !multi || name !== 'upper')
            .map(([name, sql]) => ({
              profile,
              multi,
              name,
              table: `partial_${profile.name}_${Number(multi)}_${name}`,
              sql: `CASE WHEN bypass THEN true ELSE ${sql} END`,
            })),
        ),
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(a ${f.multi ? f.profile.multirange : f.profile.identity}[],bypass bool,CHECK(${f.sql}))`,
      )
    catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: f.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { name: 'valid', type: 'check', definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression,
          ),
        }))
      }),
      names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      group = prepareCheckRustGroup(plans)
    for (const c of group.checks)
      expect(c.kind, c.kind === 'unsupported' ? c.reason : '').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      error = { state: parseInt('22012', 36) }
    for (const [i, f] of forms.entries()) {
      const text = f.profile.name === 'reverse_span' ? '[4,3)' : '[1,3)',
        payload = f.multi
          ? await readMultirangeArrayFixture(
              pg,
              f.profile.multirangeType,
              rangeArrayText(['{' + text + '}', null, '{}']),
            )
          : await readRangeArrayFixture(
              pg,
              f.profile.rangeType,
              rangeArrayText([text, null, 'empty']),
            )
      expect(payload).not.toBeNull()
      const altered = (change: (a: OwnedArrayInputPayload) => void): Input => {
        const a = structuredClone(payload!)
        change(a)
        return { kind: 'Value', value: a }
      }
      const samples: { a: Input; count: Outcome; upper: Outcome; equal: Outcome }[] = [
        {
          a: { kind: 'Value', value: payload! },
          count: { kind: 'True' },
          upper: { kind: 'True' },
          equal: { kind: f.profile.name === 'reverse_span' ? 'Unknown' : 'True' },
        },
        {
          a: altered((a) => {
            a.elements[0] = { kind: 'Unknown' }
          }),
          count: { kind: 'True' },
          upper: { kind: 'Unknown' },
          equal: { kind: 'Unknown' },
        },
        {
          a: altered((a) => {
            const cell = a.elements[0]!
            const span =
              cell.kind === 'Range'
                ? cell.value
                : cell.kind === 'Multirange'
                  ? cell.value.ranges[0]!.kind === 'Value'
                    ? cell.value.ranges[0]!.value
                    : null
                  : null
            if (!span) throw new Error('Missing stored range')
            span.bounds[0] = { kind: 'Unknown' }
          }),
          count: { kind: 'True' },
          upper: { kind: 'True' },
          equal: { kind: 'Unknown' },
        },
        {
          a: altered((a) => {
            a.elements[0] = { kind: 'Error', value: error }
          }),
          count: { kind: 'Error', value: error },
          upper: { kind: 'Error', value: error },
          equal: { kind: 'Error', value: error },
        },
        {
          a: { kind: 'Unknown' },
          count: { kind: 'Unknown' },
          upper: { kind: 'Unknown' },
          equal: { kind: 'Unknown' },
        },
        {
          a: { kind: 'Null' },
          count: { kind: 'Null' },
          upper: { kind: 'Null' },
          equal: { kind: 'Null' },
        },
        {
          a: { kind: 'Error', value: error },
          count: { kind: 'Error', value: error },
          upper: { kind: 'Error', value: error },
          equal: { kind: 'Error', value: error },
        },
      ]
      for (const sample of samples)
        for (const bypass of [false, true])
          for (const origin of [0, 1])
            fixtures.push({
              name: names[i * 2 + origin]!,
              row: { a: sample.a, bypass: { kind: 'Value', value: bypass } },
              expected: bypass ? { kind: 'True' } : sample[f.name as 'count' | 'upper' | 'equal'],
            })
    }
    await runCheckParity(directory, 'customarraystate', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
