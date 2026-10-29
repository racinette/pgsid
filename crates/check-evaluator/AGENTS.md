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
  same cases in Rust, generated Go, and generated TypeScript. For an isolated
  operation or type extension, run its focused suites and regressions for the
  shared behavior it changes. Rebuild affected assets and verify relevant codegen
  goldens, static checks, corpus contracts and measurements. Record the selection
  and its dependency rationale. Run `pnpm check-rust:check` for broad shared
  semantic changes and integration milestones; adding an isolated type does not
  by itself require every unrelated family suite. Never report a partial run as
  a full-suite pass.
- Text equality, hashing, searches and LIKE accept deterministic collations; bpchar hashes remove trailing spaces.
  Ordering requires C and follows UTF8 byte order after resolving collation identity and overrides.
  Lengths, trims, slicing, padding, repeats, translation, concatenation, overlay, widths, literal quoting, pattern and index comparisons ignore collation; explicit conflicts defer.
  C lower/upper/casefold and ILIKE use ASCII casing; initcap treats only ASCII letters/digits as word characters.
- Varchar values share owned text; binary relabels preserve their contents.
  Char comparisons use the same wrapper and ignore only trailing ASCII spaces.
  Equality accepts deterministic collations; ordering requires C. Inputs are
  already SQL-coerced. Raw bounded varchar and char query parameters defer until
  assignment coercion is modeled. Char-to-text removes only trailing ASCII spaces;
  explicit width casts truncate, assignment calls reject non-space excess, and char pads with ASCII spaces.
- The operation parity command discovers comparisons, arithmetic and casts
  in selected sources. The integer-functions suite discovers catalog identities
  in the integer support, bitwise, hash, range, formatting and metadata sources.
  Run `tests/sql-semantics/check-integer-functions.test.ts` and the package-capacity world.
- Integer comparators return signed unit ordering except btint2cmp's full i32
  difference. Selection chooses the second on ties. Strict Boolean state calls
  preserve NULL despite decisive values. Bitwise helpers use bounded limbs;
  smallint/int4 shifts mask counts to five bits, bigint to six, including negatives.
  Right shifts extend signs; smallint left shifts promote before narrowing.
  Hashes retain signed bigint folding; radix output uses the original unsigned width.
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
- Time values carry microseconds since midnight, including the distinct end-of-day
  marker. Timetz adds signed seconds west of UTC; comparisons order the adjusted
  clock then the offset. Interval values retain months, days and microseconds;
  comparisons use thirty-day months without changing the stored components.
  Infinity uses PostgreSQL's reserved component triples. Arithmetic preserves
  component overflow, infinity errors and clock wrapping. Public clock and
  interval inputs use checked payload wrappers rather than host date objects.
  Clock input accepts colon-separated and compact fields, fractional two-field
  minute/second forms, AM/PM with numeric offsets, and validated year-first dates
  separated by whitespace. Missing timetz offsets and named zones defer for
  context; other grammar remains separately visible in input-form measurements.
  Clock output preserves fractional seconds and numeric offsets across DateStyle
  settings. SQL-coerced timetz payloads preserve the complete stored offset;
  text parsing applies its own narrower bounds. Fixed interval timezone conversion
  preserves stored-width arithmetic, including offset extraction and unsigned
  output components at the signed minimum. Interval text accepts unit, clock,
  compact year-month, ISO designator and alternative forms. Alternative fields
  retain numeric widths and field-specific fractional rounding; unit fractions
  and clock fractions retain distinct rounding rules.
  General fields accumulate in reverse, ISO fields in input order. Leading-negative
  general forms without further signs require IntervalStyle. Scaling cascades
  fractional months and days downward; justification carries units upward and
  aligns signs. Precision truncates lower fields then rounds signed fractional
  seconds, preserving intermediate overflow. Typed interval precision controls
  input units; runtime text casts parse with the full range before precision.
  Calendar arithmetic clips month ends and validates each month/day/time step.
  Clock and interval extraction preserve numeric display scales and the separate
  floating arithmetic of legacy field calls. Legacy timestamp fields retain separate
  fractional, Julian-day and epoch floating arithmetic. Interval hashes use the low bits of
  their comparison span; seeded hashes preserve every seed bit. Binning requires
  positive finite day/time strides and rounds toward negative infinity. Interval
  truncation preserves component signs. Calendar age borrows days from the earlier
  timestamp's month rather than converting months to elapsed days.
  Period overlap normalizes endpoint order and uses half-open bounds, except
  that equal endpoints denote a point. A NULL endpoint can still establish a
  known overlap; do not replace non-strict calls with strict NULL folding.
  Duration forms derive endpoints through the family's maintained arithmetic.
  Explicit-zone calendar adjustments re-resolve offsets after each month and
  day step, preserving gaps, folds and intermediate bounds. Zone lookup precedes
  infinity handling and subtraction's interval negation.
  Range checks reject negative offsets according to the family's comparison.
  Clock ranges ignore calendar fields and keep boundaries unwrapped; calendar
  ranges preserve date promotion, component overflow and infinity rules.
  Date-plus-clock constructors preserve fixed offsets and timestamp bounds;
  timestamp infinities become NULL when cast to time. Typed clock and interval
  literals prepare before lazy branches; runtime text casts retain branch laziness.
  Catalog reads normalize interval rendering and re-deparse domain defaults from
  stored expressions, restoring caller settings afterward.
  Interval output uses explicit postgres, postgres_verbose, sql_standard or ISO
  context across scalar casts, containers and JSON, preserving independent signs.
  Split clock components before taking absolute values to retain the signed minimum.
  Run the clock/interval suites and shift schedule INSERT world.
- Float4 and float8 wrappers carry signed IEEE bit words, preserving signed zero
  and NaN payloads through binary send. Computed NaNs with unavailable bit patterns
  retain a known semantic state through comparisons, casts and composition;
  binary output defers until selection recovers a precise operand.
  Comparisons use PostgreSQL's total order:
  NaNs are equal above infinity and both zeros compare equal. Float4 arithmetic
  rounds each result to single precision. Finite overflow, nonzero multiplication
  or division rounded to zero, and invalid integer casts return 22003; division
  by zero returns 22012 except for a NaN numerator. Integer casts round ties to
  even. Int8-to-float4 and decimal-to-float4 conversion avoid rounding through
  float8. Float-to-numeric conversion rounds exact dyadics to decimal precision
  with ties to even. SQL text parsing distinguishes invalid syntax from range
  failure; hexadecimal and extended NaN input forms defer without a platform
  contract. Public float4 numbers must already be single-precision values;
  raw parameters requiring assignment rounding defer. Bit carriers preserve
  all payloads. Run the float suites and sensor measurement INSERT world.
- Point coordinates retain IEEE bits in immutable signed bigint carriers.
  SQL-coerced public inputs use checked payload wrappers; malformed inputs defer.
  Construction and binary output preserve SQL-coerced coordinate bits. Arithmetic
  retains coordinate values but marks computed NaN bit patterns as unavailable;
  binary output defers for those payloads while geometric comparisons remain
  definite. Distance scales its operands before squaring; arithmetic preserves
  each floating-point overflow and underflow check.
  Geometric equality
  uses coordinate tolerances, except that a NaN coordinate selects exact SQL
  floating equality for both coordinates. Typed NULLs, domains, CASE and
  COALESCE share the point wrapper. Point text input accepts optional parentheses,
  ASCII whitespace, comma-separated decimal coordinates, infinity and plain NaN.
  Parse coordinates in order, preserving range errors before later syntax errors.
  Hexadecimal coordinates and extended NaN spellings require a platform contract;
  oversized inputs defer separately. Typed literals prepare before lazy branches;
  runtime casts retain branch laziness. Unconstrained point-domain casts unwrap
  their catalog chain; domain enforcement remains a separate coercion boundary.
  Geometric text output requires explicit floating rendering settings.
  Run the point suites and survey position INSERT world.
- Line coefficients retain signed IEEE carriers in immutable payloads. Public
  inputs validate the nondegenerate coefficient pair before preserving binary
  precision metadata. Equality compares proportional coefficients with checked
  floating arithmetic and short-circuits unequal components; NaNs select exact
  SQL floating equality for every coefficient. Orientation uses coefficient
  tolerances. Binary output preserves the original coefficient bits. Typed NULLs,
  nested domains, CASE and COALESCE use the line wrapper. Run the line foundation
  and raw write suites and the axis guide INSERT world.
  Text input accepts coefficient triples and point pairs, sharing the geometric
  numeric tokenizer. Coincident points return 22P02 during input and 22023 in the
  point constructor. Literal preparation precedes lazy branches; runtime casts
  preserve branch laziness. Unconstrained domain chains unwrap before input;
  enforced domains remain a separate coercion boundary. Computed NaN coefficients
  retain semantic values and defer binary output; unused NaN coordinates do not
  prevent a finite selected coefficient from retaining its exact bits.
  Hexadecimal and extended NaN input forms require a platform contract.
  Line relations use checked coefficient arithmetic and retain evaluation of
  intersection coordinates even when the caller needs only a predicate.
  Identical or sufficiently parallel lines have no unique intersection.
  Intersection coordinates normalize signed zero and mark computed NaN bits
  unavailable. Line-to-line distance returns zero after a successful intersection;
  parallel distance uses the coefficient ratio and first-line norm. Closest-point
  projection constructs a perpendicular through the point, computes its
  intersection and distance, and returns NULL when that distance is NaN.
- Numeric payloads own exact decimal strings in `NumericValue`; targets use
  strings or readonly wrappers for already-coerced SQL values. Reject floating
  point inputs; malformed or unsupported representations defer. Rust validates
  syntax and owns decimal arithmetic, scale selection, rounding and formatting.
  Comparisons ignore scale and signed zero; NaNs compare equal above infinities.
  Integer casts round halves away from zero; special values return 0A000, range failures 22003. Named precision modifiers round before checking digit limits.
  Hashes ignore sign/scale; binary send retains weight, sign and display scale.
  Private arithmetic may exceed stored limits; roots and logarithms retain selected scales.
  Transcendentals use decimal series with private float estimates; integer powers use repeated squaring.
  Products use bounded base-10000 limbs. Run numeric operation suites and shipment INSERT parity.
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
  `tests/sql-semantics/check-network*.test.ts` and the network access world
  for native/target and public INSERT parity.
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
  the public value types. Run `tests/sql-semantics/check-macaddr*.test.ts`
  and the network access world.
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
  Builders mutate local strings; wrapper clones preserve ownership across branches.
  Target wrappers need no copies; character codes, codecs, digests and temporal field decoding ignore collation.
  Legacy ASCII conversion maps UTF8 bytes through the requested encoding table;
  it does not transliterate Unicode. Invalid encoding codes return 42704 and
  unsupported encodings, including the database-default UTF8 encoding, return 0A000.
  Unicode escapes decode four, six or eight hexadecimal digits, combine mixed-form
  UTF16 surrogate pairs, and preserve plain text without normalization. Malformed
  escapes or pairs return 42601; zero or out-of-range code points return 22023.
  Regular-expression substring returns the first capture when one exists, the
  whole match otherwise, and SQL NULL for an absent or nonparticipating capture.
  SQL-pattern substring translates its pattern and escape through the maintained
  SIMILAR translator before using the same capture path. Both require C collation
  and return owned text. Run `tests/sql-semantics/check-regex-substring.test.ts`
  and the label registry world.
- Bytea payloads own canonical lowercase hexadecimal strings without a prefix.
  Public adapters convert byte arrays and nested domains; Rust validates hex input.
  Comparison preserves unsigned octet differences and signed-unit prefix order.
  Lengths count bytes or bits; popcounts return int8. Reversal preserves pairs.
  Get/set use zero-based byte indices and int8 bit indices, LSB-first per byte.
  Bounds fail with 2202E before set_bit rejects nonbinary replacements with 22023.
  Set_byte truncates replacements to eight bits; edits preserve their inputs.
  Substring preserves one-based ranges, negative-length errors and end overflow;
  overlay composes ranges with checked endpoints. Search and trims align octets.
  Integer casts use unsigned short inputs and signed full-width inputs; send uses
  network order for integers, dates, timestamps and booleans. Jenkins hashes,
  CRCs, MD5 and SHA preserve every bit. Hex/base64/escape codecs preserve wrapping,
  padding and UTF8 decoding; syntax returns 22023 or 22P02, size limits 54000.
  LIKE preserves byte wildcards, reached 22025 escapes, and failed-search aborts.
  Text input shares hex/escape parsing; bpchar I/O retains padding. Concat limits return XX000.
  Text output uses explicit hex/escape context, shared by scalar casts, containers
  and JSON. Escape output quotes every control/high byte separately from the encode
  codec. Missing context preserves bounded scalar non-NULL state and defers bytes.
  Run `tests/sql-semantics/check-bytea*.test.ts` and the feature masks world.
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
  Int4/int8 casts to fixed bit keep the low bits and sign-extend wider outputs;
  unspecified or invalid direct-call widths select one bit. Bit-to-int4/int8
  treats shorter strings as unsigned and full-width strings as two's complement.
  Longer strings return 22003 even when their high bits are zero. Resolve casts
  through catalog links; do not invent smallint-to-bit or varbit-to-integer paths.
  Function calls may use the catalog's implicit bit/varbit relabels. Raw query
  parameter coercion remains deferred. Concatenation preserves exact lengths
  and returns 54000 when their sum exceeds the bit limit. Get/set use zero-based
  positions from the left, returning 2202E outside the payload. Set validates
  the position before rejecting a replacement other than zero or one (22023),
  and builds a new value. Substring uses one-based positions, computes its end
  from the original start, and rejects negative lengths with 22011 before
  checking for an empty result. Omitted lengths and overflowing end positions
  run through the end. Overlay composes substring and concatenation; nonpositive
  starts return 22011 before checked endpoint overflow (22003). Negative removal
  lengths retain PostgreSQL overlap semantics; omitted lengths use the replacement.
  Position returns the first one-based match or zero for absence or empty inputs;
  empty patterns in nonempty inputs return one. Bit count returns int8 set-bit counts.
  Binary send emits a network-order int4 length and MSB-first bytes with zero padding.
  The `tests/sql-semantics/check-bit*.test.ts` suites and the feature masks
  world cover values, casts, arithmetic, editing, searches, counts, and output.
- SQL date/timestamp text output uses declared DateStyle format and field order,
  shared across casts and containers; direct JSON conversion remains ISO. Infinities,
  NULLs and errors are independent, and finite known values retain non-NULL state
  without context. Run the calendar-output parity and inspection INSERT world.
- Date payloads are signed day offsets from 2000-01-01. The signed int4
  minimum and maximum represent negative and positive infinity. Finite input
  ranges from -2451545 through 2145031948. Already SQL-coerced
  timezone projections retain earlier stored days without text-input revalidation.
  Public CHECK inputs use this portable wrapper. Calendar construction and range
  validation live in Rust and return
  SQLSTATE 22008 for invalid values. Negative constructor years mean BC;
  year zero is invalid. Native target date objects require caller conversion.
- Text-to-date casts and date literals share the timestamp parser's date grammar
  after their own Julian, epoch and infinity tokens. Year-first three-field dates
  need at least three year digits and one repeated hyphen, slash or period
  separator; month and day fields take any width, except that a three-digit
  month field from 1 through 366 defers because it is a day of year. A fourth
  field returns 22007 unless a field overflows int4. A missing
  final day returns 22007, or 22008 after an int4 field overflow. Forms accept
  optional case-insensitive BC/AD suffixes, ASCII
  whitespace, signed infinities, and the context-independent `epoch` token.
  Julian days use case-insensitive J/JD/julian labels, optional ASCII
  whitespace and leading zeroes; BC/AD does not alter their absolute day. A
  fractional day supplies the clock, scaled to microseconds in double precision
  and truncated, so a following clock returns 22007; an integer day accepts the
  usual clock and zone tail.
  Compact dates reserve the last four digits for month/day and interpret exactly
  two year digits using the fixed 1970–2069 window, except under BC. Compact
  year fields outside int4 defer because native atoi overflow is not portable.
  Ordinal dates pair a year of at least three digits with a three-digit day of
  year from 1 through 366, separated by a hyphen, slash or period, or by
  whitespace after a three- to five-digit year. The day normalizes through
  Julian-day arithmetic, so day 366 of a common year is the next January 1.
  Days before the unsigned Julian split wrap as PostgreSQL's unsigned arithmetic
  does; years whose signed intermediates leave int4 defer. One- and two-digit
  ordinal years defer because DateStyle field order decides them. Other
  two-field numeric dates return 22007, or 22008 when a field overflows int4
  at the end of input. A whitespace-separated year followed only by another
  number is a year and month: 22007 for months 1 through 12 or a field of six
  or more digits, otherwise 22008, including year zero. Whitespace-separated
  year, month and day fields form a calendar date. A day of year followed by a
  third field returns 22007 unless that field has four or six digits, which
  defers; a separator ending the text after it is ignored. English month names
  and abbreviations pair with two numbers, either around the month or after it,
  separated by whitespace and commas or by one repeated hyphen, slash or period,
  or adjacent where letters meet digits;
  an optional leading weekday is ignored. A first number of three or more digits
  is the year and the second the day; otherwise a second number of three or more
  digits is the year. After two numbers, a three- to five-digit year and a
  second number from 1 through 31 form the date; other second numbers return
  SQLSTATE 22007. Two short numbers defer because DateStyle assigns them, and
  a whitespace-separated field of six or more digits returns 22007. A date followed by a
  timestamp clock and optional
  numeric zone parses through the timestamp grammar: colon clock fields and
  offsets validate in timestamp order, compact clock carry is ignored, and only
  date range checks apply. A numeric zone or Z may follow any of these dates
  directly or after whitespace, with a midnight clock or a clock after it; a
  zone before the clock reports its own error first. Weekday names are
  ignored around the clock and zone, and AM or PM after either (or alone) maps twelve-hour
  clocks once zone fields decode: hours above twelve return 22008 and a second
  meridian 22007; after a slash- or
  period-separated ordinal date a minus sign also starts a zone. Invalid
  supported calendar values return
  SQLSTATE 22008; empty text and a missing final day return 22007. Other forms
  and text longer than PostgreSQL's date input buffer remain unknown. Do not
  parse dates with a target's native date library or assume a session DateStyle.
- Enum payloads carry label ordinals and optional catalog label OIDs within one
  concrete enum. A zero OID denotes unavailable metadata; retain ordinal-only
  inputs for comparisons. Catalog OIDs span the unsigned 32-bit range in i64.
  Keep schema and type identity in bound expressions, and encode inputs against that enum's
  catalog label list. Comparisons use ordinal order within the same concrete
  type, including labels added between existing labels. Selection retains the
  selected payload and chooses the second operand on ties. Hashes use the label
  OID and defer when it is unavailable. Enum domains require a cast to the base
  enum for polymorphic catalog calls; CASE and COALESCE preserve an identical
  domain across every arm. Generated literals and public label adapters retain
  ordinals without embedding generation-time label OIDs. Their OID hashes defer
  because generated validators have no deployment catalog. Unrecognized input
  labels remain unknown. The CHECK
  gate also runs the enum catalog and operation parity tests.
- Timestamptz payloads are signed UTC microseconds from 2000-01-01, using
  Rust i64, Go int64, and TypeScript bigint. The signed minimum and maximum
  represent infinities. Text input and checked constructors validate PostgreSQL's
  finite timestamp input range. SQL-coerced precision results preserve the rounded
  upper boundary independently of text admission. Same-type comparisons require
  no timezone context. Public CHECK inputs use the portable wrapper, including
  for domains. Native query
  parameter date objects remain unknown during prevalidation.
- Timestamp input uses the same range, epoch, and infinities as timestamptz.
  Stored values also retain projected dates before the input minimum and rounded
  precision results at the upper boundary. Calendar consumers apply their own
  native errors; pure clock arithmetic can recover an admissible result.
  Local calendars have no implicit timezone interpretation. Explicit
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
  Explicit precision callables round signed halves away from zero; infinities bypass invalid precision.
- Timestamp text casts and literals accept the same year-first ISO date/time
  fields as timestamptz, plus a date alone and a time without an offset. An
  explicit Z or numeric offset is validated and then ignored, matching
  PostgreSQL. Both parsers share calendar construction and text decoding in
  Rust. Fractional input uses nearest-even microsecond rounding and can carry
  into the next day; epoch denotes the Unix epoch without session interpretation.
  Compact and ordinal dates share that year policy. Ordinal days convert after
  numeric offsets validate and before missing-timezone deferral.
  Compact four/six-digit clocks retain
  their native arithmetic normalization, including fields beyond ordinary clock
  limits and carry across days; colon-separated clocks remain range-checked.
  Fractional compact clocks share nearest-even rounding. Fixed numeric offsets
  validate before calendar fields on this compact path; missing timezone still
  defers after calendar validation. Timestamp range checks follow clock carry.
  Named zones, context-dependent spellings, precision
  coercions, other formats, and oversized text remain unknown.
- Text-to-timestamptz casts and literals use the same Rust parser. It accepts
  the shared year-first date grammar, a time separated by T
  or ASCII whitespace, and an explicit Z or numeric offset. Fractional seconds
  round to microseconds using nearest-even binary fractional conversion;
  seconds may be omitted. Numeric offsets accept
  hour, compact hour/minute, or colon-separated hour/minute/second forms.
  BC/AD suffixes, ASCII whitespace, signed infinities, and epoch are supported.
  Invalid supported calendar/time values return 22008, offsets return 22009,
  and empty text returns 22007. Named or implicit timezones, other formats,
  timestamp precision modifiers and oversized input remain
  unknown. Range checks apply after offset adjustment. Keep timezone databases,
  session settings, and native date libraries out of target adapters.
- Line segments retain both endpoints in their original order, including coincident
  endpoints. Equality compares corresponding points; ordering compares lengths
  with geometric tolerance. Midpoints preserve checked addition before division.
  SQL-coerced public inputs retain four IEEE carriers and binary precision metadata.
  Point-pair text decoding shares the geometric grammar without line degeneracy
  checks. Run the line-segment and raw write suites and the axis guide INSERT world.
  Segment intersections promote supporting lines, check segment containment and
  snap matching endpoints to their original carriers. Containment compares the
  triangle's distance sum without a checked SQL addition. Closest-point searches
  preserve endpoint order, exact slope equality, distinct NaN comparison rules
  and each reached distance error. Selecting a precise endpoint recovers its
  binary representation when the other endpoint has unavailable NaN bits.
  Run the segment operation suite and crossing/projection INSERT cases.
- Box corners retain IEEE carriers without requiring canonical corner order.
  Stored expression results may retain inverted bounds or a lower NaN coordinate.
  Input keeps the first corner on coordinate ties; construction keeps the second.
  Area comparisons and corner identity use distinct geometric semantics.
  Width, height, area and center preserve checked intermediate arithmetic;
  center distance uses the geometric hypotenuse. Diagonal conversion retains
  corner order. Computed NaNs keep semantic results and defer binary precision.
  Text accepts closed point-pair grammar, rejecting open brackets before decoding
  coordinates. Unconstrained domains, literal preparation and lazy casts use the
  geometric input boundary. Run the box and raw write suites and region INSERTs.
  Spatial relations use geometric tolerance, while point containment uses exact
  coordinate bounds. Intersection and bounding union select coordinates without
  renormalizing the result. Addition and subtraction preserve corner slots;
  complex multiplication and division reconstruct their ordering. Closest-point
  searches retain boundary order and SQL floating selection. Segment predicates
  and distances can skip the center calculation required by a closest-point
  request, preserving different reached errors. Run the box operation suite and
  spatial, contact and transform INSERT cases.
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

- Circle centers and radii retain signed IEEE carriers, including negative radii
  produced by SQL constructors. Text input rejects negative radii; public inputs
  preserve already-coerced stored values. Area comparisons use geometric
  tolerances and checked radius-squared multiplication before multiplication by pi.
  Center and radius selection recover precise finite components when another
  component has computed NaN bits. Unconstrained domains, literals, runtime casts,
  typed NULLs, CASE and COALESCE share the circle wrapper. Circle-to-box conversion
  preserves corner positions even when a negative radius inverts their order.
  Relations compare checked center-to-edge arithmetic; circle containment uses
  geometric tolerances while point containment uses exact distance bounds.
  Equality and inequality can both be false for NaN areas. Distances clamp only
  negative results to zero. Translation preserves radius bits; complex rotation
  and scaling reuse point arithmetic before scaling the radius by the point norm.
  Run the circle and raw write suites and axis guide INSERT world.

- Money payloads carry signed stored units, preserving every bigint bit. Public
  callers supply already SQL-coerced wrappers; currency strings and native
  numbers defer. Integer arithmetic checks each operation; floating scaling
  converts stored units to float8 before arithmetic and rounds ties to even.
  Binary send preserves units. English word output uses a fixed hundred units
  per dollar, including the signed minimum. Catalog reads capture rendered
  money constants as exact units while restoring monetary locale settings.
  Runtime text input recognizes context-free zero forms; other input grammar,
  numeric/integer casts and output require a monetary context boundary.
  Domains, CASE, COALESCE, NULLIF, extrema and null-safe equality use the money
  wrapper. Run the money and raw write suites and money transfer INSERT world.

- OID payloads retain unsigned 32-bit values in signed 64-bit carriers. Binary
  int4 casts reinterpret the low word; bigint casts validate the unsigned range.
  Comparisons use unsigned order and hashing preserves the low word. Text output
  is decimal; input accepts portable decimal, octal and hexadecimal spellings.
  Unsigned-long-width and libc-dependent forms defer. Name resolution requires
  database context. Run the OID parity and raw write suites.

- Catalog OID aliases retain nominal SQL types over the unsigned OID carrier.
  Catalog-declared binary casts relabel the carrier; named constants, name lookup
  and nonzero name output defer because generated validators have no deployment
  catalog. Plain alias input accepts numeric OID literals, while the catalog's
  text-to-regclass cast treats even numeric text as a relation name. Run the
  catalog alias core, public payload, raw write and catalog export INSERT suites.

- Transaction and command identifiers retain unsigned words; full transaction
  identifiers retain every bit through signed carriers. Full-width comparisons
  use unsigned order and narrowing discards only the epoch word. Text output
  divides both limbs before selecting decimal digits. Runtime input shares the
  portable unsigned grammar and preserves overflow before trailing syntax.
  Current transaction IDs and transaction age require database state. Run the
  system identifier, public payload, raw write and transaction INSERT suites.

- WAL locations retain the unsigned 64-bit address through signed bit carriers.
  Input accepts two hexadecimal words separated by a slash; output uses uppercase
  hexadecimal without padding. Comparisons use unsigned order; differences retain
  the full exact numeric range. Numeric conversion rounds halves away from zero,
  rejecting negative or overflowing results and special numeric values. SQL exposes
  conversion as a function rather than a numeric cast. Public inputs preserve
  already-coerced addresses; raw query strings reach database coercion. Run the WAL
  location parity, public payload, raw write and WAL record INSERT suites.

- Heap tuple identifiers retain an unsigned block number and offset in a packed
  scalar carrier. Binary output writes the block before the offset; comparison
  orders both unsigned fields. Text input preserves legacy prefix, delimiter and
  suffix handling. Native unsigned-long boundary forms and libc no-conversion
  behavior defer; definite syntax and range failures retain invalid-text errors.
  Hashes retain definite results for zero offsets with matching block halfwords;
  other hash inputs require PostgreSQL native byte order. Heap lookup requires
  relation and snapshot state. Run tuple-pointer parity, public payload, raw write
  and heap record INSERT suites.

- Name values preserve nominal SQL identity over owned text and already SQL-coerced
  UTF8 row contents. C relations preserve trailing spaces; hashes use those bytes
  independently of collation. Conversions out retain contents. Nonempty input
  truncation requires the deployment build's maximum identifier byte length;
  explicit limits clip at UTF8 boundaries. Empty text and NULL do not need a limit.
  Public inputs reject NUL and malformed encodings before runtime construction;
  raw query parameters defer assignment coercion. Run name core, payload, raw write
  and identifier-name INSERT suites.

- Internal char values carry unsigned bytes, separately from SQL char(n).
  Comparisons use unsigned order; integer casts use signed eight-bit values.
  Text input accepts wrapped three-digit octal escapes or the first UTF8 byte;
  text output escapes high-bit bytes and renders zero as empty text. Binary send
  preserves every byte. Public inputs require already SQL-coerced byte wrappers.
  High-bit hashes require native C char signedness; raw zero or high-bit bpchar
  output cannot enter the UTF8 text representation. Run internal char parity,
  public payload, raw write and protocol-byte INSERT suites.

- Paths retain an owned ordered point list and the open/closed flag. SQL equality
  and ordering compare point counts; opening and closing copy the value without
  reordering points. Binary output preserves individual coordinate carriers.
  Length includes the closing edge first for closed paths; area returns NULL for
  open paths and preserves each checked floating operation. Text input shares
  geometric number parsing and retains flat and delimited path forms. Raw query
  parameters defer database coercion. Run path core, payload and write suites and
  route-plan INSERT cases.

- Path concatenation requires two open paths and appends their points in order;
  either closed input produces SQL NULL. Check the stored count bound before
  extending the point list. Point arithmetic transforms each vertex in order,
  retaining closure and the first reached floating error. Original input snapshots
  retain their points. Computed NaNs retain shape information while binary output
  defers. Run path operation and count-limit suites and route transform INSERTs.

- Path distances visit closing edges first and retain total floating minimum
  selection across all reached segment distances. Point distance returns zero
  when an open path has no segments; a path pair with no segment pair returns
  SQL NULL. NaN distance results preserve comparisons and defer binary output because
  PostgreSQL-generated NaN bits require platform context. Preserve argument-order errors in reversed overloads.
  Run path distance parity and route distance INSERTs.

- Path containment visits the initial distance even for a single-point open path;
  closed paths use oriented ray crossings with tolerant axis tests and checked
  coordinate arithmetic. Intersection rejects disjoint bounding boxes before
  visiting segment pairs, starting with closing edges. Preserve short circuits,
  first reached errors and definite predicates for semantic NaNs. Run path
  predicate parity and route membership/crossing INSERT cases.

- Polygons own ordered points and cached bounding boxes. SQL-coerced inputs may
  carry exact bounds; validate their extrema without replacing signed-zero bits.
  Missing bounds derive only when extrema have unique precise bit patterns.
  Ambiguous bounds retain known non-NULL state and binary length while their
  bytes defer. Point count, polygon send, cyclic/reversed geometric equality,
  closed-path conversion and point containment remain independent of that cache.
  Fresh text/path constructors compute their own bounds; box conversion preserves
  its corner-order tie behavior. Open path conversion returns 22023. Polygon
  text rejects open delimiters before parsing coordinates. Run the polygon
  suites and survey parcel INSERT world for runtime and public adapter parity.

- Refcursor names retain nominal SQL identity over owned text. Explicit string
  casts preserve cursor contents and bpchar output spaces through shared catalog
  text I/O. Equality and ordering require an explicit conversion to a comparable
  type. Reading a live cursor requires session state. Binary text/name output
  preserves ASCII bytes; other output and conversion errors require client
  encoding. Run refcursor parity, payload, raw-write and report-cursor INSERT
  suites.

- Snapshot types retain nominal SQL identity over an owned list of full transaction
  identifier words. SQL-coerced public rows use validated snapshot wrappers;
  raw query parameters retain database conversion. Text input excludes the upper
  bound from the in-progress list; binary input can include it. Keep native word
  bits intact in legacy signed results. Snapshot retrieval requires transaction
  state; supplied snapshots support pure local operations.
- Public text adapters accept well-formed UTF8 without NUL. Values outside that input
  contract defer local operations; preserve raw bytes for database conversion.
