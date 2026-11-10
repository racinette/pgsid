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
import { internalCheckRows } from '../support/check-entries.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('ranks owned minimal covers and binary-origin queries with public weight arrays, metadata independence and native Float4 behavior', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-rank-cd-payload-')),
    packet = 'artifacts/goal-checks/tsquery-rank-cd-active',
    run = promisify(execFile)
  const context = { defaultCollation: 'C' } as const
  const definitions: Record<string, string> = {
    same: "encode(float4send(ts_rank_cd(item,reference)),'hex') IS NOT DISTINCT FROM expected",
    presence: 'item IS NULL',
    weighted: 'ts_rank_cd(weights,item,reference)>=0',
    weighted_nan: "ts_rank_cd(weights,item,reference) IS NOT DISTINCT FROM 'NaN'::real",
    weighted_normalized: 'ts_rank_cd(weights,item,reference,63)>=0',
    normalized: 'ts_rank_cd(item,reference,63)>=0',
    stripped: 'ts_rank_cd(strip(item),reference)>=0',
    selected: 'ts_rank_cd(item,CASE WHEN choose_first THEN reference ELSE !!reference END)>=0',
    coalesced: 'ts_rank_cd(COALESCE(NULL::tsvector,item),reference)>=0',
    domain_value: 'ts_rank_cd(item::nested_vector,reference)>=0',
    lazy: 'CASE WHEN bypass THEN true ELSE ts_rank_cd(weights,item,reference)>0 END',
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
    const columns =
      'item nested_vector,reference tsquery,choose_first bool,bypass bool,weights real[],expected text'
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
      publicCases: { row: Row; expected: Record<string, Outcome> }[] = [],
      nativeRows: {
        source: string | null
        reference: string | null
        choose: boolean
        bypass: boolean
        weight: string | null
        expectedHex: string | null
        weights: Input
      }[] = []
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
    const weightCache = new Map<string, Input>()
    const captureWeights = async (text: string | null): Promise<Input> => {
      if (text === null) return known(null)
      const cached = weightCache.get(text)
      if (cached) return cached
      const dimensions = (
        await pg.query<{ lower: number; length: number }>(
          `SELECT array_lower(w,d) lower,array_length(w,d) length FROM (SELECT $1::real[] w) input CROSS JOIN generate_series(1,coalesce(array_ndims(w),0)) d`,
          [text],
        )
      ).rows
      const rows = (
        await pg.query<{ missing: boolean; bits: string | null }>(
          `SELECT x IS NULL missing,encode(float4send(x),'hex') bits FROM unnest($1::real[]) x`,
          [text],
        )
      ).rows
      const elements = rows.map((r) => {
        if (r.missing) return { kind: 'Null' as const }
        const bits = Buffer.from(r.bits!, 'hex').readInt32BE(0)
        return ((bits >>> 23) & 255) === 255 && (bits & 8388607) !== 0
          ? { kind: 'Float4UnspecifiedNan' as const }
          : { kind: 'Float4' as const, value: bits }
      })
      const result = known({
        elementType: 'pg_catalog.float4',
        elementKind: 19,
        dimensions,
        elements,
        nullBitmap: { kind: 'Value', value: elements.some((c) => c.kind === 'Null') },
      })
      weightCache.set(text, result)
      return result
    }
    const weightCases = [
      '{0.1,0.2,0.4,1}',
      '{}',
      '{1,1,1}',
      '{{1,1},{1,1}}',
      '{NULL,1,1,1}',
      '{2,1,1,1,NULL}',
      '{2,1,1,1}',
      '{Infinity,1,1,1}',
      '{-Infinity,-1,-2,-3}',
      '{NaN,NaN,NaN,NaN}',
      '{0,0,0,0}',
      '{-0,0,-0,0}',
      '[0:3]={0.1,0.2,0.4,1}',
      '[5:9]={0.1,0.2,0.4,1,2}',
    ]
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
      ['a:1A b:2B', 'a & b'],
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
        const weight =
          variant === 1
            ? null
            : variant === 2
              ? source === 'a:1A b:2B' && reference === 'a & b'
                ? '{0,0,-0,0}'
                : weightCases[i % weightCases.length]!
              : variant === 3
                ? '{0.05,0.3,0.6,0.9,2}'
                : '{0.1,0.2,0.4,1}'
        const values = [source, reference, choose, bypass, weight],
          baseQuery = `SELECT (${vectorSql('$1')})::nested_vector item,${querySql('$2')} reference,$3::bool choose_first,$4::bool bypass,$5::real[] weights`,
          query = `SELECT input.*,encode(float4send(ts_rank_cd(item,reference)),'hex') expected FROM (${baseQuery}) input`
        const expectedHex = (
          await pg.query<{ expected: string | null }>(
            `SELECT expected FROM (${query}) input`,
            values,
          )
        ).rows[0]!.expected
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
            weights: await captureWeights(weight),
            expected: known(expectedHex),
          },
          expected: Record<string, Outcome> = {}
        for (const [name, sql] of Object.entries(definitions)) {
          let value: boolean | null = null,
            state: string | undefined
          try {
            value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${sql}) value FROM (${query}) input`,
                values,
              )
            ).rows[0]!.value
          } catch (error) {
            state = (error as { code: string }).code
          }
          expected[name] = state
            ? { kind: 'Error', value: { state: parseInt(state, 36) } }
            : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO payload_${name} ${query}`, values)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          inserts++
          if (failure) rejections++
          for (const origin of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
        }
        publicCases.push({ row, expected })
        nativeRows.push({
          source,
          reference,
          choose,
          bypass,
          weight,
          expectedHex,
          weights: row.weights!,
        })
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
              : item!.kind === 'Error'
                ? (docError as Outcome)
                : (queryError as Outcome)
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
      }
      publicCases.push({ row, expected })
    }
    const fullWeights = base.weights!
    if (
      fullWeights.kind !== 'Value' ||
      typeof fullWeights.value !== 'object' ||
      !('elements' in fullWeights.value)
    )
      throw Error('Missing owned weights witness')
    const weightPayload = fullWeights.value
    const partialCases: { weights: Input; outcome?: Outcome }[] = [
      { weights: { kind: 'Unknown' }, outcome: { kind: 'Unknown' } },
      {
        weights: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        outcome: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      {
        weights: known({
          ...weightPayload,
          elements: [{ kind: 'Unknown' }, ...weightPayload.elements.slice(1)],
        }),
        outcome: { kind: 'Unknown' },
      },
      {
        weights: known({
          ...weightPayload,
          dimensions: [{ lower: 1, length: 5 }],
          elements: [...weightPayload.elements, { kind: 'Unknown' }],
        }),
      },
      {
        weights: known({
          ...weightPayload,
          dimensions: [{ lower: 1, length: 5 }],
          elements: [...weightPayload.elements, { kind: 'Unknown' }],
          nullBitmap: { kind: 'Unknown' },
        }),
        outcome: { kind: 'Unknown' },
      },
      {
        weights: known({
          ...weightPayload,
          dimensions: [{ lower: 1, length: 5 }],
          elements: [...weightPayload.elements, { kind: 'Unknown' }],
          nullBitmap: { kind: 'Value', value: true },
        }),
        outcome: { kind: 'Unknown' },
      },
      { weights: known({ ...weightPayload, nullBitmap: { kind: 'Unknown' } }) },
      { weights: known({ ...weightPayload, nullBitmap: { kind: 'Value', value: true } }) },
      {
        weights: known({
          ...weightPayload,
          elements: [
            { kind: 'Unknown' },
            { kind: 'Float4', value: 1073741824 },
            ...weightPayload.elements.slice(2),
          ],
        }),
        outcome: { kind: 'Error', value: { state: parseInt('22023', 36) } },
      },
      {
        weights: known({
          ...weightPayload,
          dimensions: [{ lower: 1, length: 3 }],
          elements: [{ kind: 'Unknown' }, ...weightPayload.elements.slice(1, 3)],
          nullBitmap: { kind: 'Unknown' },
        }),
        outcome: { kind: 'Error', value: { state: parseInt('2202E', 36) } },
      },
    ]
    for (const sample of partialCases) {
      const row = { ...base, weights: sample.weights },
        expected = { ...publicCases[12]!.expected }
      if (sample.outcome)
        for (const name of ['weighted', 'weighted_nan', 'weighted_normalized', 'lazy'])
          expected[name] = sample.outcome
      for (const name of Object.keys(definitions))
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
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
    // Public text search values are read by their input functions, whose handling of non-ASCII
    // text follows the server encoding the project declares.
    const tsBundle = renderTypescriptSchemaCheckArtifacts(
        [table],
        catalog.domains,
        catalog.domains,
        {
          executionContext: { ...context, serverEncoding: 'UTF8', clientEncoding: 'UTF8' },
        },
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
    const runtime = await import(pathToFileURL(join(tsRoot, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(tsBundle.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const result = (outcome: Outcome): Result =>
      outcome.kind === 'Unknown'
        ? { certain: false }
        : outcome.kind === 'Error'
          ? { certain: true, error: outcome.value.state.toString(36).toUpperCase() }
          : { certain: true, value: outcome.kind === 'Null' ? null : outcome.kind === 'True' }
    const outcome = (result: Result): Outcome =>
      !result.certain
        ? { kind: 'Unknown' }
        : result.error
          ? { kind: 'Error', value: { state: parseInt(result.error, 36) } }
          : { kind: result.value === null ? 'Null' : result.value ? 'True' : 'False' }
    const evaluate = (row: Record<string, unknown>): Record<string, Result> =>
      Object.fromEntries(
        api
          .evaluatePublicVectorRowsChecks(row)
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    const columnTypes: Record<string, string> = {
      item: 'nested_vector',
      reference: 'tsquery',
      choose_first: 'bool',
      bypass: 'bool',
      weights: 'real[]',
      expected: 'text',
    }
    // Each constraint evaluated by the server over the same parameters; a parameter a check does
    // not read cannot fail it.
    const server = async (row: Record<string, unknown>) => {
      const results: Record<string, Result> = {}
      const source = Object.entries(columnTypes)
        .map(([name, type], index) => `$${index + 1}::${type} AS ${name}`)
        .join(',')
      for (const [name, sql] of Object.entries(definitions))
        try {
          const { rows } = await pg.query<{ value: boolean | null }>(
            `SELECT (${sql}) AS value FROM (SELECT ${source}) input`,
            Object.keys(columnTypes).map((column) =>
              new RegExp(`\\b${column}\\b`, 'u').test(sql) ? row[column] : null,
            ),
          )
          results[name] = { certain: true, value: rows[0]!.value }
        } catch (error) {
          results[name] = { certain: true, error: (error as { code: string }).code }
        }
      return results
    }
    // Text search values are public text, read through their input functions. Values only binary
    // input can store reach the public API as the text the server prints for them, and those whose
    // printed text the input rejects reach it only as that text.
    const spelled = async (sample: string | null, kind: 'tsvector' | 'tsquery') =>
      sample === null || !sample.startsWith('__')
        ? sample
        : (
            await pg.query<{ text: string }>(
              kind === 'tsvector'
                ? 'SELECT value::text AS text FROM vector_binary_inputs WHERE key=$1'
                : 'SELECT value::text AS text FROM binary_queries WHERE key=$1',
              [sample],
            )
          ).rows[0]!.text
    const readable = async (text: string | null, kind: 'tsvector' | 'tsquery') =>
      text === null ||
      (await pg.query(`SELECT $1::${kind}`, [text]).then(
        () => true,
        () => false,
      ))
    // A real array's public value is a list of numbers indexed from one, as the column declares
    // one dimension; weights with other lower bounds or more dimensions go to the evaluator
    // directly.
    const publicWeights = (payload: Input) => {
      if (payload.kind === 'Null') return null
      const value = (
        payload as {
          value: { dimensions: { lower: number; length: number }[]; elements: unknown[] }
        }
      ).value
      if (value.dimensions.some((dimension) => dimension.lower !== 1)) return undefined
      if (value.dimensions.length > 1) return undefined
      const cells = value.elements.map((element) => {
        const cell = element as { kind: string; value?: number }
        if (cell.kind === 'Null') return null
        if (cell.kind === 'Float4UnspecifiedNan') return NaN
        const bytes = Buffer.alloc(4)
        bytes.writeInt32BE(cell.value!)
        return bytes.readFloatBE(0)
      })
      const lengths = value.dimensions.map((dimension) => dimension.length)
      const nest = (depth: number, offset: number): unknown[] =>
        depth === lengths.length - 1
          ? cells.slice(offset, offset + lengths[depth]!)
          : Array.from({ length: lengths[depth]! }, (_, index) =>
              nest(
                depth + 1,
                offset + index * lengths.slice(depth + 1).reduce((left, right) => left * right, 1),
              ),
            )
      return lengths.length ? nest(0, 0) : []
    }
    const operations = await import(
      pathToFileURL(join(tsRoot, 'js/checks-rust/pg_catalog/operations.js')).href
    )
    const internalRow = (row: Record<string, unknown>, weights: Input) => ({
      item:
        row.item === null
          ? { kind: 'Null' }
          : operations.tsvectorFromTextContext(runtime.makeTextValue(row.item), true),
      reference:
        row.reference === null
          ? { kind: 'Null' }
          : operations.tsqueryFromTextContext(runtime.makeTextValue(row.reference), true),
      choose_first: runtime.makeBoolValue(row.choose_first),
      bypass: runtime.makeBoolValue(row.bypass),
      weights:
        weights.kind === 'Value'
          ? runtime.makeArrayValue(weights.value)
          : (weights as { kind: string }),
      expected: row.expected === null ? { kind: 'Null' } : runtime.makeTextValue(row.expected),
    })
    const storedOnly = new Set<string>()
    let publicChecked = 0,
      internalChecked = 0
    for (const native of nativeRows) {
      const item = await spelled(native.source, 'tsvector'),
        reference = await spelled(native.reference, 'tsquery')
      if (!(await readable(item, 'tsvector'))) storedOnly.add(item!)
      if (!(await readable(reference, 'tsquery'))) storedOnly.add(reference!)
      if (!(await readable(item, 'tsvector')) || !(await readable(reference, 'tsquery'))) continue
      const row = {
        item,
        reference,
        choose_first: native.choose,
        bypass: native.bypass,
        weights: native.weight,
        expected: native.expectedHex,
      }
      const expected = await server(row)
      const weights = publicWeights(native.weights)
      if (weights === undefined) {
        expect({
          row,
          results: internal('public.vector_rows', internalRow(row, native.weights)),
        }).toEqual({
          row,
          results: Object.fromEntries(
            Object.entries(expected).map(([name, value]) => [name, outcome(value)]),
          ),
        })
        internalChecked++
      } else {
        expect({ row, results: evaluate({ ...row, weights }) }).toEqual({ row, results: expected })
        publicChecked++
      }
    }
    expect({ publicChecked, internalChecked, storedOnly: storedOnly.size }).toEqual({
      publicChecked: 87,
      internalChecked: 3,
      storedOnly: 8,
    })
    // Text the input functions reject fails every check that reads it.
    const publicBase = {
      item: 'a:1 b:2',
      reference: 'a <-> b',
      choose_first: true,
      bypass: false,
      weights: [0.1, 0.2, 0.4, 1].map((weight) => Math.fround(weight)),
      expected: nativeRows[12]!.expectedHex,
    }
    expect(nativeRows[12]).toMatchObject({
      source: publicBase.item,
      reference: publicBase.reference,
      weight: '{0.1,0.2,0.4,1}',
    })
    expect(evaluate(publicBase)).toEqual(
      Object.fromEntries(
        Object.entries(publicCases[12]!.expected).map(([name, value]) => [name, result(value)]),
      ),
    )
    for (const text of storedOnly)
      for (const column of ['item', 'reference'])
        expect({ column, text, results: evaluate({ ...publicBase, [column]: text }) }).toEqual({
          column,
          text,
          results: await server({ ...publicBase, [column]: text, weights: '{0.1,0.2,0.4,1}' }),
        })
    for (const reference of ['a', 'a &', 'a <0> b'])
      expect({ reference, results: evaluate({ ...publicBase, reference }) }).toEqual({
        reference,
        results: await server({ ...publicBase, reference, weights: '{0.1,0.2,0.4,1}' }),
      })
    for (const item of ['a:1', 'a:0', "'unterminated"])
      expect({ item, results: evaluate({ ...publicBase, item }) }).toEqual({
        item,
        results: await server({ ...publicBase, item, weights: '{0.1,0.2,0.4,1}' }),
      })
    expect(evaluate({ ...publicBase, item: undefined })).toEqual(
      Object.fromEntries(
        Object.keys(definitions).map((name) => [
          name,
          name === 'null_literal' ? { certain: true, value: true } : { certain: false },
        ]),
      ),
    )
    for (const bad of [{}, 3, pattern, { kind: 'Value', value: { ...pattern.value, root: 999 } }])
      expect(
        () => evaluate({ ...publicBase, reference: bad }),
        JSON.stringify(bad, (_key, item) => (typeof item === 'bigint' ? String(item) : item)),
      ).toThrow(TypeError)
    const saved = structuredClone(publicBase)
    evaluate(publicBase)
    expect(publicBase).toEqual(saved)
    const good = complete.value
    for (const bad of [
      3,
      {},
      complete,
      { kind: 'Unknown' },
      { kind: 'Null' },
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
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
      '\ud800',
    ])
      expect(
        () => evaluate({ ...publicBase, item: bad }),
        JSON.stringify(bad, (_key, item) => (typeof item === 'bigint' ? String(item) : item)),
      ).toThrow(TypeError)
    for (const weights of [fullWeights, { kind: 'Unknown' }, [0.1, '0.2', 0.4, 1], [1n, 1, 1, 1]])
      expect(
        () => evaluate({ ...publicBase, weights }),
        JSON.stringify(weights, (_key, item) => (typeof item === 'bigint' ? String(item) : item)),
      ).toThrow(TypeError)
    // Unknown and failed operands, and weights with unknown elements, handed to the evaluator
    // directly.
    const internalBase = internalRow(publicBase, fullWeights)
    expect(internal('public.vector_rows', internalBase)).toEqual(publicCases[12]!.expected)
    for (const item of [
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ])
      expect(internal('public.vector_rows', { ...internalBase, item })).toEqual(
        Object.fromEntries(
          Object.keys(definitions).map((name) => [
            name,
            name === 'null_literal' ? { kind: 'True' } : item,
          ]),
        ),
      )
    for (const [item, reference] of [
      [docError, queryError],
      [{ kind: 'Unknown' }, queryError],
      [docError, { kind: 'Null' }],
    ] as [Input, Input][])
      expect(internal('public.vector_rows', { ...internalBase, item, reference })).toEqual(
        Object.fromEntries(
          Object.keys(definitions).map((name) => [
            name,
            name === 'null_literal'
              ? { kind: 'True' }
              : name === 'presence' && item.kind === 'Unknown'
                ? { kind: 'Unknown' }
                : item.kind === 'Error'
                  ? docError
                  : queryError,
          ]),
        ),
      )
    // A query the input rejects fails every check that reads it, whatever the document holds.
    const rejectedQuery = await server({
      ...publicBase,
      item: null,
      reference: 'a &',
      weights: '{0.1,0.2,0.4,1}',
    })
    expect(evaluate({ ...publicBase, item: undefined, reference: 'a &' })).toEqual({
      ...rejectedQuery,
      presence: { certain: false },
    })
    for (const sample of partialCases) {
      const expected = { ...publicCases[12]!.expected }
      if (sample.outcome)
        for (const name of ['weighted', 'weighted_nan', 'weighted_normalized', 'lazy'])
          expected[name] = sample.outcome
      expect({
        weights: sample.weights,
        results: internal('public.vector_rows', {
          ...internalBase,
          weights:
            sample.weights.kind === 'Value'
              ? runtime.makeArrayValue(sample.weights.value)
              : sample.weights,
        }),
      }).toEqual({ weights: sample.weights, results: expected })
    }
    // Every stored value of the matrix, including those only binary input stores, those whose
    // stored size the caller did not supply and weights with unknown elements, decides through the
    // entries as the server did.
    const stored = (input: Input) => {
      if (input.kind !== 'Value' || typeof input.value !== 'object') return input
      const value = input.value as object
      return 'lexemes' in value
        ? runtime.makeTsvectorValue(value)
        : 'nodes' in value
          ? runtime.makeTsqueryValue(value)
          : 'elements' in value
            ? runtime.makeArrayValue(value)
            : input
    }
    for (const c of publicCases)
      expect(
        internal(
          'public.vector_rows',
          Object.fromEntries(Object.entries(c.row).map(([name, input]) => [name, stored(input)])),
        ),
      ).toEqual(c.expected)
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
        type = vector
          ? 'checkruntime.TsvectorValue'
          : query
            ? 'checkruntime.TsqueryValue'
            : name === 'weights'
              ? 'checkruntime.ArrayValue'
              : name === 'expected'
                ? '*string'
                : '*bool'
      if (input.kind === 'Null') return `NullCheckValue[${type}]()`
      if (input.kind === 'Unknown') return `CheckOptional[${type}] {}`
      if (input.kind === 'Error')
        return `KnownCheckValue(checkruntime.${vector ? 'Tsvector' : query ? 'Tsquery' : 'Array'}Value{Kind:checkruntime.${vector ? 'Tsvector' : query ? 'Tsquery' : 'Array'}ValueError,Error:checkruntime.SqlError{State:${input.value.state}}})`

      if (
        typeof input.value === 'object' &&
        'elementType' in input.value &&
        'elements' in input.value
      ) {
        const v = input.value
        return `KnownCheckValue(checkruntime.MakeArrayValue(checkruntime.ArrayPayload{ElementType:${JSON.stringify(v.elementType)},ElementKind:${v.elementKind},NullBitmap:checkruntime.BoolValue{Kind:checkruntime.BoolValue${v.nullBitmap.kind === 'Value' ? 'Value' : 'Unknown'},Value:${v.nullBitmap.kind === 'Value' ? v.nullBitmap.value : false}},Dimensions:[]checkruntime.ArrayDimension{${v.dimensions.map((d) => `{Lower:${d.lower},Length:${d.length}}`).join(',')}},Elements:[]checkruntime.ArrayElement{${v.elements.map((c) => (c.kind === 'Float4' ? `{Kind:checkruntime.ArrayElementFloat4,Float4:${c.value}}` : c.kind === 'Float4UnspecifiedNan' ? '{Kind:checkruntime.ArrayElementFloat4UnspecifiedNan}' : c.kind === 'Null' ? '{Kind:checkruntime.ArrayElementNull}' : '{Kind:checkruntime.ArrayElementUnknown}')).join(',')}}}))`
      }
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
      return `KnownCheckValue(ptr(${type.slice(1)}(${typeof input.value === 'string' ? JSON.stringify(input.value) : String(input.value)})))`
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
func TestPayloads(t *testing.T){rows:=[]PublicVectorRowsCheckInput{${goRows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range func() []CheckEvaluation {r, e := EvaluatePublicVectorRowsChecks(row); if e != nil {panic(e)}; return r}(){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}

base:=rows[12];for _,v:=range []checkruntime.TsvectorValue{
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:-2}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:1073741824}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:string([]byte{255})}}}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:"a",Positions:[]checkruntime.TsvectorPosition{{Position:-1,Weight:3}}}}}},
 {Kind:checkruntime.TsvectorValueKind(99)},
}{base.Item=KnownCheckValue(v);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicVectorRowsChecks(base); if e != nil {return nil}; return r}(){if (c.Constraint=="same"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed vector became certain",c)}}}

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
