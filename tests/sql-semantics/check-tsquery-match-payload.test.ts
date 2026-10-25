import { readTsqueryFixture } from './check-tsquery-fixtures.js'
import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches owned vectors and binary-origin queries through Rust and public Go and TypeScript validators without storage or encoding context', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-match-payload-')),
    packet = 'artifacts/goal-checks/tsquery-match-active',
    run = promisify(execFile)
  const context = { defaultCollation: 'C' } as const
  const definitions: Record<string, string> = {
    same: 'item @@ reference',
    reverse: 'reference @@ item',
    presence: 'item IS NULL',
    stripped: 'strip(item) @@ reference',
    weighted: "setweight(item,'A') @@ reference",
    selected: 'item @@ CASE WHEN choose_first THEN reference ELSE !!reference END',
    coalesced: 'COALESCE(NULL::tsvector,item) @@ reference',
    domain_value: '(item::nested_vector) @@ reference',
    left_anchored: "item @@ tsquery_phrase('a'::tsquery,reference,0)",
    right_anchored: "item @@ tsquery_phrase(reference,'b'::tsquery,0)",
    wrapped: "item @@ tsquery_phrase('a'::tsquery,((!!reference) && 'b'::tsquery),0)",
    lazy: 'CASE WHEN bypass THEN true ELSE item @@ reference END',
    null_literal: 'NULL::tsvector IS NULL',
  }
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      'CREATE DOMAIN imported_vector AS tsvector;CREATE DOMAIN nested_vector AS imported_vector',
    )

    await pg.exec('CREATE TABLE vector_binary_inputs(key text,value tsvector)')
    const binary = [
      {
        key: '__binary_duplicate',
        lexemes: [
          { text: 'a', positions: [0xc001] },
          { text: 'a', positions: [0x8002] },
        ],
      },
      {
        key: '__binary_zero',
        lexemes: [
          { text: 'a', positions: [0] },
          { text: 'b', positions: [0xc000, 2] },
        ],
      },
      {
        key: '__binary_positions',
        lexemes: [
          { text: 'a', positions: [0xc001, 0x8002, 3, 4] },
          { text: 'b', positions: [3] },
        ],
      },
      {
        key: '__binary_prefix',
        lexemes: [
          { text: 'a', positions: [0xc002] },
          { text: 'a', positions: [0x8003] },
          { text: 'ab', positions: [0x4004] },
          { text: 'b', positions: [5] },
        ],
      },
      { key: '__binary_wide', lexemes: [{ text: 'a'.repeat(2047), positions: [] }] },
    ]
    for (const sample of binary) {
      const count = Buffer.alloc(4)
      count.writeInt32BE(sample.lexemes.length)
      const payload = Buffer.concat([
        count,
        ...sample.lexemes.flatMap((l) => {
          const positions = Buffer.alloc(2 + 2 * l.positions.length)
          positions.writeUInt16BE(l.positions.length)
          l.positions.forEach((p, i) => positions.writeUInt16BE(p, 2 + 2 * i))
          return [Buffer.from(l.text), Buffer.from([0]), positions]
        }),
      ])
      const header = Buffer.alloc(19),
        tuple = Buffer.alloc(10)
      Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
      tuple.writeInt16BE(2)
      tuple.writeInt32BE(Buffer.byteLength(sample.key), 2)
      const width = Buffer.alloc(4)
      width.writeInt32BE(payload.length)
      await pg.exec("COPY vector_binary_inputs FROM '/dev/blob' (FORMAT binary)", {
        blob: new Blob([
          new Uint8Array(
            Buffer.concat([
              header,
              tuple.subarray(0, 6),
              Buffer.from(sample.key),
              width,
              payload,
              Buffer.from('ffff', 'hex'),
            ]),
          ),
        ]),
      })
    }
    await pg.exec(
      "INSERT INTO vector_binary_inputs SELECT '__concat_zero',value||value FROM vector_binary_inputs WHERE key='__binary_zero'",
    )
    const vectorSql = (parameter: string) =>
      `CASE WHEN ${parameter}::text IN ('__binary_duplicate','__binary_zero','__binary_wide','__concat_zero','__binary_positions','__binary_prefix') THEN (SELECT value FROM vector_binary_inputs WHERE key=${parameter}::text) ELSE ${parameter}::tsvector END`
    await pg.exec('CREATE TABLE binary_queries(key text,value tsquery)')
    const queryBinary = [
      { key: '__empty_operand', word: '', distance: null },
      { key: '__empty_prefix', word: '', distance: null },
      { key: '__maximum_operand', word: 'a'.repeat(2047), distance: null },
      { key: '__negative_phrase', word: 'a', distance: -1 },
      { key: '__minimum_phrase', word: 'a', distance: -32768 },
      { key: '__wide_phrase', word: 'a', distance: 32767 },
    ]
    for (const sample of queryBinary) {
      const term = (text: string) =>
          Buffer.concat([
            Buffer.from([1, 0, sample.key === '__empty_prefix' ? 1 : 0]),
            Buffer.from(text),
            Buffer.from([0]),
          ]),
        count = Buffer.alloc(4),
        operator = Buffer.alloc(4)
      count.writeUInt32BE(sample.distance === null ? 1 : 3)
      operator[0] = 2
      operator[1] = 4
      operator.writeUInt16BE((sample.distance ?? 0) + ((sample.distance ?? 0) < 0 ? 65536 : 0), 2)
      const wire = Buffer.concat([
          count,
          ...(sample.distance === null
            ? [term(sample.word)]
            : [operator, term('b'), term(sample.word)]),
        ]),
        header = Buffer.alloc(19),
        columns = Buffer.alloc(2),
        keySize = Buffer.alloc(4),
        valueSize = Buffer.alloc(4)
      Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
      columns.writeUInt16BE(2)
      keySize.writeUInt32BE(Buffer.byteLength(sample.key))
      valueSize.writeUInt32BE(wire.length)
      await pg.exec("COPY binary_queries FROM '/dev/blob' (FORMAT binary)", {
        blob: new Blob([
          new Uint8Array(
            Buffer.concat([
              header,
              columns,
              keySize,
              Buffer.from(sample.key),
              valueSize,
              wire,
              Buffer.from('ffff', 'hex'),
            ]),
          ),
        ]),
      })
    }
    const querySql = (parameter: string) =>
      `CASE WHEN ${parameter}::text IN (${queryBinary.map((b) => "'" + b.key + "'").join(',')}) THEN (SELECT value FROM binary_queries WHERE key=${parameter}::text) ELSE ${parameter}::tsquery END`
    const columns = 'item nested_vector,reference tsquery,choose_first bool,bypass bool'
    await pg.exec(
      `CREATE TABLE vector_rows(${columns},${Object.entries(definitions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(`CREATE TABLE payload_${name}(${columns},CONSTRAINT rule CHECK(${sql}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'vector_rows')!
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return (['raw', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'raw' ? { ...c, definition: `CHECK(${sql})` } : c,
            [],
            catalog.domains,
            origin === 'raw' ? 'source' : 'stored',
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      publicCases: { row: Row; expected: Record<string, Outcome> }[] = []
    const payloads = new Map<string, Input>()
    const capture = async (text: string | null): Promise<Input> => {
      if (text === null) return known(null)
      const cached = payloads.get(text)
      if (cached) return cached
      const rows = (
        await pg.query<{ lexeme: string; positions: number[] | null; weights: string[] | null }>(
          `SELECT * FROM unnest(${vectorSql('$1')})`,
          [text],
        )
      ).rows
      const nativeBytes = (
        await pg.query<{ bytes: number }>(
          `SELECT pg_column_size(setweight(${vectorSql('$1')},'D',ARRAY[]::text[])) bytes`,
          [text],
        )
      ).rows[0]!.bytes
      const result = known({
        lexemes: rows.map((l) => ({
          text: l.lexeme,
          positions: (l.positions ?? []).map((position, i) => ({
            position,
            weight: 3 - 'ABCD'.indexOf(l.weights![i]!),
          })),
        })),
        nativeBytes,
      })
      payloads.set(text, result)
      return result
    }
    let inserts = 0,
      rejections = 0
    const samples: [string | null, string | null][] = [
      [null, 'a'],
      ['', null],
      ['a', 'a:A'],
      ['a:1 b:2', 'a <-> b'],
      ['a:1 b:2 c:3', 'a <-> (!x | b)'],
      ['a ab:2 b:3', 'a:* <-> b'],
      ['a:1A ab:2B b:3', 'a:*B <-> b'],
      ['é:1 日本:2 😀:3', 'é <-> 日本 <-> 😀'],
      ['__binary_duplicate', 'a:A'],
      ['__binary_duplicate', 'a:B'],
      ['__binary_duplicate', 'a:*A'],
      ['__binary_duplicate', 'a:*B'],
      ['__binary_duplicate', 'a <-> a'],
      ['__binary_zero', 'a <-> b'],
      ['__binary_zero', 'a <0> b'],
      ['__binary_positions', 'a:A <2> b'],
      ['__binary_positions', 'a:B <2> b'],
      ['__binary_prefix', 'a:*A <-> b'],
      ['__binary_prefix', 'a:*B <2> b'],
      ['__concat_zero', 'a <2> b'],
      ['__binary_wide', '__maximum_operand'],
      ...queryBinary.flatMap((q) =>
        ['a:1 b:2 c:3', 'a:16383 b:1', '__binary_zero', '__binary_prefix'].map(
          (d) => [d, q.key] as [string, string],
        ),
      ),
    ]
    for (let i = 0; i < samples.length; i++)
      for (let variant = 0; variant < 4; variant++) {
        const source = samples[i]![0],
          reference = variant === 1 ? null : samples[i]![1],
          choose = variant % 2 === 0,
          bypass = variant === 3
        const values = [source, reference, choose, bypass],
          query = `SELECT (${vectorSql('$1')})::nested_vector item,${querySql('$2')} reference,$3::bool choose_first,$4::bool bypass`
        const native = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${Object.entries(definitions)
              .map(([name, sql]) => `(${sql}) AS ${name}`)
              .join(',')} FROM (${query}) input`,
            values,
          )
        ).rows[0]!
        const row: Row = {
            item: await capture(source),
            reference:
              reference === null
                ? known(null)
                : known(
                    (await readTsqueryFixture(pg, `SELECT ${querySql('$1')} item`, 'item', [
                      reference,
                    ]))!,
                  ),
            choose_first: known(choose),
            bypass: known(bypass),
          },
          expected: Record<string, Outcome> = {}
        for (const [name, value] of Object.entries(native)) {
          expected[name] = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO payload_${name} ${query}`, values)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(value === false ? '23514' : undefined)
          inserts++
          if (failure) rejections++
          for (const origin of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
        }
        publicCases.push({ row, expected })
      }
    const base = publicCases[12]!.row
    for (const item of [
      { kind: 'Unknown' } as Input,
      { kind: 'Error', value: { state: parseInt('22003', 36) } } as Input,
    ]) {
      const row = { ...base, item },
        expected: Record<string, Outcome> = {}
      for (const name of Object.keys(definitions)) {
        expected[name] =
          name === 'null_literal'
            ? { kind: 'True' }
            : item.kind === 'Error'
              ? item
              : { kind: 'Unknown' }
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
      }
      publicCases.push({ row, expected })
    }
    const docError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } },
      queryError: Input = { kind: 'Error', value: { state: parseInt('22023', 36) } }
    for (const [item, reference] of [
      [docError, queryError],
      [{ kind: 'Unknown' } as Input, queryError],
      [docError, { kind: 'Null' } as Input],
    ]) {
      const row = { ...base, item: item!, reference: reference! },
        expected: Record<string, Outcome> = {}
      for (const name of Object.keys(definitions)) {
        expected[name] =
          name === 'null_literal'
            ? { kind: 'True' }
            : name === 'presence' && item!.kind === 'Unknown'
              ? { kind: 'Unknown' }
              : name === 'reverse' && reference!.kind === 'Error'
                ? (queryError as Outcome)
                : item!.kind === 'Error'
                  ? (docError as Outcome)
                  : (queryError as Outcome)
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
      }
      publicCases.push({ row, expected })
    }
    const complete = base.item!
    if (
      complete.kind !== 'Value' ||
      typeof complete.value !== 'object' ||
      !('lexemes' in complete.value)
    )
      throw new Error('Missing owned vector witness')
    const row = { ...base, item: known({ ...complete.value, nativeBytes: -1 }) },
      expected = { ...publicCases[12]!.expected }
    for (const name of Object.keys(definitions))
      for (const origin of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
    publicCases.push({ row, expected })
    const pattern = base.reference!
    if (
      pattern.kind !== 'Value' ||
      typeof pattern.value !== 'object' ||
      !('nodes' in pattern.value)
    )
      throw Error('Missing query witness')
    const missingQuery = { ...row, reference: known({ ...pattern.value, nativeBytes: -1 }) }
    for (const name of Object.keys(definitions))
      for (const origin of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: missingQuery, expected: expected[name]! })
    publicCases.push({ row: missingQuery, expected })
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'payload-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          publicRows: publicCases.length,
        },
        null,
        2,
      ) + '\n',
    )
    await mkdir(join(root, 'parity'))
    await runCheckParity(
      join(root, 'parity'),
      'tsvectorpayload',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    const tsBundle = renderTypescriptSchemaCheckArtifacts(
        [table],
        catalog.domains,
        catalog.domains,
        { executionContext: context },
      ),
      tsRoot = join(root, 'public-ts')
    await mkdir(tsRoot)
    await writeFile(join(tsRoot, 'package.json'), '{"type":"module"}')
    await writeFile(join(tsRoot, 'checks.ts'), tsBundle.checks)
    for (const artifact of checkTypescriptArtifacts(tsBundle.rustFiles!)) {
      const path = join(tsRoot, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node', [
      'node_modules/typescript/bin/tsc',
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(tsRoot, 'js'),
      join(tsRoot, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr)
    })
    const api = await import(pathToFileURL(join(tsRoot, 'js/checks.js')).href)
    const result = (outcome: Outcome) =>
      outcome.kind === 'Unknown'
        ? { certain: false }
        : outcome.kind === 'Error'
          ? { certain: true, error: outcome.value.state.toString(36).toUpperCase() }
          : { certain: true, value: outcome.kind === 'Null' ? null : outcome.kind === 'True' }
    const evaluate = (row: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(
        api
          .evaluatePublicVectorRowsChecks(
            Object.fromEntries(
              Object.entries(row).map(([name, value]) => [
                name,
                name === 'item' || name === 'reference'
                  ? value
                  : value && typeof value === 'object' && 'kind' in value
                    ? value.kind === 'Null'
                      ? null
                      : value.kind === 'Value' && 'value' in value
                        ? value.value
                        : undefined
                    : value,
              ]),
            ),
          )
          .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
      )
    for (const c of publicCases)
      expect(evaluate(c.row)).toEqual(
        Object.fromEntries(
          Object.entries(c.expected).map(([name, outcome]) => [name, result(outcome)]),
        ),
      )

    for (const bad of ['a', {}, { kind: 'Value', value: { ...pattern.value, root: 999 } }])
      expect(evaluate({ ...base, reference: bad }).same).toEqual({ certain: false })
    const saved = structuredClone(base)
    evaluate(base)
    expect(base).toEqual(saved)
    const good = complete.value
    for (const bad of [
      undefined,
      'a:1',
      3,
      {},
      { kind: 'Value', value: null },
      ...[NaN, 1.5, '8', -2, 1073741824].map((nativeBytes) => ({
        kind: 'Value',
        value: { ...good, nativeBytes },
      })),
      { kind: 'Value', value: { ...good, lexemes: [{ text: '\ud800', positions: [] }] } },
      { kind: 'Value', value: { ...good, lexemes: [{ text: 'a\0', positions: [] }] } },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: -1, weight: 3 }] }] },
      },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 1, weight: 4 }] }] },
      },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 1.5, weight: 3 }] }] },
      },
      {
        kind: 'Value',
        value: {
          ...good,
          lexemes: [
            { text: 'z', positions: [] },
            { text: 'a', positions: [] },
          ],
        },
      },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
    ]) {
      expect(evaluate({ ...base, item: bad }).same).toEqual({ certain: false })
      expect(evaluate({ ...base, item: bad }).presence).toEqual({ certain: false })
    }
    const goRoot = join(root, 'public-go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString(
          'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    checks:\n      defaultCollation: C\n',
        ),
        undefined,
        'tsvector-public',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module tsvector-public\n\ngo 1.25\n')
    await writeFile(join(goRoot, 'checks.go'), goBundle.checks)
    for (const [name, source] of Object.entries(goBundle.rustFiles!)) {
      if (!source) continue
      const path = join(
        goRoot,
        'checkrust',
        name === 'checks'
          ? 'checks.go'
          : name === 'runtime'
            ? 'checkruntime/runtime.go'
            : name === 'language'
              ? 'langruntime/runtime.go'
              : name === 'regex'
                ? 'regexengine/regex.go'
                : 'pg_catalog/operations.go',
      )
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, source)
    }
    const goInput = (name: string, input: Input): string => {
      const vector = name === 'item',
        query = name === 'reference',
        type = vector ? 'checkruntime.TsvectorValue' : query ? 'checkruntime.TsqueryValue' : '*bool'
      if (input.kind === 'Null') return `NullCheckValue[${type}]()`
      if (input.kind === 'Unknown') return `CheckOptional[${type}] {}`
      if (input.kind === 'Error')
        return `KnownCheckValue(checkruntime.${vector ? 'Tsvector' : 'Tsquery'}Value{Kind:checkruntime.${vector ? 'Tsvector' : 'Tsquery'}ValueError,Error:checkruntime.SqlError{State:${input.value.state}}})`

      if (typeof input.value === 'object' && 'nodes' in input.value) {
        const v = input.value
        return `KnownCheckValue(checkruntime.MakeTsqueryValue(checkruntime.TsqueryPayload{NativeBytes:${v.nativeBytes},Root:${v.root},Nodes:[]checkruntime.TsqueryNode{${v.nodes.map((n) => `{Kind:${n.kind},Text:${JSON.stringify(n.text)},Weight:${n.weight},Prefix:${n.prefix},Distance:${n.distance},Left:${n.left},Right:${n.right}}`).join(',')}}}))`
      }
      if (typeof input.value === 'object' && 'lexemes' in input.value) {
        const v = input.value
        const lexemes = v.lexemes
          .map((l) => {
            const positions = l.positions
              .map((p) => '{Position:' + p.position + ',Weight:' + p.weight + '}')
              .join(',')
            return (
              '{Text:' +
              JSON.stringify(l.text) +
              ',Positions:[]checkruntime.TsvectorPosition{' +
              positions +
              '}}'
            )
          })
          .join(',')
        return (
          'KnownCheckValue(checkruntime.MakeTsvectorValue(checkruntime.TsvectorPayload{NativeBytes:' +
          v.nativeBytes +
          ',Lexemes:[]checkruntime.TsvectorLexeme{' +
          lexemes +
          '}}))'
        )
      }
      return `KnownCheckValue(ptr(${type.slice(1)}(${input.value})))`
    }
    const goRows = publicCases.map(
      (c) =>
        'PublicVectorRowsCheckInput{' +
        Object.entries(c.row)
          .map(
            ([name, input]) =>
              name
                .split('_')
                .map((p) => p[0]!.toUpperCase() + p.slice(1))
                .join('') +
              ':' +
              goInput(name, input),
          )
          .join(',') +
        '}',
    )
    const assertions = publicCases.flatMap((c, i) =>
      Object.entries(c.expected).map(
        ([name, outcome]) =>
          `if r:=results[${i}][${JSON.stringify(name)}]; ${outcome.kind === 'Unknown' ? 'r.Certain' : outcome.kind === 'Error' ? `!r.Certain || r.Value.Error != "${outcome.value.state.toString(36).toUpperCase()}"` : outcome.kind === 'Null' ? '!r.Certain || r.Value.Valid' : `!r.Certain || !r.Value.Valid || r.Value.Value != ${outcome.kind === 'True'}`} {t.Fatalf("${i} ${name}: %+v",r)}`,
      ),
    )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "tsvector-public/checkrust/checkruntime")
func ptr[T any](value T)*T{return &value}
func TestPayloads(t *testing.T){rows:=[]PublicVectorRowsCheckInput{${goRows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range EvaluatePublicVectorRowsChecks(row){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}

base:=rows[12];for _,v:=range []checkruntime.TsvectorValue{
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:-2}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:1073741824}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:string([]byte{255})}}}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:"a",Positions:[]checkruntime.TsvectorPosition{{Position:-1,Weight:3}}}}}},
 {Kind:checkruntime.TsvectorValueKind(99)},
}{base.Item=KnownCheckValue(v);for _,c:=range EvaluatePublicVectorRowsChecks(base){if (c.Constraint=="same"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed vector became certain",c)}}}

}`,
    )
    await writeFile(
      join(packet, 'public-go-test.go'),
      await readFile(join(goRoot, 'checks_test.go'), 'utf8'),
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    console.log(
      `tsvector payloads: ${inserts} native INSERTs, ${fixtures.length} parity fixtures and ${publicCases.length} public rows per target`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
