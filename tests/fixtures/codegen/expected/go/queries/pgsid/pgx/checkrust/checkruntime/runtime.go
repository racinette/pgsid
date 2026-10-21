package checkruntime

import langruntime "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx/checkrust/langruntime"

type Int2ValueKind uint8

const (
	Int2ValueUnknown Int2ValueKind = iota
	Int2ValueNull
	Int2ValueValue
	Int2ValueError
)

type Int2Value struct {
	Kind  Int2ValueKind
	Value int
	Error SqlError
}

func Int2Unknown() Int2Value {
	return Int2Value{Kind: Int2ValueUnknown}
}
func Int2Null() Int2Value {
	return Int2Value{Kind: Int2ValueNull}
}
func MakeInt2Value(value int) Int2Value {
	value = langruntime.CheckedI32(value)
	if value < langruntime.CheckedSignedNegate(32768) || value > 32767 {
		return Int2Value{Kind: Int2ValueUnknown}
	}
	return Int2Value{Kind: Int2ValueValue, Value: value}
}
func Int2IsNull(value Int2Value) BoolValue {
	if value.Kind == Int2ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Int2Value{Kind: Int2ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Int2Value{Kind: Int2ValueNull})}
}
func Int2FromCaseGuard(value CheckOutcome) Int2Value {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Int2Value{Kind: Int2ValueError, Error: error}
	}
	return Int2Value{Kind: Int2ValueUnknown}
}
func Int2ToInt4(value Int2Value) Int4Value {
	if value.Kind == Int2ValueError {
		error := value.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if value == (Int2Value{Kind: Int2ValueNull}) {
		return Int4Value{Kind: Int4ValueNull}
	}
	if value.Kind == Int2ValueValue {
		number := langruntime.CheckedI32(value.Value)
		return Int4Value{Kind: Int4ValueValue, Value: number}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func Int2ToInt8(value Int2Value) Int8Value {
	if value.Kind == Int2ValueError {
		error := value.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if value == (Int2Value{Kind: Int2ValueNull}) {
		return Int8Value{Kind: Int8ValueNull}
	}
	if value.Kind == Int2ValueValue {
		number := langruntime.CheckedI32(value.Value)
		widened := int64(langruntime.CheckedI32(number))
		return Int8Value{Kind: Int8ValueValue, Value: widened}
	}
	return Int8Value{Kind: Int8ValueUnknown}
}

type Int4ValueKind uint8

const (
	Int4ValueUnknown Int4ValueKind = iota
	Int4ValueNull
	Int4ValueValue
	Int4ValueError
)

type Int4Value struct {
	Kind  Int4ValueKind
	Value int
	Error SqlError
}
type Int8ValueKind uint8

const (
	Int8ValueUnknown Int8ValueKind = iota
	Int8ValueNull
	Int8ValueValue
	Int8ValueError
)

type Int8Value struct {
	Kind  Int8ValueKind
	Value int64
	Error SqlError
}

const timestampFieldOverflow = 3452552

func timestampMicrosecondsValid(value int64) bool {
	return value == int64(-9223372036854775808) || value == int64(9223372036854775807) || (value >= int64(-211813488000000000) && value < int64(9223371331200000000))
}

type TimestampValueKind uint8

const (
	TimestampValueUnknown TimestampValueKind = iota
	TimestampValueNull
	TimestampValueValue
	TimestampValueError
)

type TimestampValue struct {
	Kind  TimestampValueKind
	Value int64
	Error SqlError
}

func TimestampUnknown() TimestampValue {
	return TimestampValue{Kind: TimestampValueUnknown}
}
func TimestampNull() TimestampValue {
	return TimestampValue{Kind: TimestampValueNull}
}
func MakeTimestampValue(value int64) TimestampValue {
	if timestampMicrosecondsValid(value) == false {
		return TimestampValue{Kind: TimestampValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	return TimestampValue{Kind: TimestampValueValue, Value: value}
}
func TimestampIsNull(value TimestampValue) BoolValue {
	if value.Kind == TimestampValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (TimestampValue{Kind: TimestampValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (TimestampValue{Kind: TimestampValueNull})}
}
func TimestampFromCaseGuard(value CheckOutcome) TimestampValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return TimestampValue{Kind: TimestampValueError, Error: error}
	}
	return TimestampValue{Kind: TimestampValueUnknown}
}

type TimestamptzValueKind uint8

const (
	TimestamptzValueUnknown TimestamptzValueKind = iota
	TimestamptzValueNull
	TimestamptzValueValue
	TimestamptzValueError
)

type TimestamptzValue struct {
	Kind  TimestamptzValueKind
	Value int64
	Error SqlError
}

func TimestamptzUnknown() TimestamptzValue {
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
}
func TimestamptzNull() TimestamptzValue {
	return TimestamptzValue{Kind: TimestamptzValueNull}
}
func MakeTimestamptzValue(value int64) TimestamptzValue {
	if timestampMicrosecondsValid(value) == false {
		return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	return TimestamptzValue{Kind: TimestamptzValueValue, Value: value}
}
func TimestamptzIsNull(value TimestamptzValue) BoolValue {
	if value.Kind == TimestamptzValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (TimestamptzValue{Kind: TimestamptzValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (TimestamptzValue{Kind: TimestamptzValueNull})}
}
func TimestamptzFromCaseGuard(value CheckOutcome) TimestamptzValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return TimestamptzValue{Kind: TimestamptzValueError, Error: error}
	}
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
}

type EnumPayload struct {
	Ordinal  int
	LabelOid int64
}
type EnumValueKind uint8

const (
	EnumValueUnknown EnumValueKind = iota
	EnumValueNull
	EnumValueValue
	EnumValueError
)

type EnumValue struct {
	Kind  EnumValueKind
	Value EnumPayload
	Error SqlError
}

func EnumUnknown() EnumValue {
	return EnumValue{Kind: EnumValueUnknown}
}
func EnumNull() EnumValue {
	return EnumValue{Kind: EnumValueNull}
}
func MakeEnumValue(value int) EnumValue {
	value = langruntime.CheckedI32(value)
	return EnumValue{Kind: EnumValueValue, Value: EnumPayload{Ordinal: value, LabelOid: int64(0)}}
}
func MakeCatalogEnumValue(ordinal int, labelOid int64) EnumValue {
	ordinal = langruntime.CheckedI32(ordinal)
	if ordinal < 0 || labelOid < int64(1) || labelOid > int64(4294967295) {
		return EnumValue{Kind: EnumValueUnknown}
	}
	return EnumValue{Kind: EnumValueValue, Value: EnumPayload{Ordinal: ordinal, LabelOid: labelOid}}
}
func EnumIsNull(value EnumValue) BoolValue {
	if value.Kind == EnumValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (EnumValue{Kind: EnumValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (EnumValue{Kind: EnumValueNull})}
}
func EnumFromCaseGuard(value CheckOutcome) EnumValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return EnumValue{Kind: EnumValueError, Error: error}
	}
	return EnumValue{Kind: EnumValueUnknown}
}

type DateValueKind uint8

const (
	DateValueUnknown DateValueKind = iota
	DateValueNull
	DateValueValue
	DateValueError
)

type DateValue struct {
	Kind  DateValueKind
	Value int
	Error SqlError
}

func DateUnknown() DateValue {
	return DateValue{Kind: DateValueUnknown}
}
func DateNull() DateValue {
	return DateValue{Kind: DateValueNull}
}
func MakeDateValue(value int) DateValue {
	value = langruntime.CheckedI32(value)
	if value != langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) && value != 2147483647 {
		if value < langruntime.CheckedSignedNegate(2451545) || value >= 2145031949 {
			return DateValue{Kind: DateValueError, Error: SqlError{State: dateFieldOverflow}}
		}
	}
	return DateValue{Kind: DateValueValue, Value: value}
}
func DateIsNull(value DateValue) BoolValue {
	if value.Kind == DateValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (DateValue{Kind: DateValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (DateValue{Kind: DateValueNull})}
}
func DateFromCaseGuard(value CheckOutcome) DateValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	return DateValue{Kind: DateValueUnknown}
}

type TextValueKind uint8

const (
	TextValueUnknown TextValueKind = iota
	TextValueNull
	TextValueValue
	TextValueError
)

type TextValue struct {
	Kind  TextValueKind
	Value string
	Error SqlError
}

func Int4Unknown() Int4Value {
	return Int4Value{Kind: Int4ValueUnknown}
}
func Int4Null() Int4Value {
	return Int4Value{Kind: Int4ValueNull}
}
func MakeInt4Value(value int) Int4Value {
	value = langruntime.CheckedI32(value)
	return Int4Value{Kind: Int4ValueValue, Value: value}
}
func Int8Unknown() Int8Value {
	return Int8Value{Kind: Int8ValueUnknown}
}
func Int8Null() Int8Value {
	return Int8Value{Kind: Int8ValueNull}
}
func MakeInt8Value(value int64) Int8Value {
	return Int8Value{Kind: Int8ValueValue, Value: value}
}
func TextUnknown() TextValue {
	return TextValue{Kind: TextValueUnknown}
}
func TextNull() TextValue {
	return TextValue{Kind: TextValueNull}
}
func MakeNameTextValue(value string) TextValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	index := 0
	for index < len(chars) {
		code := int(langruntime.CheckedChar(chars[index]))
		if code == 0 || (code >= 55296 && code <= 57343) {
			return TextValue{Kind: TextValueUnknown}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return TextValue{Kind: TextValueValue, Value: value}
}
func MakeRefcursorTextValue(value string) TextValue {
	value = langruntime.CheckedString(value)
	return MakeNameTextValue(value)
}
func MakeTextValue(value string) TextValue {
	value = langruntime.CheckedString(value)
	return TextValue{Kind: TextValueValue, Value: value}
}
func BoolUnknown() BoolValue {
	return BoolValue{Kind: BoolValueUnknown}
}
func BoolNull() BoolValue {
	return BoolValue{Kind: BoolValueNull}
}
func MakeBoolValue(value bool) BoolValue {
	return BoolValue{Kind: BoolValueValue, Value: value}
}

type CheckOutcomeKind uint8

const (
	CheckOutcomeTrue CheckOutcomeKind = iota
	CheckOutcomeFalse
	CheckOutcomeNull
	CheckOutcomeUnknown
	CheckOutcomeError
)

type CheckOutcome struct {
	Kind  CheckOutcomeKind
	Error SqlError
}
type SqlError struct {
	State int
}

func MakeSqlError(state int) SqlError {
	state = langruntime.CheckedIndex(state)
	return SqlError{State: state}
}

type SqlErrorDescription struct {
	Message string
}

func copySqlErrorDescription(value SqlErrorDescription) SqlErrorDescription {
	return SqlErrorDescription{Message: langruntime.CheckedString(value.Message)}
}

const sqlErrorNumericOutOfRange = 3452547
const sqlErrorNotNullViolation = 3505682
const sqlErrorCheckViolation = 3505720
const sqlErrorCardinalityViolation = 3405888
const sqlErrorNullValueNotAllowed = 3452548
const sqlErrorInvalidDatetimeFormat = 3452551
const sqlErrorDatetimeFieldOverflow = 3452552
const sqlErrorTimezoneDisplacement = 3452553
const sqlErrorInvalidUseOfEscape = 3452556
const sqlErrorDivisionByZero = 3452582
const sqlErrorInvalidFrameSize = 3452583
const sqlErrorSubstring = 3452581
const sqlErrorInvalidRegex = 3452591
const sqlErrorInvalidLogarithm = 3452594
const sqlErrorInvalidPower = 3452595
const sqlErrorInvalidWidthBucket = 3452596
const sqlErrorInvalidParameter = 3452619
const sqlErrorInvalidEscape = 3452621
const sqlErrorInvalidTextRepresentation = 3484946
const sqlErrorUndefinedObject = 6820852
const sqlErrorSyntax = 6819553
const sqlErrorStringLengthMismatch = 3452622
const sqlErrorStringRightTruncation = 3452545
const sqlErrorArraySubscript = 3452630
const sqlErrorFeatureNotSupported = 466560
const sqlErrorProgramLimit = 8584704
const sqlErrorInternal = 56966976
const sqlErrorObjectNotReady = 8631360
const sqlErrorJsonDatetime = 3452653
const sqlErrorJsonNonNumeric = 3452658
const sqlErrorJsonSubscript = 3452655
const sqlErrorJsonArray = 3452661
const sqlErrorJsonMember = 3452662
const sqlErrorJsonNumber = 3452663
const sqlErrorJsonObject = 3452664
const sqlErrorJsonSingleton = 3452660

func SqlErrorMessage(error SqlError) SqlErrorDescription {
	if error.State == sqlErrorCardinalityViolation {
		return SqlErrorDescription{Message: "cardinality violation"}
	}
	if error.State == sqlErrorNotNullViolation {
		return SqlErrorDescription{Message: "not-null constraint violation"}
	}
	if error.State == sqlErrorCheckViolation {
		return SqlErrorDescription{Message: "check constraint violation"}
	}
	if error.State == sqlErrorObjectNotReady {
		return SqlErrorDescription{Message: "object not in prerequisite state"}
	}
	if error.State == sqlErrorNullValueNotAllowed {
		return SqlErrorDescription{Message: "null value not allowed"}
	}
	if error.State == sqlErrorJsonDatetime {
		return SqlErrorDescription{Message: "invalid argument for SQL/JSON datetime function"}
	}
	if error.State == sqlErrorJsonNonNumeric {
		return SqlErrorDescription{Message: "non-numeric SQL/JSON item"}
	}
	if error.State == sqlErrorJsonSubscript {
		return SqlErrorDescription{Message: "invalid SQL/JSON subscript"}
	}
	if error.State == sqlErrorJsonArray {
		return SqlErrorDescription{Message: "SQL/JSON array not found"}
	}
	if error.State == sqlErrorJsonMember {
		return SqlErrorDescription{Message: "SQL/JSON member not found"}
	}
	if error.State == sqlErrorJsonNumber {
		return SqlErrorDescription{Message: "SQL/JSON number not found"}
	}
	if error.State == sqlErrorJsonObject {
		return SqlErrorDescription{Message: "SQL/JSON object not found"}
	}
	if error.State == sqlErrorJsonSingleton {
		return SqlErrorDescription{Message: "singleton SQL/JSON item required"}
	}
	if error.State == sqlErrorSyntax {
		return SqlErrorDescription{Message: "syntax error"}
	}
	if error.State == sqlErrorUndefinedObject {
		return SqlErrorDescription{Message: "undefined object"}
	}
	if error.State == sqlErrorFeatureNotSupported {
		return SqlErrorDescription{Message: "feature not supported"}
	}
	if error.State == sqlErrorInvalidFrameSize {
		return SqlErrorDescription{Message: "invalid preceding or following size"}
	}
	if error.State == sqlErrorInvalidEscape {
		return SqlErrorDescription{Message: "invalid escape sequence"}
	}
	if error.State == sqlErrorInvalidUseOfEscape {
		return SqlErrorDescription{Message: "invalid use of escape character"}
	}
	if error.State == sqlErrorInternal {
		return SqlErrorDescription{Message: "internal error"}
	}
	if error.State == sqlErrorSubstring {
		return SqlErrorDescription{Message: "substring error"}
	}
	if error.State == sqlErrorArraySubscript {
		return SqlErrorDescription{Message: "array subscript error"}
	}
	if error.State == sqlErrorProgramLimit {
		return SqlErrorDescription{Message: "program limit exceeded"}
	}
	if error.State == sqlErrorStringRightTruncation {
		return SqlErrorDescription{Message: "string data right truncation"}
	}
	if error.State == sqlErrorStringLengthMismatch {
		return SqlErrorDescription{Message: "string data length mismatch"}
	}
	if error.State == sqlErrorInvalidTextRepresentation {
		return SqlErrorDescription{Message: "invalid text representation"}
	}
	if error.State == sqlErrorNumericOutOfRange {
		return SqlErrorDescription{Message: "numeric value out of range"}
	}
	if error.State == sqlErrorInvalidDatetimeFormat {
		return SqlErrorDescription{Message: "invalid date/time format"}
	}
	if error.State == sqlErrorDatetimeFieldOverflow {
		return SqlErrorDescription{Message: "date/time field value out of range"}
	}
	if error.State == sqlErrorTimezoneDisplacement {
		return SqlErrorDescription{Message: "time zone displacement out of range"}
	}
	if error.State == sqlErrorDivisionByZero {
		return SqlErrorDescription{Message: "division by zero"}
	}
	if error.State == sqlErrorInvalidLogarithm {
		return SqlErrorDescription{Message: "invalid argument for logarithm"}
	}
	if error.State == sqlErrorInvalidPower {
		return SqlErrorDescription{Message: "invalid argument for power function"}
	}
	if error.State == sqlErrorInvalidWidthBucket {
		return SqlErrorDescription{Message: "invalid argument for width_bucket function"}
	}
	if error.State == sqlErrorInvalidRegex {
		return SqlErrorDescription{Message: "invalid regular expression"}
	}
	if error.State == sqlErrorInvalidParameter {
		return SqlErrorDescription{Message: "invalid parameter value"}
	}
	return SqlErrorDescription{Message: "SQL evaluation failed"}
}

type BoolValueKind uint8

const (
	BoolValueUnknown BoolValueKind = iota
	BoolValueNull
	BoolValueValue
	BoolValueError
)

type BoolValue struct {
	Kind  BoolValueKind
	Value bool
	Error SqlError
}

func CheckFromBool(value BoolValue) CheckOutcome {
	if value.Kind == BoolValueError {
		error := value.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if value == (BoolValue{Kind: BoolValueUnknown}) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	if value == (BoolValue{Kind: BoolValueNull}) {
		return CheckOutcome{Kind: CheckOutcomeNull}
	}
	if value == (BoolValue{Kind: BoolValueValue, Value: false}) {
		return CheckOutcome{Kind: CheckOutcomeFalse}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func CheckUnknown() CheckOutcome {
	return CheckOutcome{Kind: CheckOutcomeUnknown}
}
func Int4IsNull(value Int4Value) BoolValue {
	if value.Kind == Int4ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Int4Value{Kind: Int4ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Int4Value{Kind: Int4ValueNull})}
}
func Int8IsNull(value Int8Value) BoolValue {
	if value.Kind == Int8ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Int8Value{Kind: Int8ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Int8Value{Kind: Int8ValueNull})}
}
func TextIsNull(value TextValue) BoolValue {
	if value.Kind == TextValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (TextValue{Kind: TextValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (TextValue{Kind: TextValueNull})}
}
func BoolIsNull(value BoolValue) BoolValue {
	if value.Kind == BoolValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (BoolValue{Kind: BoolValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (BoolValue{Kind: BoolValueNull})}
}
func BoolNotValue(value BoolValue) BoolValue {
	if value.Kind == BoolValueValue {
		result := value.Value
		if result {
			return BoolValue{Kind: BoolValueValue, Value: false}
		}
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return value
}
func BoolFromCheck(value CheckOutcome) BoolValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if value == (CheckOutcome{Kind: CheckOutcomeNull}) {
		return BoolValue{Kind: BoolValueNull}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (CheckOutcome{Kind: CheckOutcomeTrue})}
}
func Int4FromCaseGuard(value CheckOutcome) Int4Value {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func Int8FromCaseGuard(value CheckOutcome) Int8Value {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	return Int8Value{Kind: Int8ValueUnknown}
}
func TextFromCaseGuard(value CheckOutcome) TextValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	return TextValue{Kind: TextValueUnknown}
}

type NumericValueKind uint8

const (
	NumericValueUnknown NumericValueKind = iota
	NumericValueNull
	NumericValueValue
	NumericValueError
)

type NumericValue struct {
	Kind  NumericValueKind
	Value string
	Error SqlError
}

func copyNumericValue(value NumericValue) NumericValue {
	switch value.Kind {
	case NumericValueUnknown:
		return NumericValue{Kind: NumericValueUnknown}
	case NumericValueNull:
		return NumericValue{Kind: NumericValueNull}
	case NumericValueValue:
		return NumericValue{Kind: NumericValueValue, Value: langruntime.CheckedString(value.Value)}
	case NumericValueError:
		return NumericValue{Kind: NumericValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func NumericUnknown() NumericValue {
	return NumericValue{Kind: NumericValueUnknown}
}
func NumericNull() NumericValue {
	return NumericValue{Kind: NumericValueNull}
}
func NumericIsNull(value NumericValue) BoolValue {
	if value.Kind == NumericValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (NumericValue{Kind: NumericValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (NumericValue{Kind: NumericValueNull})}
}
func NumericFromCaseGuard(value CheckOutcome) NumericValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return NumericValue{Kind: NumericValueError, Error: error}
	}
	return NumericValue{Kind: NumericValueUnknown}
}
func MakeNumericValue(value string) NumericValue {
	value = langruntime.CheckedString(value)
	parts := NumericParts(value)
	if parts.Valid == false {
		return NumericValue{Kind: NumericValueUnknown}
	}
	return NumericValue{Kind: NumericValueValue, Value: value}
}

type JsonPayload struct {
	Source string
	Kind   int
	Depth  int
}
type JsonValueKind uint8

const (
	JsonValueUnknown JsonValueKind = iota
	JsonValueNull
	JsonValueValue
	JsonValueError
)

type JsonValue struct {
	Kind  JsonValueKind
	Value JsonPayload
	Error SqlError
}

func JsonUnknown() JsonValue {
	return JsonValue{Kind: JsonValueUnknown}
}
func JsonNull() JsonValue {
	return JsonValue{Kind: JsonValueNull}
}
func MakeJsonValue(source string) JsonValue {
	source = langruntime.CheckedString(source)
	syntax := JsonSyntaxScan(source)
	if syntax.Valid == false {
		return JsonValue{Kind: JsonValueUnknown}
	}
	return JsonValue{Kind: JsonValueValue, Value: JsonPayload{Source: source, Kind: syntax.Kind, Depth: syntax.MaxDepth}}
}
func JsonFromCoercedText(input TextValue) JsonValue {
	if input.Kind == TextValueError {
		error := input.Error
		return JsonValue{Kind: JsonValueError, Error: error}
	}
	if input.Kind == TextValueNull {
		return JsonValue{Kind: JsonValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return MakeJsonValue(value)
	}
	return JsonValue{Kind: JsonValueUnknown}
}
func JsonIsNull(input JsonValue) BoolValue {
	if input.Kind == JsonValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == JsonValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == JsonValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func JsonFromCaseGuard(value CheckOutcome) JsonValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return JsonValue{Kind: JsonValueError, Error: error}
	}
	return JsonValue{Kind: JsonValueUnknown}
}

type JsonbNode struct {
	Kind      int
	Child     int
	Next      int
	KeyStart  int
	KeyEnd    int
	TextStart int
	TextEnd   int
}

func copyJsonbNode(value JsonbNode) JsonbNode {
	return JsonbNode{Kind: langruntime.CheckedI32(value.Kind), Child: langruntime.CheckedIndex(value.Child), Next: langruntime.CheckedIndex(value.Next), KeyStart: langruntime.CheckedIndex(value.KeyStart), KeyEnd: langruntime.CheckedIndex(value.KeyEnd), TextStart: langruntime.CheckedIndex(value.TextStart), TextEnd: langruntime.CheckedIndex(value.TextEnd)}
}

type JsonbPayload struct {
	Characters []rune
	Nodes      []JsonbNode
	Root       int
}

func CopyJsonbPayload(value JsonbPayload) JsonbPayload {
	return JsonbPayload{Characters: langruntime.CheckedChars(value.Characters), Nodes: langruntime.CheckedStructs(value.Nodes, copyJsonbNode), Root: langruntime.CheckedIndex(value.Root)}
}

type JsonbValueKind uint8

const (
	JsonbValueUnknown JsonbValueKind = iota
	JsonbValueNull
	JsonbValueValue
	JsonbValueError
)

type JsonbValue struct {
	Kind  JsonbValueKind
	Value JsonbPayload
	Error SqlError
}

func CopyJsonbValue(value JsonbValue) JsonbValue {
	switch value.Kind {
	case JsonbValueUnknown:
		return JsonbValue{Kind: JsonbValueUnknown}
	case JsonbValueNull:
		return JsonbValue{Kind: JsonbValueNull}
	case JsonbValueValue:
		return JsonbValue{Kind: JsonbValueValue, Value: CopyJsonbPayload(value.Value)}
	case JsonbValueError:
		return JsonbValue{Kind: JsonbValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}

type JsonbInputKind uint8

const (
	JsonbInputUnknown JsonbInputKind = iota
	JsonbInputNull
	JsonbInputError
	JsonbInputConvertedError
	JsonbInputBoolean
	JsonbInputNumber
	JsonbInputText
	JsonbInputJson
	JsonbInputJsonb
)

type JsonbInput struct {
	Kind           JsonbInputKind
	Error          SqlError
	ConvertedError SqlError
	Boolean        bool
	Number         string
	Text           string
	Json           JsonPayload
	Jsonb          JsonbPayload
}

func CopyJsonbInput(value JsonbInput) JsonbInput {
	switch value.Kind {
	case JsonbInputUnknown:
		return JsonbInput{Kind: JsonbInputUnknown}
	case JsonbInputNull:
		return JsonbInput{Kind: JsonbInputNull}
	case JsonbInputError:
		return JsonbInput{Kind: JsonbInputError, Error: value.Error}
	case JsonbInputConvertedError:
		return JsonbInput{Kind: JsonbInputConvertedError, ConvertedError: value.ConvertedError}
	case JsonbInputBoolean:
		return JsonbInput{Kind: JsonbInputBoolean, Boolean: value.Boolean}
	case JsonbInputNumber:
		return JsonbInput{Kind: JsonbInputNumber, Number: langruntime.CheckedString(value.Number)}
	case JsonbInputText:
		return JsonbInput{Kind: JsonbInputText, Text: langruntime.CheckedString(value.Text)}
	case JsonbInputJson:
		return JsonbInput{Kind: JsonbInputJson, Json: value.Json}
	case JsonbInputJsonb:
		return JsonbInput{Kind: JsonbInputJsonb, Jsonb: CopyJsonbPayload(value.Jsonb)}
	}
	panic("unknown enum variant")
}

type JsonbArgumentPayload struct {
	Values []JsonbInput
}

func CopyJsonbArgumentPayload(value JsonbArgumentPayload) JsonbArgumentPayload {
	return JsonbArgumentPayload{Values: langruntime.CheckedStructs(value.Values, CopyJsonbInput)}
}

type JsonbArgumentsKind uint8

const (
	JsonbArgumentsUnknown JsonbArgumentsKind = iota
	JsonbArgumentsNull
	JsonbArgumentsError
	JsonbArgumentsValues
)

type JsonbArguments struct {
	Kind   JsonbArgumentsKind
	Error  SqlError
	Values JsonbArgumentPayload
}

func CopyJsonbArguments(value JsonbArguments) JsonbArguments {
	switch value.Kind {
	case JsonbArgumentsUnknown:
		return JsonbArguments{Kind: JsonbArgumentsUnknown}
	case JsonbArgumentsNull:
		return JsonbArguments{Kind: JsonbArgumentsNull}
	case JsonbArgumentsError:
		return JsonbArguments{Kind: JsonbArgumentsError, Error: value.Error}
	case JsonbArgumentsValues:
		return JsonbArguments{Kind: JsonbArgumentsValues, Values: CopyJsonbArgumentPayload(value.Values)}
	}
	panic("unknown enum variant")
}
func MakeJsonbArguments() JsonbArguments {
	values := []JsonbInput{}
	return JsonbArguments{Kind: JsonbArgumentsValues, Values: JsonbArgumentPayload{Values: values}}
}
func AppendJsonbArgument(input JsonbArguments, value JsonbInput) JsonbArguments {
	input = CopyJsonbArguments(input)
	value = CopyJsonbInput(value)
	if input.Kind == JsonbArgumentsValues {
		batch := CopyJsonbArgumentPayload(input.Values)
		values := batch.Values
		langruntime.CheckedAdd(len(values), 1)
		values = append(values, CopyJsonbInput(value))
		return JsonbArguments{Kind: JsonbArgumentsValues, Values: JsonbArgumentPayload{Values: values}}
	}
	return input
}
func JsonbKeyInputFromFloat4(input Float4Value) JsonbInput {
	if input.Kind == Float4ValueValue {
		bits := langruntime.CheckedI32(input.Value)
		if bits == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
			return JsonbInput{Kind: JsonbInputNumber, Number: "-0"}
		}
	}
	return JsonbInputFromFloat4(input)
}
func JsonbKeyInputFromFloat8(input Float8Value) JsonbInput {
	if input.Kind == Float8ValueValue {
		bits := input.Value
		if bits == int64(-9223372036854775808) {
			return JsonbInput{Kind: JsonbInputNumber, Number: "-0"}
		}
	}
	return JsonbInputFromFloat8(input)
}
func JsonbInputFromBool(input BoolValue) JsonbInput {
	if input.Kind == BoolValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input.Kind == BoolValueNull {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input.Kind == BoolValueValue {
		value := input.Value
		return JsonbInput{Kind: JsonbInputBoolean, Boolean: value}
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func JsonbInputFromNumeric(input NumericValue) JsonbInput {
	if input.Kind == NumericValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input.Kind == NumericValueNull {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input.Kind == NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		return JsonbInput{Kind: JsonbInputNumber, Number: value}
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func JsonbInputFromText(input TextValue) JsonbInput {
	if input.Kind == TextValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input.Kind == TextValueNull {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return JsonbInput{Kind: JsonbInputText, Text: value}
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func JsonbInputFromJson(input JsonValue) JsonbInput {
	if input.Kind == JsonValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input.Kind == JsonValueNull {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		return JsonbInput{Kind: JsonbInputJson, Json: value}
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func JsonbInputFromJsonb(input JsonbValue) JsonbInput {
	input = CopyJsonbValue(input)
	if input.Kind == JsonbValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input.Kind == JsonbValueNull {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		return JsonbInput{Kind: JsonbInputJsonb, Jsonb: value}
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func jsonbInputFloat(number float64) JsonbInput {
	if number != number {
		return JsonbInput{Kind: JsonbInputNumber, Number: "NaN"}
	}
	infinity := langruntime.F64Divide(float64(1.0), float64(0.0))
	if number == infinity {
		return JsonbInput{Kind: JsonbInputNumber, Number: "Infinity"}
	}
	if number == langruntime.F64Subtract(float64(0.0), infinity) {
		return JsonbInput{Kind: JsonbInputNumber, Number: "-Infinity"}
	}
	if number == float64(0.0) {
		return JsonbInput{Kind: JsonbInputNumber, Number: "0"}
	}
	absolute := langruntime.F64Abs(number)
	if absolute >= float64(1.0) && absolute <= float64(9.0) {
		digit := langruntime.F64ToI32(absolute)
		if (float64(digit)) == absolute {
			output := langruntime.NewTextBuffer("")
			if number < float64(0.0) {
				output = append(output, string(langruntime.CheckedChar('-'))...)
			}
			output = append(output, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(digit, 48)), '0')))...)
			return JsonbInput{Kind: JsonbInputNumber, Number: string(output)}
		}
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func JsonbInputFromFloat4(input Float4Value) JsonbInput {
	if input.Kind == Float4ValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input == (Float4Value{Kind: Float4ValueNull}) {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input == (Float4Value{Kind: Float4ValueUnspecifiedNan}) {
		return JsonbInput{Kind: JsonbInputNumber, Number: "NaN"}
	}
	if input.Kind == Float4ValueValue {
		bits := langruntime.CheckedI32(input.Value)
		number := Float4Number(bits)
		return jsonbInputFloat(number)
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func JsonbInputFromFloat8(input Float8Value) JsonbInput {
	if input.Kind == Float8ValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input == (Float8Value{Kind: Float8ValueNull}) {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input == (Float8Value{Kind: Float8ValueUnspecifiedNan}) {
		return JsonbInput{Kind: JsonbInputNumber, Number: "NaN"}
	}
	if input.Kind == Float8ValueValue {
		bits := input.Value
		number := Float8Number(bits)
		return jsonbInputFloat(number)
	}
	return JsonbInput{Kind: JsonbInputUnknown}
}
func MakeJsonbValue(source string) JsonbValue {
	source = langruntime.CheckedString(source)
	parsed := jsonbParseText(TextValue{Kind: TextValueValue, Value: source}, false)
	if parsed.Kind == JsonbValueError {
		return JsonbValue{Kind: JsonbValueUnknown}
	}
	return parsed
}
func JsonbUnknown() JsonbValue {
	return JsonbValue{Kind: JsonbValueUnknown}
}
func JsonbNull() JsonbValue {
	return JsonbValue{Kind: JsonbValueNull}
}
func JsonbFromCaseGuard(value CheckOutcome) JsonbValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return JsonbValue{Kind: JsonbValueError, Error: error}
	}
	return JsonbValue{Kind: JsonbValueUnknown}
}
func JsonbIsNull(input JsonbValue) BoolValue {
	input = CopyJsonbValue(input)
	if input.Kind == JsonbValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == JsonbValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == JsonbValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func JsonbFromCoercedValue(input JsonbValue) JsonbValue {
	input = CopyJsonbValue(input)
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		if jsonbInputValid(&value) == false {
			return JsonbValue{Kind: JsonbValueUnknown}
		}
		source := jsonbRender(JsonbValue{Kind: JsonbValueValue, Value: value}, false, false)
		if source.Kind == TextValueValue {
			text := langruntime.CheckedString(source.Value)
			return MakeJsonbValue(text)
		}
		return JsonbValue{Kind: JsonbValueUnknown}
	}
	return input
}

type NetworkAddress struct {
	Family int
	Prefix int
	Word0  int
	Word1  int
	Word2  int
	Word3  int
	Word4  int
	Word5  int
	Word6  int
	Word7  int
}
type NetworkValueKind uint8

const (
	NetworkValueUnknown NetworkValueKind = iota
	NetworkValueNull
	NetworkValueValue
	NetworkValueError
)

type NetworkValue struct {
	Kind  NetworkValueKind
	Value NetworkAddress
	Error SqlError
}

func NetworkUnknown() NetworkValue {
	return NetworkValue{Kind: NetworkValueUnknown}
}
func NetworkNull() NetworkValue {
	return NetworkValue{Kind: NetworkValueNull}
}
func NetworkIsNull(value NetworkValue) BoolValue {
	if value.Kind == NetworkValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (NetworkValue{Kind: NetworkValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (NetworkValue{Kind: NetworkValueNull})}
}
func NetworkFromCaseGuard(value CheckOutcome) NetworkValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	return NetworkValue{Kind: NetworkValueUnknown}
}
func MakeNetworkValue(value string) NetworkValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) > 256 {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	parsed := networkParse(value, false)
	if parsed.Kind == NetworkValueError {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	return parsed
}
func MakeCidrValue(value string) NetworkValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) > 256 {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	parsed := networkParse(value, true)
	if parsed.Kind == NetworkValueError {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	return parsed
}

type BitValueKind uint8

const (
	BitValueUnknown BitValueKind = iota
	BitValueNull
	BitValueValue
	BitValueError
)

type BitValue struct {
	Kind  BitValueKind
	Value string
	Error SqlError
}

func BitUnknown() BitValue {
	return BitValue{Kind: BitValueUnknown}
}
func BitNull() BitValue {
	return BitValue{Kind: BitValueNull}
}
func BitIsNull(value BitValue) BoolValue {
	if value.Kind == BitValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (BitValue{Kind: BitValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (BitValue{Kind: BitValueNull})}
}
func BitFromCaseGuard(value CheckOutcome) BitValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return BitValue{Kind: BitValueError, Error: error}
	}
	return BitValue{Kind: BitValueUnknown}
}
func MakeBitValue(value string) BitValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) > 2147483640 {
		return BitValue{Kind: BitValueUnknown}
	}
	index := 0
	for index < len(chars) {
		if chars[index] != '0' && chars[index] != '1' {
			return BitValue{Kind: BitValueUnknown}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return BitValue{Kind: BitValueValue, Value: value}
}

type ByteaValueKind uint8

const (
	ByteaValueUnknown ByteaValueKind = iota
	ByteaValueNull
	ByteaValueValue
	ByteaValueError
	ByteaValueUnspecified
)

type ByteaValue struct {
	Kind        ByteaValueKind
	Value       string
	Error       SqlError
	Unspecified int
}

func ByteaUnknown() ByteaValue {
	return ByteaValue{Kind: ByteaValueUnknown}
}
func ByteaNull() ByteaValue {
	return ByteaValue{Kind: ByteaValueNull}
}
func ByteaIsNull(value ByteaValue) BoolValue {
	if value.Kind == ByteaValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (ByteaValue{Kind: ByteaValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (ByteaValue{Kind: ByteaValueNull})}
}
func ByteaFromCaseGuard(value CheckOutcome) ByteaValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return ByteaValue{Kind: ByteaValueError, Error: error}
	}
	return ByteaValue{Kind: ByteaValueUnknown}
}
func MakeByteaValue(value string) ByteaValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	even := true
	output := langruntime.NewTextBuffer("")
	index := 0
	for index < len(chars) {
		character := langruntime.AsciiLowercase(chars[index])
		code := int(langruntime.CheckedChar(character))
		if (code < 48 || code > 57) && (code < 97 || code > 102) {
			return ByteaValue{Kind: ByteaValueUnknown}
		}
		output = append(output, string(langruntime.CheckedChar(character))...)
		even = even == false
		index = langruntime.CheckedAdd(index, 1)
	}
	if even == false {
		return ByteaValue{Kind: ByteaValueUnknown}
	}
	return ByteaValue{Kind: ByteaValueValue, Value: string(output)}
}

type MacAddress struct {
	Word0 int
	Word1 int
	Word2 int
	Word3 int
}
type MacaddrValueKind uint8

const (
	MacaddrValueUnknown MacaddrValueKind = iota
	MacaddrValueNull
	MacaddrValueValue
	MacaddrValueError
)

type MacaddrValue struct {
	Kind  MacaddrValueKind
	Value MacAddress
	Error SqlError
}

func MacaddrUnknown() MacaddrValue {
	return MacaddrValue{Kind: MacaddrValueUnknown}
}
func MacaddrNull() MacaddrValue {
	return MacaddrValue{Kind: MacaddrValueNull}
}
func MacaddrIsNull(value MacaddrValue) BoolValue {
	if value.Kind == MacaddrValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (MacaddrValue{Kind: MacaddrValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (MacaddrValue{Kind: MacaddrValueNull})}
}
func MacaddrFromCaseGuard(value CheckOutcome) MacaddrValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return MacaddrValue{Kind: MacaddrValueError, Error: error}
	}
	return MacaddrValue{Kind: MacaddrValueUnknown}
}
func MakeMacaddrValue(value string) MacaddrValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) > 256 {
		return MacaddrValue{Kind: MacaddrValueUnknown}
	}
	text := macText{chars: chars}
	parsed := macaddrParse(&text)
	if parsed.valid == false {
		return MacaddrValue{Kind: MacaddrValueUnknown}
	}
	return MacaddrValue{Kind: MacaddrValueValue, Value: parsed.address}
}

type Macaddr8ValueKind uint8

const (
	Macaddr8ValueUnknown Macaddr8ValueKind = iota
	Macaddr8ValueNull
	Macaddr8ValueValue
	Macaddr8ValueError
)

type Macaddr8Value struct {
	Kind  Macaddr8ValueKind
	Value MacAddress
	Error SqlError
}

func Macaddr8Unknown() Macaddr8Value {
	return Macaddr8Value{Kind: Macaddr8ValueUnknown}
}
func Macaddr8Null() Macaddr8Value {
	return Macaddr8Value{Kind: Macaddr8ValueNull}
}
func Macaddr8IsNull(value Macaddr8Value) BoolValue {
	if value.Kind == Macaddr8ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Macaddr8Value{Kind: Macaddr8ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Macaddr8Value{Kind: Macaddr8ValueNull})}
}
func Macaddr8FromCaseGuard(value CheckOutcome) Macaddr8Value {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Macaddr8Value{Kind: Macaddr8ValueError, Error: error}
	}
	return Macaddr8Value{Kind: Macaddr8ValueUnknown}
}
func MakeMacaddr8Value(value string) Macaddr8Value {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) > 256 {
		return Macaddr8Value{Kind: Macaddr8ValueUnknown}
	}
	text := macText{chars: chars}
	parsed := macaddr8Parse(&text)
	if parsed.valid == false {
		return Macaddr8Value{Kind: Macaddr8ValueUnknown}
	}
	return Macaddr8Value{Kind: Macaddr8ValueValue, Value: parsed.address}
}

type Uuid struct {
	Word0 int
	Word1 int
	Word2 int
	Word3 int
	Word4 int
	Word5 int
	Word6 int
	Word7 int
}
type UuidValueKind uint8

const (
	UuidValueUnknown UuidValueKind = iota
	UuidValueNull
	UuidValueValue
	UuidValueError
)

type UuidValue struct {
	Kind  UuidValueKind
	Value Uuid
	Error SqlError
}

func UuidUnknown() UuidValue {
	return UuidValue{Kind: UuidValueUnknown}
}
func UuidNull() UuidValue {
	return UuidValue{Kind: UuidValueNull}
}
func UuidIsNull(value UuidValue) BoolValue {
	if value.Kind == UuidValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (UuidValue{Kind: UuidValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (UuidValue{Kind: UuidValueNull})}
}
func UuidFromCaseGuard(value CheckOutcome) UuidValue {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return UuidValue{Kind: UuidValueError, Error: error}
	}
	return UuidValue{Kind: UuidValueUnknown}
}
func MakeUuidValue(value string) UuidValue {
	value = langruntime.CheckedString(value)
	parsed := uuidParse(value)
	if parsed.Kind == UuidValueError {
		return UuidValue{Kind: UuidValueUnknown}
	}
	return parsed
}

type Float4ValueKind uint8

const (
	Float4ValueUnknown Float4ValueKind = iota
	Float4ValueNull
	Float4ValueValue
	Float4ValueError
	Float4ValueUnspecifiedNan
)

type Float4Value struct {
	Kind  Float4ValueKind
	Value int
	Error SqlError
}

func MakeFloat4LiteralBits(bits int) Float4Value {
	bits = langruntime.CheckedI32(bits)
	number := langruntime.F32FromI32Bits(bits)
	if number != number {
		return Float4Value{Kind: Float4ValueUnspecifiedNan}
	}
	return MakeFloat4Bits(bits)
}
func Float4Unknown() Float4Value {
	return Float4Value{Kind: Float4ValueUnknown}
}
func Float4Null() Float4Value {
	return Float4Value{Kind: Float4ValueNull}
}
func MakeFloat4Bits(bits int) Float4Value {
	bits = langruntime.CheckedI32(bits)
	return Float4Value{Kind: Float4ValueValue, Value: bits}
}
func Float4Number(bits int) float64 {
	bits = langruntime.CheckedI32(bits)
	return langruntime.F32FromI32Bits(bits)
}
func MakeFloat4Value(value float64) Float4Value {
	bits := langruntime.F32ToI32Bits(value)
	rounded := Float4Number(bits)
	if value == value && rounded != value {
		return Float4Value{Kind: Float4ValueUnknown}
	}
	return Float4Value{Kind: Float4ValueValue, Value: bits}
}
func Float4IsNull(value Float4Value) BoolValue {
	if value.Kind == Float4ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Float4Value{Kind: Float4ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Float4Value{Kind: Float4ValueNull})}
}
func Float4FromCaseGuard(value CheckOutcome) Float4Value {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Float4Value{Kind: Float4ValueError, Error: error}
	}
	return Float4Value{Kind: Float4ValueUnknown}
}

type Float8ValueKind uint8

const (
	Float8ValueUnknown Float8ValueKind = iota
	Float8ValueNull
	Float8ValueValue
	Float8ValueError
	Float8ValueUnspecifiedNan
)

type Float8Value struct {
	Kind  Float8ValueKind
	Value int64
	Error SqlError
}

func copyFloat8Value(value Float8Value) Float8Value {
	switch value.Kind {
	case Float8ValueUnknown:
		return Float8Value{Kind: Float8ValueUnknown}
	case Float8ValueNull:
		return Float8Value{Kind: Float8ValueNull}
	case Float8ValueValue:
		return Float8Value{Kind: Float8ValueValue, Value: value.Value}
	case Float8ValueError:
		return Float8Value{Kind: Float8ValueError, Error: value.Error}
	case Float8ValueUnspecifiedNan:
		return Float8Value{Kind: Float8ValueUnspecifiedNan}
	}
	panic("unknown enum variant")
}
func Float8Semantic(input Float8Value) Float8Value {
	if input == (Float8Value{Kind: Float8ValueUnspecifiedNan}) {
		return MakeFloat8Bits(int64(9221120237041090560))
	}
	return input
}
func MakeFloat8LiteralBits(bits int64) Float8Value {
	number := langruntime.F64FromI64Bits(bits)
	if number != number {
		return Float8Value{Kind: Float8ValueUnspecifiedNan}
	}
	return MakeFloat8Bits(bits)
}
func Float8Unknown() Float8Value {
	return Float8Value{Kind: Float8ValueUnknown}
}
func Float8Null() Float8Value {
	return Float8Value{Kind: Float8ValueNull}
}
func MakeFloat8Bits(bits int64) Float8Value {
	return Float8Value{Kind: Float8ValueValue, Value: bits}
}
func Float8Number(bits int64) float64 {
	return langruntime.F64FromI64Bits(bits)
}
func MakeFloat8Value(value float64) Float8Value {
	bits := langruntime.F64ToI64Bits(value)
	return Float8Value{Kind: Float8ValueValue, Value: bits}
}
func Float8IsNull(value Float8Value) BoolValue {
	if value.Kind == Float8ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Float8Value{Kind: Float8ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Float8Value{Kind: Float8ValueNull})}
}
func Float8FromCaseGuard(value CheckOutcome) Float8Value {
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Float8Value{Kind: Float8ValueError, Error: error}
	}
	return Float8Value{Kind: Float8ValueUnknown}
}

type TimeValueKind uint8

const (
	TimeValueUnknown TimeValueKind = iota
	TimeValueNull
	TimeValueValue
	TimeValueError
)

type TimeValue struct {
	Kind  TimeValueKind
	Value int64
	Error SqlError
}

func TimeUnknown() TimeValue {
	return TimeValue{Kind: TimeValueUnknown}
}
func TimeNull() TimeValue {
	return TimeValue{Kind: TimeValueNull}
}
func MakeTimeValue(time int64) TimeValue {
	if time < int64(0) || time > int64(86400000000) {
		return TimeValue{Kind: TimeValueUnknown}
	}
	return TimeValue{Kind: TimeValueValue, Value: time}
}
func TimeIsNull(input TimeValue) BoolValue {
	if input.Kind == TimeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (TimeValue{Kind: TimeValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: input == (TimeValue{Kind: TimeValueNull})}
}
func TimeFromCaseGuard(input CheckOutcome) TimeValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TimeValue{Kind: TimeValueError, Error: error}
	}
	return TimeValue{Kind: TimeValueUnknown}
}

type TimetzPayload struct {
	Time int64
	Zone int
}
type TimetzValueKind uint8

const (
	TimetzValueUnknown TimetzValueKind = iota
	TimetzValueNull
	TimetzValueValue
	TimetzValueError
)

type TimetzValue struct {
	Kind  TimetzValueKind
	Value TimetzPayload
	Error SqlError
}

func TimetzUnknown() TimetzValue {
	return TimetzValue{Kind: TimetzValueUnknown}
}
func TimetzNull() TimetzValue {
	return TimetzValue{Kind: TimetzValueNull}
}
func MakeTimetzValue(time int64, zone int) TimetzValue {
	zone = langruntime.CheckedI32(zone)
	if time < int64(0) || time > int64(86400000000) {
		return TimetzValue{Kind: TimetzValueUnknown}
	}
	return TimetzValue{Kind: TimetzValueValue, Value: TimetzPayload{Time: time, Zone: zone}}
}
func TimetzIsNull(input TimetzValue) BoolValue {
	if input.Kind == TimetzValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (TimetzValue{Kind: TimetzValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: input == (TimetzValue{Kind: TimetzValueNull})}
}
func TimetzFromCaseGuard(input CheckOutcome) TimetzValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TimetzValue{Kind: TimetzValueError, Error: error}
	}
	return TimetzValue{Kind: TimetzValueUnknown}
}

type IntervalPayload struct {
	Months int
	Days   int
	Time   int64
}
type IntervalValueKind uint8

const (
	IntervalValueUnknown IntervalValueKind = iota
	IntervalValueNull
	IntervalValueValue
	IntervalValueError
)

type IntervalValue struct {
	Kind  IntervalValueKind
	Value IntervalPayload
	Error SqlError
}

func IntervalUnknown() IntervalValue {
	return IntervalValue{Kind: IntervalValueUnknown}
}
func IntervalNull() IntervalValue {
	return IntervalValue{Kind: IntervalValueNull}
}
func MakeIntervalValue(months int, days int, time int64) IntervalValue {
	months = langruntime.CheckedI32(months)
	days = langruntime.CheckedI32(days)
	return IntervalValue{Kind: IntervalValueValue, Value: IntervalPayload{Months: months, Days: days, Time: time}}
}
func IntervalIsNull(input IntervalValue) BoolValue {
	if input.Kind == IntervalValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (IntervalValue{Kind: IntervalValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: input == (IntervalValue{Kind: IntervalValueNull})}
}
func IntervalFromCaseGuard(input CheckOutcome) IntervalValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	return IntervalValue{Kind: IntervalValueUnknown}
}

type PointPayload struct {
	X         int64
	Y         int64
	WireKnown bool
}

func CopyPointPayload(value PointPayload) PointPayload {
	return PointPayload{X: value.X, Y: value.Y, WireKnown: value.WireKnown}
}

type PointValueKind uint8

const (
	PointValueUnknown PointValueKind = iota
	PointValueNull
	PointValueValue
	PointValueError
)

type PointValue struct {
	Kind  PointValueKind
	Value PointPayload
	Error SqlError
}

func PointUnknown() PointValue {
	return PointValue{Kind: PointValueUnknown}
}
func PointNull() PointValue {
	return PointValue{Kind: PointValueNull}
}
func MakePointBits(x int64, y int64) PointValue {
	return PointValue{Kind: PointValueValue, Value: PointPayload{X: x, Y: y, WireKnown: true}}
}
func MakePointValue(x float64, y float64) PointValue {
	xBits := langruntime.F64ToI64Bits(x)
	yBits := langruntime.F64ToI64Bits(y)
	return MakePointBits(xBits, yBits)
}
func PointIsNull(input PointValue) BoolValue {
	if input.Kind == PointValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (PointValue{Kind: PointValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (PointValue{Kind: PointValueNull}))
}
func PointFromCaseGuard(input CheckOutcome) PointValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PointValue{Kind: PointValueError, Error: error}
	}
	return PointValue{Kind: PointValueUnknown}
}

type LinePayload struct {
	A         int64
	B         int64
	C         int64
	WireKnown bool
}
type LineValueKind uint8

const (
	LineValueUnknown LineValueKind = iota
	LineValueNull
	LineValueValue
	LineValueError
)

type LineValue struct {
	Kind  LineValueKind
	Value LinePayload
	Error SqlError
}

func LineUnknown() LineValue {
	return LineValue{Kind: LineValueUnknown}
}
func LineNull() LineValue {
	return LineValue{Kind: LineValueNull}
}
func MakeLineBits(a int64, b int64, c int64) LineValue {
	first := Float8Number(a)
	second := Float8Number(b)
	if langruntime.F64Abs(first) <= float64(0.000001) && langruntime.F64Abs(second) <= float64(0.000001) {
		return LineValue{Kind: LineValueUnknown}
	}
	return LineValue{Kind: LineValueValue, Value: LinePayload{A: a, B: b, C: c, WireKnown: true}}
}
func LineIsNull(input LineValue) BoolValue {
	if input.Kind == LineValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (LineValue{Kind: LineValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (LineValue{Kind: LineValueNull}))
}
func LineFromCaseGuard(input CheckOutcome) LineValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return LineValue{Kind: LineValueError, Error: error}
	}
	return LineValue{Kind: LineValueUnknown}
}

type LsegPayload struct {
	X1        int64
	Y1        int64
	X2        int64
	Y2        int64
	WireKnown bool
}
type LsegValueKind uint8

const (
	LsegValueUnknown LsegValueKind = iota
	LsegValueNull
	LsegValueValue
	LsegValueError
)

type LsegValue struct {
	Kind  LsegValueKind
	Value LsegPayload
	Error SqlError
}

func LsegUnknown() LsegValue {
	return LsegValue{Kind: LsegValueUnknown}
}
func LsegNull() LsegValue {
	return LsegValue{Kind: LsegValueNull}
}
func MakeLsegBits(x1 int64, y1 int64, x2 int64, y2 int64) LsegValue {
	return LsegValue{Kind: LsegValueValue, Value: LsegPayload{X1: x1, Y1: y1, X2: x2, Y2: y2, WireKnown: true}}
}
func LsegIsNull(input LsegValue) BoolValue {
	if input.Kind == LsegValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (LsegValue{Kind: LsegValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (LsegValue{Kind: LsegValueNull}))
}
func LsegFromCaseGuard(input CheckOutcome) LsegValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return LsegValue{Kind: LsegValueError, Error: error}
	}
	return LsegValue{Kind: LsegValueUnknown}
}

type BoxPayload struct {
	HighX     int64
	HighY     int64
	LowX      int64
	LowY      int64
	WireKnown bool
}
type BoxValueKind uint8

const (
	BoxValueUnknown BoxValueKind = iota
	BoxValueNull
	BoxValueValue
	BoxValueError
	BoxValueNonNull
)

type BoxValue struct {
	Kind  BoxValueKind
	Value BoxPayload
	Error SqlError
}

func BoxUnknown() BoxValue {
	return BoxValue{Kind: BoxValueUnknown}
}
func BoxNull() BoxValue {
	return BoxValue{Kind: BoxValueNull}
}
func MakeBoxBits(highX int64, highY int64, lowX int64, lowY int64) BoxValue {
	return BoxValue{Kind: BoxValueValue, Value: BoxPayload{HighX: highX, HighY: highY, LowX: lowX, LowY: lowY, WireKnown: true}}
}
func BoxIsNull(input BoxValue) BoolValue {
	if input.Kind == BoxValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (BoxValue{Kind: BoxValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (BoxValue{Kind: BoxValueNull}))
}
func BoxFromCaseGuard(input CheckOutcome) BoxValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return BoxValue{Kind: BoxValueError, Error: error}
	}
	return BoxValue{Kind: BoxValueUnknown}
}

type CirclePayload struct {
	X         int64
	Y         int64
	Radius    int64
	WireKnown bool
}
type PathPayload struct {
	Closed bool
	Points []PointPayload
}

func CopyPathPayload(value PathPayload) PathPayload {
	return PathPayload{Closed: value.Closed, Points: langruntime.CheckedStructs(value.Points, CopyPointPayload)}
}

type PathValueKind uint8

const (
	PathValueUnknown PathValueKind = iota
	PathValueNull
	PathValueValue
	PathValueError
)

type PathValue struct {
	Kind  PathValueKind
	Value PathPayload
	Error SqlError
}

func CopyPathValue(value PathValue) PathValue {
	switch value.Kind {
	case PathValueUnknown:
		return PathValue{Kind: PathValueUnknown}
	case PathValueNull:
		return PathValue{Kind: PathValueNull}
	case PathValueValue:
		return PathValue{Kind: PathValueValue, Value: CopyPathPayload(value.Value)}
	case PathValueError:
		return PathValue{Kind: PathValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func PathUnknown() PathValue {
	return PathValue{Kind: PathValueUnknown}
}
func PathNull() PathValue {
	return PathValue{Kind: PathValueNull}
}
func MakePathValue(payload PathPayload) PathValue {
	payload = CopyPathPayload(payload)
	if len(payload.Points) == 0 {
		return PathValue{Kind: PathValueUnknown}
	}
	return PathValue{Kind: PathValueValue, Value: payload}
}
func PathIsNull(input PathValue) BoolValue {
	input = CopyPathValue(input)
	if input.Kind == PathValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == PathValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == PathValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func PathFromCaseGuard(input CheckOutcome) PathValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PathValue{Kind: PathValueError, Error: error}
	}
	return PathValue{Kind: PathValueUnknown}
}

type PolygonPayload struct {
	Points []PointPayload
	Bounds BoxValue
}

func CopyPolygonPayload(value PolygonPayload) PolygonPayload {
	return PolygonPayload{Points: langruntime.CheckedStructs(value.Points, CopyPointPayload), Bounds: value.Bounds}
}

type PolygonValueKind uint8

const (
	PolygonValueUnknown PolygonValueKind = iota
	PolygonValueNull
	PolygonValueValue
	PolygonValueError
)

type PolygonValue struct {
	Kind  PolygonValueKind
	Value PolygonPayload
	Error SqlError
}

func CopyPolygonValue(value PolygonValue) PolygonValue {
	switch value.Kind {
	case PolygonValueUnknown:
		return PolygonValue{Kind: PolygonValueUnknown}
	case PolygonValueNull:
		return PolygonValue{Kind: PolygonValueNull}
	case PolygonValueValue:
		return PolygonValue{Kind: PolygonValueValue, Value: CopyPolygonPayload(value.Value)}
	case PolygonValueError:
		return PolygonValue{Kind: PolygonValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func polygonCoordinateLess(left int64, right int64) bool {
	a := Float8Number(left)
	b := Float8Number(right)
	if b != b {
		return a == a
	}
	return a < b
}
func polygonCoordinateEqual(left int64, right int64) bool {
	a := Float8Number(left)
	b := Float8Number(right)
	return a == b || (a != a && b != b)
}
func polygonCoordinateKnown(point PointPayload, y bool) bool {
	bits := point.X
	if y {
		bits = point.Y
	}
	value := Float8Number(bits)
	return point.WireKnown || value == value
}
func polygonCalculatedBounds(payload PolygonPayload) BoxPayload {
	payload = CopyPolygonPayload(payload)
	first := payload.Points[0]
	highX := first.X
	highY := first.Y
	lowX := first.X
	lowY := first.Y
	highXKnown := polygonCoordinateKnown(first, false)
	highYKnown := polygonCoordinateKnown(first, true)
	lowXKnown := highXKnown
	lowYKnown := highYKnown
	index := 1
	for index < len(payload.Points) {
		point := payload.Points[index]
		if polygonCoordinateLess(point.X, lowX) {
			lowX = point.X
			lowXKnown = polygonCoordinateKnown(point, false)
		}
		if polygonCoordinateLess(highX, point.X) {
			highX = point.X
			highXKnown = polygonCoordinateKnown(point, false)
		}
		if polygonCoordinateLess(point.Y, lowY) {
			lowY = point.Y
			lowYKnown = polygonCoordinateKnown(point, true)
		}
		if polygonCoordinateLess(highY, point.Y) {
			highY = point.Y
			highYKnown = polygonCoordinateKnown(point, true)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return BoxPayload{HighX: highX, HighY: highY, LowX: lowX, LowY: lowY, WireKnown: highXKnown && highYKnown && lowXKnown && lowYKnown}
}
func polygonBoundsAmbiguous(payload PolygonPayload, bounds BoxPayload) bool {
	payload = CopyPolygonPayload(payload)
	if bounds.WireKnown == false {
		return true
	}
	index := 0
	for index < len(payload.Points) {
		point := payload.Points[index]
		if (polygonCoordinateEqual(point.X, bounds.HighX) && point.X != bounds.HighX) || (polygonCoordinateEqual(point.X, bounds.LowX) && point.X != bounds.LowX) || (polygonCoordinateEqual(point.Y, bounds.HighY) && point.Y != bounds.HighY) || (polygonCoordinateEqual(point.Y, bounds.LowY) && point.Y != bounds.LowY) {
			return true
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return false
}
func MakePolygonValue(payload PolygonPayload) PolygonValue {
	payload = CopyPolygonPayload(payload)
	maximumPoints := 134217725
	fallback := 0
	maximum := langruntime.IndexFromI32(maximumPoints, fallback)
	if len(payload.Points) == 0 || len(payload.Points) > maximum {
		return PolygonValue{Kind: PolygonValueUnknown}
	}
	calculated := polygonCalculatedBounds(CopyPolygonPayload(payload))
	bounds := payload.Bounds
	if bounds == (BoxValue{Kind: BoxValueUnknown}) {
		bounds = BoxValue{Kind: BoxValueNonNull}
		if polygonBoundsAmbiguous(CopyPolygonPayload(payload), calculated) == false {
			bounds = BoxValue{Kind: BoxValueValue, Value: calculated}
		}
	}
	if bounds.Kind == BoxValueValue {
		actual := bounds.Value
		if polygonCoordinateEqual(actual.HighX, calculated.HighX) == false || polygonCoordinateEqual(actual.HighY, calculated.HighY) == false || polygonCoordinateEqual(actual.LowX, calculated.LowX) == false || polygonCoordinateEqual(actual.LowY, calculated.LowY) == false {
			return PolygonValue{Kind: PolygonValueUnknown}
		}
	}
	if bounds == (BoxValue{Kind: BoxValueNull}) {
		return PolygonValue{Kind: PolygonValueUnknown}
	}
	if bounds.Kind == BoxValueError {
		return PolygonValue{Kind: PolygonValueUnknown}
	}
	return PolygonValue{Kind: PolygonValueValue, Value: PolygonPayload{Points: payload.Points, Bounds: bounds}}
}
func MakePolygonPoints(payload PolygonPayload) PolygonValue {
	payload = CopyPolygonPayload(payload)
	maximumPoints := 134217725
	fallback := 0
	maximum := langruntime.IndexFromI32(maximumPoints, fallback)
	if len(payload.Points) == 0 || len(payload.Points) > maximum {
		return PolygonValue{Kind: PolygonValueUnknown}
	}
	bounds := polygonCalculatedBounds(CopyPolygonPayload(payload))
	return PolygonValue{Kind: PolygonValueValue, Value: PolygonPayload{Points: payload.Points, Bounds: BoxValue{Kind: BoxValueValue, Value: bounds}}}
}
func PolygonUnknown() PolygonValue {
	return PolygonValue{Kind: PolygonValueUnknown}
}
func PolygonNull() PolygonValue {
	return PolygonValue{Kind: PolygonValueNull}
}
func PolygonIsNull(input PolygonValue) BoolValue {
	input = CopyPolygonValue(input)
	if input.Kind == PolygonValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == PolygonValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == PolygonValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func PolygonFromCaseGuard(input CheckOutcome) PolygonValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PolygonValue{Kind: PolygonValueError, Error: error}
	}
	return PolygonValue{Kind: PolygonValueUnknown}
}

type CircleValueKind uint8

const (
	CircleValueUnknown CircleValueKind = iota
	CircleValueNull
	CircleValueValue
	CircleValueError
)

type CircleValue struct {
	Kind  CircleValueKind
	Value CirclePayload
	Error SqlError
}

func CircleUnknown() CircleValue {
	return CircleValue{Kind: CircleValueUnknown}
}
func CircleNull() CircleValue {
	return CircleValue{Kind: CircleValueNull}
}
func MakeCircleBits(x int64, y int64, radius int64) CircleValue {
	return CircleValue{Kind: CircleValueValue, Value: CirclePayload{X: x, Y: y, Radius: radius, WireKnown: true}}
}
func CircleIsNull(input CircleValue) BoolValue {
	if input.Kind == CircleValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (CircleValue{Kind: CircleValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (CircleValue{Kind: CircleValueNull}))
}
func CircleFromCaseGuard(input CheckOutcome) CircleValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return CircleValue{Kind: CircleValueError, Error: error}
	}
	return CircleValue{Kind: CircleValueUnknown}
}

type MoneyValueKind uint8

const (
	MoneyValueUnknown MoneyValueKind = iota
	MoneyValueNull
	MoneyValueValue
	MoneyValueError
)

type MoneyValue struct {
	Kind  MoneyValueKind
	Value int64
	Error SqlError
}

func MoneyUnknown() MoneyValue {
	return MoneyValue{Kind: MoneyValueUnknown}
}
func MoneyNull() MoneyValue {
	return MoneyValue{Kind: MoneyValueNull}
}
func MakeMoneyValue(units int64) MoneyValue {
	return MoneyValue{Kind: MoneyValueValue, Value: units}
}
func MoneyIsNull(input MoneyValue) BoolValue {
	if input.Kind == MoneyValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (MoneyValue{Kind: MoneyValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (MoneyValue{Kind: MoneyValueNull}))
}
func MoneyFromCaseGuard(input CheckOutcome) MoneyValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return MoneyValue{Kind: MoneyValueError, Error: error}
	}
	return MoneyValue{Kind: MoneyValueUnknown}
}

type InternalCharValueKind uint8

const (
	InternalCharValueUnknown InternalCharValueKind = iota
	InternalCharValueNull
	InternalCharValueValue
	InternalCharValueError
)

type InternalCharValue struct {
	Kind  InternalCharValueKind
	Value int
	Error SqlError
}

func InternalCharUnknown() InternalCharValue {
	return InternalCharValue{Kind: InternalCharValueUnknown}
}
func InternalCharNull() InternalCharValue {
	return InternalCharValue{Kind: InternalCharValueNull}
}
func MakeInternalCharValue(units int) InternalCharValue {
	units = langruntime.CheckedI32(units)
	if units < 0 || units > 255 {
		return InternalCharValue{Kind: InternalCharValueUnknown}
	}
	return InternalCharValue{Kind: InternalCharValueValue, Value: units}
}
func InternalCharIsNull(input InternalCharValue) BoolValue {
	if input.Kind == InternalCharValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (InternalCharValue{Kind: InternalCharValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (InternalCharValue{Kind: InternalCharValueNull}))
}
func InternalCharFromCaseGuard(input CheckOutcome) InternalCharValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return InternalCharValue{Kind: InternalCharValueError, Error: error}
	}
	return InternalCharValue{Kind: InternalCharValueUnknown}
}

type OidValueKind uint8

const (
	OidValueUnknown OidValueKind = iota
	OidValueNull
	OidValueValue
	OidValueError
)

type OidValue struct {
	Kind  OidValueKind
	Value int64
	Error SqlError
}

func OidUnknown() OidValue {
	return OidValue{Kind: OidValueUnknown}
}
func OidNull() OidValue {
	return OidValue{Kind: OidValueNull}
}
func MakeOidValue(units int64) OidValue {
	if units < int64(0) || units > int64(4294967295) {
		return OidValue{Kind: OidValueUnknown}
	}
	return OidValue{Kind: OidValueValue, Value: units}
}
func OidIsNull(input OidValue) BoolValue {
	if input.Kind == OidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (OidValue{Kind: OidValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (OidValue{Kind: OidValueNull}))
}
func OidFromCaseGuard(input CheckOutcome) OidValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return OidValue{Kind: OidValueError, Error: error}
	}
	return OidValue{Kind: OidValueUnknown}
}

type XidValueKind uint8

const (
	XidValueUnknown XidValueKind = iota
	XidValueNull
	XidValueValue
	XidValueError
)

type XidValue struct {
	Kind  XidValueKind
	Value int64
	Error SqlError
}

func XidUnknown() XidValue {
	return XidValue{Kind: XidValueUnknown}
}
func XidNull() XidValue {
	return XidValue{Kind: XidValueNull}
}
func MakeXidValue(units int64) XidValue {
	if units < int64(0) || units > int64(4294967295) {
		return XidValue{Kind: XidValueUnknown}
	}
	return XidValue{Kind: XidValueValue, Value: units}
}
func XidIsNull(input XidValue) BoolValue {
	if input.Kind == XidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (XidValue{Kind: XidValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (XidValue{Kind: XidValueNull}))
}
func XidFromCaseGuard(input CheckOutcome) XidValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return XidValue{Kind: XidValueError, Error: error}
	}
	return XidValue{Kind: XidValueUnknown}
}

type CidValueKind uint8

const (
	CidValueUnknown CidValueKind = iota
	CidValueNull
	CidValueValue
	CidValueError
)

type CidValue struct {
	Kind  CidValueKind
	Value int64
	Error SqlError
}

func CidUnknown() CidValue {
	return CidValue{Kind: CidValueUnknown}
}
func CidNull() CidValue {
	return CidValue{Kind: CidValueNull}
}
func MakeCidValue(units int64) CidValue {
	if units < int64(0) || units > int64(4294967295) {
		return CidValue{Kind: CidValueUnknown}
	}
	return CidValue{Kind: CidValueValue, Value: units}
}
func CidIsNull(input CidValue) BoolValue {
	if input.Kind == CidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (CidValue{Kind: CidValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (CidValue{Kind: CidValueNull}))
}
func CidFromCaseGuard(input CheckOutcome) CidValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return CidValue{Kind: CidValueError, Error: error}
	}
	return CidValue{Kind: CidValueUnknown}
}

type SnapshotXid struct {
	Bits int64
}

func copySnapshotXid(value SnapshotXid) SnapshotXid {
	return SnapshotXid{Bits: value.Bits}
}

type SnapshotPayload struct {
	Xmin int64
	Xmax int64
	Xip  []SnapshotXid
}

func CopySnapshotPayload(value SnapshotPayload) SnapshotPayload {
	return SnapshotPayload{Xmin: value.Xmin, Xmax: value.Xmax, Xip: langruntime.CheckedStructs(value.Xip, copySnapshotXid)}
}

type SnapshotValueKind uint8

const (
	SnapshotValueUnknown SnapshotValueKind = iota
	SnapshotValueNull
	SnapshotValueValue
	SnapshotValueError
)

type SnapshotValue struct {
	Kind  SnapshotValueKind
	Value SnapshotPayload
	Error SqlError
}

func CopySnapshotValue(value SnapshotValue) SnapshotValue {
	switch value.Kind {
	case SnapshotValueUnknown:
		return SnapshotValue{Kind: SnapshotValueUnknown}
	case SnapshotValueNull:
		return SnapshotValue{Kind: SnapshotValueNull}
	case SnapshotValueValue:
		return SnapshotValue{Kind: SnapshotValueValue, Value: CopySnapshotPayload(value.Value)}
	case SnapshotValueError:
		return SnapshotValue{Kind: SnapshotValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func SnapshotXidOrder(left int64, right int64) int {
	if left < int64(0) && right >= int64(0) {
		return 1
	}
	if left >= int64(0) && right < int64(0) {
		return langruntime.CheckedSignedNegate(1)
	}
	if left < right {
		return langruntime.CheckedSignedNegate(1)
	}
	if left > right {
		return 1
	}
	return 0
}
func SnapshotUnknown() SnapshotValue {
	return SnapshotValue{Kind: SnapshotValueUnknown}
}
func SnapshotNull() SnapshotValue {
	return SnapshotValue{Kind: SnapshotValueNull}
}
func SnapshotCountFits(count int) bool {
	count = langruntime.CheckedIndex(count)
	return count <= 134217724
}
func MakeSnapshotValue(payload SnapshotPayload) SnapshotValue {
	payload = CopySnapshotPayload(payload)
	if SnapshotCountFits(len(payload.Xip)) == false {
		return SnapshotValue{Kind: SnapshotValueUnknown}
	}
	if payload.Xmin == int64(0) || payload.Xmax == int64(0) || SnapshotXidOrder(payload.Xmin, payload.Xmax) > 0 {
		return SnapshotValue{Kind: SnapshotValueUnknown}
	}
	index := 0
	previous := int64(0)
	for index < len(payload.Xip) {
		bits := payload.Xip[index].Bits
		if SnapshotXidOrder(bits, payload.Xmin) < 0 || SnapshotXidOrder(bits, payload.Xmax) > 0 || SnapshotXidOrder(bits, previous) <= 0 {
			return SnapshotValue{Kind: SnapshotValueUnknown}
		}
		previous = bits
		index = langruntime.CheckedAdd(index, 1)
	}
	return SnapshotValue{Kind: SnapshotValueValue, Value: payload}
}
func SnapshotIsNull(input SnapshotValue) BoolValue {
	input = CopySnapshotValue(input)
	if input.Kind == SnapshotValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == SnapshotValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == SnapshotValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func SnapshotFromCaseGuard(input CheckOutcome) SnapshotValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return SnapshotValue{Kind: SnapshotValueError, Error: error}
	}
	return SnapshotValue{Kind: SnapshotValueUnknown}
}

type Xid8ValueKind uint8

const (
	Xid8ValueUnknown Xid8ValueKind = iota
	Xid8ValueNull
	Xid8ValueValue
	Xid8ValueError
)

type Xid8Value struct {
	Kind  Xid8ValueKind
	Value int64
	Error SqlError
}

func Xid8Unknown() Xid8Value {
	return Xid8Value{Kind: Xid8ValueUnknown}
}
func Xid8Null() Xid8Value {
	return Xid8Value{Kind: Xid8ValueNull}
}
func MakeXid8Bits(units int64) Xid8Value {
	return Xid8Value{Kind: Xid8ValueValue, Value: units}
}
func Xid8IsNull(input Xid8Value) BoolValue {
	if input.Kind == Xid8ValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (Xid8Value{Kind: Xid8ValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (Xid8Value{Kind: Xid8ValueNull}))
}
func Xid8FromCaseGuard(input CheckOutcome) Xid8Value {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return Xid8Value{Kind: Xid8ValueError, Error: error}
	}
	return Xid8Value{Kind: Xid8ValueUnknown}
}

type PgLsnValueKind uint8

const (
	PgLsnValueUnknown PgLsnValueKind = iota
	PgLsnValueNull
	PgLsnValueValue
	PgLsnValueError
)

type PgLsnValue struct {
	Kind  PgLsnValueKind
	Value int64
	Error SqlError
}

func PgLsnUnknown() PgLsnValue {
	return PgLsnValue{Kind: PgLsnValueUnknown}
}
func PgLsnNull() PgLsnValue {
	return PgLsnValue{Kind: PgLsnValueNull}
}
func MakePgLsnBits(units int64) PgLsnValue {
	return PgLsnValue{Kind: PgLsnValueValue, Value: units}
}
func PgLsnIsNull(input PgLsnValue) BoolValue {
	if input.Kind == PgLsnValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (PgLsnValue{Kind: PgLsnValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (PgLsnValue{Kind: PgLsnValueNull}))
}
func PgLsnFromCaseGuard(input CheckOutcome) PgLsnValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PgLsnValue{Kind: PgLsnValueError, Error: error}
	}
	return PgLsnValue{Kind: PgLsnValueUnknown}
}

type TidValueKind uint8

const (
	TidValueUnknown TidValueKind = iota
	TidValueNull
	TidValueValue
	TidValueError
)

type TidValue struct {
	Kind  TidValueKind
	Value int64
	Error SqlError
}

func TidUnknown() TidValue {
	return TidValue{Kind: TidValueUnknown}
}
func TidNull() TidValue {
	return TidValue{Kind: TidValueNull}
}
func MakeTidValue(units int64) TidValue {
	if units < int64(0) || units > int64(281474976710655) {
		return TidValue{Kind: TidValueUnknown}
	}
	return TidValue{Kind: TidValueValue, Value: units}
}
func TidIsNull(input TidValue) BoolValue {
	if input.Kind == TidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input == (TidValue{Kind: TidValueUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return MakeBoolValue(input == (TidValue{Kind: TidValueNull}))
}
func TidFromCaseGuard(input CheckOutcome) TidValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TidValue{Kind: TidValueError, Error: error}
	}
	return TidValue{Kind: TidValueUnknown}
}
func MakeTidParts(block int64, offset int) TidValue {
	offset = langruntime.CheckedI32(offset)
	if block < int64(0) || block > int64(4294967295) || offset < 0 || offset > 65535 {
		return TidValue{Kind: TidValueUnknown}
	}
	low := int64(langruntime.CheckedI32(offset))
	return MakeTidValue(langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(block, int64(65536)), low))
}
func JsonpathUnknown() JsonpathValue {
	return JsonpathValue{Kind: JsonpathValueUnknown}
}
func JsonpathNull() JsonpathValue {
	return JsonpathValue{Kind: JsonpathValueNull}
}
func JsonpathIsNull(input JsonpathValue) BoolValue {
	input = CopyJsonpathValue(input)
	if input.Kind == JsonpathValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == JsonpathValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == JsonpathValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func JsonpathFromCaseGuard(input CheckOutcome) JsonpathValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return JsonpathValue{Kind: JsonpathValueError, Error: error}
	}
	return JsonpathValue{Kind: JsonpathValueUnknown}
}
func JsonpathFromCoercedValue(input JsonpathValue) JsonpathValue {
	input = CopyJsonpathValue(input)
	if input.Kind == JsonpathValueStoredText {
		text := langruntime.CheckedString(input.StoredText)
		characters := []rune(text)
		if len(characters) == 0 {
			return JsonpathValue{Kind: JsonpathValueUnknown}
		}
		index := 0
		for index < len(characters) {
			if characters[index] == '\x00' {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		return JsonpathValue{Kind: JsonpathValueStoredText, StoredText: text}
	}
	if input.Kind == JsonpathValueValue {
		value := CopyJsonpathPayload(input.Value)
		if value.Root == 0 || value.Root >= len(value.Nodes) {
			return JsonpathValue{Kind: JsonpathValueUnknown}
		}
		index := 0
		for index < len(value.Characters) {
			if value.Characters[index] == '\x00' {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		visited := []int{}
		langruntime.CheckedAdd(len(visited), 1)
		visited = append(visited, langruntime.CheckedIndex(0))
		index = langruntime.CheckedIndex(1)
		for index < len(value.Nodes) {
			if jsonpathPayloadNodeValid(&value, index) == false {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			langruntime.CheckedAdd(len(visited), 1)
			visited = append(visited, langruntime.CheckedIndex(0))
			index = langruntime.CheckedAdd(index, 1)
		}
		pending := []jsonpathBoundaryVisit{}
		langruntime.CheckedAdd(len(pending), 1)
		pending = append(pending, copyjsonpathBoundaryVisit(jsonpathBoundaryVisit{node: value.Root, filters: 0, subscript: false, accessor: false, list: false}))
		depth := 1
		for depth > 0 {
			depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
			visit := pending[depth]
			if visited[visit.node] != 0 {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			visited[visit.node] = langruntime.CheckedIndex(1)
			node := value.Nodes[visit.node]
			if (node.Kind == JsonpathNodeSubscript) != visit.list {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			if visit.list == false && jsonpathAccessorKind(node.Kind) != visit.accessor {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			if node.Kind == JsonpathNodeCurrent && visit.filters == 0 {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			if node.Kind == JsonpathNodeLast && visit.subscript == false {
				return JsonpathValue{Kind: JsonpathValueUnknown}
			}
			child := 0
			for child < 3 {
				next := node.Next
				filters := visit.filters
				subscript := visit.subscript
				accessor := true
				list := node.Kind == JsonpathNodeSubscript
				if child == 1 {
					next = langruntime.CheckedIndex(node.Left)
					accessor = false
					list = node.Kind == JsonpathNodeIndex
					if node.Kind == JsonpathNodeFilter {
						filters = langruntime.CheckedAdd(filters, 1)
					}
					if node.Kind == JsonpathNodeIndex || node.Kind == JsonpathNodeSubscript {
						subscript = true
					}
				}
				if child == 2 {
					next = langruntime.CheckedIndex(node.Right)
					accessor = false
					list = false
					if node.Kind == JsonpathNodeSubscript {
						subscript = true
					}
				}
				if next > 0 {
					task := jsonpathBoundaryVisit{node: next, filters: filters, subscript: subscript, accessor: accessor, list: list}
					if depth < len(pending) {
						pending[depth] = copyjsonpathBoundaryVisit(task)
					} else {
						langruntime.CheckedAdd(len(pending), 1)
						pending = append(pending, copyjsonpathBoundaryVisit(task))
					}
					depth = langruntime.CheckedAdd(depth, 1)
				}
				child = langruntime.CheckedAdd(child, 1)
			}
		}
		return JsonpathValue{Kind: JsonpathValueValue, Value: value}
	}
	return input
}

type NumericLayout struct {
	Valid   bool
	Special int
	Sign    int
	Weight  int
	First   int
	End     int
}

func copyNumericLayout(value NumericLayout) NumericLayout {
	return NumericLayout{Valid: value.Valid, Special: langruntime.CheckedI32(value.Special), Sign: langruntime.CheckedI32(value.Sign), Weight: langruntime.CheckedI32(value.Weight), First: langruntime.CheckedIndex(value.First), End: langruntime.CheckedIndex(value.End)}
}
func invalidNumericParts() NumericLayout {
	return NumericLayout{Valid: false, Special: 1, Sign: 0, Weight: 0, First: 0, End: 0}
}
func NumericSpace(value rune) bool {
	value = langruntime.CheckedChar(value)
	return value == ' ' || value == '\t' || value == '\n' || value == '\r' || value == '\v' || value == '\f'
}
func numericDigit(value rune) int {
	value = langruntime.CheckedChar(value)
	if value == '0' {
		return 0
	}
	if value == '1' {
		return 1
	}
	if value == '2' {
		return 2
	}
	if value == '3' {
		return 3
	}
	if value == '4' {
		return 4
	}
	if value == '5' {
		return 5
	}
	if value == '6' {
		return 6
	}
	if value == '7' {
		return 7
	}
	if value == '8' {
		return 8
	}
	if value == '9' {
		return 9
	}
	return langruntime.CheckedSignedNegate(1)
}
func NumericParts(value string) NumericLayout {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) > 1000000 {
		return invalidNumericParts()
	}
	begin := 0
	end := len(chars)
	for begin < end && NumericSpace(chars[begin]) {
		begin = langruntime.CheckedAdd(begin, 1)
	}
	for end > begin && NumericSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	if begin == end {
		return invalidNumericParts()
	}
	index := begin
	sign := 1
	if chars[index] == '-' {
		sign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		index = langruntime.CheckedAdd(index, 1)
	} else if chars[index] == '+' {
		index = langruntime.CheckedAdd(index, 1)
	}
	if index == end {
		return invalidNumericParts()
	}
	if langruntime.CheckedSubtract(end, begin) == 3 && langruntime.AsciiLowercase(chars[begin]) == 'n' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(begin, 1)]) == 'a' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(begin, 2)]) == 'n' {
		return NumericLayout{Valid: true, Special: 3, Sign: 0, Weight: 0, First: 0, End: 0}
	}
	if (langruntime.CheckedSubtract(end, index) == 3 || langruntime.CheckedSubtract(end, index) == 8) && langruntime.AsciiLowercase(chars[index]) == 'i' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 1)]) == 'n' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 2)]) == 'f' {
		if langruntime.CheckedSubtract(end, index) == 8 && (langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 3)]) != 'i' || langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 4)]) != 'n' || langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 5)]) != 'i' || langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 6)]) != 't' || langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(index, 7)]) != 'y') {
			return invalidNumericParts()
		}
		special := 2
		if sign < 0 {
			special = langruntime.CheckedI32(0)
		}
		return NumericLayout{Valid: true, Special: special, Sign: 0, Weight: 0, First: 0, End: 0}
	}
	point := false
	digits := 0
	before := 0
	fractional := 0
	first := end
	last := 0
	leading := 0
	for index < end {
		digit := numericDigit(chars[index])
		if digit >= 0 {
			if first == end && digit == 0 {
				leading = langruntime.CheckedI32(langruntime.CheckedSignedAdd(leading, 1))
			}
			if digit != 0 {
				if first == end {
					first = langruntime.CheckedIndex(index)
				}
				last = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
			}
			digits = langruntime.CheckedI32(langruntime.CheckedSignedAdd(digits, 1))
			if point {
				fractional = langruntime.CheckedI32(langruntime.CheckedSignedAdd(fractional, 1))
			} else {
				before = langruntime.CheckedI32(langruntime.CheckedSignedAdd(before, 1))
			}
			index = langruntime.CheckedAdd(index, 1)
		} else if chars[index] == '.' {
			if point {
				return invalidNumericParts()
			}
			point = true
			index = langruntime.CheckedAdd(index, 1)
			if index < end && chars[index] == '_' {
				return invalidNumericParts()
			}
		} else if chars[index] == '_' {
			if index == begin || numericDigit(chars[langruntime.CheckedSubtract(index, 1)]) < 0 || langruntime.CheckedAdd(index, 1) == end || numericDigit(chars[langruntime.CheckedAdd(index, 1)]) < 0 {
				return invalidNumericParts()
			}
			index = langruntime.CheckedAdd(index, 1)
		} else {
			break
		}
	}
	if digits == 0 {
		return invalidNumericParts()
	}
	exponent := 0
	if index < end && (chars[index] == 'e' || chars[index] == 'E') {
		index = langruntime.CheckedAdd(index, 1)
		negative := false
		if index < end && chars[index] == '-' {
			negative = true
			index = langruntime.CheckedAdd(index, 1)
		} else if index < end && chars[index] == '+' {
			index = langruntime.CheckedAdd(index, 1)
		}
		start := index
		if index == end || numericDigit(chars[index]) < 0 {
			return invalidNumericParts()
		}
		for index < end {
			digit := numericDigit(chars[index])
			if digit >= 0 {
				if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
					return invalidNumericParts()
				}
				exponent = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(exponent, 10), digit))
				index = langruntime.CheckedAdd(index, 1)
			} else if chars[index] == '_' {
				if index == start || numericDigit(chars[langruntime.CheckedSubtract(index, 1)]) < 0 || langruntime.CheckedAdd(index, 1) == end || numericDigit(chars[langruntime.CheckedAdd(index, 1)]) < 0 {
					return invalidNumericParts()
				}
				index = langruntime.CheckedAdd(index, 1)
			} else {
				break
			}
		}
		if negative {
			exponent = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, exponent))
		}
	}
	if index != end || langruntime.CheckedSignedSubtract(fractional, exponent) > 16383 {
		return invalidNumericParts()
	}
	weight := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(before, leading), 1), exponent)
	if first == end {
		return NumericLayout{Valid: true, Special: 1, Sign: 0, Weight: 0, First: 0, End: 0}
	}
	if weight > 131071 || weight < langruntime.CheckedSignedNegate(131072) {
		return invalidNumericParts()
	}
	return NumericLayout{Valid: true, Special: 1, Sign: sign, Weight: weight, First: first, End: last}
}

type NetworkWord struct {
	Value int
}

func CopyNetworkWord(value NetworkWord) NetworkWord {
	return NetworkWord{Value: langruntime.CheckedI32(value.Value)}
}
func NetworkAddressWord(address NetworkAddress, index int) int {
	index = langruntime.CheckedIndex(index)
	if index == 0 {
		return address.Word0
	}
	if index == 1 {
		return address.Word1
	}
	if index == 2 {
		return address.Word2
	}
	if index == 3 {
		return address.Word3
	}
	if index == 4 {
		return address.Word4
	}
	if index == 5 {
		return address.Word5
	}
	if index == 6 {
		return address.Word6
	}
	return address.Word7
}
func NetworkAddressByte(address NetworkAddress, index int, high bool) int {
	index = langruntime.CheckedIndex(index)
	word := NetworkAddressWord(address, index)
	if high {
		return langruntime.CheckedSignedDivide(word, 256)
	}
	return langruntime.CheckedSignedRemainder(word, 256)
}
func NetworkPrefixCompare(left NetworkAddress, right NetworkAddress, bits int) int {
	bits = langruntime.CheckedI32(bits)
	index := 0
	remaining := bits
	high := true
	for remaining >= 8 {
		a := NetworkAddressByte(left, index, high)
		b := NetworkAddressByte(right, index, high)
		if a != b {
			return langruntime.CheckedSignedSubtract(a, b)
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 8))
		if high {
			high = false
		} else {
			high = true
			index = langruntime.CheckedAdd(index, 1)
		}
	}
	if remaining > 0 {
		padding := langruntime.CheckedSignedSubtract(8, remaining)
		divisor := 1
		for padding > 0 {
			divisor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(divisor, 2))
			padding = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(padding, 1))
		}
		a := langruntime.CheckedSignedDivide(NetworkAddressByte(left, index, high), divisor)
		b := langruntime.CheckedSignedDivide(NetworkAddressByte(right, index, high), divisor)
		if a < b {
			return langruntime.CheckedSignedNegate(1)
		}
		if a > b {
			return 1
		}
	}
	return 0
}
func networkParse(value string, cidr bool) NetworkValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) == 0 {
		return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
	}
	end := len(chars)
	family := 4
	scan := 0
	for scan < len(chars) {
		if chars[scan] == ':' {
			family = langruntime.CheckedIndex(6)
		}
		if chars[scan] == '/' {
			if end != len(chars) {
				return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			end = langruntime.CheckedIndex(scan)
		}
		scan = langruntime.CheckedAdd(scan, 1)
	}
	prefix := 32
	if family == 6 {
		prefix = langruntime.CheckedI32(128)
	}
	if end != len(chars) {
		index := langruntime.CheckedAdd(end, 1)
		if index == len(chars) {
			return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
		if family == 6 && chars[index] == '0' && langruntime.CheckedAdd(index, 1) < len(chars) {
			return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
		prefix = langruntime.CheckedI32(0)
		for index < len(chars) {
			digit := HexDigit(chars[index])
			if digit > 9 {
				return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			if family == 4 {
				widePrefix := int64(langruntime.CheckedI32(prefix))
				wideDigit := int64(langruntime.CheckedI32(digit))
				nextPrefix := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(widePrefix, int64(10)), wideDigit)
				prefix = langruntime.CheckedI32(int(int32(nextPrefix)))
			} else {
				prefix = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(prefix, 10), digit))
				if prefix > 128 {
					return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
				}
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		if prefix < 0 || (family == 4 && prefix > 32) {
			return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
	}
	words := []NetworkWord{}
	index := 0
	if family == 4 {
		octets := []NetworkWord{}
		octetCount := 0
		if cidr && end > 2 && chars[0] == '0' && (chars[1] == 'x' || chars[1] == 'X') {
			index = langruntime.CheckedIndex(2)
			for index < end {
				high := HexDigit(chars[index])
				if high > 15 || len(octets) == 4 {
					return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
				}
				index = langruntime.CheckedAdd(index, 1)
				low := 0
				if index < end {
					low = langruntime.CheckedI32(HexDigit(chars[index]))
					if low > 15 {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
					index = langruntime.CheckedAdd(index, 1)
				}
				langruntime.CheckedAdd(len(octets), 1)
				octets = append(octets, CopyNetworkWord(NetworkWord{Value: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)}))
				octetCount = langruntime.CheckedI32(langruntime.CheckedSignedAdd(octetCount, 1))
			}
		} else {
			for index < end {
				begin := index
				octet := 0
				for index < end && chars[index] != '.' {
					digit := HexDigit(chars[index])
					if digit > 9 {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
					octet = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(octet, 10), digit))
					if octet > 255 {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
					index = langruntime.CheckedAdd(index, 1)
				}
				if begin == index || len(octets) == 4 {
					return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
				}
				langruntime.CheckedAdd(len(octets), 1)
				octets = append(octets, CopyNetworkWord(NetworkWord{Value: octet}))
				octetCount = langruntime.CheckedI32(langruntime.CheckedSignedAdd(octetCount, 1))
				if index < end {
					index = langruntime.CheckedAdd(index, 1)
					if index == end && cidr {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
				}
			}
		}
		if len(octets) == 0 {
			return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
		if end == len(chars) {
			if cidr {
				prefix = langruntime.CheckedI32(8)
				if octets[0].Value >= 240 {
					prefix = langruntime.CheckedI32(32)
				} else if octets[0].Value >= 224 {
					prefix = langruntime.CheckedI32(8)
				} else if octets[0].Value >= 192 {
					prefix = langruntime.CheckedI32(24)
				} else if octets[0].Value >= 128 {
					prefix = langruntime.CheckedI32(16)
				}
				if prefix < langruntime.CheckedSignedMultiply(octetCount, 8) {
					prefix = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(octetCount, 8))
				}
				if prefix == 8 && octets[0].Value == 224 {
					prefix = langruntime.CheckedI32(4)
				}
			} else if len(octets) != 4 {
				return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
		} else if cidr == false && langruntime.CheckedSignedDivide(prefix, 8) > octetCount {
			return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
		for len(octets) < 4 {
			langruntime.CheckedAdd(len(octets), 1)
			octets = append(octets, CopyNetworkWord(NetworkWord{Value: 0}))
		}
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, CopyNetworkWord(NetworkWord{Value: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(octets[0].Value, 256), octets[1].Value)}))
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, CopyNetworkWord(NetworkWord{Value: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(octets[2].Value, 256), octets[3].Value)}))
	} else {
		compression := 9
		if end > 0 && chars[0] == ':' {
			if end < 2 || chars[1] != ':' {
				return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			compression = langruntime.CheckedIndex(0)
			index = langruntime.CheckedIndex(2)
		}
		for index < end {
			begin := index
			stop := index
			dotted := false
			for stop < end && chars[stop] != ':' {
				if chars[stop] == '.' {
					dotted = true
				}
				stop = langruntime.CheckedAdd(stop, 1)
			}
			if dotted {
				if stop != end || len(words) > 6 {
					return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
				}
				octets := []NetworkWord{}
				for index < end {
					start := index
					octet := 0
					for index < end && chars[index] != '.' {
						digit := HexDigit(chars[index])
						if digit > 9 || (index > start && chars[start] == '0') {
							return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
						}
						octet = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(octet, 10), digit))
						if octet > 255 {
							return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
						}
						index = langruntime.CheckedAdd(index, 1)
					}
					if len(octets) == 4 {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
					langruntime.CheckedAdd(len(octets), 1)
					octets = append(octets, CopyNetworkWord(NetworkWord{Value: octet}))
					if index < end {
						index = langruntime.CheckedAdd(index, 1)
						if index == end {
							if end == len(chars) || len(octets) == 4 {
								return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
							}
							langruntime.CheckedAdd(len(octets), 1)
							octets = append(octets, CopyNetworkWord(NetworkWord{Value: 0}))
						}
					}
				}
				for len(octets) < 4 {
					langruntime.CheckedAdd(len(octets), 1)
					octets = append(octets, CopyNetworkWord(NetworkWord{Value: 0}))
				}
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, CopyNetworkWord(NetworkWord{Value: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(octets[0].Value, 256), octets[1].Value)}))
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, CopyNetworkWord(NetworkWord{Value: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(octets[2].Value, 256), octets[3].Value)}))
			} else {
				if stop == begin || langruntime.CheckedSubtract(stop, begin) > 4 || len(words) == 8 {
					return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
				}
				word := 0
				for index < stop {
					digit := HexDigit(chars[index])
					if digit > 15 {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
					word = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(word, 16), digit))
					index = langruntime.CheckedAdd(index, 1)
				}
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, CopyNetworkWord(NetworkWord{Value: word}))
				if index < end {
					index = langruntime.CheckedAdd(index, 1)
					if index < end && chars[index] == ':' {
						if compression != 9 {
							return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
						}
						compression = langruntime.CheckedIndex(len(words))
						index = langruntime.CheckedAdd(index, 1)
					} else if index == end && end == len(chars) {
						return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
					}
				}
			}
		}
		if compression != 9 {
			wordCount := len(words)
			if wordCount >= 8 {
				return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			for len(words) < 8 {
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, CopyNetworkWord(NetworkWord{Value: 0}))
			}
			source := wordCount
			dest := 8
			for source > compression {
				source = langruntime.CheckedIndex(langruntime.CheckedSubtract(source, 1))
				dest = langruntime.CheckedIndex(langruntime.CheckedSubtract(dest, 1))
				words[dest] = CopyNetworkWord(words[source])
				words[source] = CopyNetworkWord(NetworkWord{Value: 0})
			}
		}
		if len(words) != 8 {
			return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
	}
	for len(words) < 8 {
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, CopyNetworkWord(NetworkWord{Value: 0}))
	}
	address := NetworkAddress{Family: family, Prefix: prefix, Word0: words[0].Value, Word1: words[1].Value, Word2: words[2].Value, Word3: words[3].Value, Word4: words[4].Value, Word5: words[5].Value, Word6: words[6].Value, Word7: words[7].Value}
	if cidr {
		remaining := prefix
		wordIndex := 0
		wordCount := 8
		if family == 4 {
			wordCount = langruntime.CheckedIndex(2)
		}
		for wordIndex < wordCount {
			bits := remaining
			if bits > 16 {
				bits = langruntime.CheckedI32(16)
			}
			remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, bits))
			divisor := 1
			padding := langruntime.CheckedSignedSubtract(16, bits)
			for padding > 0 {
				divisor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(divisor, 2))
				padding = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(padding, 1))
			}
			if langruntime.CheckedSignedRemainder(NetworkAddressWord(address, wordIndex), divisor) != 0 {
				return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			wordIndex = langruntime.CheckedAdd(wordIndex, 1)
		}
	}
	return NetworkValue{Kind: NetworkValueValue, Value: address}
}
func NetworkFromText(input TextValue) NetworkValue {
	if input.Kind == TextValueError {
		error := input.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return NetworkValue{Kind: NetworkValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return networkParse(value, false)
	}
	return NetworkValue{Kind: NetworkValueUnknown}
}
func CidrFromText(input TextValue) NetworkValue {
	if input.Kind == TextValueError {
		error := input.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return NetworkValue{Kind: NetworkValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return networkParse(value, true)
	}
	return NetworkValue{Kind: NetworkValueUnknown}
}

type macText struct {
	chars []rune
}

func copymacText(value macText) macText {
	return macText{chars: langruntime.CheckedChars(value.chars)}
}

type macByte struct {
	value int
}

func copymacByte(value macByte) macByte {
	return macByte{value: langruntime.CheckedI32(value.value)}
}

type macParsed struct {
	valid   bool
	state   int
	address MacAddress
}

func copymacParsed(value macParsed) macParsed {
	return macParsed{valid: value.valid, state: langruntime.CheckedIndex(value.state), address: value.address}
}

type macScanned struct {
	valid bool
	value int
	end   int
}

func copymacScanned(value macScanned) macScanned {
	return macScanned{valid: value.valid, value: langruntime.CheckedI32(value.value), end: langruntime.CheckedIndex(value.end)}
}
func macInvalid() macParsed {
	return macParsed{valid: false, state: sqlErrorInvalidTextRepresentation, address: MacAddress{Word0: 0, Word1: 0, Word2: 0, Word3: 0}}
}
func macSpace(ch rune) bool {
	ch = langruntime.CheckedChar(ch)
	return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\v' || ch == '\f'
}
func macScanHex(text *macText, start int, width int) macScanned {
	start = langruntime.CheckedIndex(start)
	width = langruntime.CheckedIndex(width)
	index := start
	for index < len(text.chars) && macSpace(text.chars[index]) {
		index = langruntime.CheckedAdd(index, 1)
	}
	begin := index
	negative := false
	if index < len(text.chars) && (text.chars[index] == '+' || text.chars[index] == '-') {
		negative = text.chars[index] == '-'
		index = langruntime.CheckedAdd(index, 1)
	}
	digits := false
	if langruntime.CheckedAdd(index, 1) < len(text.chars) && (width == 0 || langruntime.CheckedSubtract(langruntime.CheckedAdd(index, 1), begin) < width) && text.chars[index] == '0' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(index, 1)]) == 'x' {
		index = langruntime.CheckedAdd(index, 2)
	}
	value := int64(0)
	significant := 0
	overflow := false
	for index < len(text.chars) && (width == 0 || langruntime.CheckedSubtract(index, begin) < width) {
		digit := HexDigit(text.chars[index])
		if digit == 16 {
			break
		}
		digits = true
		if significant > 0 || digit != 0 {
			significant = langruntime.CheckedAdd(significant, 1)
		}
		if significant > 16 {
			overflow = true
		}
		wideDigit := int64(langruntime.CheckedI32(digit))
		value = langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(value, int64(16)), wideDigit)), int64(4294967296))
		index = langruntime.CheckedAdd(index, 1)
	}
	if overflow {
		value = int64(4294967295)
	} else if negative && value != int64(0) {
		value = langruntime.CheckedI64Subtract(int64(4294967296), value)
	}
	return macScanned{valid: digits, value: int(int32(value)), end: index}
}
func macaddrFormat(text *macText, format int) macParsed {
	format = langruntime.CheckedIndex(format)
	index := 0
	byteIndex := 0
	bytes := []macByte{}
	outOfRange := false
	width := 2
	if format < 2 {
		width = langruntime.CheckedIndex(0)
	}
	for byteIndex < 6 {
		scanned := macScanHex(text, index, width)
		if scanned.valid == false {
			return macInvalid()
		}
		if scanned.value < 0 || scanned.value > 255 {
			outOfRange = true
		}
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, copymacByte(macByte{value: scanned.value}))
		index = langruntime.CheckedIndex(scanned.end)
		byteIndex = langruntime.CheckedAdd(byteIndex, 1)
		separator := '\x00'
		if byteIndex < 6 {
			if format == 0 {
				separator = langruntime.CheckedChar(':')
			} else if format == 1 {
				separator = langruntime.CheckedChar('-')
			} else if format == 2 && byteIndex == 3 {
				separator = langruntime.CheckedChar(':')
			} else if format == 3 && byteIndex == 3 {
				separator = langruntime.CheckedChar('-')
			} else if format == 4 && (byteIndex == 2 || byteIndex == 4) {
				separator = langruntime.CheckedChar('.')
			} else if format == 5 && (byteIndex == 2 || byteIndex == 4) {
				separator = langruntime.CheckedChar('-')
			}
		}
		if separator != '\x00' {
			if index >= len(text.chars) || text.chars[index] != separator {
				return macInvalid()
			}
			index = langruntime.CheckedAdd(index, 1)
		}
	}
	for index < len(text.chars) && macSpace(text.chars[index]) {
		index = langruntime.CheckedAdd(index, 1)
	}
	if index != len(text.chars) {
		return macInvalid()
	}
	if outOfRange {
		return macParsed{valid: false, state: sqlErrorNumericOutOfRange, address: MacAddress{Word0: 0, Word1: 0, Word2: 0, Word3: 0}}
	}
	return macParsed{valid: true, state: 0, address: MacAddress{Word0: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[0].value, 256), bytes[1].value), Word1: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[2].value, 256), bytes[3].value), Word2: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[4].value, 256), bytes[5].value), Word3: 0}}
}
func macaddrParse(text *macText) macParsed {
	format := 0
	for format < 7 {
		parsed := macaddrFormat(text, format)
		if parsed.valid || parsed.state == sqlErrorNumericOutOfRange {
			return parsed
		}
		format = langruntime.CheckedAdd(format, 1)
	}
	return macInvalid()
}
func macaddr8Parse(text *macText) macParsed {
	index := 0
	separator := '\x00'
	bytes := []macByte{}
	for index < len(text.chars) && macSpace(text.chars[index]) {
		index = langruntime.CheckedAdd(index, 1)
	}
	for langruntime.CheckedAdd(index, 1) < len(text.chars) {
		if len(bytes) == 8 {
			return macInvalid()
		}
		high := HexDigit(text.chars[index])
		low := HexDigit(text.chars[langruntime.CheckedAdd(index, 1)])
		if high == 16 || low == 16 {
			return macInvalid()
		}
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, copymacByte(macByte{value: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)}))
		index = langruntime.CheckedAdd(index, 2)
		if index < len(text.chars) && (text.chars[index] == ':' || text.chars[index] == '-' || text.chars[index] == '.') {
			if separator != '\x00' && separator != text.chars[index] {
				return macInvalid()
			}
			separator = langruntime.CheckedChar(text.chars[index])
			index = langruntime.CheckedAdd(index, 1)
		}
		if (len(bytes) == 6 || len(bytes) == 8) && index < len(text.chars) && macSpace(text.chars[index]) {
			for index < len(text.chars) && macSpace(text.chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
			if index != len(text.chars) {
				return macInvalid()
			}
		}
	}
	if index < len(text.chars) {
		finalCode := int(langruntime.CheckedChar(text.chars[index]))
		if finalCode > 127 || finalCode == 0 {
			return macInvalid()
		}
	}
	if len(bytes) == 6 {
		insertedHigh := 254
		return macParsed{valid: true, state: 0, address: MacAddress{Word0: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[0].value, 256), bytes[1].value), Word1: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[2].value, 256), 255), Word2: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(insertedHigh, 256), bytes[3].value), Word3: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[4].value, 256), bytes[5].value)}}
	}
	if len(bytes) != 8 {
		return macInvalid()
	}
	return macParsed{valid: true, state: 0, address: MacAddress{Word0: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[0].value, 256), bytes[1].value), Word1: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[2].value, 256), bytes[3].value), Word2: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[4].value, 256), bytes[5].value), Word3: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(bytes[6].value, 256), bytes[7].value)}}
}
func MacAddressCompare(left MacAddress, right MacAddress) int {
	if left.Word0 < right.Word0 {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.Word0 > right.Word0 {
		return 1
	}
	if left.Word1 < right.Word1 {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.Word1 > right.Word1 {
		return 1
	}
	if left.Word2 < right.Word2 {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.Word2 > right.Word2 {
		return 1
	}
	if left.Word3 < right.Word3 {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.Word3 > right.Word3 {
		return 1
	}
	return 0
}
func MacaddrFromText(input TextValue) MacaddrValue {
	if input.Kind == TextValueError {
		error := input.Error
		return MacaddrValue{Kind: MacaddrValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) {
		return MacaddrValue{Kind: MacaddrValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return MacaddrValue{Kind: MacaddrValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		if len(chars) > 256 {
			return MacaddrValue{Kind: MacaddrValueUnknown}
		}
		text := macText{chars: chars}
		parsed := macaddrParse(&text)
		if parsed.valid == false {
			return MacaddrValue{Kind: MacaddrValueError, Error: MakeSqlError(parsed.state)}
		}
		return MacaddrValue{Kind: MacaddrValueValue, Value: parsed.address}
	}
	return MacaddrValue{Kind: MacaddrValueUnknown}
}
func Macaddr8FromText(input TextValue) Macaddr8Value {
	if input.Kind == TextValueError {
		error := input.Error
		return Macaddr8Value{Kind: Macaddr8ValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) {
		return Macaddr8Value{Kind: Macaddr8ValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return Macaddr8Value{Kind: Macaddr8ValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		if len(chars) > 256 {
			return Macaddr8Value{Kind: Macaddr8ValueUnknown}
		}
		text := macText{chars: chars}
		parsed := macaddr8Parse(&text)
		if parsed.valid == false {
			return Macaddr8Value{Kind: Macaddr8ValueError, Error: MakeSqlError(parsed.state)}
		}
		return Macaddr8Value{Kind: Macaddr8ValueValue, Value: parsed.address}
	}
	return Macaddr8Value{Kind: Macaddr8ValueUnknown}
}
func uuidParse(value string) UuidValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	if len(chars) < 32 || len(chars) > 41 {
		return UuidValue{Kind: UuidValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
	}
	index := 0
	braces := chars[0] == '{'
	if braces {
		index = langruntime.CheckedAdd(index, 1)
	}
	word0 := 0
	word1 := 0
	word2 := 0
	word3 := 0
	word4 := 0
	word5 := 0
	word6 := 0
	word7 := 0
	group := 0
	for group < 8 {
		word := 0
		digitIndex := 0
		for digitIndex < 4 {
			if index >= len(chars) {
				return UuidValue{Kind: UuidValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			digit := HexDigit(chars[index])
			if digit == 16 {
				return UuidValue{Kind: UuidValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			word = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(word, 16), digit))
			index = langruntime.CheckedAdd(index, 1)
			digitIndex = langruntime.CheckedAdd(digitIndex, 1)
		}
		if group == 0 {
			word0 = langruntime.CheckedI32(word)
		} else if group == 1 {
			word1 = langruntime.CheckedI32(word)
		} else if group == 2 {
			word2 = langruntime.CheckedI32(word)
		} else if group == 3 {
			word3 = langruntime.CheckedI32(word)
		} else if group == 4 {
			word4 = langruntime.CheckedI32(word)
		} else if group == 5 {
			word5 = langruntime.CheckedI32(word)
		} else if group == 6 {
			word6 = langruntime.CheckedI32(word)
		} else {
			word7 = langruntime.CheckedI32(word)
		}
		group = langruntime.CheckedAdd(group, 1)
		if group < 8 && index < len(chars) && chars[index] == '-' {
			index = langruntime.CheckedAdd(index, 1)
		}
	}
	if braces {
		if index >= len(chars) || chars[index] != '}' {
			return UuidValue{Kind: UuidValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	if index != len(chars) {
		return UuidValue{Kind: UuidValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
	}
	return UuidValue{Kind: UuidValueValue, Value: Uuid{Word0: word0, Word1: word1, Word2: word2, Word3: word3, Word4: word4, Word5: word5, Word6: word6, Word7: word7}}
}
func UuidFromText(input TextValue) UuidValue {
	if input.Kind == TextValueError {
		error := input.Error
		return UuidValue{Kind: UuidValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) {
		return UuidValue{Kind: UuidValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return UuidValue{Kind: UuidValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return uuidParse(value)
	}
	return UuidValue{Kind: UuidValueUnknown}
}
func UuidWord(value Uuid, index int) int {
	index = langruntime.CheckedI32(index)
	if index == 0 {
		return value.Word0
	}
	if index == 1 {
		return value.Word1
	}
	if index == 2 {
		return value.Word2
	}
	if index == 3 {
		return value.Word3
	}
	if index == 4 {
		return value.Word4
	}
	if index == 5 {
		return value.Word5
	}
	if index == 6 {
		return value.Word6
	}
	return value.Word7
}

type jsonSyntaxSource struct {
	characters []rune
}

func copyjsonSyntaxSource(value jsonSyntaxSource) jsonSyntaxSource {
	return jsonSyntaxSource{characters: langruntime.CheckedChars(value.characters)}
}

type jsonSyntaxToken struct {
	kind int
	end  int
}

func copyjsonSyntaxToken(value jsonSyntaxToken) jsonSyntaxToken {
	return jsonSyntaxToken{kind: langruntime.CheckedI32(value.kind), end: langruntime.CheckedIndex(value.end)}
}

type jsonSyntaxFrame struct {
	state int
}

func copyjsonSyntaxFrame(value jsonSyntaxFrame) jsonSyntaxFrame {
	return jsonSyntaxFrame{state: langruntime.CheckedI32(value.state)}
}

type JsonSyntaxLayout struct {
	Valid    bool
	Kind     int
	MaxDepth int
}

func copyJsonSyntaxLayout(value JsonSyntaxLayout) JsonSyntaxLayout {
	return JsonSyntaxLayout{Valid: value.Valid, Kind: langruntime.CheckedI32(value.Kind), MaxDepth: langruntime.CheckedIndex(value.MaxDepth)}
}

const jsonSyntaxInvalid = 12
const jsonSyntaxEnd = 0
const jsonSyntaxString = 1
const jsonSyntaxNumber = 2
const jsonSyntaxTrue = 3
const jsonSyntaxFalse = 4
const jsonSyntaxNull = 5
const jsonSyntaxObjectStart = 6
const jsonSyntaxObjectEnd = 7
const jsonSyntaxArrayStart = 8
const jsonSyntaxArrayEnd = 9
const jsonSyntaxColon = 10
const jsonSyntaxComma = 11
const jsonSyntaxRootValue = 0
const jsonSyntaxRootEnd = 1
const jsonSyntaxArrayFirst = 2
const jsonSyntaxArrayNext = 3
const jsonSyntaxArrayValue = 4
const jsonSyntaxObjectFirst = 5
const jsonSyntaxObjectColon = 6
const jsonSyntaxObjectValue = 7
const jsonSyntaxObjectNext = 8
const jsonSyntaxObjectKey = 9

func jsonSyntaxSpace(character rune) bool {
	character = langruntime.CheckedChar(character)
	return character == ' ' || character == '\t' || character == '\n' || character == '\r'
}
func jsonSyntaxDigit(character rune) bool {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	return code >= 48 && code <= 57
}
func jsonSyntaxAlphanumeric(character rune) bool {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	return jsonSyntaxDigit(character) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code >= 128 || character == '_'
}
func jsonSyntaxHex(character rune) bool {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	return (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)
}
func jsonSyntaxBadToken(end int) jsonSyntaxToken {
	end = langruntime.CheckedIndex(end)
	return jsonSyntaxToken{kind: jsonSyntaxInvalid, end: end}
}
func jsonSyntaxReadString(source *jsonSyntaxSource, begin int) jsonSyntaxToken {
	begin = langruntime.CheckedIndex(begin)
	position := langruntime.CheckedAdd(begin, 1)
	for position < len(source.characters) {
		character := source.characters[position]
		position = langruntime.CheckedAdd(position, 1)
		if character == '"' {
			return jsonSyntaxToken{kind: jsonSyntaxString, end: position}
		}
		code := int(langruntime.CheckedChar(character))
		if code < 32 {
			return jsonSyntaxBadToken(position)
		}
		if character == '\\' {
			if position >= len(source.characters) {
				return jsonSyntaxBadToken(position)
			}
			escape := source.characters[position]
			position = langruntime.CheckedAdd(position, 1)
			if escape == 'u' {
				digit := 0
				for digit < 4 {
					if position >= len(source.characters) || jsonSyntaxHex(source.characters[position]) == false {
						return jsonSyntaxBadToken(position)
					}
					position = langruntime.CheckedAdd(position, 1)
					digit = langruntime.CheckedAdd(digit, 1)
				}
			} else if escape != '"' && escape != '\\' && escape != '/' && escape != 'b' && escape != 'f' && escape != 'n' && escape != 'r' && escape != 't' {
				return jsonSyntaxBadToken(position)
			}
		}
	}
	return jsonSyntaxBadToken(position)
}
func jsonSyntaxReadNumber(source *jsonSyntaxSource, begin int) jsonSyntaxToken {
	begin = langruntime.CheckedIndex(begin)
	position := begin
	if source.characters[position] == '-' {
		position = langruntime.CheckedAdd(position, 1)
	}
	if position >= len(source.characters) || jsonSyntaxDigit(source.characters[position]) == false {
		return jsonSyntaxBadToken(position)
	}
	if source.characters[position] == '0' {
		position = langruntime.CheckedAdd(position, 1)
	} else {
		for position < len(source.characters) && jsonSyntaxDigit(source.characters[position]) {
			position = langruntime.CheckedAdd(position, 1)
		}
	}
	if position < len(source.characters) && source.characters[position] == '.' {
		position = langruntime.CheckedAdd(position, 1)
		first := position
		for position < len(source.characters) && jsonSyntaxDigit(source.characters[position]) {
			position = langruntime.CheckedAdd(position, 1)
		}
		if position == first {
			return jsonSyntaxBadToken(position)
		}
	}
	if position < len(source.characters) && (source.characters[position] == 'e' || source.characters[position] == 'E') {
		position = langruntime.CheckedAdd(position, 1)
		if position < len(source.characters) && (source.characters[position] == '+' || source.characters[position] == '-') {
			position = langruntime.CheckedAdd(position, 1)
		}
		first := position
		for position < len(source.characters) && jsonSyntaxDigit(source.characters[position]) {
			position = langruntime.CheckedAdd(position, 1)
		}
		if position == first {
			return jsonSyntaxBadToken(position)
		}
	}
	if position < len(source.characters) && jsonSyntaxAlphanumeric(source.characters[position]) {
		return jsonSyntaxBadToken(position)
	}
	return jsonSyntaxToken{kind: jsonSyntaxNumber, end: position}
}
func jsonSyntaxKeyword(source *jsonSyntaxSource, begin int, word string, kind int) jsonSyntaxToken {
	begin = langruntime.CheckedIndex(begin)
	word = langruntime.CheckedString(word)
	kind = langruntime.CheckedI32(kind)
	expected := []rune(word)
	index := 0
	position := begin
	for index < len(expected) {
		if position >= len(source.characters) || source.characters[position] != expected[index] {
			return jsonSyntaxBadToken(position)
		}
		position = langruntime.CheckedAdd(position, 1)
		index = langruntime.CheckedAdd(index, 1)
	}
	if position < len(source.characters) && jsonSyntaxAlphanumeric(source.characters[position]) {
		return jsonSyntaxBadToken(position)
	}
	return jsonSyntaxToken{kind: kind, end: position}
}
func jsonSyntaxReadToken(source *jsonSyntaxSource, begin int) jsonSyntaxToken {
	begin = langruntime.CheckedIndex(begin)
	position := begin
	for position < len(source.characters) && jsonSyntaxSpace(source.characters[position]) {
		position = langruntime.CheckedAdd(position, 1)
	}
	if position == len(source.characters) {
		return jsonSyntaxToken{kind: jsonSyntaxEnd, end: position}
	}
	character := source.characters[position]
	if character == '"' {
		return jsonSyntaxReadString(source, position)
	}
	if character == '-' || jsonSyntaxDigit(character) {
		return jsonSyntaxReadNumber(source, position)
	}
	if character == 't' {
		return jsonSyntaxKeyword(source, position, "true", jsonSyntaxTrue)
	}
	if character == 'f' {
		return jsonSyntaxKeyword(source, position, "false", jsonSyntaxFalse)
	}
	if character == 'n' {
		return jsonSyntaxKeyword(source, position, "null", jsonSyntaxNull)
	}
	kind := jsonSyntaxInvalid
	if character == '{' {
		kind = langruntime.CheckedI32(jsonSyntaxObjectStart)
	} else if character == '}' {
		kind = langruntime.CheckedI32(jsonSyntaxObjectEnd)
	} else if character == '[' {
		kind = langruntime.CheckedI32(jsonSyntaxArrayStart)
	} else if character == ']' {
		kind = langruntime.CheckedI32(jsonSyntaxArrayEnd)
	} else if character == ':' {
		kind = langruntime.CheckedI32(jsonSyntaxColon)
	} else if character == ',' {
		kind = langruntime.CheckedI32(jsonSyntaxComma)
	}
	return jsonSyntaxToken{kind: kind, end: langruntime.CheckedAdd(position, 1)}
}
func jsonSyntaxRootKind(token int) int {
	token = langruntime.CheckedI32(token)
	if token == jsonSyntaxNull {
		return 0
	}
	if token == jsonSyntaxFalse {
		return 1
	}
	if token == jsonSyntaxTrue {
		return 2
	}
	if token == jsonSyntaxNumber {
		return 3
	}
	if token == jsonSyntaxString {
		return 4
	}
	if token == jsonSyntaxArrayStart {
		return 5
	}
	if token == jsonSyntaxObjectStart {
		return 6
	}
	return langruntime.CheckedSignedNegate(1)
}
func jsonSyntaxInvalidLayout(depth int) JsonSyntaxLayout {
	depth = langruntime.CheckedIndex(depth)
	return JsonSyntaxLayout{Valid: false, Kind: langruntime.CheckedSignedNegate(1), MaxDepth: depth}
}

type jsonSyntaxTransition struct {
	state  int
	action int
}

func copyjsonSyntaxTransition(value jsonSyntaxTransition) jsonSyntaxTransition {
	return jsonSyntaxTransition{state: langruntime.CheckedI32(value.state), action: langruntime.CheckedI32(value.action)}
}

const jsonSyntaxReject = 7
const jsonSyntaxContinue = 0
const jsonSyntaxFinish = 1
const jsonSyntaxClose = 2
const jsonSyntaxKey = 3
const jsonSyntaxValue = 4
const jsonSyntaxOpenArray = 5
const jsonSyntaxOpenObject = 6

func jsonSyntaxStep(state int, token int) jsonSyntaxTransition {
	state = langruntime.CheckedI32(state)
	token = langruntime.CheckedI32(token)
	next := state
	action := jsonSyntaxReject
	if state == jsonSyntaxRootEnd {
		if token == jsonSyntaxEnd {
			action = langruntime.CheckedI32(jsonSyntaxFinish)
		}
	} else if state == jsonSyntaxArrayNext || state == jsonSyntaxObjectNext {
		close := jsonSyntaxArrayEnd
		continuation := jsonSyntaxArrayValue
		if state == jsonSyntaxObjectNext {
			close = langruntime.CheckedI32(jsonSyntaxObjectEnd)
			continuation = langruntime.CheckedI32(jsonSyntaxObjectKey)
		}
		if token == close {
			action = langruntime.CheckedI32(jsonSyntaxClose)
		} else if token == jsonSyntaxComma {
			next = langruntime.CheckedI32(continuation)
			action = langruntime.CheckedI32(jsonSyntaxContinue)
		}
	} else if state == jsonSyntaxObjectColon {
		if token == jsonSyntaxColon {
			next = langruntime.CheckedI32(jsonSyntaxObjectValue)
			action = langruntime.CheckedI32(jsonSyntaxContinue)
		}
	} else if state == jsonSyntaxObjectFirst || state == jsonSyntaxObjectKey {
		if state == jsonSyntaxObjectFirst && token == jsonSyntaxObjectEnd {
			action = langruntime.CheckedI32(jsonSyntaxClose)
		} else if token == jsonSyntaxString {
			next = langruntime.CheckedI32(jsonSyntaxObjectColon)
			action = langruntime.CheckedI32(jsonSyntaxKey)
		}
	} else if state == jsonSyntaxArrayFirst && token == jsonSyntaxArrayEnd {
		action = langruntime.CheckedI32(jsonSyntaxClose)
	} else if jsonSyntaxRootKind(token) >= 0 {
		action = langruntime.CheckedI32(jsonSyntaxValue)
		if token == jsonSyntaxArrayStart {
			action = langruntime.CheckedI32(jsonSyntaxOpenArray)
		} else if token == jsonSyntaxObjectStart {
			action = langruntime.CheckedI32(jsonSyntaxOpenObject)
		}
		next = langruntime.CheckedI32(jsonSyntaxArrayNext)
		if state == jsonSyntaxRootValue {
			next = langruntime.CheckedI32(jsonSyntaxRootEnd)
		} else if state == jsonSyntaxObjectValue {
			next = langruntime.CheckedI32(jsonSyntaxObjectNext)
		}
	}
	return jsonSyntaxTransition{state: next, action: action}
}
func JsonSyntaxScan(value string) JsonSyntaxLayout {
	value = langruntime.CheckedString(value)
	source := jsonSyntaxSource{characters: []rune(value)}
	frames := []jsonSyntaxFrame{}
	langruntime.CheckedAdd(len(frames), 1)
	frames = append(frames, copyjsonSyntaxFrame(jsonSyntaxFrame{state: jsonSyntaxRootValue}))
	depth := 1
	maximum := 0
	position := 0
	rootKind := langruntime.CheckedSignedNegate(1)
	for depth > 0 {
		token := jsonSyntaxReadToken(&source, position)
		if token.kind == jsonSyntaxInvalid {
			return jsonSyntaxInvalidLayout(maximum)
		}
		frame := langruntime.CheckedSubtract(depth, 1)
		state := frames[frame].state
		transition := jsonSyntaxStep(state, token.kind)
		if transition.action == jsonSyntaxReject {
			return jsonSyntaxInvalidLayout(maximum)
		}
		if transition.action == jsonSyntaxFinish {
			return JsonSyntaxLayout{Valid: true, Kind: rootKind, MaxDepth: maximum}
		}
		if transition.action == jsonSyntaxClose {
			depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
		} else {
			frames[frame] = copyjsonSyntaxFrame(jsonSyntaxFrame{state: transition.state})
			if state == jsonSyntaxRootValue {
				rootKind = langruntime.CheckedI32(jsonSyntaxRootKind(token.kind))
			}
			if transition.action == jsonSyntaxOpenArray || transition.action == jsonSyntaxOpenObject {
				child := jsonSyntaxArrayFirst
				if transition.action == jsonSyntaxOpenObject {
					child = langruntime.CheckedI32(jsonSyntaxObjectFirst)
				}
				if depth > maximum {
					maximum = langruntime.CheckedIndex(depth)
				}
				if depth < len(frames) {
					frames[depth] = copyjsonSyntaxFrame(jsonSyntaxFrame{state: child})
				} else {
					langruntime.CheckedAdd(len(frames), 1)
					frames = append(frames, copyjsonSyntaxFrame(jsonSyntaxFrame{state: child}))
				}
				depth = langruntime.CheckedAdd(depth, 1)
			}
		}
		position = langruntime.CheckedIndex(token.end)
	}
	return jsonSyntaxInvalidLayout(maximum)
}

type jsonReadToken struct {
	start  int
	end    int
	kind   int
	syntax int
}

func copyjsonReadToken(value jsonReadToken) jsonReadToken {
	return jsonReadToken{start: langruntime.CheckedIndex(value.start), end: langruntime.CheckedIndex(value.end), kind: langruntime.CheckedI32(value.kind), syntax: langruntime.CheckedI32(value.syntax)}
}

const jsonReadEnd = 0
const jsonReadQuote = 1
const jsonReadAtom = 2
const jsonReadObjectOpen = 3
const jsonReadObjectClose = 4
const jsonReadArrayOpen = 5
const jsonReadArrayClose = 6
const jsonReadColon = 7
const jsonReadComma = 8
const jsonReadZero = 3484949
const jsonReadNonArray = 3452619
const jsonReadInvalidText = 3484946

func jsonReadNextToken(source *jsonSyntaxSource, begin int) jsonReadToken {
	begin = langruntime.CheckedIndex(begin)
	start := begin
	for start < len(source.characters) && jsonSyntaxSpace(source.characters[start]) {
		start = langruntime.CheckedAdd(start, 1)
	}
	token := jsonSyntaxReadToken(source, start)
	kind := jsonReadAtom
	if token.kind == jsonSyntaxString {
		kind = langruntime.CheckedI32(jsonReadQuote)
	} else if token.kind == jsonSyntaxObjectStart {
		kind = langruntime.CheckedI32(jsonReadObjectOpen)
	} else if token.kind == jsonSyntaxObjectEnd {
		kind = langruntime.CheckedI32(jsonReadObjectClose)
	} else if token.kind == jsonSyntaxArrayStart {
		kind = langruntime.CheckedI32(jsonReadArrayOpen)
	} else if token.kind == jsonSyntaxArrayEnd {
		kind = langruntime.CheckedI32(jsonReadArrayClose)
	} else if token.kind == jsonSyntaxColon {
		kind = langruntime.CheckedI32(jsonReadColon)
	} else if token.kind == jsonSyntaxComma {
		kind = langruntime.CheckedI32(jsonReadComma)
	} else if token.kind == jsonSyntaxEnd {
		kind = langruntime.CheckedI32(jsonReadEnd)
	}
	return jsonReadToken{start: start, end: token.end, kind: kind, syntax: token.kind}
}
func jsonReadHex(character rune) int {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	if code >= 48 && code <= 57 {
		return langruntime.CheckedSignedSubtract(code, 48)
	}
	if code >= 65 && code <= 70 {
		return langruntime.CheckedSignedSubtract(code, 55)
	}
	return langruntime.CheckedSignedSubtract(code, 87)
}
func jsonReadDecodeString(source *jsonSyntaxSource, token jsonReadToken) TextValue {
	token = copyjsonReadToken(token)
	return jsonReadDecodeStringContext(source, token, false)
}
func jsonReadDecodeStringContext(source *jsonSyntaxSource, token jsonReadToken, utf8 bool) TextValue {
	token = copyjsonReadToken(token)
	position := langruntime.CheckedAdd(token.start, 1)
	high := langruntime.CheckedSignedNegate(1)
	output := langruntime.NewTextBuffer("")
	for position < len(source.characters) {
		character := source.characters[position]
		position = langruntime.CheckedAdd(position, 1)
		if character == '"' {
			if high >= 0 {
				return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
			}
			return TextValue{Kind: TextValueValue, Value: string(output)}
		}
		if (int(langruntime.CheckedChar(character))) < 32 {
			return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
		}
		if character == '\\' {
			if position == len(source.characters) {
				return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
			}
			escape := source.characters[position]
			position = langruntime.CheckedAdd(position, 1)
			if escape == 'u' {
				code := 0
				digit := 0
				for digit < 4 {
					if position == len(source.characters) || jsonSyntaxHex(source.characters[position]) == false {
						return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
					}
					code = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(code, 16), jsonReadHex(source.characters[position])))
					position = langruntime.CheckedAdd(position, 1)
					digit = langruntime.CheckedAdd(digit, 1)
				}
				if code >= 55296 && code <= 56319 {
					if high >= 0 {
						return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
					}
					high = langruntime.CheckedI32(code)
				} else {
					if code >= 56320 && code <= 57343 {
						if high < 0 {
							return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
						}
						code = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(65536, langruntime.CheckedSignedMultiply((langruntime.CheckedSignedSubtract(high, 55296)), 1024)), code), 56320))
						high = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
					}
					if high >= 0 {
						return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
					}
					if code == 0 {
						return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadZero)}
					}
					if code > 127 && utf8 == false {
						return TextValue{Kind: TextValueUnknown}
					}
					output = append(output, string(langruntime.CheckedChar(langruntime.CharacterFromI32(code, ' ')))...)
				}
			} else {
				if high >= 0 {
					return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
				}
				decoded := escape
				if escape == 'b' {
					decoded = langruntime.CheckedChar('\b')
				} else if escape == 'f' {
					decoded = langruntime.CheckedChar('\f')
				} else if escape == 'n' {
					decoded = langruntime.CheckedChar('\n')
				} else if escape == 'r' {
					decoded = langruntime.CheckedChar('\r')
				} else if escape == 't' {
					decoded = langruntime.CheckedChar('\t')
				} else if escape != '"' && escape != '\\' && escape != '/' {
					return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
				}
				output = append(output, string(langruntime.CheckedChar(decoded))...)
			}
		} else {
			if high >= 0 {
				return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
			}
			output = append(output, string(langruntime.CheckedChar(character))...)
		}
	}
	return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonReadInvalidText)}
}
func jsonReadSlice(source *jsonSyntaxSource, start int, end int) TextValue {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	output := langruntime.NewTextBuffer("")
	position := start
	for position < end {
		output = append(output, string(langruntime.CheckedChar(source.characters[position]))...)
		position = langruntime.CheckedAdd(position, 1)
	}
	return TextValue{Kind: TextValueValue, Value: string(output)}
}
func jsonReadArrayCount(source *jsonSyntaxSource) int64 {
	depth := 0
	position := 0
	count := int64(0)
	expecting := true
	for position < len(source.characters) {
		token := jsonReadNextToken(source, position)
		if token.kind == jsonReadEnd {
			return count
		}
		if depth == 1 {
			if token.kind == jsonReadComma {
				expecting = true
			} else if expecting && (token.kind == jsonReadQuote || token.kind == jsonReadAtom || token.kind == jsonReadArrayOpen || token.kind == jsonReadObjectOpen) {
				count = langruntime.CheckedI64Add(count, int64(1))
				expecting = false
			}
		}
		if token.kind == jsonReadObjectOpen || token.kind == jsonReadArrayOpen {
			depth = langruntime.CheckedAdd(depth, 1)
		} else if token.kind == jsonReadObjectClose || token.kind == jsonReadArrayClose {
			depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
		}
		position = langruntime.CheckedIndex(token.end)
	}
	return count
}
func jsonReadSelect(value string, key string, index int, object bool, asText bool) TextValue {
	value = langruntime.CheckedString(value)
	key = langruntime.CheckedString(key)
	index = langruntime.CheckedI32(index)
	source := jsonSyntaxSource{characters: []rune(value)}
	root := jsonReadNextToken(&source, 0)
	rootObject := root.kind == jsonReadObjectOpen
	rootArray := root.kind == jsonReadArrayOpen
	wanted := int64(langruntime.CheckedI32(index))
	if wanted < int64(0) && rootArray {
		wanted = langruntime.CheckedI64Add(jsonReadArrayCount(&source), wanted)
	}
	depth := 0
	position := 0
	state := 0
	if rootArray {
		state = langruntime.CheckedI32(2)
	}
	matched := false
	element := int64(0)
	capture := false
	captureDepth := 0
	captureStart := 0
	result := TextValue{Kind: TextValueNull}
	for position < len(source.characters) {
		token := jsonReadNextToken(&source, position)
		if token.kind == jsonReadEnd {
			return result
		}
		decoded := TextValue{Kind: TextValueNull}
		if token.kind == jsonReadQuote {
			decoded = jsonReadDecodeString(&source, token)
			if decoded.Kind == TextValueError {
				error := decoded.Error
				return TextValue{Kind: TextValueError, Error: error}
			}
			if decoded.Kind == TextValueUnknown {
				return TextValue{Kind: TextValueUnknown}
			}
		}
		if depth == 1 {
			if rootObject && state == 0 && token.kind == jsonReadQuote {
				decodedName := decoded
				if decodedName.Kind == TextValueValue {
					name := langruntime.CheckedString(decodedName.Value)
					matched = name == key
				}
				state = langruntime.CheckedI32(1)
			} else if token.kind == jsonReadColon && rootObject {
				state = langruntime.CheckedI32(2)
			} else if token.kind == jsonReadComma {
				state = langruntime.CheckedI32(0)
				if rootArray {
					state = langruntime.CheckedI32(2)
				}
			} else if state == 2 && (token.kind == jsonReadQuote || token.kind == jsonReadAtom || token.kind == jsonReadArrayOpen || token.kind == jsonReadObjectOpen) {
				selected := (object && rootObject && matched) || (object == false && rootArray && element == wanted)
				element = langruntime.CheckedI64Add(element, int64(1))
				state = langruntime.CheckedI32(3)
				if selected {
					if token.kind == jsonReadArrayOpen || token.kind == jsonReadObjectOpen {
						capture = true
						captureDepth = langruntime.CheckedIndex(depth)
						captureStart = langruntime.CheckedIndex(token.start)
					} else if asText && token.kind == jsonReadQuote {
						result = decoded
					} else if asText && token.kind == jsonReadAtom && source.characters[token.start] == 'n' {
						result = TextValue{Kind: TextValueNull}
					} else {
						result = jsonReadSlice(&source, token.start, token.end)
					}
				}
			}
		}
		if token.kind == jsonReadObjectOpen || token.kind == jsonReadArrayOpen {
			depth = langruntime.CheckedAdd(depth, 1)
		} else if token.kind == jsonReadObjectClose || token.kind == jsonReadArrayClose {
			depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
			if capture && depth == captureDepth {
				result = jsonReadSlice(&source, captureStart, token.end)
				capture = false
			}
		}
		position = langruntime.CheckedIndex(token.end)
	}
	return result
}
func JsonReadField(input JsonValue, key TextValue, asText bool) TextValue {
	if input.Kind == JsonValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if key.Kind == TextValueError {
		error := key.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input.Kind == JsonValueUnknown {
		return TextValue{Kind: TextValueUnknown}
	}
	if key.Kind == TextValueUnknown {
		return TextValue{Kind: TextValueUnknown}
	}
	if input.Kind == JsonValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if key.Kind == TextValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		if key.Kind == TextValueValue {
			name := langruntime.CheckedString(key.Value)
			return jsonReadSelect(value.Source, name, 0, true, asText)
		}
	}
	return TextValue{Kind: TextValueUnknown}
}
func JsonReadElement(input JsonValue, index Int4Value, asText bool) TextValue {
	if input.Kind == JsonValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if index.Kind == Int4ValueError {
		error := index.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input.Kind == JsonValueUnknown {
		return TextValue{Kind: TextValueUnknown}
	}
	if index.Kind == Int4ValueUnknown {
		return TextValue{Kind: TextValueUnknown}
	}
	if input.Kind == JsonValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if index.Kind == Int4ValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		if index.Kind == Int4ValueValue {
			number := langruntime.CheckedI32(index.Value)
			return jsonReadSelect(value.Source, "", number, false, asText)
		}
	}
	return TextValue{Kind: TextValueUnknown}
}
func JsonReadLength(input JsonValue) Int4Value {
	if input.Kind == JsonValueError {
		error := input.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if input.Kind == JsonValueNull {
		return Int4Value{Kind: Int4ValueNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		if value.Kind != 5 {
			return Int4Value{Kind: Int4ValueError, Error: MakeSqlError(jsonReadNonArray)}
		}
		source := jsonSyntaxSource{characters: []rune(value.Source)}
		count := jsonReadArrayCount(&source)
		return MakeInt4Value(int(int32(count)))
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func JsonKindText(kind int) TextValue {
	kind = langruntime.CheckedI32(kind)
	if kind == 0 {
		return MakeTextValue("null")
	}
	if kind == 1 || kind == 2 {
		return MakeTextValue("boolean")
	}
	if kind == 3 {
		return MakeTextValue("number")
	}
	if kind == 4 {
		return MakeTextValue("string")
	}
	if kind == 5 {
		return MakeTextValue("array")
	}
	if kind == 6 {
		return MakeTextValue("object")
	}
	return TextValue{Kind: TextValueUnknown}
}

type jsonArrayPathNode struct {
	kind     int
	start    int
	end      int
	child    int
	next     int
	keyStart int
	keyEnd   int
}

func copyjsonArrayPathNode(value jsonArrayPathNode) jsonArrayPathNode {
	return jsonArrayPathNode{kind: langruntime.CheckedI32(value.kind), start: langruntime.CheckedIndex(value.start), end: langruntime.CheckedIndex(value.end), child: langruntime.CheckedIndex(value.child), next: langruntime.CheckedIndex(value.next), keyStart: langruntime.CheckedIndex(value.keyStart), keyEnd: langruntime.CheckedIndex(value.keyEnd)}
}

type jsonArrayPathFrame struct {
	node     int
	tail     int
	state    int
	keyStart int
	keyEnd   int
}

func copyjsonArrayPathFrame(value jsonArrayPathFrame) jsonArrayPathFrame {
	return jsonArrayPathFrame{node: langruntime.CheckedIndex(value.node), tail: langruntime.CheckedIndex(value.tail), state: langruntime.CheckedI32(value.state), keyStart: langruntime.CheckedIndex(value.keyStart), keyEnd: langruntime.CheckedIndex(value.keyEnd)}
}

type jsonArrayPathDocument struct {
	characters []rune
	names      []rune
	nodes      []jsonArrayPathNode
	root       int
	state      int
	error      SqlError
}

func copyjsonArrayPathDocument(value jsonArrayPathDocument) jsonArrayPathDocument {
	return jsonArrayPathDocument{characters: langruntime.CheckedChars(value.characters), names: langruntime.CheckedChars(value.names), nodes: langruntime.CheckedStructs(value.nodes, copyjsonArrayPathNode), root: langruntime.CheckedIndex(value.root), state: langruntime.CheckedI32(value.state), error: value.error}
}

type jsonArrayPathCandidates struct {
	nodes []int
	state int
}

func copyjsonArrayPathCandidates(value jsonArrayPathCandidates) jsonArrayPathCandidates {
	return jsonArrayPathCandidates{nodes: langruntime.CheckedIndices(value.nodes), state: langruntime.CheckedI32(value.state)}
}
func JsonArrayPathState(input ArrayValue) Int4Value {
	if input.Kind == ArrayValueError {
		error := input.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return Int4Value{Kind: Int4ValueNull}
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		if value.ElementType != "pg_catalog.text" || value.ElementKind != 8 {
			return Int4Value{Kind: Int4ValueUnknown}
		}
		position := 0
		for position < len(value.Elements) {
			element := CopyArrayElement(value.Elements[position])
			if element.Kind == ArrayElementNull {
				return Int4Value{Kind: Int4ValueNull}
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		return MakeInt4Value(int(int32(len(value.Elements))))
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func JsonArrayPathIndex(input string) Int4Value {
	characters := []rune(input)
	position := 0
	for position < len(characters) {
		ch := characters[position]
		if ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r' && ch != '\v' && ch != '\f' {
			break
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	negative := false
	if position < len(characters) {
		if characters[position] == '-' {
			negative = true
			position = langruntime.CheckedAdd(position, 1)
		} else if characters[position] == '+' {
			position = langruntime.CheckedAdd(position, 1)
		}
	}
	start := position
	magnitude := int64(0)
	limit := int64(2147483647)
	if negative {
		limit = int64(2147483648)
	}
	for position < len(characters) {
		digit := langruntime.CheckedSignedSubtract(int(langruntime.CheckedChar(characters[position])), 48)
		if digit < 0 || digit > 9 || magnitude > langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(limit, (int64(langruntime.CheckedI32(digit))))), int64(10)) {
			return Int4Value{Kind: Int4ValueNull}
		}
		magnitude = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(magnitude, int64(10)), (int64(langruntime.CheckedI32(digit))))
		position = langruntime.CheckedAdd(position, 1)
	}
	if position == start {
		return Int4Value{Kind: Int4ValueNull}
	}
	if negative {
		magnitude = langruntime.CheckedI64Subtract(int64(0), magnitude)
	}
	return MakeInt4Value(int(int32(magnitude)))
}
func jsonArrayPathEmpty(state int, error SqlError) jsonArrayPathDocument {
	state = langruntime.CheckedI32(state)
	characters := []rune{}
	names := []rune{}
	nodes := []jsonArrayPathNode{}
	return jsonArrayPathDocument{characters: characters, names: names, nodes: nodes, root: 0, state: state, error: error}
}
func jsonArrayPathNodeChild(node jsonArrayPathNode, value int) jsonArrayPathNode {
	node = copyjsonArrayPathNode(node)
	value = langruntime.CheckedIndex(value)
	return jsonArrayPathNode{kind: node.kind, start: node.start, end: node.end, child: value, next: node.next, keyStart: node.keyStart, keyEnd: node.keyEnd}
}
func jsonArrayPathNodeNext(node jsonArrayPathNode, value int) jsonArrayPathNode {
	node = copyjsonArrayPathNode(node)
	value = langruntime.CheckedIndex(value)
	return jsonArrayPathNode{kind: node.kind, start: node.start, end: node.end, child: node.child, next: value, keyStart: node.keyStart, keyEnd: node.keyEnd}
}
func jsonArrayPathNodeEnd(node jsonArrayPathNode, value int) jsonArrayPathNode {
	node = copyjsonArrayPathNode(node)
	value = langruntime.CheckedIndex(value)
	return jsonArrayPathNode{kind: node.kind, start: node.start, end: value, child: node.child, next: node.next, keyStart: node.keyStart, keyEnd: node.keyEnd}
}
func parseJsonArrayPathDocument(input string, utf8 bool) jsonArrayPathDocument {
	input = langruntime.CheckedString(input)
	source := jsonSyntaxSource{characters: []rune(input)}
	nodes := []jsonArrayPathNode{}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, copyjsonArrayPathNode(jsonArrayPathNode{kind: langruntime.CheckedSignedNegate(1), start: 0, end: 0, child: 0, next: 0, keyStart: 0, keyEnd: 0}))
	names := []rune{}
	frames := []jsonArrayPathFrame{}
	depth := 0
	position := 0
	root := 0
	for position < len(source.characters) {
		token := jsonReadNextToken(&source, position)
		if token.kind == jsonReadEnd {
			break
		}
		if token.syntax == jsonSyntaxInvalid {
			return jsonArrayPathEmpty(langruntime.CheckedSignedNegate(2), MakeSqlError(jsonReadInvalidText))
		}
		decoded := TextValue{Kind: TextValueNull}
		if token.kind == jsonReadQuote {
			decoded = jsonReadDecodeStringContext(&source, token, utf8)
			if decoded.Kind == TextValueError {
				error := decoded.Error
				return jsonArrayPathEmpty(langruntime.CheckedSignedNegate(2), error)
			}
			if decoded == (TextValue{Kind: TextValueUnknown}) {
				return jsonArrayPathEmpty(langruntime.CheckedSignedNegate(1), MakeSqlError(0))
			}
		}
		key := false
		if depth > 0 {
			frame := frames[langruntime.CheckedSubtract(depth, 1)]
			if nodes[frame.node].kind == 6 && frame.state == 0 && token.kind == jsonReadQuote {
				begin := len(names)
				if decoded.Kind == TextValueValue {
					text := langruntime.CheckedString(decoded.Value)
					characters := []rune(text)
					index := 0
					for index < len(characters) {
						langruntime.CheckedAdd(len(names), 1)
						names = append(names, langruntime.CheckedChar(characters[index]))
						index = langruntime.CheckedAdd(index, 1)
					}
				}
				frames[langruntime.CheckedSubtract(depth, 1)] = copyjsonArrayPathFrame(jsonArrayPathFrame{node: frame.node, tail: frame.tail, state: 1, keyStart: begin, keyEnd: len(names)})
				key = true
			}
		}
		if key == false {
			if token.kind == jsonReadColon || token.kind == jsonReadComma {
				if depth > 0 {
					frame := frames[langruntime.CheckedSubtract(depth, 1)]
					state := 0
					if token.kind == jsonReadColon || nodes[frame.node].kind == 5 {
						state = langruntime.CheckedI32(2)
					}
					frames[langruntime.CheckedSubtract(depth, 1)] = copyjsonArrayPathFrame(jsonArrayPathFrame{node: frame.node, tail: frame.tail, state: state, keyStart: frame.keyStart, keyEnd: frame.keyEnd})
				}
			} else if token.kind == jsonReadObjectClose || token.kind == jsonReadArrayClose {
				if depth == 0 {
					return jsonArrayPathEmpty(langruntime.CheckedSignedNegate(2), MakeSqlError(jsonReadInvalidText))
				}
				frame := frames[langruntime.CheckedSubtract(depth, 1)]
				nodes[frame.node] = copyjsonArrayPathNode(jsonArrayPathNodeEnd(nodes[frame.node], token.end))
				depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
			} else {
				kind := 3
				if token.kind == jsonReadObjectOpen {
					kind = langruntime.CheckedI32(6)
				} else if token.kind == jsonReadArrayOpen {
					kind = langruntime.CheckedI32(5)
				} else if token.kind == jsonReadQuote {
					kind = langruntime.CheckedI32(4)
				} else if source.characters[token.start] == 'n' {
					kind = langruntime.CheckedI32(0)
				} else if source.characters[token.start] == 't' {
					kind = langruntime.CheckedI32(1)
				} else if source.characters[token.start] == 'f' {
					kind = langruntime.CheckedI32(2)
				}
				keyStart := 0
				keyEnd := 0
				index := len(nodes)
				if depth > 0 {
					frame := frames[langruntime.CheckedSubtract(depth, 1)]
					keyStart = langruntime.CheckedIndex(frame.keyStart)
					keyEnd = langruntime.CheckedIndex(frame.keyEnd)
					if frame.tail > 0 {
						nodes[frame.tail] = copyjsonArrayPathNode(jsonArrayPathNodeNext(nodes[frame.tail], index))
					} else {
						nodes[frame.node] = copyjsonArrayPathNode(jsonArrayPathNodeChild(nodes[frame.node], index))
					}
					frames[langruntime.CheckedSubtract(depth, 1)] = copyjsonArrayPathFrame(jsonArrayPathFrame{node: frame.node, tail: index, state: 3, keyStart: frame.keyStart, keyEnd: frame.keyEnd})
				} else {
					root = langruntime.CheckedIndex(index)
				}
				langruntime.CheckedAdd(len(nodes), 1)
				nodes = append(nodes, copyjsonArrayPathNode(jsonArrayPathNode{kind: kind, start: token.start, end: token.end, child: 0, next: 0, keyStart: keyStart, keyEnd: keyEnd}))
				if kind == 5 || kind == 6 {
					state := 0
					if kind == 5 {
						state = langruntime.CheckedI32(2)
					}
					frame := jsonArrayPathFrame{node: index, tail: 0, state: state, keyStart: 0, keyEnd: 0}
					if depth < len(frames) {
						frames[depth] = copyjsonArrayPathFrame(frame)
					} else {
						langruntime.CheckedAdd(len(frames), 1)
						frames = append(frames, copyjsonArrayPathFrame(frame))
					}
					depth = langruntime.CheckedAdd(depth, 1)
				}
			}
		}
		position = langruntime.CheckedIndex(token.end)
	}
	return jsonArrayPathDocument{characters: source.characters, names: names, nodes: nodes, root: root, state: 1, error: MakeSqlError(0)}
}
func jsonArrayPathKeyMatches(source *jsonArrayPathDocument, node jsonArrayPathNode, key *jsonSyntaxSource) bool {
	node = copyjsonArrayPathNode(node)
	if langruntime.CheckedSubtract(node.keyEnd, node.keyStart) != len(key.characters) {
		return false
	}
	position := 0
	for position < len(key.characters) {
		if source.names[langruntime.CheckedAdd(node.keyStart, position)] != key.characters[position] {
			return false
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return true
}
func jsonArrayPathNext(source *jsonArrayPathDocument, current jsonArrayPathCandidates, key TextValue) jsonArrayPathCandidates {
	current = copyjsonArrayPathCandidates(current)
	output := []int{}
	if key.Kind == TextValueValue {
		text := langruntime.CheckedString(key.Value)
		characters := jsonSyntaxSource{characters: []rune(text)}
		index := JsonArrayPathIndex(text)
		position := 0
		for position < len(current.nodes) {
			node := source.nodes[current.nodes[position]]
			if node.kind == 6 {
				child := node.child
				for child > 0 {
					field := source.nodes[child]
					if jsonArrayPathKeyMatches(source, field, &characters) {
						langruntime.CheckedAdd(len(output), 1)
						output = append(output, langruntime.CheckedIndex(child))
					}
					child = langruntime.CheckedIndex(field.next)
				}
			} else if node.kind == 5 {
				if index.Kind == Int4ValueValue {
					number := langruntime.CheckedI32(index.Value)
					count := int64(0)
					child := node.child
					for child > 0 {
						count = langruntime.CheckedI64Add(count, int64(1))
						child = langruntime.CheckedIndex(source.nodes[child].next)
					}
					wanted := int64(langruntime.CheckedI32(number))
					if wanted < int64(0) {
						wanted = langruntime.CheckedI64Add(count, wanted)
					}
					offset := int64(0)
					child = langruntime.CheckedIndex(node.child)
					for child > 0 {
						if offset == wanted {
							langruntime.CheckedAdd(len(output), 1)
							output = append(output, langruntime.CheckedIndex(child))
							break
						}
						offset = langruntime.CheckedI64Add(offset, int64(1))
						child = langruntime.CheckedIndex(source.nodes[child].next)
					}
				}
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		return jsonArrayPathCandidates{nodes: output, state: 1}
	}
	position := 0
	for position < len(current.nodes) {
		node := source.nodes[current.nodes[position]]
		if (node.kind == 5 || node.kind == 6) && node.child > 0 {
			return jsonArrayPathCandidates{nodes: output, state: langruntime.CheckedSignedNegate(1)}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return jsonArrayPathCandidates{nodes: output, state: 1}
}
func JsonReadArrayPath(input JsonValue, path ArrayValue, asText bool, utf8 bool) TextValue {
	if input.Kind == JsonValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	pathState := JsonArrayPathState(CopyArrayValue(path))
	if pathState.Kind == Int4ValueError {
		error := pathState.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input.Kind == JsonValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if pathState == (Int4Value{Kind: Int4ValueNull}) {
		return TextValue{Kind: TextValueNull}
	}
	if pathState == (Int4Value{Kind: Int4ValueUnknown}) {
		return TextValue{Kind: TextValueUnknown}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		if path.Kind == ArrayValueValue {
			keys := CopyArrayPayload(path.Value)
			uncertain := false
			index := 0
			for index < len(keys.Elements) {
				key := CopyArrayElement(keys.Elements[index])
				if key.Kind == ArrayElementUnknown {
					uncertain = true
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			document := parseJsonArrayPathDocument(value.Source, utf8)
			if document.state == langruntime.CheckedSignedNegate(2) {
				if uncertain {
					return TextValue{Kind: TextValueUnknown}
				}
				return TextValue{Kind: TextValueError, Error: document.error}
			}
			if document.state != 1 || document.root == 0 {
				return TextValue{Kind: TextValueUnknown}
			}
			initial := []int{}
			langruntime.CheckedAdd(len(initial), 1)
			initial = append(initial, langruntime.CheckedIndex(document.root))
			candidates := jsonArrayPathCandidates{nodes: initial, state: 1}
			index = langruntime.CheckedIndex(0)
			for index < len(keys.Elements) {
				key := ArrayElementToText(CopyArrayElement(keys.Elements[index]))
				candidates = copyjsonArrayPathCandidates(jsonArrayPathNext(&document, candidates, key))
				if candidates.state != 1 {
					return TextValue{Kind: TextValueUnknown}
				}
				if len(candidates.nodes) == 0 {
					return TextValue{Kind: TextValueNull}
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			selected := candidates.nodes[langruntime.CheckedSubtract(len(candidates.nodes), 1)]
			node := document.nodes[selected]
			source := jsonSyntaxSource{characters: document.characters}
			if asText && node.kind == 0 {
				return TextValue{Kind: TextValueNull}
			}
			if asText && node.kind == 4 {
				token := jsonReadNextToken(&source, node.start)
				return jsonReadDecodeStringContext(&source, token, utf8)
			}
			if len(keys.Elements) == 0 && node.kind < 5 {
				return jsonReadSlice(&source, 0, node.end)
			}
			return jsonReadSlice(&source, node.start, node.end)
		}
	}
	return TextValue{Kind: TextValueUnknown}
}
func JsonQuoteString(input string) string {
	input = langruntime.CheckedString(input)
	characters := []rune(input)
	hex := []rune("0123456789abcdef")
	output := langruntime.NewTextBuffer("")
	output = append(output, string(langruntime.CheckedChar('"'))...)
	position := 0
	for position < len(characters) {
		character := characters[position]
		code := int(langruntime.CheckedChar(character))
		if character == '"' {
			output = append(output, "\\\""...)
		} else if character == '\\' {
			output = append(output, "\\\\"...)
		} else if character == '\b' {
			output = append(output, "\\b"...)
		} else if character == '\f' {
			output = append(output, "\\f"...)
		} else if character == '\n' {
			output = append(output, "\\n"...)
		} else if character == '\r' {
			output = append(output, "\\r"...)
		} else if character == '\t' {
			output = append(output, "\\t"...)
		} else if code < 32 {
			output = append(output, "\\u00"...)
			output = append(output, string(langruntime.CheckedChar(hex[langruntime.IndexFromI32(langruntime.CheckedSignedDivide(code, 16), 0)]))...)
			output = append(output, string(langruntime.CheckedChar(hex[langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(code, 16), 0)]))...)
		} else {
			output = append(output, string(langruntime.CheckedChar(character))...)
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	output = append(output, string(langruntime.CheckedChar('"'))...)
	return string(output)
}

type jsonStripFrame struct {
	node  int
	child int
	first bool
}

func copyjsonStripFrame(value jsonStripFrame) jsonStripFrame {
	return jsonStripFrame{node: langruntime.CheckedIndex(value.node), child: langruntime.CheckedIndex(value.child), first: value.first}
}
func JsonStripNullsContext(input JsonValue, arrays BoolValue, utf8 bool) JsonValue {
	if input.Kind == JsonValueError {
		error := input.Error
		return JsonValue{Kind: JsonValueError, Error: error}
	}
	if arrays.Kind == BoolValueError {
		error := arrays.Error
		return JsonValue{Kind: JsonValueError, Error: error}
	}
	if input.Kind == JsonValueNull {
		return JsonValue{Kind: JsonValueNull}
	}
	if arrays == (BoolValue{Kind: BoolValueNull}) {
		return JsonValue{Kind: JsonValueNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		if arrays.Kind == BoolValueValue {
			remove := arrays.Value
			document := parseJsonArrayPathDocument(value.Source, utf8)
			if document.state == langruntime.CheckedSignedNegate(2) {
				return JsonValue{Kind: JsonValueError, Error: document.error}
			}
			if document.state != 1 {
				return JsonValue{Kind: JsonValueUnknown}
			}
			source := jsonSyntaxSource{characters: document.characters}
			output := langruntime.NewTextBuffer("")
			frames := []jsonStripFrame{}
			depth := 0
			current := document.root
			visiting := true
			for visiting || depth > 0 {
				if visiting {
					node := document.nodes[current]
					if node.kind >= 5 {
						if node.kind == 6 {
							output = append(output, string(langruntime.CheckedChar('{'))...)
						} else {
							output = append(output, string(langruntime.CheckedChar('['))...)
						}
						frame := jsonStripFrame{node: current, child: node.child, first: true}
						if depth == len(frames) {
							langruntime.CheckedAdd(len(frames), 1)
							frames = append(frames, copyjsonStripFrame(frame))
						} else {
							frames[depth] = copyjsonStripFrame(frame)
						}
						depth = langruntime.CheckedAdd(depth, 1)
					} else if node.kind == 4 {
						token := jsonReadNextToken(&source, node.start)
						decoded := jsonReadDecodeStringContext(&source, token, utf8)
						if decoded.Kind == TextValueError {
							error := decoded.Error
							return JsonValue{Kind: JsonValueError, Error: error}
						}
						ready := false
						if decoded.Kind == TextValueValue {
							text := langruntime.CheckedString(decoded.Value)
							quoted := JsonQuoteString(text)
							output = append(output, quoted...)
							ready = true
						}
						if ready == false {
							return JsonValue{Kind: JsonValueUnknown}
						}
					} else {
						position := node.start
						for position < node.end {
							output = append(output, string(langruntime.CheckedChar(source.characters[position]))...)
							position = langruntime.CheckedAdd(position, 1)
						}
					}
					visiting = false
				} else {
					frame := frames[langruntime.CheckedSubtract(depth, 1)]
					parent := document.nodes[frame.node]
					child := frame.child
					for child > 0 {
						node := document.nodes[child]
						if node.kind != 0 || (parent.kind != 6 && remove == false) {
							break
						}
						child = langruntime.CheckedIndex(node.next)
					}
					if child == 0 {
						if parent.kind == 6 {
							output = append(output, string(langruntime.CheckedChar('}'))...)
						} else {
							output = append(output, string(langruntime.CheckedChar(']'))...)
						}
						depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
					} else {
						node := document.nodes[child]
						if frame.first == false {
							output = append(output, string(langruntime.CheckedChar(','))...)
						}
						if parent.kind == 6 {
							key := langruntime.NewTextBuffer("")
							position := node.keyStart
							for position < node.keyEnd {
								key = append(key, string(langruntime.CheckedChar(document.names[position]))...)
								position = langruntime.CheckedAdd(position, 1)
							}
							quoted := JsonQuoteString(string(key))
							output = append(output, quoted...)
							output = append(output, string(langruntime.CheckedChar(':'))...)
						}
						frames[langruntime.CheckedSubtract(depth, 1)] = copyjsonStripFrame(jsonStripFrame{node: frame.node, child: node.next, first: false})
						current = langruntime.CheckedIndex(child)
						visiting = true
					}
				}
			}
			return MakeJsonValue(string(output))
		}
	}
	return JsonValue{Kind: JsonValueUnknown}
}

type jsonbFrame struct {
	state    int
	node     int
	tail     int
	keyStart int
	keyEnd   int
}

func copyjsonbFrame(value jsonbFrame) jsonbFrame {
	return jsonbFrame{state: langruntime.CheckedI32(value.state), node: langruntime.CheckedIndex(value.node), tail: langruntime.CheckedIndex(value.tail), keyStart: langruntime.CheckedIndex(value.keyStart), keyEnd: langruntime.CheckedIndex(value.keyEnd)}
}

type jsonbCharacters struct {
	characters []rune
}

func copyjsonbCharacters(value jsonbCharacters) jsonbCharacters {
	return jsonbCharacters{characters: langruntime.CheckedChars(value.characters)}
}

const jsonbNumericRange = 3452547

func jsonbNodeLink(node JsonbNode, next int) JsonbNode {
	next = langruntime.CheckedIndex(next)
	return JsonbNode{Kind: node.Kind, Child: node.Child, Next: next, KeyStart: node.KeyStart, KeyEnd: node.KeyEnd, TextStart: node.TextStart, TextEnd: node.TextEnd}
}
func jsonbNodeChild(node JsonbNode, child int) JsonbNode {
	child = langruntime.CheckedIndex(child)
	return JsonbNode{Kind: node.Kind, Child: child, Next: node.Next, KeyStart: node.KeyStart, KeyEnd: node.KeyEnd, TextStart: node.TextStart, TextEnd: node.TextEnd}
}
func jsonbScalarReady(source *jsonSyntaxSource, token jsonReadToken, utf8 bool) BoolValue {
	token = copyjsonReadToken(token)
	following := jsonReadNextToken(source, token.end)
	if following.start < len(source.characters) && source.characters[following.start] == '"' {
		decoded := jsonReadDecodeStringContext(source, following, utf8)
		if decoded.Kind == TextValueError {
			error := decoded.Error
			return BoolValue{Kind: BoolValueError, Error: error}
		}
		if decoded.Kind == TextValueUnknown {
			return BoolValue{Kind: BoolValueUnknown}
		}
	}
	if following.syntax == jsonSyntaxInvalid {
		return BoolValue{Kind: BoolValueError, Error: MakeSqlError(jsonReadInvalidText)}
	}
	return BoolValue{Kind: BoolValueValue, Value: true}
}
func jsonbNumberText(source *jsonSyntaxSource, token jsonReadToken, utf8 bool) TextValue {
	token = copyjsonReadToken(token)
	ready := jsonbScalarReady(source, token, utf8)
	if ready.Kind == BoolValueError {
		error := ready.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if ready.Kind == BoolValueUnknown {
		return TextValue{Kind: TextValueUnknown}
	}
	position := token.start
	negative := source.characters[position] == '-'
	if negative {
		position = langruntime.CheckedAdd(position, 1)
	}
	digits := []rune{}
	before := 0
	point := false
	first := langruntime.CheckedSignedNegate(1)
	for position < token.end && source.characters[position] != 'e' && source.characters[position] != 'E' {
		character := source.characters[position]
		if character == '.' {
			point = true
		} else {
			if first < 0 && character != '0' {
				first = langruntime.CheckedI32(int(int32(len(digits))))
			}
			langruntime.CheckedAdd(len(digits), 1)
			digits = append(digits, langruntime.CheckedChar(character))
			if point == false {
				before = langruntime.CheckedI32(langruntime.CheckedSignedAdd(before, 1))
			}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	exponent := 0
	if position < token.end {
		position = langruntime.CheckedAdd(position, 1)
		sign := 1
		if source.characters[position] == '-' {
			sign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
			position = langruntime.CheckedAdd(position, 1)
		} else if source.characters[position] == '+' {
			position = langruntime.CheckedAdd(position, 1)
		}
		for position < token.end {
			digit := langruntime.CheckedSignedSubtract(int(langruntime.CheckedChar(source.characters[position])), 48)
			if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
				return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonbNumericRange)}
			}
			exponent = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(exponent, 10), digit))
			position = langruntime.CheckedAdd(position, 1)
		}
		exponent = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(exponent, sign))
	}
	count := int(int32(len(digits)))
	scale := langruntime.CheckedI64Subtract(int64(langruntime.CheckedI32((langruntime.CheckedSignedSubtract(count, before)))), int64(langruntime.CheckedI32(exponent)))
	if scale < int64(0) {
		scale = int64(0)
	}
	boundary := langruntime.CheckedI64Add(int64(langruntime.CheckedI32(before)), int64(langruntime.CheckedI32(exponent)))
	weight := langruntime.CheckedI64Subtract(langruntime.CheckedI64Subtract(boundary, int64(langruntime.CheckedI32(first))), int64(1))
	if scale > int64(16383) || (first >= 0 && weight > int64(131071)) {
		return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonbNumericRange)}
	}
	output := langruntime.NewTextBuffer("")
	if first >= 0 && negative {
		output = append(output, string(langruntime.CheckedChar('-'))...)
	}
	place := int64(0)
	if first >= 0 && weight > int64(0) {
		place = weight
	}
	for place >= int64(0) {
		index := langruntime.CheckedI64Subtract(langruntime.CheckedI64Subtract(boundary, place), int64(1))
		digit := '0'
		if first >= 0 && index >= int64(0) && index < int64(langruntime.CheckedI32(count)) {
			digit = langruntime.CheckedChar(digits[langruntime.IndexFromI32(int(int32(index)), 0)])
		}
		output = append(output, string(langruntime.CheckedChar(digit))...)
		place = langruntime.CheckedI64Subtract(place, int64(1))
	}
	if scale > int64(0) {
		output = append(output, string(langruntime.CheckedChar('.'))...)
	}
	fraction := int64(0)
	for fraction < scale {
		index := langruntime.CheckedI64Add(boundary, fraction)
		digit := '0'
		if first >= 0 && index >= int64(0) && index < int64(langruntime.CheckedI32(count)) {
			digit = langruntime.CheckedChar(digits[langruntime.IndexFromI32(int(int32(index)), 0)])
		}
		output = append(output, string(langruntime.CheckedChar(digit))...)
		fraction = langruntime.CheckedI64Add(fraction, int64(1))
	}
	numeric := NumericParts(string(output))
	if numeric.Valid == false {
		return TextValue{Kind: TextValueError, Error: MakeSqlError(jsonbNumericRange)}
	}
	return TextValue{Kind: TextValueValue, Value: string(output)}
}
func jsonbKeyCompare(source *jsonbCharacters, left JsonbNode, right JsonbNode) int {
	a := langruntime.CheckedSubtract(left.KeyEnd, left.KeyStart)
	b := langruntime.CheckedSubtract(right.KeyEnd, right.KeyStart)
	if a < b {
		return langruntime.CheckedSignedNegate(1)
	}
	if a > b {
		return 1
	}
	offset := 0
	for offset < a {
		x := int(langruntime.CheckedChar(source.characters[langruntime.CheckedAdd(left.KeyStart, offset)]))
		y := int(langruntime.CheckedChar(source.characters[langruntime.CheckedAdd(right.KeyStart, offset)]))
		if x < y {
			return langruntime.CheckedSignedNegate(1)
		}
		if x > y {
			return 1
		}
		offset = langruntime.CheckedAdd(offset, 1)
	}
	return 0
}
func jsonbNormalizeObjects(input JsonbPayload) JsonbPayload {
	input = CopyJsonbPayload(input)
	source := jsonbCharacters{characters: input.Characters}
	nodes := input.Nodes
	index := 1
	for index < len(nodes) {
		parent := nodes[index]
		if parent.Kind == 6 {
			entries := []int{}
			scratch := []int{}
			child := parent.Child
			for child > 0 {
				langruntime.CheckedAdd(len(entries), 1)
				entries = append(entries, langruntime.CheckedIndex(child))
				langruntime.CheckedAdd(len(scratch), 1)
				scratch = append(scratch, langruntime.CheckedIndex(0))
				child = langruntime.CheckedIndex(nodes[child].Next)
			}
			width := 1
			for width < len(entries) {
				begin := 0
				for begin < len(entries) {
					middle := langruntime.CheckedAdd(begin, width)
					if middle > len(entries) {
						middle = langruntime.CheckedIndex(len(entries))
					}
					end := langruntime.CheckedAdd(middle, width)
					if end > len(entries) {
						end = langruntime.CheckedIndex(len(entries))
					}
					a := begin
					b := middle
					out := begin
					for out < end {
						takeLeft := b == end
						if a < middle && b < end {
							comparison := jsonbKeyCompare(&source, nodes[entries[a]], nodes[entries[b]])
							takeLeft = comparison < 0 || (comparison == 0 && entries[a] > entries[b])
						}
						if a < middle && takeLeft {
							scratch[out] = langruntime.CheckedIndex(entries[a])
							a = langruntime.CheckedAdd(a, 1)
						} else {
							scratch[out] = langruntime.CheckedIndex(entries[b])
							b = langruntime.CheckedAdd(b, 1)
						}
						out = langruntime.CheckedAdd(out, 1)
					}
					begin = langruntime.CheckedIndex(end)
				}
				out := 0
				for out < len(entries) {
					entries[out] = langruntime.CheckedIndex(scratch[out])
					out = langruntime.CheckedAdd(out, 1)
				}
				width = langruntime.CheckedIndex(langruntime.CheckedAdd(width, width))
			}
			first := 0
			last := 0
			out := 0
			for out < len(entries) {
				current := entries[out]
				if last == 0 || jsonbKeyCompare(&source, nodes[last], nodes[current]) != 0 {
					if last == 0 {
						first = langruntime.CheckedIndex(current)
					} else {
						nodes[last] = jsonbNodeLink(nodes[last], current)
					}
					last = langruntime.CheckedIndex(current)
				}
				out = langruntime.CheckedAdd(out, 1)
			}
			if last > 0 {
				nodes[last] = jsonbNodeLink(nodes[last], 0)
			}
			nodes[index] = jsonbNodeChild(parent, first)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return JsonbPayload{Characters: source.characters, Nodes: nodes, Root: input.Root}
}
func jsonbParseTextContext(input TextValue, admission bool, utf8 bool) JsonbValue {
	if input.Kind == TextValueError {
		error := input.Error
		return JsonbValue{Kind: JsonbValueError, Error: error}
	}
	if input.Kind == TextValueNull {
		return JsonbValue{Kind: JsonbValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		source := jsonSyntaxSource{characters: []rune(value)}
		characters := []rune{}
		nodes := []JsonbNode{}
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, JsonbNode{Kind: langruntime.CheckedSignedNegate(1), Child: 0, Next: 0, KeyStart: 0, KeyEnd: 0, TextStart: 0, TextEnd: 0})
		frames := []jsonbFrame{}
		langruntime.CheckedAdd(len(frames), 1)
		frames = append(frames, copyjsonbFrame(jsonbFrame{state: jsonSyntaxRootValue, node: 0, tail: 0, keyStart: 0, keyEnd: 0}))
		depth := 1
		position := 0
		root := 0
		for depth > 0 {
			token := jsonReadNextToken(&source, position)
			decoded := TextValue{Kind: TextValueNull}
			if token.start < len(source.characters) && source.characters[token.start] == '"' {
				decoded = jsonReadDecodeStringContext(&source, token, utf8)
				if decoded.Kind == TextValueError {
					error := decoded.Error
					return JsonbValue{Kind: JsonbValueError, Error: error}
				}
				if decoded.Kind == TextValueUnknown {
					return JsonbValue{Kind: JsonbValueUnknown}
				}
			}
			if token.syntax == jsonSyntaxInvalid {
				return JsonbValue{Kind: JsonbValueError, Error: MakeSqlError(jsonReadInvalidText)}
			}
			frame := frames[langruntime.CheckedSubtract(depth, 1)]
			if admission && frame.state == jsonSyntaxObjectValue {
				low := int64(0)
				high := int64(0)
				key := frame.keyStart
				for key < frame.keyEnd {
					low = langruntime.CheckedI64Add(low, int64(1))
					high = langruntime.CheckedI64Add(high, int64(1))
					if int(langruntime.CheckedChar(characters[key])) > 127 {
						high = langruntime.CheckedI64Add(high, int64(3))
					}
					key = langruntime.CheckedAdd(key, 1)
				}
				decision := jsonbStorageDecision(jsonbStorageBounds(low, high))
				if decision.Kind == BoolValueError {
					error := decision.Error
					return JsonbValue{Kind: JsonbValueError, Error: error}
				}
				if decision.Kind == BoolValueUnknown {
					return JsonbValue{Kind: JsonbValueUnknown}
				}
			}
			transition := jsonSyntaxStep(frame.state, token.syntax)
			if transition.action == jsonSyntaxReject {
				return JsonbValue{Kind: JsonbValueError, Error: MakeSqlError(jsonReadInvalidText)}
			}
			if transition.action == jsonSyntaxFinish {
				payload := JsonbPayload{Characters: characters, Nodes: nodes, Root: root}
				normalized := jsonbNormalizeObjects(payload)
				if admission {
					decision := JsonbStorageAdmission(&normalized)
					if decision.Kind == BoolValueError {
						error := decision.Error
						return JsonbValue{Kind: JsonbValueError, Error: error}
					}
					if decision.Kind == BoolValueUnknown {
						return JsonbValue{Kind: JsonbValueUnknown}
					}
				}
				return JsonbValue{Kind: JsonbValueValue, Value: normalized}
			}
			keyStart := frame.keyStart
			keyEnd := frame.keyEnd
			tail := frame.tail
			if transition.action == jsonSyntaxClose {
				depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
			} else {
				if transition.action == jsonSyntaxKey {
					keyStart = langruntime.CheckedIndex(len(characters))
					if decoded.Kind == TextValueValue {
						key := langruntime.CheckedString(decoded.Value)
						content := []rune(key)
						i := 0
						for i < len(content) {
							langruntime.CheckedAdd(len(characters), 1)
							characters = append(characters, langruntime.CheckedChar(content[i]))
							i = langruntime.CheckedAdd(i, 1)
						}
					}
					keyEnd = langruntime.CheckedIndex(len(characters))
				} else if transition.action == jsonSyntaxValue || transition.action == jsonSyntaxOpenArray || transition.action == jsonSyntaxOpenObject {
					if token.syntax == jsonSyntaxNumber {
						decoded = jsonbNumberText(&source, token, utf8)
						if decoded.Kind == TextValueError {
							error := decoded.Error
							return JsonbValue{Kind: JsonbValueError, Error: error}
						}
						if decoded.Kind == TextValueUnknown {
							return JsonbValue{Kind: JsonbValueUnknown}
						}
					}
					if admission && token.kind == jsonReadQuote {
						ready := jsonbScalarReady(&source, token, utf8)
						if ready.Kind == BoolValueError {
							error := ready.Error
							return JsonbValue{Kind: JsonbValueError, Error: error}
						}
						if ready.Kind == BoolValueUnknown {
							return JsonbValue{Kind: JsonbValueUnknown}
						}
						sizeText := decoded
						if sizeText.Kind == TextValueValue {
							text := langruntime.CheckedString(sizeText.Value)
							content := []rune(text)
							low := int64(0)
							high := int64(0)
							position := 0
							for position < len(content) {
								low = langruntime.CheckedI64Add(low, int64(1))
								high = langruntime.CheckedI64Add(high, int64(1))
								if int(langruntime.CheckedChar(content[position])) > 127 {
									high = langruntime.CheckedI64Add(high, int64(3))
								}
								position = langruntime.CheckedAdd(position, 1)
							}
							decision := jsonbStorageDecision(jsonbStorageBounds(low, high))
							if decision.Kind == BoolValueError {
								error := decision.Error
								return JsonbValue{Kind: JsonbValueError, Error: error}
							}
							if decision.Kind == BoolValueUnknown {
								return JsonbValue{Kind: JsonbValueUnknown}
							}
						}
					}
					textStart := len(characters)
					if decoded.Kind == TextValueValue {
						text := langruntime.CheckedString(decoded.Value)
						content := []rune(text)
						i := 0
						for i < len(content) {
							langruntime.CheckedAdd(len(characters), 1)
							characters = append(characters, langruntime.CheckedChar(content[i]))
							i = langruntime.CheckedAdd(i, 1)
						}
					}
					current := len(nodes)
					langruntime.CheckedAdd(len(nodes), 1)
					nodes = append(nodes, JsonbNode{Kind: jsonSyntaxRootKind(token.syntax), Child: 0, Next: 0, KeyStart: keyStart, KeyEnd: keyEnd, TextStart: textStart, TextEnd: len(characters)})
					if frame.node == 0 {
						root = langruntime.CheckedIndex(current)
					} else if tail == 0 {
						nodes[frame.node] = jsonbNodeChild(nodes[frame.node], current)
					} else {
						nodes[tail] = jsonbNodeLink(nodes[tail], current)
					}
					tail = langruntime.CheckedIndex(current)
				}
				frames[langruntime.CheckedSubtract(depth, 1)] = copyjsonbFrame(jsonbFrame{state: transition.state, node: frame.node, tail: tail, keyStart: keyStart, keyEnd: keyEnd})
				if transition.action == jsonSyntaxOpenArray || transition.action == jsonSyntaxOpenObject {
					state := jsonSyntaxArrayFirst
					if transition.action == jsonSyntaxOpenObject {
						state = langruntime.CheckedI32(jsonSyntaxObjectFirst)
					}
					child := jsonbFrame{state: state, node: tail, tail: 0, keyStart: 0, keyEnd: 0}
					if depth < len(frames) {
						frames[depth] = copyjsonbFrame(child)
					} else {
						langruntime.CheckedAdd(len(frames), 1)
						frames = append(frames, copyjsonbFrame(child))
					}
					depth = langruntime.CheckedAdd(depth, 1)
				}
			}
			position = langruntime.CheckedIndex(token.end)
		}
	}
	return JsonbValue{Kind: JsonbValueUnknown}
}
func jsonbQuote(source *JsonbPayload, begin int, end int) string {
	begin = langruntime.CheckedIndex(begin)
	end = langruntime.CheckedIndex(end)
	output := langruntime.NewTextBuffer("")
	output = append(output, string(langruntime.CheckedChar('"'))...)
	hex := []rune("0123456789abcdef")
	position := begin
	for position < end {
		character := source.Characters[position]
		code := int(langruntime.CheckedChar(character))
		if character == '"' {
			output = append(output, "\\\""...)
		} else if character == '\\' {
			output = append(output, "\\\\"...)
		} else if character == '\b' {
			output = append(output, "\\b"...)
		} else if character == '\f' {
			output = append(output, "\\f"...)
		} else if character == '\n' {
			output = append(output, "\\n"...)
		} else if character == '\r' {
			output = append(output, "\\r"...)
		} else if character == '\t' {
			output = append(output, "\\t"...)
		} else if code < 32 {
			output = append(output, "\\u00"...)
			output = append(output, string(langruntime.CheckedChar(hex[langruntime.IndexFromI32(langruntime.CheckedSignedDivide(code, 16), 0)]))...)
			output = append(output, string(langruntime.CheckedChar(hex[langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(code, 16), 0)]))...)
		} else {
			output = append(output, string(langruntime.CheckedChar(character))...)
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	output = append(output, string(langruntime.CheckedChar('"'))...)
	return string(output)
}

type jsonbOutputFrame struct {
	node  int
	child int
}

func copyjsonbOutputFrame(value jsonbOutputFrame) jsonbOutputFrame {
	return jsonbOutputFrame{node: langruntime.CheckedIndex(value.node), child: langruntime.CheckedIndex(value.child)}
}
func jsonbRender(input JsonbValue, requireOrder bool, pretty bool) TextValue {
	input = CopyJsonbValue(input)
	if input.Kind == JsonbValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input.Kind == JsonbValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		output := langruntime.NewTextBuffer("")
		frames := []jsonbOutputFrame{}
		depth := 0
		current := value.Root
		visiting := true
		for visiting || depth > 0 {
			if visiting {
				node := value.Nodes[current]
				if node.Kind == 0 {
					output = append(output, "null"...)
				} else if node.Kind == 1 {
					output = append(output, "false"...)
				} else if node.Kind == 2 {
					output = append(output, "true"...)
				} else if node.Kind == 3 {
					position := node.TextStart
					for position < node.TextEnd {
						output = append(output, string(langruntime.CheckedChar(value.Characters[position]))...)
						position = langruntime.CheckedAdd(position, 1)
					}
				} else if node.Kind == 4 {
					quoted := jsonbQuote(&value, node.TextStart, node.TextEnd)
					output = append(output, quoted...)
				} else {
					if node.Kind == 6 && requireOrder {
						member := node.Child
						nonempty := 0
						unicode := false
						for member > 0 {
							entry := value.Nodes[member]
							if entry.KeyEnd > entry.KeyStart {
								nonempty = langruntime.CheckedAdd(nonempty, 1)
							}
							position := entry.KeyStart
							for position < entry.KeyEnd {
								if int(langruntime.CheckedChar(value.Characters[position])) > 127 {
									unicode = true
								}
								position = langruntime.CheckedAdd(position, 1)
							}
							member = langruntime.CheckedIndex(entry.Next)
						}
						if unicode && nonempty > 1 {
							return TextValue{Kind: TextValueUnknown}
						}
					}
					if node.Kind == 5 {
						output = append(output, string(langruntime.CheckedChar('['))...)
					} else {
						output = append(output, string(langruntime.CheckedChar('{'))...)
					}
					frame := jsonbOutputFrame{node: current, child: node.Child}
					if depth < len(frames) {
						frames[depth] = copyjsonbOutputFrame(frame)
					} else {
						langruntime.CheckedAdd(len(frames), 1)
						frames = append(frames, copyjsonbOutputFrame(frame))
					}
					depth = langruntime.CheckedAdd(depth, 1)
				}
				visiting = false
			} else {
				frame := frames[langruntime.CheckedSubtract(depth, 1)]
				node := value.Nodes[frame.node]
				if frame.child == 0 {
					if pretty {
						output = append(output, string(langruntime.CheckedChar('\n'))...)
						level := 0
						for langruntime.CheckedAdd(level, 1) < depth {
							output = append(output, "    "...)
							level = langruntime.CheckedAdd(level, 1)
						}
					}
					if node.Kind == 5 {
						output = append(output, string(langruntime.CheckedChar(']'))...)
					} else {
						output = append(output, string(langruntime.CheckedChar('}'))...)
					}
					depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
				} else {
					child := value.Nodes[frame.child]
					if frame.child != node.Child {
						if pretty {
							output = append(output, string(langruntime.CheckedChar(','))...)
						} else {
							output = append(output, ", "...)
						}
					}
					if pretty {
						output = append(output, string(langruntime.CheckedChar('\n'))...)
						level := 0
						for level < depth {
							output = append(output, "    "...)
							level = langruntime.CheckedAdd(level, 1)
						}
					}
					if node.Kind == 6 {
						key := jsonbQuote(&value, child.KeyStart, child.KeyEnd)
						output = append(output, key...)
						output = append(output, ": "...)
					}
					frames[langruntime.CheckedSubtract(depth, 1)] = copyjsonbOutputFrame(jsonbOutputFrame{node: frame.node, child: child.Next})
					current = langruntime.CheckedIndex(frame.child)
					visiting = true
				}
			}
		}
		return TextValue{Kind: TextValueValue, Value: string(output)}
	}
	return TextValue{Kind: TextValueUnknown}
}
func JsonbToPrettyText(input JsonbValue) TextValue {
	input = CopyJsonbValue(input)
	return jsonbRender(input, true, true)
}
func JsonbToText(input JsonbValue) TextValue {
	input = CopyJsonbValue(input)
	return jsonbRender(input, true, false)
}

type jsonbInputVisit struct {
	node   int
	parent int
}

func copyjsonbInputVisit(value jsonbInputVisit) jsonbInputVisit {
	return jsonbInputVisit{node: langruntime.CheckedIndex(value.node), parent: langruntime.CheckedI32(value.parent)}
}
func jsonbInputSpan(source *JsonbPayload, begin int, end int) bool {
	begin = langruntime.CheckedIndex(begin)
	end = langruntime.CheckedIndex(end)
	if end < begin || end > len(source.Characters) {
		return false
	}
	position := begin
	for position < end {
		if source.Characters[position] == '\x00' {
			return false
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return true
}
func jsonbInputValid(source *JsonbPayload) bool {
	seen := []int{}
	index := 0
	for index < len(source.Nodes) {
		langruntime.CheckedAdd(len(seen), 1)
		seen = append(seen, langruntime.CheckedIndex(0))
		index = langruntime.CheckedAdd(index, 1)
	}
	pending := []jsonbInputVisit{}
	langruntime.CheckedAdd(len(pending), 1)
	pending = append(pending, copyjsonbInputVisit(jsonbInputVisit{node: source.Root, parent: langruntime.CheckedSignedNegate(1)}))
	depth := 1
	for depth > 0 {
		depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
		visit := pending[depth]
		if visit.node == 0 || visit.node >= len(source.Nodes) {
			return false
		}
		if seen[visit.node] != 0 {
			return false
		}
		seen[visit.node] = langruntime.CheckedIndex(1)
		node := source.Nodes[visit.node]
		if node.Kind < 0 || node.Kind > 6 {
			return false
		}
		if jsonbInputSpan(source, node.TextStart, node.TextEnd) == false {
			return false
		}
		if visit.parent == 6 && jsonbInputSpan(source, node.KeyStart, node.KeyEnd) == false {
			return false
		}
		if node.Kind < 5 && node.Child != 0 {
			return false
		}
		if node.Kind == 3 {
			number := langruntime.NewTextBuffer("")
			position := node.TextStart
			for position < node.TextEnd {
				number = append(number, string(langruntime.CheckedChar(source.Characters[position]))...)
				position = langruntime.CheckedAdd(position, 1)
			}
			syntax := JsonSyntaxScan(string(number))
			if syntax.Valid == false || syntax.Kind != 3 {
				return false
			}
		}
		if visit.parent >= 0 && node.Next > 0 {
			sibling := jsonbInputVisit{node: node.Next, parent: visit.parent}
			if depth < len(pending) {
				pending[depth] = copyjsonbInputVisit(sibling)
			} else {
				langruntime.CheckedAdd(len(pending), 1)
				pending = append(pending, copyjsonbInputVisit(sibling))
			}
			depth = langruntime.CheckedAdd(depth, 1)
		}
		if node.Kind >= 5 && node.Child > 0 {
			child := jsonbInputVisit{node: node.Child, parent: node.Kind}
			if depth < len(pending) {
				pending[depth] = copyjsonbInputVisit(child)
			} else {
				langruntime.CheckedAdd(len(pending), 1)
				pending = append(pending, copyjsonbInputVisit(child))
			}
			depth = langruntime.CheckedAdd(depth, 1)
		}
	}
	return true
}
func JsonbFromText(input TextValue) JsonbValue {
	return jsonbParseText(input, true)
}
func JsonbFromTextContext(input TextValue, utf8 bool) JsonbValue {
	return jsonbParseTextContext(input, true, utf8)
}
func jsonbParseText(input TextValue, admission bool) JsonbValue {
	return jsonbParseTextContext(input, admission, false)
}
func JsonbToOrderedText(input JsonbValue) TextValue {
	input = CopyJsonbValue(input)
	return jsonbRender(input, false, false)
}
func JsonbToOrderedPrettyText(input JsonbValue) TextValue {
	input = CopyJsonbValue(input)
	return jsonbRender(input, false, true)
}
func jsonbPreorder(input JsonbPayload) JsonbPayload {
	input = CopyJsonbPayload(input)
	links := []int{}
	position := 0
	for position < len(input.Nodes) {
		langruntime.CheckedAdd(len(links), 1)
		links = append(links, langruntime.CheckedIndex(0))
		position = langruntime.CheckedAdd(position, 1)
	}
	nodes := []JsonbNode{}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, JsonbNode{Kind: langruntime.CheckedSignedNegate(1), Child: 0, Next: 0, KeyStart: 0, KeyEnd: 0, TextStart: 0, TextEnd: 0})
	pending := []jsonbInputVisit{}
	langruntime.CheckedAdd(len(pending), 1)
	pending = append(pending, copyjsonbInputVisit(jsonbInputVisit{node: input.Root, parent: langruntime.CheckedSignedNegate(1)}))
	depth := 1
	for depth > 0 {
		depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
		visit := pending[depth]
		node := input.Nodes[visit.node]
		if visit.parent < 0 {
			node = jsonbNodeLink(node, 0)
		}
		links[visit.node] = langruntime.CheckedIndex(len(nodes))
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, node)
		if node.Next > 0 {
			sibling := jsonbInputVisit{node: node.Next, parent: visit.parent}
			if depth == len(pending) {
				langruntime.CheckedAdd(len(pending), 1)
				pending = append(pending, copyjsonbInputVisit(sibling))
			} else {
				pending[depth] = copyjsonbInputVisit(sibling)
			}
			depth = langruntime.CheckedAdd(depth, 1)
		}
		if node.Child > 0 {
			child := jsonbInputVisit{node: node.Child, parent: node.Kind}
			if depth == len(pending) {
				langruntime.CheckedAdd(len(pending), 1)
				pending = append(pending, copyjsonbInputVisit(child))
			} else {
				pending[depth] = copyjsonbInputVisit(child)
			}
			depth = langruntime.CheckedAdd(depth, 1)
		}
	}
	position = langruntime.CheckedIndex(1)
	for position < len(nodes) {
		node := nodes[position]
		nodes[position] = JsonbNode{Kind: node.Kind, Child: links[node.Child], Next: links[node.Next], KeyStart: node.KeyStart, KeyEnd: node.KeyEnd, TextStart: node.TextStart, TextEnd: node.TextEnd}
		position = langruntime.CheckedAdd(position, 1)
	}
	return JsonbPayload{Characters: input.Characters, Nodes: nodes, Root: 1}
}
func JsonbRebuild(input JsonbValue, admission bool) JsonbValue {
	input = CopyJsonbValue(input)
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		normalized := jsonbNormalizeObjects(jsonbPreorder(value))
		if admission {
			admitted := JsonbStorageAdmission(&normalized)
			if admitted.Kind == BoolValueError {
				error := admitted.Error
				return JsonbValue{Kind: JsonbValueError, Error: error}
			}
			if admitted.Kind == BoolValueUnknown {
				return JsonbValue{Kind: JsonbValueUnknown}
			}
		}
		return JsonbValue{Kind: JsonbValueValue, Value: normalized}
	}
	return input
}
func JsonbFromString(input TextValue) JsonbValue {
	if input.Kind == TextValueError {
		error := input.Error
		return JsonbValue{Kind: JsonbValueError, Error: error}
	}
	if input.Kind == TextValueNull {
		return JsonbValue{Kind: JsonbValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		characters := []rune(value)
		position := 0
		for position < len(characters) {
			if characters[position] == '\x00' {
				return JsonbValue{Kind: JsonbValueUnknown}
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		nodes := []JsonbNode{}
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, JsonbNode{Kind: langruntime.CheckedSignedNegate(1), Child: 0, Next: 0, KeyStart: 0, KeyEnd: 0, TextStart: 0, TextEnd: 0})
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, JsonbNode{Kind: 4, Child: 0, Next: 0, KeyStart: 0, KeyEnd: 0, TextStart: 0, TextEnd: len(characters)})
		result := JsonbValue{Kind: JsonbValueValue, Value: JsonbPayload{Characters: characters, Nodes: nodes, Root: 1}}
		return JsonbRebuild(result, true)
	}
	return JsonbValue{Kind: JsonbValueUnknown}
}

type JsonbArrayInputPayload struct {
	State      int
	Error      SqlError
	Dimensions []ArrayDimension
	Elements   []ArrayElement
	Values     []JsonbInput
	Position   int
}

func CopyJsonbArrayInputPayload(value JsonbArrayInputPayload) JsonbArrayInputPayload {
	return JsonbArrayInputPayload{State: langruntime.CheckedI32(value.State), Error: value.Error, Dimensions: langruntime.CheckedStructs(value.Dimensions, copyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement), Values: langruntime.CheckedStructs(value.Values, CopyJsonbInput), Position: langruntime.CheckedIndex(value.Position)}
}

type JsonbArrayInputPlanKind uint8

const (
	JsonbArrayInputPlanValue JsonbArrayInputPlanKind = iota
)

type JsonbArrayInputPlan struct {
	Kind  JsonbArrayInputPlanKind
	Value JsonbArrayInputPayload
}

func CopyJsonbArrayInputPlan(value JsonbArrayInputPlan) JsonbArrayInputPlan {
	switch value.Kind {
	case JsonbArrayInputPlanValue:
		return JsonbArrayInputPlan{Kind: JsonbArrayInputPlanValue, Value: CopyJsonbArrayInputPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func PrepareJsonbArrayInput(input ArrayValue) JsonbArrayInputPayload {
	prepared := PrepareArrayOutput(input)
	values := []JsonbInput{}
	return JsonbArrayInputPayload{State: prepared.State, Error: prepared.Error, Dimensions: prepared.Dimensions, Elements: prepared.Elements, Values: values, Position: 0}
}
func JsonbArrayInputContinues(input *JsonbArrayInputPayload) bool {
	return input.State == 1 && input.Position < len(input.Elements)
}
func JsonbArrayInputIsKey(input *JsonbArrayInputPayload) bool {
	return langruntime.CheckedSignedRemainder((int(int32(input.Position))), 2) == 0
}
func JsonbArrayInputElement(input *JsonbArrayInputPayload) ArrayElement {
	if input.Position < len(input.Elements) {
		return CopyArrayElement(input.Elements[input.Position])
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func AppendJsonbArrayInput(input JsonbArrayInputPayload, value JsonbInput) JsonbArrayInputPayload {
	values := input.Values
	langruntime.CheckedAdd(len(values), 1)
	values = append(values, CopyJsonbInput(value))
	return JsonbArrayInputPayload{State: input.State, Error: input.Error, Dimensions: input.Dimensions, Elements: input.Elements, Values: values, Position: langruntime.CheckedAdd(input.Position, 1)}
}
func JsonbArrayInputArguments(input JsonbArrayInputPayload) JsonbArguments {
	if input.State == langruntime.CheckedSignedNegate(2) {
		return JsonbArguments{Kind: JsonbArgumentsError, Error: input.Error}
	}
	if input.State == 0 {
		return JsonbArguments{Kind: JsonbArgumentsNull}
	}
	if input.State != 1 || len(input.Values) != len(input.Elements) {
		return JsonbArguments{Kind: JsonbArgumentsUnknown}
	}
	return JsonbArguments{Kind: JsonbArgumentsValues, Values: JsonbArgumentPayload{Values: input.Values}}
}
func JsonbArrayFloat4Input(input Float4Value, key bool) JsonbInput {
	if key {
		return JsonbKeyInputFromFloat4(input)
	}
	return JsonbInputFromFloat4(input)
}
func JsonbArrayFloat8Input(input Float8Value, key bool) JsonbInput {
	if key {
		return JsonbKeyInputFromFloat8(input)
	}
	return JsonbInputFromFloat8(input)
}

type jsonbStorageSize struct {
	low       int64
	high      int64
	reachable bool
}

func copyjsonbStorageSize(value jsonbStorageSize) jsonbStorageSize {
	return jsonbStorageSize{low: value.low, high: value.high, reachable: value.reachable}
}

const jsonbStorageLimit = int64(268435455)
const jsonbStorageError = 8584704

func jsonbStorageBounds(low int64, high int64) jsonbStorageSize {
	ceiling := langruntime.CheckedI64Add(jsonbStorageLimit, int64(4))
	a := low
	b := high
	if a > ceiling {
		a = ceiling
	}
	if b > ceiling {
		b = ceiling
	}
	return jsonbStorageSize{low: a, high: b, reachable: true}
}
func jsonbStorageDecision(size jsonbStorageSize) BoolValue {
	size = copyjsonbStorageSize(size)
	if size.low > jsonbStorageLimit {
		return BoolValue{Kind: BoolValueError, Error: MakeSqlError(jsonbStorageError)}
	}
	if size.high > jsonbStorageLimit {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueValue, Value: true}
}
func jsonbStorageAligned(value int64) int64 {
	return langruntime.CheckedI64Multiply((langruntime.CheckedI64Divide((langruntime.CheckedI64Add(value, int64(3))), int64(4))), int64(4))
}
func jsonbStorageAppend(current jsonbStorageSize, child jsonbStorageSize, align bool, ordered bool) jsonbStorageSize {
	current = copyjsonbStorageSize(current)
	child = copyjsonbStorageSize(child)
	if align {
		if ordered {
			return jsonbStorageBounds(langruntime.CheckedI64Add(jsonbStorageAligned(current.low), child.low), langruntime.CheckedI64Add(jsonbStorageAligned(current.high), child.high))
		}
		return jsonbStorageBounds(langruntime.CheckedI64Add(current.low, child.low), langruntime.CheckedI64Add(langruntime.CheckedI64Add(current.high, child.high), int64(3)))
	}
	return jsonbStorageBounds(langruntime.CheckedI64Add(current.low, child.low), langruntime.CheckedI64Add(current.high, child.high))
}
func jsonbStoragePadding(current jsonbStorageSize, ordered bool) jsonbStorageSize {
	current = copyjsonbStorageSize(current)
	if ordered && current.low == current.high {
		padding := langruntime.CheckedI64Subtract(jsonbStorageAligned(current.low), current.low)
		return jsonbStorageBounds(padding, padding)
	}
	return jsonbStorageBounds(int64(0), int64(3))
}

type jsonbStorageCharacters struct {
	nonAscii  []int
	utf8Extra []int
}

func copyjsonbStorageCharacters(value jsonbStorageCharacters) jsonbStorageCharacters {
	return jsonbStorageCharacters{nonAscii: langruntime.CheckedIndices(value.nonAscii), utf8Extra: langruntime.CheckedIndices(value.utf8Extra)}
}
func jsonbStorageUnicodeBefore(source *jsonbStorageCharacters, end int) int {
	end = langruntime.CheckedIndex(end)
	low := 0
	high := len(source.nonAscii)
	for low < high {
		distance := int(int32((langruntime.CheckedSubtract(high, low))))
		middle := langruntime.CheckedAdd(low, langruntime.IndexFromI32(langruntime.CheckedSignedDivide(distance, 2), 0))
		if source.nonAscii[middle] < end {
			low = langruntime.CheckedIndex(langruntime.CheckedAdd(middle, 1))
		} else {
			high = langruntime.CheckedIndex(middle)
		}
	}
	return low
}
func jsonbStorageSpan(source *jsonbStorageCharacters, begin int, end int, utf8 bool) jsonbStorageSize {
	begin = langruntime.CheckedIndex(begin)
	end = langruntime.CheckedIndex(end)
	length := int(int32((langruntime.CheckedSubtract(end, begin))))
	first := jsonbStorageUnicodeBefore(source, begin)
	last := jsonbStorageUnicodeBefore(source, end)
	unicode := int(int32((langruntime.CheckedSubtract(last, first))))
	low := int64(langruntime.CheckedI32(length))
	if utf8 {
		extra := langruntime.CheckedSubtract(source.utf8Extra[last], source.utf8Extra[first])
		bytes := langruntime.CheckedI64Add(low, int64(langruntime.CheckedI32((int(int32(extra))))))
		return jsonbStorageBounds(bytes, bytes)
	}
	return jsonbStorageBounds(low, langruntime.CheckedI64Add(low, langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(unicode))), int64(3))))
}
func jsonbStorageGroup(weight int) int {
	weight = langruntime.CheckedI32(weight)
	group := langruntime.CheckedSignedDivide(weight, 4)
	if weight < 0 && langruntime.CheckedSignedRemainder(weight, 4) != 0 {
		group = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(group, 1))
	}
	return group
}
func jsonbStorageNumeric(source *JsonbPayload, node JsonbNode) jsonbStorageSize {
	number := langruntime.NewTextBuffer("")
	position := node.TextStart
	fractional := false
	scale := 0
	for position < node.TextEnd {
		character := source.Characters[position]
		number = append(number, string(langruntime.CheckedChar(character))...)
		if fractional {
			scale = langruntime.CheckedI32(langruntime.CheckedSignedAdd(scale, 1))
		}
		if character == '.' {
			fractional = true
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	layout := NumericParts(string(number))
	first := 0
	groups := 0
	if layout.Sign != 0 {
		first = langruntime.CheckedI32(jsonbStorageGroup(layout.Weight))
		significant := 0
		position = langruntime.CheckedIndex(layout.First)
		for position < layout.End {
			if source.Characters[langruntime.CheckedAdd(node.TextStart, position)] != '.' {
				significant = langruntime.CheckedI32(langruntime.CheckedSignedAdd(significant, 1))
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		last := jsonbStorageGroup(langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(layout.Weight, significant), 1))
		groups = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(first, last), 1))
	}
	header := int64(8)
	if scale <= 63 && first >= langruntime.CheckedSignedNegate(64) && first <= 63 {
		header = int64(6)
	}
	size := langruntime.CheckedI64Add(header, langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(groups))), int64(2)))
	return jsonbStorageBounds(size, size)
}
func jsonbStorageCharacterIndex(source *JsonbPayload) jsonbStorageCharacters {
	nonAscii := []int{}
	utf8Extra := []int{}
	totalExtra := 0
	langruntime.CheckedAdd(len(utf8Extra), 1)
	utf8Extra = append(utf8Extra, langruntime.CheckedIndex(0))
	position := 0
	for position < len(source.Characters) {
		if int(langruntime.CheckedChar(source.Characters[position])) > 127 {
			langruntime.CheckedAdd(len(nonAscii), 1)
			nonAscii = append(nonAscii, langruntime.CheckedIndex(position))
			character := int(langruntime.CheckedChar(source.Characters[position]))
			totalExtra = langruntime.CheckedAdd(totalExtra, 1)
			if character >= 2048 {
				totalExtra = langruntime.CheckedAdd(totalExtra, 1)
			}
			if character >= 65536 {
				totalExtra = langruntime.CheckedAdd(totalExtra, 1)
			}
			langruntime.CheckedAdd(len(utf8Extra), 1)
			utf8Extra = append(utf8Extra, langruntime.CheckedIndex(totalExtra))
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return jsonbStorageCharacters{nonAscii: nonAscii, utf8Extra: utf8Extra}
}
func jsonbStorageExtents(source *JsonbPayload, characters *jsonbStorageCharacters, utf8 bool) []jsonbStorageSize {
	sizes := []jsonbStorageSize{}
	index := 0
	for index < len(source.Nodes) {
		langruntime.CheckedAdd(len(sizes), 1)
		sizes = append(sizes, copyjsonbStorageSize(jsonbStorageSize{low: int64(0), high: int64(0), reachable: false}))
		index = langruntime.CheckedAdd(index, 1)
	}
	sizes[source.Root] = copyjsonbStorageSize(jsonbStorageBounds(int64(0), int64(0)))
	index = langruntime.CheckedIndex(1)
	for index < len(source.Nodes) {
		if sizes[index].reachable {
			child := source.Nodes[index].Child
			for child > 0 {
				sizes[child] = copyjsonbStorageSize(jsonbStorageBounds(int64(0), int64(0)))
				child = langruntime.CheckedIndex(source.Nodes[child].Next)
			}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	uncertain := false
	index = langruntime.CheckedIndex(len(source.Nodes))
	for index > 1 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		if sizes[index].reachable {
			node := source.Nodes[index]
			size := jsonbStorageBounds(int64(0), int64(0))
			if node.Kind == 3 {
				if node.TextStart == node.TextEnd {
					size = copyjsonbStorageSize(jsonbStorageBounds(int64(6), int64(16)))
				} else {
					size = copyjsonbStorageSize(jsonbStorageNumeric(source, node))
				}
			} else if node.Kind == 4 {
				size = copyjsonbStorageSize(jsonbStorageSpan(characters, node.TextStart, node.TextEnd, utf8))
			} else if node.Kind >= 5 {
				count := int64(0)
				keys := jsonbStorageBounds(int64(0), int64(0))
				nonempty := 0
				unicode := false
				child := node.Child
				for child > 0 {
					count = langruntime.CheckedI64Add(count, int64(1))
					if node.Kind == 6 {
						entry := source.Nodes[child]
						key := jsonbStorageSpan(characters, entry.KeyStart, entry.KeyEnd, utf8)
						if key.high != key.low {
							unicode = true
						}
						if entry.KeyEnd > entry.KeyStart {
							nonempty = langruntime.CheckedAdd(nonempty, 1)
						}
						keys = copyjsonbStorageSize(jsonbStorageAppend(keys, key, false, true))
					}
					child = langruntime.CheckedIndex(source.Nodes[child].Next)
				}
				ordered := utf8 || unicode == false || nonempty <= 1
				entries := int64(4)
				if node.Kind == 6 {
					entries = int64(8)
				}
				header := langruntime.CheckedI64Add(int64(4), langruntime.CheckedI64Multiply(count, entries))
				size = copyjsonbStorageSize(jsonbStorageAppend(jsonbStorageBounds(header, header), keys, false, true))
				child = langruntime.CheckedIndex(node.Child)
				for child > 0 {
					entry := source.Nodes[child]
					childSize := sizes[child]
					align := entry.Kind == 3 || entry.Kind >= 5
					if entry.Kind >= 5 {
						padding := jsonbStoragePadding(size, ordered)
						total := jsonbStorageBounds(langruntime.CheckedI64Add(childSize.low, padding.low), langruntime.CheckedI64Add(childSize.high, padding.high))
						decision := jsonbStorageDecision(total)
						if decision.Kind == BoolValueError {
							sizes[source.Root] = copyjsonbStorageSize(jsonbStorageBounds(langruntime.CheckedI64Add(jsonbStorageLimit, int64(1)), langruntime.CheckedI64Add(jsonbStorageLimit, int64(1))))
							return sizes
						}
						if decision.Kind == BoolValueUnknown {
							uncertain = true
						}
					}
					size = copyjsonbStorageSize(jsonbStorageAppend(size, childSize, align, ordered))
					child = langruntime.CheckedIndex(entry.Next)
				}
				decision := jsonbStorageDecision(size)
				if decision.Kind == BoolValueError {
					sizes[source.Root] = copyjsonbStorageSize(jsonbStorageBounds(langruntime.CheckedI64Add(jsonbStorageLimit, int64(1)), langruntime.CheckedI64Add(jsonbStorageLimit, int64(1))))
					return sizes
				}
				if decision.Kind == BoolValueUnknown {
					uncertain = true
				}
			}
			sizes[index] = copyjsonbStorageSize(size)
		}
	}
	root := sizes[source.Root]
	if source.Nodes[source.Root].Kind < 5 {
		root = copyjsonbStorageSize(jsonbStorageAppend(jsonbStorageBounds(int64(8), int64(8)), root, false, true))
	}
	if uncertain && root.high <= jsonbStorageLimit {
		root = copyjsonbStorageSize(jsonbStorageBounds(root.low, langruntime.CheckedI64Add(jsonbStorageLimit, int64(1))))
	}
	sizes[source.Root] = copyjsonbStorageSize(root)
	return sizes
}
func jsonbStorageLayout(source *JsonbPayload) jsonbStorageSize {
	characters := jsonbStorageCharacterIndex(source)
	sizes := jsonbStorageExtents(source, &characters, false)
	return sizes[source.Root]
}
func JsonbOrderedObjectOffsets(source *JsonbPayload, utf8 bool) []NumericValue {
	source = langruntime.CheckedBorrowed(source, CopyJsonbPayload)
	characters := jsonbStorageCharacterIndex(source)
	sizes := jsonbStorageExtents(source, &characters, utf8)
	offsets := []jsonbStorageSize{}
	result := []NumericValue{}
	index := 0
	for index < len(source.Nodes) {
		langruntime.CheckedAdd(len(offsets), 1)
		offsets = append(offsets, copyjsonbStorageSize(jsonbStorageSize{low: int64(0), high: int64(0), reachable: false}))
		langruntime.CheckedAdd(len(result), 1)
		result = append(result, NumericValue{Kind: NumericValueUnknown})
		index = langruntime.CheckedAdd(index, 1)
	}
	offsets[source.Root] = copyjsonbStorageSize(jsonbStorageBounds(int64(0), int64(0)))
	index = langruntime.CheckedIndex(1)
	for index < len(source.Nodes) {
		node := source.Nodes[index]
		offset := offsets[index]
		if offset.reachable {
			if node.Kind == 6 && offset.low == offset.high {
				result[index] = NumericValue{Kind: NumericValueValue, Value: TextSignedNumber(offset.low)}
			}
			if node.Kind >= 5 {
				header := int64(4)
				keys := jsonbStorageBounds(int64(0), int64(0))
				nonempty := 0
				unicode := false
				child := node.Child
				for child > 0 {
					header = langruntime.CheckedI64Add(header, int64(4))
					if node.Kind == 6 {
						header = langruntime.CheckedI64Add(header, int64(4))
						entry := source.Nodes[child]
						if entry.KeyEnd > entry.KeyStart {
							nonempty = langruntime.CheckedAdd(nonempty, 1)
						}
						key := jsonbStorageSpan(&characters, entry.KeyStart, entry.KeyEnd, utf8)
						if key.high != key.low {
							unicode = true
						}
						keys = copyjsonbStorageSize(jsonbStorageAppend(keys, key, false, true))
					}
					child = langruntime.CheckedIndex(source.Nodes[child].Next)
				}
				ordered := utf8 || unicode == false || nonempty <= 1
				current := jsonbStorageBounds(langruntime.CheckedI64Add(header, keys.low), langruntime.CheckedI64Add(header, keys.high))
				child = langruntime.CheckedIndex(node.Child)
				for child > 0 {
					entry := source.Nodes[child]
					aligned := entry.Kind == 3 || entry.Kind >= 5
					begin := current
					if aligned {
						if ordered {
							begin = copyjsonbStorageSize(jsonbStorageBounds(jsonbStorageAligned(current.low), jsonbStorageAligned(current.high)))
						} else {
							begin = copyjsonbStorageSize(jsonbStorageBounds(current.low, langruntime.CheckedI64Add(current.high, int64(3))))
						}
					}
					if ordered {
						offsets[child] = copyjsonbStorageSize(jsonbStorageBounds(langruntime.CheckedI64Add(offset.low, begin.low), langruntime.CheckedI64Add(offset.high, begin.high)))
					} else {
						offsets[child] = copyjsonbStorageSize(jsonbStorageBounds(langruntime.CheckedI64Add(langruntime.CheckedI64Add(offset.low, header), keys.low), langruntime.CheckedI64Add(offset.high, sizes[index].high)))
					}
					current = copyjsonbStorageSize(jsonbStorageAppend(current, sizes[child], aligned, ordered))
					child = langruntime.CheckedIndex(entry.Next)
				}
			}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return result
}
func JsonbStorageAdmission(source *JsonbPayload) BoolValue {
	source = langruntime.CheckedBorrowed(source, CopyJsonbPayload)
	return jsonbStorageDecision(jsonbStorageLayout(source))
}

const JsonpathNodeRoot = 1
const JsonpathNodeCurrent = 2
const JsonpathNodeLast = 3
const JsonpathNodeString = 4
const JsonpathNodeNumber = 5
const JsonpathNodeVariable = 6
const JsonpathNodeNull = 7
const JsonpathNodeTrue = 8
const JsonpathNodeFalse = 9
const JsonpathNodeKey = 10
const JsonpathNodeAnyKey = 11
const JsonpathNodeAnyArray = 12
const JsonpathNodeIndex = 13
const JsonpathNodeSubscript = 14
const JsonpathNodeDescendant = 15
const JsonpathNodeFilter = 16
const JsonpathNodeExists = 17
const JsonpathNodeNot = 18
const JsonpathNodeIsUnknown = 19
const JsonpathNodePlus = 20
const JsonpathNodeMinus = 21
const JsonpathNodeAdd = 22
const JsonpathNodeSub = 23
const JsonpathNodeMul = 24
const JsonpathNodeDiv = 25
const JsonpathNodeMod = 26
const JsonpathNodeEq = 27
const JsonpathNodeNe = 28
const JsonpathNodeLt = 29
const JsonpathNodeLe = 30
const JsonpathNodeGt = 31
const JsonpathNodeGe = 32
const JsonpathNodeAnd = 33
const JsonpathNodeOr = 34
const JsonpathNodeStarts = 35
const JsonpathNodeRegex = 36
const JsonpathNodeMethod = 100

type JsonpathNode struct {
	Kind      int
	Next      int
	Left      int
	Right     int
	TextStart int
	TextEnd   int
	First     int
	Last      int
	Flags     int
}

func copyJsonpathNode(value JsonpathNode) JsonpathNode {
	return JsonpathNode{Kind: langruntime.CheckedI32(value.Kind), Next: langruntime.CheckedIndex(value.Next), Left: langruntime.CheckedIndex(value.Left), Right: langruntime.CheckedIndex(value.Right), TextStart: langruntime.CheckedIndex(value.TextStart), TextEnd: langruntime.CheckedIndex(value.TextEnd), First: langruntime.CheckedI32(value.First), Last: langruntime.CheckedI32(value.Last), Flags: langruntime.CheckedI32(value.Flags)}
}

type JsonpathPayload struct {
	Characters []rune
	Nodes      []JsonpathNode
	Root       int
	Lax        bool
}

func CopyJsonpathPayload(value JsonpathPayload) JsonpathPayload {
	return JsonpathPayload{Characters: langruntime.CheckedChars(value.Characters), Nodes: langruntime.CheckedStructs(value.Nodes, copyJsonpathNode), Root: langruntime.CheckedIndex(value.Root), Lax: value.Lax}
}

type JsonpathValueKind uint8

const (
	JsonpathValueUnknown JsonpathValueKind = iota
	JsonpathValueNull
	JsonpathValueValue
	JsonpathValueStoredText
	JsonpathValueError
)

type JsonpathValue struct {
	Kind       JsonpathValueKind
	Value      JsonpathPayload
	StoredText string
	Error      SqlError
}

func CopyJsonpathValue(value JsonpathValue) JsonpathValue {
	switch value.Kind {
	case JsonpathValueUnknown:
		return JsonpathValue{Kind: JsonpathValueUnknown}
	case JsonpathValueNull:
		return JsonpathValue{Kind: JsonpathValueNull}
	case JsonpathValueValue:
		return JsonpathValue{Kind: JsonpathValueValue, Value: CopyJsonpathPayload(value.Value)}
	case JsonpathValueStoredText:
		return JsonpathValue{Kind: JsonpathValueStoredText, StoredText: langruntime.CheckedString(value.StoredText)}
	case JsonpathValueError:
		return JsonpathValue{Kind: JsonpathValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func jsonpathAccessorKind(kind int) bool {
	kind = langruntime.CheckedI32(kind)
	return (kind >= JsonpathNodeKey && kind <= JsonpathNodeIndex) || kind == JsonpathNodeDescendant || kind == JsonpathNodeFilter || kind >= JsonpathNodeMethod
}
func jsonpathMethodArity(kind int) int {
	kind = langruntime.CheckedI32(kind)
	if kind == 102 || kind == 108 || kind == 111 || kind == 114 || kind == 116 || kind == 123 || kind == 129 || kind == 115 || kind == 122 || kind == 104 || kind == 125 || kind == 118 || kind == 121 {
		return 0
	}
	if kind == 128 {
		return 1
	}
	if kind == 109 || kind == 126 || kind == 130 || kind == 132 {
		return 2
	}
	if kind == 124 {
		return 3
	}
	return langruntime.CheckedSignedNegate(1)
}
func jsonpathPayloadNodeValid(value *JsonpathPayload, index int) bool {
	index = langruntime.CheckedIndex(index)
	node := value.Nodes[index]
	if node.Next >= len(value.Nodes) || node.Left >= len(value.Nodes) || node.Right >= len(value.Nodes) || node.TextStart > node.TextEnd || node.TextEnd > len(value.Characters) {
		return false
	}
	kind := node.Kind
	if kind < JsonpathNodeRoot || (kind > JsonpathNodeRegex && kind < JsonpathNodeMethod) {
		return false
	}
	if kind == JsonpathNodeNumber {
		text := langruntime.NewTextBuffer("")
		position := node.TextStart
		negative := false
		if position < node.TextEnd && value.Characters[position] == '-' {
			negative = true
			text = append(text, string(langruntime.CheckedChar('-'))...)
			position = langruntime.CheckedAdd(position, 1)
		}
		begin := position
		point := false
		nonzero := false
		fraction := 0
		for position < node.TextEnd {
			character := value.Characters[position]
			if character == '.' {
				if point || position == begin || langruntime.CheckedAdd(position, 1) == node.TextEnd {
					return false
				}
				point = true
			} else if int(langruntime.CheckedChar(character)) >= 48 && int(langruntime.CheckedChar(character)) <= 57 {
				if character != '0' {
					nonzero = true
				}
				if point {
					fraction = langruntime.CheckedAdd(fraction, 1)
				}
				if position == begin && character == '0' && langruntime.CheckedAdd(position, 1) < node.TextEnd && value.Characters[langruntime.CheckedAdd(position, 1)] != '.' {
					return false
				}
			} else {
				return false
			}
			text = append(text, string(langruntime.CheckedChar(character))...)
			position = langruntime.CheckedAdd(position, 1)
		}
		if begin == node.TextEnd || (negative && nonzero == false) || fraction > 16383 {
			return false
		}
		parts := NumericParts(string(text))
		if parts.Valid == false || parts.Special != 1 || parts.Weight > 131072 {
			return false
		}
	}
	if kind == JsonpathNodeRegex {
		return node.Left > 0 && node.Right == 0 && node.Flags >= 0 && node.Flags <= 31 && (langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(node.Flags, 8)), 2) == 0 || node.Flags >= 16)
	}
	if kind >= JsonpathNodeMethod {
		arity := jsonpathMethodArity(kind)
		if arity < 0 {
			return false
		}
		if arity == 0 {
			return node.Left == 0 && node.Right == 0
		}
		if arity < 3 && node.Right != 0 {
			return false
		}
		if node.Left == 0 {
			return node.Right == 0
		}
		left := value.Nodes[node.Left]
		argumentKind := JsonpathNodeNumber
		if arity == 1 {
			argumentKind = langruntime.CheckedI32(JsonpathNodeString)
		}
		if left.Kind != argumentKind || left.Next != 0 {
			return false
		}
		if node.Right > 0 {
			right := value.Nodes[node.Right]
			if right.Kind != JsonpathNodeNumber || right.Next != 0 {
				return false
			}
		}
		return true
	}
	if kind >= JsonpathNodeAdd && kind <= JsonpathNodeStarts {
		return node.Left > 0 && node.Right > 0
	}
	if kind == JsonpathNodeSubscript {
		return node.Left > 0
	}
	if kind == JsonpathNodeIndex || (kind >= JsonpathNodeFilter && kind <= JsonpathNodeMinus) {
		if (kind == JsonpathNodePlus || kind == JsonpathNodeMinus) && node.Left > 0 {
			child := value.Nodes[node.Left]
			if child.Kind == JsonpathNodeNumber && child.Next == 0 {
				return false
			}
		}
		return node.Left > 0 && node.Right == 0
	}
	if kind == JsonpathNodeDescendant && (node.First < langruntime.CheckedSignedNegate(1) || node.Last < langruntime.CheckedSignedNegate(1)) {
		return false
	}
	return node.Left == 0 && node.Right == 0
}

type jsonpathBoundaryVisit struct {
	node      int
	filters   int
	subscript bool
	accessor  bool
	list      bool
}

func copyjsonpathBoundaryVisit(value jsonpathBoundaryVisit) jsonpathBoundaryVisit {
	return jsonpathBoundaryVisit{node: langruntime.CheckedIndex(value.node), filters: langruntime.CheckedIndex(value.filters), subscript: value.subscript, accessor: value.accessor, list: value.list}
}

type ArrayElementKind uint8

const (
	ArrayElementUnknown ArrayElementKind = iota
	ArrayElementNull
	ArrayElementError
	ArrayElementInt2
	ArrayElementInt4
	ArrayElementInt8
	ArrayElementTimestamp
	ArrayElementTimestamptz
	ArrayElementEnum
	ArrayElementDate
	ArrayElementText
	ArrayElementBool
	ArrayElementNumeric
	ArrayElementJson
	ArrayElementJsonb
	ArrayElementNetwork
	ArrayElementBit
	ArrayElementBytea
	ArrayElementMacaddr
	ArrayElementMacaddr8
	ArrayElementUuid
	ArrayElementFloat4
	ArrayElementFloat8
	ArrayElementTime
	ArrayElementTimetz
	ArrayElementInterval
	ArrayElementPoint
	ArrayElementLine
	ArrayElementLseg
	ArrayElementBox
	ArrayElementPath
	ArrayElementPolygon
	ArrayElementCircle
	ArrayElementMoney
	ArrayElementInternalChar
	ArrayElementOid
	ArrayElementXid
	ArrayElementCid
	ArrayElementSnapshot
	ArrayElementXid8
	ArrayElementPgLsn
	ArrayElementTid
	ArrayElementJsonpath
	ArrayElementJsonpathStoredText
	ArrayElementArray
	ArrayElementFloat4UnspecifiedNan
	ArrayElementFloat8UnspecifiedNan
	ArrayElementByteaUnspecified
	ArrayElementBoxNonNull
	ArrayElementRange
	ArrayElementMultirange
)

type ArrayElement struct {
	Kind               ArrayElementKind
	Error              SqlError
	Int2               int
	Int4               int
	Int8               int64
	Timestamp          int64
	Timestamptz        int64
	Enum               EnumPayload
	Date               int
	Text               string
	Bool               bool
	Numeric            string
	Json               JsonPayload
	Jsonb              JsonbPayload
	Network            NetworkAddress
	Bit                string
	Bytea              string
	Macaddr            MacAddress
	Macaddr8           MacAddress
	Uuid               Uuid
	Float4             int
	Float8             int64
	Time               int64
	Timetz             TimetzPayload
	Interval           IntervalPayload
	Point              PointPayload
	Line               LinePayload
	Lseg               LsegPayload
	Box                BoxPayload
	Path               PathPayload
	Polygon            PolygonPayload
	Circle             CirclePayload
	Money              int64
	InternalChar       int
	Oid                int64
	Xid                int64
	Cid                int64
	Snapshot           SnapshotPayload
	Xid8               int64
	PgLsn              int64
	Tid                int64
	Jsonpath           JsonpathPayload
	JsonpathStoredText string
	Array              ArrayPayload
	ByteaUnspecified   int
	Range              RangePayload
	Multirange         MultirangePayload
}

func CopyArrayElement(value ArrayElement) ArrayElement {
	switch value.Kind {
	case ArrayElementUnknown:
		return ArrayElement{Kind: ArrayElementUnknown}
	case ArrayElementNull:
		return ArrayElement{Kind: ArrayElementNull}
	case ArrayElementError:
		return ArrayElement{Kind: ArrayElementError, Error: value.Error}
	case ArrayElementInt2:
		return ArrayElement{Kind: ArrayElementInt2, Int2: langruntime.CheckedI32(value.Int2)}
	case ArrayElementInt4:
		return ArrayElement{Kind: ArrayElementInt4, Int4: langruntime.CheckedI32(value.Int4)}
	case ArrayElementInt8:
		return ArrayElement{Kind: ArrayElementInt8, Int8: value.Int8}
	case ArrayElementTimestamp:
		return ArrayElement{Kind: ArrayElementTimestamp, Timestamp: value.Timestamp}
	case ArrayElementTimestamptz:
		return ArrayElement{Kind: ArrayElementTimestamptz, Timestamptz: value.Timestamptz}
	case ArrayElementEnum:
		return ArrayElement{Kind: ArrayElementEnum, Enum: value.Enum}
	case ArrayElementDate:
		return ArrayElement{Kind: ArrayElementDate, Date: langruntime.CheckedI32(value.Date)}
	case ArrayElementText:
		return ArrayElement{Kind: ArrayElementText, Text: langruntime.CheckedString(value.Text)}
	case ArrayElementBool:
		return ArrayElement{Kind: ArrayElementBool, Bool: value.Bool}
	case ArrayElementNumeric:
		return ArrayElement{Kind: ArrayElementNumeric, Numeric: langruntime.CheckedString(value.Numeric)}
	case ArrayElementJson:
		return ArrayElement{Kind: ArrayElementJson, Json: value.Json}
	case ArrayElementJsonb:
		return ArrayElement{Kind: ArrayElementJsonb, Jsonb: CopyJsonbPayload(value.Jsonb)}
	case ArrayElementNetwork:
		return ArrayElement{Kind: ArrayElementNetwork, Network: value.Network}
	case ArrayElementBit:
		return ArrayElement{Kind: ArrayElementBit, Bit: langruntime.CheckedString(value.Bit)}
	case ArrayElementBytea:
		return ArrayElement{Kind: ArrayElementBytea, Bytea: langruntime.CheckedString(value.Bytea)}
	case ArrayElementMacaddr:
		return ArrayElement{Kind: ArrayElementMacaddr, Macaddr: value.Macaddr}
	case ArrayElementMacaddr8:
		return ArrayElement{Kind: ArrayElementMacaddr8, Macaddr8: value.Macaddr8}
	case ArrayElementUuid:
		return ArrayElement{Kind: ArrayElementUuid, Uuid: value.Uuid}
	case ArrayElementFloat4:
		return ArrayElement{Kind: ArrayElementFloat4, Float4: langruntime.CheckedI32(value.Float4)}
	case ArrayElementFloat8:
		return ArrayElement{Kind: ArrayElementFloat8, Float8: value.Float8}
	case ArrayElementTime:
		return ArrayElement{Kind: ArrayElementTime, Time: value.Time}
	case ArrayElementTimetz:
		return ArrayElement{Kind: ArrayElementTimetz, Timetz: value.Timetz}
	case ArrayElementInterval:
		return ArrayElement{Kind: ArrayElementInterval, Interval: value.Interval}
	case ArrayElementPoint:
		return ArrayElement{Kind: ArrayElementPoint, Point: value.Point}
	case ArrayElementLine:
		return ArrayElement{Kind: ArrayElementLine, Line: value.Line}
	case ArrayElementLseg:
		return ArrayElement{Kind: ArrayElementLseg, Lseg: value.Lseg}
	case ArrayElementBox:
		return ArrayElement{Kind: ArrayElementBox, Box: value.Box}
	case ArrayElementPath:
		return ArrayElement{Kind: ArrayElementPath, Path: CopyPathPayload(value.Path)}
	case ArrayElementPolygon:
		return ArrayElement{Kind: ArrayElementPolygon, Polygon: CopyPolygonPayload(value.Polygon)}
	case ArrayElementCircle:
		return ArrayElement{Kind: ArrayElementCircle, Circle: value.Circle}
	case ArrayElementMoney:
		return ArrayElement{Kind: ArrayElementMoney, Money: value.Money}
	case ArrayElementInternalChar:
		return ArrayElement{Kind: ArrayElementInternalChar, InternalChar: langruntime.CheckedI32(value.InternalChar)}
	case ArrayElementOid:
		return ArrayElement{Kind: ArrayElementOid, Oid: value.Oid}
	case ArrayElementXid:
		return ArrayElement{Kind: ArrayElementXid, Xid: value.Xid}
	case ArrayElementCid:
		return ArrayElement{Kind: ArrayElementCid, Cid: value.Cid}
	case ArrayElementSnapshot:
		return ArrayElement{Kind: ArrayElementSnapshot, Snapshot: CopySnapshotPayload(value.Snapshot)}
	case ArrayElementXid8:
		return ArrayElement{Kind: ArrayElementXid8, Xid8: value.Xid8}
	case ArrayElementPgLsn:
		return ArrayElement{Kind: ArrayElementPgLsn, PgLsn: value.PgLsn}
	case ArrayElementTid:
		return ArrayElement{Kind: ArrayElementTid, Tid: value.Tid}
	case ArrayElementJsonpath:
		return ArrayElement{Kind: ArrayElementJsonpath, Jsonpath: CopyJsonpathPayload(value.Jsonpath)}
	case ArrayElementJsonpathStoredText:
		return ArrayElement{Kind: ArrayElementJsonpathStoredText, JsonpathStoredText: langruntime.CheckedString(value.JsonpathStoredText)}
	case ArrayElementArray:
		return ArrayElement{Kind: ArrayElementArray, Array: CopyArrayPayload(value.Array)}
	case ArrayElementFloat4UnspecifiedNan:
		return ArrayElement{Kind: ArrayElementFloat4UnspecifiedNan}
	case ArrayElementFloat8UnspecifiedNan:
		return ArrayElement{Kind: ArrayElementFloat8UnspecifiedNan}
	case ArrayElementByteaUnspecified:
		return ArrayElement{Kind: ArrayElementByteaUnspecified, ByteaUnspecified: langruntime.CheckedI32(value.ByteaUnspecified)}
	case ArrayElementBoxNonNull:
		return ArrayElement{Kind: ArrayElementBoxNonNull}
	case ArrayElementRange:
		return ArrayElement{Kind: ArrayElementRange, Range: CopyRangePayload(value.Range)}
	case ArrayElementMultirange:
		return ArrayElement{Kind: ArrayElementMultirange, Multirange: CopyMultirangePayload(value.Multirange)}
	}
	panic("unknown enum variant")
}
func ArrayElementFamily(input ArrayElement) int {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementMultirange {
		return 43
	}
	if input.Kind == ArrayElementRange {
		return 42
	}
	if input.Kind == ArrayElementArray {
		return 41
	}
	if input.Kind == ArrayElementInt2 {
		return 1
	}
	if input.Kind == ArrayElementInt4 {
		return 2
	}
	if input.Kind == ArrayElementInt8 {
		return 3
	}
	if input.Kind == ArrayElementTimestamp {
		return 4
	}
	if input.Kind == ArrayElementTimestamptz {
		return 5
	}
	if input.Kind == ArrayElementEnum {
		return 6
	}
	if input.Kind == ArrayElementDate {
		return 7
	}
	if input.Kind == ArrayElementText {
		return 8
	}
	if input.Kind == ArrayElementBool {
		return 9
	}
	if input.Kind == ArrayElementNumeric {
		return 10
	}
	if input.Kind == ArrayElementJson {
		return 11
	}
	if input.Kind == ArrayElementJsonb {
		return 12
	}
	if input.Kind == ArrayElementNetwork {
		return 13
	}
	if input.Kind == ArrayElementBit {
		return 14
	}
	if input.Kind == ArrayElementBytea {
		return 15
	}
	if input.Kind == ArrayElementMacaddr {
		return 16
	}
	if input.Kind == ArrayElementMacaddr8 {
		return 17
	}
	if input.Kind == ArrayElementUuid {
		return 18
	}
	if input.Kind == ArrayElementFloat4 {
		return 19
	}
	if input.Kind == ArrayElementFloat8 {
		return 20
	}
	if input.Kind == ArrayElementTime {
		return 21
	}
	if input.Kind == ArrayElementTimetz {
		return 22
	}
	if input.Kind == ArrayElementInterval {
		return 23
	}
	if input.Kind == ArrayElementPoint {
		return 24
	}
	if input.Kind == ArrayElementLine {
		return 25
	}
	if input.Kind == ArrayElementLseg {
		return 26
	}
	if input.Kind == ArrayElementBox {
		return 27
	}
	if input.Kind == ArrayElementPath {
		return 28
	}
	if input.Kind == ArrayElementPolygon {
		return 29
	}
	if input.Kind == ArrayElementCircle {
		return 30
	}
	if input.Kind == ArrayElementMoney {
		return 31
	}
	if input.Kind == ArrayElementInternalChar {
		return 32
	}
	if input.Kind == ArrayElementOid {
		return 33
	}
	if input.Kind == ArrayElementXid {
		return 34
	}
	if input.Kind == ArrayElementCid {
		return 35
	}
	if input.Kind == ArrayElementSnapshot {
		return 36
	}
	if input.Kind == ArrayElementXid8 {
		return 37
	}
	if input.Kind == ArrayElementPgLsn {
		return 38
	}
	if input.Kind == ArrayElementTid {
		return 39
	}
	if input.Kind == ArrayElementJsonpathStoredText {
		return 40
	}
	if input.Kind == ArrayElementJsonpath {
		return 40
	}
	if input.Kind == ArrayElementFloat4UnspecifiedNan {
		return 19
	}
	if input.Kind == ArrayElementFloat8UnspecifiedNan {
		return 20
	}
	if input.Kind == ArrayElementByteaUnspecified {
		return 15
	}
	if input.Kind == ArrayElementBoxNonNull {
		return 27
	}
	return 0
}
func ArrayElementFromArray(input ArrayValue) ArrayElement {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		return ArrayElement{Kind: ArrayElementArray, Array: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToArray(input ArrayElement) ArrayValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if input.Kind == ArrayElementArray {
		value := CopyArrayPayload(input.Array)
		return ArrayValue{Kind: ArrayValueValue, Value: value}
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}
func ArrayElementFromInt2(input Int2Value) ArrayElement {
	if input.Kind == Int2ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Int2ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Int2ValueValue {
		value := langruntime.CheckedI32(input.Value)
		return ArrayElement{Kind: ArrayElementInt2, Int2: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToInt2(input ArrayElement) Int2Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Int2Value{Kind: Int2ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Int2Value{Kind: Int2ValueNull}
	}
	if input.Kind == ArrayElementInt2 {
		value := langruntime.CheckedI32(input.Int2)
		return Int2Value{Kind: Int2ValueValue, Value: value}
	}
	return Int2Value{Kind: Int2ValueUnknown}
}
func ArrayElementFromInt4(input Int4Value) ArrayElement {
	if input.Kind == Int4ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Int4ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		return ArrayElement{Kind: ArrayElementInt4, Int4: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToInt4(input ArrayElement) Int4Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Int4Value{Kind: Int4ValueNull}
	}
	if input.Kind == ArrayElementInt4 {
		value := langruntime.CheckedI32(input.Int4)
		return Int4Value{Kind: Int4ValueValue, Value: value}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func ArrayElementFromInt8(input Int8Value) ArrayElement {
	if input.Kind == Int8ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Int8ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Int8ValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementInt8, Int8: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToInt8(input ArrayElement) Int8Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Int8Value{Kind: Int8ValueNull}
	}
	if input.Kind == ArrayElementInt8 {
		value := input.Int8
		return Int8Value{Kind: Int8ValueValue, Value: value}
	}
	return Int8Value{Kind: Int8ValueUnknown}
}
func ArrayElementFromTimestamp(input TimestampValue) ArrayElement {
	if input.Kind == TimestampValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TimestampValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TimestampValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementTimestamp, Timestamp: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToTimestamp(input ArrayElement) TimestampValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return TimestampValue{Kind: TimestampValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TimestampValue{Kind: TimestampValueNull}
	}
	if input.Kind == ArrayElementTimestamp {
		value := input.Timestamp
		return TimestampValue{Kind: TimestampValueValue, Value: value}
	}
	return TimestampValue{Kind: TimestampValueUnknown}
}
func ArrayElementFromTimestamptz(input TimestamptzValue) ArrayElement {
	if input.Kind == TimestamptzValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TimestamptzValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TimestamptzValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementTimestamptz, Timestamptz: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToTimestamptz(input ArrayElement) TimestamptzValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return TimestamptzValue{Kind: TimestamptzValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TimestamptzValue{Kind: TimestamptzValueNull}
	}
	if input.Kind == ArrayElementTimestamptz {
		value := input.Timestamptz
		return TimestamptzValue{Kind: TimestamptzValueValue, Value: value}
	}
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
}
func ArrayElementFromEnum(input EnumValue) ArrayElement {
	if input.Kind == EnumValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == EnumValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == EnumValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementEnum, Enum: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToEnum(input ArrayElement) EnumValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return EnumValue{Kind: EnumValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return EnumValue{Kind: EnumValueNull}
	}
	if input.Kind == ArrayElementEnum {
		value := input.Enum
		return EnumValue{Kind: EnumValueValue, Value: value}
	}
	return EnumValue{Kind: EnumValueUnknown}
}
func ArrayElementFromDate(input DateValue) ArrayElement {
	if input.Kind == DateValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == DateValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == DateValueValue {
		value := langruntime.CheckedI32(input.Value)
		return ArrayElement{Kind: ArrayElementDate, Date: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToDate(input ArrayElement) DateValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return DateValue{Kind: DateValueNull}
	}
	if input.Kind == ArrayElementDate {
		value := langruntime.CheckedI32(input.Date)
		return DateValue{Kind: DateValueValue, Value: value}
	}
	return DateValue{Kind: DateValueUnknown}
}
func ArrayElementFromText(input TextValue) ArrayElement {
	if input.Kind == TextValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TextValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return ArrayElement{Kind: ArrayElementText, Text: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToText(input ArrayElement) TextValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == ArrayElementText {
		value := langruntime.CheckedString(input.Text)
		return TextValue{Kind: TextValueValue, Value: value}
	}
	return TextValue{Kind: TextValueUnknown}
}
func ArrayElementFromBool(input BoolValue) ArrayElement {
	if input.Kind == BoolValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == BoolValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == BoolValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementBool, Bool: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToBool(input ArrayElement) BoolValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return BoolValue{Kind: BoolValueNull}
	}
	if input.Kind == ArrayElementBool {
		value := input.Bool
		return BoolValue{Kind: BoolValueValue, Value: value}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func ArrayElementFromNumeric(input NumericValue) ArrayElement {
	if input.Kind == NumericValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == NumericValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		return ArrayElement{Kind: ArrayElementNumeric, Numeric: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToNumeric(input ArrayElement) NumericValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return NumericValue{Kind: NumericValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return NumericValue{Kind: NumericValueNull}
	}
	if input.Kind == ArrayElementNumeric {
		value := langruntime.CheckedString(input.Numeric)
		return NumericValue{Kind: NumericValueValue, Value: value}
	}
	return NumericValue{Kind: NumericValueUnknown}
}
func ArrayElementFromJson(input JsonValue) ArrayElement {
	if input.Kind == JsonValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == JsonValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementJson, Json: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToJson(input ArrayElement) JsonValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return JsonValue{Kind: JsonValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return JsonValue{Kind: JsonValueNull}
	}
	if input.Kind == ArrayElementJson {
		value := input.Json
		return JsonValue{Kind: JsonValueValue, Value: value}
	}
	return JsonValue{Kind: JsonValueUnknown}
}
func ArrayElementFromJsonb(input JsonbValue) ArrayElement {
	input = CopyJsonbValue(input)
	if input.Kind == JsonbValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == JsonbValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		return ArrayElement{Kind: ArrayElementJsonb, Jsonb: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToJsonb(input ArrayElement) JsonbValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return JsonbValue{Kind: JsonbValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return JsonbValue{Kind: JsonbValueNull}
	}
	if input.Kind == ArrayElementJsonb {
		value := CopyJsonbPayload(input.Jsonb)
		return JsonbValue{Kind: JsonbValueValue, Value: value}
	}
	return JsonbValue{Kind: JsonbValueUnknown}
}
func ArrayElementFromNetwork(input NetworkValue) ArrayElement {
	if input.Kind == NetworkValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == NetworkValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == NetworkValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementNetwork, Network: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToNetwork(input ArrayElement) NetworkValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return NetworkValue{Kind: NetworkValueNull}
	}
	if input.Kind == ArrayElementNetwork {
		value := input.Network
		return NetworkValue{Kind: NetworkValueValue, Value: value}
	}
	return NetworkValue{Kind: NetworkValueUnknown}
}
func ArrayElementFromBit(input BitValue) ArrayElement {
	if input.Kind == BitValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == BitValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == BitValueValue {
		value := langruntime.CheckedString(input.Value)
		return ArrayElement{Kind: ArrayElementBit, Bit: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToBit(input ArrayElement) BitValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return BitValue{Kind: BitValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return BitValue{Kind: BitValueNull}
	}
	if input.Kind == ArrayElementBit {
		value := langruntime.CheckedString(input.Bit)
		return BitValue{Kind: BitValueValue, Value: value}
	}
	return BitValue{Kind: BitValueUnknown}
}
func ArrayElementFromBytea(input ByteaValue) ArrayElement {
	if input.Kind == ByteaValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ByteaValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		return ArrayElement{Kind: ArrayElementBytea, Bytea: value}
	}
	if input.Kind == ByteaValueUnspecified {
		length := langruntime.CheckedI32(input.Unspecified)
		return ArrayElement{Kind: ArrayElementByteaUnspecified, ByteaUnspecified: length}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToBytea(input ArrayElement) ByteaValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return ByteaValue{Kind: ByteaValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return ByteaValue{Kind: ByteaValueNull}
	}
	if input.Kind == ArrayElementBytea {
		value := langruntime.CheckedString(input.Bytea)
		return ByteaValue{Kind: ByteaValueValue, Value: value}
	}
	if input.Kind == ArrayElementByteaUnspecified {
		length := langruntime.CheckedI32(input.ByteaUnspecified)
		return ByteaValue{Kind: ByteaValueUnspecified, Unspecified: length}
	}
	return ByteaValue{Kind: ByteaValueUnknown}
}
func ArrayElementFromMacaddr(input MacaddrValue) ArrayElement {
	if input.Kind == MacaddrValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == MacaddrValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == MacaddrValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementMacaddr, Macaddr: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToMacaddr(input ArrayElement) MacaddrValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return MacaddrValue{Kind: MacaddrValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return MacaddrValue{Kind: MacaddrValueNull}
	}
	if input.Kind == ArrayElementMacaddr {
		value := input.Macaddr
		return MacaddrValue{Kind: MacaddrValueValue, Value: value}
	}
	return MacaddrValue{Kind: MacaddrValueUnknown}
}
func ArrayElementFromMacaddr8(input Macaddr8Value) ArrayElement {
	if input.Kind == Macaddr8ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Macaddr8ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Macaddr8ValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementMacaddr8, Macaddr8: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToMacaddr8(input ArrayElement) Macaddr8Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Macaddr8Value{Kind: Macaddr8ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Macaddr8Value{Kind: Macaddr8ValueNull}
	}
	if input.Kind == ArrayElementMacaddr8 {
		value := input.Macaddr8
		return Macaddr8Value{Kind: Macaddr8ValueValue, Value: value}
	}
	return Macaddr8Value{Kind: Macaddr8ValueUnknown}
}
func ArrayElementFromUuid(input UuidValue) ArrayElement {
	if input.Kind == UuidValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == UuidValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == UuidValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementUuid, Uuid: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToUuid(input ArrayElement) UuidValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return UuidValue{Kind: UuidValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return UuidValue{Kind: UuidValueNull}
	}
	if input.Kind == ArrayElementUuid {
		value := input.Uuid
		return UuidValue{Kind: UuidValueValue, Value: value}
	}
	return UuidValue{Kind: UuidValueUnknown}
}
func ArrayElementFromFloat4(input Float4Value) ArrayElement {
	if input.Kind == Float4ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Float4ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Float4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		return ArrayElement{Kind: ArrayElementFloat4, Float4: value}
	}
	if input.Kind == Float4ValueUnspecifiedNan {
		return ArrayElement{Kind: ArrayElementFloat4UnspecifiedNan}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToFloat4(input ArrayElement) Float4Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Float4Value{Kind: Float4ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Float4Value{Kind: Float4ValueNull}
	}
	if input.Kind == ArrayElementFloat4 {
		value := langruntime.CheckedI32(input.Float4)
		return Float4Value{Kind: Float4ValueValue, Value: value}
	}
	if input.Kind == ArrayElementFloat4UnspecifiedNan {
		return Float4Value{Kind: Float4ValueUnspecifiedNan}
	}
	return Float4Value{Kind: Float4ValueUnknown}
}
func ArrayElementFromFloat8(input Float8Value) ArrayElement {
	if input.Kind == Float8ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Float8ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Float8ValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementFloat8, Float8: value}
	}
	if input.Kind == Float8ValueUnspecifiedNan {
		return ArrayElement{Kind: ArrayElementFloat8UnspecifiedNan}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToFloat8(input ArrayElement) Float8Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Float8Value{Kind: Float8ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Float8Value{Kind: Float8ValueNull}
	}
	if input.Kind == ArrayElementFloat8 {
		value := input.Float8
		return Float8Value{Kind: Float8ValueValue, Value: value}
	}
	if input.Kind == ArrayElementFloat8UnspecifiedNan {
		return Float8Value{Kind: Float8ValueUnspecifiedNan}
	}
	return Float8Value{Kind: Float8ValueUnknown}
}
func ArrayElementFromTime(input TimeValue) ArrayElement {
	if input.Kind == TimeValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TimeValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TimeValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementTime, Time: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToTime(input ArrayElement) TimeValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return TimeValue{Kind: TimeValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TimeValue{Kind: TimeValueNull}
	}
	if input.Kind == ArrayElementTime {
		value := input.Time
		return TimeValue{Kind: TimeValueValue, Value: value}
	}
	return TimeValue{Kind: TimeValueUnknown}
}
func ArrayElementFromTimetz(input TimetzValue) ArrayElement {
	if input.Kind == TimetzValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TimetzValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TimetzValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementTimetz, Timetz: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToTimetz(input ArrayElement) TimetzValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return TimetzValue{Kind: TimetzValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TimetzValue{Kind: TimetzValueNull}
	}
	if input.Kind == ArrayElementTimetz {
		value := input.Timetz
		return TimetzValue{Kind: TimetzValueValue, Value: value}
	}
	return TimetzValue{Kind: TimetzValueUnknown}
}
func ArrayElementFromInterval(input IntervalValue) ArrayElement {
	if input.Kind == IntervalValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == IntervalValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == IntervalValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementInterval, Interval: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToInterval(input ArrayElement) IntervalValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return IntervalValue{Kind: IntervalValueNull}
	}
	if input.Kind == ArrayElementInterval {
		value := input.Interval
		return IntervalValue{Kind: IntervalValueValue, Value: value}
	}
	return IntervalValue{Kind: IntervalValueUnknown}
}
func ArrayElementFromPoint(input PointValue) ArrayElement {
	if input.Kind == PointValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == PointValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == PointValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementPoint, Point: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToPoint(input ArrayElement) PointValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return PointValue{Kind: PointValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return PointValue{Kind: PointValueNull}
	}
	if input.Kind == ArrayElementPoint {
		value := input.Point
		return PointValue{Kind: PointValueValue, Value: value}
	}
	return PointValue{Kind: PointValueUnknown}
}
func ArrayElementFromLine(input LineValue) ArrayElement {
	if input.Kind == LineValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == LineValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == LineValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementLine, Line: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToLine(input ArrayElement) LineValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return LineValue{Kind: LineValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return LineValue{Kind: LineValueNull}
	}
	if input.Kind == ArrayElementLine {
		value := input.Line
		return LineValue{Kind: LineValueValue, Value: value}
	}
	return LineValue{Kind: LineValueUnknown}
}
func ArrayElementFromLseg(input LsegValue) ArrayElement {
	if input.Kind == LsegValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == LsegValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == LsegValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementLseg, Lseg: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToLseg(input ArrayElement) LsegValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return LsegValue{Kind: LsegValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return LsegValue{Kind: LsegValueNull}
	}
	if input.Kind == ArrayElementLseg {
		value := input.Lseg
		return LsegValue{Kind: LsegValueValue, Value: value}
	}
	return LsegValue{Kind: LsegValueUnknown}
}
func ArrayElementFromBox(input BoxValue) ArrayElement {
	if input.Kind == BoxValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == BoxValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == BoxValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementBox, Box: value}
	}
	if input.Kind == BoxValueNonNull {
		return ArrayElement{Kind: ArrayElementBoxNonNull}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToBox(input ArrayElement) BoxValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return BoxValue{Kind: BoxValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return BoxValue{Kind: BoxValueNull}
	}
	if input.Kind == ArrayElementBox {
		value := input.Box
		return BoxValue{Kind: BoxValueValue, Value: value}
	}
	if input.Kind == ArrayElementBoxNonNull {
		return BoxValue{Kind: BoxValueNonNull}
	}
	return BoxValue{Kind: BoxValueUnknown}
}
func ArrayElementFromPath(input PathValue) ArrayElement {
	input = CopyPathValue(input)
	if input.Kind == PathValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == PathValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == PathValueValue {
		value := CopyPathPayload(input.Value)
		return ArrayElement{Kind: ArrayElementPath, Path: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToPath(input ArrayElement) PathValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return PathValue{Kind: PathValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return PathValue{Kind: PathValueNull}
	}
	if input.Kind == ArrayElementPath {
		value := CopyPathPayload(input.Path)
		return PathValue{Kind: PathValueValue, Value: value}
	}
	return PathValue{Kind: PathValueUnknown}
}
func ArrayElementFromPolygon(input PolygonValue) ArrayElement {
	input = CopyPolygonValue(input)
	if input.Kind == PolygonValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == PolygonValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == PolygonValueValue {
		value := CopyPolygonPayload(input.Value)
		return ArrayElement{Kind: ArrayElementPolygon, Polygon: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToPolygon(input ArrayElement) PolygonValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return PolygonValue{Kind: PolygonValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return PolygonValue{Kind: PolygonValueNull}
	}
	if input.Kind == ArrayElementPolygon {
		value := CopyPolygonPayload(input.Polygon)
		return PolygonValue{Kind: PolygonValueValue, Value: value}
	}
	return PolygonValue{Kind: PolygonValueUnknown}
}
func ArrayElementFromCircle(input CircleValue) ArrayElement {
	if input.Kind == CircleValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == CircleValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == CircleValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementCircle, Circle: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToCircle(input ArrayElement) CircleValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return CircleValue{Kind: CircleValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return CircleValue{Kind: CircleValueNull}
	}
	if input.Kind == ArrayElementCircle {
		value := input.Circle
		return CircleValue{Kind: CircleValueValue, Value: value}
	}
	return CircleValue{Kind: CircleValueUnknown}
}
func ArrayElementFromMoney(input MoneyValue) ArrayElement {
	if input.Kind == MoneyValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == MoneyValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == MoneyValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementMoney, Money: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToMoney(input ArrayElement) MoneyValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return MoneyValue{Kind: MoneyValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return MoneyValue{Kind: MoneyValueNull}
	}
	if input.Kind == ArrayElementMoney {
		value := input.Money
		return MoneyValue{Kind: MoneyValueValue, Value: value}
	}
	return MoneyValue{Kind: MoneyValueUnknown}
}
func ArrayElementFromInternalChar(input InternalCharValue) ArrayElement {
	if input.Kind == InternalCharValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == InternalCharValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == InternalCharValueValue {
		value := langruntime.CheckedI32(input.Value)
		return ArrayElement{Kind: ArrayElementInternalChar, InternalChar: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToInternalChar(input ArrayElement) InternalCharValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return InternalCharValue{Kind: InternalCharValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return InternalCharValue{Kind: InternalCharValueNull}
	}
	if input.Kind == ArrayElementInternalChar {
		value := langruntime.CheckedI32(input.InternalChar)
		return InternalCharValue{Kind: InternalCharValueValue, Value: value}
	}
	return InternalCharValue{Kind: InternalCharValueUnknown}
}
func ArrayElementFromOid(input OidValue) ArrayElement {
	if input.Kind == OidValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == OidValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == OidValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementOid, Oid: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToOid(input ArrayElement) OidValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return OidValue{Kind: OidValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return OidValue{Kind: OidValueNull}
	}
	if input.Kind == ArrayElementOid {
		value := input.Oid
		return OidValue{Kind: OidValueValue, Value: value}
	}
	return OidValue{Kind: OidValueUnknown}
}
func ArrayElementFromXid(input XidValue) ArrayElement {
	if input.Kind == XidValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == XidValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == XidValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementXid, Xid: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToXid(input ArrayElement) XidValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return XidValue{Kind: XidValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return XidValue{Kind: XidValueNull}
	}
	if input.Kind == ArrayElementXid {
		value := input.Xid
		return XidValue{Kind: XidValueValue, Value: value}
	}
	return XidValue{Kind: XidValueUnknown}
}
func ArrayElementFromCid(input CidValue) ArrayElement {
	if input.Kind == CidValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == CidValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == CidValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementCid, Cid: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToCid(input ArrayElement) CidValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return CidValue{Kind: CidValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return CidValue{Kind: CidValueNull}
	}
	if input.Kind == ArrayElementCid {
		value := input.Cid
		return CidValue{Kind: CidValueValue, Value: value}
	}
	return CidValue{Kind: CidValueUnknown}
}
func ArrayElementFromSnapshot(input SnapshotValue) ArrayElement {
	input = CopySnapshotValue(input)
	if input.Kind == SnapshotValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == SnapshotValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == SnapshotValueValue {
		value := CopySnapshotPayload(input.Value)
		return ArrayElement{Kind: ArrayElementSnapshot, Snapshot: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToSnapshot(input ArrayElement) SnapshotValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return SnapshotValue{Kind: SnapshotValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return SnapshotValue{Kind: SnapshotValueNull}
	}
	if input.Kind == ArrayElementSnapshot {
		value := CopySnapshotPayload(input.Snapshot)
		return SnapshotValue{Kind: SnapshotValueValue, Value: value}
	}
	return SnapshotValue{Kind: SnapshotValueUnknown}
}
func ArrayElementFromXid8(input Xid8Value) ArrayElement {
	if input.Kind == Xid8ValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == Xid8ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == Xid8ValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementXid8, Xid8: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToXid8(input ArrayElement) Xid8Value {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return Xid8Value{Kind: Xid8ValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return Xid8Value{Kind: Xid8ValueNull}
	}
	if input.Kind == ArrayElementXid8 {
		value := input.Xid8
		return Xid8Value{Kind: Xid8ValueValue, Value: value}
	}
	return Xid8Value{Kind: Xid8ValueUnknown}
}
func ArrayElementFromPgLsn(input PgLsnValue) ArrayElement {
	if input.Kind == PgLsnValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == PgLsnValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == PgLsnValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementPgLsn, PgLsn: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToPgLsn(input ArrayElement) PgLsnValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return PgLsnValue{Kind: PgLsnValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return PgLsnValue{Kind: PgLsnValueNull}
	}
	if input.Kind == ArrayElementPgLsn {
		value := input.PgLsn
		return PgLsnValue{Kind: PgLsnValueValue, Value: value}
	}
	return PgLsnValue{Kind: PgLsnValueUnknown}
}
func ArrayElementFromTid(input TidValue) ArrayElement {
	if input.Kind == TidValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TidValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TidValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementTid, Tid: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToTid(input ArrayElement) TidValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return TidValue{Kind: TidValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TidValue{Kind: TidValueNull}
	}
	if input.Kind == ArrayElementTid {
		value := input.Tid
		return TidValue{Kind: TidValueValue, Value: value}
	}
	return TidValue{Kind: TidValueUnknown}
}
func ArrayElementFromJsonpath(input JsonpathValue) ArrayElement {
	input = CopyJsonpathValue(input)
	if input.Kind == JsonpathValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == JsonpathValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == JsonpathValueStoredText {
		value := langruntime.CheckedString(input.StoredText)
		return ArrayElement{Kind: ArrayElementJsonpathStoredText, JsonpathStoredText: value}
	}
	if input.Kind == JsonpathValueValue {
		value := CopyJsonpathPayload(input.Value)
		return ArrayElement{Kind: ArrayElementJsonpath, Jsonpath: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToJsonpath(input ArrayElement) JsonpathValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return JsonpathValue{Kind: JsonpathValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return JsonpathValue{Kind: JsonpathValueNull}
	}
	if input.Kind == ArrayElementJsonpathStoredText {
		value := langruntime.CheckedString(input.JsonpathStoredText)
		return JsonpathValue{Kind: JsonpathValueStoredText, StoredText: value}
	}
	if input.Kind == ArrayElementJsonpath {
		value := CopyJsonpathPayload(input.Jsonpath)
		return JsonpathValue{Kind: JsonpathValueValue, Value: value}
	}
	return JsonpathValue{Kind: JsonpathValueUnknown}
}
func ArrayElementFromRange(input RangeValue) ArrayElement {
	input = CopyRangeValue(input)
	if input.Kind == RangeValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == RangeValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		return ArrayElement{Kind: ArrayElementRange, Range: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToRange(input ArrayElement) RangeValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return RangeValue{Kind: RangeValueNull}
	}
	if input.Kind == ArrayElementRange {
		value := CopyRangePayload(input.Range)
		return MakeCoercedRangeValue(value)
	}
	return RangeValue{Kind: RangeValueUnknown}
}
func ArrayElementFromMultirange(input MultirangeValue) ArrayElement {
	input = CopyMultirangeValue(input)
	if input.Kind == MultirangeValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == MultirangeValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == MultirangeValueValue {
		value := CopyMultirangePayload(input.Value)
		return ArrayElement{Kind: ArrayElementMultirange, Multirange: value}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayElementToMultirange(input ArrayElement) MultirangeValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementError {
		error := input.Error
		return MultirangeValue{Kind: MultirangeValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return MultirangeValue{Kind: MultirangeValueNull}
	}
	if input.Kind == ArrayElementMultirange {
		value := CopyMultirangePayload(input.Multirange)
		return MakeCoercedMultirangeValue(value)
	}
	return MultirangeValue{Kind: MultirangeValueUnknown}
}

type RangeSupport struct {
	Comparison int
	Canonical  int
}

func MakeRangeSupport(comparison int, canonical int) RangeSupport {
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	return RangeSupport{Comparison: comparison, Canonical: canonical}
}

type RangeTextPayload struct {
	Empty        bool
	LowerPresent bool
	UpperPresent bool
	Lower        string
	Upper        string
	Flags        string
}

func CopyRangeTextPayload(value RangeTextPayload) RangeTextPayload {
	return RangeTextPayload{Empty: value.Empty, LowerPresent: value.LowerPresent, UpperPresent: value.UpperPresent, Lower: langruntime.CheckedString(value.Lower), Upper: langruntime.CheckedString(value.Upper), Flags: langruntime.CheckedString(value.Flags)}
}

type RangeTextPlanKind uint8

const (
	RangeTextPlanUnknown RangeTextPlanKind = iota
	RangeTextPlanNull
	RangeTextPlanError
	RangeTextPlanValue
)

type RangeTextPlan struct {
	Kind  RangeTextPlanKind
	Error SqlError
	Value RangeTextPayload
}

func CopyRangeTextPlan(value RangeTextPlan) RangeTextPlan {
	switch value.Kind {
	case RangeTextPlanUnknown:
		return RangeTextPlan{Kind: RangeTextPlanUnknown}
	case RangeTextPlanNull:
		return RangeTextPlan{Kind: RangeTextPlanNull}
	case RangeTextPlanError:
		return RangeTextPlan{Kind: RangeTextPlanError, Error: value.Error}
	case RangeTextPlanValue:
		return RangeTextPlan{Kind: RangeTextPlanValue, Value: CopyRangeTextPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func RangeUnknownSupport() RangeSupport {
	return RangeSupport{Comparison: 0, Canonical: 0}
}
func RangeBuiltinSupport(typeName string, elementType string, kind int) RangeSupport {
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	kind = langruntime.CheckedI32(kind)
	if typeName == "pg_catalog.int4range" && elementType == "pg_catalog.int4" && kind == 2 {
		return RangeSupport{Comparison: 2, Canonical: 2}
	}
	if typeName == "pg_catalog.int8range" && elementType == "pg_catalog.int8" && kind == 3 {
		return RangeSupport{Comparison: 3, Canonical: 3}
	}
	if typeName == "pg_catalog.daterange" && elementType == "pg_catalog.date" && kind == 7 {
		return RangeSupport{Comparison: 7, Canonical: 7}
	}
	if typeName == "pg_catalog.numrange" && elementType == "pg_catalog.\"numeric\"" && kind == 10 {
		return RangeSupport{Comparison: 10, Canonical: 1}
	}
	if typeName == "pg_catalog.tsrange" && elementType == "pg_catalog.\"timestamp\"" && kind == 4 {
		return RangeSupport{Comparison: 4, Canonical: 1}
	}
	if typeName == "pg_catalog.tstzrange" && elementType == "pg_catalog.timestamptz" && kind == 5 {
		return RangeSupport{Comparison: 5, Canonical: 1}
	}
	return RangeUnknownSupport()
}
func RangeSupportEqual(left RangeSupport, right RangeSupport) bool {
	return left.Comparison == right.Comparison && left.Canonical == right.Canonical
}
func RangeSupportValid(input RangeSupport, kind int) bool {
	kind = langruntime.CheckedI32(kind)
	comparison := input.Comparison == 0 || (input.Comparison == kind && (kind == 2 || kind == 3 || kind == 4 || kind == 5 || kind == 7 || kind == 8 || kind == 10 || kind == 1 || kind == 9 || kind == 13 || kind == 14 || kind == 15 || kind == 16 || kind == 17 || kind == 18 || kind == 19 || kind == 20 || kind == 21 || kind == 22 || kind == 23 || kind == 31 || kind == 32 || kind == 33 || kind == 37 || kind == 38 || kind == 39))
	canonical := input.Canonical == 0 || input.Canonical == 1 || (input.Canonical == kind && (kind == 2 || kind == 3 || kind == 7))
	return comparison && canonical
}

type RangePayload struct {
	TypeName       string
	ElementType    string
	ElementKind    int
	Support        RangeSupport
	Empty          bool
	LowerInclusive bool
	UpperInclusive bool
	Bounds         []ArrayElement
}

func CopyRangePayload(value RangePayload) RangePayload {
	return RangePayload{TypeName: langruntime.CheckedString(value.TypeName), ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Support: value.Support, Empty: value.Empty, LowerInclusive: value.LowerInclusive, UpperInclusive: value.UpperInclusive, Bounds: langruntime.CheckedStructs(value.Bounds, CopyArrayElement)}
}

type RangeValueKind uint8

const (
	RangeValueUnknown RangeValueKind = iota
	RangeValueNull
	RangeValueError
	RangeValueValue
)

type RangeValue struct {
	Kind  RangeValueKind
	Error SqlError
	Value RangePayload
}

func CopyRangeValue(value RangeValue) RangeValue {
	switch value.Kind {
	case RangeValueUnknown:
		return RangeValue{Kind: RangeValueUnknown}
	case RangeValueNull:
		return RangeValue{Kind: RangeValueNull}
	case RangeValueError:
		return RangeValue{Kind: RangeValueError, Error: value.Error}
	case RangeValueValue:
		return RangeValue{Kind: RangeValueValue, Value: CopyRangePayload(value.Value)}
	}
	panic("unknown enum variant")
}
func RangeUnknown() RangeValue {
	return RangeValue{Kind: RangeValueUnknown}
}
func RangeNull() RangeValue {
	return RangeValue{Kind: RangeValueNull}
}
func rangePayloadWithSupport(input RangePayload, support RangeSupport) RangePayload {
	input = CopyRangePayload(input)
	return RangePayload{TypeName: input.TypeName, ElementType: input.ElementType, ElementKind: input.ElementKind, Support: support, Empty: input.Empty, LowerInclusive: input.LowerInclusive, UpperInclusive: input.UpperInclusive, Bounds: input.Bounds}
}
func rangeBoundWordValid(value int) bool {
	value = langruntime.CheckedI32(value)
	return value >= 0 && value <= 65535
}
func rangeBoundValueValid(input ArrayElement) bool {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementInt2 {
		value := langruntime.CheckedI32(input.Int2)
		return MakeInt2Value(value) != (Int2Value{Kind: Int2ValueUnknown})
	}
	if input.Kind == ArrayElementBit {
		value := langruntime.CheckedString(input.Bit)
		return MakeBitValue(value) != (BitValue{Kind: BitValueUnknown})
	}
	if input.Kind == ArrayElementBytea {
		value := langruntime.CheckedString(input.Bytea)
		parsed := MakeByteaValue(value)
		if parsed.Kind == ByteaValueValue {
			canonical := langruntime.CheckedString(parsed.Value)
			return canonical == value
		}
		return false
	}
	if input.Kind == ArrayElementTime {
		value := input.Time
		return MakeTimeValue(value) != (TimeValue{Kind: TimeValueUnknown})
	}
	if input.Kind == ArrayElementTimetz {
		value := input.Timetz
		return MakeTimetzValue(value.Time, value.Zone) != (TimetzValue{Kind: TimetzValueUnknown})
	}
	if input.Kind == ArrayElementInternalChar {
		value := langruntime.CheckedI32(input.InternalChar)
		return MakeInternalCharValue(value) != (InternalCharValue{Kind: InternalCharValueUnknown})
	}
	if input.Kind == ArrayElementOid {
		value := input.Oid
		return MakeOidValue(value) != (OidValue{Kind: OidValueUnknown})
	}
	if input.Kind == ArrayElementTid {
		value := input.Tid
		return MakeTidValue(value) != (TidValue{Kind: TidValueUnknown})
	}
	if input.Kind == ArrayElementNetwork {
		value := input.Network
		if value.Family != 4 && value.Family != 6 {
			return false
		}
		if value.Prefix < 0 || value.Prefix > 128 {
			return false
		}
		if value.Family == 4 {
			if value.Prefix > 32 || value.Word2 != 0 || value.Word3 != 0 || value.Word4 != 0 || value.Word5 != 0 || value.Word6 != 0 || value.Word7 != 0 {
				return false
			}
		}
		return rangeBoundWordValid(value.Word0) && rangeBoundWordValid(value.Word1) && rangeBoundWordValid(value.Word2) && rangeBoundWordValid(value.Word3) && rangeBoundWordValid(value.Word4) && rangeBoundWordValid(value.Word5) && rangeBoundWordValid(value.Word6) && rangeBoundWordValid(value.Word7)
	}
	if input.Kind == ArrayElementMacaddr {
		value := input.Macaddr
		return value.Word3 == 0 && rangeBoundWordValid(value.Word0) && rangeBoundWordValid(value.Word1) && rangeBoundWordValid(value.Word2)
	}
	if input.Kind == ArrayElementMacaddr8 {
		value := input.Macaddr8
		return rangeBoundWordValid(value.Word0) && rangeBoundWordValid(value.Word1) && rangeBoundWordValid(value.Word2) && rangeBoundWordValid(value.Word3)
	}
	if input.Kind == ArrayElementUuid {
		value := input.Uuid
		return rangeBoundWordValid(value.Word0) && rangeBoundWordValid(value.Word1) && rangeBoundWordValid(value.Word2) && rangeBoundWordValid(value.Word3) && rangeBoundWordValid(value.Word4) && rangeBoundWordValid(value.Word5) && rangeBoundWordValid(value.Word6) && rangeBoundWordValid(value.Word7)
	}
	return true
}
func MakeCoercedRangeValue(input RangePayload) RangeValue {
	input = CopyRangePayload(input)
	value := input
	support := value.Support
	if value.TypeName == "" || value.ElementType == "" || value.ElementKind < 1 {
		return RangeValue{Kind: RangeValueUnknown}
	}
	if RangeSupportEqual(support, RangeUnknownSupport()) {
		support = RangeBuiltinSupport(value.TypeName, value.ElementType, value.ElementKind)
	}
	if RangeSupportValid(support, value.ElementKind) == false {
		return RangeValue{Kind: RangeValueUnknown}
	}
	expected := RangeBuiltinSupport(value.TypeName, value.ElementType, value.ElementKind)
	if RangeSupportEqual(expected, RangeUnknownSupport()) == false && RangeSupportEqual(support, expected) == false {
		return RangeValue{Kind: RangeValueUnknown}
	}
	if value.Empty {
		if len(value.Bounds) != 0 || value.LowerInclusive || value.UpperInclusive {
			return RangeValue{Kind: RangeValueUnknown}
		}
		return RangeValue{Kind: RangeValueValue, Value: rangePayloadWithSupport(value, support)}
	}
	if len(value.Bounds) != 2 {
		return RangeValue{Kind: RangeValueUnknown}
	}
	index := 0
	for index < len(value.Bounds) {
		bound := CopyArrayElement(value.Bounds[index])
		if bound.Kind == ArrayElementError {
			error := bound.Error
			return RangeValue{Kind: RangeValueError, Error: error}
		}
		kind := ArrayElementFamily(CopyArrayElement(bound))
		if kind != 0 && kind != value.ElementKind {
			return RangeValue{Kind: RangeValueUnknown}
		}
		if rangeBoundValueValid(CopyArrayElement(bound)) == false {
			return RangeValue{Kind: RangeValueUnknown}
		}
		if bound.Kind == ArrayElementNull {
			if (index == 0 && value.LowerInclusive) || (index == 1 && value.UpperInclusive) {
				return RangeValue{Kind: RangeValueUnknown}
			}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return RangeValue{Kind: RangeValueValue, Value: rangePayloadWithSupport(value, support)}
}
func RangeFromCoercedBounds(typeName string, elementType string, elementKind int, empty bool, lowerInclusive bool, upperInclusive bool, lower ArrayElement, upper ArrayElement) RangeValue {
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	lower = CopyArrayElement(lower)
	upper = CopyArrayElement(upper)
	support := RangeBuiltinSupport(typeName, elementType, elementKind)
	return RangeFromProfiledBounds(typeName, elementType, elementKind, empty, lowerInclusive, upperInclusive, lower, upper, support)
}
func RangeFromProfiledBounds(typeName string, elementType string, elementKind int, empty bool, lowerInclusive bool, upperInclusive bool, lower ArrayElement, upper ArrayElement, support RangeSupport) RangeValue {
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	lower = CopyArrayElement(lower)
	upper = CopyArrayElement(upper)
	bounds := []ArrayElement{}
	if empty == false {
		langruntime.CheckedAdd(len(bounds), 1)
		bounds = append(bounds, CopyArrayElement(lower))
		langruntime.CheckedAdd(len(bounds), 1)
		bounds = append(bounds, CopyArrayElement(upper))
	}
	return MakeCoercedRangeValue(RangePayload{TypeName: typeName, ElementType: elementType, ElementKind: elementKind, Support: support, Empty: empty, LowerInclusive: lowerInclusive, UpperInclusive: upperInclusive, Bounds: bounds})
}
func RangeRequireType(input RangeValue, typeName string, elementType string, elementKind int) RangeValue {
	input = CopyRangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		if value.TypeName != typeName || value.ElementType != elementType || value.ElementKind != elementKind {
			return RangeValue{Kind: RangeValueUnknown}
		}
		expected := RangeBuiltinSupport(typeName, elementType, elementKind)
		if RangeSupportEqual(expected, RangeUnknownSupport()) == false && RangeSupportEqual(value.Support, expected) == false {
			return RangeValue{Kind: RangeValueUnknown}
		}
		return RangeValue{Kind: RangeValueValue, Value: value}
	}
	return input
}
func RangeFromCoercedProfile(input RangeValue, typeName string, elementType string, elementKind int, comparison int, canonical int) RangeValue {
	input = CopyRangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	if input.Kind == RangeValueValue {
		payload := CopyRangePayload(input.Value)
		if payload.TypeName != typeName || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return RangeValue{Kind: RangeValueUnknown}
		}
		support := RangeSupport{Comparison: comparison, Canonical: canonical}
		return MakeCoercedRangeValue(rangePayloadWithSupport(payload, support))
	}
	return input
}
func RangeRequireSupport(input RangeValue, expected RangeSupport) RangeValue {
	input = CopyRangeValue(input)
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		if RangeSupportEqual(value.Support, expected) == false {
			return RangeValue{Kind: RangeValueUnknown}
		}
		return RangeValue{Kind: RangeValueValue, Value: value}
	}
	return input
}
func RangeIsNull(input RangeValue) BoolValue {
	input = CopyRangeValue(input)
	if input.Kind == RangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == RangeValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == RangeValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func RangeFromCaseGuard(input CheckOutcome) RangeValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	return RangeValue{Kind: RangeValueUnknown}
}
func RangeEmptyState(input RangeValue) BoolValue {
	input = CopyRangeValue(input)
	if input.Kind == RangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == RangeValueNull {
		return BoolValue{Kind: BoolValueNull}
	}
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		return BoolValue{Kind: BoolValueValue, Value: value.Empty}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func RangeBound(input RangeValue, upper bool) ArrayElement {
	input = CopyRangeValue(input)
	if input.Kind == RangeValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == RangeValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		if value.Empty {
			return ArrayElement{Kind: ArrayElementNull}
		}
		index := 0
		if upper {
			index = langruntime.CheckedIndex(1)
		}
		return CopyArrayElement(value.Bounds[index])
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func RangeBoundFlag(input RangeValue, upper bool, infinite bool) BoolValue {
	input = CopyRangeValue(input)
	if input.Kind == RangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == RangeValueNull {
		return BoolValue{Kind: BoolValueNull}
	}
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		if value.Empty {
			return BoolValue{Kind: BoolValueValue, Value: false}
		}
		if infinite {
			index := 0
			if upper {
				index = langruntime.CheckedIndex(1)
			}
			bound := CopyArrayElement(value.Bounds[index])
			if bound.Kind == ArrayElementNull {
				return BoolValue{Kind: BoolValueValue, Value: true}
			}
			return BoolValue{Kind: BoolValueValue, Value: false}
		}
		if upper {
			return BoolValue{Kind: BoolValueValue, Value: value.UpperInclusive}
		}
		return BoolValue{Kind: BoolValueValue, Value: value.LowerInclusive}
	}
	return BoolValue{Kind: BoolValueUnknown}
}

type MultirangePayload struct {
	TypeName    string
	RangeType   string
	ElementType string
	ElementKind int
	Support     RangeSupport
	Ranges      []RangeValue
}

func CopyMultirangePayload(value MultirangePayload) MultirangePayload {
	return MultirangePayload{TypeName: langruntime.CheckedString(value.TypeName), RangeType: langruntime.CheckedString(value.RangeType), ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Support: value.Support, Ranges: langruntime.CheckedStructs(value.Ranges, CopyRangeValue)}
}

type MultirangeValueKind uint8

const (
	MultirangeValueUnknown MultirangeValueKind = iota
	MultirangeValueNull
	MultirangeValueError
	MultirangeValueValue
)

type MultirangeValue struct {
	Kind  MultirangeValueKind
	Error SqlError
	Value MultirangePayload
}

func CopyMultirangeValue(value MultirangeValue) MultirangeValue {
	switch value.Kind {
	case MultirangeValueUnknown:
		return MultirangeValue{Kind: MultirangeValueUnknown}
	case MultirangeValueNull:
		return MultirangeValue{Kind: MultirangeValueNull}
	case MultirangeValueError:
		return MultirangeValue{Kind: MultirangeValueError, Error: value.Error}
	case MultirangeValueValue:
		return MultirangeValue{Kind: MultirangeValueValue, Value: CopyMultirangePayload(value.Value)}
	}
	panic("unknown enum variant")
}

type MultirangeTextPayload struct {
	Characters []rune
	Position   int
	Member     string
	Started    bool
	Ranges     []RangeValue
	State      int
	Error      SqlError
}

func CopyMultirangeTextPayload(value MultirangeTextPayload) MultirangeTextPayload {
	return MultirangeTextPayload{Characters: langruntime.CheckedChars(value.Characters), Position: langruntime.CheckedIndex(value.Position), Member: langruntime.CheckedString(value.Member), Started: value.Started, Ranges: langruntime.CheckedStructs(value.Ranges, CopyRangeValue), State: langruntime.CheckedI32(value.State), Error: value.Error}
}

type MultirangeTextPlanKind uint8

const (
	MultirangeTextPlanValue MultirangeTextPlanKind = iota
)

type MultirangeTextPlan struct {
	Kind  MultirangeTextPlanKind
	Value MultirangeTextPayload
}

func copyMultirangeTextPlan(value MultirangeTextPlan) MultirangeTextPlan {
	switch value.Kind {
	case MultirangeTextPlanValue:
		return MultirangeTextPlan{Kind: MultirangeTextPlanValue, Value: CopyMultirangeTextPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func MultirangeUnknown() MultirangeValue {
	return MultirangeValue{Kind: MultirangeValueUnknown}
}
func MultirangeNull() MultirangeValue {
	return MultirangeValue{Kind: MultirangeValueNull}
}
func multirangeComponent(input *MultirangePayload, position int, support RangeSupport) RangeValue {
	position = langruntime.CheckedIndex(position)
	span := CopyRangeValue(input.Ranges[position])
	if span.Kind == RangeValueValue {
		payload := CopyRangePayload(span.Value)
		span = CopyRangeValue(MakeCoercedRangeValue(payload))
	}
	typed := RangeRequireType(span, input.RangeType, input.ElementType, input.ElementKind)
	supported := RangeRequireSupport(typed, support)
	if supported.Kind == RangeValueError {
		error := supported.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	if supported.Kind == RangeValueValue {
		payload := CopyRangePayload(supported.Value)
		if payload.Empty {
			return RangeValue{Kind: RangeValueUnknown}
		}
		return RangeValue{Kind: RangeValueValue, Value: payload}
	}
	return RangeValue{Kind: RangeValueUnknown}
}
func MakeCoercedMultirangeValue(input MultirangePayload) MultirangeValue {
	input = CopyMultirangePayload(input)
	payload := input
	support := payload.Support
	if payload.TypeName == "" || payload.RangeType == "" || payload.ElementType == "" || payload.ElementKind < 1 {
		return MultirangeValue{Kind: MultirangeValueUnknown}
	}
	expected := RangeBuiltinSupport(payload.RangeType, payload.ElementType, payload.ElementKind)
	if RangeSupportEqual(support, RangeUnknownSupport()) {
		support = expected
	}
	if RangeSupportValid(support, payload.ElementKind) == false {
		return MultirangeValue{Kind: MultirangeValueUnknown}
	}
	if RangeSupportEqual(expected, RangeUnknownSupport()) == false && RangeSupportEqual(support, expected) == false {
		return MultirangeValue{Kind: MultirangeValueUnknown}
	}
	ranges := []RangeValue{}
	index := 0
	for index < len(payload.Ranges) {
		member := multirangeComponent(&payload, index, support)
		if member.Kind == RangeValueError {
			error := member.Error
			return MultirangeValue{Kind: MultirangeValueError, Error: error}
		}
		known := false
		if member.Kind == RangeValueValue {
			span := CopyRangePayload(member.Value)
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(RangeValue{Kind: RangeValueValue, Value: span}))
			known = true
		}
		if known == false {
			return MultirangeValue{Kind: MultirangeValueUnknown}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return MultirangeValue{Kind: MultirangeValueValue, Value: MultirangePayload{TypeName: payload.TypeName, RangeType: payload.RangeType, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Support: support, Ranges: ranges}}
}
func MultirangeFromProfiledRanges(typeName string, rangeType string, elementType string, elementKind int, ranges []RangeValue, support RangeSupport) MultirangeValue {
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	ranges = langruntime.CheckedStructs(ranges, CopyRangeValue)
	return MakeCoercedMultirangeValue(MultirangePayload{TypeName: typeName, RangeType: rangeType, ElementType: elementType, ElementKind: elementKind, Support: support, Ranges: ranges})
}
func MultirangeFromCoercedProfile(input MultirangeValue, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int) MultirangeValue {
	input = CopyMultirangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if payload.TypeName != typeName || payload.RangeType != rangeType || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return MultirangeValue{Kind: MultirangeValueUnknown}
		}
		ranges := payload.Ranges
		index := 0
		for index < len(ranges) {
			ranges[index] = CopyRangeValue(RangeFromCoercedProfile(CopyRangeValue(ranges[index]), rangeType, elementType, elementKind, comparison, canonical))
			index = langruntime.CheckedAdd(index, 1)
		}
		return MultirangeFromProfiledRanges(typeName, rangeType, elementType, elementKind, ranges, RangeSupport{Comparison: comparison, Canonical: canonical})
	}
	return input
}
func MultirangeRequireSupport(input MultirangeValue, expected RangeSupport) MultirangeValue {
	input = CopyMultirangeValue(input)
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if RangeSupportEqual(payload.Support, expected) == false {
			return MultirangeValue{Kind: MultirangeValueUnknown}
		}
		return MultirangeValue{Kind: MultirangeValueValue, Value: payload}
	}
	return input
}
func MultirangeRequireType(input MultirangeValue, typeName string, rangeType string, elementType string, elementKind int) MultirangeValue {
	input = CopyMultirangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if payload.TypeName != typeName || payload.RangeType != rangeType || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return MultirangeValue{Kind: MultirangeValueUnknown}
		}
		return MakeCoercedMultirangeValue(payload)
	}
	return input
}
func MultirangeIsNull(input MultirangeValue) BoolValue {
	input = CopyMultirangeValue(input)
	if input.Kind == MultirangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == MultirangeValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	if input.Kind == MultirangeValueValue {
		return BoolValue{Kind: BoolValueValue, Value: false}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func MultirangeFromCaseGuard(input CheckOutcome) MultirangeValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return MultirangeValue{Kind: MultirangeValueError, Error: error}
	}
	return MultirangeValue{Kind: MultirangeValueUnknown}
}
func MultirangeEmptyState(input MultirangeValue) BoolValue {
	input = CopyMultirangeValue(input)
	if input.Kind == MultirangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == MultirangeValueNull {
		return BoolValue{Kind: BoolValueNull}
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		return BoolValue{Kind: BoolValueValue, Value: len(payload.Ranges) == 0}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func multirangeBoundaryAt(input *MultirangePayload, upper bool) RangeValue {
	if len(input.Ranges) == 0 {
		return RangeValue{Kind: RangeValueNull}
	}
	position := 0
	if upper {
		position = langruntime.CheckedIndex(langruntime.CheckedSubtract(len(input.Ranges), 1))
	}
	return CopyRangeValue(input.Ranges[position])
}
func MultirangeBoundary(input MultirangeValue, upper bool) RangeValue {
	input = CopyMultirangeValue(input)
	if input.Kind == MultirangeValueError {
		error := input.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	if input.Kind == MultirangeValueNull {
		return RangeValue{Kind: RangeValueNull}
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		return multirangeBoundaryAt(&payload, upper)
	}
	return RangeValue{Kind: RangeValueUnknown}
}
func MultirangeBound(input MultirangeValue, upper bool) ArrayElement {
	input = CopyMultirangeValue(input)
	boundary := MultirangeBoundary(input, upper)
	return RangeBound(boundary, upper)
}
func MultirangeBoundFlag(input MultirangeValue, upper bool, infinite bool) BoolValue {
	input = CopyMultirangeValue(input)
	if input.Kind == MultirangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == MultirangeValueNull {
		return BoolValue{Kind: BoolValueNull}
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if len(payload.Ranges) == 0 {
			return BoolValue{Kind: BoolValueValue, Value: false}
		}
		boundary := multirangeBoundaryAt(&payload, upper)
		return RangeBoundFlag(boundary, upper, infinite)
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func DomainConversionStart(input BoolValue, notNull bool) CheckOutcome {
	if input.Kind == BoolValueError {
		error := input.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if input != (BoolValue{Kind: BoolValueValue, Value: true}) && input != (BoolValue{Kind: BoolValueValue, Value: false}) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	if notNull {
		if input == (BoolValue{Kind: BoolValueValue, Value: true}) {
			return CheckOutcome{Kind: CheckOutcomeError, Error: MakeSqlError(sqlErrorNotNullViolation)}
		}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func DomainConversionContinues(input CheckOutcome) bool {
	return input == (CheckOutcome{Kind: CheckOutcomeTrue})
}
func DomainConversionCheck(input CheckOutcome, result CheckOutcome) CheckOutcome {
	if input != (CheckOutcome{Kind: CheckOutcomeTrue}) {
		return input
	}
	if result == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return CheckOutcome{Kind: CheckOutcomeError, Error: MakeSqlError(sqlErrorCheckViolation)}
	}
	if result == (CheckOutcome{Kind: CheckOutcomeNull}) {
		return CheckOutcome{Kind: CheckOutcomeTrue}
	}
	return result
}
func FinishDomainConversion(input ArrayElement, result CheckOutcome) ArrayElement {
	input = CopyArrayElement(input)
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return ArrayElement{Kind: ArrayElementUnknown}
	}
	return input
}
func FinishDomainArrayInput(input ArrayTextPayload, converted ArrayArguments) ArrayValue {
	input = CopyArrayTextPayload(input)
	converted = CopyArrayArguments(converted)
	if converted.Kind == ArrayArgumentsUnknown {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	return FinishPreparedArrayText(input, converted)
}
func FinishArrayDomainConversion(input ArrayValue, result CheckOutcome) ArrayValue {
	input = CopyArrayValue(input)
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	return input
}
func FinishRangeDomainConversion(input RangeValue, result CheckOutcome) RangeValue {
	input = CopyRangeValue(input)
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return RangeValue{Kind: RangeValueUnknown}
	}
	return input
}
func FinishMultirangeDomainConversion(input MultirangeValue, result CheckOutcome) MultirangeValue {
	input = CopyMultirangeValue(input)
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return MultirangeValue{Kind: MultirangeValueError, Error: error}
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return MultirangeValue{Kind: MultirangeValueUnknown}
	}
	return input
}

type ArrayDimension struct {
	Lower  int
	Length int
}

func copyArrayDimension(value ArrayDimension) ArrayDimension {
	return ArrayDimension{Lower: langruntime.CheckedI32(value.Lower), Length: langruntime.CheckedI32(value.Length)}
}

type ArrayPayload struct {
	NullBitmap  BoolValue
	ElementType string
	ElementKind int
	Dimensions  []ArrayDimension
	Elements    []ArrayElement
}

func CopyArrayPayload(value ArrayPayload) ArrayPayload {
	return ArrayPayload{NullBitmap: value.NullBitmap, ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Dimensions: langruntime.CheckedStructs(value.Dimensions, copyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement)}
}

type ArrayValueKind uint8

const (
	ArrayValueUnknown ArrayValueKind = iota
	ArrayValueNull
	ArrayValueError
	ArrayValueValue
)

type ArrayValue struct {
	Kind  ArrayValueKind
	Error SqlError
	Value ArrayPayload
}

func CopyArrayValue(value ArrayValue) ArrayValue {
	switch value.Kind {
	case ArrayValueUnknown:
		return ArrayValue{Kind: ArrayValueUnknown}
	case ArrayValueNull:
		return ArrayValue{Kind: ArrayValueNull}
	case ArrayValueError:
		return ArrayValue{Kind: ArrayValueError, Error: value.Error}
	case ArrayValueValue:
		return ArrayValue{Kind: ArrayValueValue, Value: CopyArrayPayload(value.Value)}
	}
	panic("unknown enum variant")
}

type ArrayArgumentsKind uint8

const (
	ArrayArgumentsUnknown ArrayArgumentsKind = iota
	ArrayArgumentsError
	ArrayArgumentsValue
)

type ArrayArguments struct {
	Kind  ArrayArgumentsKind
	Error SqlError
	Value ArrayPayload
}

func CopyArrayArguments(value ArrayArguments) ArrayArguments {
	switch value.Kind {
	case ArrayArgumentsUnknown:
		return ArrayArguments{Kind: ArrayArgumentsUnknown}
	case ArrayArgumentsError:
		return ArrayArguments{Kind: ArrayArgumentsError, Error: value.Error}
	case ArrayArgumentsValue:
		return ArrayArguments{Kind: ArrayArgumentsValue, Value: CopyArrayPayload(value.Value)}
	}
	panic("unknown enum variant")
}

type ArrayOutputPayload struct {
	NullBitmap BoolValue
	State      int
	Error      SqlError
	Dimensions []ArrayDimension
	Elements   []ArrayElement
}

func CopyArrayOutputPayload(value ArrayOutputPayload) ArrayOutputPayload {
	return ArrayOutputPayload{NullBitmap: value.NullBitmap, State: langruntime.CheckedI32(value.State), Error: value.Error, Dimensions: langruntime.CheckedStructs(value.Dimensions, copyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement)}
}

type ArrayOutputPlanKind uint8

const (
	ArrayOutputPlanValue ArrayOutputPlanKind = iota
)

type ArrayOutputPlan struct {
	Kind  ArrayOutputPlanKind
	Value ArrayOutputPayload
}

func copyArrayOutputPlan(value ArrayOutputPlan) ArrayOutputPlan {
	switch value.Kind {
	case ArrayOutputPlanValue:
		return ArrayOutputPlan{Kind: ArrayOutputPlanValue, Value: CopyArrayOutputPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func ArrayValueValidity(input BoolValue, unknownValid bool) CheckOutcome {
	if input.Kind == BoolValueError {
		error := input.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if input == (BoolValue{Kind: BoolValueUnknown}) && unknownValid == false {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func ArrayValidityFinish(left CheckOutcome, right CheckOutcome) CheckOutcome {
	if left == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return left
	}
	if left.Kind == CheckOutcomeError {
		return left
	}
	return right
}
func ArrayValidityUnknown(input CheckOutcome) bool {
	return input == (CheckOutcome{Kind: CheckOutcomeUnknown})
}
func ArrayValidityPossible(input CheckOutcome) CheckOutcome {
	if input == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	if input.Kind == CheckOutcomeError {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func ArrayConstructorFromValidity(input ArrayValue, validity CheckOutcome) ArrayValue {
	if validity.Kind == CheckOutcomeError {
		error := validity.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if validity == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	return input
}
func ArrayCastValidity(input ArrayElement, source string, target string, alwaysValid bool) CheckOutcome {
	if input.Kind == ArrayElementError {
		error := input.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return CheckOutcome{Kind: CheckOutcomeTrue}
	}
	if alwaysValid {
		return CheckOutcome{Kind: CheckOutcomeTrue}
	}
	temporal := false
	lowerOnly := false
	timestamp := int64(0)
	if source == "pg_catalog.date" && target == "pg_catalog.timestamptz" {
		if input.Kind == ArrayElementDate {
			value := langruntime.CheckedI32(input.Date)
			if value == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || value == 2147483647 {
				return CheckOutcome{Kind: CheckOutcomeTrue}
			}
			if value >= 106751983 {
				return CheckOutcome{Kind: CheckOutcomeError, Error: MakeSqlError(timestampFieldOverflow)}
			}
			timestamp = langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(value))), int64(86400000000))
			temporal = true
		}
	}
	if source == "pg_catalog.\"timestamp\"" && target == "pg_catalog.timestamptz" {
		if input.Kind == ArrayElementTimestamp {
			value := input.Timestamp
			timestamp = value
			temporal = true
		}
	}
	if source == "pg_catalog.timestamptz" && (target == "pg_catalog.\"timestamp\"" || target == "pg_catalog.date") {
		if input.Kind == ArrayElementTimestamptz {
			value := input.Timestamptz
			timestamp = value
			temporal = true
			lowerOnly = target == "pg_catalog.date"
		}
	}
	if temporal {
		if timestamp == int64(-9223372036854775808) || timestamp == int64(9223372036854775807) {
			return CheckOutcome{Kind: CheckOutcomeTrue}
		}
		if timestamp >= langruntime.CheckedI64Add(int64(-211813488000000000), int64(2147483648000000)) && (lowerOnly || timestamp < langruntime.CheckedI64Subtract(int64(9223371331200000000), int64(2147483648000000))) {
			return CheckOutcome{Kind: CheckOutcomeTrue}
		}
	}
	return CheckOutcome{Kind: CheckOutcomeUnknown}
}
func AppendArrayCastConversion(input ArrayOutputPayload, element ArrayElement, validity CheckOutcome) ArrayOutputPayload {
	if element.Kind == ArrayElementUnknown {
		if validity.Kind == CheckOutcomeError {
			error := validity.Error
			return AppendArrayConversion(input, ArrayElement{Kind: ArrayElementError, Error: error}, true)
		}
		return AppendArrayConversion(input, element, validity == (CheckOutcome{Kind: CheckOutcomeTrue}))
	}
	return AppendArrayConversion(input, element, true)
}
func MakeArrayConversion() ArrayOutputPayload {
	dimensions := []ArrayDimension{}
	elements := []ArrayElement{}
	return ArrayOutputPayload{NullBitmap: BoolValue{Kind: BoolValueValue, Value: false}, State: 1, Error: MakeSqlError(0), Dimensions: dimensions, Elements: elements}
}
func AppendArrayConversion(input ArrayOutputPayload, element ArrayElement, unknownValid bool) ArrayOutputPayload {
	state := input.State
	error := input.Error
	if state == 1 {
		if element.Kind == ArrayElementError {
			value := element.Error
			state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(2))
			error = value
		}
	}
	if state == 1 && unknownValid == false {
		if element.Kind == ArrayElementUnknown {
			state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
	}
	elements := input.Elements
	nullBitmap := input.NullBitmap
	if state == 1 {
		nullBitmap = ArrayBitmapUnion(nullBitmap, ArrayElementBitmap(CopyArrayElement(element)))
		langruntime.CheckedAdd(len(elements), 1)
		elements = append(elements, CopyArrayElement(element))
	}
	return ArrayOutputPayload{NullBitmap: nullBitmap, State: state, Error: error, Dimensions: input.Dimensions, Elements: elements}
}
func ArrayConversionArguments(input ArrayOutputPayload, elementType string, elementKind int) ArrayArguments {
	if input.State == langruntime.CheckedSignedNegate(2) {
		return ArrayArguments{Kind: ArrayArgumentsError, Error: input.Error}
	}
	if input.State != 1 {
		return ArrayArguments{Kind: ArrayArgumentsUnknown}
	}
	return ArrayArguments{Kind: ArrayArgumentsValue, Value: ArrayPayload{NullBitmap: input.NullBitmap, ElementType: elementType, ElementKind: elementKind, Dimensions: input.Dimensions, Elements: input.Elements}}
}
func PrepareArrayOutput(input ArrayValue) ArrayOutputPayload {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		return ArrayOutputPayload{NullBitmap: value.NullBitmap, State: 1, Error: MakeSqlError(0), Dimensions: value.Dimensions, Elements: value.Elements}
	}
	state := langruntime.CheckedSignedNegate(1)
	error := MakeSqlError(0)
	if input.Kind == ArrayValueNull {
		state = langruntime.CheckedI32(0)
	}
	if input.Kind == ArrayValueError {
		value := input.Error
		state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(2))
		error = value
	}
	dimensions := []ArrayDimension{}
	elements := []ArrayElement{}
	return ArrayOutputPayload{NullBitmap: BoolValue{Kind: BoolValueUnknown}, State: state, Error: error, Dimensions: dimensions, Elements: elements}
}
func ArrayOutputHasElement(input *ArrayOutputPayload, index Int4Value) bool {
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		position := langruntime.IndexFromI32(offset, len(input.Elements))
		return input.State == 1 && offset >= 0 && position < len(input.Elements)
	}
	return false
}
func ArrayOutputElementAt(input *ArrayOutputPayload, index Int4Value) ArrayElement {
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		position := langruntime.IndexFromI32(offset, len(input.Elements))
		if offset >= 0 && position < len(input.Elements) {
			return CopyArrayElement(input.Elements[position])
		}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayUnknown() ArrayValue {
	return ArrayValue{Kind: ArrayValueUnknown}
}
func ArrayNull() ArrayValue {
	return ArrayValue{Kind: ArrayValueNull}
}
func ArrayIsNull(input ArrayValue) BoolValue {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == ArrayValueUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == ArrayValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func ArrayFromCaseGuard(input CheckOutcome) ArrayValue {
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}
func arrayCoercedOwnedElement(element ArrayElement) ArrayElement {
	element = CopyArrayElement(element)
	if element.Kind == ArrayElementArray {
		nested := CopyArrayPayload(element.Array)
		return ArrayElementFromArray(MakeArrayValue(nested))
	}
	if element.Kind == ArrayElementRange {
		payload := CopyRangePayload(element.Range)
		return ArrayElementFromRange(MakeCoercedRangeValue(payload))
	}
	if element.Kind == ArrayElementMultirange {
		payload := CopyMultirangePayload(element.Multirange)
		return ArrayElementFromMultirange(MakeCoercedMultirangeValue(payload))
	}
	return element
}
func MakeArrayValue(input ArrayPayload) ArrayValue {
	input = CopyArrayPayload(input)
	elements := input.Elements
	position := 0
	for position < len(elements) {
		checked := arrayCoercedOwnedElement(CopyArrayElement(elements[position]))
		if checked.Kind == ArrayElementError {
			error := checked.Error
			return ArrayValue{Kind: ArrayValueError, Error: error}
		}
		if checked.Kind == ArrayElementUnknown {
			if ArrayElementFamily(CopyArrayElement(elements[position])) >= 41 {
				return ArrayValue{Kind: ArrayValueUnknown}
			}
		}
		elements[position] = CopyArrayElement(checked)
		position = langruntime.CheckedAdd(position, 1)
	}
	identity := []rune(input.ElementType)
	if len(identity) == 0 || input.ElementKind < 1 || input.ElementKind > 43 {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	position = langruntime.CheckedIndex(0)
	for position < len(identity) {
		if identity[position] == '\x00' {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	if len(input.Dimensions) > 6 {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	count := int64(0)
	if len(input.Dimensions) > 0 {
		count = int64(1)
	}
	position = langruntime.CheckedIndex(0)
	for position < len(input.Dimensions) {
		dimension := input.Dimensions[position]
		if dimension.Length <= 0 {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		length := int64(langruntime.CheckedI32(dimension.Length))
		end := langruntime.CheckedI64Add((int64(langruntime.CheckedI32(dimension.Lower))), length)
		if end > int64(2147483648) || count > langruntime.CheckedI64Divide(int64(2147483647), length) {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		count = langruntime.CheckedI64Multiply(count, length)
		position = langruntime.CheckedAdd(position, 1)
	}
	if count != int64(langruntime.CheckedI32((int(int32(len(elements)))))) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	position = langruntime.CheckedIndex(0)
	for position < len(elements) {
		kind := ArrayElementFamily(CopyArrayElement(elements[position]))
		if kind != 0 && kind != input.ElementKind {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	nullBitmap := input.NullBitmap
	if nullBitmap == (BoolValue{Kind: BoolValueNull}) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	if nullBitmap.Kind == BoolValueError {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	position = langruntime.CheckedIndex(0)
	for position < len(elements) {
		element := CopyArrayElement(elements[position])
		if element.Kind == ArrayElementNull {
			if nullBitmap == (BoolValue{Kind: BoolValueValue, Value: false}) {
				return ArrayValue{Kind: ArrayValueUnknown}
			}
			nullBitmap = BoolValue{Kind: BoolValueValue, Value: true}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return ArrayValue{Kind: ArrayValueValue, Value: ArrayPayload{ElementType: input.ElementType, ElementKind: input.ElementKind, Dimensions: input.Dimensions, Elements: elements, NullBitmap: nullBitmap}}
}
func ArrayFromCoercedValue(input ArrayValue, elementType string, elementKind int) ArrayValue {
	input = CopyArrayValue(input)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		if value.ElementType != elementType || value.ElementKind != elementKind {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		return MakeArrayValue(value)
	}
	return input
}
func arrayTreeTypeAt(types string, level int) string {
	types = langruntime.CheckedString(types)
	level = langruntime.CheckedIndex(level)
	characters := []rune(types)
	current := 0
	position := 0
	result := langruntime.NewTextBuffer("")
	for position < len(characters) {
		character := characters[position]
		if character == '\x00' {
			if current == level {
				return string(result)
			}
			current = langruntime.CheckedAdd(current, 1)
		} else if current == level {
			result = append(result, string(langruntime.CheckedChar(character))...)
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return string(result)
}
func arrayTreeIdentityValid(input *ArrayPayload, types string, kinds string, level int) bool {
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	level = langruntime.CheckedIndex(level)
	families := []rune(kinds)
	if level >= len(families) {
		return false
	}
	family := int(langruntime.CheckedChar(families[level]))
	expectedType := arrayTreeTypeAt(types, level)
	if input.ElementType != expectedType || input.ElementKind != family {
		return false
	}
	if family != 41 {
		return langruntime.CheckedAdd(level, 1) == len(families)
	}
	if langruntime.CheckedAdd(level, 1) >= len(families) {
		return false
	}
	index := 0
	for index < len(input.Elements) {
		element := CopyArrayElement(input.Elements[index])
		if element.Kind == ArrayElementArray {
			nested := CopyArrayPayload(element.Array)
			if arrayTreeIdentityValid(&nested, types, kinds, langruntime.CheckedAdd(level, 1)) == false {
				return false
			}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return true
}
func ArrayFromCoercedTree(input ArrayValue, types string, kinds string) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&value, types, kinds, 0) == false {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		return MakeArrayValue(value)
	}
	return input
}
func arrayRangeElementIdentity(input *ArrayPayload, position int, typeName string, elementType string, elementKind int) bool {
	position = langruntime.CheckedIndex(position)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	element := CopyArrayElement(input.Elements[position])
	if element.Kind == ArrayElementArray {
		nested := CopyArrayPayload(element.Array)
		return arrayRangeIdentityValid(&nested, typeName, elementType, elementKind)
	}
	if element.Kind == ArrayElementRange {
		payload := CopyRangePayload(element.Range)
		return payload.TypeName == typeName && payload.ElementType == elementType && payload.ElementKind == elementKind
	}
	return true
}
func arrayRangeIdentityValid(input *ArrayPayload, typeName string, elementType string, elementKind int) bool {
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	position := 0
	for position < len(input.Elements) {
		if arrayRangeElementIdentity(input, position, typeName, elementType, elementKind) == false {
			return false
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return true
}
func ArrayFromCoercedRangeTree(input ArrayValue, types string, kinds string, typeName string, elementType string, elementKind int) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayRangeIdentityValid(&payload, typeName, elementType, elementKind) == false {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		return MakeArrayValue(payload)
	}
	return input
}
func arrayMultirangeElementIdentity(input *ArrayPayload, position int, typeName string, rangeType string, elementType string, elementKind int) bool {
	position = langruntime.CheckedIndex(position)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	element := CopyArrayElement(input.Elements[position])
	if element.Kind == ArrayElementArray {
		nested := CopyArrayPayload(element.Array)
		return arrayMultirangeIdentityValid(&nested, typeName, rangeType, elementType, elementKind)
	}
	if element.Kind == ArrayElementMultirange {
		payload := CopyMultirangePayload(element.Multirange)
		if payload.TypeName != typeName || payload.RangeType != rangeType || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return false
		}
		member := 0
		for member < len(payload.Ranges) {
			span := CopyRangeValue(payload.Ranges[member])
			if span.Kind == RangeValueValue {
				value := CopyRangePayload(span.Value)
				if value.TypeName != rangeType || value.ElementType != elementType || value.ElementKind != elementKind {
					return false
				}
			}
			member = langruntime.CheckedAdd(member, 1)
		}
	}
	return true
}
func arrayMultirangeIdentityValid(input *ArrayPayload, typeName string, rangeType string, elementType string, elementKind int) bool {
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	position := 0
	for position < len(input.Elements) {
		if arrayMultirangeElementIdentity(input, position, typeName, rangeType, elementType, elementKind) == false {
			return false
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return true
}
func ArrayFromCoercedMultirangeTree(input ArrayValue, types string, kinds string, typeName string, rangeType string, elementType string, elementKind int) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayMultirangeIdentityValid(&payload, typeName, rangeType, elementType, elementKind) == false {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		return MakeArrayValue(payload)
	}
	return input
}
func arrayElementWithRangeProfile(input ArrayElement, multirangeType string, rangeType string, elementType string, elementKind int, comparison int, canonical int) ArrayElement {
	input = CopyArrayElement(input)
	multirangeType = langruntime.CheckedString(multirangeType)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	if input.Kind == ArrayElementArray {
		nested := CopyArrayPayload(input.Array)
		converted := arrayWithRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: nested}, multirangeType, rangeType, elementType, elementKind, comparison, canonical)
		return ArrayElementFromArray(converted)
	}
	if input.Kind == ArrayElementRange {
		span := CopyRangePayload(input.Range)
		converted := RangeFromCoercedProfile(RangeValue{Kind: RangeValueValue, Value: span}, rangeType, elementType, elementKind, comparison, canonical)
		return ArrayElementFromRange(converted)
	}
	if input.Kind == ArrayElementMultirange {
		spans := CopyMultirangePayload(input.Multirange)
		converted := MultirangeFromCoercedProfile(MultirangeValue{Kind: MultirangeValueValue, Value: spans}, multirangeType, rangeType, elementType, elementKind, comparison, canonical)
		return ArrayElementFromMultirange(converted)
	}
	return input
}
func arrayWithRangeProfile(input ArrayValue, multirangeType string, rangeType string, elementType string, elementKind int, comparison int, canonical int) ArrayValue {
	input = CopyArrayValue(input)
	multirangeType = langruntime.CheckedString(multirangeType)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		elements := payload.Elements
		position := 0
		for position < len(elements) {
			element := CopyArrayElement(elements[position])
			convert := true
			if element.Kind == ArrayElementUnknown {
				convert = false
			}
			if convert {
				converted := arrayElementWithRangeProfile(element, multirangeType, rangeType, elementType, elementKind, comparison, canonical)
				if converted.Kind == ArrayElementError {
					error := converted.Error
					return ArrayValue{Kind: ArrayValueError, Error: error}
				}
				if converted.Kind == ArrayElementUnknown {
					return ArrayValue{Kind: ArrayValueUnknown}
				}
				elements[position] = CopyArrayElement(converted)
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		return MakeArrayValue(ArrayPayload{NullBitmap: payload.NullBitmap, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Dimensions: payload.Dimensions, Elements: elements})
	}
	return input
}
func ArrayFromCoercedRangeProfileTree(input ArrayValue, types string, kinds string, typeName string, elementType string, elementKind int, comparison int, canonical int) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayRangeIdentityValid(&payload, typeName, elementType, elementKind) == false {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		return arrayWithRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: payload}, "", typeName, elementType, elementKind, comparison, canonical)
	}
	return input
}
func ArrayFromCoercedMultirangeProfileTree(input ArrayValue, types string, kinds string, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayMultirangeIdentityValid(&payload, typeName, rangeType, elementType, elementKind) == false {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		return arrayWithRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: payload}, typeName, rangeType, elementType, elementKind, comparison, canonical)
	}
	return input
}
func MakeArrayArguments(elementType string, elementKind int) ArrayArguments {
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	dimensions := []ArrayDimension{}
	elements := []ArrayElement{}
	return ArrayArguments{Kind: ArrayArgumentsValue, Value: ArrayPayload{NullBitmap: BoolValue{Kind: BoolValueValue, Value: false}, ElementType: elementType, ElementKind: elementKind, Dimensions: dimensions, Elements: elements}}
}
func AppendArrayDimension(input ArrayArguments, lower int, length int) ArrayArguments {
	input = CopyArrayArguments(input)
	lower = langruntime.CheckedI32(lower)
	length = langruntime.CheckedI32(length)
	if input.Kind == ArrayArgumentsValue {
		value := CopyArrayPayload(input.Value)
		dimensions := value.Dimensions
		langruntime.CheckedAdd(len(dimensions), 1)
		dimensions = append(dimensions, ArrayDimension{Lower: lower, Length: length})
		return ArrayArguments{Kind: ArrayArgumentsValue, Value: ArrayPayload{NullBitmap: value.NullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: dimensions, Elements: value.Elements}}
	}
	return input
}
func AppendArrayArgument(input ArrayArguments, element ArrayElement) ArrayArguments {
	input = CopyArrayArguments(input)
	element = CopyArrayElement(element)
	if input.Kind == ArrayArgumentsError {
		return input
	}
	if element.Kind == ArrayElementError {
		error := element.Error
		return ArrayArguments{Kind: ArrayArgumentsError, Error: error}
	}
	if input.Kind == ArrayArgumentsValue {
		value := CopyArrayPayload(input.Value)
		nullBitmap := ArrayBitmapUnion(value.NullBitmap, ArrayElementBitmap(CopyArrayElement(element)))
		elements := value.Elements
		langruntime.CheckedAdd(len(elements), 1)
		elements = append(elements, CopyArrayElement(element))
		return ArrayArguments{Kind: ArrayArgumentsValue, Value: ArrayPayload{NullBitmap: nullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: value.Dimensions, Elements: elements}}
	}
	return input
}
func FinishArrayArguments(input ArrayArguments) ArrayValue {
	input = CopyArrayArguments(input)
	if input.Kind == ArrayArgumentsError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if input.Kind == ArrayArgumentsValue {
		value := CopyArrayPayload(input.Value)
		return MakeArrayValue(value)
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}
func ArrayFlatElement(input ArrayValue, offset Int4Value) ArrayElement {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if offset.Kind == Int4ValueError {
		error := offset.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if offset.Kind == Int4ValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		if offset.Kind == Int4ValueValue {
			index := langruntime.CheckedI32(offset.Value)
			if index < 0 {
				return ArrayElement{Kind: ArrayElementNull}
			}
			position := langruntime.IndexFromI32(index, 0)
			if position >= len(value.Elements) {
				return ArrayElement{Kind: ArrayElementNull}
			}
			return CopyArrayElement(value.Elements[position])
		}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func FinishArrayConstructor(input ArrayArguments) ArrayValue {
	input = CopyArrayArguments(input)
	if input.Kind == ArrayArgumentsError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if input.Kind == ArrayArgumentsValue {
		value := CopyArrayPayload(input.Value)
		dimensions := []ArrayDimension{}
		if len(value.Elements) > 0 {
			langruntime.CheckedAdd(len(dimensions), 1)
			dimensions = append(dimensions, ArrayDimension{Lower: 1, Length: int(int32(len(value.Elements)))})
		}
		return MakeArrayValue(ArrayPayload{NullBitmap: value.NullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: dimensions, Elements: value.Elements})
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}

type ArrayChildrenPayload struct {
	ElementType string
	ElementKind int
	Arrays      []ArrayValue
}

func copyArrayChildrenPayload(value ArrayChildrenPayload) ArrayChildrenPayload {
	return ArrayChildrenPayload{ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Arrays: langruntime.CheckedStructs(value.Arrays, CopyArrayValue)}
}

type ArrayChildrenArgumentsKind uint8

const (
	ArrayChildrenArgumentsUnknown ArrayChildrenArgumentsKind = iota
	ArrayChildrenArgumentsError
	ArrayChildrenArgumentsValue
)

type ArrayChildrenArguments struct {
	Kind  ArrayChildrenArgumentsKind
	Error SqlError
	Value ArrayChildrenPayload
}

func copyArrayChildrenArguments(value ArrayChildrenArguments) ArrayChildrenArguments {
	switch value.Kind {
	case ArrayChildrenArgumentsUnknown:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsUnknown}
	case ArrayChildrenArgumentsError:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsError, Error: value.Error}
	case ArrayChildrenArgumentsValue:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsValue, Value: copyArrayChildrenPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func MakeArrayChildren(elementType string, elementKind int) ArrayChildrenArguments {
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	arrays := []ArrayValue{}
	return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsValue, Value: ArrayChildrenPayload{ElementType: elementType, ElementKind: elementKind, Arrays: arrays}}
}
func AppendArrayChild(input ArrayChildrenArguments, child ArrayValue) ArrayChildrenArguments {
	input = copyArrayChildrenArguments(input)
	child = CopyArrayValue(child)
	if input.Kind == ArrayChildrenArgumentsError {
		return input
	}
	if child.Kind == ArrayValueError {
		error := child.Error
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsError, Error: error}
	}
	if input.Kind == ArrayChildrenArgumentsValue {
		value := copyArrayChildrenPayload(input.Value)
		arrays := value.Arrays
		langruntime.CheckedAdd(len(arrays), 1)
		arrays = append(arrays, CopyArrayValue(child))
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsValue, Value: ArrayChildrenPayload{ElementType: value.ElementType, ElementKind: value.ElementKind, Arrays: arrays}}
	}
	return input
}
func FinishArrayChildren(input ArrayChildrenArguments) ArrayValue {
	input = copyArrayChildrenArguments(input)
	if input.Kind == ArrayChildrenArgumentsError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if input.Kind == ArrayChildrenArgumentsValue {
		value := copyArrayChildrenPayload(input.Value)
		position := 0
		for position < len(value.Arrays) {
			child := CopyArrayValue(value.Arrays[position])
			if child.Kind == ArrayValueUnknown {
				return ArrayValue{Kind: ArrayValueUnknown}
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		dimensions := []ArrayDimension{}
		elements := []ArrayElement{}
		empty := false
		nullBitmap := BoolValue{Kind: BoolValueValue, Value: false}
		position = langruntime.CheckedIndex(0)
		for position < len(value.Arrays) {
			child := CopyArrayValue(value.Arrays[position])
			if child.Kind == ArrayValueNull {
				empty = true
			}
			if child.Kind == ArrayValueValue {
				array := CopyArrayPayload(child.Value)
				if array.ElementType != value.ElementType || array.ElementKind != value.ElementKind {
					return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(arrayConstructorTypeMismatch)}
				}
				if len(array.Dimensions) == 0 {
					empty = true
				} else {
					nullBitmap = ArrayBitmapUnion(nullBitmap, array.NullBitmap)
					if len(dimensions) == 0 {
						if len(array.Dimensions) >= 6 {
							return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(sqlErrorProgramLimit)}
						}
						langruntime.CheckedAdd(len(dimensions), 1)
						dimensions = append(dimensions, ArrayDimension{Lower: 1, Length: int(int32(len(value.Arrays)))})
						index := 0
						for index < len(array.Dimensions) {
							langruntime.CheckedAdd(len(dimensions), 1)
							dimensions = append(dimensions, array.Dimensions[index])
							index = langruntime.CheckedAdd(index, 1)
						}
					} else {
						if len(dimensions) != langruntime.CheckedAdd(len(array.Dimensions), 1) {
							return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(sqlErrorArraySubscript)}
						}
						index := 0
						for index < len(array.Dimensions) {
							expected := dimensions[langruntime.CheckedAdd(index, 1)]
							actual := array.Dimensions[index]
							if expected.Lower != actual.Lower || expected.Length != actual.Length {
								return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(sqlErrorArraySubscript)}
							}
							index = langruntime.CheckedAdd(index, 1)
						}
					}
					if langruntime.CheckedI64Add(int64(langruntime.CheckedI32((int(int32(len(elements)))))), int64(langruntime.CheckedI32((int(int32(len(array.Elements))))))) > int64(2147483647) {
						return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(sqlErrorProgramLimit)}
					}
					index := 0
					for index < len(array.Elements) {
						langruntime.CheckedAdd(len(elements), 1)
						elements = append(elements, CopyArrayElement(CopyArrayElement(array.Elements[index])))
						index = langruntime.CheckedAdd(index, 1)
					}
				}
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		if empty && len(dimensions) > 0 {
			return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(sqlErrorArraySubscript)}
		}
		axis := 0
		for axis < len(dimensions) {
			dimension := dimensions[axis]
			if langruntime.CheckedI64Add((int64(langruntime.CheckedI32(dimension.Lower))), (int64(langruntime.CheckedI32(dimension.Length)))) > int64(2147483647) {
				return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(sqlErrorProgramLimit)}
			}
			axis = langruntime.CheckedAdd(axis, 1)
		}
		return MakeArrayValue(ArrayPayload{NullBitmap: nullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: dimensions, Elements: elements})
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}

const arrayConstructorTypeMismatch = 6822148

type arrayTextSource struct {
	characters []rune
}

func copyarrayTextSource(value arrayTextSource) arrayTextSource {
	return arrayTextSource{characters: langruntime.CheckedChars(value.characters)}
}

type ArrayTextPayload struct {
	State      int
	Dimensions []ArrayDimension
	Events     []ArrayTextEvent
}

func CopyArrayTextPayload(value ArrayTextPayload) ArrayTextPayload {
	return ArrayTextPayload{State: langruntime.CheckedI32(value.State), Dimensions: langruntime.CheckedStructs(value.Dimensions, copyArrayDimension), Events: langruntime.CheckedStructs(value.Events, CopyArrayTextEvent)}
}

type ArrayTextPlanKind uint8

const (
	ArrayTextPlanUnknown ArrayTextPlanKind = iota
	ArrayTextPlanNull
	ArrayTextPlanValue
)

type ArrayTextPlan struct {
	Kind  ArrayTextPlanKind
	Value ArrayTextPayload
}

func copyArrayTextPlan(value ArrayTextPlan) ArrayTextPlan {
	switch value.Kind {
	case ArrayTextPlanUnknown:
		return ArrayTextPlan{Kind: ArrayTextPlanUnknown}
	case ArrayTextPlanNull:
		return ArrayTextPlan{Kind: ArrayTextPlanNull}
	case ArrayTextPlanValue:
		return ArrayTextPlan{Kind: ArrayTextPlanValue, Value: CopyArrayTextPayload(value.Value)}
	}
	panic("unknown enum variant")
}

type ArrayTextEventKind uint8

const (
	ArrayTextEventText ArrayTextEventKind = iota
	ArrayTextEventNull
	ArrayTextEventUnknown
	ArrayTextEventError
)

type ArrayTextEvent struct {
	Kind  ArrayTextEventKind
	Text  string
	Error SqlError
}

func CopyArrayTextEvent(value ArrayTextEvent) ArrayTextEvent {
	switch value.Kind {
	case ArrayTextEventText:
		return ArrayTextEvent{Kind: ArrayTextEventText, Text: langruntime.CheckedString(value.Text)}
	case ArrayTextEventNull:
		return ArrayTextEvent{Kind: ArrayTextEventNull}
	case ArrayTextEventUnknown:
		return ArrayTextEvent{Kind: ArrayTextEventUnknown}
	case ArrayTextEventError:
		return ArrayTextEvent{Kind: ArrayTextEventError, Error: value.Error}
	}
	panic("unknown enum variant")
}

type arrayTextToken struct {
	next int
	kind int
	text string
}

func copyarrayTextToken(value arrayTextToken) arrayTextToken {
	return arrayTextToken{next: langruntime.CheckedIndex(value.next), kind: langruntime.CheckedI32(value.kind), text: langruntime.CheckedString(value.text)}
}

type arrayTextBound struct {
	next     int
	value    int64
	found    bool
	overflow bool
}

func copyarrayTextBound(value arrayTextBound) arrayTextBound {
	return arrayTextBound{next: langruntime.CheckedIndex(value.next), value: value.value, found: value.found, overflow: value.overflow}
}

const arrayTextInvalid = 3484946

func arrayTextSpace(ch rune) bool {
	ch = langruntime.CheckedChar(ch)
	return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\v' || ch == '\f'
}
func arrayTextDigit(ch rune) bool {
	ch = langruntime.CheckedChar(ch)
	code := int(langruntime.CheckedChar(ch))
	return code >= 48 && code <= 57
}
func arrayTextSkipSpace(source *arrayTextSource, start int) int {
	start = langruntime.CheckedIndex(start)
	position := start
	for position < len(source.characters) && arrayTextSpace(source.characters[position]) {
		position = langruntime.CheckedAdd(position, 1)
	}
	return position
}
func arrayTextReadBound(source *arrayTextSource, start int) arrayTextBound {
	start = langruntime.CheckedIndex(start)
	position := start
	negative := false
	if position < len(source.characters) && (source.characters[position] == '-' || source.characters[position] == '+') {
		negative = source.characters[position] == '-'
		position = langruntime.CheckedAdd(position, 1)
	}
	digits := position
	value := int64(0)
	overflow := false
	for position < len(source.characters) && arrayTextDigit(source.characters[position]) {
		if value > int64(2147483648) {
			overflow = true
		} else {
			value = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(value, int64(10)), (int64(langruntime.CheckedI32((langruntime.CheckedSignedSubtract(int(langruntime.CheckedChar(source.characters[position])), 48))))))
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	if negative {
		value = langruntime.CheckedI64Subtract(int64(0), value)
	}
	if value < int64(-2147483648) || value > int64(2147483647) {
		overflow = true
	}
	if position == digits {
		return arrayTextBound{next: start, value: int64(0), found: false, overflow: false}
	}
	return arrayTextBound{next: position, value: value, found: true, overflow: overflow}
}
func arrayTextReadToken(source *arrayTextSource, start int, delimiter rune) arrayTextToken {
	start = langruntime.CheckedIndex(start)
	delimiter = langruntime.CheckedChar(delimiter)
	position := arrayTextSkipSpace(source, start)
	if position >= len(source.characters) {
		return arrayTextToken{next: position, kind: 0, text: ""}
	}
	first := source.characters[position]
	if first == '{' {
		return arrayTextToken{next: langruntime.CheckedAdd(position, 1), kind: 1, text: ""}
	}
	if first == '}' {
		return arrayTextToken{next: langruntime.CheckedAdd(position, 1), kind: 2, text: ""}
	}
	if first == delimiter {
		return arrayTextToken{next: langruntime.CheckedAdd(position, 1), kind: 3, text: ""}
	}
	quoted := first == '"'
	if quoted {
		position = langruntime.CheckedAdd(position, 1)
	}
	characters := []rune{}
	retained := 0
	escaped := false
	finished := false
	for position < len(source.characters) && finished == false {
		ch := source.characters[position]
		if ch == '\\' {
			position = langruntime.CheckedAdd(position, 1)
			if position >= len(source.characters) {
				return arrayTextToken{next: position, kind: 0, text: ""}
			}
			langruntime.CheckedAdd(len(characters), 1)
			characters = append(characters, langruntime.CheckedChar(source.characters[position]))
			retained = langruntime.CheckedIndex(len(characters))
			escaped = true
			position = langruntime.CheckedAdd(position, 1)
		} else if quoted && ch == '"' {
			position = langruntime.CheckedIndex(arrayTextSkipSpace(source, langruntime.CheckedAdd(position, 1)))
			if position >= len(source.characters) {
				return arrayTextToken{next: position, kind: 0, text: ""}
			}
			following := source.characters[position]
			if following != delimiter && following != '}' && following != '{' {
				return arrayTextToken{next: position, kind: 0, text: ""}
			}
			retained = langruntime.CheckedIndex(len(characters))
			finished = true
		} else if quoted == false && (ch == delimiter || ch == '}') {
			finished = true
		} else if quoted == false && (ch == '"' || ch == '{') {
			return arrayTextToken{next: position, kind: 0, text: ""}
		} else {
			langruntime.CheckedAdd(len(characters), 1)
			characters = append(characters, langruntime.CheckedChar(ch))
			if arrayTextSpace(ch) == false {
				retained = langruntime.CheckedIndex(len(characters))
			}
			position = langruntime.CheckedAdd(position, 1)
		}
	}
	if finished == false {
		return arrayTextToken{next: position, kind: 0, text: ""}
	}
	text := langruntime.NewTextBuffer("")
	index := 0
	for index < retained {
		text = append(text, string(langruntime.CheckedChar(characters[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	nullToken := false
	if quoted == false && escaped == false && retained == 4 {
		nullToken = (characters[0] == 'N' || characters[0] == 'n') && (characters[1] == 'U' || characters[1] == 'u') && (characters[2] == 'L' || characters[2] == 'l') && (characters[3] == 'L' || characters[3] == 'l')
	}
	if nullToken {
		return arrayTextToken{next: position, kind: 5, text: string(text)}
	}
	return arrayTextToken{next: position, kind: 4, text: string(text)}
}
func arrayTextResult(dimensions []ArrayDimension, input []ArrayTextEvent, error int) ArrayTextPlan {
	dimensions = langruntime.CheckedStructs(dimensions, copyArrayDimension)
	input = langruntime.CheckedStructs(input, CopyArrayTextEvent)
	error = langruntime.CheckedIndex(error)
	events := input
	if error != 0 {
		langruntime.CheckedAdd(len(events), 1)
		events = append(events, CopyArrayTextEvent(ArrayTextEvent{Kind: ArrayTextEventError, Error: MakeSqlError(error)}))
	}
	return ArrayTextPlan{Kind: ArrayTextPlanValue, Value: ArrayTextPayload{State: 1, Dimensions: dimensions, Events: events}}
}
func ParseArrayText(input TextValue, delimiter rune, nulls int) ArrayTextPlan {
	delimiter = langruntime.CheckedChar(delimiter)
	nulls = langruntime.CheckedI32(nulls)
	if input.Kind == TextValueUnknown {
		return ArrayTextPlan{Kind: ArrayTextPlanUnknown}
	}
	if input.Kind == TextValueNull {
		return ArrayTextPlan{Kind: ArrayTextPlanNull}
	}
	dimensions := []ArrayDimension{}
	events := []ArrayTextEvent{}
	if input.Kind == TextValueError {
		error := input.Error
		langruntime.CheckedAdd(len(events), 1)
		events = append(events, CopyArrayTextEvent(ArrayTextEvent{Kind: ArrayTextEventError, Error: error}))
		return arrayTextResult(dimensions, events, 0)
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		characters := []rune(value)
		source := arrayTextSource{characters: characters}
		index := 0
		levels := []ArrayDimension{}
		for index < 6 {
			langruntime.CheckedAdd(len(dimensions), 1)
			dimensions = append(dimensions, ArrayDimension{Lower: 1, Length: langruntime.CheckedSignedNegate(1)})
			langruntime.CheckedAdd(len(levels), 1)
			levels = append(levels, ArrayDimension{Lower: 1, Length: 0})
			index = langruntime.CheckedAdd(index, 1)
		}
		position := arrayTextSkipSpace(&source, 0)
		rank := 0
		for position < len(source.characters) && source.characters[position] == '[' {
			if rank >= 6 {
				return arrayTextResult(dimensions, events, sqlErrorProgramLimit)
			}
			first := arrayTextReadBound(&source, langruntime.CheckedAdd(position, 1))
			if first.overflow {
				return arrayTextResult(dimensions, events, sqlErrorProgramLimit)
			}
			if first.found == false {
				return arrayTextResult(dimensions, events, arrayTextInvalid)
			}
			position = langruntime.CheckedIndex(first.next)
			lower := int64(1)
			upper := first.value
			if position < len(source.characters) && source.characters[position] == ':' {
				lower = first.value
				last := arrayTextReadBound(&source, langruntime.CheckedAdd(position, 1))
				if last.overflow {
					return arrayTextResult(dimensions, events, sqlErrorProgramLimit)
				}
				if last.found == false {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				upper = last.value
				position = langruntime.CheckedIndex(last.next)
			}
			if position >= len(source.characters) || source.characters[position] != ']' {
				return arrayTextResult(dimensions, events, arrayTextInvalid)
			}
			if upper < lower {
				return arrayTextResult(dimensions, events, sqlErrorArraySubscript)
			}
			length := langruntime.CheckedI64Add(langruntime.CheckedI64Subtract(upper, lower), int64(1))
			if upper == int64(2147483647) || length > int64(2147483647) {
				return arrayTextResult(dimensions, events, sqlErrorProgramLimit)
			}
			dimensions[rank] = ArrayDimension{Lower: int(int32(lower)), Length: int(int32(length))}
			rank = langruntime.CheckedAdd(rank, 1)
			position = langruntime.CheckedIndex(arrayTextSkipSpace(&source, langruntime.CheckedAdd(position, 1)))
		}
		frozen := rank > 0
		if frozen {
			if position >= len(source.characters) || source.characters[position] != '=' {
				return arrayTextResult(dimensions, events, arrayTextInvalid)
			}
			position = langruntime.CheckedIndex(arrayTextSkipSpace(&source, langruntime.CheckedAdd(position, 1)))
		}
		if position >= len(source.characters) || source.characters[position] != '{' {
			return arrayTextResult(dimensions, events, arrayTextInvalid)
		}
		nesting := 0
		count := 0
		expectDelimiter := false
		completed := false
		for completed == false {
			token := arrayTextReadToken(&source, position, delimiter)
			position = langruntime.CheckedIndex(token.next)
			kind := token.kind
			if kind == 0 {
				return arrayTextResult(dimensions, events, arrayTextInvalid)
			}
			if kind == 1 {
				if expectDelimiter {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				if nesting >= 6 {
					return arrayTextResult(dimensions, events, sqlErrorProgramLimit)
				}
				levels[nesting] = ArrayDimension{Lower: 1, Length: 0}
				nesting = langruntime.CheckedAdd(nesting, 1)
				if nesting > rank {
					if frozen {
						return arrayTextResult(dimensions, events, arrayTextInvalid)
					}
					rank = langruntime.CheckedIndex(nesting)
				}
			}
			if kind == 2 {
				level := levels[langruntime.CheckedSubtract(nesting, 1)]
				if level.Length > 0 && expectDelimiter == false {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				nesting = langruntime.CheckedIndex(langruntime.CheckedSubtract(nesting, 1))
				if nesting > 0 {
					outer := levels[langruntime.CheckedSubtract(nesting, 1)]
					levels[langruntime.CheckedSubtract(nesting, 1)] = ArrayDimension{Lower: 1, Length: langruntime.CheckedSignedAdd(outer.Length, 1)}
				}
				dimension := dimensions[nesting]
				if dimension.Length < 0 {
					dimensions[nesting] = ArrayDimension{Lower: dimension.Lower, Length: level.Length}
				} else if dimension.Length != level.Length {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				expectDelimiter = true
				completed = nesting == 0
			}
			if kind == 3 {
				if expectDelimiter == false {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				expectDelimiter = false
			}
			element := false
			if kind == 4 {
				text := langruntime.CheckedString(token.text)
				if expectDelimiter {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				langruntime.CheckedAdd(len(events), 1)
				events = append(events, CopyArrayTextEvent(ArrayTextEvent{Kind: ArrayTextEventText, Text: text}))
				element = true
			}
			if kind == 5 {
				text := token.text
				if expectDelimiter {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				if nulls == 1 {
					langruntime.CheckedAdd(len(events), 1)
					events = append(events, CopyArrayTextEvent(ArrayTextEvent{Kind: ArrayTextEventNull}))
				} else if nulls == 0 {
					langruntime.CheckedAdd(len(events), 1)
					events = append(events, CopyArrayTextEvent(ArrayTextEvent{Kind: ArrayTextEventText, Text: text}))
				} else {
					langruntime.CheckedAdd(len(events), 1)
					events = append(events, CopyArrayTextEvent(ArrayTextEvent{Kind: ArrayTextEventUnknown}))
					return arrayTextResult(dimensions, events, 0)
				}
				element = true
			}
			if element {
				count = langruntime.CheckedAdd(count, 1)
				frozen = true
				if nesting != rank {
					return arrayTextResult(dimensions, events, arrayTextInvalid)
				}
				level := levels[langruntime.CheckedSubtract(nesting, 1)]
				levels[langruntime.CheckedSubtract(nesting, 1)] = ArrayDimension{Lower: 1, Length: langruntime.CheckedSignedAdd(level.Length, 1)}
				expectDelimiter = true
			}
		}
		position = langruntime.CheckedIndex(arrayTextSkipSpace(&source, position))
		if position != len(source.characters) {
			return arrayTextResult(dimensions, events, arrayTextInvalid)
		}
		resultDimensions := []ArrayDimension{}
		if count > 0 {
			index = langruntime.CheckedIndex(0)
			for index < rank {
				langruntime.CheckedAdd(len(resultDimensions), 1)
				resultDimensions = append(resultDimensions, dimensions[index])
				index = langruntime.CheckedAdd(index, 1)
			}
		}
		return arrayTextResult(resultDimensions, events, 0)
	}
	return ArrayTextPlan{Kind: ArrayTextPlanUnknown}
}
func ArrayTextEventCount(input *ArrayTextPayload) Int4Value {
	return Int4Value{Kind: Int4ValueValue, Value: int(int32(len(input.Events)))}
}
func ArrayTextEventAt(input *ArrayTextPayload, index Int4Value) TextValue {
	if index.Kind == Int4ValueError {
		error := index.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if index.Kind == Int4ValueValue {
		position := langruntime.CheckedI32(index.Value)
		if position < 0 {
			return TextValue{Kind: TextValueUnknown}
		}
		offset := langruntime.IndexFromI32(position, 0)
		if offset >= len(input.Events) {
			return TextValue{Kind: TextValueUnknown}
		}
		event := CopyArrayTextEvent(input.Events[offset])
		if event.Kind == ArrayTextEventText {
			text := langruntime.CheckedString(event.Text)
			return TextValue{Kind: TextValueValue, Value: text}
		}
		if event.Kind == ArrayTextEventNull {
			return TextValue{Kind: TextValueNull}
		}
		if event.Kind == ArrayTextEventError {
			error := event.Error
			return TextValue{Kind: TextValueError, Error: error}
		}
	}
	return TextValue{Kind: TextValueUnknown}
}
func FinishArrayText(plan ArrayTextPlan, converted ArrayArguments) ArrayValue {
	plan = copyArrayTextPlan(plan)
	converted = CopyArrayArguments(converted)
	if converted.Kind == ArrayArgumentsError {
		error := converted.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if plan.Kind == ArrayTextPlanNull {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if plan.Kind == ArrayTextPlanValue {
		payload := CopyArrayTextPayload(plan.Value)
		index := 0
		for index < len(payload.Events) {
			event := CopyArrayTextEvent(payload.Events[index])
			if event.Kind == ArrayTextEventError {
				error := event.Error
				return ArrayValue{Kind: ArrayValueError, Error: error}
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		if converted.Kind == ArrayArgumentsValue {
			value := CopyArrayPayload(converted.Value)
			index = langruntime.CheckedIndex(0)
			for index < len(value.Elements) {
				element := CopyArrayElement(value.Elements[index])
				if element.Kind == ArrayElementUnknown {
					if value.ElementType != "pg_catalog.name" {
						return ArrayValue{Kind: ArrayValueUnknown}
					}
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			return MakeArrayValue(ArrayPayload{NullBitmap: value.NullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: payload.Dimensions, Elements: value.Elements})
		}
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}
func PrepareArrayText(input TextValue, boxDelimiter bool, nulls int) ArrayTextPayload {
	nulls = langruntime.CheckedI32(nulls)
	delimiter := ','
	if boxDelimiter {
		delimiter = langruntime.CheckedChar(';')
	}
	plan := ParseArrayText(input, delimiter, nulls)
	if plan.Kind == ArrayTextPlanValue {
		payload := CopyArrayTextPayload(plan.Value)
		return payload
	}
	state := langruntime.CheckedSignedNegate(1)
	if plan.Kind == ArrayTextPlanNull {
		state = langruntime.CheckedI32(0)
	}
	dimensions := []ArrayDimension{}
	events := []ArrayTextEvent{}
	return ArrayTextPayload{State: state, Dimensions: dimensions, Events: events}
}
func ArrayTextHasEvent(input *ArrayTextPayload, index Int4Value) bool {
	if input.State != 1 {
		return false
	}
	if index.Kind == Int4ValueValue {
		position := langruntime.CheckedI32(index.Value)
		return position >= 0 && ((int64(langruntime.CheckedI32(position))) < (int64(langruntime.CheckedI32((int(int32(len(input.Events))))))))
	}
	return false
}
func ArrayTextEventNeedsInput(input *ArrayTextPayload, index Int4Value) bool {
	input = langruntime.CheckedBorrowed(input, CopyArrayTextPayload)
	if index.Kind == Int4ValueValue {
		position := langruntime.CheckedI32(index.Value)
		if position >= 0 && (int64(langruntime.CheckedI32(position))) < (int64(langruntime.CheckedI32((int(int32(len(input.Events))))))) {
			event := CopyArrayTextEvent(input.Events[langruntime.IndexFromI32(position, 0)])
			if event.Kind == ArrayTextEventError {
				return false
			}
			return true
		}
	}
	return false
}
func ArrayTextNextIndex(input Int4Value) Int4Value {
	if input.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value < 2147483647 {
			return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedAdd(value, 1)}
		}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func FinishPreparedArrayText(input ArrayTextPayload, converted ArrayArguments) ArrayValue {
	input = CopyArrayTextPayload(input)
	converted = CopyArrayArguments(converted)
	if input.State == 0 {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if input.State != 1 {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	return FinishArrayText(ArrayTextPlan{Kind: ArrayTextPlanValue, Value: input}, converted)
}

type ArraySubscriptBound struct {
	Provided bool
	State    int
	Value    int
}

func copyArraySubscriptBound(value ArraySubscriptBound) ArraySubscriptBound {
	return ArraySubscriptBound{Provided: value.Provided, State: langruntime.CheckedI32(value.State), Value: langruntime.CheckedI32(value.Value)}
}

type ArraySubscriptPayload struct {
	Upper []ArraySubscriptBound
	Lower []ArraySubscriptBound
}

func copyArraySubscriptPayload(value ArraySubscriptPayload) ArraySubscriptPayload {
	return ArraySubscriptPayload{Upper: langruntime.CheckedStructs(value.Upper, copyArraySubscriptBound), Lower: langruntime.CheckedStructs(value.Lower, copyArraySubscriptBound)}
}

type ArraySubscriptsKind uint8

const (
	ArraySubscriptsError ArraySubscriptsKind = iota
	ArraySubscriptsValue
)

type ArraySubscripts struct {
	Kind  ArraySubscriptsKind
	Error SqlError
	Value ArraySubscriptPayload
}

func CopyArraySubscripts(value ArraySubscripts) ArraySubscripts {
	switch value.Kind {
	case ArraySubscriptsError:
		return ArraySubscripts{Kind: ArraySubscriptsError, Error: value.Error}
	case ArraySubscriptsValue:
		return ArraySubscripts{Kind: ArraySubscriptsValue, Value: copyArraySubscriptPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func MakeArraySubscripts() ArraySubscripts {
	upper := []ArraySubscriptBound{}
	lower := []ArraySubscriptBound{}
	return ArraySubscripts{Kind: ArraySubscriptsValue, Value: ArraySubscriptPayload{Upper: upper, Lower: lower}}
}
func AppendArraySubscript(input ArraySubscripts, index Int4Value, isLower bool, provided bool) ArraySubscripts {
	input = CopyArraySubscripts(input)
	if input.Kind == ArraySubscriptsError {
		return input
	}
	if index.Kind == Int4ValueError {
		error := index.Error
		return ArraySubscripts{Kind: ArraySubscriptsError, Error: error}
	}
	if input.Kind == ArraySubscriptsValue {
		payload := copyArraySubscriptPayload(input.Value)
		state := langruntime.CheckedSignedNegate(1)
		value := 0
		if index.Kind == Int4ValueNull {
			state = langruntime.CheckedI32(0)
		}
		if index.Kind == Int4ValueValue {
			number := langruntime.CheckedI32(index.Value)
			state = langruntime.CheckedI32(1)
			value = langruntime.CheckedI32(number)
		}
		bound := ArraySubscriptBound{Provided: provided, State: state, Value: value}
		upper := payload.Upper
		lower := payload.Lower
		if isLower {
			langruntime.CheckedAdd(len(lower), 1)
			lower = append(lower, copyArraySubscriptBound(bound))
		} else {
			langruntime.CheckedAdd(len(upper), 1)
			upper = append(upper, copyArraySubscriptBound(bound))
		}
		return ArraySubscripts{Kind: ArraySubscriptsValue, Value: ArraySubscriptPayload{Upper: upper, Lower: lower}}
	}
	return input
}
func ArraySubscriptContinues(input ArrayValue) bool {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueValue {
		return true
	}
	return false
}
func ArraySubscriptInitial(input ArrayValue) ArrayElement {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func arraySubscriptState(input *ArraySubscriptPayload) int {
	state := 1
	position := 0
	for position < langruntime.CheckedAdd(len(input.Upper), len(input.Lower)) {
		bound := ArraySubscriptBound{Provided: false, State: 1, Value: 0}
		if position < len(input.Upper) {
			bound = copyArraySubscriptBound(input.Upper[position])
		} else {
			bound = copyArraySubscriptBound(input.Lower[langruntime.CheckedSubtract(position, len(input.Upper))])
		}
		if bound.Provided {
			if bound.State == langruntime.CheckedSignedNegate(1) {
				state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
			}
			if bound.State == 0 && state != langruntime.CheckedSignedNegate(1) {
				state = langruntime.CheckedI32(0)
			}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return state
}
func ArrayFetchSubscript(input ArrayValue, indices ArraySubscripts) ArrayElement {
	input = CopyArrayValue(input)
	indices = CopyArraySubscripts(indices)
	if input.Kind == ArrayValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == ArrayValueUnknown {
		return ArrayElement{Kind: ArrayElementUnknown}
	}
	if indices.Kind == ArraySubscriptsError {
		error := indices.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if indices.Kind == ArraySubscriptsValue {
		bounds := copyArraySubscriptPayload(indices.Value)
		state := arraySubscriptState(&bounds)
		if state == langruntime.CheckedSignedNegate(1) {
			return ArrayElement{Kind: ArrayElementUnknown}
		}
		if state == 0 {
			return ArrayElement{Kind: ArrayElementNull}
		}
		if input.Kind == ArrayValueValue {
			payload := CopyArrayPayload(input.Value)
			if len(bounds.Upper) != len(payload.Dimensions) || len(bounds.Upper) == 0 || len(bounds.Lower) != 0 {
				return ArrayElement{Kind: ArrayElementNull}
			}
			offset := int64(0)
			depth := 0
			for depth < len(payload.Dimensions) {
				dimension := payload.Dimensions[depth]
				index := bounds.Upper[depth]
				if index.Provided == false {
					return ArrayElement{Kind: ArrayElementUnknown}
				}
				if langruntime.CheckedI64Add((int64(langruntime.CheckedI32(dimension.Lower))), (int64(langruntime.CheckedI32(dimension.Length)))) > int64(2147483647) {
					return ArrayElement{Kind: ArrayElementNull}
				}
				relative := langruntime.CheckedI64Subtract((int64(langruntime.CheckedI32(index.Value))), (int64(langruntime.CheckedI32(dimension.Lower))))
				if relative < int64(0) || relative >= int64(langruntime.CheckedI32(dimension.Length)) {
					return ArrayElement{Kind: ArrayElementNull}
				}
				offset = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(offset, (int64(langruntime.CheckedI32(dimension.Length)))), relative)
				depth = langruntime.CheckedAdd(depth, 1)
			}
			position := langruntime.IndexFromI32(int(int32(offset)), len(payload.Elements))
			if position < len(payload.Elements) {
				return CopyArrayElement(payload.Elements[position])
			}
		}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}

type arraySliceAxis struct {
	start    int
	length   int
	position int
}

func copyarraySliceAxis(value arraySliceAxis) arraySliceAxis {
	return arraySliceAxis{start: langruntime.CheckedI32(value.start), length: langruntime.CheckedI32(value.length), position: langruntime.CheckedI32(value.position)}
}
func arrayEmptyLike(input *ArrayPayload) ArrayValue {
	identity := input.ElementType
	dimensions := []ArrayDimension{}
	elements := []ArrayElement{}
	return MakeArrayValue(ArrayPayload{NullBitmap: BoolValue{Kind: BoolValueValue, Value: false}, ElementType: identity, ElementKind: input.ElementKind, Dimensions: dimensions, Elements: elements})
}
func ArraySliceSubscript(input ArrayValue, indices ArraySubscripts) ArrayValue {
	input = CopyArrayValue(input)
	indices = CopyArraySubscripts(indices)
	if input.Kind == ArrayValueError {
		return input
	}
	if input.Kind == ArrayValueNull {
		return input
	}
	if input.Kind == ArrayValueUnknown {
		return input
	}
	if indices.Kind == ArraySubscriptsError {
		error := indices.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if indices.Kind == ArraySubscriptsValue {
		bounds := copyArraySubscriptPayload(indices.Value)
		state := arraySubscriptState(&bounds)
		if state == langruntime.CheckedSignedNegate(1) {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		if state == 0 {
			return ArrayValue{Kind: ArrayValueNull}
		}
		if input.Kind == ArrayValueValue {
			payload := CopyArrayPayload(input.Value)
			if len(bounds.Upper) != len(bounds.Lower) || len(bounds.Upper) == 0 {
				return ArrayValue{Kind: ArrayValueUnknown}
			}
			if len(bounds.Upper) > len(payload.Dimensions) || len(payload.Dimensions) == 0 {
				return arrayEmptyLike(&payload)
			}
			axes := []arraySliceAxis{}
			dimensions := []ArrayDimension{}
			depth := 0
			count := 1
			for depth < len(payload.Dimensions) {
				dimension := payload.Dimensions[depth]
				low := int64(langruntime.CheckedI32(dimension.Lower))
				high := langruntime.CheckedI64Subtract(langruntime.CheckedI64Add(low, (int64(langruntime.CheckedI32(dimension.Length)))), int64(1))
				if depth < len(bounds.Upper) {
					first := bounds.Lower[depth]
					last := bounds.Upper[depth]
					if first.Provided && (int64(langruntime.CheckedI32(first.Value))) > low {
						low = int64(langruntime.CheckedI32(first.Value))
					}
					if last.Provided && langruntime.CheckedI64Add((int64(langruntime.CheckedI32(dimension.Lower))), (int64(langruntime.CheckedI32(dimension.Length)))) <= int64(2147483647) && (int64(langruntime.CheckedI32(last.Value))) < high {
						high = int64(langruntime.CheckedI32(last.Value))
					}
				}
				if low > high {
					return arrayEmptyLike(&payload)
				}
				length := int(int32((langruntime.CheckedI64Add(langruntime.CheckedI64Subtract(high, low), int64(1)))))
				start := int(int32((langruntime.CheckedI64Subtract(low, (int64(langruntime.CheckedI32(dimension.Lower)))))))
				langruntime.CheckedAdd(len(axes), 1)
				axes = append(axes, copyarraySliceAxis(arraySliceAxis{start: start, length: length, position: 0}))
				langruntime.CheckedAdd(len(dimensions), 1)
				dimensions = append(dimensions, ArrayDimension{Lower: 1, Length: length})
				count = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(count, length))
				depth = langruntime.CheckedAdd(depth, 1)
			}
			elements := []ArrayElement{}
			position := 0
			for position < count {
				offset := int64(0)
				depth = langruntime.CheckedIndex(0)
				for depth < len(axes) {
					axis := axes[depth]
					offset = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(offset, (int64(langruntime.CheckedI32(payload.Dimensions[depth].Length)))), (int64(langruntime.CheckedI32((langruntime.CheckedSignedAdd(axis.start, axis.position))))))
					depth = langruntime.CheckedAdd(depth, 1)
				}
				index := langruntime.IndexFromI32(int(int32(offset)), len(payload.Elements))
				if index >= len(payload.Elements) {
					return ArrayValue{Kind: ArrayValueUnknown}
				}
				langruntime.CheckedAdd(len(elements), 1)
				elements = append(elements, CopyArrayElement(CopyArrayElement(payload.Elements[index])))
				position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
				depth = langruntime.CheckedIndex(len(axes))
				for depth > 0 {
					depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
					axis := axes[depth]
					next := langruntime.CheckedSignedAdd(axis.position, 1)
					if next < axis.length {
						axes[depth] = copyarraySliceAxis(arraySliceAxis{start: axis.start, length: axis.length, position: next})
						break
					}
					axes[depth] = copyarraySliceAxis(arraySliceAxis{start: axis.start, length: axis.length, position: 0})
				}
			}
			return MakeArrayValue(ArrayPayload{NullBitmap: payload.NullBitmap, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Dimensions: dimensions, Elements: elements})
		}
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}

const arrayComparisonUndefined = 6822435
const arrayComparisonTypeMismatch = 6822148

type ArrayComparisonPayload struct {
	Left  []ArrayElement
	Right []ArrayElement
	Limit int
	State int
	Error SqlError
	Tail  int
	Value int
}

func copyArrayComparisonPayload(value ArrayComparisonPayload) ArrayComparisonPayload {
	return ArrayComparisonPayload{Left: langruntime.CheckedStructs(value.Left, CopyArrayElement), Right: langruntime.CheckedStructs(value.Right, CopyArrayElement), Limit: langruntime.CheckedIndex(value.Limit), State: langruntime.CheckedI32(value.State), Error: value.Error, Tail: langruntime.CheckedI32(value.Tail), Value: langruntime.CheckedI32(value.Value)}
}

type ArrayComparisonPlanKind uint8

const (
	ArrayComparisonPlanValue ArrayComparisonPlanKind = iota
)

type ArrayComparisonPlan struct {
	Kind  ArrayComparisonPlanKind
	Value ArrayComparisonPayload
}

func copyArrayComparisonPlan(value ArrayComparisonPlan) ArrayComparisonPlan {
	switch value.Kind {
	case ArrayComparisonPlanValue:
		return ArrayComparisonPlan{Kind: ArrayComparisonPlanValue, Value: copyArrayComparisonPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func arrayComparisonState(state int, error SqlError, value int) ArrayComparisonPayload {
	state = langruntime.CheckedI32(state)
	value = langruntime.CheckedI32(value)
	left := []ArrayElement{}
	right := []ArrayElement{}
	return ArrayComparisonPayload{Left: left, Right: right, Limit: 0, State: state, Error: error, Tail: 0, Value: value}
}
func arrayShapeOrder(left *ArrayPayload, right *ArrayPayload) int {
	if len(left.Elements) < len(right.Elements) {
		return langruntime.CheckedSignedNegate(1)
	}
	if len(left.Elements) > len(right.Elements) {
		return 1
	}
	if len(left.Dimensions) < len(right.Dimensions) {
		return langruntime.CheckedSignedNegate(1)
	}
	if len(left.Dimensions) > len(right.Dimensions) {
		return 1
	}
	position := 0
	for position < len(left.Dimensions) {
		if left.Dimensions[position].Length < right.Dimensions[position].Length {
			return langruntime.CheckedSignedNegate(1)
		}
		if left.Dimensions[position].Length > right.Dimensions[position].Length {
			return 1
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	position = langruntime.CheckedIndex(0)
	for position < len(left.Dimensions) {
		if left.Dimensions[position].Lower < right.Dimensions[position].Lower {
			return langruntime.CheckedSignedNegate(1)
		}
		if left.Dimensions[position].Lower > right.Dimensions[position].Lower {
			return 1
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return 0
}
func PrepareArrayComparison(left ArrayValue, right ArrayValue, equality bool, available bool) ArrayComparisonPayload {
	left = CopyArrayValue(left)
	right = CopyArrayValue(right)
	if left.Kind == ArrayValueError {
		error := left.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if right.Kind == ArrayValueError {
		error := right.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if left.Kind == ArrayValueUnknown {
		return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
	}
	if right.Kind == ArrayValueUnknown {
		return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
	}
	if left.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if right.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if left.Kind == ArrayValueValue {
		a := CopyArrayPayload(left.Value)
		if right.Kind == ArrayValueValue {
			b := CopyArrayPayload(right.Value)
			if a.ElementType != b.ElementType || a.ElementKind != b.ElementKind {
				return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonTypeMismatch), 0)
			}
			tail := arrayShapeOrder(&a, &b)
			if equality && tail != 0 {
				return arrayComparisonState(2, MakeSqlError(0), 1)
			}
			if available == false {
				return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonUndefined), 0)
			}
			limit := len(a.Elements)
			if len(b.Elements) < limit {
				limit = langruntime.CheckedIndex(len(b.Elements))
			}
			return ArrayComparisonPayload{Left: a.Elements, Right: b.Elements, Limit: limit, State: 1, Error: MakeSqlError(0), Tail: tail, Value: 0}
		}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArrayComparisonInitial(input *ArrayComparisonPayload) Int4Value {
	if input.State == langruntime.CheckedSignedNegate(2) {
		return Int4Value{Kind: Int4ValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	if input.State == 0 {
		return Int4Value{Kind: Int4ValueNull}
	}
	return Int4Value{Kind: Int4ValueValue, Value: input.Value}
}
func ArrayComparisonContinues(input *ArrayComparisonPayload, index Int4Value, result Int4Value) bool {
	if result.Kind == Int4ValueValue {
		comparison := langruntime.CheckedI32(result.Value)
		if index.Kind == Int4ValueValue {
			offset := langruntime.CheckedI32(index.Value)
			return input.State == 1 && comparison == 0 && offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(input.Limit))))))
		}
	}
	return false
}
func ArrayComparisonElementAt(input *ArrayComparisonPayload, index Int4Value, right bool) ArrayElement {
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		position := langruntime.IndexFromI32(offset, input.Limit)
		if offset >= 0 && position < input.Limit {
			if right {
				return CopyArrayElement(input.Right[position])
			}
			return CopyArrayElement(input.Left[position])
		}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayComparisonPair(left ArrayElement, right ArrayElement, equality bool) Int4Value {
	left = CopyArrayElement(left)
	right = CopyArrayElement(right)
	if left.Kind == ArrayElementError {
		error := left.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if right.Kind == ArrayElementError {
		error := right.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if left.Kind == ArrayElementUnknown {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	if right.Kind == ArrayElementUnknown {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	leftNull := false
	rightNull := false
	if left.Kind == ArrayElementNull {
		leftNull = true
	}
	if right.Kind == ArrayElementNull {
		rightNull = true
	}
	if leftNull && rightNull {
		return Int4Value{Kind: Int4ValueValue, Value: 0}
	}
	if leftNull {
		return Int4Value{Kind: Int4ValueValue, Value: 1}
	}
	if rightNull {
		if equality {
			return Int4Value{Kind: Int4ValueValue, Value: 1}
		}
		return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
	}
	return Int4Value{Kind: Int4ValueNull}
}
func ArrayPairRequiresScalar(input Int4Value) bool {
	if input.Kind == Int4ValueNull {
		return true
	}
	return false
}
func ArrayEqualityStep(input BoolValue) Int4Value {
	if input.Kind == BoolValueError {
		error := input.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if input.Kind == BoolValueUnknown {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	if input.Kind == BoolValueValue {
		value := input.Value
		if value {
			return Int4Value{Kind: Int4ValueValue, Value: 0}
		}
	}
	return Int4Value{Kind: Int4ValueValue, Value: 1}
}
func ArrayOrderStep(input Int4Value) Int4Value {
	if input.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value < 0 {
			return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
		}
		if value > 0 {
			return Int4Value{Kind: Int4ValueValue, Value: 1}
		}
		return Int4Value{Kind: Int4ValueValue, Value: 0}
	}
	if input.Kind == Int4ValueNull {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	return input
}
func ArrayOrderFromEquality(input BoolValue) Int4Value {
	if input.Kind == BoolValueError {
		error := input.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if input.Kind == BoolValueValue {
		value := input.Value
		if value {
			return Int4Value{Kind: Int4ValueValue, Value: 0}
		}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func FinishArrayComparison(input *ArrayComparisonPayload, result Int4Value) Int4Value {
	if input.State == 1 {
		if result.Kind == Int4ValueValue {
			value := langruntime.CheckedI32(result.Value)
			if value == 0 {
				return Int4Value{Kind: Int4ValueValue, Value: input.Tail}
			}
		}
	}
	return result
}
func PrepareArrayMembership(left ArrayValue, right ArrayValue, reverse bool, available bool) ArrayComparisonPayload {
	left = CopyArrayValue(left)
	right = CopyArrayValue(right)
	payload := PrepareArrayComparison(left, right, false, available)
	if payload.State == 1 && reverse {
		return ArrayComparisonPayload{Left: payload.Right, Right: payload.Left, Limit: payload.Limit, State: payload.State, Error: payload.Error, Tail: payload.Tail, Value: payload.Value}
	}
	return payload
}
func ArrayMembershipInitial(input *ArrayComparisonPayload, all bool) BoolValue {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State == langruntime.CheckedSignedNegate(2) {
		return BoolValue{Kind: BoolValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.State == 0 {
		return BoolValue{Kind: BoolValueNull}
	}
	return BoolValue{Kind: BoolValueValue, Value: all}
}
func ArrayMembershipContinues(input *ArrayComparisonPayload, index Int4Value, result BoolValue, all bool) bool {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State != 1 {
		return false
	}
	outcome := CheckFromBool(result)
	if all && AndStops(outcome) {
		return false
	}
	if all == false && OrStops(outcome) {
		return false
	}
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		return offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(len(input.Left)))))))
	}
	return false
}
func ArrayMembershipElementAt(input *ArrayComparisonPayload, index Int4Value, right bool) ArrayElement {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		if right {
			position := langruntime.IndexFromI32(offset, len(input.Right))
			if offset >= 0 && position < len(input.Right) {
				return CopyArrayElement(input.Right[position])
			}
		} else {
			position := langruntime.IndexFromI32(offset, len(input.Left))
			if offset >= 0 && position < len(input.Left) {
				return CopyArrayElement(input.Left[position])
			}
		}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayMembershipMatchInitial(input *ArrayComparisonPayload, index Int4Value) BoolValue {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	source := ArrayMembershipElementAt(input, index, false)
	if source.Kind == ArrayElementError {
		error := source.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func ArrayMembershipScanContinues(input *ArrayComparisonPayload, sourceIndex Int4Value, index Int4Value, matched BoolValue) bool {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if OrStops(CheckFromBool(matched)) {
		return false
	}
	source := ArrayMembershipElementAt(input, sourceIndex, false)
	if source.Kind == ArrayElementNull {
		return false
	}
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		return offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(len(input.Right)))))))
	}
	return false
}
func ArrayMembershipPair(left ArrayElement, right ArrayElement) Int4Value {
	left = CopyArrayElement(left)
	right = CopyArrayElement(right)
	if left.Kind == ArrayElementNull {
		return Int4Value{Kind: Int4ValueValue, Value: 1}
	}
	if right.Kind == ArrayElementNull {
		return Int4Value{Kind: Int4ValueValue, Value: 1}
	}
	return ArrayComparisonPair(left, right, true)
}
func ArrayMembershipMatchStep(matched BoolValue, comparison Int4Value) BoolValue {
	value := BoolValue{Kind: BoolValueUnknown}
	if comparison.Kind == Int4ValueValue {
		result := langruntime.CheckedI32(comparison.Value)
		value = BoolValue{Kind: BoolValueValue, Value: result == 0}
	}
	if comparison.Kind == Int4ValueError {
		error := comparison.Error
		value = BoolValue{Kind: BoolValueError, Error: error}
	}
	return BoolFromCheck(OrFinish(CheckFromBool(matched), CheckFromBool(value)))
}
func ArrayMembershipFinishStep(result BoolValue, matched BoolValue, all bool) BoolValue {
	if all {
		return BoolFromCheck(AndFinish(CheckFromBool(result), CheckFromBool(matched)))
	}
	return BoolFromCheck(OrFinish(CheckFromBool(result), CheckFromBool(matched)))
}
func ArrayCoercionDeferred(input ArrayElement) ArrayElement {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func FinishArrayCoercion(input ArrayOutputPayload, converted ArrayArguments, binary bool) ArrayValue {
	input = CopyArrayOutputPayload(input)
	converted = CopyArrayArguments(converted)
	if input.State == langruntime.CheckedSignedNegate(2) {
		return ArrayValue{Kind: ArrayValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	if input.State == 0 {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if converted.Kind == ArrayArgumentsError {
		error := converted.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if converted.Kind == ArrayArgumentsValue {
		value := CopyArrayPayload(converted.Value)
		if len(value.Elements) != len(input.Elements) {
			return ArrayValue{Kind: ArrayValueUnknown}
		}
		nullBitmap := value.NullBitmap
		if binary {
			nullBitmap = input.NullBitmap
		}
		return MakeArrayValue(ArrayPayload{NullBitmap: nullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: input.Dimensions, Elements: value.Elements})
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}

const arraySearchMultidimensional = 466560
const arraySearchNullStart = 3452548
const arrayBucketMultidimensional = 3452630
const arrayBucketNullElement = 3452548

func PrepareArrayBucket(needle ArrayElement, input ArrayValue, available bool) ArrayComparisonPayload {
	if needle.Kind == ArrayElementError {
		error := needle.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if input.Kind == ArrayValueError {
		error := input.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if needle.Kind == ArrayElementUnknown {
		return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
	}
	if input.Kind == ArrayValueUnknown {
		return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
	}
	if needle.Kind == ArrayElementNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if input.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if input.Kind == ArrayValueValue {
		array := CopyArrayPayload(input.Value)
		if len(array.Dimensions) > 1 {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayBucketMultidimensional), 0)
		}
		knownNull := false
		unknownNull := false
		position := 0
		for position < len(array.Elements) {
			cell := CopyArrayElement(array.Elements[position])
			if cell.Kind == ArrayElementError {
				error := cell.Error
				return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
			}
			if cell.Kind == ArrayElementNull {
				knownNull = true
			}
			if cell.Kind == ArrayElementUnknown {
				unknownNull = true
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		if knownNull {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayBucketNullElement), 0)
		}
		if unknownNull {
			return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
		}
		if available == false {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonUndefined), 0)
		}
		needles := []ArrayElement{}
		langruntime.CheckedAdd(len(needles), 1)
		needles = append(needles, CopyArrayElement(needle))
		return ArrayComparisonPayload{Limit: len(array.Elements), Left: array.Elements, Right: needles, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 0}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArrayBucketLimit(input *ArrayComparisonPayload) Int4Value {
	if input.State == 1 {
		return Int4Value{Kind: Int4ValueValue, Value: int(int32(input.Limit))}
	}
	return ArrayComparisonInitial(input)
}
func ArrayBucketOperand(input *ArrayComparisonPayload) ArrayElement {
	if input.State == 1 && len(input.Right) == 1 {
		return CopyArrayElement(input.Right[0])
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayBucketContinues(low Int4Value, high Int4Value) bool {
	if low.Kind == Int4ValueValue {
		left := langruntime.CheckedI32(low.Value)
		if high.Kind == Int4ValueValue {
			right := langruntime.CheckedI32(high.Value)
			return left >= 0 && left < right
		}
	}
	return false
}
func ArrayBucketMidpoint(low Int4Value, high Int4Value) Int4Value {
	if low.Kind == Int4ValueValue {
		left := langruntime.CheckedI32(low.Value)
		if high.Kind == Int4ValueValue {
			right := langruntime.CheckedI32(high.Value)
			if left >= 0 && left <= right {
				return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedAdd(left, langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(right, left)), 2))}
			}
		}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func ArrayBucketLower(low Int4Value, high Int4Value, compared Int4Value) Int4Value {
	if compared.Kind == Int4ValueError {
		error := compared.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if compared.Kind == Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if order < 0 {
			return low
		}
		position := ArrayBucketMidpoint(low, high)
		if position.Kind == Int4ValueValue {
			midpoint := langruntime.CheckedI32(position.Value)
			if midpoint < 2147483647 {
				return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedAdd(midpoint, 1)}
			}
		}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func ArrayBucketUpper(low Int4Value, high Int4Value, compared Int4Value) Int4Value {
	if compared.Kind == Int4ValueError {
		error := compared.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if compared.Kind == Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if order >= 0 {
			return high
		}
		return ArrayBucketMidpoint(low, high)
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func PrepareArraySearch(input ArrayValue, needle ArrayElement, start Int4Value, provided bool, available bool) ArrayComparisonPayload {
	input = CopyArrayValue(input)
	needle = CopyArrayElement(needle)
	if input.Kind == ArrayValueError {
		error := input.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if needle.Kind == ArrayElementError {
		error := needle.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if start.Kind == Int4ValueError {
		error := start.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if input.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if input.Kind == ArrayValueValue {
		array := CopyArrayPayload(input.Value)
		if len(array.Dimensions) > 1 {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arraySearchMultidimensional), 0)
		}
		if len(array.Dimensions) == 0 {
			return arrayComparisonState(2, MakeSqlError(0), 0)
		}
		needleNull := false
		needleUnknown := false
		if needle.Kind == ArrayElementNull {
			needleNull = true
		}
		if needle.Kind == ArrayElementUnknown {
			needleUnknown = true
		}
		knownNull := false
		unknownNull := false
		position := 0
		for position < len(array.Elements) {
			element := CopyArrayElement(array.Elements[position])
			if element.Kind == ArrayElementNull {
				knownNull = true
			}
			if element.Kind == ArrayElementUnknown {
				unknownNull = true
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		if needleNull && knownNull == false && unknownNull == false {
			return arrayComparisonState(2, MakeSqlError(0), 0)
		}
		if provided {
			if start == (Int4Value{Kind: Int4ValueUnknown}) {
				return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
			}
			if start == (Int4Value{Kind: Int4ValueNull}) {
				if knownNull == false && (needleUnknown || (needleNull && unknownNull)) {
					return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
				}
				return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arraySearchNullStart), 0)
			}
		}
		if available == false {
			if knownNull == false && (needleUnknown || (needleNull && unknownNull)) {
				return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
			}
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonUndefined), 0)
		}
		lower := array.Dimensions[0].Lower
		offset := int64(0)
		if provided {
			if start.Kind == Int4ValueValue {
				value := langruntime.CheckedI32(start.Value)
				offset = langruntime.CheckedI64Subtract((int64(langruntime.CheckedI32(value))), (int64(langruntime.CheckedI32(lower))))
				if offset < int64(0) {
					offset = int64(0)
				}
				if offset > int64(langruntime.CheckedI32((int(int32(len(array.Elements)))))) {
					offset = int64(langruntime.CheckedI32((int(int32(len(array.Elements))))))
				}
			}
		}
		needles := []ArrayElement{}
		langruntime.CheckedAdd(len(needles), 1)
		needles = append(needles, CopyArrayElement(needle))
		return ArrayComparisonPayload{Limit: len(array.Elements), Left: array.Elements, Right: needles, State: 1, Error: MakeSqlError(0), Tail: lower, Value: int(int32(offset))}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArraySearchInitial(input *ArrayComparisonPayload) Int4Value {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State == langruntime.CheckedSignedNegate(2) {
		return Int4Value{Kind: Int4ValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	return Int4Value{Kind: Int4ValueNull}
}
func ArraySearchStart(input *ArrayComparisonPayload) Int4Value {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	return Int4Value{Kind: Int4ValueValue, Value: input.Value}
}
func ArraySearchContinues(input *ArrayComparisonPayload, index Int4Value, result Int4Value, all bool) bool {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State != 1 {
		return false
	}
	if result.Kind == Int4ValueError {
		return false
	}
	if result == (Int4Value{Kind: Int4ValueUnknown}) {
		return false
	}
	if all == false {
		if result.Kind == Int4ValueValue {
			return false
		}
	}
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		return offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(input.Limit))))))
	}
	return false
}
func ArraySearchNeedle(input *ArrayComparisonPayload) ArrayElement {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State == 1 && len(input.Right) == 1 {
		return CopyArrayElement(input.Right[0])
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArraySearchResultStep(input *ArrayComparisonPayload, index Int4Value, compared Int4Value) Int4Value {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if compared.Kind == Int4ValueError {
		error := compared.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if compared == (Int4Value{Kind: Int4ValueUnknown}) {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	if compared.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		if value != 0 {
			return Int4Value{Kind: Int4ValueNull}
		}
		if index.Kind == Int4ValueValue {
			offset := langruntime.CheckedI32(index.Value)
			position := langruntime.CheckedI64Add((int64(langruntime.CheckedI32(input.Tail))), (int64(langruntime.CheckedI32(offset))))
			return Int4Value{Kind: Int4ValueValue, Value: int(int32(position))}
		}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func ArraySearchAppend(input ArrayArguments, result Int4Value) ArrayArguments {
	input = CopyArrayArguments(input)
	if result.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(result.Value)
		return AppendArrayArgument(input, ArrayElementFromInt4(MakeInt4Value(value)))
	}
	return input
}
func FinishArraySearchPositions(input *ArrayComparisonPayload, values ArrayArguments, result Int4Value) ArrayValue {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	values = CopyArrayArguments(values)
	if input.State == 0 {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if result.Kind == Int4ValueError {
		error := result.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if result == (Int4Value{Kind: Int4ValueUnknown}) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	return FinishArrayConstructor(values)
}
func PrepareArrayRewrite(input ArrayValue, needle ArrayElement, replacement ArrayElement, remove bool, available bool) ArrayComparisonPayload {
	input = CopyArrayValue(input)
	needle = CopyArrayElement(needle)
	replacement = CopyArrayElement(replacement)
	if input.Kind == ArrayValueError {
		error := input.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if needle.Kind == ArrayElementError {
		error := needle.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if replacement.Kind == ArrayElementError {
		error := replacement.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if input.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if input.Kind == ArrayValueValue {
		array := CopyArrayPayload(input.Value)
		if len(array.Dimensions) == 0 {
			return arrayComparisonState(2, MakeSqlError(0), 0)
		}
		if remove && len(array.Dimensions) > 1 {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arraySearchMultidimensional), 0)
		}
		if available == false {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonUndefined), 0)
		}
		queries := []ArrayElement{}
		langruntime.CheckedAdd(len(queries), 1)
		queries = append(queries, CopyArrayElement(needle))
		langruntime.CheckedAdd(len(queries), 1)
		queries = append(queries, CopyArrayElement(replacement))
		return ArrayComparisonPayload{Limit: len(array.Elements), Left: array.Elements, Right: queries, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 0}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArrayRewriteNeedle(input *ArrayComparisonPayload) ArrayElement {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State == 1 && len(input.Right) == 2 {
		return CopyArrayElement(input.Right[0])
	}
	return ArrayElement{Kind: ArrayElementUnknown}
}
func ArrayRewriteContinues(input *ArrayComparisonPayload, index Int4Value, result Int4Value) bool {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if input.State != 1 {
		return false
	}
	if result.Kind == Int4ValueError {
		return false
	}
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		return offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(input.Limit))))))
	}
	return false
}
func ArrayRewriteStep(input ArrayArguments, plan *ArrayComparisonPayload, index Int4Value, compared Int4Value, remove bool) ArrayArguments {
	input = CopyArrayArguments(input)
	plan = langruntime.CheckedBorrowed(plan, copyArrayComparisonPayload)
	if input.Kind == ArrayArgumentsError {
		return input
	}
	if compared.Kind == Int4ValueError {
		error := compared.Error
		return ArrayArguments{Kind: ArrayArgumentsError, Error: error}
	}
	source := ArrayMembershipElementAt(plan, index, false)
	if compared == (Int4Value{Kind: Int4ValueUnknown}) {
		if remove {
			return ArrayArguments{Kind: ArrayArgumentsUnknown}
		}
		if source.Kind == ArrayElementNull {
			replacement := CopyArrayElement(plan.Right[1])
			if replacement.Kind == ArrayElementNull {
				return AppendArrayArgument(input, ArrayElement{Kind: ArrayElementNull})
			}
		}
		return AppendArrayArgument(input, ArrayElement{Kind: ArrayElementUnknown})
	}
	if compared.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		if value == 0 {
			if remove {
				return input
			}
			return AppendArrayArgument(input, CopyArrayElement(plan.Right[1]))
		}
		return AppendArrayArgument(input, source)
	}
	return ArrayArguments{Kind: ArrayArgumentsUnknown}
}
func ArrayRewriteChanged(input *ArrayComparisonPayload, compared Int4Value, remove bool) BoolValue {
	input = langruntime.CheckedBorrowed(input, copyArrayComparisonPayload)
	if remove == false && len(input.Right) == 2 {
		needle := CopyArrayElement(input.Right[0])
		replacement := CopyArrayElement(input.Right[1])
		if needle.Kind == ArrayElementNull {
			if replacement.Kind == ArrayElementNull {
				return BoolValue{Kind: BoolValueValue, Value: false}
			}
		}
	}
	if compared.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return BoolValue{Kind: BoolValueValue, Value: value == 0}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func FinishArrayRewrite(original ArrayValue, plan *ArrayComparisonPayload, values ArrayArguments, remove bool, changed BoolValue) ArrayValue {
	original = CopyArrayValue(original)
	plan = langruntime.CheckedBorrowed(plan, copyArrayComparisonPayload)
	values = CopyArrayArguments(values)
	if plan.State == langruntime.CheckedSignedNegate(2) {
		return ArrayValue{Kind: ArrayValueError, Error: plan.Error}
	}
	if plan.State == langruntime.CheckedSignedNegate(1) {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	if plan.State == 0 {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if plan.State == 2 {
		return original
	}
	if values.Kind == ArrayArgumentsError {
		error := values.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if original.Kind == ArrayValueValue {
		source := CopyArrayPayload(original.Value)
		if values.Kind == ArrayArgumentsValue {
			output := CopyArrayPayload(values.Value)
			if source.ElementType != output.ElementType || source.ElementKind != output.ElementKind {
				return ArrayValue{Kind: ArrayValueError, Error: MakeSqlError(arrayComparisonTypeMismatch)}
			}
			dimensions := []ArrayDimension{}
			if remove {
				if len(output.Elements) > 0 {
					langruntime.CheckedAdd(len(dimensions), 1)
					dimensions = append(dimensions, ArrayDimension{Lower: source.Dimensions[0].Lower, Length: int(int32(len(output.Elements)))})
				}
			} else {
				position := 0
				for position < len(source.Dimensions) {
					langruntime.CheckedAdd(len(dimensions), 1)
					dimensions = append(dimensions, source.Dimensions[position])
					position = langruntime.CheckedAdd(position, 1)
				}
			}
			nullBitmap := output.NullBitmap
			if changed == (BoolValue{Kind: BoolValueValue, Value: false}) {
				nullBitmap = source.NullBitmap
			} else if changed != (BoolValue{Kind: BoolValueValue, Value: true}) {
				nullBitmap = ArrayBitmapChoice(nullBitmap, source.NullBitmap)
			}
			return MakeArrayValue(ArrayPayload{NullBitmap: nullBitmap, ElementType: output.ElementType, ElementKind: output.ElementKind, Dimensions: dimensions, Elements: output.Elements})
		}
	}
	return ArrayValue{Kind: ArrayValueUnknown}
}

type ArraySortPayload struct {
	NullBitmap  BoolValue
	ElementType string
	ElementKind int
	Dimensions  []ArrayDimension
	Elements    []ArrayElement
	Order       []int
	Buffer      []int
	Ties        []int
	Rows        int
	Width       int
	Run         int
	Segment     int
	Left        int
	Right       int
	Output      int
	Phase       int
	Tie         int
	State       int
	Error       SqlError
	Descending  bool
	NullsFirst  bool
}

func copyArraySortPayload(value ArraySortPayload) ArraySortPayload {
	return ArraySortPayload{NullBitmap: value.NullBitmap, ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Dimensions: langruntime.CheckedStructs(value.Dimensions, copyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement), Order: langruntime.CheckedIndices(value.Order), Buffer: langruntime.CheckedIndices(value.Buffer), Ties: langruntime.CheckedIndices(value.Ties), Rows: langruntime.CheckedI32(value.Rows), Width: langruntime.CheckedI32(value.Width), Run: langruntime.CheckedI32(value.Run), Segment: langruntime.CheckedI32(value.Segment), Left: langruntime.CheckedI32(value.Left), Right: langruntime.CheckedI32(value.Right), Output: langruntime.CheckedI32(value.Output), Phase: langruntime.CheckedI32(value.Phase), Tie: langruntime.CheckedI32(value.Tie), State: langruntime.CheckedI32(value.State), Error: value.Error, Descending: value.Descending, NullsFirst: value.NullsFirst}
}

type ArraySortPlanKind uint8

const (
	ArraySortPlanValue ArraySortPlanKind = iota
)

type ArraySortPlan struct {
	Kind  ArraySortPlanKind
	Value ArraySortPayload
}

func copyArraySortPlan(value ArraySortPlan) ArraySortPlan {
	switch value.Kind {
	case ArraySortPlanValue:
		return ArraySortPlan{Kind: ArraySortPlanValue, Value: copyArraySortPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func PrepareArrayHash(input ArrayValue, seed Int8Value, available bool) ArrayComparisonPayload {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueError {
		error := input.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 1)
	}
	if seed.Kind == Int8ValueError {
		error := seed.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 1)
	}
	if input.Kind == ArrayValueUnknown {
		return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 1)
	}
	if seed == (Int8Value{Kind: Int8ValueUnknown}) {
		return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 1)
	}
	if input.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 1)
	}
	if seed == (Int8Value{Kind: Int8ValueNull}) {
		return arrayComparisonState(0, MakeSqlError(0), 1)
	}
	if available == false {
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonUndefined), 1)
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		limit := len(value.Elements)
		right := []ArrayElement{}
		return ArrayComparisonPayload{Left: value.Elements, Right: right, Limit: limit, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 1}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 1)
}
func ArrayHashInitial64(input *ArrayComparisonPayload) Int8Value {
	initial := ArrayComparisonInitial(input)
	if initial.Kind == Int4ValueError {
		error := initial.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if initial == (Int4Value{Kind: Int4ValueUnknown}) {
		return Int8Value{Kind: Int8ValueUnknown}
	}
	if initial == (Int4Value{Kind: Int4ValueNull}) {
		return Int8Value{Kind: Int8ValueNull}
	}
	return Int8Value{Kind: Int8ValueValue, Value: int64(1)}
}
func ArrayHashContinues32(input *ArrayComparisonPayload, index Int4Value, first Int4Value, second Int4Value) bool {
	if first.Kind == Int4ValueValue {
		if second.Kind == Int4ValueValue {
			if index.Kind == Int4ValueValue {
				offset := langruntime.CheckedI32(index.Value)
				return input.State == 1 && offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(input.Limit))))))
			}
		}
	}
	return false
}
func ArrayHashContinues64(input *ArrayComparisonPayload, index Int4Value, first Int8Value, second Int8Value) bool {
	if first.Kind == Int8ValueValue {
		if second.Kind == Int8ValueValue {
			if index.Kind == Int4ValueValue {
				offset := langruntime.CheckedI32(index.Value)
				return input.State == 1 && offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(input.Limit))))))
			}
		}
	}
	return false
}
func ArrayBitmapUnion(left BoolValue, right BoolValue) BoolValue {
	if left == (BoolValue{Kind: BoolValueValue, Value: true}) || right == (BoolValue{Kind: BoolValueValue, Value: true}) {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	if left == (BoolValue{Kind: BoolValueValue, Value: false}) && right == (BoolValue{Kind: BoolValueValue, Value: false}) {
		return BoolValue{Kind: BoolValueValue, Value: false}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func ArrayElementBitmap(input ArrayElement) BoolValue {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementUnknown {
		return BoolValue{Kind: BoolValueUnknown}
	}
	if input.Kind == ArrayElementNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func ArrayElementsBitmap(input *ArrayPayload) BoolValue {
	input = langruntime.CheckedBorrowed(input, CopyArrayPayload)
	result := BoolValue{Kind: BoolValueValue, Value: false}
	index := 0
	for index < len(input.Elements) {
		result = ArrayBitmapUnion(result, ArrayElementBitmap(CopyArrayElement(input.Elements[index])))
		index = langruntime.CheckedAdd(index, 1)
	}
	return result
}
func ArrayReconstructionBitmap(input *ArrayPayload) BoolValue {
	input = langruntime.CheckedBorrowed(input, CopyArrayPayload)
	if input.NullBitmap == (BoolValue{Kind: BoolValueValue, Value: false}) {
		return input.NullBitmap
	}
	return ArrayElementsBitmap(input)
}
func ArrayBitmapChoice(left BoolValue, right BoolValue) BoolValue {
	if left == right {
		return left
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func ArrayNullBitmap(input ArrayValue) BoolValue {
	input = CopyArrayValue(input)
	if input.Kind == ArrayValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return BoolValue{Kind: BoolValueNull}
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		return value.NullBitmap
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func PrepareArrayQuantifier(scalar BoolValue, input ArrayValue, strict bool) ArrayComparisonPayload {
	input = CopyArrayValue(input)
	if scalar.Kind == BoolValueError {
		error := scalar.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if input.Kind == ArrayValueError {
		error := input.Error
		return arrayComparisonState(langruntime.CheckedSignedNegate(2), error, 0)
	}
	if input.Kind == ArrayValueNull {
		return arrayComparisonState(0, MakeSqlError(0), 0)
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		limit := len(value.Elements)
		if limit > 0 && strict && scalar == (BoolValue{Kind: BoolValueValue, Value: true}) {
			return arrayComparisonState(0, MakeSqlError(0), 0)
		}
		right := []ArrayElement{}
		return ArrayComparisonPayload{Left: value.Elements, Right: right, Limit: limit, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 0}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArrayQuantifierInitial(input *ArrayComparisonPayload, any bool) CheckOutcome {
	if input.State == langruntime.CheckedSignedNegate(2) {
		return CheckOutcome{Kind: CheckOutcomeError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	if input.State == 0 {
		return CheckOutcome{Kind: CheckOutcomeNull}
	}
	if any {
		return CheckOutcome{Kind: CheckOutcomeFalse}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func ArrayQuantifierContinues(input *ArrayComparisonPayload, index Int4Value, result CheckOutcome, any bool, safe bool) bool {
	if result.Kind == CheckOutcomeError {
		return false
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) && safe == false {
		return false
	}
	if any && result == (CheckOutcome{Kind: CheckOutcomeTrue}) {
		return false
	}
	if any == false && result == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return false
	}
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		return input.State == 1 && offset >= 0 && (int64(langruntime.CheckedI32(offset))) < (int64(langruntime.CheckedI32((int(int32(input.Limit))))))
	}
	return false
}
func ArrayQuantifierCell(nullness BoolValue, strict bool) BoolValue {
	if nullness.Kind == BoolValueError {
		error := nullness.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if strict && nullness == (BoolValue{Kind: BoolValueValue, Value: true}) {
		return BoolValue{Kind: BoolValueNull}
	}
	return BoolValue{Kind: BoolValueValue, Value: true}
}
func ArrayQuantifierNeedsCall(input BoolValue) bool {
	return input == (BoolValue{Kind: BoolValueValue, Value: true})
}
func ArrayQuantifierStep(left CheckOutcome, right BoolValue, any bool) CheckOutcome {
	value := CheckFromBool(right)
	if any {
		return OrFinish(left, value)
	}
	return AndFinish(left, value)
}
func ArrayQuantifierFinish(input CheckOutcome, validity CheckOutcome) BoolValue {
	if validity.Kind == CheckOutcomeError {
		error := validity.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if validity == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolFromCheck(input)
}
func BitFromLiteral(value string) BitValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	index := 0
	hexadecimal := false
	if len(chars) > 0 {
		if chars[0] == 'b' || chars[0] == 'B' {
			index = langruntime.CheckedIndex(1)
		}
		if chars[0] == 'x' || chars[0] == 'X' {
			index = langruntime.CheckedIndex(1)
			hexadecimal = true
		}
	}
	if len(chars) > 536870910 {
		return BitValue{Kind: BitValueUnknown}
	}
	output := langruntime.NewTextBuffer("")
	for index < len(chars) {
		ch := chars[index]
		if hexadecimal {
			digit := HexDigit(ch)
			if digit == 16 {
				return BitValue{Kind: BitValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			weight := 8
			for weight > 0 {
				if langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(digit, weight), 2) == 0 {
					output = append(output, string(langruntime.CheckedChar('0'))...)
				} else {
					output = append(output, string(langruntime.CheckedChar('1'))...)
				}
				weight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(weight, 2))
			}
		} else {
			if ch != '0' && ch != '1' {
				return BitValue{Kind: BitValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			output = append(output, string(langruntime.CheckedChar(ch))...)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return BitValue{Kind: BitValueValue, Value: string(output)}
}
func BitPayloadLength(value string) int {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	index := 0
	length := 0
	for index < len(chars) {
		index = langruntime.CheckedAdd(index, 1)
		length = langruntime.CheckedI32(langruntime.CheckedSignedAdd(length, 1))
	}
	return length
}
func BitFromText(input TextValue) BitValue {
	if input.Kind == TextValueError {
		error := input.Error
		return BitValue{Kind: BitValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) {
		return BitValue{Kind: BitValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return BitValue{Kind: BitValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return BitFromLiteral(value)
	}
	return BitValue{Kind: BitValueUnknown}
}
func BitToText(input BitValue) TextValue {
	if input.Kind == BitValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input == (BitValue{Kind: BitValueUnknown}) {
		return TextValue{Kind: TextValueUnknown}
	}
	if input == (BitValue{Kind: BitValueNull}) {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == BitValueValue {
		value := langruntime.CheckedString(input.Value)
		return TextValue{Kind: TextValueValue, Value: value}
	}
	return TextValue{Kind: TextValueUnknown}
}

type HashByte struct {
	Value int64
}

func CopyHashByte(value HashByte) HashByte {
	return HashByte{Value: value.Value}
}

type hashState struct {
	a int64
	b int64
	c int64
}

func copyhashState(value hashState) hashState {
	return hashState{a: value.a, b: value.b, c: value.c}
}
func hashWrap(value int64) int64 {
	result := langruntime.CheckedI64Remainder(value, int64(4294967296))
	if result < int64(0) {
		result = langruntime.CheckedI64Add(result, int64(4294967296))
	}
	return result
}
func HashXor(left int64, right int64) int64 {
	a := left
	b := right
	place := int64(1)
	result := int64(0)
	for place < int64(4294967296) {
		if langruntime.CheckedI64Remainder(a, int64(2)) != langruntime.CheckedI64Remainder(b, int64(2)) {
			result = langruntime.CheckedI64Add(result, place)
		}
		a = langruntime.CheckedI64Divide(a, int64(2))
		b = langruntime.CheckedI64Divide(b, int64(2))
		place = langruntime.CheckedI64Multiply(place, int64(2))
	}
	return result
}
func hashRotate(value int64, bits int) int64 {
	bits = langruntime.CheckedI32(bits)
	multiplier := int64(1)
	divisor := int64(4294967296)
	remaining := bits
	for remaining > 0 {
		multiplier = langruntime.CheckedI64Multiply(multiplier, int64(2))
		divisor = langruntime.CheckedI64Divide(divisor, int64(2))
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	return langruntime.CheckedI64Add(langruntime.CheckedI64Remainder(langruntime.CheckedI64Multiply(value, multiplier), int64(4294967296)), langruntime.CheckedI64Divide(value, divisor))
}
func hashMix(state hashState) hashState {
	state = copyhashState(state)
	a := state.a
	b := state.b
	c := state.c
	a = hashWrap(langruntime.CheckedI64Subtract(a, c))
	rotated0 := hashRotate(c, 4)
	a = HashXor(a, rotated0)
	c = hashWrap(langruntime.CheckedI64Add(c, b))
	b = hashWrap(langruntime.CheckedI64Subtract(b, a))
	rotated1 := hashRotate(a, 6)
	b = HashXor(b, rotated1)
	a = hashWrap(langruntime.CheckedI64Add(a, c))
	c = hashWrap(langruntime.CheckedI64Subtract(c, b))
	rotated2 := hashRotate(b, 8)
	c = HashXor(c, rotated2)
	b = hashWrap(langruntime.CheckedI64Add(b, a))
	a = hashWrap(langruntime.CheckedI64Subtract(a, c))
	rotated3 := hashRotate(c, 16)
	a = HashXor(a, rotated3)
	c = hashWrap(langruntime.CheckedI64Add(c, b))
	b = hashWrap(langruntime.CheckedI64Subtract(b, a))
	rotated4 := hashRotate(a, 19)
	b = HashXor(b, rotated4)
	a = hashWrap(langruntime.CheckedI64Add(a, c))
	c = hashWrap(langruntime.CheckedI64Subtract(c, b))
	rotated5 := hashRotate(b, 4)
	c = HashXor(c, rotated5)
	b = hashWrap(langruntime.CheckedI64Add(b, a))
	return hashState{a: a, b: b, c: c}
}
func hashFinal(state hashState) hashState {
	state = copyhashState(state)
	a := state.a
	b := state.b
	c := state.c
	c = HashXor(c, b)
	rotated0 := hashRotate(b, 14)
	c = hashWrap(langruntime.CheckedI64Subtract(c, rotated0))
	a = HashXor(a, c)
	rotated1 := hashRotate(c, 11)
	a = hashWrap(langruntime.CheckedI64Subtract(a, rotated1))
	b = HashXor(b, a)
	rotated2 := hashRotate(a, 25)
	b = hashWrap(langruntime.CheckedI64Subtract(b, rotated2))
	c = HashXor(c, b)
	rotated3 := hashRotate(b, 16)
	c = hashWrap(langruntime.CheckedI64Subtract(c, rotated3))
	a = HashXor(a, c)
	rotated4 := hashRotate(c, 4)
	a = hashWrap(langruntime.CheckedI64Subtract(a, rotated4))
	b = HashXor(b, a)
	rotated5 := hashRotate(a, 14)
	b = hashWrap(langruntime.CheckedI64Subtract(b, rotated5))
	c = HashXor(c, b)
	rotated6 := hashRotate(b, 24)
	c = hashWrap(langruntime.CheckedI64Subtract(c, rotated6))
	return hashState{a: a, b: b, c: c}
}
func hashBytesState(bytes []HashByte, seed int64, bigEndian bool) hashState {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	length := int64(0)
	scan := 0
	for scan < len(bytes) {
		length = langruntime.CheckedI64Add(length, int64(1))
		scan = langruntime.CheckedAdd(scan, 1)
	}
	initial := langruntime.CheckedI64Add(langruntime.CheckedI64Add(int64(2654435769), length), int64(3923095))
	stateA := initial
	stateB := initial
	stateC := initial
	if seed != int64(0) {
		low := hashWrap(seed)
		high := langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(seed, low)), int64(4294967296))
		if high < int64(0) {
			high = langruntime.CheckedI64Add(high, int64(4294967296))
		}
		a := hashWrap(langruntime.CheckedI64Add(stateA, high))
		b := hashWrap(langruntime.CheckedI64Add(stateB, low))
		mixed := hashMix(hashState{a: a, b: b, c: stateC})
		stateA = mixed.a
		stateB = mixed.b
		stateC = mixed.c
	}
	index := 0
	remaining := length
	for remaining >= int64(12) {
		a := stateA
		b := stateB
		c := stateC
		position := 0
		place := int64(1)
		if bigEndian {
			place = int64(16777216)
		}
		for position < 12 {
			value := langruntime.CheckedI64Multiply(bytes[index].Value, place)
			if position < 4 {
				a = hashWrap(langruntime.CheckedI64Add(a, value))
			} else if position < 8 {
				b = hashWrap(langruntime.CheckedI64Add(b, value))
			} else {
				c = hashWrap(langruntime.CheckedI64Add(c, value))
			}
			position = langruntime.CheckedAdd(position, 1)
			index = langruntime.CheckedAdd(index, 1)
			if bigEndian {
				place = langruntime.CheckedI64Divide(place, int64(256))
			} else {
				place = langruntime.CheckedI64Multiply(place, int64(256))
			}
			if position == 4 || position == 8 {
				if bigEndian {
					place = int64(16777216)
				} else {
					place = int64(1)
				}
			}
		}
		mixed := hashMix(hashState{a: a, b: b, c: c})
		stateA = mixed.a
		stateB = mixed.b
		stateC = mixed.c
		remaining = langruntime.CheckedI64Subtract(remaining, int64(12))
	}
	a := stateA
	b := stateB
	c := stateC
	position := 0
	place := int64(1)
	if bigEndian {
		place = int64(16777216)
	}
	for index < len(bytes) {
		value := langruntime.CheckedI64Multiply(bytes[index].Value, place)
		if position < 4 {
			a = hashWrap(langruntime.CheckedI64Add(a, value))
		} else if position < 8 {
			b = hashWrap(langruntime.CheckedI64Add(b, value))
		} else {
			c = hashWrap(langruntime.CheckedI64Add(c, value))
		}
		position = langruntime.CheckedAdd(position, 1)
		index = langruntime.CheckedAdd(index, 1)
		if bigEndian {
			place = langruntime.CheckedI64Divide(place, int64(256))
			if position == 4 || position == 8 {
				place = int64(16777216)
			}
		} else {
			place = langruntime.CheckedI64Multiply(place, int64(256))
			if position == 4 {
				place = int64(1)
			}
			if position == 8 {
				place = int64(256)
			}
		}
	}
	return hashFinal(hashState{a: a, b: b, c: c})
}
func HashBytes32(bytes []HashByte) int {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	state := hashBytesState(bytes, int64(0), false)
	return int(int32(state.c))
}
func HashBytes64(bytes []HashByte, seed int64) int64 {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	state := hashBytesState(bytes, seed, false)
	return hashState64(state)
}
func hashState64(state hashState) int64 {
	state = copyhashState(state)
	high := state.b
	if high >= int64(2147483648) {
		high = langruntime.CheckedI64Subtract(high, int64(4294967296))
	}
	return langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(high, int64(4294967296)), state.c)
}
func hashBigEndianBytes(bytes *hashBytes) []HashByte {
	result := []HashByte{}
	index := 0
	for index < len(bytes.bytes) {
		end := langruntime.CheckedAdd(index, 1)
		if bytes.unit > 1 {
			end = langruntime.CheckedIndex(langruntime.CheckedAdd(index, bytes.unit))
		}
		source := end
		for source > index {
			source = langruntime.CheckedIndex(langruntime.CheckedSubtract(source, 1))
			langruntime.CheckedAdd(len(result), 1)
			result = append(result, CopyHashByte(bytes.bytes[source]))
		}
		index = langruntime.CheckedIndex(end)
	}
	return result
}

type hashBytes struct {
	bytes []HashByte
	unit  int
}

func copyhashBytes(value hashBytes) hashBytes {
	return hashBytes{bytes: langruntime.CheckedStructs(value.bytes, CopyHashByte), unit: langruntime.CheckedIndex(value.unit)}
}
func HashNative32(bytes []HashByte, byteOrder int, unit int) Int4Value {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	byteOrder = langruntime.CheckedI32(byteOrder)
	unit = langruntime.CheckedIndex(unit)
	if byteOrder == 1 {
		return Int4Value{Kind: Int4ValueValue, Value: HashBytes32(bytes)}
	}
	input := hashBytes{bytes: bytes, unit: unit}
	bigBytes := hashBigEndianBytes(&input)
	bigState := hashBytesState(bigBytes, int64(0), true)
	big := int(int32(bigState.c))
	if byteOrder == 2 {
		return Int4Value{Kind: Int4ValueValue, Value: big}
	}
	little := HashBytes32(input.bytes)
	if byteOrder == 0 && little == big {
		return Int4Value{Kind: Int4ValueValue, Value: little}
	}
	return Int4Value{Kind: Int4ValueUnknown}
}
func HashNative64(bytes []HashByte, seed int64, byteOrder int, unit int) Int8Value {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	byteOrder = langruntime.CheckedI32(byteOrder)
	unit = langruntime.CheckedIndex(unit)
	if byteOrder == 1 {
		return Int8Value{Kind: Int8ValueValue, Value: HashBytes64(bytes, seed)}
	}
	input := hashBytes{bytes: bytes, unit: unit}
	bigBytes := hashBigEndianBytes(&input)
	bigState := hashBytesState(bigBytes, seed, true)
	big := hashState64(bigState)
	if byteOrder == 2 {
		return Int8Value{Kind: Int8ValueValue, Value: big}
	}
	little := HashBytes64(input.bytes, seed)
	if byteOrder == 0 && little == big {
		return Int8Value{Kind: Int8ValueValue, Value: little}
	}
	return Int8Value{Kind: Int8ValueUnknown}
}
func TextNumber(value int, base int) string {
	value = langruntime.CheckedI32(value)
	base = langruntime.CheckedI32(base)
	digits := []rune("0123456789abcdef")
	reversed := []rune{}
	remaining := value
	if remaining == 0 {
		langruntime.CheckedAdd(len(reversed), 1)
		reversed = append(reversed, langruntime.CheckedChar('0'))
	}
	for remaining > 0 {
		digit := langruntime.CheckedSignedRemainder(remaining, base)
		index := 0
		for digit > 0 {
			index = langruntime.CheckedAdd(index, 1)
			digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(digit, 1))
		}
		langruntime.CheckedAdd(len(reversed), 1)
		reversed = append(reversed, langruntime.CheckedChar(digits[index]))
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedDivide(remaining, base))
	}
	output := langruntime.NewTextBuffer("")
	position := len(reversed)
	for position > 0 {
		position = langruntime.CheckedIndex(langruntime.CheckedSubtract(position, 1))
		output = append(output, string(langruntime.CheckedChar(reversed[position]))...)
	}
	return string(output)
}
func ByteaAppendByte(value string, byte int) string {
	value = langruntime.CheckedString(value)
	byte = langruntime.CheckedI32(byte)
	digits := []rune("0123456789abcdef")
	high := langruntime.CheckedSignedDivide(byte, 16)
	low := langruntime.CheckedSignedRemainder(byte, 16)
	highIndex := 0
	lowIndex := 0
	for high > 0 {
		highIndex = langruntime.CheckedAdd(highIndex, 1)
		high = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(high, 1))
	}
	for low > 0 {
		lowIndex = langruntime.CheckedAdd(lowIndex, 1)
		low = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(low, 1))
	}
	output := langruntime.NewTextBuffer(value)
	output = append(output, string(langruntime.CheckedChar(digits[highIndex]))...)
	output = append(output, string(langruntime.CheckedChar(digits[lowIndex]))...)
	return string(output)
}
func HexDigit(ch rune) int {
	ch = langruntime.CheckedChar(ch)
	if ch == '0' {
		return 0
	}
	if ch == '1' {
		return 1
	}
	if ch == '2' {
		return 2
	}
	if ch == '3' {
		return 3
	}
	if ch == '4' {
		return 4
	}
	if ch == '5' {
		return 5
	}
	if ch == '6' {
		return 6
	}
	if ch == '7' {
		return 7
	}
	if ch == '8' {
		return 8
	}
	if ch == '9' {
		return 9
	}
	lower := langruntime.AsciiLowercase(ch)
	if lower == 'a' {
		return 10
	}
	if lower == 'b' {
		return 11
	}
	if lower == 'c' {
		return 12
	}
	if lower == 'd' {
		return 13
	}
	if lower == 'e' {
		return 14
	}
	if lower == 'f' {
		return 15
	}
	return 16
}
func TextSignedNumber(value int64) string {
	digits := []rune("0123456789")
	reversed := []rune{}
	remaining := value
	if remaining > int64(0) {
		remaining = langruntime.CheckedI64Subtract(int64(0), remaining)
	}
	if remaining == int64(0) {
		langruntime.CheckedAdd(len(reversed), 1)
		reversed = append(reversed, langruntime.CheckedChar('0'))
	}
	for remaining < int64(0) {
		digit := langruntime.CheckedI64Subtract(int64(0), (langruntime.CheckedI64Remainder(remaining, int64(10))))
		index := 0
		for digit > int64(0) {
			index = langruntime.CheckedAdd(index, 1)
			digit = langruntime.CheckedI64Subtract(digit, int64(1))
		}
		langruntime.CheckedAdd(len(reversed), 1)
		reversed = append(reversed, langruntime.CheckedChar(digits[index]))
		remaining = langruntime.CheckedI64Divide(remaining, int64(10))
	}
	output := langruntime.NewTextBuffer("")
	if value < int64(0) {
		output = append(output, string(langruntime.CheckedChar('-'))...)
	}
	position := len(reversed)
	for position > 0 {
		position = langruntime.CheckedIndex(langruntime.CheckedSubtract(position, 1))
		output = append(output, string(langruntime.CheckedChar(reversed[position]))...)
	}
	return string(output)
}

const dateFieldOverflow = 3452552
const invalidDateText = 3452551

func dateTextSpace(value rune) bool {
	value = langruntime.CheckedChar(value)
	return value == ' ' || value == '\t' || value == '\n' || value == '\r' || value == '\v' || value == '\f'
}
func dateTextDigit(value rune) int {
	value = langruntime.CheckedChar(value)
	if value == '0' {
		return 0
	}
	if value == '1' {
		return 1
	}
	if value == '2' {
		return 2
	}
	if value == '3' {
		return 3
	}
	if value == '4' {
		return 4
	}
	if value == '5' {
		return 5
	}
	if value == '6' {
		return 6
	}
	if value == '7' {
		return 7
	}
	if value == '8' {
		return 8
	}
	if value == '9' {
		return 9
	}
	return langruntime.CheckedSignedNegate(1)
}
func DateFromText(value TextValue) DateValue {
	if value.Kind == TextValueError {
		error := value.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	if value == (TextValue{Kind: TextValueUnknown}) {
		return DateValue{Kind: DateValueUnknown}
	}
	if value == (TextValue{Kind: TextValueNull}) {
		return DateValue{Kind: DateValueNull}
	}
	if value.Kind == TextValueValue {
		text := langruntime.CheckedString(value.Value)
		chars := []rune(text)
		if len(chars) > 128 {
			return DateValue{Kind: DateValueUnknown}
		}
		start := 0
		end := len(chars)
		for start < end && dateTextSpace(chars[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		for start < end && dateTextSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		if start == end {
			return DateValue{Kind: DateValueError, Error: SqlError{State: invalidDateText}}
		}
		bc := false
		if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 1)]) == 'c' && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 2)]) == 'b' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				return DateValue{Kind: DateValueUnknown}
			}
			bc = true
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		} else if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 1)]) == 'd' && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 2)]) == 'a' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				return DateValue{Kind: DateValueUnknown}
			}
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		}
		for start < end && dateTextSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		if langruntime.CheckedSubtract(end, start) == 5 && langruntime.AsciiLowercase(chars[start]) == 'e' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(start, 1)]) == 'p' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(start, 2)]) == 'o' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(start, 3)]) == 'c' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(start, 4)]) == 'h' {
			return DateFromYmd(1970, 1, 1)
		}
		infinityStart := start
		negative := false
		if infinityStart < end && chars[infinityStart] == '-' {
			negative = true
			infinityStart = langruntime.CheckedAdd(infinityStart, 1)
		} else if infinityStart < end && chars[infinityStart] == '+' {
			infinityStart = langruntime.CheckedAdd(infinityStart, 1)
		}
		if langruntime.CheckedSubtract(end, infinityStart) == 8 {
			infinity := []rune("infinity")
			index := 0
			matches := true
			for index < len(infinity) {
				if langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(infinityStart, index)]) != infinity[index] {
					matches = false
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			if matches {
				if negative {
					return DateValue{Kind: DateValueValue, Value: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1)}
				}
				return DateValue{Kind: DateValueValue, Value: 2147483647}
			}
		}
		index := start
		year := 0
		yearDigits := 0
		for index < end && dateTextDigit(chars[index]) >= 0 {
			if year < 5874898 {
				year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(year, 10), dateTextDigit(chars[index])))
			}
			yearDigits = langruntime.CheckedAdd(yearDigits, 1)
			index = langruntime.CheckedAdd(index, 1)
		}
		if yearDigits < 4 || index == end || chars[index] != '-' {
			return DateValue{Kind: DateValueUnknown}
		}
		index = langruntime.CheckedAdd(index, 1)
		month := 0
		monthDigits := 0
		for index < end && dateTextDigit(chars[index]) >= 0 {
			if monthDigits < 2 {
				month = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(month, 10), dateTextDigit(chars[index])))
			}
			monthDigits = langruntime.CheckedAdd(monthDigits, 1)
			index = langruntime.CheckedAdd(index, 1)
		}
		if monthDigits < 1 || monthDigits > 2 || index == end || chars[index] != '-' {
			return DateValue{Kind: DateValueUnknown}
		}
		index = langruntime.CheckedAdd(index, 1)
		day := 0
		dayDigits := 0
		for index < end && dateTextDigit(chars[index]) >= 0 {
			if dayDigits < 2 {
				day = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(day, 10), dateTextDigit(chars[index])))
			}
			dayDigits = langruntime.CheckedAdd(dayDigits, 1)
			index = langruntime.CheckedAdd(index, 1)
		}
		if dayDigits == 0 && index == end {
			return DateValue{Kind: DateValueError, Error: SqlError{State: invalidDateText}}
		}
		if dayDigits < 1 || dayDigits > 2 || index != end {
			return DateValue{Kind: DateValueUnknown}
		}
		if bc {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, year))
		}
		return DateFromYmd(year, month, day)
	}
	return DateValue{Kind: DateValueUnknown}
}
func DateFromYmd(year int, month int, day int) DateValue {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	days := calendarDaysFromYmd(year, month, day)
	if days.Kind == Int4ValueError {
		error := days.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	if days.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(days.Value)
		return MakeDateValue(value)
	}
	return DateValue{Kind: DateValueUnknown}
}
func calendarDaysFromYmd(year int, month int, day int) Int4Value {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	if year == 0 || year == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
		return Int4Value{Kind: Int4ValueError, Error: SqlError{State: dateFieldOverflow}}
	}
	calendarYear := year
	if year < 0 {
		calendarYear = langruntime.CheckedI32(langruntime.CheckedSignedAdd(year, 1))
	}
	if month < 1 || month > 12 || day < 1 || day > 31 {
		return Int4Value{Kind: Int4ValueError, Error: SqlError{State: dateFieldOverflow}}
	}
	monthDays := 31
	if month == 4 || month == 6 || month == 9 || month == 11 {
		monthDays = langruntime.CheckedI32(30)
	} else if month == 2 {
		monthDays = langruntime.CheckedI32(28)
		if langruntime.CheckedSignedRemainder(calendarYear, 4) == 0 && (langruntime.CheckedSignedRemainder(calendarYear, 100) != 0 || langruntime.CheckedSignedRemainder(calendarYear, 400) == 0) {
			monthDays = langruntime.CheckedI32(29)
		}
	}
	if day > monthDays || calendarYear < langruntime.CheckedSignedNegate(4713) || calendarYear > 5874897 {
		return Int4Value{Kind: Int4ValueError, Error: SqlError{State: dateFieldOverflow}}
	}
	julianYear := langruntime.CheckedSignedAdd(calendarYear, 4799)
	julianMonth := langruntime.CheckedSignedAdd(month, 13)
	if month > 2 {
		julianYear = langruntime.CheckedI32(langruntime.CheckedSignedAdd(calendarYear, 4800))
		julianMonth = langruntime.CheckedI32(langruntime.CheckedSignedAdd(month, 1))
	}
	century := langruntime.CheckedSignedDivide(julianYear, 100)
	base := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedMultiply(julianYear, 365), 32167)
	leapAdjustment := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedDivide(julianYear, 4), century), langruntime.CheckedSignedDivide(century, 4))
	monthAdjustment := langruntime.CheckedSignedAdd(langruntime.CheckedSignedDivide(langruntime.CheckedSignedMultiply(7834, julianMonth), 256), day)
	julian := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(base, leapAdjustment), monthAdjustment)
	return MakeInt4Value(langruntime.CheckedSignedSubtract(julian, 2451545))
}

const invalidTimestampText = 3452551
const invalidTimestampZone = 3452553

type timestampText struct {
	chars []rune
}

func copytimestampText(value timestampText) timestampText {
	return timestampText{chars: langruntime.CheckedChars(value.chars)}
}

type timestampNumber struct {
	next     int
	digits   int
	value    int
	overflow bool
}

func copytimestampNumber(value timestampNumber) timestampNumber {
	return timestampNumber{next: langruntime.CheckedIndex(value.next), digits: langruntime.CheckedIndex(value.digits), value: langruntime.CheckedI32(value.value), overflow: value.overflow}
}
func readTimestampNumber(text *timestampText, start int, end int) timestampNumber {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	index := start
	value := 0
	overflow := false
	for index < end && dateTextDigit(text.chars[index]) >= 0 {
		if value < 214748364 || (value == 214748364 && dateTextDigit(text.chars[index]) <= 7) {
			value = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(value, 10), dateTextDigit(text.chars[index])))
		} else {
			value = langruntime.CheckedI32(2147483647)
			overflow = true
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return timestampNumber{next: index, digits: langruntime.CheckedSubtract(index, start), value: value, overflow: overflow}
}
func timestampCalendarMicroseconds(year int, month int, day int, hour int, minute int, second int, microsecond int, offsetSeconds int, withTimezone bool, allowFractionCarry bool) Int8Value {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	offsetSeconds = langruntime.CheckedI32(offsetSeconds)
	maxFraction := 999999
	if allowFractionCarry {
		maxFraction = langruntime.CheckedI32(1000000)
	}
	if hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 || microsecond < 0 || microsecond > maxFraction {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	clockSeconds := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(hour, 60), minute)), 60), second)
	clockWide := int64(langruntime.CheckedI32(clockSeconds))
	fractionWide := int64(langruntime.CheckedI32(microsecond))
	clock := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(clockWide, int64(1000000)), fractionWide)
	if clock > int64(86400000000) {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	if offsetSeconds < langruntime.CheckedSignedNegate(57599) || offsetSeconds > 57599 {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampZone}}
	}
	days := calendarDaysFromYmd(year, month, day)
	if days.Kind == Int4ValueError {
		error := days.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if days.Kind == Int4ValueValue {
		dayValue := langruntime.CheckedI32(days.Value)
		if (year == langruntime.CheckedSignedNegate(4714) && month < 11) || dayValue < langruntime.CheckedSignedNegate(2451546) || dayValue > 106751983 {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
		}
		daysWide := int64(langruntime.CheckedI32(dayValue))
		local := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(daysWide, int64(86400000000)), clock)
		offsetWide := int64(langruntime.CheckedI32(offsetSeconds))
		microseconds := local
		if withTimezone {
			microseconds = langruntime.CheckedI64Subtract(local, langruntime.CheckedI64Multiply(offsetWide, int64(1000000)))
		}
		if timestampMicrosecondsValid(microseconds) == false {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
		}
		return Int8Value{Kind: Int8ValueValue, Value: microseconds}
	}
	return Int8Value{Kind: Int8ValueUnknown}
}
func parseTimestampText(value TextValue, withTimezone bool) Int8Value {
	if value.Kind == TextValueError {
		error := value.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if value == (TextValue{Kind: TextValueUnknown}) {
		return Int8Value{Kind: Int8ValueUnknown}
	}
	if value == (TextValue{Kind: TextValueNull}) {
		return Int8Value{Kind: Int8ValueNull}
	}
	if value.Kind == TextValueValue {
		input := langruntime.CheckedString(value.Value)
		chars := []rune(input)
		if len(chars) > 128 {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		text := timestampText{chars: chars}
		start := 0
		end := len(text.chars)
		for start < end && dateTextSpace(text.chars[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		for start < end && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		if start == end {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		bc := false
		if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 1)]) == 'c' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 2)]) == 'b' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(text.chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				return Int8Value{Kind: Int8ValueUnknown}
			}
			bc = true
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		} else if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 1)]) == 'd' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 2)]) == 'a' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(text.chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				return Int8Value{Kind: Int8ValueUnknown}
			}
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		}
		for start < end && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		if langruntime.CheckedSubtract(end, start) == 5 && langruntime.AsciiLowercase(text.chars[start]) == 'e' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 1)]) == 'p' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 2)]) == 'o' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 3)]) == 'c' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 4)]) == 'h' {
			return timestampCalendarMicroseconds(1970, 1, 1, 0, 0, 0, 0, 0, withTimezone, false)
		}
		infinityStart := start
		negative := false
		if infinityStart < end && text.chars[infinityStart] == '-' {
			negative = true
			infinityStart = langruntime.CheckedAdd(infinityStart, 1)
		} else if infinityStart < end && text.chars[infinityStart] == '+' {
			infinityStart = langruntime.CheckedAdd(infinityStart, 1)
		}
		if langruntime.CheckedSubtract(end, infinityStart) == 8 {
			infinity := []rune("infinity")
			index := 0
			matches := true
			for index < len(infinity) {
				if langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(infinityStart, index)]) != infinity[index] {
					matches = false
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			if matches {
				if negative {
					return MakeInt8Value(int64(-9223372036854775808))
				}
				return MakeInt8Value(int64(9223372036854775807))
			}
		}
		yearField := readTimestampNumber(&text, start, end)
		index := yearField.next
		if yearField.digits < 4 || index == end || text.chars[index] != '-' {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		month := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
		index = langruntime.CheckedIndex(month.next)
		if month.digits < 1 || month.digits > 2 || index == end || text.chars[index] != '-' {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		day := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
		index = langruntime.CheckedIndex(day.next)
		if day.digits < 1 || day.digits > 2 {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		if index == end {
			if withTimezone {
				return Int8Value{Kind: Int8ValueUnknown}
			}
			if yearField.overflow {
				return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
			}
			year := yearField.value
			if bc {
				year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, year))
			}
			return timestampCalendarMicroseconds(year, month.value, day.value, 0, 0, 0, 0, 0, false, false)
		}
		if langruntime.AsciiLowercase(text.chars[index]) == 't' {
			index = langruntime.CheckedAdd(index, 1)
		} else if dateTextSpace(text.chars[index]) {
			for index < end && dateTextSpace(text.chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
		} else {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		hour := readTimestampNumber(&text, index, end)
		index = langruntime.CheckedIndex(hour.next)
		if hour.digits < 1 || index == end || text.chars[index] != ':' {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		minute := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
		index = langruntime.CheckedIndex(minute.next)
		if minute.digits < 1 {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		second := 0
		fraction := 0
		if index < end && text.chars[index] == ':' {
			seconds := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
			index = langruntime.CheckedIndex(seconds.next)
			if seconds.digits < 1 {
				return Int8Value{Kind: Int8ValueUnknown}
			}
			second = langruntime.CheckedI32(seconds.value)
			if index < end && text.chars[index] == '.' {
				fractionStart := langruntime.CheckedAdd(index, 1)
				digits := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(digits.next)
				if digits.digits < 1 {
					return Int8Value{Kind: Int8ValueUnknown}
				}
				if digits.digits <= 6 {
					fraction = langruntime.CheckedI32(digits.value)
					fractionDigits := digits.digits
					for fractionDigits < 6 {
						fraction = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(fraction, 10))
						fractionDigits = langruntime.CheckedAdd(fractionDigits, 1)
					}
				} else {
					fractionText := langruntime.NewTextBuffer("")
					fractionText = append(fractionText, string(langruntime.CheckedChar('0'))...)
					fractionText = append(fractionText, string(langruntime.CheckedChar('.'))...)
					digitIndex := fractionStart
					for digitIndex < index {
						fractionText = append(fractionText, string(langruntime.CheckedChar(text.chars[digitIndex]))...)
						digitIndex = langruntime.CheckedAdd(digitIndex, 1)
					}
					parsed := langruntime.F64FromText(string(fractionText), float64(0.0))
					scaled := langruntime.F64Multiply(parsed, float64(1000000.0))
					fraction = langruntime.CheckedI32(langruntime.F64ToI32(scaled))
					integral := float64(fraction)
					remainder := langruntime.F64Subtract(scaled, integral)
					if remainder > float64(0.5) || (remainder == float64(0.5) && langruntime.CheckedSignedRemainder(fraction, 2) != 0) {
						fraction = langruntime.CheckedI32(langruntime.CheckedSignedAdd(fraction, 1))
					}
				}
			}
		}
		for index < end && dateTextSpace(text.chars[index]) {
			index = langruntime.CheckedAdd(index, 1)
		}
		offset := 0
		if index < end && langruntime.AsciiLowercase(text.chars[index]) == 'z' {
			index = langruntime.CheckedAdd(index, 1)
		} else if index < end && (text.chars[index] == '+' || text.chars[index] == '-') {
			sign := text.chars[index]
			zoneHour := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
			index = langruntime.CheckedIndex(zoneHour.next)
			if zoneHour.digits < 1 || zoneHour.digits > 4 {
				return Int8Value{Kind: Int8ValueUnknown}
			}
			hours := zoneHour.value
			minutes := 0
			seconds := 0
			if index < end && text.chars[index] == ':' {
				if zoneHour.digits > 2 {
					return Int8Value{Kind: Int8ValueUnknown}
				}
				zoneMinute := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(zoneMinute.next)
				if zoneMinute.digits < 1 {
					return Int8Value{Kind: Int8ValueUnknown}
				}
				minutes = langruntime.CheckedI32(zoneMinute.value)
				if index < end && text.chars[index] == ':' {
					zoneSecond := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
					index = langruntime.CheckedIndex(zoneSecond.next)
					if zoneSecond.digits < 1 {
						return Int8Value{Kind: Int8ValueUnknown}
					}
					seconds = langruntime.CheckedI32(zoneSecond.value)
				}
			} else if zoneHour.digits > 2 {
				hours = langruntime.CheckedI32(langruntime.CheckedSignedDivide(zoneHour.value, 100))
				minutes = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(zoneHour.value, 100))
			}
			if index != end {
				return Int8Value{Kind: Int8ValueUnknown}
			}
			if hours > 15 || minutes > 59 || seconds > 59 {
				offset = langruntime.CheckedI32(57600)
			} else {
				offset = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(hours, 60), minutes)), 60), seconds))
				if sign == '-' {
					offset = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, offset))
				}
			}
		} else if withTimezone || index != end {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		if index != end {
			return Int8Value{Kind: Int8ValueUnknown}
		}
		if yearField.overflow {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
		}
		year := yearField.value
		if bc {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, year))
		}
		return timestampCalendarMicroseconds(year, month.value, day.value, hour.value, minute.value, second, fraction, offset, withTimezone, true)
	}
	return Int8Value{Kind: Int8ValueUnknown}
}
func timestampFromMicroseconds(value Int8Value) TimestampValue {
	if value.Kind == Int8ValueError {
		error := value.Error
		return TimestampValue{Kind: TimestampValueError, Error: error}
	}
	if value.Kind == Int8ValueValue {
		microseconds := value.Value
		return MakeTimestampValue(microseconds)
	}
	if value == (Int8Value{Kind: Int8ValueNull}) {
		return TimestampValue{Kind: TimestampValueNull}
	}
	return TimestampValue{Kind: TimestampValueUnknown}
}
func TimestampFromCalendar(year int, month int, day int, hour int, minute int, second int, microsecond int) TimestampValue {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	parsed := timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, 0, false, false)
	return timestampFromMicroseconds(parsed)
}
func TimestampFromText(value TextValue) TimestampValue {
	parsed := parseTimestampText(value, false)
	return timestampFromMicroseconds(parsed)
}
func timestamptzFromMicroseconds(value Int8Value) TimestamptzValue {
	if value.Kind == Int8ValueError {
		error := value.Error
		return TimestamptzValue{Kind: TimestamptzValueError, Error: error}
	}
	if value.Kind == Int8ValueValue {
		microseconds := value.Value
		return MakeTimestamptzValue(microseconds)
	}
	if value == (Int8Value{Kind: Int8ValueNull}) {
		return TimestamptzValue{Kind: TimestamptzValueNull}
	}
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
}
func TimestamptzFromCalendar(year int, month int, day int, hour int, minute int, second int, microsecond int, offsetSeconds int) TimestamptzValue {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	offsetSeconds = langruntime.CheckedI32(offsetSeconds)
	parsed := timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, offsetSeconds, true, false)
	return timestamptzFromMicroseconds(parsed)
}
func TimestamptzFromText(value TextValue) TimestamptzValue {
	parsed := parseTimestampText(value, true)
	return timestamptzFromMicroseconds(parsed)
}

const clockInputSyntax = 3452551
const clockInputRange = 3452552

func clockGrammarNormalized(input TextValue) TextValue {
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		start := 0
		end := len(chars)
		for start < end && dateTextSpace(chars[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		for end > start && dateTextSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		position := start
		for position < end && dateTextDigit(chars[position]) >= 0 {
			position = langruntime.CheckedAdd(position, 1)
		}
		if langruntime.CheckedSubtract(position, start) >= 4 && position < end && chars[position] == '-' {
			position = langruntime.CheckedAdd(position, 1)
			for position < end && dateTextDigit(chars[position]) >= 0 {
				position = langruntime.CheckedAdd(position, 1)
			}
			if position < end && chars[position] == '-' {
				position = langruntime.CheckedAdd(position, 1)
				for position < end && dateTextDigit(chars[position]) >= 0 {
					position = langruntime.CheckedAdd(position, 1)
				}
				if position < end && (dateTextSpace(chars[position]) || chars[position] == 'T' || chars[position] == 't') {
					if dateTextSpace(chars[position]) == false {
						return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputSyntax)}
					}
					date := langruntime.NewTextBuffer("")
					index := start
					for index < position {
						date = append(date, string(langruntime.CheckedChar(chars[index]))...)
						index = langruntime.CheckedAdd(index, 1)
					}
					parsed := DateFromText(TextValue{Kind: TextValueValue, Value: string(date)})
					if parsed.Kind == DateValueError {
						error := parsed.Error
						return TextValue{Kind: TextValueError, Error: error}
					}
					if parsed == (DateValue{Kind: DateValueUnknown}) {
						return TextValue{Kind: TextValueUnknown}
					}
					start = langruntime.CheckedIndex(langruntime.CheckedAdd(position, 1))
					for start < end && dateTextSpace(chars[start]) {
						start = langruntime.CheckedAdd(start, 1)
					}
				}
			}
		}
		clock := langruntime.NewTextBuffer("")
		meridian := 0
		position = langruntime.CheckedIndex(start)
		for position < end {
			consumed := false
			letter := langruntime.AsciiLowercase(chars[position])
			if langruntime.CheckedAdd(position, 1) < end && (letter == 'a' || letter == 'p') && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(position, 1)]) == 'm' {
				before := true
				after := true
				if position > start {
					before = dateTextSpace(chars[langruntime.CheckedSubtract(position, 1)]) || dateTextDigit(chars[langruntime.CheckedSubtract(position, 1)]) >= 0
				}
				if langruntime.CheckedAdd(position, 2) < end {
					after = dateTextSpace(chars[langruntime.CheckedAdd(position, 2)]) || chars[langruntime.CheckedAdd(position, 2)] == '+' || chars[langruntime.CheckedAdd(position, 2)] == '-'
				}
				if before && after {
					if meridian != 0 {
						return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputSyntax)}
					}
					meridian = langruntime.CheckedI32(1)
					if letter == 'p' {
						meridian = langruntime.CheckedI32(2)
					}
					position = langruntime.CheckedAdd(position, 2)
					consumed = true
				}
			}
			if consumed == false {
				clock = append(clock, string(langruntime.CheckedChar(chars[position]))...)
				position = langruntime.CheckedAdd(position, 1)
			}
		}
		raw := []rune(string(clock))
		start = langruntime.CheckedIndex(0)
		for start < len(raw) && dateTextSpace(raw[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		position = langruntime.CheckedIndex(start)
		for position < len(raw) && dateTextDigit(raw[position]) >= 0 {
			position = langruntime.CheckedAdd(position, 1)
		}
		digits := langruntime.CheckedSubtract(position, start)
		normalized := langruntime.NewTextBuffer("")
		if (digits == 4 || digits == 6) && (position == len(raw) || raw[position] != ':') {
			normalized = append(normalized, string(langruntime.CheckedChar(raw[start]))...)
			normalized = append(normalized, string(langruntime.CheckedChar(raw[langruntime.CheckedAdd(start, 1)]))...)
			normalized = append(normalized, string(langruntime.CheckedChar(':'))...)
			normalized = append(normalized, string(langruntime.CheckedChar(raw[langruntime.CheckedAdd(start, 2)]))...)
			normalized = append(normalized, string(langruntime.CheckedChar(raw[langruntime.CheckedAdd(start, 3)]))...)
			normalized = append(normalized, string(langruntime.CheckedChar(':'))...)
			if digits == 6 {
				normalized = append(normalized, string(langruntime.CheckedChar(raw[langruntime.CheckedAdd(start, 4)]))...)
				normalized = append(normalized, string(langruntime.CheckedChar(raw[langruntime.CheckedAdd(start, 5)]))...)
			} else {
				normalized = append(normalized, string(langruntime.CheckedChar('0'))...)
				normalized = append(normalized, string(langruntime.CheckedChar('0'))...)
			}
		} else {
			clockEnd := position
			if position < len(raw) && raw[position] == ':' {
				clockEnd = langruntime.CheckedAdd(clockEnd, 1)
				for clockEnd < len(raw) && dateTextDigit(raw[clockEnd]) >= 0 {
					clockEnd = langruntime.CheckedAdd(clockEnd, 1)
				}
				if clockEnd < len(raw) && raw[clockEnd] == '.' {
					normalized = append(normalized, "00:"...)
				}
			}
			position = langruntime.CheckedIndex(start)
		}
		for position < len(raw) {
			normalized = append(normalized, string(langruntime.CheckedChar(raw[position]))...)
			position = langruntime.CheckedAdd(position, 1)
		}
		if meridian != 0 {
			normalized = append(normalized, string(langruntime.CheckedChar(' '))...)
			if meridian == 1 {
				normalized = append(normalized, "AM"...)
			} else {
				normalized = append(normalized, "PM"...)
			}
		}
		return TextValue{Kind: TextValueValue, Value: string(normalized)}
	}
	return input
}
func clockInputText(rawInput TextValue) TextValue {
	input := clockGrammarNormalized(rawInput)
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		text := timestampText{chars: []rune(value)}
		start := 0
		end := len(text.chars)
		for start < end && dateTextSpace(text.chars[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		for start < end && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		if start == end || text.chars[start] == '+' || text.chars[start] == '-' {
			return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputSyntax)}
		}
		meridian := 0
		if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 1)]) == 'm' {
			initial := langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 2)])
			if initial == 'a' || initial == 'p' {
				meridian = langruntime.CheckedI32(1)
				if initial == 'p' {
					meridian = langruntime.CheckedI32(2)
				}
				end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
				for start < end && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 1)]) {
					end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
				}
			}
		}
		output := langruntime.NewTextBuffer("2000-01-01 ")
		if meridian != 0 {
			hours := readTimestampNumber(&text, start, end)
			if hours.digits == 0 || hours.next == end || text.chars[hours.next] != ':' {
				return TextValue{Kind: TextValueUnknown}
			}
			if hours.overflow || hours.value > 12 {
				return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputRange)}
			}
			hour := hours.value
			if hour == 12 {
				hour = langruntime.CheckedI32(0)
			}
			if meridian == 2 {
				hour = langruntime.CheckedI32(langruntime.CheckedSignedAdd(hour, 12))
			}
			symbols := []rune("0123456789")
			tens := langruntime.IndexFromI32(langruntime.CheckedSignedDivide(hour, 10), 0)
			ones := langruntime.IndexFromI32(langruntime.CheckedSignedRemainder(hour, 10), 0)
			output = append(output, string(langruntime.CheckedChar(symbols[tens]))...)
			output = append(output, string(langruntime.CheckedChar(symbols[ones]))...)
			start = langruntime.CheckedIndex(hours.next)
		}
		for start < end {
			output = append(output, string(langruntime.CheckedChar(text.chars[start]))...)
			start = langruntime.CheckedAdd(start, 1)
		}
		return TextValue{Kind: TextValueValue, Value: string(output)}
	}
	return input
}
func TimeFromText(input TextValue) TimeValue {
	parsed := parseTimestampText(clockInputText(input), false)
	if parsed.Kind == Int8ValueError {
		error := parsed.Error
		return TimeValue{Kind: TimeValueError, Error: error}
	}
	if parsed == (Int8Value{Kind: Int8ValueNull}) {
		return TimeValue{Kind: TimeValueNull}
	}
	if parsed.Kind == Int8ValueValue {
		time := parsed.Value
		return MakeTimeValue(time)
	}
	return TimeValue{Kind: TimeValueUnknown}
}
func TimetzFromText(input TextValue) TimetzValue {
	normalized := clockInputText(input)
	local := parseTimestampText(normalized, false)
	utc := parseTimestampText(normalized, true)
	if local.Kind == Int8ValueError {
		error := local.Error
		return TimetzValue{Kind: TimetzValueError, Error: error}
	}
	if utc.Kind == Int8ValueError {
		error := utc.Error
		return TimetzValue{Kind: TimetzValueError, Error: error}
	}
	if local == (Int8Value{Kind: Int8ValueNull}) || utc == (Int8Value{Kind: Int8ValueNull}) {
		return TimetzValue{Kind: TimetzValueNull}
	}
	if local.Kind == Int8ValueValue {
		time := local.Value
		if utc.Kind == Int8ValueValue {
			instant := utc.Value
			zone := langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(instant, time)), int64(1000000))
			return MakeTimetzValue(time, int(int32(zone)))
		}
	}
	return TimetzValue{Kind: TimetzValueUnknown}
}

const intervalInputSyntax = 3452551
const intervalInputRange = 3452585
const intervalInputFinalRange = 3452552

type intervalInputToken struct {
	start int
	end   int
}

func copyintervalInputToken(value intervalInputToken) intervalInputToken {
	return intervalInputToken{start: langruntime.CheckedIndex(value.start), end: langruntime.CheckedIndex(value.end)}
}

type intervalInputText struct {
	chars []rune
}

func copyintervalInputText(value intervalInputText) intervalInputText {
	return intervalInputText{chars: langruntime.CheckedChars(value.chars)}
}
func intervalTokenText(input *intervalInputText, token intervalInputToken) string {
	token = copyintervalInputToken(token)
	index := token.start
	text := langruntime.NewTextBuffer("")
	for index < token.end {
		text = append(text, string(langruntime.CheckedChar(langruntime.AsciiLowercase(input.chars[index])))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	return string(text)
}

type intervalInputAcc struct {
	years  int
	months int
	days   int
	time   int64
	mask   int
	error  int
}

func copyintervalInputAcc(value intervalInputAcc) intervalInputAcc {
	return intervalInputAcc{years: langruntime.CheckedI32(value.years), months: langruntime.CheckedI32(value.months), days: langruntime.CheckedI32(value.days), time: value.time, mask: langruntime.CheckedI32(value.mask), error: langruntime.CheckedIndex(value.error)}
}
func intervalInputFail(input intervalInputAcc, error int) intervalInputAcc {
	input = copyintervalInputAcc(input)
	error = langruntime.CheckedIndex(error)
	return intervalInputAcc{years: input.years, months: input.months, days: input.days, time: input.time, mask: input.mask, error: error}
}
func intervalInputUnit(text string) int {
	text = langruntime.CheckedString(text)
	letters := []rune(text)
	prefix := langruntime.NewTextBuffer("")
	index := 0
	for index < len(letters) && index < 10 {
		prefix = append(prefix, string(langruntime.CheckedChar(letters[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	if string(prefix) == "microsecon" || text == "usec" || text == "usecond" || text == "useconds" || text == "usecs" {
		return 0
	}
	if string(prefix) == "millisecon" || text == "mseconds" {
		return 1
	}
	if text == "yr" || text == "yrs" {
		return 8
	}
	if text == "microsecond" || text == "microseconds" || text == "us" {
		return 0
	}
	if text == "millisecond" || text == "milliseconds" || text == "ms" || text == "msec" || text == "msecs" {
		return 1
	}
	if text == "second" || text == "seconds" || text == "sec" || text == "secs" || text == "s" {
		return 2
	}
	if text == "minute" || text == "minutes" || text == "min" || text == "mins" || text == "m" {
		return 3
	}
	if text == "hour" || text == "hours" || text == "hr" || text == "hrs" || text == "h" {
		return 4
	}
	if text == "day" || text == "days" || text == "d" {
		return 5
	}
	if text == "week" || text == "weeks" || text == "w" {
		return 6
	}
	if text == "month" || text == "months" || text == "mon" || text == "mons" {
		return 7
	}
	if text == "year" || text == "years" || text == "y" {
		return 8
	}
	if text == "decade" || text == "decades" || text == "dec" || text == "decs" {
		return 9
	}
	if text == "century" || text == "centuries" || text == "cent" || text == "c" {
		return 10
	}
	if text == "millennium" || text == "millennia" || text == "mil" || text == "mils" {
		return 11
	}
	return langruntime.CheckedSignedNegate(1)
}
func intervalInputWhole(text string) Int8Value {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	index := 0
	negative := false
	if index < len(chars) && (chars[index] == '-' || chars[index] == '+') {
		negative = chars[index] == '-'
		index = langruntime.CheckedAdd(index, 1)
	}
	start := index
	whole := int64(0)
	for index < len(chars) && dateTextDigit(chars[index]) >= 0 {
		digit := dateTextDigit(chars[index])
		if whole < int64(-922337203685477580) || (whole == int64(-922337203685477580) && digit > 8) {
			return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputRange)}
		}
		whole = langruntime.CheckedI64Subtract(langruntime.CheckedI64Multiply(whole, int64(10)), (int64(langruntime.CheckedI32(digit))))
		index = langruntime.CheckedAdd(index, 1)
	}
	integerDigits := langruntime.CheckedSubtract(index, start)
	if integerDigits == 0 && start > 0 {
		return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputSyntax)}
	}
	fractionDigits := 0
	if index < len(chars) && chars[index] == '.' {
		index = langruntime.CheckedAdd(index, 1)
		fractionStart := index
		for index < len(chars) && dateTextDigit(chars[index]) >= 0 {
			index = langruntime.CheckedAdd(index, 1)
		}
		fractionDigits = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, fractionStart))
	}
	if index != len(chars) || langruntime.CheckedAdd(integerDigits, fractionDigits) == 0 {
		return Int8Value{Kind: Int8ValueUnknown}
	}
	if negative {
		return Int8Value{Kind: Int8ValueValue, Value: whole}
	}
	if whole == int64(-9223372036854775808) {
		return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputRange)}
	}
	return Int8Value{Kind: Int8ValueValue, Value: langruntime.CheckedI64Subtract(int64(0), whole)}
}
func intervalInputFraction(text string) float64 {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	index := 0
	for index < len(chars) && chars[index] != '.' {
		index = langruntime.CheckedAdd(index, 1)
	}
	fraction := langruntime.NewTextBuffer("0")
	for index < len(chars) {
		fraction = append(fraction, string(langruntime.CheckedChar(chars[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	parsed := langruntime.F64FromText(string(fraction), float64(0.0))
	if len(chars) > 0 && chars[0] == '-' {
		return langruntime.F64Subtract(float64(0.0), parsed)
	}
	return parsed
}
func intervalInputFractionMicros(fraction float64, scale float64) int64 {
	scaled := langruntime.F64Multiply(fraction, scale)
	high := langruntime.F64ToI32((langruntime.F64Divide(scaled, float64(1000000.0))))
	rest := langruntime.F64Subtract(scaled, langruntime.F64Multiply((float64(high)), float64(1000000.0)))
	low := langruntime.F64ToI32(rest)
	extra := langruntime.F64Subtract(rest, (float64(low)))
	if extra > float64(0.5) {
		low = langruntime.CheckedI32(langruntime.CheckedSignedAdd(low, 1))
	}
	if extra < float64(-0.5) {
		low = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(low, 1))
	}
	return langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(high))), int64(1000000)), (int64(langruntime.CheckedI32(low))))
}
func intervalInputYearFraction(fraction float64, scale float64) int {
	scaled := langruntime.F64Multiply(langruntime.F64Multiply(fraction, scale), float64(12.0))
	whole := langruntime.F64ToI32(scaled)
	remainder := langruntime.F64Subtract(scaled, (float64(whole)))
	if remainder > float64(0.5) || (remainder == float64(0.5) && langruntime.CheckedSignedRemainder(whole, 2) != 0) {
		whole = langruntime.CheckedI32(langruntime.CheckedSignedAdd(whole, 1))
	}
	if remainder < float64(-0.5) || (remainder == float64(-0.5) && langruntime.CheckedSignedRemainder(whole, 2) != 0) {
		whole = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(whole, 1))
	}
	return whole
}
func intervalInputAdd(input intervalInputAcc, whole int64, fraction float64, unit int) intervalInputAcc {
	input = copyintervalInputAcc(input)
	unit = langruntime.CheckedI32(unit)
	if input.error != 0 {
		return input
	}
	bit := 1
	index := 0
	for index < unit {
		bit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(bit, 2))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	mask := bit
	if unit == 2 && fraction != float64(0.0) {
		mask = langruntime.CheckedI32(7)
	}
	check := mask
	stored := input.mask
	for check > 0 {
		if langruntime.CheckedSignedRemainder(check, 2) != 0 && langruntime.CheckedSignedRemainder(stored, 2) != 0 {
			return intervalInputFail(input, intervalInputSyntax)
		}
		check = langruntime.CheckedI32(langruntime.CheckedSignedDivide(check, 2))
		stored = langruntime.CheckedI32(langruntime.CheckedSignedDivide(stored, 2))
	}
	years := int64(langruntime.CheckedI32(input.years))
	months := int64(langruntime.CheckedI32(input.months))
	days := int64(langruntime.CheckedI32(input.days))
	micros := input.time
	fractionalMicros := int64(0)
	if unit <= 4 {
		scale := int64(1)
		floatScale := float64(1.0)
		if unit == 1 {
			scale = int64(1000)
			floatScale = float64(1000.0)
		}
		if unit == 2 {
			scale = int64(1000000)
			floatScale = float64(1000000.0)
		}
		if unit == 3 {
			scale = int64(60000000)
			floatScale = float64(60000000.0)
		}
		if unit == 4 {
			scale = int64(3600000000)
			floatScale = float64(3600000000.0)
		}
		if whole > langruntime.CheckedI64Divide(int64(9223372036854775807), scale) || whole < langruntime.CheckedI64Divide((int64(-9223372036854775808)), scale) {
			return intervalInputFail(input, intervalInputRange)
		}
		product := langruntime.CheckedI64Multiply(whole, scale)
		if (product > int64(0) && micros > langruntime.CheckedI64Subtract(int64(9223372036854775807), product)) || (product < int64(0) && micros < langruntime.CheckedI64Subtract((int64(-9223372036854775808)), product)) {
			return intervalInputFail(input, intervalInputRange)
		}
		micros = langruntime.CheckedI64Add(micros, product)
		fractionalMicros = intervalInputFractionMicros(fraction, floatScale)
	} else if unit == 5 || unit == 6 || unit == 7 {
		scale := int64(1)
		if unit == 6 {
			scale = int64(7)
		}
		if whole > langruntime.CheckedI64Divide(int64(2147483647), scale) || whole < langruntime.CheckedI64Divide((int64(-2147483648)), scale) {
			return intervalInputFail(input, intervalInputRange)
		}
		if unit == 7 {
			months = langruntime.CheckedI64Add(months, whole)
			scaled := langruntime.F64Multiply(fraction, float64(30.0))
			extraDays := langruntime.F64ToI32(scaled)
			days = langruntime.CheckedI64Add(days, (int64(langruntime.CheckedI32(extraDays))))
			fractionalMicros = intervalInputFractionMicros(langruntime.F64Subtract(scaled, (float64(extraDays))), float64(86400000000.0))
		} else {
			days = langruntime.CheckedI64Add(days, langruntime.CheckedI64Multiply(whole, scale))
			scaled := fraction
			if unit == 6 {
				scaled = langruntime.F64Multiply(fraction, float64(7.0))
			}
			extraDays := langruntime.F64ToI32(scaled)
			days = langruntime.CheckedI64Add(days, (int64(langruntime.CheckedI32(extraDays))))
			fractionalMicros = intervalInputFractionMicros(langruntime.F64Subtract(scaled, (float64(extraDays))), float64(86400000000.0))
		}
	} else {
		scale := int64(1)
		floatScale := float64(1.0)
		if unit == 9 {
			scale = int64(10)
			floatScale = float64(10.0)
		}
		if unit == 10 {
			scale = int64(100)
			floatScale = float64(100.0)
		}
		if unit == 11 {
			scale = int64(1000)
			floatScale = float64(1000.0)
		}
		if whole > langruntime.CheckedI64Divide(int64(2147483647), scale) || whole < langruntime.CheckedI64Divide((int64(-2147483648)), scale) {
			return intervalInputFail(input, intervalInputRange)
		}
		years = langruntime.CheckedI64Add(years, langruntime.CheckedI64Multiply(whole, scale))
		months = langruntime.CheckedI64Add(months, (int64(langruntime.CheckedI32(intervalInputYearFraction(fraction, floatScale)))))
	}
	if (fractionalMicros > int64(0) && micros > langruntime.CheckedI64Subtract(int64(9223372036854775807), fractionalMicros)) || (fractionalMicros < int64(0) && micros < langruntime.CheckedI64Subtract((int64(-9223372036854775808)), fractionalMicros)) {
		return intervalInputFail(input, intervalInputRange)
	}
	micros = langruntime.CheckedI64Add(micros, fractionalMicros)
	if years < (int64(-2147483648)) || years > int64(2147483647) || months < (int64(-2147483648)) || months > int64(2147483647) || days < (int64(-2147483648)) || days > int64(2147483647) {
		return intervalInputFail(input, intervalInputRange)
	}
	return intervalInputAcc{years: int(int32(years)), months: int(int32(months)), days: int(int32(days)), time: micros, mask: langruntime.CheckedSignedAdd(input.mask, mask), error: 0}
}
func intervalUnitsFromText(input TextValue, fieldMask int) IntervalValue {
	fieldMask = langruntime.CheckedI32(fieldMask)
	if input.Kind == TextValueError {
		error := input.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return IntervalValue{Kind: IntervalValueNull}
	}
	if input.Kind == TextValueValue {
		text := langruntime.CheckedString(input.Value)
		normalized := intervalInputNormalized(text)
		buffer := intervalInputText{chars: []rune(normalized)}
		if len(buffer.chars) > 255 {
			return IntervalValue{Kind: IntervalValueUnknown}
		}
		tokens := []intervalInputToken{}
		tokenStart := 0
		index := 0
		for index < len(buffer.chars) {
			if dateTextSpace(buffer.chars[index]) {
				if tokenStart < index {
					langruntime.CheckedAdd(len(tokens), 1)
					tokens = append(tokens, copyintervalInputToken(intervalInputToken{start: tokenStart, end: index}))
				}
				tokenStart = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		if tokenStart < index {
			langruntime.CheckedAdd(len(tokens), 1)
			tokens = append(tokens, copyintervalInputToken(intervalInputToken{start: tokenStart, end: index}))
		}
		if len(tokens) == 0 {
			return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
		}
		firstToken := intervalTokenText(&buffer, tokens[0])
		if len(tokens) == 1 {
			if firstToken == "infinity" || firstToken == "+infinity" {
				return MakeIntervalValue(2147483647, 2147483647, int64(9223372036854775807))
			}
			if firstToken == "-infinity" {
				return MakeIntervalValue(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1), langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1), int64(-9223372036854775808))
			}
		}
		acc := intervalInputAcc{years: 0, months: 0, days: 0, time: int64(0), mask: 0, error: 0}
		end := len(tokens)
		ago := false
		lastToken := intervalTokenText(&buffer, tokens[langruntime.CheckedSubtract(end, 1)])
		if lastToken == "ago" {
			ago = true
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		start := 0
		if firstToken == "@" {
			start = langruntime.CheckedIndex(1)
		}
		unit := langruntime.CheckedSignedNegate(1)
		pending := false
		implicitUnit := 2
		if fieldMask == 4 {
			implicitUnit = langruntime.CheckedI32(8)
		}
		if fieldMask == 2 || fieldMask == 6 {
			implicitUnit = langruntime.CheckedI32(7)
		}
		if fieldMask == 8 {
			implicitUnit = langruntime.CheckedI32(5)
		}
		if fieldMask == 1024 || fieldMask == 1032 {
			implicitUnit = langruntime.CheckedI32(4)
		}
		if fieldMask == 2048 || fieldMask == 3072 || fieldMask == 3080 {
			implicitUnit = langruntime.CheckedI32(3)
		}
		numbers := 0
		additionalSign := false
		for end > start {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
			token := intervalTokenText(&buffer, tokens[end])
			tokenChars := []rune(token)
			colon := false
			position := 0
			for position < len(tokenChars) {
				if tokenChars[position] == ':' {
					colon = true
				}
				position = langruntime.CheckedAdd(position, 1)
			}
			found := intervalInputUnit(token)
			if colon {
				if pending {
					return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
				}
				acc = copyintervalInputAcc(intervalInputClock(acc, token, fieldMask))
				if acc.error != 0 {
					return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(acc.error)}
				}
				numbers = langruntime.CheckedI32(langruntime.CheckedSignedAdd(numbers, 1))
				if end > start && len(tokenChars) > 0 && (tokenChars[0] == '-' || tokenChars[0] == '+') {
					additionalSign = true
				}
				implicitUnit = langruntime.CheckedI32(5)
			} else if found >= 0 {
				if pending {
					return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
				}
				unit = langruntime.CheckedI32(found)
				pending = true
			} else {
				if len(tokenChars) > 0 && intervalInputAlpha(tokenChars[0]) {
					return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
				}
				whole := intervalInputWhole(token)
				yearMonth := false
				if whole == (Int8Value{Kind: Int8ValueUnknown}) {
					whole = intervalInputYearMonth(token)
					yearMonth = true
				}
				if yearMonth {
					unit = langruntime.CheckedI32(7)
				}
				if whole.Kind == Int8ValueError {
					error := whole.Error
					return IntervalValue{Kind: IntervalValueError, Error: error}
				}
				if whole == (Int8Value{Kind: Int8ValueUnknown}) {
					return IntervalValue{Kind: IntervalValueUnknown}
				}
				if whole.Kind == Int8ValueValue {
					number := whole.Value
					fraction := intervalInputFraction(token)
					if unit < 0 {
						unit = langruntime.CheckedI32(implicitUnit)
					}
					acc = copyintervalInputAcc(intervalInputAdd(acc, number, fraction, unit))
					if acc.error != 0 {
						return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(acc.error)}
					}
					implicitUnit = langruntime.CheckedI32(unit)
					if unit == 4 {
						implicitUnit = langruntime.CheckedI32(5)
					}
					unit = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
					pending = false
					numbers = langruntime.CheckedI32(langruntime.CheckedSignedAdd(numbers, 1))
					numberChars := []rune(token)
					if end > start && len(numberChars) > 0 && (numberChars[0] == '-' || numberChars[0] == '+') {
						additionalSign = true
					}
				}
			}
		}
		if pending || numbers == 0 {
			return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
		}
		firstNumber := intervalTokenText(&buffer, tokens[start])
		first := []rune(firstNumber)
		if numbers > 1 && len(first) > 0 && first[0] == '-' && additionalSign == false {
			return IntervalValue{Kind: IntervalValueUnknown}
		}
		months := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(acc.years))), int64(12)), (int64(langruntime.CheckedI32(acc.months))))
		if months < (int64(-2147483648)) || months > int64(2147483647) {
			return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputFinalRange)}
		}
		if ago {
			if months == (int64(-2147483648)) || acc.days == (langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1)) || acc.time == (int64(-9223372036854775808)) {
				return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputRange)}
			}
			return MakeIntervalValue(int(int32((langruntime.CheckedI64Subtract(int64(0), months)))), langruntime.CheckedSignedSubtract(0, acc.days), langruntime.CheckedI64Subtract(int64(0), acc.time))
		}
		return MakeIntervalValue(int(int32(months)), acc.days, acc.time)
	}
	return IntervalValue{Kind: IntervalValueUnknown}
}
func intervalClockErrorState(error SqlError, fallback int) int {
	fallback = langruntime.CheckedIndex(fallback)
	if fallback == intervalInputSyntax {
		return fallback
	}
	return error.State
}
func intervalInputClock(input intervalInputAcc, text string, fieldMask int) intervalInputAcc {
	input = copyintervalInputAcc(input)
	text = langruntime.CheckedString(text)
	fieldMask = langruntime.CheckedI32(fieldMask)
	buffer := intervalInputText{chars: []rune(text)}
	start := 0
	negative := false
	rangeError := intervalInputRange
	if len(buffer.chars) > 0 && (buffer.chars[0] == '-' || buffer.chars[0] == '+') {
		negative = buffer.chars[0] == '-'
		start = langruntime.CheckedIndex(1)
		rangeError = langruntime.CheckedIndex(intervalInputSyntax)
	}
	fields := []intervalInputToken{}
	index := start
	for index < len(buffer.chars) {
		if buffer.chars[index] == ':' {
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, copyintervalInputToken(intervalInputToken{start: start, end: index}))
			start = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	langruntime.CheckedAdd(len(fields), 1)
	fields = append(fields, copyintervalInputToken(intervalInputToken{start: start, end: index}))
	if len(fields) < 2 || len(fields) > 3 {
		return intervalInputFail(input, intervalInputSyntax)
	}
	firstText := intervalTokenText(&buffer, fields[0])
	secondText := intervalTokenText(&buffer, fields[1])
	firstNumber := intervalInputWhole(firstText)
	secondNumber := intervalInputWhole(secondText)
	if firstNumber.Kind == Int8ValueError {
		error := firstNumber.Error
		return intervalInputFail(input, intervalClockErrorState(error, rangeError))
	}
	if secondNumber.Kind == Int8ValueError {
		error := secondNumber.Error
		return intervalInputFail(input, intervalClockErrorState(error, rangeError))
	}
	if firstNumber == (Int8Value{Kind: Int8ValueUnknown}) || secondNumber == (Int8Value{Kind: Int8ValueUnknown}) {
		return intervalInputFail(input, intervalInputSyntax)
	}
	hours := int64(0)
	minutes := int64(0)
	seconds := int64(0)
	if firstNumber.Kind == Int8ValueValue {
		number := firstNumber.Value
		hours = number
	}
	if secondNumber.Kind == Int8ValueValue {
		number := secondNumber.Value
		minutes = number
	}
	firstChars := []rune(firstText)
	index = langruntime.CheckedIndex(0)
	for index < len(firstChars) {
		if dateTextDigit(firstChars[index]) < 0 {
			return intervalInputFail(input, intervalInputSyntax)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	secondChars := []rune(secondText)
	fractionText := langruntime.NewTextBuffer("0")
	secondPoint := false
	index = langruntime.CheckedIndex(0)
	for index < len(secondChars) {
		if secondChars[index] == '.' {
			secondPoint = true
		}
		if len(fields) == 3 && dateTextDigit(secondChars[index]) < 0 {
			return intervalInputFail(input, intervalInputSyntax)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	if len(fields) == 3 {
		fractionText = langruntime.NewTextBuffer(intervalTokenText(&buffer, fields[2]))
		lastNumber := intervalInputWhole(string(fractionText))
		if lastNumber.Kind == Int8ValueError {
			error := lastNumber.Error
			return intervalInputFail(input, intervalClockErrorState(error, rangeError))
		}
		if lastNumber == (Int8Value{Kind: Int8ValueUnknown}) {
			return intervalInputFail(input, intervalInputSyntax)
		}
		if lastNumber.Kind == Int8ValueValue {
			number := lastNumber.Value
			seconds = number
		}
	} else if secondPoint || fieldMask == 6144 {
		seconds = minutes
		minutes = hours
		hours = int64(0)
		fractionText = langruntime.NewTextBuffer(secondText)
	}
	if hours < int64(0) || minutes < int64(0) || minutes > int64(59) || seconds < int64(0) || seconds > int64(60) || hours > langruntime.CheckedI64Divide(int64(9223372036854775807), int64(3600000000)) {
		return intervalInputFail(input, rangeError)
	}
	fraction := langruntime.F64Multiply(intervalInputFraction(string(fractionText)), float64(1000000.0))
	rounded := langruntime.F64ToI32(fraction)
	extra := langruntime.F64Subtract(fraction, (float64(rounded)))
	if extra > float64(0.5) || (extra == float64(0.5) && langruntime.CheckedSignedRemainder(rounded, 2) != 0) {
		rounded = langruntime.CheckedI32(langruntime.CheckedSignedAdd(rounded, 1))
	}
	micros := int64(langruntime.CheckedI32(rounded))
	hoursMicroseconds := langruntime.CheckedI64Multiply(hours, int64(3600000000))
	if micros > langruntime.CheckedI64Subtract(int64(9223372036854775807), hoursMicroseconds) {
		return intervalInputFail(input, rangeError)
	}
	micros = langruntime.CheckedI64Add(micros, hoursMicroseconds)
	minutesMicroseconds := langruntime.CheckedI64Multiply(minutes, int64(60000000))
	if micros > langruntime.CheckedI64Subtract(int64(9223372036854775807), minutesMicroseconds) {
		return intervalInputFail(input, rangeError)
	}
	micros = langruntime.CheckedI64Add(micros, minutesMicroseconds)
	secondsMicroseconds := langruntime.CheckedI64Multiply(seconds, int64(1000000))
	if micros > langruntime.CheckedI64Subtract(int64(9223372036854775807), secondsMicroseconds) {
		return intervalInputFail(input, rangeError)
	}
	micros = langruntime.CheckedI64Add(micros, secondsMicroseconds)
	if negative {
		micros = langruntime.CheckedI64Subtract(int64(0), micros)
	}
	bit := 1
	for bit <= 16 {
		if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(input.mask, bit)), 2) != 0 {
			return intervalInputFail(input, intervalInputSyntax)
		}
		bit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(bit, 2))
	}
	return intervalInputAcc{years: input.years, months: input.months, days: input.days, time: micros, mask: langruntime.CheckedSignedAdd(input.mask, 31), error: 0}
}

type intervalIsoNumber struct {
	whole        int64
	fractionBits int64
	next         int
	width        int
	error        int
}

func copyintervalIsoNumber(value intervalIsoNumber) intervalIsoNumber {
	return intervalIsoNumber{whole: value.whole, fractionBits: value.fractionBits, next: langruntime.CheckedIndex(value.next), width: langruntime.CheckedIndex(value.width), error: langruntime.CheckedIndex(value.error)}
}
func intervalIsoNumberFail(next int, width int, error int) intervalIsoNumber {
	next = langruntime.CheckedIndex(next)
	width = langruntime.CheckedIndex(width)
	error = langruntime.CheckedIndex(error)
	return intervalIsoNumber{whole: int64(0), fractionBits: int64(0), next: next, width: width, error: error}
}
func intervalIsoRead(input *intervalInputText, start int) intervalIsoNumber {
	start = langruntime.CheckedIndex(start)
	index := start
	number := langruntime.NewTextBuffer("")
	if index < len(input.chars) && input.chars[index] == '-' {
		number = append(number, string(langruntime.CheckedChar('-'))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	width := 0
	for index < len(input.chars) && dateTextDigit(input.chars[index]) >= 0 {
		number = append(number, string(langruntime.CheckedChar(input.chars[index]))...)
		index = langruntime.CheckedAdd(index, 1)
		width = langruntime.CheckedAdd(width, 1)
	}
	digits := width
	if index < len(input.chars) && input.chars[index] == '.' {
		number = append(number, string(langruntime.CheckedChar('.'))...)
		index = langruntime.CheckedAdd(index, 1)
		for index < len(input.chars) && dateTextDigit(input.chars[index]) >= 0 {
			number = append(number, string(langruntime.CheckedChar(input.chars[index]))...)
			index = langruntime.CheckedAdd(index, 1)
			digits = langruntime.CheckedAdd(digits, 1)
		}
	}
	if digits == 0 {
		return intervalIsoNumberFail(index, width, intervalInputSyntax)
	}
	if index < len(input.chars) && (input.chars[index] == 'e' || input.chars[index] == 'E') {
		number = append(number, string(langruntime.CheckedChar(input.chars[index]))...)
		index = langruntime.CheckedAdd(index, 1)
		if index < len(input.chars) && (input.chars[index] == '-' || input.chars[index] == '+') {
			number = append(number, string(langruntime.CheckedChar(input.chars[index]))...)
			index = langruntime.CheckedAdd(index, 1)
		}
		exponent := index
		for index < len(input.chars) && dateTextDigit(input.chars[index]) >= 0 {
			number = append(number, string(langruntime.CheckedChar(input.chars[index]))...)
			index = langruntime.CheckedAdd(index, 1)
		}
		if index == exponent {
			return intervalIsoNumberFail(index, width, intervalInputSyntax)
		}
	}
	spelling := string(number)
	value := langruntime.F64FromText(spelling, float64(1.0e16))
	infinity := langruntime.F64Divide(float64(1.0), float64(0.0))
	if langruntime.F64Abs(value) == infinity {
		return intervalIsoNumberFail(index, width, intervalInputSyntax)
	}
	if value < float64(-1.0e15) || value > float64(1.0e15) || value != value {
		return intervalIsoNumberFail(index, width, intervalInputRange)
	}
	letters := []rune(string(number))
	digitIndex := 0
	nonzero := false
	for digitIndex < len(letters) && letters[digitIndex] != 'e' && letters[digitIndex] != 'E' {
		if dateTextDigit(letters[digitIndex]) > 0 {
			nonzero = true
		}
		digitIndex = langruntime.CheckedAdd(digitIndex, 1)
	}
	if (value == float64(0.0) && nonzero) || (value != float64(0.0) && langruntime.F64Abs(value) < float64(2.2250738585072014e-308)) {
		return intervalIsoNumberFail(index, width, intervalInputSyntax)
	}
	high := langruntime.F64ToI32((langruntime.F64Divide(value, float64(1000000000.0))))
	rest := langruntime.F64Subtract(value, langruntime.F64Multiply((float64(high)), float64(1000000000.0)))
	low := langruntime.F64ToI32(rest)
	fraction := langruntime.F64Subtract(rest, (float64(low)))
	fractionBits := langruntime.F64ToI64Bits(fraction)
	return intervalIsoNumber{whole: langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(high))), int64(1000000000)), (int64(langruntime.CheckedI32(low)))), fractionBits: fractionBits, next: index, width: width, error: 0}
}
func intervalIsoApply(input intervalInputAcc, whole int64, fraction float64, unit int) intervalInputAcc {
	input = copyintervalInputAcc(input)
	unit = langruntime.CheckedI32(unit)
	clean := intervalInputAcc{years: input.years, months: input.months, days: input.days, time: input.time, mask: 0, error: input.error}
	return intervalInputAdd(clean, whole, fraction, unit)
}

type intervalIsoStep struct {
	acc      intervalInputAcc
	next     int
	timepart bool
	finished bool
}

func copyintervalIsoStep(value intervalIsoStep) intervalIsoStep {
	return intervalIsoStep{acc: copyintervalInputAcc(value.acc), next: langruntime.CheckedIndex(value.next), timepart: value.timepart, finished: value.finished}
}
func intervalIsoMakeStep(acc intervalInputAcc, next int, timepart bool, finished bool) intervalIsoStep {
	acc = copyintervalInputAcc(acc)
	next = langruntime.CheckedIndex(next)
	return intervalIsoStep{acc: acc, next: next, timepart: timepart, finished: finished}
}
func intervalIsoStepFail(acc intervalInputAcc, error int) intervalIsoStep {
	acc = copyintervalInputAcc(acc)
	error = langruntime.CheckedIndex(error)
	if acc.error != 0 {
		return intervalIsoMakeStep(acc, 0, false, true)
	}
	return intervalIsoMakeStep(intervalInputFail(acc, error), 0, false, true)
}
func intervalIsoAlternative(input *intervalInputText, acc intervalInputAcc, number intervalIsoNumber, next int, datepart bool, designator rune, ended bool) intervalIsoStep {
	acc = copyintervalInputAcc(acc)
	number = copyintervalIsoNumber(number)
	next = langruntime.CheckedIndex(next)
	designator = langruntime.CheckedChar(designator)
	result := acc
	if datepart {
		if number.width == 8 && (ended || designator == 'T') {
			result = copyintervalInputAcc(intervalIsoApply(result, langruntime.CheckedI64Divide(number.whole, int64(10000)), float64(0.0), 8))
			result = copyintervalInputAcc(intervalIsoApply(result, langruntime.CheckedI64Remainder((langruntime.CheckedI64Divide(number.whole, int64(100))), int64(100)), float64(0.0), 7))
			result = copyintervalInputAcc(intervalIsoApply(result, langruntime.CheckedI64Remainder(number.whole, int64(100)), Float8Number(number.fractionBits), 5))
			return intervalIsoMakeStep(result, next, true, ended)
		}
		result = copyintervalInputAcc(intervalIsoApply(result, number.whole, Float8Number(number.fractionBits), 8))
		if ended || designator == 'T' {
			return intervalIsoMakeStep(result, next, true, ended)
		}
		month := intervalIsoRead(input, next)
		if month.error != 0 {
			return intervalIsoStepFail(result, month.error)
		}
		result = copyintervalInputAcc(intervalIsoApply(result, month.whole, Float8Number(month.fractionBits), 7))
		if month.next == len(input.chars) {
			return intervalIsoMakeStep(result, month.next, false, true)
		}
		if input.chars[month.next] == 'T' {
			return intervalIsoMakeStep(result, month.next, true, false)
		}
		if input.chars[month.next] != '-' {
			return intervalIsoStepFail(result, intervalInputSyntax)
		}
		day := intervalIsoRead(input, langruntime.CheckedAdd(month.next, 1))
		if day.error != 0 {
			return intervalIsoStepFail(result, day.error)
		}
		result = copyintervalInputAcc(intervalIsoApply(result, day.whole, Float8Number(day.fractionBits), 5))
		if day.next == len(input.chars) {
			return intervalIsoMakeStep(result, day.next, false, true)
		}
		if input.chars[day.next] == 'T' {
			return intervalIsoMakeStep(result, day.next, true, false)
		}
		return intervalIsoStepFail(result, intervalInputSyntax)
	}
	if number.width == 6 && ended {
		result = copyintervalInputAcc(intervalIsoApply(result, langruntime.CheckedI64Divide(number.whole, int64(10000)), float64(0.0), 4))
		result = copyintervalInputAcc(intervalIsoApply(result, langruntime.CheckedI64Remainder((langruntime.CheckedI64Divide(number.whole, int64(100))), int64(100)), float64(0.0), 3))
		result = copyintervalInputAcc(intervalIsoApply(result, langruntime.CheckedI64Remainder(number.whole, int64(100)), float64(0.0), 2))
		result = copyintervalInputAcc(intervalIsoApply(result, int64(0), Float8Number(number.fractionBits), 0))
		return intervalIsoMakeStep(result, next, true, true)
	}
	result = copyintervalInputAcc(intervalIsoApply(result, number.whole, Float8Number(number.fractionBits), 4))
	if ended {
		return intervalIsoMakeStep(result, next, true, true)
	}
	minute := intervalIsoRead(input, next)
	if minute.error != 0 {
		return intervalIsoStepFail(result, minute.error)
	}
	result = copyintervalInputAcc(intervalIsoApply(result, minute.whole, Float8Number(minute.fractionBits), 3))
	if minute.next == len(input.chars) {
		return intervalIsoMakeStep(result, minute.next, true, true)
	}
	if input.chars[minute.next] != ':' {
		return intervalIsoStepFail(result, intervalInputSyntax)
	}
	second := intervalIsoRead(input, langruntime.CheckedAdd(minute.next, 1))
	if second.error != 0 {
		return intervalIsoStepFail(result, second.error)
	}
	result = copyintervalInputAcc(intervalIsoApply(result, second.whole, Float8Number(second.fractionBits), 2))
	if second.next == len(input.chars) {
		return intervalIsoMakeStep(result, second.next, true, true)
	}
	return intervalIsoStepFail(result, intervalInputSyntax)
}
func intervalIsoFinish(acc intervalInputAcc) IntervalValue {
	acc = copyintervalInputAcc(acc)
	if acc.error != 0 {
		return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(acc.error)}
	}
	months := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(acc.years))), int64(12)), (int64(langruntime.CheckedI32(acc.months))))
	if months < (int64(-2147483648)) || months > int64(2147483647) {
		return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputFinalRange)}
	}
	return MakeIntervalValue(int(int32(months)), acc.days, acc.time)
}
func intervalInputIso(text string) IntervalValue {
	text = langruntime.CheckedString(text)
	input := intervalInputText{chars: []rune(text)}
	if len(input.chars) < 2 || input.chars[0] != 'P' {
		return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
	}
	acc := intervalInputAcc{years: 0, months: 0, days: 0, time: int64(0), mask: 0, error: 0}
	datepart := true
	havefield := false
	index := 1
	for index < len(input.chars) {
		if input.chars[index] == 'T' {
			datepart = false
			havefield = false
			index = langruntime.CheckedAdd(index, 1)
		} else {
			number := intervalIsoRead(&input, index)
			if number.error != 0 {
				return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(number.error)}
			}
			index = langruntime.CheckedIndex(number.next)
			ended := index == len(input.chars)
			designator := '?'
			if ended == false {
				designator = langruntime.CheckedChar(input.chars[index])
				index = langruntime.CheckedAdd(index, 1)
			}
			unit := langruntime.CheckedSignedNegate(1)
			if datepart {
				if designator == 'Y' {
					unit = langruntime.CheckedI32(8)
				}
				if designator == 'M' {
					unit = langruntime.CheckedI32(7)
				}
				if designator == 'W' {
					unit = langruntime.CheckedI32(6)
				}
				if designator == 'D' {
					unit = langruntime.CheckedI32(5)
				}
			} else {
				if designator == 'H' {
					unit = langruntime.CheckedI32(4)
				}
				if designator == 'M' {
					unit = langruntime.CheckedI32(3)
				}
				if designator == 'S' {
					unit = langruntime.CheckedI32(2)
				}
			}
			if unit >= 0 {
				acc = copyintervalInputAcc(intervalIsoApply(acc, number.whole, Float8Number(number.fractionBits), unit))
				havefield = true
			} else {
				alternative := ended || (datepart && (designator == '-' || designator == 'T')) || (datepart == false && designator == ':')
				if alternative {
					if havefield {
						return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
					}
					step := intervalIsoAlternative(&input, acc, number, index, datepart, designator, ended)
					acc = copyintervalInputAcc(step.acc)
					if step.finished {
						return intervalIsoFinish(acc)
					}
					index = langruntime.CheckedIndex(step.next)
					datepart = step.timepart == false
					havefield = false
				} else {
					if designator == 'x' || designator == 'X' {
						return IntervalValue{Kind: IntervalValueUnknown}
					}
					return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
				}
			}
			if acc.error != 0 {
				return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(acc.error)}
			}
		}
	}
	return intervalIsoFinish(acc)
}
func IntervalFromTextFields(input TextValue, fields Int4Value) IntervalValue {
	if input.Kind == TextValueError {
		error := input.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	if fields.Kind == Int4ValueError {
		error := fields.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	if input == (TextValue{Kind: TextValueUnknown}) || fields == (Int4Value{Kind: Int4ValueUnknown}) {
		return IntervalValue{Kind: IntervalValueUnknown}
	}
	if input == (TextValue{Kind: TextValueNull}) || fields == (Int4Value{Kind: Int4ValueNull}) {
		return IntervalValue{Kind: IntervalValueNull}
	}
	fieldMask := 32767
	if fields.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(fields.Value)
		fieldMask = langruntime.CheckedI32(value)
	}
	if input.Kind == TextValueValue {
		text := langruntime.CheckedString(input.Value)
		chars := []rune(text)
		start := 0
		for start < len(chars) && dateTextSpace(chars[start]) {
			start = langruntime.CheckedAdd(start, 1)
		}
		if start < len(chars) && chars[start] == 'P' {
			if len(chars) > 255 {
				return IntervalValue{Kind: IntervalValueUnknown}
			}
			return intervalInputIso(text)
		}
		return intervalUnitsFromText(TextValue{Kind: TextValueValue, Value: text}, fieldMask)
	}
	return intervalUnitsFromText(input, fieldMask)
}
func intervalInputAlpha(character rune) bool {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(langruntime.AsciiLowercase(character)))
	return code >= 97 && code <= 122
}
func intervalInputNormalized(text string) string {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	index := 0
	previous := ' '
	dateField := false
	word := false
	output := langruntime.NewTextBuffer("")
	for index < len(chars) {
		current := chars[index]
		if dateTextSpace(current) {
			dateField = false
			word = false
		}
		if dateField && (current == '.' || current == '+') {
			output = append(output, string(langruntime.CheckedChar(' '))...)
			dateField = false
			word = false
		}
		if current == '-' && dateTextDigit(previous) >= 0 && word == false {
			dateField = true
		}
		if (dateTextDigit(previous) >= 0 && intervalInputAlpha(current)) || previous == '@' {
			output = append(output, string(langruntime.CheckedChar(' '))...)
			dateField = false
		}
		if intervalInputAlpha(current) {
			word = true
		}
		output = append(output, string(langruntime.CheckedChar(current))...)
		previous = langruntime.CheckedChar(current)
		index = langruntime.CheckedAdd(index, 1)
	}
	return string(output)
}
func intervalInputYearMonth(text string) Int8Value {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	index := 0
	negative := false
	if index < len(chars) && (chars[index] == '-' || chars[index] == '+') {
		negative = chars[index] == '-'
		index = langruntime.CheckedAdd(index, 1)
	}
	start := index
	for index < len(chars) && dateTextDigit(chars[index]) >= 0 {
		index = langruntime.CheckedAdd(index, 1)
	}
	if index == start || index == len(chars) || chars[index] != '-' {
		return Int8Value{Kind: Int8ValueUnknown}
	}
	separator := index
	first := langruntime.NewTextBuffer("")
	index = langruntime.CheckedIndex(0)
	for index < separator {
		first = append(first, string(langruntime.CheckedChar(chars[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	second := langruntime.NewTextBuffer("")
	index = langruntime.CheckedIndex(langruntime.CheckedAdd(separator, 1))
	for index < len(chars) {
		if chars[index] == '.' {
			return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputSyntax)}
		}
		second = append(second, string(langruntime.CheckedChar(chars[index]))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	years := intervalInputWhole(string(first))
	months := intervalInputWhole(string(second))
	if langruntime.CheckedAdd(separator, 1) == len(chars) {
		months = Int8Value{Kind: Int8ValueValue, Value: int64(0)}
	}
	if years.Kind == Int8ValueError {
		error := years.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if months.Kind == Int8ValueError {
		error := months.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if years.Kind == Int8ValueValue {
		year := years.Value
		if months.Kind == Int8ValueValue {
			month := months.Value
			if month < int64(0) || month > int64(11) || year > langruntime.CheckedI64Divide(int64(9223372036854775807), int64(12)) || year < langruntime.CheckedI64Divide((int64(-9223372036854775808)), int64(12)) {
				return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputRange)}
			}
			product := langruntime.CheckedI64Multiply(year, int64(12))
			value := int64(0)
			if negative {
				if product < langruntime.CheckedI64Add((int64(-9223372036854775808)), month) {
					return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputRange)}
				}
				value = langruntime.CheckedI64Subtract(product, month)
			} else {
				if product > langruntime.CheckedI64Subtract(int64(9223372036854775807), month) {
					return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputRange)}
				}
				value = langruntime.CheckedI64Add(product, month)
			}
			return Int8Value{Kind: Int8ValueValue, Value: value}
		}
	}
	return Int8Value{Kind: Int8ValueError, Error: MakeSqlError(intervalInputSyntax)}
}
func IntervalFromText(input TextValue) IntervalValue {
	return IntervalFromTextFields(input, MakeInt4Value(32767))
}
func AndStops(left CheckOutcome) bool {
	if left == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return true
	}
	if left.Kind == CheckOutcomeError {
		return true
	}
	return false
}
func AndFinish(left CheckOutcome, right CheckOutcome) CheckOutcome {
	if left.Kind == CheckOutcomeError {
		error := left.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if right.Kind == CheckOutcomeError {
		error := right.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeFalse}) || right == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return CheckOutcome{Kind: CheckOutcomeFalse}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || right == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeNull}) || right == (CheckOutcome{Kind: CheckOutcomeNull}) {
		return CheckOutcome{Kind: CheckOutcomeNull}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func OrStops(left CheckOutcome) bool {
	if left == (CheckOutcome{Kind: CheckOutcomeTrue}) {
		return true
	}
	if left.Kind == CheckOutcomeError {
		return true
	}
	return false
}
func OrFinish(left CheckOutcome, right CheckOutcome) CheckOutcome {
	if left.Kind == CheckOutcomeError {
		error := left.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if right.Kind == CheckOutcomeError {
		error := right.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeTrue}) || right == (CheckOutcome{Kind: CheckOutcomeTrue}) {
		return CheckOutcome{Kind: CheckOutcomeTrue}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || right == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeNull}) || right == (CheckOutcome{Kind: CheckOutcomeNull}) {
		return CheckOutcome{Kind: CheckOutcomeNull}
	}
	return CheckOutcome{Kind: CheckOutcomeFalse}
}
func NotFinish(value CheckOutcome) CheckOutcome {
	if value == (CheckOutcome{Kind: CheckOutcomeTrue}) {
		return CheckOutcome{Kind: CheckOutcomeFalse}
	}
	if value == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return CheckOutcome{Kind: CheckOutcomeTrue}
	}
	return value
}
func booleanTestFinish(value CheckOutcome, matched bool) CheckOutcome {
	if CaseGuardStops(value) {
		return value
	}
	if matched {
		return CheckOutcome{Kind: CheckOutcomeTrue}
	}
	return CheckOutcome{Kind: CheckOutcomeFalse}
}
func IsTrueFinish(value CheckOutcome) CheckOutcome {
	return booleanTestFinish(value, value == (CheckOutcome{Kind: CheckOutcomeTrue}))
}
func IsFalseFinish(value CheckOutcome) CheckOutcome {
	return booleanTestFinish(value, value == (CheckOutcome{Kind: CheckOutcomeFalse}))
}
func IsUnknownFinish(value CheckOutcome) CheckOutcome {
	return booleanTestFinish(value, value == (CheckOutcome{Kind: CheckOutcomeNull}))
}
func DistinctNeedsComparison(leftNull BoolValue, rightNull BoolValue) bool {
	return leftNull == (BoolValue{Kind: BoolValueValue, Value: false}) && rightNull == (BoolValue{Kind: BoolValueValue, Value: false})
}
func DistinctNullsFinish(leftNull BoolValue, rightNull BoolValue) CheckOutcome {
	if leftNull.Kind == BoolValueError {
		error := leftNull.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if rightNull.Kind == BoolValueError {
		error := rightNull.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if leftNull.Kind == BoolValueValue {
		left := leftNull.Value
		if rightNull.Kind == BoolValueValue {
			right := rightNull.Value
			if left && right {
				return CheckOutcome{Kind: CheckOutcomeFalse}
			}
			if left || right {
				return CheckOutcome{Kind: CheckOutcomeTrue}
			}
		}
	}
	return CheckOutcome{Kind: CheckOutcomeUnknown}
}
func CaseGuardStops(value CheckOutcome) bool {
	if value == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return true
	}
	if value.Kind == CheckOutcomeError {
		return true
	}
	return false
}
func MinmaxNullsChooseRight(leftNull BoolValue, rightNull BoolValue) CheckOutcome {
	if leftNull.Kind == BoolValueError {
		error := leftNull.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if rightNull.Kind == BoolValueError {
		error := rightNull.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if leftNull.Kind == BoolValueValue {
		left := leftNull.Value
		if rightNull.Kind == BoolValueValue {
			right := rightNull.Value
			if left && right == false {
				return CheckOutcome{Kind: CheckOutcomeTrue}
			}
			return CheckOutcome{Kind: CheckOutcomeFalse}
		}
	}
	return CheckOutcome{Kind: CheckOutcomeUnknown}
}
func CaseGuardTakes(value CheckOutcome) bool {
	return value == (CheckOutcome{Kind: CheckOutcomeTrue})
}
func RowCompareContinues(value Int4Value) bool {
	if value.Kind == Int4ValueValue {
		ordering := langruntime.CheckedI32(value.Value)
		return ordering == 0
	}
	return false
}
func RowCompareFinish(value Int4Value, strategy int) BoolValue {
	strategy = langruntime.CheckedI32(strategy)
	if value.Kind == Int4ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if value == (Int4Value{Kind: Int4ValueNull}) {
		return BoolValue{Kind: BoolValueNull}
	}
	if value.Kind == Int4ValueValue {
		ordering := langruntime.CheckedI32(value.Value)
		if strategy == 1 {
			return BoolValue{Kind: BoolValueValue, Value: ordering < 0}
		}
		if strategy == 2 {
			return BoolValue{Kind: BoolValueValue, Value: ordering <= 0}
		}
		if strategy == 4 {
			return BoolValue{Kind: BoolValueValue, Value: ordering >= 0}
		}
		if strategy == 5 {
			return BoolValue{Kind: BoolValueValue, Value: ordering > 0}
		}
	}
	return BoolValue{Kind: BoolValueUnknown}
}
func ConstantFinish(left CheckOutcome, right CheckOutcome) CheckOutcome {
	if left.Kind == CheckOutcomeError {
		error := left.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if right.Kind == CheckOutcomeError {
		error := right.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || right == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
