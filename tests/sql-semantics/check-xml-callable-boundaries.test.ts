import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  builtinCallables,
  builtinMetadata,
  builtinTypeIO,
} from '../../src/postgres/builtins/inventory.js'
import { callableBoundary, xmlValueRequirements } from '../../scripts/check-measurements/catalog.js'
import { bindProbe } from '../../scripts/check-measurements/probes.js'
import { checkRustCallableNames } from '../../src/codegen/shared/check-rust-source.js'

it('classifies XML query, catalog, cursor and internal interfaces using native state changes', async () => {
  const pg = await PGlite.create(),
    packet = 'artifacts/goal-checks/xml-requirements-active'
  try {
    await pg.exec(
      "CREATE SCHEMA xml_export_scope; CREATE TABLE xml_export_scope.manifests(payload text); INSERT INTO xml_export_scope.manifests VALUES('first')",
    )
    const names = [
      'cursor_to_xml',
      'cursor_to_xmlschema',
      ...['query', 'table', 'schema', 'database'].flatMap((scope) => [
        scope + '_to_xml',
        scope + '_to_xmlschema',
        scope + '_to_xml_and_xmlschema',
      ]),
    ]
    const functions = builtinCallables().filter(
      (f) => f.kind === 'function' && f.schema === 'pg_catalog' && names.includes(f.name),
    )
    expect(functions).toHaveLength(14)
    const observe = async () => {
      const values: Record<string, string> = {}
      await pg.exec('BEGIN')
      try {
        for (const fn of functions) {
          const cursor = fn.name.startsWith('cursor_'),
            query = fn.name.startsWith('query_')
          const source = cursor
            ? "'xml_export_cursor'::refcursor"
            : query
              ? "'SELECT * FROM xml_export_scope.manifests ORDER BY payload'::text"
              : fn.name.startsWith('table_')
                ? "'xml_export_scope.manifests'::regclass"
                : fn.name.startsWith('schema_')
                  ? "'xml_export_scope'::name"
                  : null
          const args = [
            ...(source === null ? [] : [source]),
            ...(fn.name === 'cursor_to_xml' ? ['20'] : []),
            'false',
            'false',
            "'urn:manifest'",
          ]
          if (cursor)
            await pg.exec(
              'DECLARE xml_export_cursor CURSOR FOR SELECT * FROM xml_export_scope.manifests ORDER BY payload',
            )
          const sql = `SELECT ${fn.name}(${args.join(',')})::text value`
          values[fn.name] = (await pg.query<{ value: string }>(sql)).rows[0]!.value
          if (fn.name === 'cursor_to_xml')
            expect((await pg.query<{ value: string }>(sql)).rows[0]!.value).not.toBe(
              values[fn.name],
            )
          if (cursor) await pg.exec('CLOSE xml_export_cursor')
        }
      } finally {
        await pg.exec('ROLLBACK')
      }
      return values
    }
    const before = await observe()
    await pg.exec(
      "ALTER TABLE xml_export_scope.manifests ADD COLUMN note text; INSERT INTO xml_export_scope.manifests VALUES('second','added'); CREATE TABLE xml_export_scope.receipts(reference integer); CREATE SCHEMA xml_export_added; CREATE TABLE xml_export_added.releases(reference integer)",
    )
    const after = await observe()
    for (const fn of functions) {
      expect(after[fn.name], fn.name).not.toBe(before[fn.name])
      const context = fn.name.startsWith('cursor_')
        ? 'cursor'
        : fn.name.startsWith('query_')
          ? 'query'
          : 'catalog'
      const boundary = callableBoundary(fn, new Set(fn.args.concat(fn.result)))
      expect(boundary.categories).toContain(
        context === 'cursor' ? 'session-state:cursor' : 'database-state:' + context,
      )
      expect(xmlValueRequirements(fn)).toMatchObject([
        {
          kind: context === 'cursor' ? 'session' : 'database',
          setting: context,
          owner: 'tests/sql-semantics/check-xml-callable-boundaries.test.ts',
        },
      ])
      expect(xmlValueRequirements({ ...fn, schema: 'custom' })).toBeNull()
      expect(fn.strict).toBe(true)
      const typedNulls = fn.args.map((type) => 'NULL::' + type).join(',')
      expect(
        (await pg.query<{ value: string | null }>(`SELECT ${fn.name}(${typedNulls})::text value`))
          .rows[0]!.value,
      ).toBeNull()
      const nullProbe = bindProbe(`${fn.name}(${typedNulls}) IS NULL`, [])
      expect(nullProbe.preparation.kind).toBe('supported')
    }
    const io = builtinTypeIO('pg_catalog.xml')!
    for (const identity of [io.input, io.output, io.receive]) {
      const fn = builtinMetadata(identity!)
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'internal-interface',
      )
      expect(xmlValueRequirements(fn)).toBeNull()
    }
    const validate = builtinCallables().find(
      (f) => f.kind === 'function' && f.name === 'xmlvalidate',
    )!
    expect(xmlValueRequirements(validate)).toBeNull()
    const available = checkRustCallableNames()
    const xmlFunctions = builtinCallables().filter(
      (f) =>
        f.kind === 'function' &&
        f.schema === 'pg_catalog' &&
        (f.name.startsWith('xml') ||
          f.args.includes('pg_catalog.xml') ||
          f.result === 'pg_catalog.xml'),
    )
    const inventory = xmlFunctions.map((fn) => ({
      name: fn.name,
      args: fn.args,
      disposition: callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories.includes(
        'internal-interface',
      )
        ? 'internal-interface'
        : names.includes(fn.name)
          ? 'database-export'
          : fn.kind === 'function' && available.has(fn.rustName)
            ? 'implemented'
            : 'portable-gap',
      requirements: xmlValueRequirements(fn),
    }))
    expect(inventory).toHaveLength(32)
    expect(inventory.filter((f) => f.disposition === 'implemented')).toHaveLength(15)
    expect(
      inventory
        .filter((f) => f.disposition === 'portable-gap')
        .map((f) => f.name)
        .sort(),
    ).toEqual([])
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/inventory.json', JSON.stringify(inventory, null, 2) + '\n')
    await writeFile(
      packet + '/exporters.json',
      JSON.stringify(
        {
          functions: functions.map((f) => ({
            name: f.name,
            args: f.args,
            requirements: xmlValueRequirements(f),
            categories: callableBoundary(f, new Set(f.args.concat(f.result))).categories,
          })),
          before,
          after,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 60_000)
