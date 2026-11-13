import type { DomainInfo } from '../../../catalog/types.js'
import type { CheckExecutionContext } from '../../shared/check-rust-evaluator.js'
import { checkRustTextInput } from '../../shared/check-rust-evaluator.js'
import { go, type GoExpression } from '../ast.js'

// The generated Go CHECK API takes public values: the types rows and parameters hold. Each
// converter turns one into the runtime value the evaluator reads, as the server would read the
// value pgx sends: a value its input rejects becomes that error, and a value no input reads at
// all is a malformed input. Converters are fixed per family; the ones a check file uses are
// emitted with it.
type GoPublicPackage = 'time' | 'math' | 'operations' | 'reflect' | 'pgtype' | 'strconv' | 'strings'
const converters: Record<
  string,
  { dependencies: readonly string[]; source: string; packages?: readonly GoPublicPackage[] }
> = {
  checkPublic: {
    dependencies: [],
    source: `// checkPublic converts an input's value, keeping an unset input unset and NULL NULL.
func checkPublic[P, R any](field CheckOptional[P], convert func(P) R) CheckOptional[R] {
  if !field.Set { return CheckOptional[R]{} }
  if field.Null { return CheckOptional[R]{Set: true, Null: true} }
  return KnownCheckValue(convert(field.V))
}`,
  },
  checkPublicPointer: {
    dependencies: [],
    source: `// A nullable column's value is a pointer, nil for NULL.
func checkPublicPointer[P any](field CheckOptional[*P]) CheckOptional[P] {
  if !field.Set { return CheckOptional[P]{} }
  if field.Null || field.V == nil { return CheckOptional[P]{Set: true, Null: true} }
  return KnownCheckValue(*field.V)
}`,
  },
  checkPublicNull: {
    dependencies: [],
    source: `// A null wrapper's value, NULL where it is not valid.
func checkPublicNull[P any](field CheckOptional[pgsid.Null[P]]) CheckOptional[P] {
  if !field.Set { return CheckOptional[P]{} }
  if field.Null || !field.V.Valid { return CheckOptional[P]{Set: true, Null: true} }
  return KnownCheckValue(field.V.V)
}`,
  },
  checkPublicNilable: {
    dependencies: [],
    packages: ['reflect'],
    source: `// A nil slice, map or interface is NULL, as pgx sends it.
func checkPublicNilable[P any](field CheckOptional[P]) CheckOptional[P] {
  if !field.Set || field.Null { return field }
  native := reflect.ValueOf(any(field.V))
  if !native.IsValid() { return CheckOptional[P]{Set: true, Null: true} }
  switch native.Kind() {
  case reflect.Slice, reflect.Map, reflect.Pointer, reflect.Interface:
    if native.IsNil() { return CheckOptional[P]{Set: true, Null: true} }
  }
  return field
}`,
  },
  checkPublicAt: {
    dependencies: [],
    source: `// The input being converted names a malformed value's error.
func checkPublicAt[R any](at *string, name string, convert func() R) R { *at = name; return convert() }`,
  },
  checkPublicText: {
    dependencies: [],
    packages: ['strings'],
    source: `// Bytes that are no UTF-8 reach the server as sent, and its encoding decides whether they form text.
func checkPublicText(value string) checkruntime.TextValue {
  if !utf8.ValidString(value) || strings.IndexByte(value, 0) >= 0 { return checkruntime.TextUnknown() }
  return checkruntime.MakeTextValue(value)
}`,
  },
  checkPublicCivilDays: {
    dependencies: [],
    source: `// Days from 1970-01-01 to a day of the proleptic Gregorian calendar, year 0 being 1 BC.
func checkPublicCivilDays(year, month, day int) int {
  if month <= 2 { year-- }
  era := year / 400
  if year < 0 && year%400 != 0 { era-- }
  yearOfEra := year - era*400
  shifted := month + 9
  if month > 2 { shifted = month - 3 }
  dayOfYear := (153*shifted+2)/5 + day - 1
  return era*146097 + yearOfEra*365 + yearOfEra/4 - yearOfEra/100 + dayOfYear - 719468
}`,
  },
  checkPublicDate: {
    dependencies: ['checkPublicCivilDays'],
    source: `// The server keeps a date as days from 2000-01-01, its infinities as the int32 extremes.
func checkPublicDate(value pgsid.Date) checkruntime.DateValue {
  day, finite := value.Time()
  if !finite {
    if value.Infinity() > 0 { return checkruntime.MakeStoredDateValue(2147483647) }
    return checkruntime.MakeStoredDateValue(-2147483648)
  }
  days := checkPublicCivilDays(day.Year(), int(day.Month()), day.Day()) - 10957
  if days < -2451545 || days > 2145031948 {
    return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: checkruntime.MakeSqlError(3452552)}
  }
  return checkruntime.MakeStoredDateValue(days)
}`,
  },
  checkPublicInstant: {
    dependencies: [],
    packages: ['time'],
    source: `// Microseconds from 2000-01-01, as pgx sends a time, or false when the server's input rejects it:
// from 4714-11-24 00:00 BC up to, not including, 294277-01-01.
func checkPublicInstant(instant time.Time) (int64, bool) {
  if year := instant.Year(); year < -4713 || year > 294276 { return 0, false }
  shifted := instant.UnixMicro() - 946684800000000
  return shifted, shifted >= -211813488000000000 && shifted < 9223371331200000000
}`,
  },
  checkPublicTimestamp: {
    dependencies: ['checkPublicInstant'],
    source: `func checkPublicTimestamp(value pgsid.Timestamp) checkruntime.TimestampValue {
  instant, finite := value.Time()
  if !finite {
    if value.Infinity() > 0 { return checkruntime.MakeStoredTimestampValue(9223372036854775807) }
    return checkruntime.MakeStoredTimestampValue(-9223372036854775808)
  }
  micros, ok := checkPublicInstant(instant)
  if !ok { return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: checkruntime.MakeSqlError(3452552)} }
  return checkruntime.MakeStoredTimestampValue(micros)
}`,
  },
  checkPublicTimestamptz: {
    dependencies: ['checkPublicInstant'],
    source: `func checkPublicTimestamptz(value pgsid.Timestamptz) checkruntime.TimestamptzValue {
  instant, finite := value.Time()
  if !finite {
    if value.Infinity() > 0 { return checkruntime.MakeStoredTimestamptzValue(9223372036854775807) }
    return checkruntime.MakeStoredTimestamptzValue(-9223372036854775808)
  }
  micros, ok := checkPublicInstant(instant)
  if !ok { return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: checkruntime.MakeSqlError(3452552)} }
  return checkruntime.MakeStoredTimestamptzValue(micros)
}`,
  },
  checkPublicInterval: {
    dependencies: [],
    source: `// The server keeps an infinite interval as every field at its extreme; a finite interval of that
// encoding is refused before it is sent.
func checkPublicInterval(value pgsid.Interval) checkruntime.IntervalValue {
  months, days, micros, finite := value.Parts()
  if !finite {
    if value.Infinity() > 0 { return checkruntime.MakeIntervalValue(2147483647, 2147483647, 9223372036854775807) }
    return checkruntime.MakeIntervalValue(-2147483648, -2147483648, -9223372036854775808)
  }
  if (months == 2147483647 && days == 2147483647 && micros == 9223372036854775807) || (months == -2147483648 && days == -2147483648 && micros == -9223372036854775808) {
    return checkRustInvalid[checkruntime.IntervalValue]()
  }
  return checkruntime.MakeIntervalValue(int(months), int(days), micros)
}`,
  },
  checkPublicTime: {
    dependencies: [],
    source: `func checkPublicTime(value pgsid.Time) checkruntime.TimeValue {
  return checkruntime.MakeTimeValue(value.Microseconds())
}`,
  },
  checkPublicTimetz: {
    dependencies: [],
    source: `// The server keeps a time zone as seconds west of UTC, the negated offset.
func checkPublicTimetz(value pgsid.Timetz) checkruntime.TimetzValue {
  return checkruntime.MakeTimetzValue(value.Microseconds(), -int(value.OffsetSeconds()))
}`,
  },
  checkPublicFloatBits: {
    dependencies: [],
    packages: ['math'],
    source: `// Geometric payloads keep each float8's exact bits.
func checkPublicFloatBits(value float64) int64 { return int64(math.Float64bits(value)) }
// float8_lt: NaN sorts above every number and equals itself.
func checkPublicFloat8Lt(left, right float64) bool { return !math.IsNaN(left) && (math.IsNaN(right) || left < right) }`,
  },
  checkPublicPoint: {
    dependencies: ['checkPublicFloatBits'],
    source: `func checkPublicPoint(value pgsid.Point) checkruntime.PointValue {
  return checkruntime.MakePointBits(checkPublicFloatBits(value.X), checkPublicFloatBits(value.Y))
}`,
  },
  checkPublicLine: {
    dependencies: ['checkPublicFloatBits'],
    source: `// line_in rejects coefficients A and B that are both within 1e-6 of zero.
func checkPublicLine(value pgsid.Line) checkruntime.LineValue {
  if math.Abs(value.A) <= 1e-6 && math.Abs(value.B) <= 1e-6 {
    return checkruntime.LineValue{Kind: checkruntime.LineValueError, Error: checkruntime.MakeSqlError(3484946)}
  }
  return checkruntime.MakeLineBits(checkPublicFloatBits(value.A), checkPublicFloatBits(value.B), checkPublicFloatBits(value.C))
}`,
  },
  checkPublicLseg: {
    dependencies: ['checkPublicFloatBits'],
    source: `func checkPublicLseg(value pgsid.Lseg) checkruntime.LsegValue {
  return checkruntime.MakeLsegBits(checkPublicFloatBits(value.Start.X), checkPublicFloatBits(value.Start.Y), checkPublicFloatBits(value.End.X), checkPublicFloatBits(value.End.Y))
}`,
  },
  checkPublicBox: {
    dependencies: ['checkPublicFloatBits'],
    source: `// box_in orders the corners with float8_lt, so either corner order is the same box.
func checkPublicBox(value pgsid.Box) checkruntime.BoxValue {
  high, low := value.High, value.Low
  if checkPublicFloat8Lt(high.X, low.X) { high.X, low.X = low.X, high.X }
  if checkPublicFloat8Lt(high.Y, low.Y) { high.Y, low.Y = low.Y, high.Y }
  return checkruntime.MakeBoxBits(checkPublicFloatBits(high.X), checkPublicFloatBits(high.Y), checkPublicFloatBits(low.X), checkPublicFloatBits(low.Y))
}`,
  },
  checkPublicPoints: {
    dependencies: ['checkPublicFloatBits'],
    source: `func checkPublicPoints(points []pgsid.Point) []checkruntime.PointPayload {
  if len(points) == 0 { return checkRustInvalid[[]checkruntime.PointPayload]() }
  result := make([]checkruntime.PointPayload, len(points))
  for index, point := range points {
    result[index] = checkruntime.PointPayload{X: checkPublicFloatBits(point.X), Y: checkPublicFloatBits(point.Y), WireKnown: true}
  }
  return result
}`,
  },
  checkPublicPath: {
    dependencies: ['checkPublicPoints'],
    source: `func checkPublicPath(value pgsid.Path) checkruntime.PathValue {
  return checkruntime.MakePathValue(checkruntime.PathPayload{Closed: value.Closed, Points: checkPublicPoints(value.Points)})
}`,
  },
  checkPublicPolygon: {
    dependencies: ['checkPublicPoints'],
    source: `// poly_in caches the bounding box make_bound_box computes from the points in order.
func checkPublicPolygon(value pgsid.Polygon) checkruntime.PolygonValue {
  points := checkPublicPoints(value.Points)
  low, high := value.Points[0], value.Points[0]
  for _, point := range value.Points[1:] {
    if checkPublicFloat8Lt(point.X, low.X) { low.X = point.X }
    if checkPublicFloat8Lt(high.X, point.X) { high.X = point.X }
    if checkPublicFloat8Lt(point.Y, low.Y) { low.Y = point.Y }
    if checkPublicFloat8Lt(high.Y, point.Y) { high.Y = point.Y }
  }
  bounds := checkruntime.MakeBoxBits(checkPublicFloatBits(high.X), checkPublicFloatBits(high.Y), checkPublicFloatBits(low.X), checkPublicFloatBits(low.Y))
  return checkruntime.MakePolygonValue(checkruntime.PolygonPayload{Points: points, Bounds: bounds})
}`,
  },
  checkPublicCircle: {
    dependencies: ['checkPublicFloatBits'],
    source: `// circle_in rejects a negative radius.
func checkPublicCircle(value pgsid.Circle) checkruntime.CircleValue {
  if value.Radius < 0 {
    return checkruntime.CircleValue{Kind: checkruntime.CircleValueError, Error: checkruntime.MakeSqlError(3484946)}
  }
  return checkruntime.MakeCircleBits(checkPublicFloatBits(value.Center.X), checkPublicFloatBits(value.Center.Y), checkPublicFloatBits(value.Radius))
}`,
  },
  checkPublicXid: {
    dependencies: [],
    source: `func checkPublicXid[V ~uint32](value V) checkruntime.XidValue { return checkruntime.MakeXidValue(int64(value)) }`,
  },
  checkPublicCid: {
    dependencies: [],
    source: `func checkPublicCid[V ~uint32](value V) checkruntime.CidValue { return checkruntime.MakeCidValue(int64(value)) }`,
  },
  checkPublicOid: {
    dependencies: [],
    source: `func checkPublicOid[V ~uint32](value V) checkruntime.OidValue { return checkruntime.MakeOidValue(int64(value)) }`,
  },
  checkPublicXid8: {
    dependencies: [],
    source: `// The runtime keeps the unsigned identifier's 64 bits as a signed integer.
func checkPublicXid8[V ~uint64](value V) checkruntime.Xid8Value { return checkruntime.MakeXid8Bits(int64(value)) }`,
  },
  checkPublicNumeric: {
    dependencies: [],
    source: `// A numeric value holds numeric output, which numeric input reads back unchanged.
func checkPublicNumeric(value pgsid.Numeric) checkruntime.NumericValue {
  return checkruntime.MakeNumericValue(value.String())
}`,
  },

  checkPublicCell: {
    dependencies: [],
    packages: ['reflect'],
    source: `// A container hands every cell to its converter: nil, a nil pointer, slice or map, and a null
// wrapper that is not valid are NULL, and a pointer or wrapper holding a value is that value.
func checkPublicCell(value any) (any, bool) {
  for {
    if value == nil { return nil, true }
    if wrapper, ok := value.(interface{ SQLValid() bool; SQLUnderlying() any }); ok {
      if !wrapper.SQLValid() { return nil, true }
      value = wrapper.SQLUnderlying()
      continue
    }
    native := reflect.ValueOf(value)
    switch native.Kind() {
    case reflect.Pointer:
      if native.IsNil() { return nil, true }
      value = native.Elem().Interface()
      continue
    case reflect.Slice, reflect.Map:
      if native.IsNil() { return nil, true }
    }
    return value, false
  }
}
func checkPublicNullElement() checkruntime.ArrayElement { return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementNull} }
// A part whose conversion is not decided yet.
func checkPublicUndecidedElement(value any) checkruntime.ArrayElement { return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementUnknown} }
// A cell of the Go type its column declares; any other value is malformed.
func checkPublicAs[T any](cell any) T {
  value, ok := cell.(T)
  if !ok { return checkRustInvalid[T]() }
  return value
}
// The text of a value sent as text: a string type, or a JSON document's text.
func checkPublicString(cell any) string {
  if document, ok := cell.(interface{ Text() string }); ok { return document.Text() }
  native := reflect.ValueOf(cell)
  if native.Kind() != reflect.String { return checkRustInvalid[string]() }
  return native.String()
}
// An unsigned identifier of any unsigned integer type.
func checkPublicUnsigned(cell any) uint64 {
  native := reflect.ValueOf(cell)
  switch native.Kind() {
  case reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uint: return native.Uint()
  }
  return checkRustInvalid[uint64]()
}`,
  },
  checkPublicParts: {
    dependencies: [],
    source: `// The server reads a container's parts in order: the first part its input rejects fails the
// whole value, and an undecided part leaves it undecided, since that part may be the one rejected.
type checkPublicParts struct {
  failed, undecided bool
  failure checkruntime.SqlError
}
func (p *checkPublicParts) read(part checkruntime.ArrayElement) checkruntime.ArrayElement {
  switch part.Kind {
  case checkruntime.ArrayElementError: p.fail(part.Error, false)
  case checkruntime.ArrayElementUnknown, checkruntime.ArrayElementUnimplemented: p.fail(checkruntime.SqlError{}, true)
  }
  return part
}
func (p *checkPublicParts) fail(failure checkruntime.SqlError, undecided bool) {
  if p.failed { return }
  p.failed, p.undecided, p.failure = true, undecided, failure
}`,
  },
  checkPublicRange: {
    dependencies: ['checkPublicParts'],
    packages: ['pgtype'],
    source: `// A range's bounds go through the subtype's input, then the evaluator's range constructor orders
// and canonicalizes them as range input does.
func checkPublicRange(value any, bound func(any) checkruntime.ArrayElement, empty func() checkruntime.RangeValue, construct func(lower, upper checkruntime.ArrayElement, flags checkruntime.TextValue) checkruntime.RangeValue) checkruntime.RangeValue {
  span, ok := value.(interface{ BoundTypes() (pgtype.BoundType, pgtype.BoundType); Bounds() (any, any) })
  if !ok { return checkRustInvalid[checkruntime.RangeValue]() }
  lowerType, upperType := span.BoundTypes()
  if lowerType == pgtype.Empty { return empty() }
  lowerValue, upperValue := span.Bounds()
  var parts checkPublicParts
  cell := func(kind pgtype.BoundType, item any) checkruntime.ArrayElement {
    if kind == pgtype.Unbounded { return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementNull} }
    return parts.read(bound(item))
  }
  lower := cell(lowerType, lowerValue)
  upper := cell(upperType, upperValue)
  if parts.failed {
    if parts.undecided { return checkruntime.RangeUnknown() }
    return checkruntime.RangeValue{Kind: checkruntime.RangeValueError, Error: parts.failure}
  }
  flags := "("
  if lowerType == pgtype.Inclusive { flags = "[" }
  if upperType == pgtype.Inclusive { flags += "]" } else { flags += ")" }
  return construct(lower, upper, checkruntime.MakeTextValue(flags))
}`,
  },
  checkPublicMultirange: {
    dependencies: ['checkPublicParts'],
    source: `// The evaluator's multirange constructor sorts, drops empty ranges and merges as multirange input does.
func checkPublicMultirange(value any, rangeType string, span func(any) checkruntime.RangeValue, construct func(checkruntime.ArrayValue) checkruntime.MultirangeValue) checkruntime.MultirangeValue {
  items, ok := value.(interface{ Len() int; Index(int) any })
  if !ok { return checkRustInvalid[checkruntime.MultirangeValue]() }
  members := checkruntime.MakeArrayArguments(rangeType, 42)
  var parts checkPublicParts
  for index := 0; index < items.Len(); index++ {
    members = checkruntime.AppendArrayArgument(members, parts.read(checkruntime.ArrayElementFromRange(span(items.Index(index)))))
  }
  if parts.failed {
    if parts.undecided { return checkruntime.MultirangeUnknown() }
    return checkruntime.MultirangeValue{Kind: checkruntime.MultirangeValueError, Error: parts.failure}
  }
  return construct(checkruntime.FinishArrayConstructor(members))
}`,
  },
  checkPublicArray: {
    dependencies: ['checkPublicParts'],
    packages: ['reflect', 'strconv', 'strings'],
    source: `// An array has the dimension count its column declares, each level a slice, or one of several
// declared counts as the dimension type it holds; below the declared levels a slice is one element.
// Array input's rules apply: sub-arrays must match and an array without elements has no dimensions.
func checkPublicArray(value any, counts []int, elementType string, kind int, element func(any) checkruntime.ArrayElement) checkruntime.ArrayValue {
  depth := counts[0]
  native := reflect.ValueOf(value)
  if len(counts) > 1 {
    // The dimension types are named for their counts.
    name := native.Type().Name()
    count, err := strconv.Atoi(strings.TrimPrefix(name[:max(strings.IndexByte(name, '['), 0)], "D"))
    if err != nil { return checkRustInvalid[checkruntime.ArrayValue]() }
    depth = count
  }
  var parts checkPublicParts
  lengths := []int{}
  cells := []any{}
  var walk func(items reflect.Value, level int)
  walk = func(items reflect.Value, level int) {
    if items.Kind() != reflect.Slice { checkRustInvalid[struct{}](); return }
    if len(lengths) == level {
      lengths = append(lengths, items.Len())
    } else if lengths[level] != items.Len() {
      parts.fail(checkruntime.MakeSqlError(3484946), false)
    }
    for index := 0; index < items.Len(); index++ {
      if level+1 < depth { walk(items.Index(index), level+1) } else { cells = append(cells, items.Index(index).Interface()) }
    }
  }
  walk(native, 0)
  arguments := checkruntime.MakeArrayArguments(elementType, kind)
  if len(cells) > 0 {
    for _, length := range lengths { arguments = checkruntime.AppendArrayDimension(arguments, 1, length) }
  }
  for _, cell := range cells { arguments = checkruntime.AppendArrayArgument(arguments, parts.read(element(cell))) }
  if parts.failed {
    if parts.undecided { return checkruntime.ArrayUnknown() }
    return checkruntime.ArrayValue{Kind: checkruntime.ArrayValueError, Error: parts.failure}
  }
  return checkruntime.FinishArrayArguments(arguments)
}`,
  },
  checkPublicComposite: {
    dependencies: ['checkPublicParts'],
    packages: ['reflect'],
    source: `// A composite is the struct of its fields, read in attribute order.
func checkPublicComposite(value any, typeName string, fields []string, convert []func(any) checkruntime.ArrayElement) checkruntime.CompositeValue {
  native := reflect.ValueOf(value)
  if native.Kind() != reflect.Struct { return checkRustInvalid[checkruntime.CompositeValue]() }
  composite := checkruntime.MakeCompositeFields(typeName)
  var parts checkPublicParts
  for index, name := range fields {
    field := native.FieldByName(name)
    if !field.IsValid() { return checkRustInvalid[checkruntime.CompositeValue]() }
    composite = checkruntime.AppendCompositeField(composite, parts.read(convert[index](field.Interface())))
  }
  if parts.failed {
    if parts.undecided { return checkruntime.CompositeUnknown() }
    return checkruntime.CompositeValue{Kind: checkruntime.CompositeValueError, Error: parts.failure}
  }
  return composite
}`,
  },
  checkPublicDomainCell: {
    dependencies: ['checkPublicCell'],
    source: `// The server reads a part of a domain type through the domain's input: the base type's input, then
// the domain's NOT NULL and CHECK constraints, base domains first.
func checkPublicDomainCell(value any, notNull bool, base func(any) checkruntime.ArrayElement, evaluate func(any) ([]CheckEvaluation, bool), order []int) checkruntime.ArrayElement {
  element := base(value)
  if element.Kind == checkruntime.ArrayElementError || element.Kind == checkruntime.ArrayElementUnknown || element.Kind == checkruntime.ArrayElementUnimplemented { return element }
  if _, null := checkPublicCell(value); null && notNull {
    return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementError, Error: checkruntime.MakeSqlError(${parseInt('23502', 36)})}
  }
  if evaluate == nil { return element }
  results, decided := evaluate(value)
  if !decided { return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementUnknown} }
  for _, index := range order {
    result := results[index].Result
    if !result.Certain { return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementUnknown} }
    if result.Value.Error != "" {
      state, ok := checkRustState(result.Value.Error)
      if !ok { return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementUnknown} }
      return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementError, Error: state}
    }
    if result.Value.Valid && !result.Value.Value {
      return checkruntime.ArrayElement{Kind: checkruntime.ArrayElementError, Error: checkruntime.MakeSqlError(${parseInt('23514', 36)})}
    }
  }
  return element
}`,
  },
  checkPublicOptional: {
    dependencies: [],
    packages: ['reflect'],
    source: `// A domain's own checks take its value as its input field holds it: the value, a pointer to it, or
// a valid null wrapper around it.
func checkPublicOptional[X any](cell any, null bool) CheckOptional[X] {
  if null { return NullCheckValue[X]() }
  var field X
  target := reflect.ValueOf(&field).Elem()
  value := reflect.ValueOf(cell)
  switch {
  case value.Type().AssignableTo(target.Type()):
    target.Set(value)
  case target.Kind() == reflect.Pointer && value.Type().AssignableTo(target.Type().Elem()):
    pointer := reflect.New(target.Type().Elem())
    pointer.Elem().Set(value)
    target.Set(pointer)
  case target.Kind() == reflect.Struct && target.FieldByName("V").IsValid() && value.Type().AssignableTo(target.FieldByName("V").Type()):
    target.FieldByName("V").Set(value)
    target.FieldByName("Valid").SetBool(true)
  default:
    return checkRustInvalid[CheckOptional[X]]()
  }
  return KnownCheckValue(field)
}`,
  },
  checkPublicInternalChar: {
    dependencies: [],
    source: `// charin keeps the first byte, or the byte a four-character \\ooo escape names, or 0 for empty
// text; another server encoding stores a non-ASCII character's first byte differently.
func checkPublicInternalChar[S ~string](value S, utf8Server bool) checkruntime.InternalCharValue {
  text := string(value)
  if !utf8.ValidString(text) || strings.IndexByte(text, 0) >= 0 { return checkRustInvalid[checkruntime.InternalCharValue]() }
  if !utf8Server {
    for index := 0; index < len(text); index++ {
      if text[index] > 127 { return checkruntime.InternalCharUnknown() }
    }
  }
  octal := func(b byte) bool { return b >= '0' && b <= '7' }
  if len(text) == 4 && text[0] == '\\\\' && octal(text[1]) && octal(text[2]) && octal(text[3]) {
    return checkruntime.MakeInternalCharValue((int(text[1]-'0')<<6 + int(text[2]-'0')<<3 + int(text[3]-'0')) & 255)
  }
  if text == "" { return checkruntime.MakeInternalCharValue(0) }
  return checkruntime.MakeInternalCharValue(int(text[0]))
}`,
  },
}

// The converter sources a check file uses, with what they use, in a stable order, and the packages
// they import.
export function goCheckPublicSource(used: ReadonlySet<string>): {
  source: string
  packages: ReadonlySet<GoPublicPackage>
} {
  const included = new Set<string>()
  const visit = (name: string) => {
    if (included.has(name)) return
    const converter = converters[name]
    if (!converter) throw new Error(`Unknown Go CHECK public converter: ${name}`)
    included.add(name)
    for (const dependency of converter.dependencies) visit(dependency)
  }
  for (const name of used) visit(name)
  const names = Object.keys(converters).filter((name) => included.has(name))
  return {
    source: names.map((name) => converters[name]!.source).join('\n'),
    packages: new Set(names.flatMap((name) => converters[name]!.packages ?? [])),
  }
}

export const goCheckPublicConverters = new Set(Object.keys(converters))

// A domain's values are its base type's, so they are converted as those.
export function goCheckBaseOid(
  typeOid: number | undefined,
  domains: readonly DomainInfo[],
): number | undefined {
  let oid = typeOid
  for (let domain = domains.find((item) => item.oid === oid), seen = new Set<number>(); domain && !seen.has(domain.oid); domain = domains.find((item) => item.oid === oid)) {
    seen.add(domain.oid)
    oid = domain.baseTypeOid
  }
  return oid
}

// The type a family's text input reads, as the shared evaluator names it; the OID alias types
// differ only by the name their input resolves.
const familyTypes: Readonly<Record<string, string>> = {
  JsonValue: 'pg_catalog."json"',
  JsonbValue: 'pg_catalog.jsonb',
  TsvectorValue: 'pg_catalog.tsvector',
  TsqueryValue: 'pg_catalog.tsquery',
  AclitemValue: 'pg_catalog.aclitem',
  MoneyValue: 'pg_catalog.money',
  PgLsnValue: 'pg_catalog.pg_lsn',
  TidValue: 'pg_catalog.tid',
  SnapshotValue: 'pg_catalog.pg_snapshot',
  XmlValue: 'pg_catalog.xml',
}
const oidAliasTypes: Readonly<Record<number, string>> = {
  24: 'pg_catalog.regproc',
  2202: 'pg_catalog.regprocedure',
  2203: 'pg_catalog.regoper',
  2204: 'pg_catalog.regoperator',
  2205: 'pg_catalog.regclass',
  2206: 'pg_catalog.regtype',
  3734: 'pg_catalog.regconfig',
  3769: 'pg_catalog.regdictionary',
  4089: 'pg_catalog.regnamespace',
  4096: 'pg_catalog.regrole',
  4191: 'pg_catalog.regcollation',
}

// The runtime's names for its callables, as the Go translation spells them: built-in functions
// lose their schema prefix.
export const goCallable = (name: string): string =>
  name
    .replace(/^sql__pg_catalog__/u, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const literal = (value: boolean | number): GoExpression =>
  typeof value === 'boolean' ? go.ident(String(value)) : go.number(value)

export interface GoCheckPublicConversion {
  // A function from the public value to the runtime value.
  convert: GoExpression
  converters: readonly string[]
  packages: readonly GoPublicPackage[]
}

/**
 * How an input of a scalar family is converted from its public value, or null where the input
 * still takes the runtime value. `goBase` is the public type, set.
 */
export function goCheckPublicConversion(
  runtimeType: string,
  baseOid: number | undefined,
  goBase: GoExpression,
  context: CheckExecutionContext = {},
): GoCheckPublicConversion | null {
  const baseType =
    familyTypes[runtimeType] ?? (baseOid === undefined ? undefined : oidAliasTypes[baseOid])
  const named = (
    name: string,
    packages: GoCheckPublicConversion['packages'] = [],
  ): GoCheckPublicConversion => ({ convert: go.ident(name), converters: [name], packages })
  const generic = (name: string, packages: GoCheckPublicConversion['packages'] = []) => ({
    convert: go.index(go.ident(name), goBase),
    converters: [name],
    packages,
  })
  // A type sent as text, read through its input function with the declared server settings.
  const text = (
    read: (value: GoExpression) => GoExpression,
    call: { module: 'operations' | 'runtime'; callable: string; args: (boolean | number)[] },
  ): GoCheckPublicConversion => ({
    convert: {
      kind: 'function-literal',
      parameters: [{ names: ['value'], type: goBase }],
      results: [{ type: go.selector(go.ident('checkruntime'), runtimeType) }],
      body: [
        go.return(
          go.call(
            go.selector(
              go.ident(call.module === 'runtime' ? 'checkruntime' : 'pg_catalog'),
              goCallable(call.callable),
            ),
            [go.call(go.ident('checkPublicText'), [read(go.ident('value'))]), ...call.args.map(literal)],
          ),
        ),
      ],
    },
    converters: ['checkPublicText'],
    packages: call.module === 'operations' ? ['operations'] : [],
  })
  const asString = (value: GoExpression) => go.call(go.ident('string'), [value])
  const utf8 = context.serverEncoding === 'UTF8'
  switch (runtimeType) {
    case 'DateValue':
      return named('checkPublicDate')
    case 'TimestampValue':
      return named('checkPublicTimestamp', ['time'])
    case 'TimestamptzValue':
      return named('checkPublicTimestamptz', ['time'])
    case 'IntervalValue':
      return named('checkPublicInterval')
    case 'TimeValue':
      return named('checkPublicTime')
    case 'TimetzValue':
      return named('checkPublicTimetz')
    case 'PointValue':
      return named('checkPublicPoint', ['math'])
    case 'LineValue':
      return named('checkPublicLine', ['math'])
    case 'LsegValue':
      return named('checkPublicLseg', ['math'])
    case 'BoxValue':
      return named('checkPublicBox', ['math'])
    case 'PathValue':
      return named('checkPublicPath', ['math'])
    case 'PolygonValue':
      return named('checkPublicPolygon', ['math'])
    case 'CircleValue':
      return named('checkPublicCircle', ['math'])
    case 'XidValue':
      return generic('checkPublicXid')
    case 'CidValue':
      return generic('checkPublicCid')
    case 'Xid8Value':
      return generic('checkPublicXid8')
    case 'NumericValue':
      return named('checkPublicNumeric')
    case 'InternalCharValue':
      return {
        convert: {
          kind: 'function-literal',
          parameters: [{ names: ['value'], type: goBase }],
          results: [{ type: go.selector(go.ident('checkruntime'), runtimeType) }],
          body: [
            go.return(
              go.call(go.ident('checkPublicInternalChar'), [go.ident('value'), literal(utf8)]),
            ),
          ],
        },
        converters: ['checkPublicInternalChar'],
        packages: [],
      }
    case 'JsonValue':
    case 'JsonbValue':
      return text(
        (value) => go.call(go.selector(value, 'Text'), []),
        checkRustTextInput(baseType!, context)!,
      )
    case 'JsonpathValue':
      return text(asString, {
        module: 'operations',
        callable: 'jsonpath_from_text',
        args: [context.defaultCollation === 'C', utf8],
      })
  }
  const input = baseType ? checkRustTextInput(baseType, context) : null
  if (input) return text(asString, input)
  if (runtimeType === 'OidValue') return generic('checkPublicOid')
  return null
}
