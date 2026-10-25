import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves whole scalar array constants, bounds, domain values and renamed enum labels in historical rows', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-array-constants-')),
    artifact =
      process.env['PGSID_ROW_ARRAY_CONSTANT_ARTIFACT'] ??
      'artifacts/goal-checks/row-array-constants-active'
  try {
    await pg.exec(`SET extra_float_digits=1;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>0);
      CREATE TYPE phase AS ENUM('z','','a');
      CREATE DOMAIN phase_value AS phase;
      CREATE DOMAIN batch AS int4[] CHECK(cardinality(VALUE)<=3);
      CREATE DOMAIN document_value AS jsonb CHECK(jsonb_typeof(VALUE)='object');
      CREATE TYPE result_row AS(n int4,old int4);`)
    const families: {
        name: string
        type: string
        literal: string | null
        send?: string
        text: boolean
        matrix?: boolean
      }[] = [
        {
          name: 'integer',
          type: 'int4[]',
          literal: '[-2:0]={-2147483648,2147483647,NULL}',
          send: 'int4send',
          text: true,
        },
        {
          name: 'small',
          type: 'int2[]',
          literal: '{32767,-32768,NULL}',
          send: 'int2send',
          text: true,
        },
        {
          name: 'wide',
          type: 'int8[]',
          literal: '{9223372036854775807,-9223372036854775808,NULL}',
          send: 'int8send',
          text: true,
        },
        {
          name: 'matrix',
          type: 'int4[]',
          literal: '[-1:0][2:3]={{1,4},{2,3}}',
          send: 'int4send',
          text: true,
          matrix: true,
        },
        { name: 'empty', type: 'int4[]', literal: '{}', send: 'int4send', text: true },
        { name: 'nulls', type: 'int4[]', literal: '{NULL,NULL}', send: 'int4send', text: true },
        { name: 'datum_null', type: 'int4[]', literal: null, send: 'int4send', text: true },
        {
          name: 'numeric',
          type: 'numeric[]',
          literal: '[0:3]={1.2300,-0.0000,NaN,Infinity}',
          send: 'numeric_send',
          text: true,
        },
        {
          name: 'float4',
          type: 'float4[]',
          literal: '{-0,0.1,NaN,Infinity,-Infinity}',
          send: 'float4send',
          text: true,
        },
        {
          name: 'float8',
          type: 'float8[]',
          literal: '{-0,0.1,NaN,Infinity,-Infinity}',
          send: 'float8send',
          text: true,
        },
        { name: 'boolean', type: 'bool[]', literal: '{t,f,NULL}', send: 'boolsend', text: true },
        {
          name: 'text',
          type: 'text[]',
          literal: '{"","é😊","a,b","NULL",NULL}',
          send: 'textsend',
          text: true,
        },
        {
          name: 'varchar',
          type: 'varchar(3)[]',
          literal: '{abcdef,a,NULL}',
          send: 'varcharsend',
          text: true,
        },
        {
          name: 'bpchar',
          type: 'char(4)[]',
          literal: '{a,abcdef,NULL}',
          send: 'bpcharsend',
          text: true,
        },
        {
          name: 'date',
          type: 'date[]',
          literal: '{2000-01-01,0001-01-01 BC,infinity,NULL}',
          send: 'date_send',
          text: false,
        },
        {
          name: 'timestamp',
          type: 'timestamp[]',
          literal: '{"2001-02-03 12:34:56.123456","0001-01-01 00:00:00 BC",infinity,NULL}',
          send: 'timestamp_send',
          text: false,
        },
        {
          name: 'timestamptz',
          type: 'timestamptz[]',
          literal: '{"2001-02-03 12:34:56.123456+03:02","2000-01-01 00:00:00+00",infinity,NULL}',
          send: 'timestamptz_send',
          text: false,
        },
        {
          name: 'time',
          type: 'time[]',
          literal: '{12:34:56.123456,24:00,NULL}',
          send: 'time_send',
          text: true,
        },
        {
          name: 'timetz',
          type: 'timetz[]',
          literal: '{00:00+00,12:34:56.123456+03:02,24:00-05:30,NULL}',
          send: 'timetz_send',
          text: true,
        },
        {
          name: 'interval',
          type: 'interval[]',
          literal: '{P1Y2M3DT4H5M6.123456S,-infinity,infinity,NULL}',
          send: 'interval_send',
          text: false,
        },
        {
          name: 'uuid',
          type: 'uuid[]',
          literal:
            '{01234567-89ab-cdef-8012-3456789abcde,00000000-0000-0000-0000-000000000000,NULL}',
          send: 'uuid_send',
          text: true,
        },
        {
          name: 'bytea',
          type: 'bytea[]',
          literal: String.raw`{"\\x","\\x00ff80",NULL}`,
          send: 'byteasend',
          text: false,
        },
        {
          name: 'jsonpath',
          type: 'jsonpath[]',
          literal: '{"($.a + 2) * 3","exists($.x)",NULL}',
          send: 'jsonpath_send',
          text: true,
        },
        ...(['json', 'jsonb', 'document_value'] as const).map((type) => ({
          name: type === 'document_value' ? 'jsonb_domain' : type,
          type: type + '[]',
          literal:
            '{' +
            [
              '{"n":1.2300,"n":2.4500,"é":"😊"}',
              '{"n":1,"items":[null,true,{"v":9007199254740993.2300}]}',
            ]
              .map((value) => JSON.stringify(value))
              .join(',') +
            ',NULL}',
          send: type === 'json' ? 'json_send' : 'jsonb_send',
          text: true,
        })),
        {
          name: 'inet',
          type: 'inet[]',
          literal: '{192.0.2.129/24,2001:db8::1/64,NULL}',
          send: 'inet_send',
          text: true,
        },
        {
          name: 'cidr',
          type: 'cidr[]',
          literal: '{192.0.2.0/24,2001:db8::/32,NULL}',
          send: 'cidr_send',
          text: true,
        },
        {
          name: 'mac',
          type: 'macaddr8[]',
          literal: '{08:00:2b:ff:fe:01:02:03,00:00:00:00:00:00:00:00,NULL}',
          send: 'macaddr8_send',
          text: true,
        },
        {
          name: 'bits',
          type: 'bit(5)[]',
          literal: '{10101,11111,NULL}',
          send: 'bit_send',
          text: true,
        },
        {
          name: 'varbits',
          type: 'varbit[]',
          literal: '{"",101010101,NULL}',
          send: 'varbit_send',
          text: true,
        },
        {
          name: 'domain',
          type: 'positive[]',
          literal: '[0:2]={1,2,NULL}',
          send: 'int4send',
          text: true,
        },
        { name: 'enum', type: 'phase[]', literal: '{"z","","a",NULL}', text: true },
        { name: 'enum_domain', type: 'phase_value[]', literal: '{"z","","a",NULL}', text: true },
        {
          name: 'array_domain',
          type: 'batch[]',
          literal: '{"{1,2}","[0:0]={3}",NULL}',
          text: true,
        },
      ].filter(
        (f) =>
          !process.env['PGSID_ARRAY_CONSTANT_FAMILIES'] ||
          process.env['PGSID_ARRAY_CONSTANT_FAMILIES']!.split(',').includes(f.name),
      ),
      forms = families.flatMap((f) => {
        const value =
            f.literal === null ? `NULL::${f.type}` : `$array$${f.literal}$array$::${f.type}`,
          reference = f.matrix ? '(value)[i][j]' : '(value)[i]',
          item = f.matrix ? `(${value})[i][j]` : `(${value})[i]`,
          row = `ROW(n,${value})::r_${f.name}`,
          list = [
            {
              name: f.name + '_present',
              expression: `${row} IS NOT NULL`,
              reference: 'NULL::bytea',
              kind: 'plain',
            },
            {
              name: f.name + '_absent',
              expression: `${row} IS NULL`,
              reference: 'NULL::bytea',
              kind: 'plain',
            },
          ]
        if (f.send && !['text'].includes(f.name))
          list.push({
            name: f.name + '_wire',
            expression: `ROW(n,CASE WHEN ${f.send}(${item})=wire THEN n/d ELSE NULL::int4 END)::result_row IS NOT NULL`,
            reference: `${f.send}(${reference})`,
            kind: 'wire',
          })
        if (f.matrix)
          list.push({
            name: f.name + '_bucket',
            expression: `ROW(n,width_bucket(n,${value}))::result_row IS NOT NULL`,
            reference: 'NULL::bytea',
            kind: 'plain',
          })
        if (f.text) {
          list.push({
            name: f.name + '_text',
            expression: `ROW(n,CASE WHEN (${value})::text COLLATE "C"=expected COLLATE "C" THEN n/d ELSE NULL::int4 END)::result_row IS NOT NULL`,
            reference: '(value)::text',
            kind: 'text',
          })
          if (!f.matrix)
            list.push({
              name: f.name + '_slice',
              expression: `ROW(n,CASE WHEN (${value})[i:j]::text COLLATE "C"=expected COLLATE "C" THEN n/d ELSE NULL::int4 END)::result_row IS NOT NULL`,
              reference: '(value)[i:j]::text',
              kind: 'text',
            })
        }
        return list.map((form) => ({ ...form, family: f.name, type: f.type, value }))
      })
    expect(families.length).toBeGreaterThan(0)
    for (const f of families) {
      const value = f.literal === null ? `NULL::${f.type}` : `$array$${f.literal}$array$::${f.type}`
      await pg.exec(
        `CREATE TYPE r_${f.name} AS(n int4,old ${f.type});CREATE TEMP TABLE ref_${f.name}(value ${f.type});INSERT INTO ref_${f.name} VALUES(${value});`,
      )
    }
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,i int4,j int4,wire bytea,expected text,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    await pg.exec(`ALTER DOMAIN positive ADD CONSTRAINT tighter CHECK(VALUE>2) NOT VALID;
      ALTER DOMAIN batch ADD CONSTRAINT tighter CHECK(cardinality(VALUE)<=1) NOT VALID;
      ALTER DOMAIN document_value ADD CONSTRAINT tighter CHECK((VALUE->>'n')::numeric>3) NOT VALID;
      ALTER TYPE phase RENAME VALUE 'z' TO 'middle';`)
    for (const f of families) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec('ALTER TYPE result_row DROP ATTRIBUTE old')
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
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
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        extraFloatDigits: 1,
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
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
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    const input = (value: number | string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const [i, j] of [
        [-2, 0],
        [0, 2],
        [1, 3],
        [2, 3],
        [3, 4],
        [4, 5],
        [null, 1],
      ] as const) {
        const ref = (
          await pg.query<{ value: string | null }>(
            `SELECT ${f.kind === 'wire' ? `encode(${f.reference},'hex')` : f.kind === 'text' ? f.reference : 'NULL::text'} value FROM ref_${f.family} CROSS JOIN(SELECT $1::int4 i,$2::int4 j) indices`,
            [i, j],
          )
        ).rows[0]!.value
        for (const [n, d, wrong, bypass] of [
          [1, 1, false, false],
          [1, 0, false, false],
          [1, 0, true, false],
          [null, 0, false, false],
          [1, null, false, false],
          [1, 0, false, true],
        ] as const) {
          const wire = f.kind === 'wire' ? (wrong ? '00' : ref) : null,
            expectedText = f.kind === 'text' ? (wrong ? 'wrong' : ref) : null,
            params = [
              n,
              d,
              i,
              j,
              wire === null ? null : Buffer.from(wire, 'hex'),
              expectedText,
              bypass,
            ]
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5,$6,$7)`, params)
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5,$6,$7)`, params)
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
              i: input(i),
              j: input(j),
              wire: input(wire),
              expected: input(expectedText),
              bypass: input(bypass),
            }
          native.push({ name: f.name, row, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + origin, row, expected })
        }
      }
    for (const f of forms)
      for (const origin of ['source', 'stored']) {
        const row = {
          n: input(1),
          d: input(1),
          i: input(1),
          j: input(1),
          wire: input(null),
          expected: input(null),
          bypass: input(false),
        }
        const error = { kind: 'Error' as const, value: { state: parseInt('22012', 36) } }
        fixtures.push(
          {
            name: f.name + '_' + origin,
            row: { ...row, n: error, bypass: input(true) },
            expected: { kind: 'True' },
          },
          {
            name: f.name + '_' + origin,
            row: { ...row, n: { kind: 'Unknown' }, bypass: input(true) },
            expected: { kind: 'True' },
          },
        )
      }
    await writeFile(join(artifact, 'native-reference.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-array-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
