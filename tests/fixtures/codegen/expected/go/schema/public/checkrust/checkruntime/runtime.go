package checkruntime

import langruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/langruntime"

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

func CopyInt4Value(value Int4Value) Int4Value {
	switch value.Kind {
	case Int4ValueUnknown:
		return Int4Value{Kind: Int4ValueUnknown}
	case Int4ValueNull:
		return Int4Value{Kind: Int4ValueNull}
	case Int4ValueValue:
		return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedI32(value.Value)}
	case Int4ValueError:
		return Int4Value{Kind: Int4ValueError, Error: value.Error}
	}
	panic("unknown enum variant")
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

const timestamptzFieldOverflow = 3452552

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

func CopyTimestamptzValue(value TimestamptzValue) TimestamptzValue {
	switch value.Kind {
	case TimestamptzValueUnknown:
		return TimestamptzValue{Kind: TimestamptzValueUnknown}
	case TimestamptzValueNull:
		return TimestamptzValue{Kind: TimestamptzValueNull}
	case TimestamptzValueValue:
		return TimestamptzValue{Kind: TimestamptzValueValue, Value: value.Value}
	case TimestamptzValueError:
		return TimestamptzValue{Kind: TimestamptzValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func TimestamptzUnknown() TimestamptzValue {
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
}
func TimestamptzNull() TimestamptzValue {
	return TimestamptzValue{Kind: TimestamptzValueNull}
}
func MakeTimestamptzValue(value int64) TimestamptzValue {
	if value != int64(-9223372036854775808) && value != int64(9223372036854775807) {
		if value < int64(-211813488000000000) || value >= int64(9223371331200000000) {
			return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: timestamptzFieldOverflow}}
		}
	}
	return TimestamptzValue{Kind: TimestamptzValueValue, Value: value}
}
func TimestamptzIsNull(value TimestamptzValue) BoolValue {
	value = CopyTimestamptzValue(value)
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

func CopyEnumValue(value EnumValue) EnumValue {
	switch value.Kind {
	case EnumValueUnknown:
		return EnumValue{Kind: EnumValueUnknown}
	case EnumValueNull:
		return EnumValue{Kind: EnumValueNull}
	case EnumValueValue:
		return EnumValue{Kind: EnumValueValue, Value: langruntime.CheckedI32(value.Value)}
	case EnumValueError:
		return EnumValue{Kind: EnumValueError, Error: value.Error}
	}
	panic("unknown enum variant")
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
	value = CopyEnumValue(value)
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

func CopyDateValue(value DateValue) DateValue {
	switch value.Kind {
	case DateValueUnknown:
		return DateValue{Kind: DateValueUnknown}
	case DateValueNull:
		return DateValue{Kind: DateValueNull}
	case DateValueValue:
		return DateValue{Kind: DateValueValue, Value: langruntime.CheckedI32(value.Value)}
	case DateValueError:
		return DateValue{Kind: DateValueError, Error: value.Error}
	}
	panic("unknown enum variant")
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
	value = CopyDateValue(value)
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

func CopyTextValue(value TextValue) TextValue {
	switch value.Kind {
	case TextValueUnknown:
		return TextValue{Kind: TextValueUnknown}
	case TextValueNull:
		return TextValue{Kind: TextValueNull}
	case TextValueValue:
		return TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(value.Value)}
	case TextValueError:
		return TextValue{Kind: TextValueError, Error: value.Error}
	}
	panic("unknown enum variant")
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

func CopyBoolValue(value BoolValue) BoolValue {
	switch value.Kind {
	case BoolValueUnknown:
		return BoolValue{Kind: BoolValueUnknown}
	case BoolValueNull:
		return BoolValue{Kind: BoolValueNull}
	case BoolValueValue:
		return BoolValue{Kind: BoolValueValue, Value: value.Value}
	case BoolValueError:
		return BoolValue{Kind: BoolValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func CheckFromBool(value BoolValue) CheckOutcome {
	value = CopyBoolValue(value)
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
	value = CopyInt4Value(value)
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
	value = CopyTextValue(value)
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
	value = CopyBoolValue(value)
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
	value = CopyBoolValue(value)
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
	value = CopyTextValue(value)
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
func TimestamptzFromCalendar(year int, month int, day int, hour int, minute int, second int, microsecond int, offsetSeconds int) TimestamptzValue {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	offsetSeconds = langruntime.CheckedI32(offsetSeconds)
	if hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 || microsecond < 0 || microsecond > 999999 {
		return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: timestamptzFieldOverflow}}
	}
	clockSeconds := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(hour, 60), minute)), 60), second)
	clockWide := int64(langruntime.CheckedI32(clockSeconds))
	fractionWide := int64(langruntime.CheckedI32(microsecond))
	clock := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(clockWide, int64(1000000)), fractionWide)
	if clock > int64(86400000000) {
		return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: timestamptzFieldOverflow}}
	}
	if offsetSeconds < langruntime.CheckedSignedNegate(57599) || offsetSeconds > 57599 {
		return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: invalidTimestampZone}}
	}
	days := calendarDaysFromYmd(year, month, day)
	if days.Kind == Int4ValueError {
		error := days.Error
		return TimestamptzValue{Kind: TimestamptzValueError, Error: error}
	}
	if days.Kind == Int4ValueValue {
		dayValue := langruntime.CheckedI32(days.Value)
		if (year == langruntime.CheckedSignedNegate(4714) && month < 11) || dayValue < langruntime.CheckedSignedNegate(2451546) || dayValue > 106751983 {
			return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: timestamptzFieldOverflow}}
		}
		daysWide := int64(langruntime.CheckedI32(dayValue))
		local := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(daysWide, int64(86400000000)), clock)
		offsetWide := int64(langruntime.CheckedI32(offsetSeconds))
		utc := langruntime.CheckedI64Subtract(local, langruntime.CheckedI64Multiply(offsetWide, int64(1000000)))
		return MakeTimestamptzValue(utc)
	}
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
}
func TimestamptzFromText(value TextValue) TimestamptzValue {
	value = CopyTextValue(value)
	if value.Kind == TextValueError {
		error := value.Error
		return TimestamptzValue{Kind: TimestamptzValueError, Error: error}
	}
	if value == (TextValue{Kind: TextValueUnknown}) {
		return TimestamptzValue{Kind: TimestamptzValueUnknown}
	}
	if value == (TextValue{Kind: TextValueNull}) {
		return TimestamptzValue{Kind: TimestamptzValueNull}
	}
	if value.Kind == TextValueValue {
		input := langruntime.CheckedString(value.Value)
		chars := []rune(input)
		if len(chars) > 128 {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
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
			return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: invalidTimestampText}}
		}
		bc := false
		if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 1)]) == 'c' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 2)]) == 'b' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(text.chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				return TimestamptzValue{Kind: TimestamptzValueUnknown}
			}
			bc = true
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		} else if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 1)]) == 'd' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedSubtract(end, 2)]) == 'a' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(text.chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				return TimestamptzValue{Kind: TimestamptzValueUnknown}
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
					return MakeTimestamptzValue(int64(-9223372036854775808))
				}
				return MakeTimestamptzValue(int64(9223372036854775807))
			}
		}
		yearField := readTimestampNumber(&text, start, end)
		index := yearField.next
		if yearField.digits < 4 || index == end || text.chars[index] != '-' {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		month := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
		index = langruntime.CheckedIndex(month.next)
		if month.digits < 1 || month.digits > 2 || index == end || text.chars[index] != '-' {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		day := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
		index = langruntime.CheckedIndex(day.next)
		if day.digits < 1 || day.digits > 2 || index == end {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		if langruntime.AsciiLowercase(text.chars[index]) == 't' {
			index = langruntime.CheckedAdd(index, 1)
		} else if dateTextSpace(text.chars[index]) {
			for index < end && dateTextSpace(text.chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
		} else {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		hour := readTimestampNumber(&text, index, end)
		index = langruntime.CheckedIndex(hour.next)
		if hour.digits < 1 || index == end || text.chars[index] != ':' {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		minute := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
		index = langruntime.CheckedIndex(minute.next)
		if minute.digits < 1 {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		second := 0
		fraction := 0
		if index < end && text.chars[index] == ':' {
			seconds := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
			index = langruntime.CheckedIndex(seconds.next)
			if seconds.digits < 1 {
				return TimestamptzValue{Kind: TimestamptzValueUnknown}
			}
			second = langruntime.CheckedI32(seconds.value)
			if index < end && text.chars[index] == '.' {
				digits := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(digits.next)
				if digits.digits < 1 || digits.digits > 6 {
					return TimestamptzValue{Kind: TimestamptzValueUnknown}
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
				return TimestamptzValue{Kind: TimestamptzValueUnknown}
			}
			hours := zoneHour.value
			minutes := 0
			seconds := 0
			if index < end && text.chars[index] == ':' {
				if zoneHour.digits > 2 {
					return TimestamptzValue{Kind: TimestamptzValueUnknown}
				}
				zoneMinute := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(zoneMinute.next)
				if zoneMinute.digits < 1 {
					return TimestamptzValue{Kind: TimestamptzValueUnknown}
				}
				minutes = langruntime.CheckedI32(zoneMinute.value)
				if index < end && text.chars[index] == ':' {
					zoneSecond := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
					index = langruntime.CheckedIndex(zoneSecond.next)
					if zoneSecond.digits < 1 {
						return TimestamptzValue{Kind: TimestamptzValueUnknown}
					}
					seconds = langruntime.CheckedI32(zoneSecond.value)
				}
			} else if zoneHour.digits > 2 {
				hours = langruntime.CheckedI32(langruntime.CheckedSignedDivide(zoneHour.value, 100))
				minutes = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(zoneHour.value, 100))
			}
			if index != end {
				return TimestamptzValue{Kind: TimestamptzValueUnknown}
			}
			if hours > 15 || minutes > 59 || seconds > 59 {
				offset = langruntime.CheckedI32(57600)
			} else {
				offset = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(hours, 60), minutes)), 60), seconds))
				if sign == '-' {
					offset = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, offset))
				}
			}
		} else {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		if index != end {
			return TimestamptzValue{Kind: TimestamptzValueUnknown}
		}
		if yearField.overflow {
			return TimestamptzValue{Kind: TimestamptzValueError, Error: SqlError{State: timestamptzFieldOverflow}}
		}
		year := yearField.value
		if bc {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, year))
		}
		return TimestamptzFromCalendar(year, month.value, day.value, hour.value, minute.value, second, fraction, offset)
	}
	return TimestamptzValue{Kind: TimestamptzValueUnknown}
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
