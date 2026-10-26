import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
it('honors explicit client UTF8 for text, name, varchar and bpchar send while retaining missing-context states', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-text-send-context-'))
  try {
    const definitions = [
      ['name', 'name', 'namesend'],
      ['text', 'text', 'textsend'],
      ['varchar', 'varchar', 'varcharsend'],
      ['bpchar', 'bpchar', 'bpcharsend'],
    ] as const
    for (const [name, type, fn] of definitions)
      await pg.exec(
        `CREATE TABLE send_${name}(value ${type},expected bytea,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE ${fn}(value)=expected END))`,
      )
    const c = await snapshotCatalog(pg),
      plans = definitions.flatMap(([name]) => {
        const t = c.tables.find((t) => t.name === 'send_' + name)!,
          k = t.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
        }))
      })
    const known = (value: string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const utf8 of [false, true]) {
      const group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          ...(utf8 ? { clientEncoding: 'UTF8' as const } : {}),
        }),
        fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const check of group.checks) expect(check.kind).toBe('supported')
      for (const [name, type, fn] of definitions)
        for (const value of [null, '', 'ASCII ', 'é😊'])
          for (const bypass of [false, true]) {
            const observed = (
                await pg.query<{ wire: string | null }>(
                  `SELECT encode(${fn}($1::${type}),'hex') wire`,
                  [value],
                )
              ).rows[0]!.wire,
              expected: Outcome = {
                kind: bypass
                  ? 'True'
                  : value === null
                    ? 'Null'
                    : !utf8 && /[^\x00-\x7f]/u.test(value)
                      ? 'Unknown'
                      : 'True',
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: {
                  value: known(value),
                  expected:
                    observed === null ? { kind: 'Null' } : { kind: 'Value', value: observed },
                  bypass: known(bypass),
                },
                expected,
              })
          }
      for (const [name] of definitions)
        for (const origin of ['source', 'stored'])
          for (const value of [
            { kind: 'Unknown' } as const,
            { kind: 'Error', value: { state: parseInt('22003', 36) } } as const,
          ])
            fixtures.push({
              name: name + '_' + origin,
              row: { value, expected: known(''), bypass: known(false) },
              expected: value.kind === 'Unknown' ? { kind: 'Unknown' } : value,
            })
      const profileRoot = join(root, utf8 ? 'utf8' : 'missing')
      await mkdir(profileRoot)
      await runCheckParity(
        profileRoot,
        'example.com/text-send-context',
        group,
        plans.map((p) => p.name),
        fixtures,
      )
    }
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
