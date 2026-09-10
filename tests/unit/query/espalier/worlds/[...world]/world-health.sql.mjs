import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { parse } from 'libpg-query'

export const aggregate = true
export const targets = ['*/*.sql']

export const rule = `Keep the isolated-world corpus structurally healthy as a
whole. Each world must meet the table, constraint, key, and live-schema floors;
the complete corpus must keep its query-shape proportions and composition
ratchets, with one surplus composition unit per additional world. Report every
current measure even when the corpus passes. These are collective constraints:
no individual fixture is required to carry every shape.`

// This fixed baseline makes corpus growth a function of world count. The
// monotonic floors below move when the corpus improves; this baseline does not.
const COMPOSITION_BASELINE = {
  additivity: 2,
  chaining: 2,
  generatedOverConstrained: 1,
  joinChains: 3,
  maxJoinDepth: 3,
}

// These are historical floors, not observations recomputed from the engine.
// Raise them when the corpus improves. Lower one only when the corresponding
// loss is deliberate and explained in the commit that changes this rule.
const RATCHET = { ...COMPOSITION_BASELINE }

const COMPOSITION_GROWTH_PER_ADDITIONAL_WORLD = 1

const MODIFYING = new Set(['InsertStmt', 'UpdateStmt', 'DeleteStmt', 'MergeStmt'])

function tagged(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const keys = Object.keys(value)
  const key = keys[0]
  if (keys.length !== 1 || key === undefined || !/^[A-Z]/.test(key)) return null
  return [key, value[key]]
}

function fields(value) {
  const node = tagged(value)
  return Object.values(node ? node[1] : value)
}

function collect(value, type, out) {
  if (Array.isArray(value)) {
    for (const child of value) collect(child, type, out)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = tagged(value)
  if (node && node[0] === type) out.push(node[1])
  for (const child of fields(value)) collect(child, type, out)
}

function maximumJoinDepth(value, depth = 0) {
  if (Array.isArray(value)) {
    return value.reduce(
      (maximum, child) => Math.max(maximum, maximumJoinDepth(child, depth)),
      depth,
    )
  }
  if (!value || typeof value !== 'object') return depth
  const node = tagged(value)
  const next = node && node[0] === 'JoinExpr' ? depth + 1 : depth
  return fields(value).reduce(
    (maximum, child) => Math.max(maximum, maximumJoinDepth(child, next)),
    next,
  )
}

function hasNullLiteral(value) {
  const constants = []
  collect(value, 'A_Const', constants)
  return constants.some((constant) => constant.isnull === true)
}

function hasNullTest(value) {
  const tests = []
  collect(value, 'NullTest', tests)
  return tests.length > 0
}

function qualifyingParams(value, out, live = false) {
  if (Array.isArray(value)) {
    for (const child of value) qualifyingParams(child, out, live)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = tagged(value)
  if (node && node[0] === 'ParamRef') {
    if (live) out.add(Number(node[1].number ?? 0))
    return
  }
  const [type, body] = node ?? [null, value]
  const isUpdate = type === 'UpdateStmt'
  const isMerge = type === 'MergeStmt'
  for (const [key, child] of Object.entries(body)) {
    if (key === 'limitCount' || key === 'limitOffset') continue
    const opens =
      key === 'whereClause' ||
      key === 'quals' ||
      key === 'havingClause' ||
      key === 'valuesLists' ||
      key === 'mergeWhenClauses' ||
      key === 'args' ||
      ((isUpdate || isMerge) && key === 'targetList')
    qualifyingParams(child, out, live || opens)
  }
}

function joinChains(value, out, current = []) {
  if (Array.isArray(value)) {
    for (const child of value) joinChains(child, out, current)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = tagged(value)
  if (node && node[0] === 'JoinExpr') {
    const next = [...current, String(node[1].jointype ?? 'JOIN_INNER')]
    if (next.length > 1) out.add(next.join(' > '))
    joinChains(node[1].larg, out, next)
    joinChains(node[1].rarg, out, next)
    joinChains(node[1].quals, out, [])
    return
  }
  for (const child of fields(value)) joinChains(child, out, current)
}

async function parseSql(sql) {
  if (sql.length === 0) return { version: 0, stmts: [] }
  return parse(sql)
}

const STATS_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname = 'public'),
keyed AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum
  FROM pg_constraint c JOIN tabs t ON t.oid = c.conrelid
  WHERE c.contype IN ('p','f','u')),
cols AS (
  SELECT t.oid AS relid, t.relname, a.attname, a.attnotnull, a.attnum,
         (k.attnum IS NOT NULL) AS is_key, a.attgenerated <> '' AS generated
  FROM tabs t
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN keyed k ON k.conrelid = t.oid AND k.attnum = a.attnum),
chk AS (
  SELECT c.oid, c.conrelid, c.conkey, coalesce(array_length(c.conkey,1),0) AS arity
  FROM pg_constraint c JOIN tabs t ON t.oid = c.conrelid WHERE c.contype = 'c'),
chkcol AS (SELECT conrelid, oid, unnest(conkey) AS attnum FROM chk)
SELECT
  (SELECT count(*) FROM tabs)                                        AS tables,
  (SELECT count(*) FROM cols WHERE NOT is_key)                       AS nonkey,
  (SELECT count(*) FROM cols WHERE NOT is_key AND attnotnull)        AS nonkey_notnull,
  (SELECT count(*) FROM chk)                                         AS checks,
  (SELECT coalesce(sum(arity),0) FROM chk)                           AS arity_total,
  (SELECT count(*) FROM cols WHERE generated)                        AS generated,
  (SELECT count(*) FROM pg_constraint c JOIN tabs t ON t.oid=c.conrelid
     WHERE c.contype='f')                                            AS fks,
  (SELECT count(*) FROM pg_constraint c
     JOIN tabs t ON t.oid = c.conrelid
     JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum = ANY(c.conkey)
     WHERE c.contype='f' AND a.attnotnull)                           AS fk_notnull,
  (SELECT count(*) FROM (
     SELECT conrelid, attnum FROM chkcol GROUP BY 1,2 HAVING count(*) >= 2) s)
                                                                     AS additivity,
  (SELECT count(*) FROM chk a JOIN chk b
     ON a.conrelid = b.conrelid AND a.oid < b.oid
     AND a.conkey && b.conkey AND NOT (a.conkey @> b.conkey AND b.conkey @> a.conkey))
                                                                     AS chaining
`

const JOIN_ONLY_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname='public'),
keyed AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum FROM pg_constraint c
  WHERE c.contype IN ('p','f','u'))
SELECT t.relname,
       count(*) FILTER (WHERE k.attnum IS NULL) AS nonkey,
       bool_and(k.attnum IS NOT NULL)           AS join_only,
       EXISTS (SELECT 1 FROM pg_constraint c
               WHERE c.conrelid = t.oid AND c.contype='c') AS has_check
FROM tabs t
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN keyed k ON k.conrelid=t.oid AND k.attnum=a.attnum
GROUP BY t.oid, t.relname ORDER BY t.relname`

const CHECK_EXPR_SQL = `
SELECT pg_get_expr(c.conbin, c.conrelid) AS expr
FROM pg_constraint c
JOIN pg_class r ON r.oid = c.conrelid
JOIN pg_namespace n ON n.oid = r.relnamespace
WHERE c.contype = 'c' AND n.nspname = 'public'`

const GENERATED_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid=r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname='public'),
cc AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum
  FROM pg_constraint c JOIN tabs t ON t.oid=c.conrelid WHERE c.contype='c')
SELECT t.relname, a.attname, pg_get_expr(d.adbin, d.adrelid) AS expr,
       EXISTS (SELECT 1 FROM cc JOIN pg_attribute a2
               ON a2.attrelid=cc.conrelid AND a2.attnum=cc.attnum
               WHERE cc.conrelid=t.oid
                 AND pg_get_expr(d.adbin, d.adrelid) LIKE '%'||a2.attname||'%')
       AS reads_checked
FROM tabs t
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attgenerated <> '' ORDER BY t.relname, a.attname`

async function parseExpression(expression) {
  try {
    const parsed = await parseSql(`SELECT ${expression}`)
    const select = tagged(parsed.stmts?.[0]?.stmt)
    const target = tagged(select?.[1].targetList?.[0])
    return target?.[1].val ?? null
  } catch {
    return null
  }
}

function emptyStats(name, schemaPath) {
  return {
    name,
    schemaPath,
    tables: 0,
    nonKeyCols: 0,
    nonKeyNotNull: 0,
    checks: 0,
    checkArityTotal: 0,
    generated: 0,
    fks: 0,
    fkNotNull: 0,
    additivity: 0,
    chaining: 0,
    generatedOverConstrained: 0,
    checkNullLiteral: 0,
    checkNullTest: 0,
    generatedNullLiteral: 0,
    statements: 0,
    modifying: 0,
    parametrized: 0,
    paramTotal: 0,
    dmlKinds: new Map(),
    violations: [],
  }
}

async function measureWorld(name, paths, read, chains, depth) {
  const schemaPath = paths.find((path) => path.endsWith('/schema.sql'))
  const stats = emptyStats(name, schemaPath ?? `worlds/${name}/`)
  const violation = (message, path = stats.schemaPath) => stats.violations.push({ path, message })

  if (schemaPath === undefined) {
    violation('has no schema.sql — a world owns its schema')
    return stats
  }

  const pg = await PGlite.create({ extensions: { plpgsql_check } })
  try {
    await pg.exec('CREATE EXTENSION plpgsql_check;')
    try {
      await pg.exec(await read(schemaPath))
    } catch (error) {
      violation(`schema.sql does not apply — ${error.message}`)
      return stats
    }

    const [catalog] = (await pg.query(STATS_SQL)).rows
    if (!catalog) {
      violation('produced no catalog statistics — check that schema.sql applies')
      return stats
    }
    const perTable = (await pg.query(JOIN_ONLY_SQL)).rows
    const generatedColumns = (await pg.query(GENERATED_SQL)).rows
    const checkExpressions = (await pg.query(CHECK_EXPR_SQL)).rows

    let checkNullLiteral = 0
    let checkNullTest = 0
    for (const { expr } of checkExpressions) {
      const expression = await parseExpression(expr)
      if (expression === null) continue
      if (hasNullLiteral(expression)) checkNullLiteral++
      if (hasNullTest(expression)) checkNullTest++
    }

    let generatedNullLiteral = 0
    for (const { expr } of generatedColumns) {
      const expression = await parseExpression(expr)
      if (expression !== null && hasNullLiteral(expression)) generatedNullLiteral++
    }

    const fixturePaths = paths.filter(
      (path) => !path.endsWith('/schema.sql') && !path.endsWith('/data.sql'),
    )
    if (fixturePaths.length === 0) {
      violation('has no fixtures — a world with no questions is dead schema')
    }

    const referenced = new Set()
    const columnRefs = new Set()
    let anyStar = false
    let statements = 0
    let modifying = 0
    let parametrized = 0
    let paramTotal = 0
    const dmlKinds = new Map()

    for (const fixturePath of fixturePaths) {
      let parsed
      try {
        parsed = await parseSql(await read(fixturePath))
      } catch (error) {
        violation(`${fixturePath.split('/').at(-1)} does not parse — ${error.message}`, fixturePath)
        continue
      }
      for (const statement of parsed.stmts ?? []) {
        if (!statement.stmt) continue
        const relations = []
        collect(statement.stmt, 'RangeVar', relations)
        for (const relation of relations) {
          if (typeof relation.relname === 'string') referenced.add(relation.relname)
        }

        const columns = []
        collect(statement.stmt, 'ColumnRef', columns)
        for (const column of columns) {
          for (const part of column.fields ?? []) {
            const node = tagged(part)
            if (node && node[0] === 'String' && typeof node[1].sval === 'string') {
              columnRefs.add(node[1].sval)
            }
            if (node && node[0] === 'A_Star') anyStar = true
          }
        }

        joinChains(statement.stmt, chains)
        depth.max = Math.max(depth.max, maximumJoinDepth(statement.stmt))
        statements++

        const kinds = new Set()
        for (const kind of MODIFYING) {
          const found = []
          collect(statement.stmt, kind, found)
          if (found.length > 0) kinds.add(kind)
        }
        if (kinds.size > 0) {
          modifying++
          for (const kind of kinds) dmlKinds.set(kind, (dmlKinds.get(kind) ?? 0) + 1)
        }

        const params = new Set()
        qualifyingParams(statement.stmt, params)
        if (params.size > 0) {
          parametrized++
          paramTotal += params.size
        }
      }
    }

    if (Number(catalog.tables) < 3) {
      violation(`has ${catalog.tables} table(s); at least 3 are required`)
    }
    for (const table of perTable) {
      if (!referenced.has(table.relname)) {
        violation(`table ${table.relname} is never referenced by a fixture in this world`)
      }
      if (table.join_only) continue
      if (Number(table.nonkey) < 3) {
        violation(
          `table ${table.relname} has ${table.nonkey} non-key column(s); 3 are required unless it exists only to join`,
        )
      } else if (!table.has_check) {
        violation(`table ${table.relname} has ${table.nonkey} non-key columns and no CHECK`)
      }
    }

    const requiredChecks = Math.ceil(Number(catalog.nonkey) / 3)
    if (Number(catalog.checks) < requiredChecks) {
      violation(
        `${catalog.checks} CHECK(s) for ${catalog.nonkey} non-key columns; ${requiredChecks} required (one per three)`,
      )
    }
    if (Number(catalog.checks) > 0) {
      const average = Number(catalog.arity_total) / Number(catalog.checks)
      if (average < 2) {
        violation(`CHECKs average ${average.toFixed(2)} columns; at least 2 required`)
      }
    }

    const notNullShare =
      Number(catalog.nonkey) === 0 ? 0 : Number(catalog.nonkey_notnull) / Number(catalog.nonkey)
    if (Number(catalog.nonkey) > 0 && (notNullShare < 0.25 || notNullShare > 0.75)) {
      violation(
        `${(notNullShare * 100).toFixed(0)}% of non-key columns are NOT NULL; the band is 25–75%`,
      )
    }

    if (Number(catalog.fks) < 1) violation('declares no foreign key')
    else if (Number(catalog.fk_notnull) < 1) {
      violation('has foreign keys but none is NOT NULL')
    }

    for (const column of generatedColumns) {
      if (!columnRefs.has(column.attname) && !anyStar) {
        violation(
          `generated column ${column.relname}.${column.attname} is never read by a fixture in this world`,
        )
      }
    }

    return {
      ...stats,
      tables: Number(catalog.tables),
      nonKeyCols: Number(catalog.nonkey),
      nonKeyNotNull: Number(catalog.nonkey_notnull),
      checks: Number(catalog.checks),
      checkArityTotal: Number(catalog.arity_total),
      generated: Number(catalog.generated),
      fks: Number(catalog.fks),
      fkNotNull: Number(catalog.fk_notnull),
      additivity: Number(catalog.additivity),
      chaining: Number(catalog.chaining),
      generatedOverConstrained: generatedColumns.filter((column) => column.reads_checked).length,
      checkNullLiteral,
      checkNullTest,
      generatedNullLiteral,
      statements,
      modifying,
      parametrized,
      paramTotal,
      dmlKinds,
    }
  } finally {
    if (!pg.closed) await pg.close()
  }
}

function ratiosFor(worlds) {
  const sum = (pick) => worlds.reduce((total, world) => total + pick(world), 0)
  const statements = sum((world) => world.statements)
  const modifying = sum((world) => world.modifying)
  const checks = sum((world) => world.checks)
  const generated = sum((world) => world.generated)
  const kind = (name) => sum((world) => world.dmlKinds.get(name) ?? 0)
  return [
    {
      key: 'modifying',
      label: 'statements that modify (root or in a CTE)',
      n: modifying,
      d: statements,
      unit: 'statements',
      floor: 0.2,
    },
    {
      key: 'parameters',
      label: 'statements with a qualifying parameter',
      n: sum((world) => world.parametrized),
      d: statements,
      unit: 'statements',
      floor: 0.4,
      ceiling: 0.7,
    },
    {
      key: 'INSERT',
      label: 'modifying statements that INSERT',
      n: kind('InsertStmt'),
      d: modifying,
      unit: 'modifying statements',
      floor: 0.2,
    },
    {
      key: 'UPDATE',
      label: 'modifying statements that UPDATE',
      n: kind('UpdateStmt'),
      d: modifying,
      unit: 'modifying statements',
      floor: 0.2,
    },
    {
      key: 'MERGE',
      label: 'modifying statements that MERGE',
      n: kind('MergeStmt'),
      d: modifying,
      unit: 'modifying statements',
      floor: 0.2,
    },
    {
      key: 'DELETE',
      label: 'modifying statements that DELETE',
      n: kind('DeleteStmt'),
      d: modifying,
      unit: 'modifying statements',
      floor: 0.05,
    },
    {
      key: 'CHECK-null-test',
      label: 'CHECKs carrying a null test',
      n: sum((world) => world.checkNullTest),
      d: checks,
      unit: 'CHECKs',
      floor: 0.5,
    },
    {
      key: 'CHECK-literal-NULL',
      label: 'CHECKs carrying a literal NULL',
      n: sum((world) => world.checkNullLiteral),
      d: checks,
      unit: 'CHECKs',
      floor: 0.1,
    },
    {
      key: 'generated-literal-NULL',
      label: 'generation expressions carrying a literal NULL',
      n: sum((world) => world.generatedNullLiteral),
      d: generated,
      unit: 'generated columns',
      floor: 0.3,
    },
  ]
}

function bindsAt(floor) {
  return Math.ceil(1 / floor)
}

function percent(value) {
  return `${(100 * value).toFixed(0)}%`
}

function ratioReport(ratio) {
  const share = ratio.d === 0 ? 'n/a' : percent(ratio.n / ratio.d)
  const bounds =
    ratio.ceiling === undefined
      ? `floor ${percent(ratio.floor)}`
      : `band ${percent(ratio.floor)}–${percent(ratio.ceiling)}`
  const status = ratio.d < bindsAt(ratio.floor) ? `dormant until ${bindsAt(ratio.floor)}` : bounds
  return `${ratio.key} ${ratio.n}/${ratio.d}=${share} (${status})`
}

function compositionSurplus(current) {
  return Object.entries(COMPOSITION_BASELINE).reduce(
    (total, [name, baseline]) => total + Math.max(0, current[name] - baseline),
    0,
  )
}

export async function inspectWorlds(matches, read) {
  const pathsByWorld = new Map()
  for (const { path } of matches) {
    const parts = path.split('/')
    if (parts.length !== 3 || parts[0] !== 'worlds') continue
    const paths = pathsByWorld.get(parts[1]) ?? []
    paths.push(path)
    pathsByWorld.set(parts[1], paths)
  }

  const chains = new Set()
  const depth = { max: 0 }
  const worlds = []
  for (const [name, paths] of [...pathsByWorld].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    worlds.push(await measureWorld(name, paths.sort(), read, chains, depth))
  }

  const sum = (pick) => worlds.reduce((total, world) => total + pick(world), 0)
  return {
    worlds,
    ratios: ratiosFor(worlds),
    chains,
    current: {
      additivity: sum((world) => world.additivity),
      chaining: sum((world) => world.chaining),
      generatedOverConstrained: sum((world) => world.generatedOverConstrained),
      joinChains: chains.size,
      maxJoinDepth: depth.max,
    },
  }
}

export async function lint({ matches, read, emit }) {
  const measured = await inspectWorlds(matches, read)

  if (measured.worlds.length === 0) {
    emit({
      code: 'world_corpus_empty',
      message: 'the isolated-world corpus contains no worlds',
    })
    return
  }

  const total = (pick) => measured.worlds.reduce((sum, world) => sum + pick(world), 0)
  const parametrized = total((world) => world.parametrized)
  const parameterTotal = total((world) => world.paramTotal)
  const parameterAverage = parametrized === 0 ? 0 : parameterTotal / parametrized
  const tables = total((world) => world.tables)
  const generated = total((world) => world.generated)
  const requiredGenerated = Math.floor(tables / 5)
  const surplus = compositionSurplus(measured.current)
  const requiredSurplus =
    COMPOSITION_GROWTH_PER_ADDITIONAL_WORLD * Math.max(0, measured.worlds.length - 1)

  emit({
    code: 'world_health',
    severity: 'info',
    message:
      `${measured.worlds.length} ${measured.worlds.length === 1 ? 'world' : 'worlds'}, ` +
      `${tables} tables, ${total((world) => world.statements)} statements. ` +
      `Parameters average ${parameterAverage.toFixed(2)} over ${parametrized} parametrized ` +
      `statements. Generated columns: ${generated}/${tables} tables, ${requiredGenerated} ` +
      `required.`,
    metadata: {
      worlds: measured.worlds.length,
      tables,
      statements: total((world) => world.statements),
      parameterAverage,
      parametrized,
      parameterTotal,
      generated,
      requiredGenerated,
    },
  })

  emit({
    code: 'world_health_ratios',
    severity: 'info',
    message: measured.ratios.map(ratioReport).join('; '),
    metadata: { ratios: measured.ratios },
  })

  emit({
    code: 'world_health_composition',
    severity: 'info',
    message: `${Object.entries(measured.current)
      .map(([name, value]) => `${name}=${value} (floor ${RATCHET[name]})`)
      .join(', ')}; growth surplus ${surplus}/${requiredSurplus} required.`,
    metadata: {
      composition: measured.current,
      compositionBaseline: COMPOSITION_BASELINE,
      compositionFloors: RATCHET,
      compositionSurplus: surplus,
      requiredCompositionSurplus: requiredSurplus,
    },
  })

  for (const world of measured.worlds) {
    emit({
      code: 'world_health_detail',
      severity: 'info',
      path: world.schemaPath,
      message:
        `${world.name}: ${world.tables} tables, ${world.nonKeyCols} non-key columns ` +
        `(${world.nonKeyNotNull} NOT NULL), ${world.checks} CHECKs over ` +
        `${world.checkArityTotal} column references (${world.checkNullTest} with null tests, ` +
        `${world.checkNullLiteral} with literal NULL), ${world.generated} generated columns ` +
        `(${world.generatedNullLiteral} with literal NULL), ${world.fks} foreign keys ` +
        `(${world.fkNotNull} NOT NULL); ${world.statements} statements, ${world.modifying} ` +
        `modifying, ${world.parametrized} parametrized with ${world.paramTotal} live parameters; ` +
        `additivity=${world.additivity}, chaining=${world.chaining}, ` +
        `generatedOverConstrained=${world.generatedOverConstrained}.`,
      metadata: {
        tables: world.tables,
        nonKeyColumns: world.nonKeyCols,
        nonKeyNotNull: world.nonKeyNotNull,
        checks: world.checks,
        checkArityTotal: world.checkArityTotal,
        checkNullTest: world.checkNullTest,
        checkNullLiteral: world.checkNullLiteral,
        generated: world.generated,
        generatedNullLiteral: world.generatedNullLiteral,
        foreignKeys: world.fks,
        foreignKeysNotNull: world.fkNotNull,
        statements: world.statements,
        modifying: world.modifying,
        parametrized: world.parametrized,
        parameterTotal: world.paramTotal,
        dmlKinds: Object.fromEntries(world.dmlKinds),
        additivity: world.additivity,
        chaining: world.chaining,
        generatedOverConstrained: world.generatedOverConstrained,
      },
    })

    for (const { path, message } of world.violations) {
      emit({
        code: 'world_health_violation',
        path,
        message: `${world.name}: ${message}`,
      })
    }
  }

  for (const ratio of measured.ratios) {
    if (ratio.d < bindsAt(ratio.floor)) continue
    const share = ratio.n / ratio.d
    if (share < ratio.floor) {
      emit({
        code: 'world_ratio_below_floor',
        message: `${ratio.label}: ${ratio.n}/${ratio.d} = ${percent(share)}, floor is ${percent(ratio.floor)}`,
      })
    } else if (ratio.ceiling !== undefined && share > ratio.ceiling) {
      emit({
        code: 'world_ratio_above_ceiling',
        message: `${ratio.label}: ${ratio.n}/${ratio.d} = ${percent(share)}, ceiling is ${percent(ratio.ceiling)}`,
      })
    }
  }

  if (parametrized >= 2) {
    const average = parameterTotal / parametrized
    if (average < 1.5) {
      emit({
        code: 'world_parameter_average_below_floor',
        message:
          `parameters average ${average.toFixed(2)} per parametrized statement over ` +
          `${parametrized} of them; 1.5 is the floor`,
      })
    }
  }

  if (generated < requiredGenerated) {
    emit({
      code: 'world_generated_column_density_below_floor',
      message: `${generated} generated column(s) across ${tables} table(s); ${requiredGenerated} required`,
    })
  }

  for (const [name, floor] of Object.entries(RATCHET)) {
    if (measured.current[name] < floor) {
      emit({
        code: 'world_composition_regression',
        message: `${name}: ${floor} → ${measured.current[name]}`,
      })
    }
  }

  if (surplus < requiredSurplus) {
    emit({
      code: 'world_composition_growth_below_floor',
      message:
        `composition growth surplus is ${surplus} across ${measured.worlds.length} worlds; ` +
        `${requiredSurplus} required`,
    })
  }
}
