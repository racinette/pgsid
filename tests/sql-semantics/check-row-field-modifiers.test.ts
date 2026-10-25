import { jsonpathStoragePaths } from './check-jsonpath-storage-fixtures.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves native row field modifiers through widening, explicit casts and array element coercions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-field-modifiers-')),
    artifact = 'artifacts/goal-checks/row-field-modifiers-active'
  try {
    const families = [
        {
          name: 'varchar',
          old: 'varchar(3)',
          next: 'varchar(5)',
          base: 'varchar',
          send: 'varcharsend',
          labels: ['abcdef', 'a', '', null],
        },
        {
          name: 'bpchar',
          old: 'char(3)',
          next: 'char(5)',
          base: 'bpchar',
          send: 'bpcharsend',
          labels: ['abcdef', 'a', '', null],
        },
        {
          name: 'numeric',
          old: 'numeric(4,2)',
          next: 'numeric(6,3)',
          base: 'numeric',
          send: 'numeric_send',
          labels: ['1.235', '99.995', '9999', '-1.235', 'bad', null],
        },
        {
          name: 'bit',
          old: 'bit(5)',
          next: 'bit(6)',
          base: 'varbit',
          send: 'bit_send',
          labels: ['1010111', '1', '', 'bad', null],
        },
        {
          name: 'varbit',
          old: 'varbit(5)',
          next: 'varbit(8)',
          base: 'varbit',
          send: 'varbit_send',
          labels: ['1010111', '1', '', 'bad', null],
        },
        {
          name: 'time',
          old: 'time(2)',
          next: 'time(4)',
          base: 'time',
          send: 'time_send',
          labels: ['12:34:56.123456', '23:59:59.995', '25:00', null],
        },
        {
          name: 'timetz',
          old: 'timetz(2)',
          next: 'timetz(4)',
          base: 'timetz',
          send: 'timetz_send',
          labels: ['12:34:56.123456+03:02', '23:59:59.995-05:30', '25:00+00', null],
        },
        {
          name: 'timestamp',
          old: 'timestamp(2)',
          next: 'timestamp(4)',
          base: 'timestamp',
          send: 'timestamp_send',
          labels: [
            '2001-02-03 12:34:56.123456',
            '2001-12-31 23:59:59.995',
            '1900-02-29 00:00:00Z',
            null,
          ],
        },
        {
          name: 'timestamptz',
          old: 'timestamptz(2)',
          next: 'timestamptz(4)',
          base: 'timestamptz',
          send: 'timestamptz_send',
          labels: [
            '2001-02-03 12:34:56.123456+03:02',
            '2001-12-31 23:59:59.995-05:30',
            '1900-02-29 00:00:00Z',
            null,
          ],
        },
        {
          name: 'interval',
          old: 'interval second(2)',
          next: 'interval second(4)',
          base: 'interval',
          send: 'interval_send',
          labels: ['P1DT12H34M56.123456S', 'PT0.005S', 'P1M2DT3H4M5.995S', 'P1Y2', null],
        },
      ].filter(
        (f) =>
          !process.env['PGSID_ROW_MODIFIER_FAMILIES'] ||
          process.env['PGSID_ROW_MODIFIER_FAMILIES']!.split(',').includes(f.name),
      ),
      forms = families.flatMap((f) =>
        [false, true].flatMap((array) =>
          [false, true].map((explicit) => {
            const name =
                f.name +
                '_' +
                (array ? 'array' : 'scalar') +
                '_' +
                (explicit ? 'explicit' : 'implicit'),
              arg = array
                ? `ARRAY[label::${explicit ? f.old : f.base}]`
                : `label::${explicit ? f.old : f.base}`,
              old = f.old + (array ? '[]' : ''),
              next = f.next + (array ? '[]' : ''),
              field = `(ROW(n,${arg})::r_${name}).v`,
              item = (value: string) => (array ? `(${value})[1]` : value),
              wire = `${f.send}(${item(field)})`
            return { ...f, name, arg, array, explicit, old, next, wire, item }
          }),
        ),
      )
    expect(forms.length).toBeGreaterThan(0)
    for (const f of forms) {
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,v ${f.old});
        CREATE TABLE evolving_${f.name}(n int4,label text,expected bytea,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${f.wire}=expected END));
        CREATE TABLE null_${f.name}(n int4,label text,expected bytea,bypass bool,CONSTRAINT valid CHECK((CASE WHEN bypass THEN true ELSE ${f.wire}=expected END) IS NULL));`)
    }
    for (const f of forms) await pg.exec(`ALTER TYPE r_${f.name} ALTER ATTRIBUTE v TYPE ${f.next}`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.wire}=expected END)`
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
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      join(artifact, 'constraints.json'),
      JSON.stringify(
        c.tables
          .filter((t) => t.name.startsWith('evolving_'))
          .map((t) => ({
            name: t.name,
            constraints: t.constraints,
          })),
        null,
        2,
      ) + '\n',
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name).toBe('supported')
    for (const f of forms)
      for (const label of f.labels) {
        const candidates = new Set<string | null>([null, '00']),
          raw = f.arg.replaceAll('label', '$1::text'),
          expressions = [
            f.wire.replaceAll('label', '$1::text').replace(/\bn\b/gu, '1'),
            `${f.send}(${f.item(`((${raw})::${f.old})::${f.next}`)})`,
            `${f.send}(${f.item(`(${raw})::${f.old}`)})`,
          ]
        for (const expression of expressions) {
          try {
            const wire = (
              await pg.query<{ wire: string | null }>(`SELECT encode(${expression},'hex') wire`, [
                label,
              ])
            ).rows[0]!.wire
            candidates.add(wire)
          } catch {}
        }
        for (const bytes of candidates)
          for (const bypass of [false, true]) {
            let error: string | undefined,
              isNull = false
            try {
              await pg.query(`INSERT INTO evolving_${f.name} VALUES(1,$1,$2,$3)`, [
                label,
                bytes === null ? null : Buffer.from(bytes, 'hex'),
                bypass,
              ])
            } catch (e) {
              error = (e as { code: string }).code
            }
            if (!error) {
              try {
                await pg.query(`INSERT INTO null_${f.name} VALUES(1,$1,$2,$3)`, [
                  label,
                  bytes === null ? null : Buffer.from(bytes, 'hex'),
                  bypass,
                ])
                isNull = true
              } catch (e) {
                expect((e as { code: string }).code).toBe('23514')
              }
            }
            const expected: Outcome = error
                ? error === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(error, 36) } }
                : { kind: isNull ? 'Null' : 'True' },
              row: Row = {
                n: { kind: 'Value', value: 1 },
                label: label === null ? { kind: 'Null' } : { kind: 'Value', value: label },
                expected: bytes === null ? { kind: 'Null' } : { kind: 'Value', value: bytes },
                bypass: { kind: 'Value', value: bypass },
              }
            native.push({ name: f.name, label, bytes, bypass, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: f.name + '_' + origin, row, expected })
          }
      }
    for (const f of forms)
      expect(
        native.some((item) => {
          const value = item as { name: string; label: unknown; bypass: boolean; expected: Outcome }
          return (
            value.name === f.name &&
            value.label !== null &&
            !value.bypass &&
            value.expected.kind === 'True'
          )
        }),
        f.name,
      ).toBe(true)
    for (const f of forms)
      for (const origin of ['source', 'stored']) {
        const opaque: Row = {
          n: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          expected: { kind: 'Unknown' },
          bypass: { kind: 'Value', value: true },
        }
        fixtures.push(
          { name: f.name + '_' + origin, row: opaque, expected: { kind: 'True' } },
          {
            name: f.name + '_' + origin,
            row: {
              ...opaque,
              n: { kind: 'Value', value: 1 },
              label: { kind: 'Error', value: { state: parseInt('22003', 36) } },
              expected: { kind: 'Null' },
              bypass: { kind: 'Value', value: false },
            },
            expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          },
          {
            name: f.name + '_' + origin,
            row: { ...opaque, bypass: { kind: 'Value', value: false } },
            expected: { kind: 'Unknown' },
          },
        )
      }
    await writeFile(join(artifact, 'native-reference.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-field-modifiers',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('preserves Unicode character widths and fixed-width padding through source and stored row coercions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-character-modifiers-')),
    artifact = 'artifacts/goal-checks/row-field-modifiers-active'
  try {
    const forms = ['varchar', 'char'].flatMap((type) =>
      [false, true].map((explicit) => {
        const name = type + '_' + (explicit ? 'explicit' : 'implicit'),
          base = type === 'char' ? 'bpchar' : type,
          arg = `label::${explicit ? type + '(3)' : base}`,
          field = `(ROW(n,${arg})::r_${name}).v`,
          source = `CHECK(CASE WHEN bypass THEN true ELSE
            (${field}::text COLLATE "C") IS NOT DISTINCT FROM (expected COLLATE "C")
            AND octet_length(${field}) IS NOT DISTINCT FROM expected_octets END)`
        return { type, name, source }
      }),
    )
    for (const f of forms)
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,v ${f.type}(3));
        CREATE TABLE t_${f.name}(n int4,label text,expected text,expected_octets int4,bypass bool,CONSTRAINT valid ${f.source});
        ALTER TYPE r_${f.name} ALTER ATTRIBUTE v TYPE ${f.type}(5);`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = c.tables.find((t) => t.name === 't_' + f.name)!
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            table,
            table.constraints[0]!,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source' ? f.source : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = [],
      input = (value: string | number | boolean | null): Row[string] =>
        value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const check of group.checks) expect(check.kind).toBe('supported')
    for (const f of forms)
      for (const label of ['é😊ab', '😊', 'é ', '', null]) {
        const value = `(CAST(CAST($1::text AS ${f.type}(3)) AS ${f.type}(5)))`,
          correct = (
            await pg.query<{ text: string | null; octets: number | null }>(
              `SELECT ${value}::text text,octet_length(${value}) octets`,
              [label],
            )
          ).rows[0]!
        for (const [expected, octets] of [
          [correct.text, correct.octets],
          ['wrong', correct.octets],
          [correct.text, -1],
        ] as const)
          for (const bypass of [false, true]) {
            let error: string | undefined
            try {
              await pg.query(`INSERT INTO t_${f.name} VALUES(1,$1,$2,$3,$4)`, [
                label,
                expected,
                octets,
                bypass,
              ])
            } catch (e) {
              error = (e as { code: string }).code
            }
            const outcome: Outcome = error
                ? error === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(error, 36) } }
                : { kind: 'True' },
              row: Row = {
                n: input(1),
                label: input(label),
                expected: input(expected),
                expected_octets: input(octets),
                bypass: input(bypass),
              }
            native.push({ name: f.name, row, expected: outcome })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: f.name + '_' + origin, row, expected: outcome })
          }
      }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'unicode.json'),
      JSON.stringify({ plans, native, fixtures }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/row-character-modifiers',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('recovers native JSONPath graphs inside historically coerced row fields after CHECK reparsing', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-modifier-provenance-')),
    artifact = 'artifacts/goal-checks/row-field-modifiers-active'
  try {
    const source = `CHECK(CASE WHEN bypass THEN true ELSE
      (ROW(n,CASE WHEN jsonb_path_match(document,'((-$.x).abs()) == 1'::jsonpath)
        THEN label::varbit ELSE B'00'::varbit END)::reading).v = expected END)`
    await pg.exec(`CREATE TYPE reading AS(n int4,v bit(5));
      CREATE TABLE history(n int4,document jsonb,label text,expected bit(6),bypass bool,CONSTRAINT valid ${source});
      ALTER TYPE reading ALTER ATTRIBUTE v TYPE bit(6);`)
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'history')!,
      plans = (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: 'history',
          constraint: origin,
        },
        expression: lowerTableCheck(
          table,
          table.constraints[0]!,
          c.enums,
          c.domains,
          origin,
          c.rangeTypes,
          c.compositeTypeGraph,
          origin === 'source' ? source : undefined,
        )!.expression,
      })),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const x of [-1, 1, 2])
      for (const expected of ['101010', '101011', '000000'])
        for (const bypass of [false, true]) {
          let error: string | undefined
          try {
            await pg.query('INSERT INTO history VALUES(1,$1,$2,$3,$4)', [
              JSON.stringify({ x }),
              '1010111',
              expected,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
          }
          const outcome: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: 'True' },
            row: Row = {
              n: { kind: 'Value', value: 1 },
              document: { kind: 'Value', value: JSON.stringify({ x }) },
              label: { kind: 'Value', value: '1010111' },
              expected: { kind: 'Value', value: expected },
              bypass: { kind: 'Value', value: bypass },
            }
          native.push({ x, expected, bypass, outcome })
          fixtures.push(
            { name: 'source', row, expected: outcome },
            { name: 'stored', row, expected: outcome },
          )
        }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'source-provenance.json'),
      JSON.stringify({ plans, native, fixtures }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/row-modifier-provenance',
      group,
      ['source', 'stored'],
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('executes recovered native JSONPath node families through both source and stored row fields', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-jsonpath-storage-')),
    artifact = 'artifacts/goal-checks/row-field-modifiers-active'
  try {
    await pg.exec('CREATE TYPE reading AS(n int4,path jsonpath)')
    const forms = jsonpathStoragePaths.map((path, index) => ({
      path,
      name: 'path_' + index,
      source: `CHECK(CASE WHEN bypass THEN true ELSE ((ROW(n,'${path.replaceAll("'", "''")}'::jsonpath)::reading).path)::text COLLATE "C" = expected COLLATE "C" END)`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(n int4,expected text COLLATE "C",bypass bool,CONSTRAINT valid ${f.source})`,
      )
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = c.tables.find((t) => t.name === f.name)!
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            table,
            table.constraints[0]!,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source' ? f.source : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const check of group.checks) expect(check.kind).toBe('supported')
    for (const f of forms) {
      const bytes = (await pg.query<{ wire: string }>('SELECT $1::jsonpath::text wire', [f.path]))
        .rows[0]!.wire
      for (const expected of [bytes, 'wrong', null]) {
        let error: string | undefined
        try {
          await pg.query(`INSERT INTO ${f.name} VALUES(1,$1,false)`, [expected])
        } catch (e) {
          error = (e as { code: string }).code
        }
        const outcome: Outcome = error
            ? error === '23514'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(error, 36) } }
            : { kind: expected === null ? 'Null' : 'True' },
          row: Row = {
            n: { kind: 'Value', value: 1 },
            expected: expected === null ? { kind: 'Null' } : { kind: 'Value', value: expected },
            bypass: { kind: 'Value', value: false },
          }
        native.push({ path: f.path, row, expected: outcome })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: f.name + '_' + origin, row, expected: outcome })
      }
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'jsonpath-node-families.json'),
      JSON.stringify({ plans, native, fixtures }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/row-jsonpath-storage',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
