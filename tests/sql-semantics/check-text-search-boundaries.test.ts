import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { builtinCallables, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import {
  callableBoundary,
  textSearchValueRequirements,
} from '../../scripts/check-measurements/catalog.js'

it('classifies text-search configuration, dictionaries, parsers, query execution and internal interfaces with native state changes', async () => {
  const pg = await PGlite.create(),
    packet = 'artifacts/goal-checks/text-search-boundaries-active'
  try {
    await pg.exec(`CREATE TEXT SEARCH CONFIGURATION live_config(COPY=pg_catalog.simple);
      CREATE TABLE search_documents(value tsvector);
      INSERT INTO search_documents VALUES('rat:1');
      CREATE TABLE rewrite_rules(target tsquery,replacement tsquery);
      INSERT INTO rewrite_rules VALUES('rat','mouse');`)
    const functions = builtinCallables().filter(
        (item) => textSearchValueRequirements(item) !== null,
      ),
      stateful = functions.filter(
        (fn) => textSearchValueRequirements(fn)![0]!.setting === 'text_search_configuration',
      )
    expect(functions).toHaveLength(43)
    const configId = (await pg.query<{ id: number }>("SELECT 'live_config'::regconfig::oid id"))
      .rows[0]!.id
    const observe = async (configuration: 'simple' | 'english') => {
      await pg.query("SELECT set_config('default_text_search_config',$1,false)", [configuration])
      const values: Record<string, string> = {}
      for (const fn of stateful) {
        const dataArgs = fn.args[0] === 'pg_catalog.regconfig' ? fn.args.slice(1) : fn.args
        const args = fn.args[0] === 'pg_catalog.regconfig' ? ["'live_config'::regconfig"] : []
        for (const [index, type] of dataArgs.entries()) {
          if (type === 'pg_catalog.tsquery') args.push("'rat'::tsquery")
          else if (type === 'pg_catalog.text')
            args.push(
              fn.name === 'ts_headline'
                ? index === 0
                  ? "'rats'::text"
                  : "'HighlightAll=true'::text"
                : fn.name === 'to_tsquery'
                  ? "'rats & running'::text"
                  : "'rats running'::text",
            )
          else if (fn.name === 'json_to_tsvector' || fn.name === 'jsonb_to_tsvector')
            args.push(index === 0 ? `'["rats","running"]'::${type}` : `'["string"]'::jsonb`)
          else args.push(`'"rats"'::${type}`)
        }
        const call = `${fn.name}(${args.join(',')})`,
          sql = fn.returnsSet
            ? `SELECT json_agg(result)::text value FROM ${call} result`
            : `SELECT ${call}::text value`
        values[callableIdentity(fn)] = (await pg.query<{ value: string }>(sql)).rows[0]!.value
      }
      const raw = (
        await pg.query<{ document: string; query: string }>(
          "SELECT 'rats running'::tsvector::text document,'rats & running'::tsquery::text query",
        )
      ).rows[0]!
      return { values, raw }
    }
    const before = await observe('simple')
    await pg.exec(
      'ALTER TEXT SEARCH CONFIGURATION live_config ALTER MAPPING FOR asciiword WITH pg_catalog.english_stem',
    )
    const after = await observe('english')
    expect(
      (await pg.query<{ id: number }>("SELECT 'live_config'::regconfig::oid id")).rows[0]!.id,
    ).toBe(configId)
    expect(before.raw).toEqual(after.raw)
    expect(before.raw).toEqual({ document: "'rats' 'running'", query: "'rats' & 'running'" })
    for (const fn of stateful) {
      const id = callableIdentity(fn)
      expect(after.values[id], id).not.toBe(before.values[id])
      const requirements = textSearchValueRequirements(fn)!
      expect(requirements[0]).toMatchObject({
        kind: 'database',
        setting: 'text_search_configuration',
      })
      expect(requirements.some((r) => r.setting === 'default_text_search_config')).toBe(
        fn.args[0] !== 'pg_catalog.regconfig',
      )
    }
    const dictionaries = (
      await pg.query<{ simple: string[]; english: string[] }>(
        "SELECT ts_lexize('simple','rats') simple,ts_lexize('english_stem','rats') english",
      )
    ).rows[0]!
    expect(dictionaries).toEqual({ simple: ['rats'], english: ['rat'] })
    const parser = (
      await pg.query<{ id: number }>(
        "SELECT oid id FROM pg_ts_parser WHERE prsname='default' AND prsnamespace='pg_catalog'::regnamespace",
      )
    ).rows[0]!.id
    expect(
      (await pg.query('SELECT * FROM ts_parse($1::oid,$2::text)', [parser, 'rats running'])).rows,
    ).toEqual((await pg.query("SELECT * FROM ts_parse('default',$1::text)", ['rats running'])).rows)
    expect((await pg.query('SELECT * FROM ts_token_type($1::oid)', [parser])).rows).toEqual(
      (await pg.query("SELECT * FROM ts_token_type('default')")).rows,
    )
    await expect(
      pg.query("SELECT * FROM ts_parse('missing_search_parser','rats')"),
    ).rejects.toMatchObject({ code: '42704' })
    const statistics = () =>
        pg.query<{ word: string; ndoc: number; nentry: number }>(
          "SELECT * FROM ts_stat('SELECT value FROM search_documents')",
        ),
      rewritten = () =>
        pg.query<{ value: string }>(
          "SELECT ts_rewrite('rat'::tsquery,'SELECT target,replacement FROM rewrite_rules')::text value",
        )
    const oldStatistics = (await statistics()).rows,
      oldRewrite = (await rewritten()).rows
    expect(oldStatistics).toEqual([{ word: 'rat', ndoc: 1, nentry: 1 }])
    expect(oldRewrite).toEqual([{ value: "'mouse'" }])
    await pg.exec(
      "INSERT INTO search_documents VALUES('rat:1,2');UPDATE rewrite_rules SET replacement='cat'",
    )
    const newStatistics = (await statistics()).rows,
      newRewrite = (await rewritten()).rows
    expect(newStatistics).toEqual([{ word: 'rat', ndoc: 2, nentry: 3 }])
    expect(newRewrite).toEqual([{ value: "'cat'" }])
    const boundaries: unknown[] = []
    for (const fn of functions) {
      const requirements = textSearchValueRequirements(fn)!,
        boundary = callableBoundary(fn, new Set(fn.args.concat(fn.result)))
      expect(boundary.categories).not.toContain('pure-callable-candidate')
      for (const r of requirements)
        expect(boundary.categories).toContain(
          r.kind === 'session' ? `session-setting:${r.setting}` : `database-state:${r.setting}`,
        )
      expect(textSearchValueRequirements({ ...fn, schema: 'custom' })).toBeNull()
      expect(fn.strict).toBe(true)
      if (fn.args.length) {
        const call = `${fn.name}(${fn.args.map((type) => 'NULL::' + type).join(',')})`
        expect(
          (await pg.query(fn.returnsSet ? `SELECT * FROM ${call}` : `SELECT ${call}::text value`))
            .rows,
        ).toEqual(fn.returnsSet ? [] : [{ value: null }])
      }
      boundaries.push({ identity: callableIdentity(fn), requirements, boundary })
    }
    for (const name of [
      'tsvectorin',
      'tsvectorout',
      'tsvectorrecv',
      'tsqueryin',
      'tsqueryout',
      'tsqueryrecv',
    ]) {
      const fn = builtinCallables().find((fn) => fn.kind === 'function' && fn.name === name)!
      expect(textSearchValueRequirements(fn)).toBeNull()
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'internal-interface',
      )
    }
    for (const type of ['pg_catalog.tsvector', 'pg_catalog.tsquery']) {
      const send = builtinCallables().find(
        (fn) => callableIdentity(fn) === builtinTypeIO(type)!.send,
      )!
      expect(textSearchValueRequirements(send)).toMatchObject([
        { kind: 'session', setting: 'client_encoding' },
      ])
      expect(
        callableBoundary(send, new Set(send.args.concat(send.result))).categories,
      ).not.toContain('internal-interface')
    }
    const pureRewrite = builtinCallables().find(
      (fn) => fn.kind === 'function' && fn.name === 'ts_rewrite' && fn.args.length === 3,
    )!
    expect(textSearchValueRequirements(pureRewrite)).toBeNull()
    expect(
      callableBoundary(pureRewrite, new Set(pureRewrite.args.concat(pureRewrite.result)))
        .categories,
    ).toEqual(['pure-callable-candidate'])
    await mkdir(packet, { recursive: true })
    await writeFile(
      `${packet}/native.json`,
      JSON.stringify(
        {
          boundaries,
          before,
          after,
          dictionaries,
          oldStatistics,
          newStatistics,
          oldRewrite,
          newRewrite,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 60_000)
