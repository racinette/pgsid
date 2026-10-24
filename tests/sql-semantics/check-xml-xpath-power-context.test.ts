import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('admits captured native XPath decimal powers through settings without assuming a deployment math library in any target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-powers-')),
    packet = 'artifacts/goal-checks/xml-xpath-power-context-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec('SET extra_float_digits=-7')
    const captured = await pg.exec(
      await readFile('tools/check-rust/xpath-power-context.sql', 'utf8'),
    )
    const words = captured.flatMap((r) => r.rows).find((r) => 'xpathPowerOfTenBits' in r)![
      'xpathPowerOfTenBits'
    ] as string[]
    expect(words).toHaveLength(632)
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('extra_float_digits')value"))
        .rows[0]!.value,
    ).toBe('-7')
    const config = (bits: unknown) =>
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks:\n      defaultCollation: C\n      serverEncoding: UTF8\n      extraFloatDigits: 1\n      xpathRecursionLimit: 5000\n      xpathPowerOfTenBits: ' +
          JSON.stringify(bits) +
          '\n',
      ).sql.codegen!.checks!
    const context = config(words.map((w) => w.toUpperCase()))
    expect(context.xpathPowerOfTenBits).toEqual(words)
    const invalid: unknown[] = [
      [],
      words.slice(1),
      [...words, '3ff0000000000000'],
      null,
      'pglite',
      words.map((w, i) => (i === 0 ? 'not-hexadecimal!' : w)),
      words.map((w, i) => (i === 0 ? '0000000000000000' : w)),
      words.map((w, i) => (i === 631 ? '7ff0000000000000' : w)),
      words.map((w, i) => (i === 631 ? '7ff8000000000000' : w)),
      words.map((w, i) => (i === 100 ? words[99]! : w)),
    ]
    for (const value of invalid) expect(() => config(value)).toThrow()
    const alternate = [...words]
    alternate[346] = (BigInt('0x' + alternate[346]!) + 1n).toString(16).padStart(16, '0')
    expect(config(alternate).xpathPowerOfTenBits).toEqual(alternate)
    const alternateSmall = [...words]
    alternateSmall[324] = (BigInt('0x' + alternateSmall[324]!) + 1n).toString(16).padStart(16, '0')
    expect(config(alternateSmall).xpathPowerOfTenBits).toEqual(alternateSmall)
    await pg.exec('SET extra_float_digits=1')
    const operations = {
        bits: "encode(float8send((xpath(p,v))[1]::text::float8),'hex')",
        namespaces:
          "encode(float8send((xpath(p,v,ARRAY[ARRAY['p','urn:p']]))[1]::text::float8),'hex')",
        text: '(xpath(p,v))[1]::text',
        exists: 'xpath_exists(p,v)::text',
        exists_ns: "xpath_exists(p,v,ARRAY[ARRAY['p','urn:p']])::text",
        standard: '(XMLEXISTS(p PASSING BY REF v BY REF))::text',
        count: 'cardinality(xpath(p,v))::text',
      },
      entries = Object.entries(operations)
    const checks = entries.map(([name, expression], selector) => ({
      name,
      expression,
      sql: `CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${expression}) IS NOT DISTINCT FROM expected END`,
    }))
    await pg.exec(
      `CREATE TABLE xpath_power_checked(v xml,p text,selector int,expected text,bypass bool,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xpath_power_checked')!
    const { xpathPowerOfTenBits: _words, ...absent } = context
    const profiles = [
      { name: 'captured', context },
      { name: 'absent', context: absent },
      { name: 'alternate', context: config(alternate) },
      { name: 'alternate_small', context: config(alternateSmall) },
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
            expression: lowerTableCheck(
              table,
              table.constraints.find((x) => x.name === c.name)!,
              [],
              [],
              origin as 'source' | 'stored',
              [],
              undefined,
              origin === 'source' ? `CHECK(${c.sql})` : undefined,
            )!.expression,
          })),
        ),
        profile.context,
      ),
    )
    for (const group of groups)
      expect(group.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual([])
    const diagnostic = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_power_checked',
      constraint: 'profile',
    })
    const probe = `pub fn ${diagnostic}(input:TextValue,expected:Int4Value)->CheckOutcome {let result=xpath_power_context_probe(input,expected);check_from_bool(result)}`
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n') + '\n' + probe
    const source = {
      ...groups[0]!.source!,
      modules: groups[0]!.source!.modules.map((m) => ({
        ...m,
        files:
          m.name === 'checks'
            ? [{ path: 'evaluators.rs', source: evaluatorSource }]
            : m.files.map((f) =>
                f.path.endsWith('/xml_xpath_number.rs')
                  ? {
                      ...f,
                      source:
                        f.source +
                        `
pub fn xpath_power_context_probe(input:TextValue,expected:Int4Value)->BoolValue {
 if let TextValue::Value(words)=input {let profile=xpath_power_context(words.as_str());let count=Int4Value::Value(profile.bits.len() as i32);return sql__pg_catalog__int4eq__lrxe(count,expected);};BoolValue::Unknown
}
`,
                    }
                  : f,
              ),
      })),
    }
    const group = {
      ...groups[0]!,
      checks: [
        ...groups.flatMap((g) => g.checks),
        {
          kind: 'supported' as const,
          entryName: diagnostic,
          inputs: [
            { name: 'input', rustName: 'input', type: 'pg_catalog.text', rustType: 'TextValue' },
            {
              name: 'expected',
              rustName: 'expected',
              type: 'pg_catalog.int4',
              rustType: 'Int4Value',
            },
          ],
        },
      ],
      evaluatorSource,
      source,
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      errors = 0,
      deferred = 0
    const samples: { path: string; power: boolean; all: boolean; xml?: string }[] = []
    for (let exponent = -323; exponent <= 308; exponent++)
      samples.push({
        path: `number('1e${exponent}')`,
        power: exponent < 0 || exponent > 22,
        all: [-323, -308, -24, -23, -22, -1, 0, 1, 22, 23, 100, 308].includes(exponent),
      })
    for (const [path, power] of [
      ["number('1e-324')", false],
      ["number('1e309')", false],
      ["number('0e-23')", false],
      ["number('-0e23')", false],
      ["number('0." + '0'.repeat(24) + "1')", true],
      ["string(number('1e23'))", true],
      ["string(number('1e-23'))", true],
      ["true() or number('1e23')", false],
      ["false() and number('1e-23')", false],
    ] as const)
      samples.push({ path, power, all: true })
    samples.push(
      { path: '(', power: false, all: true },
      { path: '', power: false, all: true },
      { path: "number('1e23')", power: true, all: true, xml: 'plain' },
    )
    for (const sample of samples)
      for (const [selector, [operation, expression]] of entries.entries()) {
        if (!sample.all && operation !== 'bits') continue
        if (
          ['true() or', 'false() and'].some((prefix) => sample.path.startsWith(prefix)) &&
          ['bits', 'namespaces'].includes(operation)
        )
          continue
        let output: string | null = null,
          outcome: Outcome = { kind: 'True' }
        try {
          const result = (
            await pg.query<{ value: string | null }>(
              `SELECT encode(convert_to((${expression})::text,'UTF8'),'hex')value FROM(SELECT $1::xml v,$2::text p)input`,
              [sample.xml ?? '<r/>', sample.path],
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
        const row: Row = {
          v: known(sample.xml ?? '<r/>'),
          p: known(sample.path),
          selector: known(selector),
          expected: known(output),
          bypass: known(false),
        }
        if (outcome.kind === 'Error') {
          await expect(
            pg.query('INSERT INTO xpath_power_checked VALUES($1::xml,$2,$3,$4,false)', [
              sample.xml ?? '<r/>',
              sample.path,
              selector,
              output,
            ]),
          ).rejects.toMatchObject({
            code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
          })
          inserts++
        } else {
          await pg.query('INSERT INTO xpath_power_checked VALUES($1::xml,$2,$3,$4,false)', [
            sample.xml ?? '<r/>',
            sample.path,
            selector,
            output,
          ])
          inserts++
          await expect(
            pg.query('INSERT INTO xpath_power_checked VALUES($1::xml,$2,$3,$4,false)', [
              sample.xml ?? '<r/>',
              sample.path,
              selector,
              (output ?? '') + 'wrong',
            ]),
          ).rejects.toMatchObject({ code: '23514' })
          inserts++
        }
        for (const profile of profiles.slice(0, 2))
          for (const origin of ['source', 'stored']) {
            const unknown = profile.name === 'absent' && sample.power && outcome.kind === 'True',
              expected: Outcome = unknown ? { kind: 'Unknown' } : outcome
            if (unknown) deferred++
            const name = profile.name + '_' + operation + '_' + origin
            fixtures.push({ name, row, expected })
            if (outcome.kind === 'True')
              fixtures.push({
                name,
                row: { ...row, expected: known((output ?? '') + 'wrong') },
                expected: unknown ? expected : { kind: 'False' },
              })
            fixtures.push({
              name,
              row: { ...row, bypass: known(true) },
              expected: { kind: 'True' },
            })
          }
        reference.push({ ...sample, operation, output, outcome })
      }
    for (const origin of ['source', 'stored'])
      for (const [expected, result] of [
        [alternate[346]!, true],
        [words[346]!, false],
      ] as const)
        fixtures.push({
          name: 'alternate_bits_' + origin,
          row: {
            v: known('<r/>'),
            p: known("number('1e23')"),
            selector: known(0),
            expected: known(expected),
            bypass: known(false),
          },
          expected: { kind: result ? 'True' : 'False' },
        })
    for (const origin of ['source', 'stored'])
      for (const [expected, result] of [
        [alternateSmall[324]!, true],
        [words[324]!, false],
      ] as const)
        fixtures.push({
          name: 'alternate_small_bits_' + origin,
          row: {
            v: known('<r/>'),
            p: known("number('1e1')"),
            selector: known(0),
            expected: known(expected),
            bypass: known(false),
          },
          expected: { kind: result ? 'True' : 'False' },
        })
    const encoded = words.join('')
    const invalidEncoded = [
      '',
      encoded.slice(1),
      encoded + '0',
      'z' + encoded.slice(1),
      '8' + encoded.slice(1),
      words.map((w, i) => (i === 631 ? '7ff0000000000000' : w)).join(''),
      words.map((w, i) => (i === 100 ? words[99]! : w)).join(''),
    ]
    for (const text of [encoded, encoded.toUpperCase(), ...invalidEncoded])
      fixtures.push({
        name: 'profile',
        row: {
          input: known(text),
          expected: known(text === encoded || text === encoded.toUpperCase() ? 632 : 0),
        },
        expected: { kind: 'True' },
      })
    expect(deferred).toBeGreaterThan(0)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        {
          powerWords: words.length,
          samples: samples.length,
          fixtures: fixtures.length,
          inserts,
          errors,
          deferred,
          alternateProfileSensitivityCases: 8,
          words,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    const names = profiles
      .flatMap((profile) =>
        checks.flatMap((c) =>
          ['source', 'stored'].map((origin) => profile.name + '_' + c.name + '_' + origin),
        ),
      )
      .concat('profile')
    await runCheckParity(root, 'xpathpowercontext', group, names, fixtures)
    console.info('XPath native power context parity', {
      powerWords: words.length,
      samples: samples.length,
      fixtures: fixtures.length,
      inserts,
      errors,
      deferred,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
