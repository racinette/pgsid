import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('recovers XML storage and exact money units through scalar and nested historical expressions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-xml-money-')),
    artifact = 'artifacts/goal-checks/row-xml-money-active',
    quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
  try {
    await pg.exec(`SET xmloption=content;
      CREATE DOMAIN amount AS money CHECK(VALUE>='0'::money);
      CREATE TYPE xml_record AS(document xml,label text COLLATE "C");
      CREATE TYPE mixed_record AS(document xml,amounts amount[]);`)
    const definitions = [
        { name: 'xml_document', type: 'xml', input: "'<r/>'", send: 'xml_send' },
        { name: 'xml_empty', type: 'xml', input: "''", send: 'xml_send' },
        { name: 'xml_content', type: 'xml', input: "'text<a/>tail'", send: 'xml_send' },
        { name: 'xml_unicode', type: 'xml', input: "'\ufeff<é>😊</é>'", send: 'xml_send' },
        {
          name: 'xml_declaration',
          type: 'xml',
          input: '\'<?xml version="1.0" encoding=""?><r/>\'',
          send: 'xml_send',
        },
        {
          name: 'xml_standalone',
          type: 'xml',
          input: '\'<?xml version="1.0" standalone="yes"?><r/>\'',
          send: 'xml_send',
        },
        { name: 'xml_null', type: 'xml', input: 'NULL', send: 'xml_send' },
        {
          name: 'xml_array',
          type: 'xml[]',
          input: '\'[-2:0]={"text<a/>",NULL,"<é>😊</é>"}\'',
          send: 'xml_send',
          index: -2,
        },
        { name: 'xml_record', type: 'xml_record', input: `ROW('text<a/>'::xml,'é😊'::text)` },
        {
          name: 'mixed_record',
          type: 'mixed_record',
          input: `ROW('text<a/>'::xml,ARRAY['1.25'::amount,NULL])`,
        },
        ...[
          '-92233720368547758.08',
          '-90071992547409.93',
          '-1.25',
          '0',
          '1.25',
          '90071992547409.93',
          '92233720368547758.07',
        ].map((amount, i) => ({
          name: 'money_' + i,
          type: 'money',
          input: quote(amount),
          send: 'cash_send',
        })),
        { name: 'money_null', type: 'money', input: 'NULL', send: 'cash_send' },
        {
          name: 'money_array',
          type: 'money[]',
          input: '\'[-2:0]={"$1.25",NULL,"-$2.50"}\'',
          send: 'cash_send',
          index: -2,
        },
        {
          name: 'money_domain_array',
          type: 'amount[]',
          input: '\'[-2:0]={"$1.25",NULL,"$2.50"}\'',
          send: 'cash_send',
          index: -2,
        },
      ],
      observe = (value: string, f: { send?: string; index?: number }) =>
        f.send
          ? `encode(${f.send}(${f.index === undefined ? value : '(' + value + ')[' + f.index + ']'}),'hex')`
          : `to_jsonb(${value})::text`,
      forms: { name: string; family: string; expression: string }[] = [],
      values: unknown[] = []
    await pg.exec('CREATE TYPE scalar_result AS(n int4,old int4)')
    for (const f of definitions) {
      const expression = `(${f.input})::${f.type}`,
        sample = (
          await pg.query<{ text: string | null; expected: string | null }>(
            `SELECT (${expression})::text text,${observe(expression, f)} expected`,
          )
        ).rows[0]!,
        value =
          f.type === 'xml'
            ? `(${f.input})::xml`
            : `${sample.text === null ? 'NULL' : quote(sample.text)}::${f.type}`,
        expected = sample.expected,
        observed = `(${observe(value, f)}${expected === null ? ' IS NULL' : ' COLLATE "C" = ' + quote(expected) + ' COLLATE "C"'})`,
        scalar = `ROW(n,CASE WHEN ${observed} THEN n/d ELSE NULL::int4 END)::scalar_result`
      values.push({ ...f, value, expected })
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type})`)
      forms.push(
        {
          name: f.name + '_value',
          family: f.name,
          expression: `ROW(n,${value})::r_${f.name} IS NOT NULL`,
        },
        { name: f.name + '_observed', family: f.name, expression: `${scalar} IS NOT NULL` },
        { name: f.name + '_projected', family: f.name, expression: `(${scalar}).n>=1` },
      )
    }
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    for (const f of definitions) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec(`ALTER TYPE scalar_result DROP ATTRIBUTE old; SET xmloption=document;
      ALTER DOMAIN amount ADD CHECK(VALUE>='10'::money);`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
        if (f.family === 'xml_declaration')
          expect(JSON.stringify(k.rowCoercionContext)).toContain(
            JSON.stringify('<?xml version="1.0" encoding=""?><r/>').slice(1, -1),
          )
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
        moneyLocale: 'C',
        moneyFractionDigits: 2,
        xmlOption: 'document',
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    const pureMoney = plans.filter((p) => p.name.startsWith('money_')),
      pure = prepareCheckRustGroup(pureMoney, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
      }),
      changed = prepareCheckRustGroup(pureMoney, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        moneyLocale: 'C',
        moneyFractionDigits: 0,
      })
    expect(changed.evaluatorSource).toBe(pure.evaluatorSource)
    expect(
      prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        moneyLocale: 'C',
        moneyFractionDigits: 2,
        xmlOption: 'content',
      }).evaluatorSource,
    ).toBe(group.evaluatorSource)
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    const input = (value: number | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const [n, d, bypass] of [
        [1, 1, false],
        [1, 0, false],
        [null, 0, false],
        [-1, 1, false],
        [2, null, false],
        [1, 0, true],
      ] as const) {
        let error: string | undefined,
          isNull = false
        try {
          await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3)`, [n, d, bypass])
        } catch (e) {
          error = (e as { code: string }).code
        }
        if (!error)
          try {
            await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3)`, [n, d, bypass])
            isNull = true
          } catch (e) {
            expect((e as { code: string }).code).toBe('23514')
          }
        const expected: Outcome = error
            ? error === '23514'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(error, 36) } }
            : { kind: isNull ? 'Null' : 'True' },
          row: Row = { n: input(n), d: input(d), bypass: input(bypass) }
        native.push({ name: f.name, row, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: f.name + '_' + origin, row, expected })
      }
    for (const f of forms)
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: f.name + '_' + origin,
          row: { n: { kind: 'Unknown' }, d: { kind: 'Unknown' }, bypass: input(true) },
          expected: { kind: 'True' },
        })
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({
      plans,
      values,
      contexts: c.tables
        .filter((t) => t.name.startsWith('evolving_'))
        .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
      'native-reference': native,
      fixtures,
    }))
      await writeFile(join(artifact, file + '.json'), JSON.stringify(value, null, 2) + '\n')
    await writeFile(join(artifact, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'example.com/row-xml-money',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
