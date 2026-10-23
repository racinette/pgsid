import { isOidAliasType } from '../../src/sql-semantics/expressions.js'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../../src/postgres/builtins/taxonomy.js'
import { checkRustCallableNames } from '../../src/codegen/shared/check-rust-source.js'
import { catalogCheckGroups, lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  callableBoundary,
  verifiedCatalog,
  jsonValueRequirements,
  hashValueRequirements,
  characterValueRequirements,
  rangeValueRequirements,
  trigonometryValueRequirements,
  xmlValueRequirements,
} from './catalog.js'
import { bindProbe, inspectExpression, quote, valueRepresentation } from './probes.js'
import { arrayValueRequirements } from './arrays.js'
import {
  loadWorldCatalog,
  verifyWorldDigest,
  worldSourceDigest,
  writeReport,
  worldRejectionCoverage,
} from './worlds.js'

const enumDefinition = { schema: 'public', name: 'check_measurement_enum', values: ['low', 'high'] }
const enumName = `${quote(enumDefinition.schema)}.${quote(enumDefinition.name)}`

function callableProbe(item: BuiltinCallable) {
  const signature = callableIdentity(item)
  const columns = item.args.map((type, index) => ({
    name: `arg_${index}`,
    typeName: type === 'pg_catalog.anyenum' ? enumName : type,
    collationIsC: true,
    collationDeterministic: true,
    collationIsDefault: false,
  }))
  const args = columns.map((column) => quote(column.name))
  const call =
    item.kind === 'operator'
      ? item.left === null
        ? `OPERATOR(${item.schema}.${item.name}) ${args[0]}`
        : `${args[0]} OPERATOR(${item.schema}.${item.name}) ${args[1]}`
      : `${quote(item.schema)}.${quote(item.name)}(${args.join(', ')})`
  const sql = item.result === 'pg_catalog.bool' ? call : `(${call}) IS NOT NULL`
  const probe = bindProbe(sql, columns, [enumDefinition])
  const signatures = new Set<string>()
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    if ('signature' in value && typeof value.signature === 'string') signatures.add(value.signature)
    Object.values(value).forEach(visit)
  }
  visit(probe.expression)
  return { sql, ...probe, requestedIdentityBound: signatures.has(signature) }
}

export async function measureSurface(pg: PGlite) {
  const builtin = await verifiedCatalog(pg)
  const outcomes = JSON.parse(
    await readFile(new URL('../../artifacts/check-worlds/report.json', import.meta.url), 'utf8'),
  ) as {
    sourceDigest?: string
    summary: unknown
    constraints: { constraint: string; definition: string; unknown: number }[]
    unexercised: string[]
    cases: {
      name: string
      schema: string
      relation: string
      database: { accepted: boolean }
      checks: { constraint: string; result: { certain: boolean } }[]
    }[]
  }
  verifyWorldDigest(outcomes, await worldSourceDigest())
  const catalog = await loadWorldCatalog(pg)
  await pg.exec(`SET search_path = public; CREATE TYPE ${enumName} AS ENUM ('low', 'high')`)
  const enumProbe = bindProbe(
    'value = value',
    [{ name: 'value', typeName: enumName }],
    [enumDefinition],
  )
  assert.ok(
    enumProbe.fullyBound && enumProbe.preparation.kind === 'supported',
    'Enum representation probe failed',
  )
  const callables = [...builtin.functions, ...builtin.operators].map(({ metadata }) => metadata)
  const represented = new Set(
    callables
      .flatMap((item) => [...item.args, item.result])
      .filter((type) => valueRepresentation(type).represented),
  )
  represented.add('pg_catalog.anyenum')
  const available = checkRustCallableNames()
  const rows = callables.map((item) => {
    const implementation = item.kind === 'operator' ? builtinMetadata(item.implementation) : item
    const boundary = callableBoundary(item, represented)
    const canProbe =
      (item.kind === 'function' || item.kind === 'operator') &&
      !item.returnsSet &&
      !boundary.missingTypes.length
    return {
      identity: callableIdentity(item),
      metadata: item,
      ...boundary,
      implementation: implementation.kind === 'function' ? implementation.rustName : null,
      implementationPresent:
        implementation.kind === 'function' && available.has(implementation.rustName),
      valueRequirements:
        trigonometryValueRequirements(implementation) ??
        arrayValueRequirements(implementation) ??
        rangeValueRequirements(implementation) ??
        hashValueRequirements(implementation) ??
        characterValueRequirements(implementation) ??
        jsonValueRequirements(implementation) ??
        xmlValueRequirements(implementation) ??
        (implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        ['pg_current_snapshot', 'txid_current_snapshot'].includes(implementation.name)
          ? [
              {
                kind: 'database',
                requirement:
                  'The active PostgreSQL transaction snapshot is required; pure operations on supplied snapshot values do not read database state.',
                owner: 'tests/sql-semantics/check-snapshot.test.ts',
              },
            ]
          : implementation.kind === 'function' &&
              implementation.schema === 'pg_catalog' &&
              ['textsend', 'namesend'].includes(implementation.name)
            ? [
                {
                  kind: 'session',
                  requirement:
                    'Non-ASCII binary output and conversion errors require client_encoding; ASCII bytes and strict NULL/error propagation remain portable.',
                  owner: 'tests/sql-semantics/check-refcursor.test.ts',
                },
              ]
            : implementation.kind === 'function' &&
                implementation.schema === 'pg_catalog' &&
                implementation.name === 'name' &&
                implementation.result === 'pg_catalog.name'
              ? [
                  {
                    kind: 'platform',
                    requirement:
                      'Nonempty input truncation requires the deployment max_identifier_length build setting; SQL-coerced name values already carry their contents.',
                    owner: 'tests/sql-semantics/check-name.test.ts',
                  },
                ]
              : implementation.kind === 'function' &&
                  implementation.schema === 'pg_catalog' &&
                  ['hashchar', 'hashcharextended'].includes(implementation.name)
                ? [
                    {
                      kind: 'platform',
                      requirement:
                        'PostgreSQL native C char signedness for byte values with the high bit set; ASCII and zero are portable',
                      owner: 'tests/sql-semantics/check-internal-char.test.ts',
                    },
                  ]
                : implementation.kind === 'function' &&
                    implementation.schema === 'pg_catalog' &&
                    implementation.name === 'bpchar' &&
                    implementation.args[0] === 'pg_catalog."char"'
                  ? [
                      {
                        kind: 'representation',
                        requirement:
                          'Raw NUL or invalid UTF8 bytes cannot enter the SQL-coerced UTF8 text wrapper; nonzero ASCII output is represented',
                        owner: 'tests/sql-semantics/check-internal-char.test.ts',
                      },
                    ]
                  : implementation.kind === 'function' &&
                      ['hashenum', 'hashenumextended'].includes(implementation.name)
                    ? [
                        {
                          kind: 'database',
                          requirement:
                            'Actual enum label OIDs are unavailable to generated label adapters and literals; generation catalog OIDs are not portable',
                          owner: 'tests/sql-semantics/check-enum-oid-context.test.ts',
                        },
                      ]
                    : implementation.kind === 'function' &&
                        isOidAliasType(implementation.result) &&
                        (implementation.name ===
                          'to_' + implementation.result.slice('pg_catalog.'.length) ||
                          (implementation.name === 'regclass' &&
                            implementation.args[0] === 'pg_catalog.text'))
                      ? [
                          {
                            kind: 'database',
                            requirement:
                              implementation.name === 'regclass'
                                ? 'Deployment catalog is unavailable; text arguments are relation names even when numeric'
                                : 'Deployment catalog is unavailable for symbolic names; numeric and sentinel branches are portable',
                            owner: 'tests/sql-semantics/check-oid-aliases.test.ts',
                          },
                        ]
                      : []),
      probe: canProbe ? callableProbe(item) : null,
    }
  })
  const outcomeByConstraint = new Map(outcomes.constraints.map((row) => [row.constraint, row]))
  const groups = catalogCheckGroups(
    catalog.tables,
    catalog.domains,
    [],
    catalog.enums,
    catalog.rangeTypes,
    catalog.compositeTypeGraph,
  )
  const constraints = groups.flatMap((group) =>
    group.checks.map(({ plan }) => {
      const identity = `${group.source.schema}.${group.source.name}.${plan.name}`
      const outcome = outcomeByConstraint.get(identity)
      const table = catalog.tables.find(
        (table) => table.schema === group.source.schema && table.name === group.source.name,
      )!
      return {
        identity,
        definition: table.constraints.find((constraint) => constraint.name === plan.name)!
          .definition,
        ...inspectExpression(plan.expression, table.columns),
        writeRewrites: table.writeRewritesTree,
        outcomes: outcome ?? null,
        unknownCases: outcomes.cases
          .filter((row) =>
            row.checks.some(
              (check) =>
                row.schema === group.source.schema &&
                row.relation === group.source.name &&
                check.constraint === plan.name &&
                !check.result.certain,
            ),
          )
          .map((row) => row.name),
      }
    }),
  )
  assert.deepEqual(
    new Set(constraints.map((row) => row.identity)),
    new Set([...outcomes.constraints.map((row) => row.constraint), ...outcomes.unexercised]),
    'World constraint inventory differs from the executed outcomes',
  )
  for (const row of constraints)
    if (row.outcomes)
      assert.equal(row.definition, row.outcomes.definition, `Stale outcome: ${row.identity}`)
  const columns = [
    { name: 'flag', typeName: 'boolean' },
    { name: 'a', typeName: 'integer' },
    { name: 'b', typeName: 'integer' },
    { name: 'stage', typeName: enumName },
    { name: 'label', typeName: 'text', collationIsC: true },
  ]
  const expressionEnums = (await snapshotCatalog(pg)).enums
  await pg.exec(
    `CREATE TABLE public.check_measurement_expressions (flag boolean, a integer, b integer, stage ${enumName}, label text COLLATE "C")`,
  )
  const expressions = []
  for (const sql of [
    'flag IS TRUE',
    'flag IS NOT TRUE',
    'flag IS FALSE',
    'flag IS NOT FALSE',
    'flag IS UNKNOWN',
    'flag IS NOT UNKNOWN',
    'a IS DISTINCT FROM b',
    'a IS NOT DISTINCT FROM b',
    'NULLIF(a, b) IS NULL',
    'GREATEST(a, b) > 0',
    'LEAST(a, b) > 0',
    'ROW(a, b) < ROW(b, a)',
    'a::text IS NOT DISTINCT FROM b::text',
    'stage::text IS NOT DISTINCT FROM label',
  ]) {
    await pg.exec(
      `ALTER TABLE public.check_measurement_expressions ADD CONSTRAINT probe CHECK (${sql})`,
    )
    const stored = (
      await pg.query<{ definition: string }>(`SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid = 'public.check_measurement_expressions'::regclass AND conname = 'probe'`)
    ).rows[0]!.definition
    const plan = lowerTableCheck(
      { columns },
      { name: 'probe', type: 'check', definition: stored },
      expressionEnums,
    )
    assert.ok(plan)
    const raw = bindProbe(sql, columns, expressionEnums)
    const boundStored = inspectExpression(plan.expression)
    expressions.push({
      sql,
      category: raw.fullyBound && boundStored.fullyBound ? 'bound-expression' : 'expression-gap',
      raw,
      stored: { definition: stored, ...boundStored },
    })
    await pg.exec('ALTER TABLE public.check_measurement_expressions DROP CONSTRAINT probe')
  }
  return {
    serverVersion: builtin.serverVersion,
    sourceDigest: outcomes.sourceDigest,
    probeContext: { textCollation: 'C', enum: enumDefinition },
    summary: {
      callables: rows.length,
      functions: rows.filter((row) => row.metadata.kind === 'function').length,
      operatorAliases: rows.filter((row) => row.metadata.kind === 'operator').length,
      categories: Object.fromEntries(
        [...new Set(rows.flatMap((row) => row.categories))]
          .sort()
          .map((category) => [
            category,
            rows.filter((row) => row.categories.includes(category)).length,
          ]),
      ),
      implementationsPresent: rows.filter((row) => row.implementationPresent).length,
      identityBoundAndPrepared: rows.filter(
        (row) =>
          row.probe?.requestedIdentityBound &&
          row.probe.fullyBound &&
          row.probe.preparation.kind === 'supported',
      ).length,
      uncertainCorpusExpressions: constraints.filter((row) => !row.fullyBound).length,
      worldOutcomes: outcomes.summary,
      worldRowRejections: worldRejectionCoverage(outcomes.cases),
    },
    enumProbe,
    callables: rows,
    expressions,
    constraints,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await PGlite.create({ extensions: { plpgsql_check } })
  try {
    await pg.exec('CREATE EXTENSION plpgsql_check')
    const report = await measureSurface(pg)
    await writeReport('check-surface', report)
    console.info(report.summary)
  } finally {
    await pg.close()
  }
}
