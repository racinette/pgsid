# CHECK operation source

The files under `src/operations/<schema>/` are maintained Rust implementations
of PostgreSQL callables. The crate mounts each schema as a Rust module. The
CHECK generator emits only control flow and calls to these functions. The
transpilation source graph preserves individual files, module ownership, and
module dependencies through parsing and target emission. Value wrappers and
expression semantics belong to the shared runtime module; schema implementations
import them. Keep schema-only helpers with their callables.

- Use the function name generated from the catalog's underlying `pg_proc`
  identity. Operators use their implementation function's identity. Do not add
  a hand-written signature map or an alias for an operator spelling.
- Keep each function within the syntax accepted by the CHECK transpiler. Each
  source file contains module items; imports and dependencies belong to the
  source graph. Do not add `mod`, `use`, macros, or conditional compilation to
  an operation file.
- Export callables and control flow helpers used across module boundaries with
  `pub fn`. Keep helpers used only inside a schema module private.
- Accept and return the concrete value wrappers in `src/values.rs`. Unknown
  input, SQL NULL, and SQL errors have distinct meanings. An operation must
  preserve them according to PostgreSQL behavior.
- Encode a five-character SQLSTATE as its base-36 integer in a named Rust
  constant. Target adapters decode that integer to five uppercase characters.
  Preserve an incoming error before considering unknown or NULL operands.
- Public constraint evaluators return SQL errors as values. Keep their condition
  descriptions in Rust; adapters decode SQLSTATE and attach constraint identity.
  Deferred evaluations carry a diagnostic message. Do not claim an exact cause
  when an Unknown value has already lost its provenance. Database write wrappers
  enforce rejection after reading the evaluator's result.
- Keep operation behavior in Rust. Go and TypeScript adapters only convert row
  values and expose the stable validator interface.
- Add a PostgreSQL/PGlite comparison for migrated behavior and exercise the
  same cases in Rust, generated Go, and generated TypeScript. Run
  `pnpm check-rust:check` from the repository root.
- Text equality and inequality accept deterministic collations after the
  binder resolves identity and explicit overrides. Ordering and other
  collation-sensitive operations require C. Text ordering compares Unicode
  scalars. Keep nondeterministic and conflicting collations unknown.
- Varchar values share owned text; binary relabels preserve their contents.
  Char comparisons use the same wrapper and ignore only trailing ASCII spaces.
  Equality accepts deterministic collations; ordering requires C. Inputs are
  already SQL-coerced. Raw bounded varchar and char query parameters defer until
  assignment coercion is modeled. Length-changing casts and casts out of char
  require separate conversion semantics.
- The operation parity command discovers the immutable, strict
  `int4 × int4 → bool`, `int8 × int8 → bool`, mixed `int4`/`int8` comparisons,
  `bool × bool → bool`, and `text × text → bool`
  implementations in the operation sources, including `starts_with`, plus
  `int2 × int2 → int2` and `int2 → int2` arithmetic, `int4 × int4 → int4`
  and `int4 → int4` arithmetic, mixed int2/int4 arithmetic returning int4,
  and `text → int4`, and integer casts from int2 to int4/int8 and from int4
  to int2/int8, plus int8 to int2/int4, and bigint arithmetic, unary
  signs, absolute value, and mixed int2/int4-to-int8 arithmetic.
  It tests these automatically.
- Int2 payloads use the existing i32 primitive, restricted to the PostgreSQL
  smallint range. Public inputs are already SQL-coerced; out-of-range values
  defer. Mixed comparisons widen in Rust before using int4 or int8 comparisons.
  Smallint arithmetic widens to i32, reuses integer operations, and range-checks
  each result before returning an int2. Preserve intermediate overflow even when
  a later operation would bring the value into range. Unary signs resolve through
  the catalog like binary operators. Mixed int2/int4 addition, subtraction,
  multiplication, and division widen the smallint operand and return int4.
  Integer casts resolve catalog-generated pg_cast links to maintained functions.
  Int2 widens to int4/int8; int4 widens to int8 or narrows to int2; int8 narrows
  to int2/int4. Narrowing checks the destination range before converting and
  returns SQLSTATE 22003 on overflow. Mixed int2/int8 and int4/int8 addition,
  subtraction, multiplication, and division widen the smaller operand and reuse
  bigint arithmetic. Integer call binding preserves exact overloads, then uses
  catalog-declared implicit widening casts and the unique candidate with the most
  exact argument types. Include noninteger candidates when checking ambiguity;
  defer ties and unsupported winners. Never narrow integers implicitly or use
  implementation availability to choose an overload. Raw CHECK expressions and
  PostgreSQL's stored definitions must agree. Run
  `tests/sql-semantics/check-integer-promotion.test.ts` for this boundary.
- Integer CASE results select their common type independently of the enclosing
  expression, considering ELSE before the WHEN arms. Use catalog implicit casts
  to widen each arm after its original computation. Preserve intermediate
  overflow, branch laziness, and typed NULLs. Run
  `tests/sql-semantics/check-integer-case.test.ts` for raw/stored parity.
- COALESCE is generated control flow with a common result type, including
  catalog integer widening and binary text/varchar relabels. Evaluate arguments
  once, from left to right, and advance only after SQL NULL. A known value,
  Unknown, or SQL error skips the remaining arguments. Retain Boolean CHECK
  expressions and concrete enum identity. Run
  `tests/sql-semantics/check-coalesce.test.ts` for raw/stored and partial-input
  parity, and the shipment defaults world for public row validation.
- Int8 payloads use Rust `i64`, Go `int64`, and TypeScript `bigint`. Write
  decimal Rust literals with an `i64` suffix. Widen an int4 payload with
  `as i64` into a distinct local before comparing it with an int8 payload.
  I64 arithmetic requires two explicitly typed operands and rejects overflow.
  Division truncates toward zero; remainder follows the dividend sign. Both
  reject zero divisors and the signed minimum with negative one. Variable
  negation is outside this subset. SQL bigint arithmetic checks the range before
  arithmetic. Negation uses zero minus the payload after rejecting the signed
  minimum; absolute value shares that negation. Preserve intermediate overflow
  even if a later operation would restore the range. SQL division returns 22012
  for zero and 22003 for minimum divided by negative one; SQL remainder returns
  zero for a divisor of negative one, bypassing the Rust primitive. Narrow with
  `as i32` only after checking the SQL range.
- Numeric payloads borrow exact decimal strings in `NumericValue`; Go uses
  strings and TypeScript accepts strings or the readonly wrapper. Inputs represent
  already-coerced SQL values. Reject target numeric objects and floating-point
  numbers at this boundary. Shared Rust validates decimal notation, exponents,
  digit separators, ASCII whitespace, and special values. Invalid or unsupported
  representations defer. Comparisons ignore display scale and signed zero;
  PostgreSQL orders negative infinity, finite values, positive infinity, then NaN,
  and equates NaNs. Numeric arithmetic, runtime casts, and precision coercion
  require separate slices. Run `tests/sql-semantics/check-numeric.test.ts` for
  native Rust and both target comparisons against PGlite.
- Inet and cidr share an immutable address payload with a family, prefix length,
  and sixteen-bit address words. Public row inputs use already SQL-coerced
  strings; the shared Rust parser handles IPv4, compressed IPv6, and embedded
  IPv4. CIDR literals also accept abbreviated/classful and hexadecimal IPv4,
  and reject host bits by deferring malformed representations. Invalid inputs
  defer, as do oversized spellings. Comparisons order family, common network
  bits, prefix length, then host bits. Containment and overlap compare network
  bits, and CIDR implicitly relabels to INET using the catalog binary cast.
  CASE and COALESCE promote mixed CIDR/INET arms to INET. Runtime text/varchar
  casts share the parser but return SQLSTATE 22P02 for malformed syntax or CIDR
  host bits. Already-coerced public inputs continue to defer malformed spellings.
  Addition and subtraction preserve the input prefix and check address overflow;
  address differences ignore prefixes, require equal families, and check the
  bigint range after PostgreSQL's address-width subtraction. Subtracting the
  minimum bigint offset retains PostgreSQL's two's-complement negation behavior.
  Inspection returns the family and prefix. Network extraction and INET-to-CIDR
  casts clear host bits; broadcast fills them. Netmask and hostmask return full
  address-width prefixes. INET mask changes preserve host bits, while CIDR mask
  changes clear them; negative one selects the family width and invalid lengths
  return 22023. Merge returns the smallest common network and rejects different
  families with 22023. Bitwise complement preserves the prefix; intersection and
  union use the longer input prefix, include host bits, and reject different
  families with 22023. Direct comparison preserves PGlite's whole-byte differences
  and prefix-length differences; partial-byte differences and family ordering use
  signed unit results. Larger/smaller select by this comparator and choose the
  second operand on ties. Hashes preserve PostgreSQL Jenkins mixing and seeded
  unsigned wrapping. Text output follows distinct host, cast, INET abbreviation,
  and CIDR abbreviation formatting. Binary send emits the PostgreSQL family,
  prefix, type flag, address size, and network-order bytes. Run
  `tests/sql-semantics/check-network.test.ts`,
  `tests/sql-semantics/check-network-functions.test.ts`,
  `tests/sql-semantics/check-network-bitwise.test.ts`,
  `tests/sql-semantics/check-network-order.test.ts`,
  `tests/sql-semantics/check-network-hash.test.ts`,
  `tests/sql-semantics/check-network-output.test.ts`, and the network access
  world for native/target and public INSERT parity.
- Macaddr and macaddr8 have distinct Copy wrappers over network-order sixteen-bit
  words. Comparisons use unsigned byte order and direct comparators return signed
  unit results. Public adapters accept SQL-coerced strings; malformed and oversized
  spellings defer. Runtime text/varchar casts return 22P02 for syntax and 22003 for
  invalid macaddr octets, preserving scanf's unsigned accumulation and int narrowing.
  Rust parsing preserves grouped macaddr forms, consistent macaddr8 separators,
  six-byte expansion with FF:FE, and macaddr8 trailing-character behavior. Spellings
  beyond the parser's input bound defer. Bitwise operations retain the full width;
  truncation keeps the first three bytes; set7bit sets the universal/local bit.
  Both inter-type casts are implicit in the catalog; narrowing requires middle
  FF:FE bytes and returns 22003 otherwise. CASE selects its type with ELSE first;
  COALESCE selects its first typed argument, preserving lazy casts. Ambiguous mixed
  comparisons defer. NULL tests, literals, IN, and BETWEEN reuse control flow.
  Text output uses lowercase colon-separated octets; MAC-to-text I/O casts use
  schema formatters without exposing PostgreSQL cstring as a public value. Binary
  send emits the raw six or eight bytes; hashes reuse PostgreSQL Jenkins mixing
  over those bytes and preserve every seed bit. Catalog integer widening applies
  to hash seed arguments. Internal receive and cstring callables remain outside
  the public value types. Run
  `tests/sql-semantics/check-macaddr.test.ts`,
  `tests/sql-semantics/check-macaddr-functions.test.ts`,
  `tests/sql-semantics/check-macaddr-output.test.ts`, and the network access world.
- UUID values use a Copy payload of eight network-order sixteen-bit words.
  Public row adapters accept SQL-coerced strings and defer malformed spellings;
  runtime text/varchar casts return 22P02 instead. Parsing permits optional braces,
  ASCII uppercase hex, and optional hyphens after each four-digit group, without
  trimming whitespace. Comparisons use byte order, and uuid_cmp preserves the
  first unequal octet's difference. Text output uses lowercase canonical groups.
  I/O casts use maintained Rust helpers rather than exposing cstring callables.
  Domains, literals, NULL tests, CASE, COALESCE, IN and BETWEEN share the wrapper.
  Binary send emits exactly sixteen bytes. Hashes reuse PostgreSQL Jenkins mixing
  over those bytes and preserve every seed bit; catalog widening supplies bigint
  seed arguments. Version extraction returns the version nibble for RFC variants
  whose top two bits are 10, and SQL NULL for all other variants. Timestamp
  extraction supports versions 1 and 7 of the same RFC variant, returning SQL
  NULL otherwise. Version 1 truncates Gregorian-epoch 100-nanosecond ticks to
  microseconds before adjusting the epoch; version 7 converts Unix milliseconds
  and ignores the remaining bits. Random generation requires a volatility
  assessment. Run `tests/sql-semantics/check-uuid.test.ts`,
  `tests/sql-semantics/check-uuid-output.test.ts`,
  `tests/sql-semantics/check-uuid-timestamp.test.ts`, and the device identifiers world.
- Text payloads own Rust `String`, lowered to immutable strings in both targets.
  Builders mutate only local strings through character or borrowed-text appends.
  Explicit wrapper clones preserve Rust ownership when generated branches reuse
  text; target immutable wrappers need no copy helpers.
- Bytea payloads own canonical lowercase hexadecimal strings without a prefix.
  Public row adapters convert Go byte slices and TypeScript Uint8Array values;
  Rust validates hexadecimal constructor inputs. SQL literals accept hex input.
  Binary send, equality/inequality, NULL tests, CASE, and COALESCE use this wrapper.
  Other binary operations and runtime text casts require separate slices.
- Bit and varbit share an owned binary string in BitValue, preserving leading
  zeros, trailing zeros, and empty values. Public inputs are already SQL-coerced
  strings; nonbinary spellings defer. Literals accept binary and hexadecimal
  notation through the Rust decoder. Comparisons inspect padded bytes before
  bit length, and direct comparators preserve the first unequal byte difference.
  Length returns bits; octet length rounds up. Both types implicitly relabel
  without modifying contents, and mixed operators prefer varbit. CASE considers
  ELSE first; COALESCE uses its first typed arm. Bitwise operations preserve
  length and reject unequal binary widths with 22026. Shifts fill with zeros,
  retain length, and reverse direction for negative distances. Clamp before
  negating the minimum int4. Explicit fixed-width casts truncate or zero-pad;
  explicit varying-width casts only truncate. Assignment-style fixed coercion
  requires an exact width (22026); varying coercion rejects excess length (22001).
  Text/varchar I/O casts parse binary and hexadecimal prefixes before explicit
  width coercion; invalid digits return 22P02. Output casts preserve every bit.
  Raw query parameter coercion and integer casts remain deferred. Run
  `tests/sql-semantics/check-bit.test.ts`, `tests/sql-semantics/check-bitwise.test.ts`,
  `tests/sql-semantics/check-bit-casts.test.ts`, and the feature masks world for parity.
- Date payloads are signed day offsets from 2000-01-01. The signed int4
  minimum and maximum represent negative and positive infinity. Finite payloads
  range from -2451545 through 2145031948. Public CHECK inputs use this portable
  wrapper. Calendar construction and range validation live in Rust and return
  SQLSTATE 22008 for invalid values. Negative constructor years mean BC;
  year zero is invalid. Native target date objects require caller conversion.
- Text-to-date casts and date literals use the same maintained Rust parser.
  Its supported forms are year-first ISO dates with at least four year digits,
  one or two month/day digits, optional case-insensitive BC/AD suffixes, ASCII
  whitespace, and signed infinities. Invalid supported calendar values return
  SQLSTATE 22008; empty text and a missing final day return 22007. Other forms
  and text longer than PostgreSQL's date input buffer remain unknown. Do not
  parse dates with a target's native date library or assume a session DateStyle.
- Enum payloads are label ordinals within one concrete enum. Keep schema and
  type identity in bound expressions, and encode inputs against that enum's
  catalog label list. Equality requires the same concrete type on both sides.
  Unrecognized input labels remain unknown. The CHECK gate also runs the enum
  catalog and operation parity tests.
- Timestamptz payloads are signed UTC microseconds from 2000-01-01, using
  Rust i64, Go int64, and TypeScript bigint. The signed minimum and maximum
  represent infinities. Rust validates finite payloads against PostgreSQL's
  timestamp range. Same-type comparisons require no timezone context. Public
  CHECK inputs use the portable wrapper, including for domains. Native query
  parameter date objects remain unknown during prevalidation.
- Timestamp payloads use the same range, epoch, and infinities as timestamptz,
  measured on a local calendar without timezone interpretation. Explicit
  `timezone(text, timestamp)` and `timezone(text, timestamptz)` callables accept
  case-insensitive UTC/GMT or POSIX fixed offsets, either bare or appended to
  UTC/GMT. Offset fields accept hours, hours:minutes, and hours:minutes:seconds,
  with optional sign; positive signs mean west of UTC. Hours range through 167,
  minutes through 59, and seconds through 60. Invalid supported offsets return
  SQLSTATE 22023; conversions outside the timestamp range return 22008. Known
  infinities bypass zone lookup, following PostgreSQL. Named zones containing a
  slash use the bundled TZif data, including aliases and case-insensitive lookup.
  Rust evaluates recurring footer rules after the stored transitions. Forward
  gaps choose the preceding offset; backward overlaps choose the following one.
  Bare abbreviations, other zone spellings, and implicit conversions remain unknown.
  Timestamp precision coercions remain unknown.
- Timestamp text casts and literals accept the same year-first ISO date/time
  fields as timestamptz, plus a date alone and a time without an offset. An
  explicit Z or numeric offset is validated and then ignored, matching
  PostgreSQL. Both parsers share calendar construction and text decoding in
  Rust. Named zones, context-dependent spellings, longer fractions, precision
  coercions, other formats, and oversized text remain unknown.
- Text-to-timestamptz casts and literals use the same Rust parser. It accepts
  year-first ISO dates with at least four year digits, a time separated by T
  or ASCII whitespace, and an explicit Z or numeric offset. Fractional seconds
  accept one through six digits; seconds may be omitted. Numeric offsets accept
  hour, compact hour/minute, or colon-separated hour/minute/second forms.
  BC/AD suffixes, ASCII whitespace, and signed infinities are supported.
  Invalid supported calendar/time values return 22008, offsets return 22009,
  and empty text returns 22007. Named or implicit timezones, other formats,
  longer fractions, timestamp precision modifiers, and oversized input remain
  unknown. Range checks apply after offset adjustment. Keep timezone databases,
  session settings, and native date libraries out of target adapters.
- Extend world schema and `check-seed.sql` fixtures with accepted, rejected, and
  NULL inputs when adding CHECK behavior. Reuse a relevant existing world or add
  a focused world whose schema declares `-- @world checks`. Run
  `pnpm exec vitest run tests/sql-semantics/check-worlds.test.ts`; operation parity
  and world INSERT parity verify different boundaries and both must pass.
- If a callable needs a new value representation, primitive, SQL error, or
  Rust syntax rule, surface that as a separate foundation change before
  porting more functions that depend on it. The CHECK transpiler's own `AGENTS.md`
  requires a concrete CHECK expression, focused parser checks, and behavior
  tests in both targets before adding syntax.
