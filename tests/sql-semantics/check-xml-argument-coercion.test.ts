import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('uses assignment casts and catalog text output for XML syntax arguments in source and stored CHECKs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-arguments-'))
  const value = (v: string | number | boolean | null): Input =>
    v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
  try {
    const operations = {
      pi_integer: 'xmlpi(NAME n,i)::text',
      pi_numeric: 'xmlpi(NAME n,n)::text',
      pi_boolean: 'xmlpi(NAME n,b)::text',
      pi_network: 'xmlpi(NAME n,address)::text',
      pi_character: 'xmlpi(NAME n,code)::text',
      pi_xml: 'xmlpi(NAME n,xmlparse(CONTENT raw))::text',
      parse_integer: 'xmlserialize(CONTENT xmlparse(CONTENT i) AS text)',
      parse_document_integer: 'xmlserialize(CONTENT xmlparse(DOCUMENT i) AS text)',
      parse_character: 'xmlserialize(CONTENT xmlparse(CONTENT code) AS text)',
      root_numeric: 'xmlroot(xmlparse(CONTENT raw),VERSION n,STANDALONE NO VALUE)::text',
      root_boolean: 'xmlroot(xmlparse(CONTENT raw),VERSION b,STANDALONE NO VALUE)::text',
      pi_literal: 'xmlpi(NAME n,42)::text',
      root_literal: "xmlroot('<r/>'::xml,VERSION 1.100)::text",
      checked_domain: '(raw::xml_notice)::text',
    }
    const entries = Object.entries(operations),
      checks = entries.map(([name, expr], selector) => ({
        name,
        expr,
        sql: `CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${expr})=expected END`,
      }))
    await pg.exec(
      `CREATE DOMAIN xml_notice AS text CHECK(xmlpi(NAME "😀",VALUE)::text = '<?_x1F600_ ' || VALUE || '?>');
       CREATE TABLE xml_arguments(i integer,n numeric,b boolean,address inet,code char(4),raw text,selector integer,expected text,bypass boolean,${checks.map((c) => `CONSTRAINT ${c.name} CHECK(${c.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_arguments')!
    const plans = checks.flatMap((c) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints.find((x) => x.name === c.name)!,
            [],
            catalog.domains,
            origin as 'source' | 'stored',
            [],
            undefined,
            origin === 'source' ? `CHECK(${c.sql})` : undefined,
          )!.expression,
        ),
      })),
    )
    for (const p of plans) expect(hasUncertain(p.expression), p.identity.constraint).toBe(false)
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      xmlOption: 'content',
    })
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const samples = [
      [42, '1.100', true, '192.168.1.1/24', 'x   ', '<r/>'],
      [-3, '-2.00', false, '127.0.0.1/32', '    ', 'plain'],
      [0, 'NaN', true, '::1/128', '<r/>', '<?xml version="1.0"?><r/>'],
      [2147483647, 'Infinity', false, '::/0', 'bad ', '<r>'],
      [null, null, null, null, null, null],
    ] as const
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let nativeInserts = 0
    for (const [selector, [name, expr]] of entries.entries())
      for (const sample of samples) {
        let expected: string | null = null,
          outcome: Outcome
        try {
          const encoded = (
            await pg.query<{ result: string | null }>(
              `SELECT encode(convert_to((${expr})::text,'UTF8'),'hex') result FROM (SELECT $1::integer i,$2::numeric n,$3::boolean b,$4::inet address,$5::char(4) code,$6::text raw) candidate`,
              [...sample],
            )
          ).rows[0]!.result
          expected = encoded === null ? null : Buffer.from(encoded, 'hex').toString('utf8')
          outcome = { kind: expected === null ? 'Null' : 'True' }
        } catch (e) {
          outcome = { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
        }
        const row: Row = {
          i: value(sample[0]),
          n: value(sample[1]),
          b: value(sample[2]),
          address: value(sample[3]),
          code: value(sample[4]),
          raw: value(sample[5]),
          selector: value(selector),
          expected: value(expected),
          bypass: value(false),
        }
        const insert = pg.query('INSERT INTO xml_arguments VALUES($1,$2,$3,$4,$5,$6,$7,$8,false)', [
          ...sample,
          selector,
          expected,
        ])
        if (outcome.kind === 'Error')
          await expect(insert).rejects.toMatchObject({
            code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
          })
        else await insert
        nativeInserts++
        for (const origin of ['source', 'stored'])
          fixtures.push(
            { name: name + '_' + origin, row, expected: outcome },
            {
              name: name + '_' + origin,
              row: { ...row, bypass: value(true) },
              expected: { kind: 'True' },
            },
          )
        if (expected !== null && outcome.kind !== 'Error') {
          await expect(
            pg.query('INSERT INTO xml_arguments VALUES($1,$2,$3,$4,$5,$6,$7,$8,false)', [
              ...sample,
              selector,
              'different',
            ]),
          ).rejects.toMatchObject({ code: '23514', constraint: name })
          nativeInserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, expected: value('different') },
              expected: { kind: 'False' },
            })
        }
      }
    for (const sql of [
      'xmlconcat(raw)',
      'xmlroot(raw,VERSION 1.0)',
      'xmlserialize(CONTENT raw AS text)',
    ]) {
      await expect(
        pg.exec(`CREATE TABLE invalid_xml_argument(raw text,CHECK((${sql}) IS NULL))`),
      ).rejects.toMatchObject({ code: '42804' })
      expect(
        hasUncertain(
          lowerTableCheck(
            { columns: [{ name: 'raw', typeName: 'text' }] },
            { name: 'rejected', type: 'check', definition: `CHECK((${sql}) IS NULL)` },
            [],
            [],
            'source',
          )!.expression,
        ),
      ).toBe(true)
    }
    await runCheckParity(
      root,
      'xmlarguments',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    console.info('XML argument parity', {
      nativeInserts,
      fixtures: fixtures.length,
      forms: entries.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
