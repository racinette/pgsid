import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const root = new URL('../../artifacts/check-shapes/', import.meta.url)
const worldsRoot = new URL('worlds/', root)

type Base = { name: string; sql: string; values: readonly string[] }
// Each list holds text input forms chosen for quoting, padding, rounding, sentinels and
// deployment-specific names; an entry may be invalid input, which only the text column reaches.
const bases: readonly Base[] = [
  { name: 'text', sql: 'text', values: ['a', '', 'é', 'a"b\\c', 'a,b (c)', ' sp '] },
  { name: 'varchar3', sql: 'varchar(3)', values: ['abc', 'ab ', 'abcd', 'é'] },
  { name: 'bpchar3', sql: 'char(3)', values: ['a', 'abc', 'ab ', 'abcd'] },
  { name: 'numeric4_1', sql: 'numeric(4,1)', values: ['0.05', '-0.0', '999.9', 'NaN', '1000'] },
  { name: 'int4', sql: 'int4', values: ['0', '-2147483648', '2147483647', '2147483648'] },
  {
    name: 'timestamptz',
    sql: 'timestamptz',
    values: ['2024-02-29 12:00+00', 'infinity', '-infinity', '2024-02-30 00:00+00'],
  },
  { name: 'bytea', sql: 'bytea', values: ['\\x00ff', '\\x', 'a\\\\b', '\\xf'] },
  { name: 'bool', sql: 'bool', values: ['t', 'f', 'maybe'] },
  { name: 'jsonb', sql: 'jsonb', values: ['{"a":[1,"x"]}', '[]', '"x"', 'null', '{'] },
  { name: 'label', sql: 'shape_label', values: ['low', 'high', 'other'] },
  { name: 'inet', sql: 'inet', values: ['10.0.0.1/8', '::1', '10.0.0.256'] },
  { name: 'regtype', sql: 'regtype', values: ['-', '0', 'int4', 'pgsid_missing_type'] },
]

type Shape = {
  id: string
  sql: string
  ddl: string[]
  values: string[]
  depth: number
}

const arrayElement = (text: string) => `"${text.replace(/["\\]/gu, (c) => '\\' + c)}"`
const rangeBound = arrayElement
const field = arrayElement
const sqlLiteral = (text: string) => `'${text.replaceAll("'", "''")}'`

let counter = 0
const constructors: Record<string, (inner: Shape) => Shape | null> = {
  domain: (inner) => {
    const name = `shape_${counter++}_d`
    // An inner domain already rejects its first value, so casting it again would make every outer
    // value fail; the outer domain constrains nullness instead.
    const check = inner.id.startsWith('domain(')
      ? 'VALUE IS NOT NULL'
      : `VALUE IS DISTINCT FROM ${sqlLiteral(inner.values[0]!)}::${inner.sql}`
    return {
      id: `domain(${inner.id})`,
      sql: name,
      ddl: [...inner.ddl, `CREATE DOMAIN ${name} AS ${inner.sql} CHECK (${check})`],
      values: inner.values,
      depth: inner.depth + 1,
    }
  },
  array: (inner) =>
    inner.id.startsWith('array(')
      ? null
      : {
          id: `array(${inner.id})`,
          sql: `${inner.sql}[]`,
          ddl: inner.ddl,
          values: [
            '{}',
            `{${arrayElement(inner.values[0]!)}}`,
            `{${arrayElement(inner.values[1] ?? inner.values[0]!)},NULL}`,
            `[2:3]={${inner.values.slice(0, 2).map(arrayElement).join(',')}}`,
          ],
          depth: inner.depth + 1,
        },
  range: (inner) => {
    const name = `shape_${counter++}_r`
    const [a, b = a] = inner.values
    return {
      id: `range(${inner.id})`,
      sql: name,
      ddl: [...inner.ddl, `CREATE TYPE ${name} AS RANGE (subtype = ${inner.sql})`],
      values: [
        'empty',
        '(,)',
        `[${rangeBound(a!)},${rangeBound(b!)})`,
        `[${rangeBound(b!)},${rangeBound(a!)}]`,
        `(${rangeBound(a!)},)`,
      ],
      depth: inner.depth + 1,
    }
  },
  composite: (inner) => {
    const name = `shape_${counter++}_c`
    const [a, b = a] = inner.values
    return {
      id: `composite(${inner.id})`,
      sql: name,
      ddl: [...inner.ddl, `CREATE TYPE ${name} AS (f ${inner.sql}, n int4)`],
      values: [`(${field(a!)},1)`, '(,2)', `(${field(b!)},)`],
      depth: inner.depth + 1,
    }
  },
}

const templates = {
  constant: (shape: Shape, constant: string) =>
    `CASE WHEN bypass THEN true ELSE col IS DISTINCT FROM ${sqlLiteral(constant)}::${shape.sql} END`,
  input: (shape: Shape) =>
    `CASE WHEN bypass THEN true ELSE p::${shape.sql} IS NOT DISTINCT FROM col END`,
  output: () => `CASE WHEN bypass THEN true ELSE col::text IS NOT DISTINCT FROM expected END`,
} as const

// The world runner converts array cells only for these bases; other array shapes are recorded as
// harness gaps instead of reaching the runner.
const runnerArrayBases = new Set([
  'text',
  'varchar3',
  'numeric4_1',
  'int4',
  'bool',
  'jsonb',
  'label',
])
const baseOf = (id: string) => /([a-z0-9_]+)\)*$/u.exec(id)![1]!

type Probe = { text: string; output: string | null; error?: string }

// A failed statement aborts the probe transaction, so each attempt runs in its own savepoint.
async function attempt<T>(pg: PGlite, run: () => Promise<T>): Promise<T | { failed: string }> {
  await pg.exec('SAVEPOINT shape_attempt')
  try {
    const result = await run()
    await pg.exec('RELEASE SAVEPOINT shape_attempt')
    return result
  } catch (e) {
    await pg.exec('ROLLBACK TO SAVEPOINT shape_attempt')
    return { failed: (e as { code?: string }).code ?? 'unknown' }
  }
}

async function probeShape(pg: PGlite, shape: Shape) {
  await pg.exec('BEGIN')
  try {
    for (const statement of shape.ddl) await pg.exec(statement)
    const probes: Probe[] = []
    for (const text of shape.values) {
      const row = await attempt(
        pg,
        async () =>
          (
            await pg.query<{ output: string | null }>(
              `SELECT ($1::text)::${shape.sql}::text output`,
              [text],
            )
          ).rows[0]!,
      )
      probes.push('failed' in row ? { text, output: null, error: row.failed } : { text, ...row })
    }
    const accepted: string[] = []
    const constant = probes.find((p) => !p.error)?.text
    // A NOT NULL domain rejects a NULL cell, and the runner must construct every row value.
    const nullable = !('failed' in (await attempt(pg, () => pg.query(`SELECT NULL::${shape.sql}`))))
    for (const [name, template] of Object.entries(templates)) {
      if (name === 'constant' && constant === undefined) continue
      // PostgreSQL can reject a template for a shape, such as one without an equality operator.
      const created = await attempt(pg, async () => {
        await pg.exec(
          `CREATE TEMP TABLE shape_probe(col ${shape.sql},p text,expected text,bypass bool,CHECK(${template(shape, constant!)}))`,
        )
        await pg.exec('DROP TABLE shape_probe')
        return true
      })
      if (created === true) accepted.push(name)
    }
    return { probes, accepted, constant, nullable }
  } catch (e) {
    return { rejected: (e as { code?: string; message?: string }).message ?? 'rejected' }
  } finally {
    await pg.exec('ROLLBACK')
  }
}

async function generate() {
  const level0: Shape[] = bases.map((base) => ({
    id: base.name,
    sql: base.sql,
    ddl: [],
    values: [...base.values],
    depth: 0,
  }))
  const level1 = level0.flatMap((shape) =>
    Object.values(constructors).flatMap((make) => make(shape) ?? []),
  )
  const level2 = level1.flatMap((shape) =>
    Object.values(constructors).flatMap((make) => make(shape) ?? []),
  )
  const shapes = [...level0, ...level1, ...level2]
  const pg = await PGlite.create()
  const manifest: unknown[] = []
  const tables: { world: number; ddl: string[]; table: string; seeds: string[] }[] = []
  try {
    await pg.exec("SET TimeZone='UTC'; CREATE TYPE shape_label AS ENUM ('low','high')")
    for (const [index, shape] of shapes.entries()) {
      if (shape.id.includes('array(') && !runnerArrayBases.has(baseOf(shape.id))) {
        manifest.push({ index, id: shape.id, depth: shape.depth, harnessGap: 'array cells' })
        continue
      }
      const probe = await probeShape(pg, shape)
      manifest.push({ index, id: shape.id, depth: shape.depth, ...probe })
      if ('rejected' in probe) continue
      for (const name of probe.accepted) {
        const table = `shape_${index}_${name}`
        const sql =
          name === 'constant'
            ? templates.constant(shape, probe.constant!)
            : templates[name as 'input' | 'output'](shape)
        const seeds: string[] = []
        const insert = (label: string, col: string, p: string, expected: string, bypass: boolean) =>
          seeds.push(
            `-- name: ${table}_${label}\nINSERT INTO ${table}(col,p,expected,bypass) VALUES (${col},${p},${expected},${bypass});`,
          )
        const empty =
          probe.nullable || probe.constant === undefined
            ? 'NULL'
            : `${sqlLiteral(probe.constant)}::${shape.sql}`
        for (const [i, value] of probe.probes.entries()) {
          const text = sqlLiteral(value.text)
          if (value.error) insert(`invalid_${i}`, empty, text, 'NULL', false)
          else {
            const col = `${text}::${shape.sql}`
            insert(`value_${i}`, col, text, sqlLiteral(value.output ?? ''), false)
            insert(`wrong_${i}`, col, text, sqlLiteral('!'), false)
            insert(`absent_${i}`, empty, text, 'NULL', false)
          }
        }
        insert('bypass', empty, sqlLiteral('!'), 'NULL', true)
        tables.push({
          world: Math.floor(index / 20),
          ddl: shape.ddl,
          table: `CREATE TABLE ${table} (col ${shape.sql}, p text, expected text, bypass bool, CONSTRAINT ${name}_shape CHECK (${sql}));`,
          seeds,
        })
      }
    }
  } finally {
    await pg.close()
  }
  await rm(worldsRoot, { recursive: true, force: true })
  const worlds = [...new Set(tables.map((t) => t.world))]
  for (const world of worlds) {
    const members = tables.filter((t) => t.world === world)
    const directory = new URL(`shapes_${String(world).padStart(3, '0')}/`, worldsRoot)
    await mkdir(directory, { recursive: true })
    const ddl = [...new Set(members.flatMap((t) => t.ddl))]
    await writeFile(
      new URL('schema.sql', directory),
      [
        '-- Generated by scripts/check-measurements/shapes.ts; do not edit.',
        "CREATE TYPE shape_label AS ENUM ('low','high');",
        ...ddl.map((statement) => statement + ';'),
        ...members.map((t) => t.table),
        '',
      ].join('\n'),
    )
    await writeFile(new URL('data.sql', directory), '')
    await writeFile(
      new URL('check-seed.sql', directory),
      members.flatMap((t) => t.seeds).join('\n') + '\n',
    )
  }
  await writeFile(new URL('shapes.json', root), JSON.stringify(manifest, null, 2) + '\n')
  const rejected = manifest.filter((m) => 'rejected' in (m as object)).length
  const gaps = manifest.filter((m) => 'harnessGap' in (m as object)).length
  console.info(
    `${shapes.length} shapes (${rejected} rejected by PostgreSQL, ${gaps} beyond the runner), ${tables.length} tables in ${worlds.length} worlds`,
  )
}

async function summarize() {
  const report = JSON.parse(await readFile(new URL('report/report.json', root), 'utf8')) as {
    constraints: {
      constraint: string
      true: number
      false: number
      null: number
      error: number
      unknown: number
    }[]
  }
  const manifest = JSON.parse(await readFile(new URL('shapes.json', root), 'utf8')) as {
    index: number
    id: string
  }[]
  const rows = report.constraints.flatMap((c) => {
    const match = /\.shape_(\d+)_(\w+)\.\w+$/u.exec(c.constraint)
    if (!match) return []
    const shape = manifest.find((m) => m.index === Number(match[1]))!
    const definite = c.true + c.false + c.null + c.error
    return [{ shape: shape.id, template: match[2]!, definite, unknown: c.unknown }]
  })
  await writeFile(new URL('summary.json', root), JSON.stringify(rows, null, 2) + '\n')
  const byTemplate = new Map<string, { shapes: number; allDefinite: number; unknown: number }>()
  for (const row of rows) {
    const entry = byTemplate.get(row.template) ?? { shapes: 0, allDefinite: 0, unknown: 0 }
    entry.shapes++
    if (row.unknown === 0) entry.allDefinite++
    entry.unknown += row.unknown
    byTemplate.set(row.template, entry)
  }
  console.table(Object.fromEntries(byTemplate))
}

await (process.argv.includes('--summarize') ? summarize() : generate())
