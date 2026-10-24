import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../src/catalog/diff.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/array-storage-active'
const known = (value: number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('restores stored array bitmap traits through arrays, domains and records without changing printed SQL or logical values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-array-stored-storage-'))
  try {
    await pg.exec(`CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION;
      CREATE DOMAIN state_values AS float8[];
      CREATE TYPE document_state AS(state float8[],document tsvector);
      CREATE TYPE state_group AS(items document_state[],tail int4);
      CREATE FUNCTION retained_state() RETURNS float8[] LANGUAGE plpgsql IMMUTABLE AS
        $$DECLARE values float8[]:=ARRAY[NULL::float8,2,3];BEGIN values[1]:=1;RETURN values;END$$;`)
    expect(
      (
        await pg.query<{ wire: string; printed: string }>(
          "SELECT encode(array_send(retained_state()),'hex') wire,retained_state()::text printed",
        )
      ).rows[0],
    ).toMatchObject({ printed: '{1,2,3}' })
    const retained = (
      await pg.query<{ wire: string }>("SELECT encode(array_send(retained_state()),'hex') wire")
    ).rows[0]!.wire
    expect(Buffer.from(retained, 'hex').readInt32BE(4)).toBe(1)
    await expect(pg.query('SELECT float8_avg(retained_state())')).rejects.toMatchObject({
      code: 'XX000',
    })
    expect((await pg.query("SELECT float8_avg('{1,2,3}'::float8[]) value")).rows).toEqual([
      { value: 2 },
    ])
    const quote = (value: string) =>
      '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
    const row = (...values: string[]) => '(' + values.map(quote).join(',') + ')'
    const leaf = row('{1,2,3}', 'a'),
      record = '$record$' + leaf + '$record$::public.document_state',
      nested = '$nested$' + row('{' + quote(leaf) + '}', '1') + '$nested$::public.state_group'
    const forms = Object.entries({
      direct: "'{1,2,3}'::float8[]",
      domain: "'{1,2,3}'::public.state_values",
      record: `(${record}).state`,
      nested: `((${nested}).items[1]).state`,
      nulls: "'{1,NULL,3}'::float8[]",
    }).map(([name, array]) => ({
      name,
      array,
      sql: `CASE WHEN bypass THEN true ELSE (float8_accum(${array},observation::float8))[1]>minimum::float8 END`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE stored_${f.name}(observation int4,minimum int4,bypass bool,CONSTRAINT state_check CHECK(${f.sql})) WITH(fillfactor=90)`,
      )
    const before = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (
      label: string,
      catalog: typeof before,
      form: (typeof forms)[number],
      origin: 'source' | 'stored' = 'stored',
      transform?: (c: (typeof before.tables)[number]['constraints'][number]) => void,
    ) => {
      const table = catalog.tables.find((t) => t.name === 'stored_' + form.name)!,
        constraint = structuredClone(table.constraints[0]!)
      if (origin === 'source') constraint.definition = `CHECK(${form.sql})`
      transform?.(constraint)
      plans.push({
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: label },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            constraint,
            [],
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      })
    }
    const observe = async (label: string, form: (typeof forms)[number]) => {
      for (const observation of [4, null])
        for (const minimum of [0, 3, null])
          for (const bypass of [false, true]) {
            let state: string | undefined
            try {
              await pg.query('INSERT INTO stored_' + form.name + ' VALUES($1,$2,$3)', [
                observation,
                minimum,
                bypass,
              ])
            } catch (e) {
              state = (e as { code: string }).code
            }
            const expected: Outcome =
              state === '23514'
                ? { kind: 'False' }
                : state
                  ? failure(state)
                  : bypass
                    ? { kind: 'True' }
                    : observation === null || minimum === null
                      ? { kind: 'Null' }
                      : { kind: 'True' }
            fixtures.push({
              name: label,
              row: {
                observation: known(observation),
                minimum: known(minimum),
                bypass: known(bypass),
              },
              expected,
            })
            references.push({ label, observation, minimum, bypass, state, expected })
          }
    }
    for (const f of forms) {
      add('before_' + f.name, before, f)
      await observe('before_' + f.name, f)
    }
    const floatOid = (await pg.query<{ oid: number }>("SELECT 'float8'::regtype::oid oid")).rows[0]!
      .oid
    const pad = (original: Buffer): Buffer => {
      const little = original.readUInt32LE(0) / 4 === original.length
      const read = (data: Buffer, offset: number) =>
        little ? data.readInt32LE(offset) : data.readInt32BE(offset)
      const write = (data: Buffer, value: number, offset: number) => {
        if (little) data.writeInt32LE(value, offset)
        else data.writeInt32BE(value, offset)
      }
      for (let start = 0; start + 24 < original.length; start++) {
        const short = little ? (original[start]! & 1) !== 0 : (original[start]! & 128) !== 0,
          size = short
            ? little
              ? original[start]! >>> 1
              : original[start]! & 127
            : read(original, start) / (little ? 4 : 1)
        if (size !== (short ? 45 : 48) || start + size > original.length) continue
        const bytes = short
          ? Buffer.concat([Buffer.alloc(4), original.subarray(start + 1, start + size)])
          : Buffer.from(original.subarray(start, start + size))
        if (
          read(bytes, 4) !== 1 ||
          read(bytes, 8) !== 0 ||
          read(bytes, 12) !== floatOid ||
          read(bytes, 16) !== 3 ||
          read(bytes, 20) !== 1
        )
          continue
        const bitmap = Buffer.alloc(8)
        bitmap[0] = 7
        const changed = Buffer.concat([bytes.subarray(0, 24), bitmap, bytes.subarray(24)])
        write(changed, changed.length * (little ? 4 : 1), 0)
        write(changed, 32, 8)
        const leaf = short
          ? Buffer.concat([
              Buffer.from([little ? (changed.length - 3) * 2 + 1 : (changed.length - 3) | 128]),
              changed.subarray(4),
            ])
          : changed
        const result = Buffer.concat([
          original.subarray(0, start),
          leaf,
          original.subarray(start + size),
        ])
        write(result, result.length * (little ? 4 : 1), 0)
        return result
      }
      throw new Error('Missing native float array')
    }
    for (const f of forms.filter((f) => ['direct', 'domain', 'record'].includes(f.name))) {
      const stored = (
        await pg.query<{ oid: number; tree: string }>(
          "SELECT oid,conbin::text tree FROM pg_constraint WHERE conrelid=$1::regclass AND conname='state_check'",
          ['stored_' + f.name],
        )
      ).rows[0]!
      let replaced = false
      const tree = stored.tree.replace(
        /(\{CONST\b(?=[^{}]*:constlen -1)(?=[^{}]*:constbyval false)[^{}]*:constvalue) (\d+) \[([^\]]*)\]/u,
        (_all, prefix: string, length: string, body: string) => {
          const bytes = Buffer.from(
            body
              .trim()
              .split(/\s+/u)
              .map((v) => Number(v) & 255),
          )
          expect(bytes.length).toBe(Number(length))
          const changed = pad(bytes)
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
      await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
        tree,
        stored.oid,
      ])
      await pg.exec('ALTER TABLE stored_' + f.name + ' SET(fillfactor=90)')
    }
    const after = await snapshotCatalog(pg)
    for (const f of forms.filter((f) => ['direct', 'domain', 'record'].includes(f.name))) {
      const old = before.tables.find((t) => t.name === 'stored_' + f.name)!.constraints[0]!,
        updated = after.tables.find((t) => t.name === 'stored_' + f.name)!.constraints[0]!
      expect(updated.definition).toBe(old.definition)
      expect(old.arrayConstants?.constants[0]?.storage?.[0]?.nullBitmap).toBe(false)
      expect(updated.arrayConstants?.constants[0]?.storage?.[0]?.nullBitmap).toBe(true)
      expect(diffCatalogs(before, after).modified.map((e) => e.entityId)).toContain(
        'public.stored_' + f.name,
      )
      add('padded_' + f.name, after, f)
      await observe('padded_' + f.name, f)
      add('source_' + f.name, after, f, 'source')
      for (const observation of [4, null])
        for (const bypass of [false, true])
          fixtures.push({
            name: 'source_' + f.name,
            row: { observation: known(observation), minimum: known(0), bypass: known(bypass) },
            expected: { kind: bypass ? 'True' : observation === null ? 'Null' : 'True' },
          })
    }
    const f = forms[0]!
    add(
      'nulls_missing',
      before,
      forms.find((f) => f.name === 'nulls')!,
      'stored',
      (c) => {
        delete c.arrayConstants
      },
    )
    for (const observation of [4, null])
      for (const bypass of [false, true])
        fixtures.push({
          name: 'nulls_missing',
          row: { observation: known(observation), minimum: known(0), bypass: known(bypass) },
          expected: bypass
            ? { kind: 'True' }
            : observation === null
              ? { kind: 'Null' }
              : failure('XX000'),
        })
    for (const mode of [
      'missing',
      'stale',
      'duplicate',
      'path',
      'dimensions',
      'elements',
      'extra',
      'invalid_path',
      'invalid_dimensions',
      'invalid_elements',
    ]) {
      add(mode, after, f, 'stored', (c) => {
        if (mode === 'missing') delete c.arrayConstants
        else {
          const context = c.arrayConstants!,
            entry = context.constants[0]!,
            storage = entry.storage![0]!
          if (mode === 'stale') context.definition += ' '
          if (mode === 'duplicate') context.constants.push(structuredClone(entry))
          if (mode === 'path') storage.path = '/0'
          if (mode === 'invalid_path') storage.path = '/00'
          if (mode === 'invalid_dimensions') storage.dimensions = -1
          if (mode === 'invalid_elements') storage.elements = -1
          if (mode === 'dimensions') storage.dimensions = 2
          if (mode === 'elements') storage.elements = 2
          if (mode === 'extra') entry.storage!.push({ ...storage, path: '/1' })
        }
      })
      for (const observation of [4, null])
        for (const bypass of [false, true])
          fixtures.push({
            name: mode,
            row: { observation: known(observation), minimum: known(0), bypass: known(bypass) },
            expected: { kind: bypass ? 'True' : observation === null ? 'Null' : 'Unknown' },
          })
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
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'reference.json'),
      JSON.stringify(
        {
          nativeInserts: references.length,
          fixtures: fixtures.length,
          checks: plans.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'arraystorage',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
