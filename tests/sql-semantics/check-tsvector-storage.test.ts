import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

const packet = 'artifacts/goal-checks/tsvector-storage-active'
const quote = (text: string) => '"' + text.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
const record = (...fields: (string | null)[]) =>
  '(' + fields.map((f) => (f === null ? '' : quote(f))).join(',') + ')'
const array = (...fields: (string | null)[]) =>
  '{' + fields.map((f) => (f === null ? 'NULL' : quote(f))).join(',') + '}'
const literal = (text: string) => '$stored$' + text + '$stored$'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('restores stored tsvector leaf sizes inside arrays, domains, evolved records and nested record arrays with native source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-storage-'))
  try {
    await pg.exec(`CREATE DOMAIN vector_value AS tsvector;
   CREATE TYPE vector_leaf AS(flag bool,value vector_value,items tsvector[],tail text);
   CREATE TYPE vector_outer AS(first int4,child vector_leaf,history vector_leaf[],last tsvector);
   CREATE DOMAIN vector_leaf_domain AS vector_leaf;
   CREATE DOMAIN vector_leaf_array AS vector_leaf[];
   CREATE DOMAIN vector_values AS tsvector[];
   CREATE TYPE vector_deep AS(groups vector_values[]);
   CREATE TYPE vector_evolved AS(removed text,value tsvector);`)
    const forms: { name: string; sql: string; native?: string }[] = []
    for (const [i, raw] of [null, '', 'a:1A', 'é:2C 😀:1'].entries()) {
      const terms = array(raw, null, 'z:2B'),
        leaf = record('true', raw, terms, 'after,"\\tail'),
        cells = '[-1:1]=' + array(leaf, null, leaf),
        outer = record('7', leaf, cells, raw)
      const typed = literal(leaf) + '::vector_leaf',
        bag = literal(cells) + '::vector_leaf[]',
        nested = literal(outer) + '::vector_outer'
      for (const [name, sql] of Object.entries({
        array: `${literal(terms)}::tsvector[]=ARRAY[reference::tsvector,NULL::tsvector,'z:2B'::tsvector]`,
        domain_cells: `${literal(terms)}::vector_value[]=ARRAY[reference::vector_value,NULL::vector_value,'z:2B'::vector_value]`,
        deep_domain_array: `(((${literal(record(array(terms, null, terms)))}::vector_deep).groups)[1])[1] IS NOT DISTINCT FROM reference::tsvector`,
        lower_bound: `(${literal('[-2:0]=' + terms)}::tsvector[])[-2] IS NOT DISTINCT FROM reference::tsvector`,
        record: `(${typed}).value IS NOT DISTINCT FROM reference::tsvector`,
        record_array: `(${typed}).items=ARRAY[reference::tsvector,NULL::tsvector,'z:2B'::tsvector]`,
        record_whole: `${typed}=ROW(true,reference::vector_value,ARRAY[reference::tsvector,NULL::tsvector,'z:2B'::tsvector],'after,"\\tail')::vector_leaf`,
        nested: `(${nested}).child.value IS NOT DISTINCT FROM reference::tsvector`,
        nested_array: `(((${nested}).history)[-1]).value IS NOT DISTINCT FROM reference::tsvector`,
        bag: `((${bag})[-1]).value IS NOT DISTINCT FROM reference::tsvector`,
        domain: `(${literal(leaf)}::vector_leaf_domain).value IS NOT DISTINCT FROM reference::tsvector`,
        domain_array: `((${literal(cells)}::vector_leaf_array)[-1]).value IS NOT DISTINCT FROM reference::tsvector`,
        multidimensional: `(${literal('[0:0][-2:-1]={' + array(raw, null) + '}')}::tsvector[])[0][-2] IS NOT DISTINCT FROM reference::tsvector`,
      }))
        forms.push({ name: name + '_' + i, sql })
    }
    const original = literal(record('discarded', 'a:1A')) + '::vector_evolved',
      current = literal(record('a:1A', null)) + '::vector_evolved'
    forms.push({
      name: 'evolved',
      sql: `(${current}).value IS NOT DISTINCT FROM reference::tsvector`,
      native: `(${original}).value IS NOT DISTINCT FROM reference::tsvector`,
    })
    const checks = forms.map((f, i) => ({
      ...f,
      definition: `CHECK(CASE WHEN bypass OR selector<>${i} THEN true ELSE (${f.sql}) IS NOT DISTINCT FROM expected END)`,
      nativeDefinition: `CHECK(CASE WHEN bypass OR selector<>${i} THEN true ELSE (${f.native ?? f.sql}) IS NOT DISTINCT FROM expected END)`,
    }))
    await pg.exec(
      `CREATE TABLE vector_stored(selector int4,reference text,expected bool,bypass bool,${checks.map((c) => `CONSTRAINT "${c.name}" ${c.nativeDefinition}`).join(',')})`,
    )
    await pg.exec(
      'ALTER TYPE vector_evolved DROP ATTRIBUTE removed;ALTER TYPE vector_evolved ADD ATTRIBUTE quantity int4',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'vector_stored')!
    const plans = checks.flatMap((c) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...table.constraints.find((k) => k.name === c.name)!, definition: c.definition }
              : table.constraints.find((k) => k.name === c.name)!,
            [],
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      })),
    )
    for (const c of table.constraints) {
      expect(c.tsvectorConstants?.complete, c.name).toBe(true)
      expect(c.tsvectorConstants?.containers?.length, c.name).toBeGreaterThan(0)
    }
    const group = prepareCheckRustGroup(plans, {
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejections = 0
    for (const [selector, c] of checks.entries())
      for (const reference of ['a:1A', 'b:2C', null, 'a:0'])
        for (const variant of [0, 1, 2]) {
          let value: boolean | null = null,
            state: string | undefined
          try {
            value = (
              await pg.query<{ v: boolean | null }>(
                `SELECT (${c.sql}) v FROM(SELECT $1::text reference) q`,
                [reference],
              )
            ).rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          const expected = variant === 1 ? !value : value,
            bypass = variant === 2
          let failure: string | undefined
          try {
            await pg.query('INSERT INTO vector_stored VALUES($1,$2,$3,$4)', [
              selector,
              reference,
              expected,
              bypass,
            ])
          } catch (e) {
            failure = (e as { code: string }).code
          }
          const outcome: Outcome = bypass
            ? { kind: 'True' }
            : state
              ? error(state)
              : { kind: variant === 1 ? 'False' : 'True' }
          expect(failure, c.name).toBe(
            outcome.kind === 'Error' ? state : outcome.kind === 'False' ? '23514' : undefined,
          )
          inserts++
          if (failure) rejections++
          const row: Row = {
            selector: known(selector),
            reference: known(reference),
            expected: known(expected),
            bypass: known(bypass),
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: c.name + '_' + origin, row, expected: outcome })
          references.push({ name: c.name, reference, variant, value, state, failure })
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'containers-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          contexts: table.constraints.map((c) => ({ name: c.name, context: c.tsvectorConstants })),
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsvectorstorage',
      group,
      plans.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `stored tsvector containers: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('preserves erased native leaf padding, short headers and binary-origin positions in stored containers while refusing stale metadata', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-storage-native-'))
  try {
    await pg.exec(`CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION;
   CREATE TABLE vector_padding(source text,bypass bool,CONSTRAINT same CHECK(CASE WHEN bypass THEN true ELSE '{a}'::tsvector[]=ARRAY[source::tsvector] END)) WITH(fillfactor=90);
   CREATE TYPE vector_box AS(value tsvector)`)
    const { diffCatalogs } = await import('../../src/catalog/diff.js')
    const before = await snapshotCatalog(pg),
      table = before.tables.find((t) => t.name === 'vector_padding')!,
      constraint = table.constraints[0]!
    const arrayOid = (await pg.query<{ oid: number }>("SELECT 'tsvector[]'::regtype::oid oid"))
      .rows[0]!.oid
    const saved = (
      await pg.query<{ oid: number; tree: string }>(
        "SELECT oid,conbin::text tree FROM pg_constraint WHERE conrelid='vector_padding'::regclass AND conname='same'",
      )
    ).rows[0]!
    const replaceDatum = (
      tree: string,
      oid: number,
      mutate: (data: Buffer, little: boolean) => Buffer,
    ): string => {
      let replaced = false
      const result = tree.replace(
        new RegExp(
          '(\\{CONST :consttype ' + oid + '\\b[^{}]*:constvalue) (\\d+) \\[([^\\]]*)\\]',
          'u',
        ),
        (_all, prefix: string, length: string, body: string) => {
          const bytes = Buffer.from(
            body
              .trim()
              .split(/\s+/u)
              .map((v) => Number(v) & 255),
          )
          expect(bytes.length).toBe(Number(length))
          const little = bytes.readUInt32LE(0) / 4 === bytes.length
          if (!little) expect(bytes.readUInt32BE(0)).toBe(bytes.length)
          const changed = mutate(bytes, little)
          replaced = true
          return (
            prefix +
            ' ' +
            changed.length +
            ' [ ' +
            [...changed].map((v) => (v > 127 ? v - 256 : v)).join(' ') +
            ' ]'
          )
        },
      )
      expect(replaced).toBe(true)
      return result
    }
    const writeHeader = (bytes: Buffer, little: boolean, size: number, offset = 0): void => {
      if (little) bytes.writeUInt32LE(size * 4, offset)
      else bytes.writeUInt32BE(size, offset)
    }
    const setTree = async (name: string, tree: string, oid: number) => {
      await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
        tree,
        oid,
      ])
      await pg.exec('ALTER TABLE ' + name + ' SET(fillfactor=90)')
    }
    const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, t: typeof table, c: typeof constraint) =>
      checks.push({
        identity: { schema: 'public', kind: 'table', owner: t.name, constraint: name },
        expression: portableCheckAtoms(
          lowerTableCheck(t, c, [], [], 'stored', before.rangeTypes, before.compositeTypeGraph)!
            .expression,
        ),
      })
    const observe = async (name: string) => {
      for (const source of ['a', 'bb', null, 'a:0'])
        for (const bypass of [false, true]) {
          let state: string | undefined
          try {
            await pg.query('INSERT INTO vector_padding VALUES($1,$2)', [source, bypass])
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
                    ? { kind: 'False' }
                    : { kind: 'True' }
          fixtures.push({ name, row: { source: known(source), bypass: known(bypass) }, expected })
          references.push({ name, source, bypass, state })
        }
    }
    add('before', table, constraint)
    await observe('before')
    const padded = replaceDatum(saved.tree, arrayOid, (original, little) => {
      const read = (offset: number) =>
        little ? original.readInt32LE(offset) : original.readInt32BE(offset)
      expect(read(4)).toBe(1)
      expect(read(16)).toBe(1)
      const start = read(8) || 24,
        leafSize = little ? original.readUInt32LE(start) / 4 : original.readUInt32BE(start)
      expect(leafSize).toBe(13)
      expect(original.length - start - leafSize).toBeGreaterThan(0)
      const bytes = Buffer.from(original)
      writeHeader(bytes, little, leafSize + 1, start)
      return bytes
    })
    await setTree('vector_padding', padded, saved.oid)
    const after = await snapshotCatalog(pg),
      afterTable = after.tables.find((t) => t.name === 'vector_padding')!,
      afterCheck = afterTable.constraints[0]!
    expect(afterCheck.definition).toBe(constraint.definition)
    expect(constraint.tsvectorConstants?.containers?.[0]?.storage).toEqual([
      { nativeBytes: 13, lexemeCount: 1 },
    ])
    expect(afterCheck.tsvectorConstants?.containers?.[0]?.storage).toEqual([
      { nativeBytes: 14, lexemeCount: 1 },
    ])
    expect(diffCatalogs(before, after).modified.map((e) => e.entityId)).toContain(
      'public.vector_padding',
    )
    add('padded', afterTable, afterCheck)
    await observe('padded')
    const short = replaceDatum(saved.tree, arrayOid, (original, little) => {
      const start = 24,
        leafSize = little ? original.readUInt32LE(start) / 4 : original.readUInt32BE(start),
        leaf = original.subarray(start, start + leafSize),
        body = leaf.subarray(4),
        header = Buffer.from([little ? (body.length + 1) * 2 + 1 : 128 | (body.length + 1)])
      const bytes = Buffer.concat([original.subarray(0, start), header, body])
      writeHeader(bytes, little, bytes.length)
      return bytes
    })
    await setTree('vector_padding', short, saved.oid)
    const shorter = await snapshotCatalog(pg),
      shortTable = shorter.tables.find((t) => t.name === 'vector_padding')!,
      shortCheck = shortTable.constraints[0]!
    expect(shortCheck.tsvectorConstants).toEqual(constraint.tsvectorConstants)
    expect(diffCatalogs(before, shorter).modified).toEqual([])
    add('short', shortTable, shortCheck)
    await observe('short')
    for (const mode of [
      'missing',
      'stale',
      'duplicate',
      'wrong_count',
      'extra',
      'truncated',
      'invalid_size',
    ]) {
      const copy = structuredClone(afterCheck)
      if (mode === 'missing') delete copy.tsvectorConstants
      else if (copy.tsvectorConstants) {
        const context = copy.tsvectorConstants,
          entry = context.containers![0]!
        if (mode === 'stale') context.definition += ' '
        if (mode === 'duplicate') context.containers!.push(structuredClone(entry))
        if (mode === 'wrong_count') entry.storage![0]!.lexemeCount = 2
        if (mode === 'extra') entry.storage!.push({ nativeBytes: 13, lexemeCount: 1 })
        if (mode === 'truncated') entry.storage = []
        if (mode === 'invalid_size') entry.storage![0]!.nativeBytes = 8
      }
      add(mode, afterTable, copy)
      for (const bypass of [false, true])
        fixtures.push({
          name: mode,
          row: { source: known('a'), bypass: known(bypass) },
          expected: { kind: bypass ? 'True' : 'Unknown' },
        })
    }
    for (const recordMode of [false, true])
      for (const repeated of [false, true]) {
        const name = 'binary_' + recordMode + '_' + repeated,
          vector = repeated ? 'a:1A,2B' : 'a:1A'
        const value = recordMode
          ? '(' + literal(record(vector)) + '::vector_box).value'
          : '(' + literal(array(vector)) + '::tsvector[])[1]'
        await pg.exec(
          `CREATE TABLE ${name}(expected text,bypass bool,CONSTRAINT rendered CHECK(CASE WHEN bypass THEN true ELSE (${value})::text=expected END)) WITH(fillfactor=90)`,
        )
        const oid = recordMode
          ? (await pg.query<{ oid: number }>("SELECT 'vector_box'::regtype::oid oid")).rows[0]!.oid
          : arrayOid
        const original = (
          await pg.query<{ oid: number; tree: string }>(
            `SELECT oid,conbin::text tree FROM pg_constraint WHERE conrelid='${name}'::regclass`,
          )
        ).rows[0]!
        const changed = replaceDatum(original.tree, oid, (bytes, little) => {
          const start = recordMode ? bytes[22]! : 24,
            first = bytes[start]!,
            short = little ? (first & 1) !== 0 : (first & 128) !== 0
          const length = short
            ? little
              ? first >>> 1
              : first & 127
            : little
              ? bytes.readUInt32LE(start) / 4
              : bytes.readUInt32BE(start)
          const result = Buffer.from(bytes)
          result.fill(0, start + length - (repeated ? 4 : 2), start + length)
          return result
        })
        await setTree(name, changed, original.oid)
        const snapshot = await snapshotCatalog(pg),
          t = snapshot.tables.find((t) => t.name === name)!
        add(name, t, t.constraints[0]!)
        const correct = repeated ? "'a':0,0" : "'a':0"
        for (const expectedText of [correct, 'incorrect'])
          for (const bypass of [false, true]) {
            let state: string | undefined
            try {
              await pg.query(`INSERT INTO ${name} VALUES($1,$2)`, [expectedText, bypass])
            } catch (e) {
              state = (e as { code: string }).code
            }
            const expected: Outcome = { kind: state ? 'False' : 'True' }
            expect(state).toBe(bypass || expectedText === correct ? undefined : '23514')
            fixtures.push({
              name,
              row: { expected: known(expectedText), bypass: known(bypass) },
              expected,
            })
            references.push({ name, expectedText, bypass, state })
          }
      }
    const group = prepareCheckRustGroup(checks, {
      serverEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    await runCheckParity(
      root,
      'tsvectornativecontainers',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'native-storage-reference.json'),
      JSON.stringify(
        {
          nativeInserts: references.length,
          fixtures: fixtures.length,
          erasedPaddingDetected: true,
          shortHeaderEquivalent: true,
          references,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
