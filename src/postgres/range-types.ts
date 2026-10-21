import type { PGlite } from '@electric-sql/pglite'

import type {
  RangeTypeMetadata,
  RangeTypeInfo,
  RangeCallInfo,
  RangeCallResolution,
  RangeSubtypeDefinition,
} from '../catalog/types.js'
export type { RangeTypeMetadata } from '../catalog/types.js'

const typeIdentity = `SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname)
  FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=`

type SelectedFunction = { schema: string; name: string; args: string[] } | null
const functionIdentity = (oid: string): string => `(SELECT json_build_object(
  'schema',fn.nspname,'name',p.proname,'args',ARRAY(
    SELECT (${typeIdentity} u.t) FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord) ORDER BY u.ord))
  FROM pg_proc p JOIN pg_namespace fn ON fn.oid=p.pronamespace WHERE p.oid=${oid})`
const signature = (fn: SelectedFunction): string | null =>
  fn ? `function:${JSON.stringify([fn.schema, fn.name])}(${fn.args.join(',')})` : null

type TypeSupport = {
  equality: string | null
  comparator: string | null
  hash: string | null
  extended: string | null
  hashEqualityCompatible: boolean
}
const operatorIdentity = (oid: string): string =>
  `(SELECT json_build_object('schema',n.nspname,'name',o.oprname,'args',ARRAY[(${typeIdentity} o.oprleft),(${typeIdentity} o.oprright)]) FROM pg_operator o JOIN pg_namespace n ON n.oid=o.oprnamespace WHERE o.oid=${oid})`
async function readTypeSupports(
  pg: PGlite,
  types: readonly string[],
): Promise<Map<string, TypeSupport>> {
  const supports = new Map<string, TypeSupport>()
  for (const type of new Set(types)) {
    const support: TypeSupport = {
      equality: null,
      comparator: null,
      hash: null,
      extended: null,
      hashEqualityCompatible: true,
    }
    let hashEquality: string | null = null
    for (const method of ['btree', 'hash'])
      try {
        await pg.transaction(async (tx) => {
          await tx.exec(`CREATE TEMP TABLE _pgsid_range_hash_probe(value ${type})`)
          await tx.exec(
            `CREATE INDEX _pgsid_range_hash_index ON _pgsid_range_hash_probe USING ${method}(value)`,
          )
          const rows = (
            await tx.query<{
              equality: SelectedFunction
              first: SelectedFunction
              extended: SelectedFunction
            }>(`SELECT
      ${operatorIdentity('e.amopopr')} AS equality,${functionIdentity('hp.amproc')} AS first,${functionIdentity('xp.amproc')} AS extended
      FROM pg_index i JOIN pg_opclass c ON c.oid=i.indclass[0]
      LEFT JOIN pg_amop e ON e.amopfamily=c.opcfamily AND e.amoplefttype=c.opcintype AND e.amoprighttype=c.opcintype AND e.amoppurpose='s' AND e.amopstrategy=${method === 'btree' ? 3 : 1}
      LEFT JOIN pg_amproc hp ON hp.amprocfamily=c.opcfamily AND hp.amproclefttype=c.opcintype AND hp.amprocrighttype=c.opcintype AND hp.amprocnum=1
      LEFT JOIN pg_amproc xp ON xp.amprocfamily=c.opcfamily AND xp.amproclefttype=c.opcintype AND xp.amprocrighttype=c.opcintype AND xp.amprocnum=2 AND ${method === 'hash'}
      WHERE i.indrelid='pg_temp._pgsid_range_hash_probe'::regclass`)
          ).rows
          if (rows.length !== 1)
            throw new Error(
              'Range support index did not select one operator class: ' + type + '/' + method,
            )
          const row = rows[0]!,
            equality = row.equality
              ? `operator:${JSON.stringify([row.equality.schema, row.equality.name])}(${row.equality.args.join(',')})`
              : null
          if (method === 'btree') {
            support.equality = equality
            support.comparator = signature(row.first)
          } else {
            hashEquality = equality
            support.hash = signature(row.first)
            support.extended = signature(row.extended)
          }
          await tx.rollback()
        })
      } catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '42704')
          throw error
      }
    if (support.equality && hashEquality && support.equality !== hashEquality) {
      support.hashEqualityCompatible = false
    }
    if (!support.equality) support.equality = hashEquality
    supports.set(type, support)
  }
  return supports
}

async function readRangeCallables(
  pg: PGlite,
  identities: readonly string[],
): Promise<Map<string, RangeCallInfo[]>> {
  const result = new Map<string, RangeCallInfo[]>()
  if (!identities.length) return result
  const savedPath = (
    await pg.query<{ value: string }>("SELECT current_setting('search_path') AS value")
  ).rows[0]!.value
  let rows: (RangeCallInfo & { range: string })[]
  try {
    if (savedPath !== '') await pg.query("SELECT set_config('search_path','',false)")
    rows = (
      await pg.query<RangeCallInfo & { range: string }>(
        `WITH RECURSIVE relatives(root,type) AS (
         SELECT r.rngtypid,t.type FROM pg_range r
         CROSS JOIN LATERAL (VALUES(r.rngtypid),(r.rngmultitypid)) t(type)
         WHERE (${typeIdentity} r.rngtypid)=ANY($1::text[])
         UNION ALL
         SELECT r.root,d.oid FROM relatives r JOIN pg_type d ON d.typbasetype=r.type
         WHERE d.typtype='d'
       ), names(root,namespace,name) AS (
         SELECT r.root,t.typnamespace,t.typname FROM relatives r JOIN pg_type t ON t.oid=r.type
         UNION
         SELECT r.root,p.pronamespace,p.proname FROM relatives r
         JOIN pg_proc p ON p.prorettype=r.type
         JOIN pg_language l ON l.oid=p.prolang
         WHERE l.lanname='internal' AND p.prosrc IN (
           'range_constructor2','range_constructor3',
           'multirange_constructor0','multirange_constructor1','multirange_constructor2')
       )
       SELECT (${typeIdentity} candidates.root) AS range,
         n.nspname AS schema,p.proname AS name,
         CASE p.prokind WHEN 'f' THEN 'function' WHEN 'a' THEN 'aggregate'
           WHEN 'w' THEN 'window' ELSE 'procedure' END AS kind,
         ARRAY(SELECT (${typeIdentity} u.t)
           FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord) ORDER BY u.ord) AS args,
         ARRAY(SELECT p.proargnames[u.ord]
           FROM unnest(coalesce(p.proallargtypes,p.proargtypes::oid[])) WITH ORDINALITY u(t,ord)
           WHERE p.proargmodes IS NULL OR p.proargmodes[u.ord] IN ('i','b','v')
           ORDER BY u.ord) AS "argumentNames",
         (${typeIdentity} p.prorettype) AS result,
         p.proisstrict AS strict,p.provolatile AS volatility,p.proretset AS "returnsSet",
         (${typeIdentity} p.provariadic) AS variadic,p.pronargdefaults AS "numArgDefaults",
         ARRAY(SELECT CASE WHEN p.pronargdefaults>0
           THEN pg_get_function_arg_default(p.oid,u.ord::int4) ELSE NULL END
           FROM unnest(coalesce(p.proallargtypes,p.proargtypes::oid[])) WITH ORDINALITY u(t,ord)
           WHERE p.proargmodes IS NULL OR p.proargmodes[u.ord] IN ('i','b','v')
           ORDER BY u.ord) AS "defaultExprs",
         CASE WHEN l.lanname='internal' THEN p.prosrc ELSE NULL END AS implementation
       FROM names candidates
       JOIN pg_proc p ON p.pronamespace=candidates.namespace AND p.proname=candidates.name
       JOIN pg_namespace n ON n.oid=p.pronamespace
       JOIN pg_language l ON l.oid=p.prolang
       ORDER BY range,n.nspname,p.proname,args,p.prokind`,
        [identities],
      )
    ).rows
  } finally {
    if (savedPath !== '') await pg.query("SELECT set_config('search_path',$1,false)", [savedPath])
  }
  for (const { range, ...callable } of rows) {
    const group = result.get(range) ?? []
    group.push(callable)
    result.set(range, group)
  }
  return result
}

async function readRangeCallResolution(
  pg: PGlite,
  callables: ReadonlyMap<string, readonly RangeCallInfo[]>,
): Promise<RangeCallResolution> {
  const types = [
    ...new Set(
      [...callables.values()].flatMap((group) =>
        group.flatMap((callable) => [
          ...callable.args,
          callable.result,
          ...(callable.variadic ? [callable.variadic] : []),
        ]),
      ),
    ),
  ]
  const [typeRows, castRows] = await Promise.all([
    pg.query<RangeCallResolution['types'][number]>(
      `WITH RECURSIVE needed(type) AS (
         SELECT ty.oid FROM pg_type ty WHERE (${typeIdentity} ty.oid)=ANY($1::text[]) OR ty.typtype='d'
         UNION
         SELECT child.type FROM needed n JOIN pg_type t ON t.oid=n.type
         CROSS JOIN LATERAL (VALUES(t.typbasetype),(t.typelem)) child(type)
         WHERE child.type!=0
       ) SELECT (${typeIdentity} ty.oid) AS identity,
         (${typeIdentity} ty.typbasetype) AS base,
         CASE WHEN et.typarray=ty.oid THEN (${typeIdentity} ty.typelem) ELSE NULL END AS element,ty.typcategory AS category,ty.typispreferred AS preferred
         FROM needed n JOIN pg_type ty ON ty.oid=n.type LEFT JOIN pg_type et ON et.oid=ty.typelem ORDER BY identity`,
      [types],
    ),
    pg.query<RangeCallResolution['implicitCasts'][number]>(
      `SELECT (${typeIdentity} c.castsource) AS source,(${typeIdentity} c.casttarget) AS target,c.castmethod AS method
       FROM pg_cast c WHERE c.castcontext='i' ORDER BY source,target`,
    ),
  ])
  return { types: typeRows.rows, implicitCasts: castRows.rows }
}

async function readSubtypeDefinitions(pg: PGlite, roots: readonly string[]) {
  type Definition = Omit<
    RangeSubtypeDefinition,
    | 'input'
    | 'output'
    | 'send'
    | 'equality'
    | 'comparator'
    | 'hash'
    | 'hashExtended'
    | 'hashEqualityCompatible'
  > & {
    root: string
    input: SelectedFunction
    output: SelectedFunction
    send: SelectedFunction
  }
  if (!roots.length) return [] as Definition[]
  return (
    await pg.query<Definition>(
      `WITH RECURSIVE roots(root,type) AS (
      SELECT (${typeIdentity} ty.oid),ty.oid FROM pg_type ty WHERE (${typeIdentity} ty.oid)=ANY($1::text[])
    ),bases(root,type) AS (
      SELECT root,type FROM roots UNION
      SELECT b.root,ty.typbasetype FROM bases b JOIN pg_type ty ON ty.oid=b.type WHERE ty.typtype='d'
    ),arrays(root) AS (
      SELECT DISTINCT b.root FROM bases b JOIN pg_type ty ON ty.oid=b.type JOIN pg_type e ON e.oid=ty.typelem AND e.typarray=ty.oid
    ),needed(root,type) AS (
      SELECT r.root,r.type FROM roots r JOIN arrays a USING(root)
      UNION
      SELECT p.root,child.type FROM needed p JOIN pg_type ty ON ty.oid=p.type
      LEFT JOIN pg_type e ON e.oid=ty.typelem
      LEFT JOIN pg_range r ON r.rngtypid=ty.oid
      LEFT JOIN pg_range m ON m.rngmultitypid=ty.oid
      CROSS JOIN LATERAL (VALUES(ty.typbasetype),(CASE WHEN e.typarray=ty.oid THEN ty.typelem ELSE 0 END),(r.rngsubtype),(m.rngtypid)) child(type)
      WHERE child.type IS NOT NULL AND child.type<>0
    ) SELECT p.root,(${typeIdentity} ty.oid) identity,n.nspname schema,ty.typname name,ty.typtype kind,
      (${typeIdentity} ty.typbasetype) base,
      CASE WHEN e.typarray=ty.oid THEN (${typeIdentity} ty.typelem) ELSE NULL END element,
      (${typeIdentity} r.rngsubtype) subtype,(${typeIdentity} m.rngtypid) member,
      CASE WHEN ty.typtype='e' THEN ARRAY(SELECT en.enumlabel FROM pg_enum en WHERE en.enumtypid=ty.oid ORDER BY en.enumsortorder) ELSE NULL END "enumValues",
      ${functionIdentity('ty.typinput')} input,${functionIdentity('ty.typoutput')} output,${functionIdentity('ty.typsend')} send
      FROM needed p JOIN pg_type ty ON ty.oid=p.type JOIN pg_namespace n ON n.oid=ty.typnamespace
      LEFT JOIN pg_type e ON e.oid=ty.typelem LEFT JOIN pg_range r ON r.rngtypid=ty.oid LEFT JOIN pg_range m ON m.rngmultitypid=ty.oid
      ORDER BY p.root,identity`,
      [roots],
    )
  ).rows
}

async function readRangeTypeInfos(
  pg: PGlite,
  schema: string | null,
  schemas: readonly string[] | null,
): Promise<RangeTypeInfo[]> {
  const rows = (
    await pg.query<{
      schema: string
      name: string
      multirange_schema: string
      multirange_name: string
      identity: string
      array: string
      subtype: string
      subtype_enum: RangeTypeInfo['subtypeEnum'] | null
      multirange: string
      multirange_array: string
      collation: string | null
      collation_deterministic: boolean | null
      collation_is_c: boolean | null
      collation_is_default: boolean | null
      subtype_class: string
      comparator_schema: string | null
      comparator_name: string | null
      comparator_args: string[] | null
      canonical_schema: string | null
      canonical_name: string | null
      canonical_args: string[] | null
      diff_schema: string | null
      diff_name: string | null
      diff_args: string[] | null
      output: SelectedFunction
      multirange_output: SelectedFunction
      subtype_output: SelectedFunction
      input: SelectedFunction
      multirange_input: SelectedFunction
      subtype_input: SelectedFunction
      send: SelectedFunction
      multirange_send: SelectedFunction
      subtype_send: SelectedFunction
      json_cast: SelectedFunction
      multirange_json_cast: SelectedFunction
    }>(
      `SELECT n.nspname AS schema,rt.typname AS name,mn.nspname AS multirange_schema,mt.typname AS multirange_name,
        (${typeIdentity} r.rngtypid) AS identity,
        (${typeIdentity} rt.typarray) AS array,
        (${typeIdentity} r.rngsubtype) AS subtype,
        (WITH RECURSIVE bases(type) AS (
          SELECT r.rngsubtype
          UNION
          SELECT t.typbasetype FROM bases b JOIN pg_type t ON t.oid=b.type WHERE t.typtype='d'
        ) SELECT json_build_object('schema',en.nspname,'name',et.typname,'values',ARRAY(
          SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid=et.oid ORDER BY e.enumsortorder
        )) FROM bases b JOIN pg_type et ON et.oid=b.type AND et.typtype='e'
          JOIN pg_namespace en ON en.oid=et.typnamespace) AS subtype_enum,
        (${typeIdentity} r.rngmultitypid) AS multirange,
        (${typeIdentity} mt.typarray) AS multirange_array,
        (SELECT quote_ident(cn.nspname)||'.'||quote_ident(c.collname)
          FROM pg_collation c JOIN pg_namespace cn ON cn.oid=c.collnamespace
          WHERE c.oid=r.rngcollation) AS collation,
        rco.collisdeterministic AS collation_deterministic,
        CASE WHEN r.rngcollation=0 THEN NULL ELSE r.rngcollation='pg_catalog."C"'::regcollation END AS collation_is_c,
        CASE WHEN r.rngcollation=0 THEN NULL ELSE r.rngcollation='pg_catalog."default"'::regcollation END AS collation_is_default,
        quote_ident(onsp.nspname)||'.'||quote_ident(o.opcname) AS subtype_class,
        pn.nspname AS comparator_schema,p.proname AS comparator_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(p.proargtypes) WITH ORDINALITY u(t,ord)) AS comparator_args,
        cn.nspname AS canonical_schema,c.proname AS canonical_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(c.proargtypes) WITH ORDINALITY u(t,ord)) AS canonical_args,
        dn.nspname AS diff_schema,d.proname AS diff_name,
        (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.ord)
          FROM unnest(d.proargtypes) WITH ORDINALITY u(t,ord)) AS diff_args,
        ${functionIdentity('rt.typoutput')} AS output,
        ${functionIdentity('mt.typoutput')} AS multirange_output,
        ${functionIdentity('st.typoutput')} AS subtype_output,
        ${functionIdentity('rt.typinput')} AS input,
        ${functionIdentity('mt.typinput')} AS multirange_input,
        ${functionIdentity('st.typinput')} AS subtype_input,
        ${functionIdentity('rt.typsend')} AS send,
        ${functionIdentity('mt.typsend')} AS multirange_send,
        ${functionIdentity('st.typsend')} AS subtype_send,
        ${functionIdentity("(SELECT castfunc FROM pg_cast WHERE castsource=rt.oid AND casttarget='pg_catalog.json'::regtype AND castmethod='f')")} AS json_cast,
        ${functionIdentity("(SELECT castfunc FROM pg_cast WHERE castsource=mt.oid AND casttarget='pg_catalog.json'::regtype AND castmethod='f')")} AS multirange_json_cast
        FROM pg_range r
        JOIN pg_type rt ON rt.oid=r.rngtypid
        JOIN pg_namespace n ON n.oid=rt.typnamespace
        JOIN pg_type mt ON mt.oid=r.rngmultitypid
        JOIN pg_type st ON st.oid=r.rngsubtype
        JOIN pg_namespace mn ON mn.oid=mt.typnamespace
        JOIN pg_opclass o ON o.oid=r.rngsubopc
        JOIN pg_namespace onsp ON onsp.oid=o.opcnamespace
        LEFT JOIN pg_collation rco ON rco.oid=r.rngcollation
        LEFT JOIN pg_amproc ap ON ap.amprocfamily=o.opcfamily
          AND ap.amproclefttype=o.opcintype AND ap.amprocrighttype=o.opcintype
          AND ap.amprocnum=1
        LEFT JOIN pg_proc p ON p.oid=ap.amproc
        LEFT JOIN pg_namespace pn ON pn.oid=p.pronamespace
        LEFT JOIN pg_proc c ON c.oid=r.rngcanonical
        LEFT JOIN pg_namespace cn ON cn.oid=c.pronamespace
        LEFT JOIN pg_proc d ON d.oid=r.rngsubdiff
        LEFT JOIN pg_namespace dn ON dn.oid=d.pronamespace
        WHERE ($1::text IS NULL OR n.nspname=$1)
          AND ($2::text[] IS NULL OR n.nspname=ANY($2::text[]))
        ORDER BY identity`,
      [schema, schemas],
    )
  ).rows
  const definitions = await readSubtypeDefinitions(
    pg,
    rows.map((row) => row.subtype),
  )
  const supports = await readTypeSupports(pg, [
    ...rows.flatMap((row) => [row.subtype, row.identity, row.multirange]),
    ...definitions.map((definition) => definition.identity),
  ])
  const callables = await readRangeCallables(
    pg,
    rows.map((row) => row.identity),
  )
  const callResolution = rows.length ? await readRangeCallResolution(pg, callables) : undefined
  return rows.map((row) => ({
    ...(row.subtype_enum ? { subtypeEnum: row.subtype_enum } : {}),
    ...(definitions.some((definition) => definition.root === row.subtype)
      ? {
          subtypeDefinitions: definitions
            .filter((definition) => definition.root === row.subtype)
            .map(({ root: _root, ...definition }) => ({
              ...definition,
              enumValues: definition.enumValues ? [...definition.enumValues] : null,
              input: signature(definition.input),
              output: signature(definition.output),
              send: signature(definition.send),
              equality: supports.get(definition.identity)!.equality,
              comparator: supports.get(definition.identity)!.comparator,
              hash: supports.get(definition.identity)!.hash,
              hashExtended: supports.get(definition.identity)!.extended,
              hashEqualityCompatible: supports.get(definition.identity)!.hashEqualityCompatible,
            })),
        }
      : {}),
    schema: row.schema,
    name: row.name,
    multirangeSchema: row.multirange_schema,
    multirangeName: row.multirange_name,
    collationDeterministic: row.collation_deterministic,
    collationIsC: row.collation_is_c,
    collationIsDefault: row.collation_is_default,
    identity: row.identity,
    array: row.array,
    subtype: row.subtype,
    multirange: row.multirange,
    multirangeArray: row.multirange_array,
    collation: row.collation,
    subtypeClass: row.subtype_class,
    comparator:
      row.comparator_name === null
        ? null
        : `function:${JSON.stringify([row.comparator_schema, row.comparator_name])}(${(row.comparator_args ?? []).join(',')})`,
    canonical:
      row.canonical_name === null
        ? null
        : `function:${JSON.stringify([row.canonical_schema, row.canonical_name])}(${(row.canonical_args ?? []).join(',')})`,
    subtypeDiff:
      row.diff_name === null
        ? null
        : `function:${JSON.stringify([row.diff_schema, row.diff_name])}(${(row.diff_args ?? []).join(',')})`,
    output: signature(row.output),
    multirangeOutput: signature(row.multirange_output),
    subtypeOutput: signature(row.subtype_output),
    input: signature(row.input),
    multirangeInput: signature(row.multirange_input),
    subtypeInput: signature(row.subtype_input),
    send: signature(row.send),
    multirangeSend: signature(row.multirange_send),
    subtypeSend: signature(row.subtype_send),
    subtypeHash: supports.get(row.subtype)!.hash,
    subtypeHashExtended: supports.get(row.subtype)!.extended,
    rangeEquality: supports.get(row.identity)!.equality,
    rangeComparator: supports.get(row.identity)!.comparator,
    rangeHash: supports.get(row.identity)!.hash,
    rangeHashExtended: supports.get(row.identity)!.extended,
    multirangeEquality: supports.get(row.multirange)!.equality,
    multirangeComparator: supports.get(row.multirange)!.comparator,
    multirangeHash: supports.get(row.multirange)!.hash,
    multirangeHashExtended: supports.get(row.multirange)!.extended,
    subtypeHashEqualityCompatible: supports.get(row.subtype)!.hashEqualityCompatible,
    rangeHashEqualityCompatible: supports.get(row.identity)!.hashEqualityCompatible,
    multirangeHashEqualityCompatible: supports.get(row.multirange)!.hashEqualityCompatible,
    jsonConversion: row.json_cast ? 'cast' : 'output',
    multirangeJsonConversion: row.multirange_json_cast ? 'cast' : 'output',
    jsonCast: signature(row.json_cast),
    multirangeJsonCast: signature(row.multirange_json_cast),
    callables: callables.get(row.identity) ?? [],
    ...(callResolution ? { callResolution } : {}),
  }))
}

export async function readRangeTypes(
  pg: PGlite,
  schema: string | null = null,
): Promise<RangeTypeMetadata[]> {
  const rows = await readRangeTypeInfos(pg, schema, null)
  return rows.map(
    ({
      subtypeEnum: _subtypeEnum,
      subtypeDefinitions: _subtypeDefinitions,
      schema: _schema,
      name: _name,
      multirangeSchema: _multirangeSchema,
      multirangeName: _multirangeName,
      collationDeterministic: _deterministic,
      collationIsC: _isC,
      collationIsDefault: _isDefault,
      output: _output,
      multirangeOutput: _multirangeOutput,
      subtypeOutput: _subtypeOutput,
      input: _input,
      multirangeInput: _multirangeInput,
      subtypeInput: _subtypeInput,
      send: _send,
      multirangeSend: _multirangeSend,
      subtypeSend: _subtypeSend,
      subtypeHash: _subtypeHash,
      subtypeHashExtended: _subtypeHashExtended,
      rangeEquality: _rangeEquality,
      rangeComparator: _rangeComparator,
      rangeHash: _rangeHash,
      rangeHashExtended: _rangeHashExtended,
      multirangeEquality: _multirangeEquality,
      multirangeComparator: _multirangeComparator,
      multirangeHash: _multirangeHash,
      multirangeHashExtended: _multirangeHashExtended,
      subtypeHashEqualityCompatible: _subtypeHashEqualityCompatible,
      rangeHashEqualityCompatible: _rangeHashEqualityCompatible,
      multirangeHashEqualityCompatible: _multirangeHashEqualityCompatible,
      jsonConversion: _jsonConversion,
      multirangeJsonConversion: _multirangeJsonConversion,
      jsonCast: _jsonCast,
      multirangeJsonCast: _multirangeJsonCast,
      callables: _callables,
      callResolution: _callResolution,
      ...metadata
    }) => metadata,
  )
}

export async function readCatalogRangeTypes(
  pg: PGlite,
  schemas: readonly string[],
): Promise<RangeTypeInfo[]> {
  return readRangeTypeInfos(pg, null, schemas)
}
