import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const packet = 'artifacts/goal-checks/tsvector-literals-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('preserves captured tsvector literal storage through source and stored comparisons, checked domains and lazy native INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-scalar-'))
  try {
    await pg.exec(
      "CREATE DOMAIN imported_vector AS tsvector; CREATE DOMAIN nested_vector AS imported_vector;CREATE DOMAIN forbidden_vector AS imported_vector CHECK(VALUE<>'bad'::tsvector);CREATE DOMAIN required_vector AS nested_vector NOT NULL",
    )
    const definitions: Record<string, string> = {
      same: "source::tsvector='a:1A'::tsvector",
      nonempty: "source::tsvector<>''::tsvector",
      less: "source::tsvector<'bb'::tsvector",
      selected:
        "(CASE WHEN choose_first THEN 'a:1A'::tsvector ELSE 'bb'::tsvector END)=source::tsvector",
      coalesced: "COALESCE(NULL::tsvector,source::tsvector,'a:1A'::tsvector)='a:1A'::tsvector",
      distinctness: "source::tsvector IS DISTINCT FROM 'a:1A'::tsvector",
      nulled: "NULLIF(source::tsvector,'a:1A'::tsvector) IS NULL",
      unicode: "source::tsvector='é:2C 😀:1'::tsvector",
      checked: 'source::forbidden_vector IS NOT NULL',
      required: 'source::required_vector IS NOT NULL',
      domain_literal: "source::tsvector='a:1A'::forbidden_vector",
      comparison_size: "tsvector_cmp('a'::tsvector,'bb'::tsvector)=-1",
      constant_domain: "'a:1A'::forbidden_vector='a:1A'::tsvector",
      null_literal: 'NULL::tsvector IS NULL',
    }

    const columns =
      'source text,other text,expected_text text,expected_boolean bool,choose_first bool,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE vector_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(`CREATE TEMP TABLE vector_input(${columns})`)
    const catalog = await snapshotCatalog(pg)
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'vector_' + name)!,
        c = table.constraints[0]!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
              : c,
            [],
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, {
      serverEncoding: 'UTF8',
      defaultCollation: 'C',
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      null,
      '',
      'a:1A',
      'bad',
      'b:2C a:1A',
      'a:2B a:1A',
      "'it''s':1A",
      '😀:2 é:1',
      "'",
      'a:0',
      'a:2147483648',
      'a'.repeat(2047),
    ]
    let inserts = 0,
      rejected = 0
    for (let i = 0; i < samples.length; i++)
      for (const bypass of [false, true])
        for (const choose of [false, true]) {
          const source = samples[i]!,
            other = i % 3 === 0 ? null : i % 3 === 1 ? 'a:1' : 'zz',
            expectedText = i % 2 === 0 ? null : "'a'",
            expectedBoolean = i % 2 === 0
          await pg.query('DELETE FROM vector_input')
          await pg.query('INSERT INTO vector_input VALUES($1,$2,$3,$4,$5,$6)', [
            source,
            other,
            expectedText,
            expectedBoolean,
            choose,
            bypass,
          ])
          for (const [name, sql] of Object.entries(definitions)) {
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM vector_input`,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.query(`INSERT INTO vector_${name} SELECT * FROM vector_input`)
            } catch (e) {
              failure = (e as { code: string }).code
            }
            expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejected++
            const overflow =
              source === 'a:2147483648' &&
              !bypass &&
              name !== 'comparison_size' &&
              name !== 'constant_domain' &&
              name !== 'null_literal'
            const expected: Outcome = overflow
              ? { kind: 'Unknown' }
              : state
                ? error(state)
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            const row: Row = {
              source: known(source),
              other: known(other),
              expected_text: known(expectedText),
              expected_boolean: known(expectedBoolean),
              choose_first: known(choose),
              bypass: known(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({
              source: source?.length && source.length > 100 ? { length: source.length } : source,
              other,
              name,
              bypass,
              choose,
              value,
              state,
              expected,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'literal-reference.json'),
      JSON.stringify({ inserts, rejected, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'tsvectorliterals',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(`tsvector literals: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('preserves the actual stored constant size when PostgreSQL renders different physical values as identical literal text', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-literal-size-'))
  try {
    await pg.exec(
      "CREATE CAST (text AS pg_node_tree) WITHOUT FUNCTION;CREATE TABLE stored_document(source text,bypass bool,CONSTRAINT same CHECK(CASE WHEN bypass THEN true ELSE source::tsvector='a'::tsvector END)) WITH(fillfactor=90)",
    )
    const before = await snapshotCatalog(pg),
      beforeTable = before.tables.find((t) => t.name === 'stored_document')!,
      beforeCheck = beforeTable.constraints[0]!
    const checks = [
      {
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: 'stored_document',
          constraint: 'before',
        },
        expression: portableCheckAtoms(lowerTableCheck(beforeTable, beforeCheck)!.expression),
      },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    const samples = [null, '', 'a', 'bb', 'a:0']
    const insert = async (
      name: string,
      source: string | null,
      bypass: boolean,
    ): Promise<Outcome> => {
      let state: string | undefined
      try {
        await pg.query('INSERT INTO stored_document(source,bypass) VALUES($1,$2)', [source, bypass])
      } catch (e) {
        state = (e as { code: string }).code
      }
      const expected: Outcome =
        state === '23514'
          ? { kind: 'False' }
          : state
            ? error(state)
            : bypass
              ? { kind: 'True' }
              : source === null
                ? { kind: 'Null' }
                : { kind: 'True' }
      fixtures.push({ name, row: { source: known(source), bypass: known(bypass) }, expected })
      native.push({ name, source, bypass, state, expected })
      return expected
    }
    for (const source of samples)
      for (const bypass of [false, true]) await insert('before', source, bypass)
    await pg.exec('DELETE FROM stored_document')
    const stored = (
      await pg.query<{ oid: number; tree: string }>(
        "SELECT oid,conbin::text tree FROM pg_constraint WHERE conrelid='stored_document'::regclass AND conname='same'",
      )
    ).rows[0]!
    let changed = false
    const typeOid = (
      await pg.query<{ oid: number }>("SELECT 'pg_catalog.tsvector'::regtype::oid oid")
    ).rows[0]!.oid
    const padded = stored.tree.replace(
      new RegExp(
        '(\\{CONST :consttype ' + typeOid + '[^{}]*:constvalue) (\\d+) \\[([^\\]]*)\\]',
        'u',
      ),
      (_all, prefix: string, length: string, data: string) => {
        const original = Buffer.from(
          data
            .trim()
            .split(/\s+/u)
            .map(Number)
            .map((v) => v & 255),
        )
        expect(original.length).toBe(Number(length))
        const bytes = Buffer.concat([original, Buffer.from([0])])
        if (original.readUInt32LE(0) / 4 === original.length) bytes.writeUInt32LE(bytes.length * 4)
        else {
          expect(original.readUInt32BE(0)).toBe(original.length)
          bytes.writeUInt32BE(bytes.length)
        }
        changed = true
        return (
          prefix +
          ' ' +
          bytes.length +
          ' [ ' +
          [...bytes].map((v) => (v > 127 ? v - 256 : v)).join(' ') +
          ' ]'
        )
      },
    )
    expect(changed).toBe(true)
    await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
      padded,
      stored.oid,
    ])
    await pg.exec('ALTER TABLE stored_document SET(fillfactor=90)')
    const after = await snapshotCatalog(pg),
      afterTable = after.tables.find((t) => t.name === 'stored_document')!,
      afterCheck = afterTable.constraints[0]!
    expect(afterCheck.definition).toBe(beforeCheck.definition)
    expect(beforeCheck.tsvectorConstants!.constants[0]!.storage).toEqual({
      nativeBytes: 13,
      lexemeCount: 1,
    })
    expect(afterCheck.tsvectorConstants!.constants[0]!.storage).toEqual({
      nativeBytes: 14,
      lexemeCount: 1,
    })
    checks.push({
      identity: { schema: 'public', kind: 'table', owner: 'stored_document', constraint: 'after' },
      expression: portableCheckAtoms(lowerTableCheck(afterTable, afterCheck)!.expression),
    })
    for (const source of samples)
      for (const bypass of [false, true]) await insert('after', source, bypass)
    expect(native).toContainEqual(
      expect.objectContaining({
        name: 'before',
        source: 'a',
        bypass: false,
        expected: { kind: 'True' },
      }),
    )
    expect(native).toContainEqual(
      expect.objectContaining({
        name: 'after',
        source: 'a',
        bypass: false,
        expected: { kind: 'False' },
      }),
    )
    const { diffCatalogs } = await import('../../src/catalog/diff.js')
    expect(diffCatalogs(before, after).modified.map((v) => v.entityId)).toContain(
      'public.stored_document',
    )
    const logical = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(logical)
      if (!value || typeof value !== 'object') return value
      const object = value as Record<string, unknown>
      if (object['PgsidStoredTsvector']) {
        const { nativeBytes: _native, ...payload } = object['PgsidStoredTsvector'] as Record<
          string,
          unknown
        >
        return { PgsidStoredTsvector: payload }
      }
      return Object.fromEntries(Object.entries(object).map(([key, child]) => [key, logical(child)]))
    }
    const strip = (snapshot: typeof before) => ({
      ...snapshot,
      tables: snapshot.tables.map((t) => ({
        ...t,
        constraints: t.constraints.map(({ tsvectorConstants: _storage, ...c }) => ({
          ...c,
          rowCoercionContext: c.rowCoercionContext && {
            ...c.rowCoercionContext,
            scalars: c.rowCoercionContext.scalars?.map((s) => ({
              ...s,
              expression: logical(s.expression),
            })),
          },
        })),
      })),
    })
    expect(diffCatalogs(strip(before), strip(after)).modified).toEqual([])

    const shortTree = stored.tree.replace(
      new RegExp(
        '(\\{CONST :consttype ' + typeOid + '[^{}]*:constvalue) (\\d+) \\[([^\\]]*)\\]',
        'u',
      ),
      (_all, prefix: string, length: string, data: string) => {
        const original = Buffer.from(
          data
            .trim()
            .split(/\s+/u)
            .map(Number)
            .map((v) => v & 255),
        )
        expect(original.length).toBe(Number(length))
        const shortLength = original.length - 3,
          little = original.readUInt32LE(0) / 4 === original.length
        const bytes = Buffer.concat([
          Buffer.from([little ? shortLength * 2 + 1 : shortLength + 128]),
          original.subarray(4),
        ])
        return (
          prefix +
          ' ' +
          bytes.length +
          ' [ ' +
          [...bytes].map((v) => (v > 127 ? v - 256 : v)).join(' ') +
          ' ]'
        )
      },
    )
    await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
      shortTree,
      stored.oid,
    ])
    await pg.exec('ALTER TABLE stored_document SET(fillfactor=90)')
    const shortSnapshot = await snapshotCatalog(pg),
      shortTable = shortSnapshot.tables.find((t) => t.name === 'stored_document')!,
      shortCheck = shortTable.constraints[0]!
    expect(shortCheck.definition).toBe(beforeCheck.definition)
    expect(shortCheck.tsvectorConstants).toEqual(beforeCheck.tsvectorConstants)
    expect(diffCatalogs(before, shortSnapshot).modified).toEqual([])
    checks.push({
      identity: { schema: 'public', kind: 'table', owner: 'stored_document', constraint: 'short' },
      expression: portableCheckAtoms(lowerTableCheck(shortTable, shortCheck)!.expression),
    })
    for (const source of samples)
      for (const bypass of [false, true]) await insert('short', source, bypass)
    expect(native).toContainEqual(
      expect.objectContaining({
        name: 'short',
        source: 'a',
        bypass: false,
        expected: { kind: 'True' },
      }),
    )
    for (const variant of ['missing', 'stale', 'duplicate', 'owned'] as const) {
      const context = afterCheck.tsvectorConstants!,
        constraint = {
          ...afterCheck,
          rowCoercionContext: variant === 'owned' ? afterCheck.rowCoercionContext : undefined,
          tsvectorConstants:
            variant === 'missing' || variant === 'owned'
              ? undefined
              : variant === 'stale'
                ? { ...context, definition: 'CHECK (false)' }
                : { ...context, constants: [...context.constants, ...context.constants] },
        }
      checks.push({
        identity: {
          schema: 'public',
          kind: 'table',
          owner: 'stored_document',
          constraint: variant,
        },
        expression: portableCheckAtoms(lowerTableCheck(afterTable, constraint)!.expression),
      })
      for (const source of samples)
        for (const bypass of [false, true]) {
          const actual = fixtures.find(
            (v) =>
              v.name === 'after' &&
              v.row.source?.kind === (source === null ? 'Null' : 'Value') &&
              (source === null ||
                (v.row.source.kind === 'Value' && v.row.source.value === source)) &&
              v.row.bypass?.kind === 'Value' &&
              v.row.bypass.value === bypass,
          )!
          const expected: Outcome =
            variant === 'owned' || bypass || source === null || actual.expected.kind === 'Error'
              ? actual.expected
              : { kind: 'Unknown' }
          fixtures.push({ name: variant, row: actual.row, expected })
        }
    }
    const group = prepareCheckRustGroup(checks, { serverEncoding: 'UTF8' })
    group.checks.forEach((c) => expect(c.kind).toBe('supported'))
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'stored-size-reference.json'),
      JSON.stringify(
        {
          native,
          fixtures: fixtures.length,
          before: beforeCheck.tsvectorConstants,
          after: afterCheck.tsvectorConstants,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsvectorstoredsize',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
