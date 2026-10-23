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

it('preserves reached XML settings, explicit modes, eager literals and lazy runtime conversion in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-context-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const variants = {
    cast: '(s::xml)::text',
    function_cast: 'xml(s)::text',
    content: 'XMLSERIALIZE(CONTENT XMLPARSE(CONTENT s) AS text)',
    document: 'XMLSERIALIZE(CONTENT XMLPARSE(DOCUMENT s) AS text)',
    predicate: '(v IS DOCUMENT)::text',
    wire: "encode(xml_send(v),'hex')",
    indent: 'XMLSERIALIZE(CONTENT v AS text INDENT)',
    document_indent: 'XMLSERIALIZE(DOCUMENT v AS text INDENT)',
  }
  const profiles: { name: string; context: CheckExecutionContext }[] = [
    {
      name: 'content',
      context: { xmlOption: 'content', serverEncoding: 'UTF8', clientEncoding: 'UTF8' },
    },
    {
      name: 'document',
      context: { xmlOption: 'document', serverEncoding: 'UTF8', clientEncoding: 'UTF8' },
    },
    { name: 'no_option', context: { serverEncoding: 'UTF8', clientEncoding: 'UTF8' } },
    { name: 'no_encoding', context: { xmlOption: 'content', clientEncoding: 'UTF8' } },
    { name: 'no_client', context: { xmlOption: 'content', serverEncoding: 'UTF8' } },
  ]
  try {
    await pg.exec(
      `CREATE TABLE xml_context(v xml,s text,expected text,bypass boolean,${Object.entries(variants)
        .map(
          ([name, expression]) =>
            `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE (${expression})=expected END)`,
        )
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    const groups = profiles.map(({ name, context }) =>
      prepareCheckRustGroup(
        Object.entries(variants).flatMap(([operation, expression]) =>
          ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + operation + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((c) => c.name === operation)!,
                [],
                [],
                origin as 'source' | 'stored',
                [],
                undefined,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE (${expression})=expected END)`
                  : undefined,
              )!.expression,
            ),
          })),
        ),
        { defaultCollation: 'C', ...context },
      ),
    )
    const preparation = [
      {
        name: 'eager',
        sql: "CASE WHEN bypass THEN true ELSE ('<broken>'::xml)::text=expected END",
        error: true,
      },
      {
        name: 'runtime',
        sql: "CASE WHEN bypass THEN true ELSE ('<broken>'::text::xml)::text=expected END",
        error: false,
      },
    ]
    groups.push(
      prepareCheckRustGroup(
        preparation.map((p) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: p.name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              { name: p.name, type: 'check', definition: `CHECK(${p.sql})` },
              [],
              [],
              'source',
            )!.expression,
          ),
        })),
        { defaultCollation: 'C', serverEncoding: 'UTF8', xmlOption: 'content' },
      ),
    )
    for (const group of groups)
      expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
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
    const names = profiles
      .flatMap((p) =>
        Object.keys(variants).flatMap((op) =>
          ['source', 'stored'].map((origin) => p.name + '_' + op + '_' + origin),
        ),
      )
      .concat(preparation.map((p) => p.name))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const samples = [null, '<r/>', 'plain', '<a/><b/>', '<r>', '<文書>雪</文書>']
    for (const profile of profiles) {
      await pg.exec(
        'SET xmloption=' + (profile.context.xmlOption === 'document' ? 'DOCUMENT' : 'CONTENT'),
      )
      for (const [operation, expression] of Object.entries(variants))
        for (const source of samples) {
          const stored = source === '<r>' ? '<r/>' : source
          let expected: string | null = null,
            outcome: Outcome
          try {
            const encoded = (
              await pg.query<{ result: string | null }>(
                `SELECT encode(convert_to((${expression})::text,'UTF8'),'hex') result FROM (SELECT XMLPARSE(CONTENT $1) v,$2::text s) candidate`,
                [stored, source],
              )
            ).rows[0]!.result
            expected = encoded === null ? null : Buffer.from(encoded, 'hex').toString('utf8')
            outcome = { kind: expected === null ? 'Null' : 'True' }
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const noOption =
            profile.name === 'no_option' &&
            ['cast', 'function_cast'].includes(operation) &&
            source !== null &&
            source !== '<r/>' &&
            source !== '<文書>雪</文書>'
          const nonAscii = source !== null && /[^\x00-\x7f]/u.test(source)
          const noEncoding =
            profile.name === 'no_encoding' &&
            nonAscii &&
            ['cast', 'function_cast', 'content', 'document', 'predicate'].includes(operation)
          const noClient = profile.name === 'no_client' && operation === 'wire' && stored !== null
          const indent =
            operation.endsWith('indent') &&
            stored !== null &&
            (operation === 'indent' || outcome.kind !== 'Error')
          if (noOption || noEncoding || noClient || indent) outcome = { kind: 'Unknown' }
          const row: Row = {
            v: known(stored),
            s: known(source),
            expected: known(expected),
            bypass: known(false),
          }
          for (const origin of ['source', 'stored']) {
            const name = profile.name + '_' + operation + '_' + origin
            fixtures.push(
              { name, row, expected: outcome },
              { name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } },
            )
          }
          reference.push({ profile: profile.name, operation, source, expected, outcome })
        }
    }
    for (const p of preparation) {
      for (const bypass of [true, false])
        fixtures.push({
          name: p.name,
          row: { v: known(null), s: known(null), expected: known(null), bypass: known(bypass) },
          expected:
            bypass && !p.error
              ? { kind: 'True' }
              : { kind: 'Error', value: { state: parseInt('2200N', 36) } },
        })
    }
    await mkdir('artifacts/goal-checks/xml-sql-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-sql-active/context-reference.json',
      JSON.stringify(reference, null, 2) + '\n',
    )
    await runCheckParity(root, 'xmlcontext', group, names, fixtures)
    console.info('XML context parity', { profiles: profiles.length, fixtures: fixtures.length })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)

it('retains captured XML constants and selected custom functions without substituting builtins', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
   CREATE FUNCTION public.xml(text) RETURNS xml LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT '<shadow/>'::pg_catalog.xml $$;
   CREATE TABLE xml_shadow(s text,bypass boolean,CONSTRAINT selected CHECK(CASE WHEN bypass THEN true ELSE xml(s)::text='<shadow/>' END));
   CREATE TABLE xml_constant(v xml,CONSTRAINT exact_storage CHECK(v::text='<?xml version="1.0" encoding=""?><r/>'::pg_catalog.xml::text));`)
    const wire = async () =>
      (
        await pg.query<{ wire: string }>(
          `SELECT encode(xml_send(XMLPARSE(CONTENT '<r/>')),'hex') wire`,
        )
      ).rows[0]!.wire
    const utf8 = await wire()
    await pg.exec('SET client_encoding=LATIN1')
    expect(await wire()).not.toBe(utf8)
    await pg.exec('SET client_encoding=UTF8')
    await pg.exec('SET xmloption=CONTENT')
    await expect(
      pg.query("SELECT CASE WHEN $1::boolean THEN true ELSE ('<broken>'::xml)::text IS NULL END", [
        true,
      ]),
    ).rejects.toMatchObject({ code: '2200N' })
    expect(
      (
        await pg.query<{ valid: boolean }>(
          "SELECT CASE WHEN $1::boolean THEN true ELSE ('<broken>'::text::xml)::text IS NULL END valid",
          [true],
        )
      ).rows[0]!.valid,
    ).toBe(true)
    await expect(
      pg.query(
        "SELECT CASE WHEN $1::boolean THEN true ELSE ('<broken>'::text::xml)::text IS NULL END",
        [false],
      ),
    ).rejects.toMatchObject({ code: '2200N' })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_shadow')!,
      constraint = table.constraints.find((c) => c.name === 'selected')!
    const source = "CHECK(CASE WHEN bypass THEN true ELSE xml(s)::text='<shadow/>' END)"
    for (const origin of ['source', 'stored'] as const) {
      const expression = lowerTableCheck(
        table,
        constraint,
        [],
        [],
        origin,
        [],
        undefined,
        origin === 'source' ? source : undefined,
      )!.expression
      const text = JSON.stringify(expression)
      expect(text).toContain('uncertain')
      expect(text).not.toContain('xml-operation')
      expect(
        (
          await pg.query<{ valid: boolean }>(
            "SELECT CASE WHEN $1::boolean THEN true ELSE public.xml($2::text)::text='<shadow/>' END valid",
            [false, 'bad'],
          )
        ).rows[0]!.valid,
      ).toBe(true)
    }
    const constants = catalog.tables.find((t) => t.name === 'xml_constant')!,
      check = constants.constraints[0]!
    expect(check.xmlConstants?.complete).toBe(true)
    const exact = JSON.stringify(lowerTableCheck(constants, check)!.expression)
    expect(exact).toContain('storage')
    for (const context of [
      undefined,
      { ...check.xmlConstants!, complete: false },
      { ...check.xmlConstants!, definition: 'CHECK(false)' },
    ]) {
      const missing = JSON.stringify(
        lowerTableCheck(constants, { ...check, xmlConstants: context })!.expression,
      )
      expect(missing).not.toContain('"storage":')
    }
  } finally {
    await pg.close()
  }
}, 30_000)
