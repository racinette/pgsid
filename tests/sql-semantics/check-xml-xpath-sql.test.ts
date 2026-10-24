import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

it('binds XPath and XMLExists with native namespace validation, result arrays, source/stored syntax and explicit context in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-sql-'))
  const packet = 'artifacts/goal-checks/xml-xpath-sql-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const operations = {
      exists: 'xpath_exists(p,v)::text',
      namespaced: 'xpath_exists(p,v,ns)::text',
      standard: '(XMLEXISTS(p PASSING BY REF v BY REF))::text',
      count: 'cardinality(xpath(p,v))::text',
      count_ns: 'cardinality(xpath(p,v,ns))::text',
      first: '(xpath(p,v))[1]::text',
      first_ns: '(xpath(p,v,ns))[1]::text',
      shape: 'array_dims(xpath(p,v,ns))',
      render: 'xpath(p,v,ns)::text',
      wire: "encode(xml_send((xpath(p,v,ns))[1]),'hex')",
    }
    const entries = Object.entries(operations),
      checks = entries.map(([name, expression], i) => ({
        name,
        expression,
        sql: `CASE WHEN bypass OR selector<>${i} THEN true ELSE (${expression}) IS NOT DISTINCT FROM expected END`,
      }))
    await pg.exec(
      `SET xmloption=CONTENT;CREATE TABLE xpath_checked(v xml,p text,ns text[],selector int,expected text,bypass bool,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')});`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xpath_checked')!
    const full: CheckExecutionContext = {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      xmlOption: 'content',
      extraFloatDigits: 1,
      xpathRecursionLimit: 5000,
    }
    const { extraFloatDigits: _digits, ...withoutDigits } = full,
      { xpathRecursionLimit: _limit, ...withoutLimit } = full
    const profiles = [
      { name: 'full', context: full },
      { name: 'no_digits', context: withoutDigits },
      { name: 'no_limit', context: withoutLimit },
    ]
    const groups = profiles.map((profile) =>
      prepareCheckRustGroup(
        checks.flatMap((c) =>
          ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: profile.name + '_' + c.name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((x) => x.name === c.name)!,
                [],
                [],
                origin as 'source' | 'stored',
                [],
                undefined,
                origin === 'source' ? `CHECK(${c.sql})` : undefined,
              )!.expression,
            ),
          })),
        ),
        profile.context,
      ),
    )
    for (const group of groups)
      expect(group.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        ...groups[0]!,
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: {
          ...groups[0]!.source!,
          modules: groups[0]!.source!.modules.map((m) =>
            m.name === 'checks'
              ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
              : m,
          ),
        },
      }
    const samples: {
      v: string | null
      p: string | null
      ns: string | null
      numeric?: boolean
      limit?: boolean
    }[] = []
    const base =
      '<r xmlns:p="urn:p" a="&amp;&lt;&#13;"><x>1</x><x/><p:x>é😊</p:x><![CDATA[<&]]><!--c--><?p?></r>'
    for (const p of [
      '/',
      '/*',
      '//x',
      '//missing',
      '//text()',
      '//@a',
      '//p:x',
      'false()',
      'true()',
      "''",
      "'&<é😊'",
      'string(//@a)',
      '1 div 3',
      '1000000',
      '-0',
      '0 div 0',
      '1 div 0',
      'count(//x)',
      'string(1 div 3)',
    ])
      samples.push({ v: base, p, ns: '{{p,urn:p}}', numeric: ['1 div 3', '1000000'].includes(p) })
    for (const v of [
      '',
      'plain',
      '<a/><b/>',
      '<?xml version="1.0" encoding=""?><r/>',
      '<?xml version="1.1" standalone="yes"?><r/>',
      '<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>',
    ])
      for (const p of ['/*', '//missing', 'false()', '(']) samples.push({ v, p, ns: '{}' })
    const mappings = [
      '{}',
      '{p,urn:p}',
      '{{p}}',
      '{{NULL,urn:p}}',
      '{{p,NULL}}',
      '{{"",urn:p}}',
      '{{p,""}}',
      '{{p,urn:p},{p,urn:q}}',
      '[-2:-1][5:6]={{p,urn:p},{q,urn:q}}',
      '{{xml,urn:p}}',
      '{{a:b,urn:p}}',
    ]
    for (const ns of mappings)
      for (const v of ['<r/>', 'plain'])
        for (const p of ['', '(', '/p:r']) samples.push({ v, p, ns })
    samples.push(
      { v: null, p: '(', ns: '{p,urn:p}' },
      { v: base, p: null, ns: '{p,urn:p}' },
      { v: 'plain', p: '(', ns: null },
      { v: base, p: 'false()', ns: null },
    )
    for (const nested of [49, 52, 55])
      samples.push({
        v: base,
        p: '('.repeat(nested) + '1' + ')'.repeat(nested),
        ns: '{}',
        limit: nested >= 52,
      })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      errors = 0,
      dependent = 0
    for (const sample of samples) {
      const array =
        sample.ns === null
          ? null
          : (
              await pg.query<{ shape: string | null; cells: (string | null)[] }>(
                "SELECT array_dims($1::text[]) shape,coalesce((SELECT json_agg(x) FROM unnest($1::text[]) x),'[]')cells",
                [sample.ns],
              )
            ).rows[0]!
      const payload: OwnedArrayInputPayload | null =
        array === null
          ? null
          : {
              elementType: 'pg_catalog.text',
              elementKind: 8,
              dimensions: [...(array.shape ?? '').matchAll(/\[(-?\d+):(-?\d+)\]/gu)].map((m) => ({
                lower: Number(m[1]),
                length: Number(m[2]) - Number(m[1]) + 1,
              })),
              elements: array.cells.map((value) =>
                value === null ? { kind: 'Null' } : { kind: 'Text', value },
              ),
              nullBitmap: { kind: 'Value', value: array.cells.includes(null) },
            }
      for (const [selector, [operation, expression]] of entries.entries()) {
        let output: string | null = null,
          outcome: Outcome = { kind: 'True' }
        await pg.exec('SET extra_float_digits=1')
        try {
          const result = (
            await pg.query<{ value: string | null }>(
              `SELECT encode(convert_to((${expression})::text,'UTF8'),'hex')value FROM(SELECT $1::xml v,$2::text p,$3::text[] ns)input`,
              [sample.v, sample.p, sample.ns],
            )
          ).rows[0]!.value
          output = result === null ? null : Buffer.from(result, 'hex').toString('utf8')
        } catch (error) {
          outcome = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
          errors++
        }
        let varies = false
        if (sample.numeric && outcome.kind === 'True') {
          const values = new Set<string | null>()
          for (let extra = -15; extra <= 3; extra++) {
            await pg.exec(`SET extra_float_digits=${extra}`)
            values.add(
              (
                await pg.query<{ value: string | null }>(
                  `SELECT encode(convert_to((${expression})::text,'UTF8'),'hex')value FROM(SELECT $1::xml v,$2::text p,$3::text[] ns)input`,
                  [sample.v, sample.p, sample.ns],
                )
              ).rows[0]!.value,
            )
          }
          varies = values.size > 1
          if (varies) dependent++
        }
        await pg.exec('SET extra_float_digits=1')
        const row: Row = {
          v: known(sample.v),
          p: known(sample.p),
          ns: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
          selector: known(selector),
          expected: known(output),
          bypass: known(false),
        }
        if (outcome.kind === 'Error') {
          await expect(
            pg.query('INSERT INTO xpath_checked VALUES($1::xml,$2,$3::text[],$4,$5,false)', [
              sample.v,
              sample.p,
              sample.ns,
              selector,
              output,
            ]),
          ).rejects.toMatchObject({
            code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
          })
          inserts++
        } else {
          await pg.query('INSERT INTO xpath_checked VALUES($1::xml,$2,$3::text[],$4,$5,false)', [
            sample.v,
            sample.p,
            sample.ns,
            selector,
            output,
          ])
          inserts++
          await expect(
            pg.query('INSERT INTO xpath_checked VALUES($1::xml,$2,$3::text[],$4,$5,false)', [
              sample.v,
              sample.p,
              sample.ns,
              selector,
              (output ?? '') + 'wrong',
            ]),
          ).rejects.toMatchObject({ code: '23514' })
          inserts++
        }
        for (const profile of profiles)
          for (const origin of ['source', 'stored']) {
            const result: Outcome =
              (profile.name === 'no_digits' && varies) ||
              (profile.name === 'no_limit' && sample.limit)
                ? { kind: 'Unknown' }
                : outcome
            const name = profile.name + '_' + operation + '_' + origin
            fixtures.push({ name, row, expected: result })
            if (outcome.kind === 'True')
              fixtures.push({
                name,
                row: { ...row, expected: known((output ?? '') + 'wrong') },
                expected: result.kind === 'Unknown' ? result : { kind: 'False' },
              })
            fixtures.push({
              name,
              row: { ...row, bypass: known(true) },
              expected: { kind: 'True' },
            })
          }
        reference.push({ ...sample, operation, output, outcome, varies })
      }
    }
    expect(dependent).toBeGreaterThan(0)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/sql-reference.json',
      JSON.stringify(
        {
          samples: samples.length,
          operations: entries.length,
          fixtures: fixtures.length,
          inserts,
          errors,
          dependent,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'xpathsql',
      group,
      profiles.flatMap((profile) =>
        checks.flatMap((check) =>
          ['source', 'stored'].map((origin) => profile.name + '_' + check.name + '_' + origin),
        ),
      ),
      fixtures,
    )
    console.info('XPath SQL parity', {
      samples: samples.length,
      operations: entries.length,
      fixtures: fixtures.length,
      inserts,
      errors,
      dependent,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
