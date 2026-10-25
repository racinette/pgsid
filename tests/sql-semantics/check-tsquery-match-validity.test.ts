import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves later parse errors after safe matching prerequisites while retaining possible earlier weight errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-match-validity-')),
    packet = 'artifacts/goal-checks/tsquery-match-active'
  const forms: Record<string, string> = {
    forward: 'item @@ source::tsquery',
    reverse: 'source::tsquery @@ item',
    stripped: 'strip(item) @@ source::tsquery',
    weighted: "setweight(item,'A') @@ source::tsquery",
    bad_weight: "setweight(item,'Z') @@ source::tsquery",
  }
  const check = (sql: string) => `CASE WHEN bypass THEN true ELSE ${sql} END`
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const failure = (state: string): Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE validity_${name}(item tsvector,source text,bypass bool,CONSTRAINT rule CHECK(${check(sql)}))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(forms).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'validity_' + name)!,
          rule = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source' ? { ...rule, definition: `CHECK(${check(sql)})` } : rule,
              [],
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, { serverEncoding: 'UTF8', defaultCollation: 'C' })
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const item of [null, 'a:1'])
      for (const source of ['a', 'a &'])
        for (const bypass of [false, true])
          for (const [name, sql] of Object.entries(forms)) {
            const select = 'SELECT $1::tsvector item,$2::text source,$3::bool bypass',
              args = [item, source, bypass]
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${check(sql)} value FROM (${select}) input`,
                  args,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            let rejection: string | undefined
            try {
              await pg.query(`INSERT INTO validity_${name} ${select}`, args)
            } catch (e) {
              rejection = (e as { code: string }).code
            }
            expect(rejection).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            const expected: Outcome = state
                ? failure(state)
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
              row: Row = {
                item:
                  item === null
                    ? known(null)
                    : known({
                        lexemes: [{ text: 'a', positions: [{ position: 1, weight: 0 }] }],
                        nativeBytes: -1,
                      }),
                source: known(source),
                bypass: known(bypass),
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({ item, source, bypass, name, value, state, rejection })
          }
    for (const source of ['a', 'a &'])
      for (const bypass of [false, true])
        for (const name of Object.keys(forms)) {
          const expected: Outcome = bypass
            ? { kind: 'True' }
            : source === 'a &' && name !== 'bad_weight'
              ? failure('42601')
              : { kind: 'Unknown' }
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { item: { kind: 'Unknown' }, source: known(source), bypass: known(bypass) },
              expected,
            })
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'validity-reference.json'),
      JSON.stringify({ nativeInserts: inserts, fixtures: fixtures.length, references }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'tsquerymatchvalidity',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
