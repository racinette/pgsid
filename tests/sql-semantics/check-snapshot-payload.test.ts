import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows } from '../support/check-entries.js'

it.each(['pg_snapshot', 'txid_snapshot'] as const)(
  'validates SQL-coerced %s payloads and their value states through the public TypeScript API',
  async (type) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-snapshot-payload-'))
    try {
      const idType = type === 'pg_snapshot' ? 'xid8' : 'bigint'
      const visible = type === 'pg_snapshot' ? 'pg_visible_in_snapshot' : 'txid_visible_in_snapshot'
      await pg.exec(`CREATE DOMAIN snapshot_edge AS ${type};CREATE DOMAIN nested_snapshot_edge AS snapshot_edge;
      CREATE TABLE snapshot_payloads(position nested_snapshot_edge,expected bytea,
      CONSTRAINT wire CHECK(${type}_send(position)=expected),
      CONSTRAINT lower_bound CHECK(${type}_xmin(position)='1'::${idType}),
      CONSTRAINT upper_bound CHECK(${type}_xmax(position)='9'::${idType}),
      CONSTRAINT pending CHECK(NOT ${visible}('3'::${idType},position)),
      CONSTRAINT available CHECK(${visible}('4'::${idType},position)),
      CONSTRAINT present CHECK(position IS NOT NULL),CONSTRAINT absent CHECK(position IS NULL));
      CREATE TABLE snapshot_text_inputs(source_text text,expected_text text,CONSTRAINT canonical_text CHECK(source_text::${type}::text COLLATE "C"=expected_text COLLATE "C"))`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'snapshot_payloads')!
      const textTable = catalog.tables.find((t) => t.name === 'snapshot_text_inputs')!
      const bundle = renderTypescriptSchemaCheckArtifacts([table, textTable], catalog.domains)
      await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
      await writeFile(join(root, 'checks.ts'), bundle.checks)
      for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
        const path = join(root, 'checks-rust', artifact.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, artifact.content)
      }
      await promisify(execFile)('node_modules/.bin/tsc', [
        '--strict',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--outDir',
        join(root, 'js'),
        join(root, 'checks.ts'),
      ]).catch((e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      })
      const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
      type Result = { certain: boolean; value?: boolean | null; error?: string }
      const evaluateText = (source_text: unknown, expected_text: unknown = '1:9:'): Result =>
        generated.evaluatePublicSnapshotTextInputsChecks({ source_text, expected_text })[0].result
      expect(evaluateText('1:9:')).toEqual({ certain: true, value: true })
      expect(evaluateText('1:9:', 'wrong')).toEqual({ certain: true, value: false })
      expect(evaluateText('invalid')).toEqual({ certain: true, error: '22P02' })
      for (const value of [String.fromCharCode(0), '\ud800', '\udc00'])
        expect(() => evaluateText(value)).toThrow(TypeError)
      await expect(
        pg.query('INSERT INTO snapshot_text_inputs(source_text,expected_text) VALUES($1,$2)', [
          String.fromCharCode(0),
          '1:9:',
        ]),
      ).rejects.toMatchObject({ code: '22021' })
      const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
      const internal = internalCheckRows(bundle.checks, runtime)
      const wire = (
        await pg.query<{ wire: Uint8Array }>(`SELECT ${type}_send('1:9:3,5'::${type}) AS wire`)
      ).rows[0]!.wire
      const evaluate = (position: unknown, expected: unknown = wire): Record<string, Result> =>
        Object.fromEntries(
          generated
            .evaluatePublicSnapshotPayloadsChecks({ position, expected })
            .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
        )
      // Each constraint evaluated by the server over the same parameters.
      const constraints = (
        await pg.query<{ name: string; definition: string }>(
          `SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint
           WHERE conrelid = 'snapshot_payloads'::regclass AND contype = 'c'`,
        )
      ).rows
      const server = async (position: unknown, expected: unknown = wire) => {
        const results: Record<string, Result> = {}
        for (const { name, definition } of constraints)
          try {
            const { rows } = await pg.query<{ value: boolean | null }>(
              `SELECT ${definition.replace(/^CHECK /u, '')} AS value
               FROM (SELECT $1::nested_snapshot_edge AS position, $2::bytea AS expected) AS input`,
              [position, expected],
            )
            results[name] = { certain: true, value: rows[0]!.value }
          } catch (error) {
            results[name] = { certain: true, error: (error as { code: string }).code }
          }
        return results
      }
      const known = {
        wire: { certain: true, value: true },
        lower_bound: { certain: true, value: true },
        upper_bound: { certain: true, value: true },
        pending: { certain: true, value: true },
        available: { certain: true, value: true },
        present: { certain: true, value: true },
        absent: { certain: true, value: false },
      }
      expect(evaluate('1:9:3,5')).toEqual(known)
      expect(await server('1:9:3,5')).toEqual(known)
      expect(evaluate('1:9:3,5', new Uint8Array([0])).wire).toEqual({ certain: true, value: false })
      expect(evaluate(null)).toEqual({
        wire: { certain: true, value: null },
        lower_bound: { certain: true, value: null },
        upper_bound: { certain: true, value: null },
        pending: { certain: true, value: null },
        available: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
      })
      expect(await server(null)).toEqual(evaluate(null))
      expectUndecidedOrRejected(() => evaluate(undefined))
      // Text the input function rejects fails every check that reads it, and text it accepts is
      // normalized first, both as the server reads the parameter.
      for (const text of [
        '0:9:3,5',
        '10:9:3,5',
        '9223372036854775808:18446744073709551615:',
        '1:4294967296:3,5',
        '1:9223372036854775808:3,5',
        '-9223372036854775809:9:3,5',
        '1:9:5,3',
        '1:9:3,3',
        '1:9:0',
        '1:9:10',
        '1:9:9',
        '1:9:',
        '',
      ])
        expect({ text, results: evaluate(text) }).toEqual({ text, results: await server(text) })
      expect(evaluate('1:9:3,3').wire).toEqual({ certain: true, value: false })
      expect(evaluate('1:9:5,3').wire).toEqual({ certain: true, error: '22P02' })
      const failure = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      const payload = { xmin: 1n, xmax: 9n, xip: [{ bits: 3n }, { bits: 5n }] },
        value = { kind: 'Value', value: payload }
      for (const position of [
        1n,
        13,
        { kind: 'Null' },
        { kind: 'Unknown' },
        failure,
        value,
        { kind: 'Value', value: '1:9:3,5' },
        { kind: 'Value', value: { ...payload, xmin: 0n } },
        { kind: 'Value', value: { ...payload, xmin: 10n } },
        { kind: 'Value', value: { xmin: -9223372036854775808n, xmax: -1n, xip: [] } },
        { kind: 'Value', value: { ...payload, xmax: 4294967296n } },
        { kind: 'Value', value: { ...payload, xmax: 9223372036854775808n } },
        { kind: 'Value', value: { ...payload, xmin: -9223372036854775809n } },
        { kind: 'Value', value: { ...payload, xip: [{ bits: 5n }, { bits: 3n }] } },
        { kind: 'Value', value: { ...payload, xip: [{ bits: 3n }, { bits: 3n }] } },
        { kind: 'Value', value: { ...payload, xip: [{ bits: 0n }] } },
        { kind: 'Value', value: { ...payload, xip: [{ bits: 10n }] } },
        { kind: 'Value', value: { ...payload, xip: [{ bits: 3 }] } },
        { kind: 'Value', value: { ...payload, xip: null } },
        { kind: 'Value', value: null },
      ])
        expect(() => evaluate(position)).toThrow(TypeError)
      // NULL, unknown and failed operands handed to the evaluator directly.
      const rows = (position: unknown) =>
        internal('public.snapshot_payloads', {
          position,
          expected: runtime.makeByteaValue(Buffer.from(wire).toString('hex')),
        })
      expect(rows(runtime.makeSnapshotValue(payload))).toEqual(
        Object.fromEntries(
          Object.entries(known).map(([name, result]) => [
            name,
            { kind: result.value ? 'True' : 'False' },
          ]),
        ),
      )
      expect(rows({ kind: 'Null' })).toEqual({
        wire: { kind: 'Null' },
        lower_bound: { kind: 'Null' },
        upper_bound: { kind: 'Null' },
        pending: { kind: 'Null' },
        available: { kind: 'Null' },
        present: { kind: 'False' },
        absent: { kind: 'True' },
      })
      expect(Object.values(rows({ kind: 'Unknown' }))).toEqual(
        Array.from({ length: 7 }, () => ({ kind: 'Unknown' })),
      )
      expect(Object.values(rows(failure))).toEqual(Array.from({ length: 7 }, () => failure))
      for (const text of [
        '9223372036854775807:9223372036854775809:9223372036854775808',
        '18446744073709551614:18446744073709551615:18446744073709551614',
      ]) {
        const expected = (
          await pg.query<{ wire: Uint8Array }>(`SELECT ${type}_send($1::${type}) AS wire`, [text])
        ).rows[0]!.wire
        expect(evaluate(text, expected).wire).toEqual({ certain: true, value: true })
        expect(evaluate(text, expected)).toEqual(await server(text, expected))
        const [xmin, xmax, xip] = text.split(':')
        const boundary = runtime.makeSnapshotValue({
          xmin: BigInt.asIntN(64, BigInt(xmin!)),
          xmax: BigInt.asIntN(64, BigInt(xmax!)),
          xip: xip!.split(',').map((word) => ({ bits: BigInt.asIntN(64, BigInt(word)) })),
        })
        expect(
          internal('public.snapshot_payloads', {
            position: boundary,
            expected: runtime.makeByteaValue(Buffer.from(expected).toString('hex')),
          }).wire,
        ).toEqual({ kind: 'True' })
      }
      // Stored snapshots the text input rejects reach the evaluator entries as stored.
      const bytea = (bytes: Uint8Array) =>
        runtime.makeByteaValue(Buffer.from(bytes).toString('hex'))
      const stored = (position: unknown, expected: Uint8Array) =>
        internal('public.snapshot_payloads', { position, expected: bytea(expected) })
      await pg.exec(`CREATE TABLE binary_snapshots(value ${type})`)
      for (const sample of [
        { received: [9n], canonical: [9n], normalized: '1:9:9' },
        { received: [3n, 3n], canonical: [3n], normalized: '1:9:3' },
      ]) {
        const bytes = Buffer.alloc(20 + sample.received.length * 8)
        bytes.writeInt32BE(sample.received.length, 0)
        bytes.writeBigUInt64BE(1n, 4)
        bytes.writeBigUInt64BE(9n, 12)
        sample.received.forEach((word, index) => bytes.writeBigUInt64BE(word, 20 + index * 8))
        const header = Buffer.alloc(19)
        Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
        const tuple = Buffer.alloc(6)
        tuple.writeInt16BE(1)
        tuple.writeInt32BE(bytes.length, 2)
        const blob = new Blob([
          new Uint8Array(Buffer.concat([header, tuple, bytes, Buffer.from('ffff', 'hex')])),
        ])
        await pg.exec('TRUNCATE binary_snapshots')
        await pg.exec("COPY binary_snapshots FROM '/dev/blob' (FORMAT binary)", { blob })
        const row = (
          await pg.query<{ wire: Uint8Array; normalized: string }>(
            `SELECT ${type}_send(value) AS wire,value::text AS normalized FROM binary_snapshots`,
          )
        ).rows[0]!
        expect(row.normalized).toBe(sample.normalized)
        const binaryValue = runtime.makeSnapshotValue({
          xmin: 1n,
          xmax: 9n,
          xip: sample.canonical.map((bits) => ({ bits })),
        })
        expect(stored(binaryValue, row.wire).wire).toEqual({ kind: 'True' })
        expect(stored(binaryValue, row.wire).present).toEqual({ kind: 'True' })
        expect(evaluate(sample.normalized, row.wire)).toEqual(
          await server(sample.normalized, row.wire),
        )
        if (sample.normalized === '1:9:9') {
          expect(evaluate(sample.normalized, row.wire).present).toEqual({
            certain: true,
            error: '22P02',
          })
          await expect(pg.query(`SELECT $1::${type}`, [sample.normalized])).rejects.toMatchObject({
            code: '22P02',
          })
        } else {
          expect(evaluate(sample.normalized, row.wire).wire).toEqual({ certain: true, value: true })
          expect(evaluate(sample.normalized, row.wire).present).toEqual({
            certain: true,
            value: true,
          })
        }
      }
      // The evaluator copies a snapshot's parts, so later changes to them do not reach it.
      const saved = runtime.makeSnapshotValue(payload)
      payload.xip[0]!.bits = 4n
      payload.xip.push({ bits: 8n })
      payload.xmin = 2n
      expect(stored(saved, wire).wire).toEqual({ kind: 'True' })
      expect(stored(runtime.makeSnapshotValue(payload), wire).wire).toEqual({ kind: 'False' })
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  180000,
)
