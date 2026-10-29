import {
  isTextOrderingCallable,
  supportsTextCallableCollation,
} from '../../src/sql-semantics/collation.js'
import { isIdentifierQuote } from '../../src/sql-semantics/identifier-quote.js'
import { isMoneyNumericConversion } from '../../src/sql-semantics/money-callables.js'
import {
  isTemporalContextArithmetic,
  isTemporalContextCast,
  isTemporalContextComparison,
  isTemporalLocalTimezone,
  isTemporalInstantConstructor,
  isTemporalInstantPeriod,
  isTemporalInstantAge,
  isTemporalDatePart,
  isTemporalTimestampFormatting,
  isTemporalTemplateParsing,
  isTemporalSessionTruncation,
  isTemporalSessionExtraction,
  isTemporalClockZoneLookup,
  isTemporalExplicitZoneLookup,
} from '../../src/sql-semantics/temporal-casts.js'
import {
  isArrayHash,
  isRangeHash,
  isMultirangeHash,
  nativeHashContext,
} from '../../src/codegen/shared/check-hash-context.js'
import { characterEncodingContext } from '../../src/codegen/shared/check-character-context.js'
import {
  circlePolygonTrigonometry,
  floatTrigonometry,
} from '../../src/codegen/shared/check-trigonometry-context.js'
import { jsonbTextRenderingContext } from '../../src/codegen/shared/check-jsonb-context.js'
import { isXmlOptionPredicate, isXmlXPathCallable } from '../../src/sql-semantics/xml-callables.js'
import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { callableIdentity, readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import type { BuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { PG18_BUILTINS_VERSION } from '../../src/postgres/builtins/groups.generated.js'
import { PG18_BUILTIN_CASTS } from '../../src/postgres/builtins/casts.generated.js'
import { PG18_TYPE_RESOLUTION } from '../../src/postgres/builtins/type-resolution.generated.js'
import { PG18_BTREE_COMPARISONS } from '../../src/postgres/builtins/btree-comparisons.generated.js'
import { PG18_TYPE_IO } from '../../src/postgres/builtins/type-io.generated.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { PG18_TYPE_COMPARISONS } from '../../src/postgres/builtins/type-comparisons.generated.js'
import { readBuiltinTypeComparisons } from '../../src/postgres/builtins/type-comparisons.js'
import {
  builtinCallables,
  builtinCast,
  builtinTypeIO,
} from '../../src/postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../../src/postgres/builtins/taxonomy.js'
import { isJsonbBuilder } from '../../src/codegen/shared/check-rust-evaluator.js'

export function verifyCatalog(catalog: BuiltinCatalog): void {
  assert.equal(catalog.serverVersion, PG18_BUILTINS_VERSION, 'PostgreSQL version mismatch')
  const entries = [...catalog.functions, ...catalog.operators].map(
    ({ metadata }) => [callableIdentity(metadata), metadata] as const,
  )
  assert.equal(
    new Set(entries.map(([identity]) => identity)).size,
    entries.length,
    'Duplicate callable identity',
  )
  assert.deepEqual(
    Object.fromEntries(entries),
    Object.fromEntries(builtinCallables().map((item) => [callableIdentity(item), item])),
    'Live callable metadata differs from the generated inventory',
  )
  const casts = catalog.casts.map(
    (cast) => [JSON.stringify([cast.source, cast.target]), cast] as const,
  )
  assert.equal(
    new Set(casts.map(([identity]) => identity)).size,
    casts.length,
    'Duplicate cast identity',
  )
  assert.deepEqual(
    Object.fromEntries(casts),
    PG18_BUILTIN_CASTS,
    'Live cast links differ from the generated inventory',
  )
  const types = catalog.types.map((type) => [type.identity, type] as const)
  assert.equal(
    new Set(types.map(([identity]) => identity)).size,
    types.length,
    'Duplicate type identity',
  )
  assert.deepEqual(
    Object.fromEntries(types),
    PG18_TYPE_RESOLUTION,
    'Live type resolution metadata differs from the generated inventory',
  )
  const btreeKeys = catalog.btreeComparisons.map((entry) =>
    JSON.stringify([entry.operator, entry.family, entry.strategy]),
  )
  const io = catalog.typeIO.map((entry) => [entry.identity, entry] as const)
  assert.equal(
    new Set(io.map(([identity]) => identity)).size,
    io.length,
    'Duplicate type I/O identity',
  )
  assert.deepEqual(
    Object.fromEntries(io),
    PG18_TYPE_IO,
    'Live type I/O links differ from the generated inventory',
  )
  const ranges = catalog.rangeTypes.map((range) => [range.identity, range] as const)
  assert.equal(
    new Set(ranges.map(([identity]) => identity)).size,
    ranges.length,
    'Duplicate range identity',
  )
  assert.deepEqual(
    Object.fromEntries(ranges),
    PG18_RANGE_TYPES,
    'Live range support links differ from the generated inventory',
  )
  assert.equal(new Set(btreeKeys).size, btreeKeys.length, 'Duplicate B-tree comparison')
  assert.deepEqual(
    catalog.btreeComparisons,
    PG18_BTREE_COMPARISONS,
    'Live B-tree comparison links differ from the generated inventory',
  )
}

export async function verifiedCatalog(pg: PGlite): Promise<BuiltinCatalog> {
  const catalog = await readBuiltinCatalog(pg)
  verifyCatalog(catalog)
  const comparisons = await readBuiltinTypeComparisons(pg)
  assert.equal(
    new Set(comparisons.map((entry) => entry.identity)).size,
    comparisons.length,
    'Duplicate default type comparison identity',
  )
  assert.deepEqual(
    Object.fromEntries(comparisons.map((entry) => [entry.identity, entry])),
    PG18_TYPE_COMPARISONS,
    'Live default type comparison links differ from the generated inventory',
  )
  return catalog
}

export function textOrderingRequirements(item: BuiltinCallable) {
  const signature = callableIdentity(item)
  if (
    !isTextOrderingCallable(signature) ||
    supportsTextCallableCollation(signature, 'deterministic')
  )
    return null
  return [
    {
      kind: 'database',
      setting: 'input_collation / default_collation',
      requirement:
        'Scalar text, name and bpchar ordering requires C input collation. Captured default provenance can use the declared defaultCollation C setting; explicit non-C choices are never overridden. Without context, reached ordering defers while strict NULLs, operand errors and skipped branches retain their results. Ordering does not establish character classification.',
      owner: 'tests/sql-semantics/check-text-default-ordering.test.ts',
    },
  ]
}

export function hashValueRequirements(item: BuiltinCallable) {
  if (isMultirangeHash(item))
    return [
      {
        kind: 'interface',
        requirement:
          'Resolve concrete builtin range/subtype hash support from captured metadata; multirange OIDs are not hash inputs.',
        owner: 'tests/sql-semantics/check-multirange-wire-hash.test.ts',
      },
      {
        kind: 'platform',
        requirement:
          'Reached byte-dependent subtype hashes retain nativeByteOrder requirements. With no declared order, compare both complete multirange hash results; empty multiranges and unbounded members do not read bound hashes.',
        owner: 'tests/sql-semantics/check-multirange-hash-context.test.ts',
      },
    ]
  if (isRangeHash(item))
    return [
      {
        kind: 'interface',
        requirement:
          'Resolve the concrete builtin subtype hash support from captured metadata; range OIDs are not hash inputs.',
        owner: 'tests/sql-semantics/check-range-wire-hash.test.ts',
      },
      {
        kind: 'platform',
        requirement:
          'Reached byte-dependent subtype hashes retain nativeByteOrder requirements. With no declared order, compare both complete range hash results; empty and unbounded ranges do not read bound hashes.',
        owner: 'tests/sql-semantics/check-range-hash-context.test.ts',
      },
    ]
  if (isArrayHash(item))
    return [
      {
        kind: 'database',
        requirement:
          'Resolve the concrete element default hash support from catalog metadata before traversal; absent PostgreSQL support raises 42883 even for empty or all-NULL arrays.',
        owner: 'tests/sql-semantics/check-array-hash-families.test.ts',
      },
      {
        kind: 'platform',
        requirement:
          'Reached scalar hashes retain their nativeByteOrder and canonical NaN requirements. Unspecified byte order keeps whole-array little/big alternatives and returns a known hash when the final results agree.',
        owner: 'tests/sql-semantics/check-array-hash-context.test.ts',
      },
      {
        kind: 'database',
        requirement:
          'Reached scalar hashes retain their encoding and collation requirements; empty arrays and NULL cells do not read scalar context.',
        owner: 'tests/sql-semantics/check-array-hash-context.test.ts',
      },
      {
        kind: 'database',
        requirement:
          'Non-NULL enum cells require actual label OIDs for hashing; portable ordinal labels alone defer. Empty arrays and NULL cells remain known.',
        owner: 'tests/sql-semantics/check-array-hash-state.test.ts',
      },
    ]
  const context = nativeHashContext(item)
  if (!context) return null
  const floating =
    item.kind === 'function' &&
    ['pg_catalog.float4', 'pg_catalog.float8'].includes(item.args[0] ?? '')
  const owner =
    floating || (item.kind === 'function' && item.args[0] === 'pg_catalog.jsonb')
      ? 'tests/sql-semantics/check-scalar-hash.test.ts'
      : 'tests/sql-semantics/check-native-hash.test.ts'
  return [
    {
      kind: 'platform',
      requirement:
        'Byte-dependent hashes require declared PostgreSQL nativeByteOrder little or big; unspecified byte order retains results only when both agree.',
      owner,
    },
    ...(floating
      ? [
          {
            kind: 'platform',
            requirement:
              'NaN hashes use the PostgreSQL build canonical float8 NaN bit pattern; input NaN payload bits and byte order alone do not determine it.',
            owner,
          },
        ]
      : []),
    ...(context === 'text'
      ? [
          {
            kind: 'database',
            setting: 'server_encoding',
            requirement:
              'Non-ASCII hash input requires declared UTF8 server encoding; ASCII remains portable.',
            owner,
          },
        ]
      : []),
  ]
}

export function trigonometryValueRequirements(item: BuiltinCallable) {
  if (floatTrigonometry(item))
    return [
      {
        kind: 'platform',
        requirement:
          'Finite sin and cos results require the declared PostgreSQL fdlibm binary64 trigonometry profile; target-language math libraries do not establish that profile.',
        owner: 'tests/sql-semantics/check-float-trigonometry.test.ts',
      },
    ]
  return circlePolygonTrigonometry(item)
    ? [
        {
          kind: 'platform',
          requirement:
            'Circle coordinate generation requires the declared PostgreSQL fdlibm binary64 trigonometry profile; target-language math libraries do not establish that profile.',
          owner: 'tests/sql-semantics/check-circle-polygon.test.ts',
        },
      ]
    : null
}

export function characterValueRequirements(item: BuiltinCallable) {
  const operation = characterEncodingContext(item)
  if (!operation) return null
  return [
    {
      kind: 'database',
      setting: 'server_encoding',
      requirement:
        operation === 'ascii'
          ? 'Non-ASCII first characters require declared UTF8 for codepoint extraction and execution validity; empty/ASCII first characters, SQL NULL and incoming errors remain portable.'
          : 'Non-ASCII character construction requires declared UTF8; ASCII, SQL NULL, incoming errors and universally invalid codepoints remain definite.',
      owner: 'tests/sql-semantics/check-character-encoding.test.ts',
    },
  ]
}

export function textSearchValueRequirements(item: BuiltinCallable) {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog') return null
  const owner = 'tests/sql-semantics/check-text-search-boundaries.test.ts'
  if (
    [
      'tsquery_cmp',
      'tsquery_eq',
      'tsquery_ne',
      'tsquery_lt',
      'tsquery_le',
      'tsquery_gt',
      'tsquery_ge',
    ].includes(item.name) &&
    item.args.join(',') === 'pg_catalog.tsquery,pg_catalog.tsquery'
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Query ordering compares node count and stored size before tree structure and signed legacy operand CRCs. Reached unequal non-ASCII operands require declared UTF8 to derive those CRC bytes; ASCII, equal words and earlier deciding structure remain portable.',
        owner: 'tests/sql-semantics/check-tsquery-comparison-context.test.ts',
      },
      ...(item.name === 'tsquery_cmp'
        ? [
            {
              kind: 'platform',
              setting: 'memcmp',
              requirement:
                'A CRC collision between unequal non-prefix terms reaches the C library byte comparator. The raw comparator magnitude requires that implementation; Boolean relations and normalized ordering preserve its portable sign.',
              owner: 'tests/sql-semantics/check-tsquery-comparison.test.ts',
            },
          ]
        : []),
    ]
  if (['tsvectorsend', 'tsquerysend'].includes(item.name))
    return [
      {
        kind: 'session',
        setting: 'client_encoding',
        requirement:
          'Full-text binary output encodes lexeme operands for the client. ASCII bytes, strict NULLs and incoming errors remain available without an encoding declaration; non-ASCII bytes require the selected client encoding.',
        owner,
      },
    ]
  if (
    item.name === 'ts_stat' ||
    (item.name === 'ts_rewrite' && item.args.join(',') === 'pg_catalog.tsquery,pg_catalog.text')
  )
    return [
      {
        kind: 'database',
        setting: 'query',
        requirement:
          'Full-text statistics and SQL-driven rewriting execute the supplied query against deployment rows. Query text does not supply its results; rewriting with three supplied query values is a separate pure operation.',
        owner,
      },
    ]
  if (item.name === 'ts_parse' || item.name === 'ts_token_type')
    return [
      {
        kind: 'database',
        setting: 'text_search_parser',
        requirement:
          'The selected deployment parser and its token callbacks are required. Parser names and numeric OIDs alone do not contain that implementation.',
        owner,
      },
    ]
  if (item.name === 'ts_lexize')
    return [
      {
        kind: 'database',
        setting: 'text_search_dictionary',
        requirement:
          'The deployment dictionary implementation, options and resources determine lexemes. A supplied dictionary OID does not describe them.',
        owner,
      },
    ]
  if (
    ![
      'to_tsvector',
      'json_to_tsvector',
      'jsonb_to_tsvector',
      'to_tsquery',
      'plainto_tsquery',
      'phraseto_tsquery',
      'websearch_to_tsquery',
      'ts_headline',
      'ts_debug',
      'ts_match_tt',
      'ts_match_tq',
      'get_current_ts_config',
    ].includes(item.name)
  )
    return null
  return [
    {
      kind: 'database',
      setting: 'text_search_configuration',
      requirement:
        'Tokenization, dictionary mappings, dictionary implementations and resources belong to the deployment. Explicit configuration OIDs do not freeze those definitions; dictionary normalization is separate from raw tsvector/tsquery text grammar and operations on supplied values.',
      owner,
    },
    ...(item.args[0] !== 'pg_catalog.regconfig'
      ? [
          {
            kind: 'session',
            setting: 'default_text_search_config',
            requirement:
              'The overload selects the session default text-search configuration. Supplying an explicit configuration removes that session selection but still requires deployment configuration and dictionary definitions.',
            owner,
          },
        ]
      : []),
  ]
}

export function jsonValueRequirements(item: BuiltinCallable) {
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    [
      'jsonb_path_query',
      'jsonb_path_query_tz',
      'jsonpath_in',
      'jsonpath_out',
      'jsonpath_recv',
    ].includes(item.name)
  )
    return [
      {
        kind: 'interface',
        requirement: item.returnsSet
          ? 'Set-returning JSONPath query functions produce SQL rows and are forbidden in CHECK expressions. Scalar query_array and query_first calls retain sequence semantics within the value contract.'
          : 'JSONPath input/output use cstring and receive uses an internal server buffer. These are PostgreSQL interfaces, not portable SQL row types. Public JSONPath values, text I/O casts and binary send have separate value operations.',
        owner: 'tests/sql-semantics/check-jsonpath-context.test.ts',
      },
    ]
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    [
      'jsonb_path_exists',
      'jsonb_path_exists_opr',
      'jsonb_path_match',
      'jsonb_path_match_opr',
      'jsonb_path_query_array',
      'jsonb_path_query_first',
      'jsonb_path_exists_tz',
      'jsonb_path_match_tz',
      'jsonb_path_query_array_tz',
      'jsonb_path_query_first_tz',
    ].includes(item.name)
  )
    return [
      {
        kind: 'representation',
        requirement:
          'Execution uses original-source graphs or provably unambiguous stored JSONPath text; lossy PostgreSQL rendering cannot recover arbitrary query identity.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Order-sensitive traversal over non-ASCII object keys, non-ASCII string predicates and encoding-sensitive keyvalue object offsets require declared UTF8. ASCII predicates, proven alignment and encoding-independent terminal Boolean facts remain portable.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
      {
        kind: 'implementation',
        requirement:
          'Structural traversal, variables, arithmetic, subscript expressions, filters/current scopes, comparisons, starts-with, exists and three-valued Boolean predicates are implemented. Core type/size/abs/floor/ceiling/double methods and integer/bigint/boolean/number/decimal/string conversions are implemented. Keyvalue objects preserve document/variable/generated identities, logical offsets, signed-word wrapping, unknown-id projections and format-limit errors. Default ISO datetime/date/time/time_tz/timestamp/timestamp_tz methods retain typed intermediates, precision, original-offset rendering, comparisons and hard versus suppressible errors. Numeric calendar/clock datetime templates support strict separators, quoted literals, compact widths, short/grouped years, century/era, Gregorian/ISO weeks, day-of-year, Julian dates, fractions, numeric offsets and distinct template/value errors. English month/day names, Roman months and 12-hour clocks are implemented. Translated names retain locale requirements. Platform-dependent float input forms retain Unknown requirements. Stored-text inversion conservatively defers complex arithmetic/predicate accessor grouping; exact source graphs preserve query identity.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
      {
        kind: 'database',
        setting: 'database default collation / LC_CTYPE / server_encoding',
        requirement:
          'Regex matching uses the database default collation independently of expression collations. Declare C ordering separately from C or C.UTF-8 character classification; C ordering does not imply ASCII character classes. Case-sensitive quoted literals bypass collation. Non-ASCII matching requires UTF8. Locale-neutral patterns require no character-type declaration. Other supported patterns use classic C character types, explicitly supplied target class/case tables, or ASCII subjects and patterns under C.UTF-8. A locale name does not select portable Unicode tables.',
        owner: 'tests/sql-semantics/check-jsonpath-regex-context.test.ts',
      },
      {
        kind: 'implementation',
        requirement:
          'Regex predicates reuse the maintained engine with JSONPath flags, strict/lax sequence semantics, three-valued non-string handling, lazy guards and hard regex errors. Explicit target character profiles implement directional Unicode casing, classes, ranges, boundaries and backreferences without host Unicode APIs. Missing target facts are database requirements; unsupported engine syntax and capacity remain implementation gaps.',
        owner: 'tests/sql-semantics/check-jsonpath-regex.test.ts',
      },
      {
        kind: 'session',
        setting: 'lc_time / database default collation',
        requirement:
          'Translated month/day template fields consume declared C time locale and C default collation through fixed English lists and ASCII case folding. Missing locale/collation facts defer only at a reached translated field; preceding format, literal and date-mode errors remain definite. Plain English fields, Roman months and AM/PM do not require translated locale data.',
        owner: 'tests/sql-semantics/check-jsonpath-template-locale.test.ts',
      },
      {
        kind: 'platform-input',
        requirement:
          'The first Y,YYY year group uses C scanf %d. Values outside the signed integer range require a C library conversion contract; bounded groups and checked year arithmetic remain portable.',
        owner: 'tests/sql-semantics/check-jsonpath-templates.test.ts',
      },
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Declared session TimeZone drives scalar JSONPath temporal conversions and cross-type comparisons through the shared timezone resolver, including DST gaps/folds and fixed-offset clock attachment. Missing timezone providers defer when reached; non-_tz forbidden operations retain hard errors despite silent.',
        owner: 'tests/sql-semantics/check-jsonpath-timezone.test.ts',
      },
      {
        kind: 'transaction',
        setting: 'local_date',
        requirement:
          'Bare time attachment, mixed time/timetz comparisons in variable-offset zones and nonconstant dynamic abbreviations on bare clocks require transaction local date. A configured timezone does not provide that date; invariant forced offsets remain available without it.',
        owner: 'tests/sql-semantics/check-jsonpath-timezone.test.ts',
      },
      {
        kind: 'session',
        setting: 'timezone_abbreviations',
        requirement:
          'Alphabetic ISO and TZ template suffixes use declared Default definitions and known session labels, retaining prefix consumption, numeric/abbreviation field order, fixed offsets and dated dynamic abbreviations. Undeclared registries remain unavailable; dynamic bare-clock offsets require transaction date unless their forced offset is invariant.',
        owner: 'tests/sql-semantics/check-jsonpath-abbreviations.test.ts',
      },
    ]
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 1 &&
    item.result === 'pg_catalog.bytea' &&
    ((item.name === 'json_send' && item.args[0] === 'pg_catalog."json"') ||
      (item.name === 'jsonb_send' && item.args[0] === 'pg_catalog.jsonb') ||
      (item.name === 'jsonpath_send' && item.args[0] === 'pg_catalog.jsonpath'))
  ) {
    const requirements = [
      {
        kind: 'session',
        setting: 'client_encoding',
        requirement:
          'Non-ASCII binary output and encoding conversion errors require client_encoding; ASCII bytes and strict NULL/error propagation remain portable. JSON preserves source text; JSONB and JSONPath send version 1 and their canonical rendering.',
        owner:
          item.name === 'jsonpath_send'
            ? 'tests/sql-semantics/check-jsonpath-sql.test.ts'
            : 'tests/sql-semantics/check-json-binary.test.ts',
      },
    ]
    if (item.name === 'jsonb_send')
      requirements.push({
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'JSONB canonical rendering inherits server_encoding requirements for ordering multiple nonempty object keys containing non-ASCII text.',
        owner: 'tests/sql-semantics/check-json-binary.test.ts',
      })
    return requirements
  }
  const builder = isJsonbBuilder(item) && item.args.length === 1
  if (
    builder ||
    (item.kind === 'function' &&
      item.schema === 'pg_catalog' &&
      item.name === 'to_jsonb' &&
      item.strict &&
      item.volatility === 's' &&
      !item.returnsSet &&
      item.args.length === 1 &&
      item.args[0] === 'pg_catalog.anyelement' &&
      item.result === 'pg_catalog.jsonb')
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement: builder
          ? 'Builder arguments share scalar JSON conversion requirements. Non-ASCII Unicode escapes and fixed JSONB container storage bounds can require server_encoding; builders admit the new container even when its inputs are existing JSONB values.'
          : 'JSON text conversion shares Unicode decoding and JSONB stored-format admission requirements. Non-ASCII Unicode escapes can require server_encoding; existing JSONB values pass through without rendering or new admission.',
        owner: builder
          ? 'tests/sql-semantics/check-jsonb-builders.test.ts'
          : 'tests/sql-semantics/check-jsonb-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'extra_float_digits',
        requirement:
          'Float values, keys and geometric coordinates use supplied extra_float_digits. Without that setting, recover invariant text and JSONB numbers whose normalized value and display scale agree across supported settings; differing results defer. Raw JSON and object keys preserve spelling, including signed zero.',
        owner: 'tests/sql-semantics/check-json-float-output.test.ts',
      },
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Finite timestamptz JSON values and keys use the declared TimeZone through scalar and nested conversions, independently of DateStyle. Missing TimeZone defers finite strings; SQL NULL and both infinities remain definite. Date and timestamp JSON output retains independent ISO formatting.',
        owner: 'tests/sql-semantics/check-timestamptz-output.test.ts',
      },
      {
        kind: 'session',
        setting: 'bytea_output',
        requirement:
          'Bytea conversion uses declared bytea_output for scalar, container and JSON output. Hex and escape produce different JSON strings even for empty bytea; missing context defers output bytes. SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-bytea-output.test.ts',
      },
      {
        kind: 'session',
        setting: 'IntervalStyle',
        requirement:
          'Finite interval conversion uses declared IntervalStyle for postgres, postgres_verbose, sql_standard or iso_8601 output, shared with scalar casts and containers. Missing context defers output bytes; SQL NULL, errors and both infinities remain definite.',
        owner: 'tests/sql-semantics/check-interval-output.test.ts',
      },
      {
        kind: 'session',
        setting: 'lc_monetary',
        requirement:
          'Money JSON conversion uses declared C moneyLocale formatting. Without supported locale metadata, non-NULL values defer; fractional-digit context alone does not supply text formatting. SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-money-text-context.test.ts',
      },
      {
        kind: 'database',
        setting: 'catalog',
        requirement:
          'Nonzero OID-alias rendering and non-NULL enum conversion require catalog or user-defined JSON-cast data. Supplied values do not trigger local lookup; zero alias sentinels, SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
    ]

  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'jsonb_concat' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args.every((type) => type === 'pg_catalog.jsonb') &&
    item.result === 'pg_catalog.jsonb'
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Concatenation can require server_encoding at the fixed JSONB storage limit when non-ASCII bytes or object key ordering affect result size; ordinary results inside the bound and same-kind empty-container passthroughs remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-storage.test.ts',
      },
    ]

  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args.every((type) => type === 'pg_catalog.jsonb') &&
    ['jsonb_cmp', 'jsonb_lt', 'jsonb_le', 'jsonb_gt', 'jsonb_ge'].includes(item.name)
  )
    return [
      {
        kind: 'database',
        setting: 'default_collation',
        requirement:
          'Generated JSONB ordering requires an explicit database default collation C declaration.',
        owner: 'tests/sql-semantics/check-jsonb-ordering.test.ts',
      },
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Generated JSONB ordering requires an explicit UTF8 server encoding declaration for string comparison and object key traversal.',
        owner: 'tests/sql-semantics/check-jsonb-ordering.test.ts',
      },
    ]

  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.jsonb' &&
    ((item.name === 'jsonb_out' &&
      item.args.length === 1 &&
      item.result === 'pg_catalog.cstring') ||
      jsonbTextRenderingContext(item))
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Text rendering of objects with multiple nonempty keys including non-ASCII keys can require server_encoding for key ordering; logical values, type inspection and SQL nullness remain portable.',
        owner:
          item.name === 'jsonb_out'
            ? 'tests/sql-semantics/check-jsonb-payload.test.ts'
            : item.name === 'jsonb_pretty'
              ? 'tests/sql-semantics/check-jsonb-format.test.ts'
              : item.name === 'jsonb_extract_path_text'
                ? 'tests/sql-semantics/check-json-array-paths.test.ts'
                : 'tests/sql-semantics/check-jsonb-extraction.test.ts',
      },
    ]

  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    item.args.length !== 2 ||
    item.args[0] !== 'pg_catalog."json"'
  )
    return null
  const field =
    ['json_object_field', 'json_object_field_text'].includes(item.name) &&
    item.args[1] === 'pg_catalog.text'
  const element =
    ['json_array_element', 'json_array_element_text'].includes(item.name) &&
    item.args[1] === 'pg_catalog.int4'
  if (!(field || element) || !['pg_catalog."json"', 'pg_catalog.text'].includes(item.result))
    return null
  return [
    {
      kind: 'database',
      setting: 'server_encoding',
      requirement:
        'Whole-document extraction decodes every JSON string. Non-ASCII Unicode escapes require server_encoding; raw Unicode and ASCII escapes remain portable, and earlier definite decoding errors are preserved.',
      owner: 'tests/sql-semantics/check-json-extraction.test.ts',
    },
  ]
}

export function rangeValueRequirements(item: BuiltinCallable) {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    !(
      (item.name === 'range_intersect_agg_transfn' &&
        item.args.join(',') === 'pg_catalog.anyrange,pg_catalog.anyrange' &&
        item.result === 'pg_catalog.anyrange') ||
      (item.name === 'multirange_intersect_agg_transfn' &&
        item.args.join(',') === 'pg_catalog.anymultirange,pg_catalog.anymultirange' &&
        item.result === 'pg_catalog.anymultirange')
    )
  )
    return null
  return [
    {
      kind: 'execution',
      requirement:
        'Requires aggregate execution context. Direct non-NULL CHECK calls raise XX000 before reading range contents; catalog strictness preserves NULL results. Aggregate expressions and set-returning expansion are forbidden in CHECKs.',
      owner: 'tests/sql-semantics/check-range-callable-boundaries.test.ts',
    },
  ]
}

export function aclitemValueRequirements(item: BuiltinCallable) {
  const identity = callableIdentity(item),
    io = builtinTypeIO('pg_catalog.aclitem')
  if (identity === io?.input || identity === io?.output) {
    const requirements = [
      {
        kind: 'database',
        setting: 'role_catalog',
        requirement:
          'ACL input resolves nonempty role names and an omitted grantor against the deployment. Output renders role names from that catalog, with numeric fallback for missing identities. Supplied ACL words do not perform authorization. Strict NULLs, incoming errors, input grammar errors reached before lookup and known non-NULL output remain available without role resolution.',
        owner: 'tests/sql-semantics/check-aclitem-text.test.ts',
      },
    ]
    if (identity === io?.input)
      requirements.push(
        {
          kind: 'platform',
          setting: 'maxIdentifierBytes',
          requirement:
            'Identifier length checks use the declared target maximum byte length. Earlier syntax failures without identifier contents remain definite without that build setting.',
          owner: 'tests/sql-semantics/check-aclitem-text.test.ts',
        },
        {
          kind: 'database',
          setting: 'server_encoding',
          requirement:
            'Non-ASCII identifier byte counts require declared UTF8. ASCII parsing does not depend on an encoding assumption.',
          owner: 'tests/sql-semantics/check-aclitem-text.test.ts',
        },
      )
    return requirements
  }
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'pg_get_acl' &&
    item.args.join(',') === 'pg_catalog.oid,pg_catalog.oid,pg_catalog.int4' &&
    item.result === 'pg_catalog._aclitem'
  )
    return [
      {
        kind: 'database',
        setting: 'catalog',
        requirement:
          'ACL retrieval reads the target object catalog and current stored privileges. Supplied class/object/subobject identifiers do not provide that catalog state.',
        owner: 'tests/sql-semantics/check-measurements.test.ts',
      },
    ]
  return null
}

export function temporalRuntimeRequirements(item: BuiltinCallable) {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog' || item.returnsSet || !item.strict)
    return null
  const owner = 'tests/sql-semantics/check-temporal-runtime.test.ts'
  if (
    item.name === 'age' &&
    item.volatility === 's' &&
    item.result === 'pg_catalog."interval"' &&
    item.args.length === 1 &&
    ['pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(item.args[0]!)
  )
    return [
      {
        kind: 'transaction',
        setting: 'local_date',
        requirement:
          'One-argument calendar age subtracts its input from the transaction current local date at midnight. A supplied timezone alone does not provide that date; do not freeze a generation-time or client-clock sample.',
        owner,
      },
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'The transaction instant determines current_date in the session timezone. The instant overload also converts that local midnight and decomposes its input in that timezone. Strict NULL and infinite inputs have native context-independent outcomes; finite evaluation remains deferred without runtime state.',
        owner,
      },
    ]
  const matches = (names: readonly string[], args: readonly string[], volatility = 's') =>
    names.includes(item.name) &&
    item.volatility === volatility &&
    item.result === 'pg_catalog.timestamptz' &&
    item.args.length === args.length &&
    item.args.every((arg, index) => arg === args[index])
  if (matches(['now', 'transaction_timestamp'], []))
    return [
      {
        kind: 'transaction',
        setting: 'start_timestamp',
        requirement:
          'Read the active PostgreSQL transaction start instant. These aliases agree throughout a transaction; timezone and static execution settings do not supply the instant.',
        owner,
      },
    ]
  if (matches(['statement_timestamp'], []))
    return [
      {
        kind: 'statement',
        setting: 'start_timestamp',
        requirement:
          'Read the active PostgreSQL statement start instant, which can change between commands in the same transaction. A transaction timestamp does not supply statement state.',
        owner,
      },
    ]
  const timeofday =
    item.name === 'timeofday' &&
    item.volatility === 'v' &&
    item.result === 'pg_catalog.text' &&
    item.args.length === 0
  if (matches(['clock_timestamp'], [], 'v') || timeofday)
    return [
      {
        kind: 'execution',
        setting: 'wall_clock',
        requirement:
          'Read the PostgreSQL wall clock at this invocation; the value can change within a statement. A target-language clock or cached transaction, statement or generation-time sample is not the server clock.',
        owner,
      },
      ...(timeofday
        ? [
            {
              kind: 'session',
              setting: 'TimeZone',
              requirement:
                'The legacy textual clock renders the live instant in the session timezone with native English names. Supplying a timezone does not provide the live instant.',
              owner,
            },
          ]
        : []),
    ]
  if (matches(['pg_postmaster_start_time', 'pg_conf_load_time'], []))
    return [
      {
        kind: 'database',
        setting: item.name === 'pg_conf_load_time' ? 'configuration_load' : 'server_start',
        requirement:
          'Read the server lifecycle timestamp. Configuration-load time can reflect the current backend reload; neither timestamp is derivable from row values or static settings.',
        owner,
      },
    ]
  if (matches(['pg_last_xact_replay_timestamp'], [], 'v'))
    return [
      {
        kind: 'database',
        setting: 'replication_replay',
        requirement:
          'Read the most recently replayed transaction timestamp, including the native NULL result when unavailable. Local absence of replay is not a portable database assumption.',
        owner,
      },
    ]
  if (matches(['pg_xact_commit_timestamp'], ['pg_catalog.xid'], 'v'))
    return [
      {
        kind: 'database',
        setting: 'commit_timestamp_history',
        requirement:
          'Read commit-timestamp tracking configuration and retained transaction history. Supplied transaction words alone do not provide commit times, NULL decisions or reached native errors.',
        owner,
      },
    ]
  if (
    matches(
      [
        'pg_stat_get_backend_activity_start',
        'pg_stat_get_backend_start',
        'pg_stat_get_backend_xact_start',
      ],
      ['pg_catalog.int4'],
    ) ||
    matches(
      [
        'pg_stat_get_db_checksum_last_failure',
        'pg_stat_get_db_stat_reset_time',
        'pg_stat_get_last_analyze_time',
        'pg_stat_get_last_autoanalyze_time',
        'pg_stat_get_last_autovacuum_time',
        'pg_stat_get_last_vacuum_time',
        'pg_stat_get_lastscan',
      ],
      ['pg_catalog.oid'],
    ) ||
    matches(
      [
        'pg_stat_get_bgwriter_stat_reset_time',
        'pg_stat_get_checkpointer_stat_reset_time',
        'pg_stat_get_snapshot_timestamp',
      ],
      [],
    )
  )
    return [
      {
        kind: 'database',
        setting: 'statistics',
        requirement:
          'Read backend, object or shared statistics and their snapshot/reset state. Object identifiers remain deployment-local. Native NULLs for absent entries or invalid backend slots do not establish a universal result; strict NULL arguments remain independent.',
        owner,
      },
    ]
  return null
}

export function temporalArithmeticRequirements(item: BuiltinCallable) {
  if (isTemporalDatePart(item))
    return [
      {
        kind: 'build',
        setting: 'maxIdentifierBytes',
        requirement:
          'The SQL date wrapper inlines column calls, casting the date before the inner callback decodes units or applies its NULL gate. Literal NULL arguments retain native pruning. Unit names use the declared identifier byte limit; no session timezone is read.',
        owner: 'tests/sql-semantics/check-temporal-scalars.test.ts',
      },
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Non-ASCII temporal unit clipping requires declared UTF8. ASCII unit names and preceding date-cast errors retain independent results.',
        owner: 'tests/sql-semantics/check-temporal-scalars.test.ts',
      },
    ]

  if (isTemporalInstantAge(item))
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Instant calendar age decomposes both instants in the session timezone, borrows from the local month of the earlier instant and preserves UTC operand ordering across local folds. Equal finite instants, infinities, strict NULLs and input errors retain independent results.',
        owner: 'tests/sql-semantics/check-instant-age.test.ts',
      },
    ]

  if (isTemporalTemplateParsing(item))
    return [
      {
        kind: 'session',
        setting: 'TimeZone / timezone_abbreviations',
        requirement:
          'Named TZ fields use session abbreviation prefixes before the declared registry. Instant results without explicit offsets require session timezone. Date results discard validated offsets; numeric date fields retain independent results.',
        owner: 'tests/sql-semantics/check-datetime-templates.test.ts',
      },
      {
        kind: 'session',
        setting: 'lc_time / input collation / server_encoding',
        requirement:
          'Translated TM month/day names require declared locale and casing. Fixed-width parsing counts encoded bytes; ordinary ASCII fields and English names retain independent results.',
        owner: 'tests/sql-semantics/check-datetime-templates.test.ts',
      },
      {
        kind: 'platform-input',
        requirement:
          'An overflowing first Y,YYY scanf integer requires a C conversion contract; bounded year groups and checked calendar arithmetic remain portable.',
        owner: 'tests/sql-semantics/check-datetime-templates.test.ts',
      },
    ]

  if (isTemporalTimestampFormatting(item))
    return [
      ...(item.args[0] === 'pg_catalog.timestamptz'
        ? [
            {
              kind: 'session',
              setting: 'TimeZone',
              requirement:
                'Instant template fields require session timezone; fractions, literal-only templates, NULLs and infinities retain independent results.',
              owner: 'tests/sql-semantics/check-timestamp-format.test.ts',
            },
          ]
        : []),
      ...(item.args[0] === 'pg_catalog.timestamptz'
        ? [
            {
              kind: 'platform',
              setting: 'weekday-name-table-layout',
              requirement:
                'Before Julian zero, native timestamp template weekdays can be negative and index outside the weekday-name table. Retain numeric weekday arithmetic and defer those reached name lookups rather than reproducing build-specific adjacent strings.',
              owner: 'tests/sql-semantics/check-timestamp-format.test.ts',
            },
          ]
        : []),
      {
        kind: 'session',
        setting: 'lc_time',
        requirement:
          'Only localized TM month/day names require locale and collation casing. Numeric fields and ordinary English names retain independent results. The declared C time locale provides portable English localized names.',
        owner: 'tests/sql-semantics/check-timestamp-format.test.ts',
      },
    ]

  if (isTemporalInstantPeriod(item))
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Instant range checks validate interval sign before boundary arithmetic; duration overlaps evaluate their native endpoint arithmetic before overlap decisions. Calendar interval components require declared timezone. Elapsed clocks, infinities, NULLs and arithmetic/validation errors retain independent results where known.',
        owner: 'tests/sql-semantics/check-instant-periods.test.ts',
      },
    ]

  if (isTemporalInstantConstructor(item) && item.args.length !== 7)
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Date-plus-clock and calendar field instant constructors validate their native local timestamp before timezone conversion. NULLs, infinities and local construction errors retain independent results without timezone context.',
        owner: 'tests/sql-semantics/check-instant-constructors.test.ts',
      },
    ]

  if (isTemporalLocalTimezone(item) && item.args[0] !== 'pg_catalog.timetz')
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Local timestamp/instant timezone aliases resolve through the selected native cast semantics with the declared session timezone. Preserve NULLs, infinities, stored boundaries and context-independent errors.',
        owner: 'tests/sql-semantics/check-local-timezone.test.ts',
      },
    ]

  if (isTemporalContextComparison(item))
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Mixed local date/timestamp and instant comparisons resolve local calendars in the declared session timezone. Preserve optional conversion overflow ordering, true infinities, source-calendar errors and context-independent ordering/equality facts.',
        owner: 'tests/sql-semantics/check-temporal-context-comparison.test.ts',
      },
    ]
  if (isTemporalSessionExtraction(item))
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Finite calendar and offset fields project the instant into the declared session timezone. UTC epoch, infinities, strict NULL and unit errors retain independent results without timezone context.',
        owner: 'tests/sql-semantics/check-timestamptz-extract.test.ts',
      },
      {
        kind: 'build',
        setting: 'maxIdentifierBytes',
        requirement:
          'Extraction unit identifiers are truncated using the deployment byte limit before native field decoding.',
        owner: 'tests/sql-semantics/check-timestamptz-extract.test.ts',
      },
    ]
  if (isTemporalSessionTruncation(item))
    return [
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Session timestamptz truncation projects into the declared timezone and resolves offsets again for calendar units. Unit errors, infinities, NULLs and fine-grained truncation within offset-independent bounds retain definite results without timezone context.',
        owner: 'tests/sql-semantics/check-session-trunc.test.ts',
      },
      {
        kind: 'build',
        setting: 'maxIdentifierBytes',
        requirement:
          'Temporal unit identifiers are truncated to the deployment byte limit before native token decoding.',
        owner: 'tests/sql-semantics/check-session-trunc.test.ts',
      },
    ]
  const localClock = isTemporalLocalTimezone(item) && item.args[0] === 'pg_catalog.timetz'
  if (isTemporalExplicitZoneLookup(item) || localClock) {
    const owner = isTemporalInstantConstructor(item)
      ? 'tests/sql-semantics/check-instant-constructors.test.ts'
      : localClock
        ? 'tests/sql-semantics/check-local-timezone.test.ts'
        : isTemporalClockZoneLookup(item)
          ? 'tests/sql-semantics/check-timetz-zone.test.ts'
          : item.name === 'timezone'
            ? 'tests/sql-semantics/check-timezone-conversions.test.ts'
            : item.name === 'date_trunc'
              ? 'tests/sql-semantics/check-temporal-zone-lookup.test.ts'
              : 'tests/sql-semantics/check-temporal-zone-arithmetic.test.ts'
    return [
      ...(isTemporalInstantConstructor(item)
        ? [
            {
              kind: 'database',
              setting: 'server_encoding',
              requirement:
                'Non-ASCII constructor timezone text clipping requires declared UTF8. ASCII numeric offsets and early calendar errors retain independent results.',
              owner,
            },
          ]
        : []),
      ...(isTemporalClockZoneLookup(item) || localClock
        ? [
            {
              kind: 'transaction',
              setting: 'transaction_start',
              requirement:
                'Variable full-zone or forced-abbreviation offsets use the transaction start instant. Fixed offsets and constant forced histories remain definite without a client clock.',
              owner,
            },
          ]
        : []),
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Reached timezone-name lookup consults session abbreviation definitions before the registry and tzdb, including the local-timetz alias. Explicit instant constructors decode signed ISO numeric offsets before name lookup.',
        owner,
      },
      {
        kind: 'session',
        setting: 'timezone_abbreviations',
        requirement:
          'The declared Default profile supplies matching fixed and dynamic abbreviation definitions; absent registry facts defer reached lookup.',
        owner,
      },
      {
        kind: 'build',
        setting: 'maxIdentifierBytes',
        requirement:
          'Abbreviation lookup truncates identifiers using the deployment byte limit before case conversion; full timezone fallback retains the clipped original name.',
        owner,
      },
      {
        kind: 'session',
        setting: 'timezone_abbreviation_cache',
        requirement:
          'Distinct long session abbreviation names sharing the native cache prefix can depend on earlier lookups. Implicit POSIX rules and uncaptured timezone definitions remain separate boundaries.',
        owner,
      },
    ]
  }
  if (!isTemporalContextArithmetic(item)) return null
  return [
    {
      kind: 'session',
      setting: 'TimeZone',
      requirement:
        'Calendar interval months and days apply in the declared PostgreSQL session timezone, with native month clipping and separate timezone resolution after each step. Elapsed microseconds, NULLs and infinities retain context-independent results.',
      owner: 'tests/sql-semantics/check-timestamptz-arithmetic.test.ts',
    },
  ]
}

export function temporalCastRequirements(item: BuiltinCallable) {
  if (!isTemporalContextCast(item)) return null
  const requirements = [
    {
      kind: 'session',
      setting: 'TimeZone',
      requirement:
        'Finite temporal casts use the declared PostgreSQL session timezone and matching timezone data. NULLs, infinities and context-independent range failures retain native results without the setting.',
      owner: 'tests/sql-semantics/check-temporal-cast-context.test.ts',
    },
  ]
  if (item.args[0] === 'pg_catalog."time"')
    requirements.push({
      kind: 'transaction',
      setting: 'local_date',
      requirement:
        'Time-to-timetz resolves the supplied clock on the transaction local date. Globally constant timezone offsets do not need that date; variable offsets defer when it is unavailable. No client clock is consulted.',
      owner: 'tests/sql-semantics/check-temporal-cast-context.test.ts',
    })
  return requirements
}

export function intervalOutputRequirements(item: BuiltinCallable) {
  if (
    item.kind !== 'function' ||
    callableIdentity(item) !== builtinTypeIO('pg_catalog."interval"')?.output
  )
    return null
  return [
    {
      kind: 'session',
      setting: 'IntervalStyle',
      requirement:
        'Interval text and nested output use the declared style. Known finite values retain non-NULL output without context; SQL NULLs, infinities, child errors and skipped branches retain ordinary semantics.',
      owner: 'tests/sql-semantics/check-interval-output.test.ts',
    },
  ]
}

export function calendarOutputRequirements(item: BuiltinCallable) {
  if (
    item.kind !== 'function' ||
    !['pg_catalog.date', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz'].some(
      (type) => builtinTypeIO(type)?.output === callableIdentity(item),
    )
  )
    return null
  if (item.args[0] === 'pg_catalog.timestamptz')
    return [
      {
        kind: 'session',
        setting: 'DateStyle',
        requirement:
          'SQL text and nested timestamptz output uses declared DateStyle formatting and ordering. JSON uses ISO formatting independently of that setting. Missing format retains known finite scalar nullness.',
        owner: 'tests/sql-semantics/check-timestamptz-output.test.ts',
      },
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Finite timestamptz SQL output uses the declared session timezone, historical offset and abbreviation transitions and future rules. Missing timezone defers bytes while retaining finite non-NULL state; NULLs, infinities and child errors remain definite.',
        owner: 'tests/sql-semantics/check-timestamptz-output.test.ts',
      },
    ]
  return [
    {
      kind: 'session',
      setting: 'DateStyle',
      requirement:
        'Date and timestamp SQL text and nested output use the declared DateStyle format and field order. Finite known values retain non-NULL output without it; NULLs, infinities and child errors remain definite. Direct JSON calendar conversion retains its independent ISO rendering.',
      owner: 'tests/sql-semantics/check-calendar-output.test.ts',
    },
  ]
}

export function byteaOutputRequirements(item: BuiltinCallable) {
  if (
    item.kind !== 'function' ||
    callableIdentity(item) !== builtinTypeIO('pg_catalog.bytea')?.output
  )
    return null
  return [
    {
      kind: 'session',
      setting: 'bytea_output',
      requirement:
        'Bytea text casts and nested output use declared hex or escape formatting. Missing context retains bounded known-byte scalar non-NULL state while differing bytes defer; strict NULLs, child errors and skipped branches remain definite.',
      owner: 'tests/sql-semantics/check-bytea-output.test.ts',
    },
  ]
}

export function floatOutputRequirements(item: BuiltinCallable) {
  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    item.args.length !== 1 ||
    !['pg_catalog.float4', 'pg_catalog.float8'].includes(item.args[0]!) ||
    builtinTypeIO(item.args[0]!)?.output !== callableIdentity(item)
  )
    return null
  return [
    {
      kind: 'session',
      setting: 'extra_float_digits',
      requirement:
        'Scalar float text casts use the declared rendering precision. Without that setting, results invariant across supported settings remain exact; differing output defers. Strict NULLs, child errors and skipped branches retain their ordinary semantics.',
      owner: 'tests/sql-semantics/check-float-text-casts.test.ts',
    },
  ]
}

export function nameValueRequirements(item: BuiltinCallable) {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog') return null
  const input =
    callableIdentity(item) === builtinTypeIO('pg_catalog.name')?.input ||
    (item.name === 'name' &&
      item.result === 'pg_catalog.name' &&
      item.args.length === 1 &&
      ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog."varchar"'].includes(item.args[0]!))
  if (!input) return null
  return [
    {
      kind: 'platform',
      setting: 'maxIdentifierBytes',
      requirement:
        'Nonempty name input clips at the explicitly declared target identifier byte limit. Empty text and strict NULLs do not require a limit. Public SQL-coerced name payloads already retain their stored contents.',
      owner: 'tests/sql-semantics/check-name-context.test.ts',
    },
    {
      kind: 'database',
      setting: 'server_encoding',
      requirement:
        'Non-ASCII name truncation requires declared UTF8 and clips only at character boundaries. ASCII input can use its declared byte limit independently.',
      owner: 'tests/sql-semantics/check-name-context.test.ts',
    },
  ]
}

export function moneyValueRequirements(item: BuiltinCallable) {
  const identity = callableIdentity(item)
  const io = builtinTypeIO('pg_catalog.money')
  if (identity === io?.input || identity === io?.output)
    return [
      {
        kind: 'session',
        setting: 'moneyLocale',
        requirement:
          'Money text I/O uses explicitly declared C monetary rules. Fractional-digit context alone does not supply currency symbols, signs, grouping or accepted syntax. Other or unavailable locale metadata defers dependent text behavior; context-free zero input and NULL/errors remain available.',
        owner: 'tests/sql-semantics/check-money-text-context.test.ts',
      },
    ]
  if (!isMoneyNumericConversion(item)) return null
  return [
    {
      kind: 'session',
      setting: 'moneyFractionDigits',
      requirement:
        'Numeric money casts use the effective fractional-digit count from target lc_monetary, supplied independently or implied by declared C monetary rules. Captured scale is independent of symbols and grouping; conversion to numeric preserves its display scale. NULLs, incoming errors, zero conversions into money and nonfinite numeric conversion errors remain definite without scale.',
      owner: 'tests/sql-semantics/check-money-numeric-context.test.ts',
    },
  ]
}

function xmlExportContext(item: BuiltinCallable): 'cursor' | 'query' | 'catalog' | null {
  if (item.kind !== 'function' || item.schema !== 'pg_catalog' || item.result !== 'pg_catalog.xml')
    return null
  if (['cursor_to_xml', 'cursor_to_xmlschema'].includes(item.name)) return 'cursor'
  if (['query_to_xml', 'query_to_xmlschema', 'query_to_xml_and_xmlschema'].includes(item.name))
    return 'query'
  if (
    ['table', 'schema', 'database'].some((scope) =>
      [scope + '_to_xml', scope + '_to_xmlschema', scope + '_to_xml_and_xmlschema'].includes(
        item.name,
      ),
    )
  )
    return 'catalog'
  return null
}

export function xmlValueRequirements(item: BuiltinCallable) {
  if (item.kind !== 'function') return null
  const signature = callableIdentity(item)
  const exportContext = xmlExportContext(item)
  if (exportContext)
    return [
      {
        kind: exportContext === 'cursor' ? 'session' : 'database',
        setting: exportContext,
        requirement:
          exportContext === 'cursor'
            ? 'XML cursor export reads the active portal and its tuple descriptor; fetching also advances portal position. Supplied refcursor text does not contain that state.'
            : exportContext === 'query'
              ? 'XML query export executes SQL against the target database and derives XML or schema from its rows and tuple descriptor. Query text alone does not supply those results.'
              : 'XML table, schema and database export reads deployment catalog definitions and visible rows. Relation identifiers and schema names require resolution in that deployment.',
        owner: 'tests/sql-semantics/check-xml-callable-boundaries.test.ts',
      },
    ]
  if (isXmlOptionPredicate(item))
    return [
      {
        kind: 'session',
        setting: 'xmloption',
        requirement:
          'The text well-formedness predicate follows declared document/content mode. Without a mode, matching parse results remain definite and differing results defer; explicit content/document predicates do not read xmloption.',
        owner: 'tests/sql-semantics/check-xml-well-formed-mode.test.ts',
      },
    ]
  if (isXmlXPathCallable(item)) {
    const requirements = [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Reached XPath parsing requires declared UTF8 and original XML storage when rendered bytes have erased a declaration; strict NULLs and earlier definite errors remain available.',
        owner: 'tests/sql-semantics/check-xml-xpath-context.test.ts',
      },
      {
        kind: 'execution',
        setting: 'xpathRecursionLimit',
        requirement:
          'Reached XPath compiler and evaluation recursion checks require the target XML library limit. Missing context defers those checks; supplied limits preserve native error order.',
        owner: 'tests/sql-semantics/check-xml-xpath-diagnostics.test.ts',
      },
      {
        kind: 'platform',
        setting: 'xpathPowerOfTenBits',
        requirement:
          'Exponent-dependent decimal conversion requires captured target PostgreSQL power words. Exact small-power paths do not require them; existence queries can still reach decimal conversion within their expression.',
        owner: 'tests/sql-semantics/check-xml-xpath-power-context.test.ts',
      },
    ]
    if (item.name === 'xpath')
      requirements.push(
        {
          kind: 'session',
          setting: 'extra_float_digits',
          requirement:
            'Numeric XML result bytes require the declared session float-output profile when profiles differ. Cardinality, non-NULL state and document/content facts remain available without those bytes.',
          owner: 'tests/sql-semantics/check-xml-xpath-nullness.test.ts',
        },
        {
          kind: 'platform',
          setting: 'xml_notation_order',
          requirement:
            'Document serialization with multiple DTD notations can depend on unavailable native enumeration order. No notation-order setting is exposed; result shape and known XML facts remain available while dependent bytes defer.',
          owner: 'tests/sql-semantics/check-xml-xpath-nullness.test.ts',
        },
      )
    return requirements
  }
  if (signature === builtinTypeIO('pg_catalog.xml')?.send)
    return [
      {
        kind: 'session',
        setting: 'client_encoding',
        requirement:
          'XML wire output requires declared UTF8 client encoding. Other encodings can change the XML declaration even for ASCII content; strict NULL and incoming errors remain available.',
        owner: 'tests/sql-semantics/check-xml-context.test.ts',
      },
    ]
  if (signature === builtinCast('pg_catalog.text', 'pg_catalog.xml')?.implementation)
    return [
      {
        kind: 'session',
        setting: 'xmloption',
        requirement:
          'Runtime text conversion uses declared document/content mode. Without it, values accepted in both modes remain available; mode-dependent acceptance and SQLSTATE defer. XMLPARSE has its own explicit mode.',
        owner: 'tests/sql-semantics/check-xml-context.test.ts',
      },
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Non-ASCII XML parsing requires declared UTF8. SQL-coerced storage casts preserve text without reparsing; rendered output cannot recover erased declarations.',
        owner: 'tests/sql-semantics/check-xml-context.test.ts',
      },
    ]
  return null
}

export function identifierQuoteRequirements(item: BuiltinCallable) {
  return isIdentifierQuote(item)
    ? [
        {
          kind: 'session',
          setting: 'quote_all_identifiers',
          requirement:
            'Identifier output uses the declared quoteAllIdentifiers setting. Names requiring quotes in both modes remain available without it; safe non-keyword names defer. PostgreSQL keyword categories determine which lowercase words require quotes.',
          owner: 'tests/sql-semantics/check-quote-ident.test.ts',
        },
      ]
    : null
}

export function callableBoundary(item: BuiltinCallable, represented: ReadonlySet<string>) {
  const categories: string[] = []
  const types = [...item.args, item.result]
  if (item.kind === 'aggregate' || item.kind === 'window') categories.push(item.kind)
  if (item.returnsSet) categories.push('set-returning')
  if (rangeValueRequirements(item)) categories.push('aggregate-execution-context')
  if (circlePolygonTrigonometry(item)) categories.push('platform-setting:trigonometry')
  if (types.some((type) => ['pg_catalog.internal', 'pg_catalog.cstring'].includes(type)))
    categories.push('internal-interface')
  if (item.volatility === 's') categories.push('session-or-database-state')
  if (item.volatility === 'v') categories.push('volatile')
  for (const requirement of textSearchValueRequirements(item) ?? [])
    categories.push(
      requirement.kind === 'session'
        ? `session-setting:${requirement.setting}`
        : requirement.kind === 'platform'
          ? `platform-setting:${requirement.setting}`
          : `database-state:${requirement.setting}`,
    )
  if (textOrderingRequirements(item))
    categories.push('database-setting:input_collation/default_collation')
  if (characterEncodingContext(item)) categories.push('database-setting:server_encoding')
  if (jsonbTextRenderingContext(item)) categories.push('database-setting:server_encoding')
  if (xmlValueRequirements(item)?.some((r) => r.setting === 'xmloption'))
    categories.push('session-setting:xmloption')
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    [
      'textsend',
      'namesend',
      'varcharsend',
      'bpcharsend',
      'json_send',
      'jsonb_send',
      'jsonpath_send',
      'xml_send',
    ].includes(item.name)
  )
    categories.push('session-setting:client_encoding')
  const xmlExport = xmlExportContext(item)
  if (xmlExport === 'cursor') categories.push('session-state:cursor')
  if (xmlExport === 'query') categories.push('database-state:query')
  if (xmlExport === 'catalog') categories.push('database-state:catalog')
  if (isXmlXPathCallable(item)) {
    categories.push(
      'database-setting:server_encoding',
      'execution-setting:xpathRecursionLimit',
      'platform-setting:xpathPowerOfTenBits',
    )
    if (item.name === 'xpath')
      categories.push('session-setting:extra_float_digits', 'platform-state:xml-notation-order')
  }
  if (!item.strict) categories.push('non-strict')
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    ['pg_current_snapshot', 'txid_current_snapshot'].includes(item.name)
  )
    categories.push('transaction-state:snapshot')
  if (isIdentifierQuote(item)) categories.push('session-setting:quote_all_identifiers')
  const geometricOutput =
    item.kind === 'function' &&
    item.args.length === 1 &&
    ['point', 'line', 'lseg', 'box', 'circle', 'path', 'polygon'].some(
      (type) => item.args[0] === 'pg_catalog.' + type,
    ) &&
    builtinTypeIO(item.args[0]!)?.output === callableIdentity(item)
  if (floatOutputRequirements(item) || geometricOutput)
    categories.push('session-setting:extra_float_digits')
  if (byteaOutputRequirements(item)) categories.push('session-setting:bytea_output')
  if (calendarOutputRequirements(item)) categories.push('session-setting:DateStyle')
  if (calendarOutputRequirements(item)?.some((r) => r.setting === 'TimeZone'))
    categories.push('session-setting:TimeZone')
  if (temporalCastRequirements(item)) categories.push('session-setting:TimeZone')
  for (const requirement of temporalRuntimeRequirements(item) ?? [])
    categories.push(
      `${requirement.kind}-${requirement.kind === 'session' ? 'setting' : 'state'}:${requirement.setting}`,
    )
  for (const requirement of temporalArithmeticRequirements(item) ?? [])
    categories.push(
      requirement.kind === 'transaction'
        ? `transaction-state:${requirement.setting}`
        : `${requirement.kind}-setting:${requirement.setting}`,
    )
  if (temporalCastRequirements(item)?.some((r) => r.kind === 'transaction'))
    categories.push('transaction-state:local_date')
  if (isMoneyNumericConversion(item)) categories.push('session-setting:moneyFractionDigits')
  for (const requirement of aclitemValueRequirements(item) ?? nameValueRequirements(item) ?? [])
    categories.push(
      requirement.kind === 'database' && ['catalog', 'role_catalog'].includes(requirement.setting)
        ? `database-state:${requirement.setting}`
        : `${requirement.kind}-setting:${requirement.setting}`,
    )
  if (moneyValueRequirements(item)?.some((r) => r.setting === 'moneyLocale'))
    categories.push('session-setting:moneyLocale')
  if (item.schema === 'pg_catalog' && item.volatility === 's' && types.includes('pg_catalog.money'))
    categories.push('session-setting:lc_monetary')
  if (item.schema === 'pg_catalog' && ['interval_in', 'interval_out'].includes(item.name))
    categories.push('session-setting:IntervalStyle')
  const missingTypes = [...new Set(types.filter((type) => !represented.has(type)))].sort()
  if (missingTypes.length) categories.push('new-representation')
  if (!categories.length) categories.push('pure-callable-candidate')
  return { categories, missingTypes }
}
