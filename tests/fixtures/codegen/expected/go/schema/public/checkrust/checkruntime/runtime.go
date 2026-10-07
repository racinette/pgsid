package checkruntime

import langruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/langruntime"

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

type EnumValueKind uint8

const (
	EnumValueUnknown EnumValueKind = iota
	EnumValueNull
	EnumValueValue
	EnumValueError
)

type EnumValue struct {
	Kind  EnumValueKind
	Value int
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
	return EnumValue{Kind: EnumValueValue, Value: value}
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
const sqlErrorDivisionByZero = 3452582
const sqlErrorInvalidRegex = 3452591
const sqlErrorInvalidParameter = 3452619
const sqlErrorInvalidTextRepresentation = 3484946
const sqlErrorStringLengthMismatch = 3452622
const sqlErrorStringRightTruncation = 3452545
const sqlErrorArraySubscript = 3452630
const sqlErrorProgramLimit = 8584704

func SqlErrorMessage(error SqlError) SqlErrorDescription {
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
	output := ""
	index := 0
	for index < len(chars) {
		character := langruntime.AsciiLowercase(chars[index])
		code := int(langruntime.CheckedChar(character))
		if (code < 48 || code > 57) && (code < 97 || code > 102) {
			return ByteaValue{Kind: ByteaValueUnknown}
		}
		output = output + string(langruntime.CheckedChar(character))
		even = even == false
		index = langruntime.CheckedAdd(index, 1)
	}
	if even == false {
		return ByteaValue{Kind: ByteaValueUnknown}
	}
	return ByteaValue{Kind: ByteaValueValue, Value: output}
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
func numericSpace(value rune) bool {
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
	for begin < end && numericSpace(chars[begin]) {
		begin = langruntime.CheckedAdd(begin, 1)
	}
	for end > begin && numericSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
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
			digit := hexDigit(chars[index])
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
				high := hexDigit(chars[index])
				if high > 15 || len(octets) == 4 {
					return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
				}
				index = langruntime.CheckedAdd(index, 1)
				low := 0
				if index < end {
					low = langruntime.CheckedI32(hexDigit(chars[index]))
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
					digit := hexDigit(chars[index])
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
						digit := hexDigit(chars[index])
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
					digit := hexDigit(chars[index])
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
	text = langruntime.CheckedBorrowed(text, copymacText)
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
		digit := hexDigit(text.chars[index])
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
	text = langruntime.CheckedBorrowed(text, copymacText)
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
	text = langruntime.CheckedBorrowed(text, copymacText)
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
	text = langruntime.CheckedBorrowed(text, copymacText)
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
		high := hexDigit(text.chars[index])
		low := hexDigit(text.chars[langruntime.CheckedAdd(index, 1)])
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
			digit := hexDigit(chars[index])
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
	output := ""
	for index < len(chars) {
		ch := chars[index]
		if hexadecimal {
			digit := hexDigit(ch)
			if digit == 16 {
				return BitValue{Kind: BitValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			weight := 8
			for weight > 0 {
				if langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(digit, weight), 2) == 0 {
					output = output + string(langruntime.CheckedChar('0'))
				} else {
					output = output + string(langruntime.CheckedChar('1'))
				}
				weight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(weight, 2))
			}
		} else {
			if ch != '0' && ch != '1' {
				return BitValue{Kind: BitValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
			}
			output = output + string(langruntime.CheckedChar(ch))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return BitValue{Kind: BitValueValue, Value: output}
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
func hashXor(left int64, right int64) int64 {
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
	a = hashXor(a, rotated0)
	c = hashWrap(langruntime.CheckedI64Add(c, b))
	b = hashWrap(langruntime.CheckedI64Subtract(b, a))
	rotated1 := hashRotate(a, 6)
	b = hashXor(b, rotated1)
	a = hashWrap(langruntime.CheckedI64Add(a, c))
	c = hashWrap(langruntime.CheckedI64Subtract(c, b))
	rotated2 := hashRotate(b, 8)
	c = hashXor(c, rotated2)
	b = hashWrap(langruntime.CheckedI64Add(b, a))
	a = hashWrap(langruntime.CheckedI64Subtract(a, c))
	rotated3 := hashRotate(c, 16)
	a = hashXor(a, rotated3)
	c = hashWrap(langruntime.CheckedI64Add(c, b))
	b = hashWrap(langruntime.CheckedI64Subtract(b, a))
	rotated4 := hashRotate(a, 19)
	b = hashXor(b, rotated4)
	a = hashWrap(langruntime.CheckedI64Add(a, c))
	c = hashWrap(langruntime.CheckedI64Subtract(c, b))
	rotated5 := hashRotate(b, 4)
	c = hashXor(c, rotated5)
	b = hashWrap(langruntime.CheckedI64Add(b, a))
	return hashState{a: a, b: b, c: c}
}
func hashFinal(state hashState) hashState {
	state = copyhashState(state)
	a := state.a
	b := state.b
	c := state.c
	c = hashXor(c, b)
	rotated0 := hashRotate(b, 14)
	c = hashWrap(langruntime.CheckedI64Subtract(c, rotated0))
	a = hashXor(a, c)
	rotated1 := hashRotate(c, 11)
	a = hashWrap(langruntime.CheckedI64Subtract(a, rotated1))
	b = hashXor(b, a)
	rotated2 := hashRotate(a, 25)
	b = hashWrap(langruntime.CheckedI64Subtract(b, rotated2))
	c = hashXor(c, b)
	rotated3 := hashRotate(b, 16)
	c = hashWrap(langruntime.CheckedI64Subtract(c, rotated3))
	a = hashXor(a, c)
	rotated4 := hashRotate(c, 4)
	a = hashWrap(langruntime.CheckedI64Subtract(a, rotated4))
	b = hashXor(b, a)
	rotated5 := hashRotate(a, 14)
	b = hashWrap(langruntime.CheckedI64Subtract(b, rotated5))
	c = hashXor(c, b)
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
	output := ""
	position := len(reversed)
	for position > 0 {
		position = langruntime.CheckedIndex(langruntime.CheckedSubtract(position, 1))
		output = output + string(langruntime.CheckedChar(reversed[position]))
	}
	return output
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
	output := value
	output = output + string(langruntime.CheckedChar(digits[highIndex]))
	output = output + string(langruntime.CheckedChar(digits[lowIndex]))
	return output
}
func hexDigit(ch rune) int {
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
			bc = true
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		} else if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 1)]) == 'd' && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 2)]) == 'a' {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		}
		for start < end && dateTextSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
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
	text = langruntime.CheckedBorrowed(text, copytimestampText)
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
func timestampCalendarMicroseconds(year int, month int, day int, hour int, minute int, second int, microsecond int, offsetSeconds int, withTimezone bool) Int8Value {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	offsetSeconds = langruntime.CheckedI32(offsetSeconds)
	if hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 || microsecond < 0 || microsecond > 999999 {
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
			return timestampCalendarMicroseconds(year, month.value, day.value, 0, 0, 0, 0, 0, false)
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
				digits := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(digits.next)
				if digits.digits < 1 || digits.digits > 6 {
					return Int8Value{Kind: Int8ValueUnknown}
				}
				fraction = langruntime.CheckedI32(digits.value)
				fractionDigits := digits.digits
				for fractionDigits < 6 {
					fraction = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(fraction, 10))
					fractionDigits = langruntime.CheckedAdd(fractionDigits, 1)
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
		return timestampCalendarMicroseconds(year, month.value, day.value, hour.value, minute.value, second, fraction, offset, withTimezone)
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
	parsed := timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, 0, false)
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
	parsed := timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, offsetSeconds, true)
	return timestamptzFromMicroseconds(parsed)
}
func TimestamptzFromText(value TextValue) TimestamptzValue {
	parsed := parseTimestampText(value, true)
	return timestamptzFromMicroseconds(parsed)
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
func CaseGuardStops(value CheckOutcome) bool {
	if value == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
		return true
	}
	if value.Kind == CheckOutcomeError {
		return true
	}
	return false
}
func CaseGuardTakes(value CheckOutcome) bool {
	return value == (CheckOutcome{Kind: CheckOutcomeTrue})
}
