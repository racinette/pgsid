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

func SqlErrorMessage(error SqlError) SqlErrorDescription {
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
)

type ByteaValue struct {
	Kind  ByteaValueKind
	Value string
	Error SqlError
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

func Float8Semantic(input Float8Value) Float8Value {
	if input == (Float8Value{Kind: Float8ValueUnspecifiedNan}) {
		return MakeFloat8Bits(int64(9221120237041090560))
	}
	return input
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
func hashBytesState(bytes []HashByte, seed int64) hashState {
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
			place = langruntime.CheckedI64Multiply(place, int64(256))
			if position == 4 || position == 8 {
				place = int64(1)
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
		place = langruntime.CheckedI64Multiply(place, int64(256))
		if position == 4 {
			place = int64(1)
		}
		if position == 8 {
			place = int64(256)
		}
	}
	return hashFinal(hashState{a: a, b: b, c: c})
}
func HashBytes32(bytes []HashByte) int {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	state := hashBytesState(bytes, int64(0))
	return int(int32(state.c))
}
func HashBytes64(bytes []HashByte, seed int64) int64 {
	bytes = langruntime.CheckedStructs(bytes, CopyHashByte)
	state := hashBytesState(bytes, seed)
	high := state.b
	if high >= int64(2147483648) {
		high = langruntime.CheckedI64Subtract(high, int64(4294967296))
	}
	return langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(high, int64(4294967296)), state.c)
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
