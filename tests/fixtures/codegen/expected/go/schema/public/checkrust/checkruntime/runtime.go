package checkruntime

import langruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/langruntime"

type Int2ValueKind uint8

const (
	Int2ValueUnknown Int2ValueKind = iota
	Int2ValueUnimplemented
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
	unresolvedFlavor := 0
	if value < langruntime.CheckedSignedNegate(32768) || value > 32767 {
		return Int2Unresolved(unresolvedFlavor)
	}
	return Int2Value{Kind: Int2ValueValue, Value: value}
}
func Int2IsNull(value Int2Value) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == Int2ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int2ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == Int2ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor314 := unresolvedFlavor
	if value.Kind == Int2ValueUnknown {
		if conditionFlavor314 < 1 {
			conditionFlavor314 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Int2ValueUnimplemented {
		conditionFlavor314 = langruntime.CheckedI32(2)
	}
	if value == (Int2Value{Kind: Int2ValueUnknown}) || value == (Int2Value{Kind: Int2ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor314)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Int2Value{Kind: Int2ValueNull})}
}
func Int2FromCaseGuard(value CheckOutcome) Int2Value {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Int2Value{Kind: Int2ValueError, Error: error}
	}
	return Int2Unresolved(unresolvedFlavor)
}
func Int2ToInt4(value Int2Value) Int4Value {
	unresolvedFlavor := 0
	if value.Kind == Int2ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int2ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int4Unresolved(unresolvedFlavor)
}
func Int2ToInt8(value Int2Value) Int8Value {
	unresolvedFlavor := 0
	if value.Kind == Int2ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int2ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int8Unresolved(unresolvedFlavor)
}

type Int4ValueKind uint8

const (
	Int4ValueUnknown Int4ValueKind = iota
	Int4ValueUnimplemented
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
	Int8ValueUnimplemented
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
	TimestampValueUnimplemented
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
func MakeStoredTimestampValue(value int64) TimestampValue {
	if value >= int64(-211814092800000000) && value <= int64(9223371331200000000) {
		return TimestampValue{Kind: TimestampValueValue, Value: value}
	}
	return MakeTimestampValue(value)
}
func TimestampIsNull(value TimestampValue) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == TimestampValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == TimestampValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == TimestampValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor1444 := unresolvedFlavor
	if value.Kind == TimestampValueUnknown {
		if conditionFlavor1444 < 1 {
			conditionFlavor1444 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TimestampValueUnimplemented {
		conditionFlavor1444 = langruntime.CheckedI32(2)
	}
	if value == (TimestampValue{Kind: TimestampValueUnknown}) || value == (TimestampValue{Kind: TimestampValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor1444)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (TimestampValue{Kind: TimestampValueNull})}
}
func TimestampFromCaseGuard(value CheckOutcome) TimestampValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return TimestampValue{Kind: TimestampValueError, Error: error}
	}
	return TimestampUnresolved(unresolvedFlavor)
}

type TimestamptzValueKind uint8

const (
	TimestamptzValueUnknown TimestamptzValueKind = iota
	TimestamptzValueUnimplemented
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
func MakeStoredTimestamptzValue(value int64) TimestamptzValue {
	if value == int64(9223371331200000000) {
		return TimestamptzValue{Kind: TimestamptzValueValue, Value: value}
	}
	return MakeTimestamptzValue(value)
}
func TimestamptzIsNull(value TimestamptzValue) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == TimestamptzValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == TimestamptzValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == TimestamptzValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor1984 := unresolvedFlavor
	if value.Kind == TimestamptzValueUnknown {
		if conditionFlavor1984 < 1 {
			conditionFlavor1984 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TimestamptzValueUnimplemented {
		conditionFlavor1984 = langruntime.CheckedI32(2)
	}
	if value == (TimestamptzValue{Kind: TimestamptzValueUnknown}) || value == (TimestamptzValue{Kind: TimestamptzValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor1984)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (TimestamptzValue{Kind: TimestamptzValueNull})}
}
func TimestamptzFromCaseGuard(value CheckOutcome) TimestamptzValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return TimestamptzValue{Kind: TimestamptzValueError, Error: error}
	}
	return TimestamptzUnresolved(unresolvedFlavor)
}

type EnumPayload struct {
	Ordinal  int
	LabelOid int64
}
type EnumValueKind uint8

const (
	EnumValueUnknown EnumValueKind = iota
	EnumValueUnimplemented
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
	unresolvedFlavor := 0
	if ordinal < 0 || labelOid < int64(1) || labelOid > int64(4294967295) {
		return EnumUnresolved(unresolvedFlavor)
	}
	return EnumValue{Kind: EnumValueValue, Value: EnumPayload{Ordinal: ordinal, LabelOid: labelOid}}
}
func EnumIsNull(value EnumValue) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == EnumValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == EnumValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == EnumValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor2574 := unresolvedFlavor
	if value.Kind == EnumValueUnknown {
		if conditionFlavor2574 < 1 {
			conditionFlavor2574 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == EnumValueUnimplemented {
		conditionFlavor2574 = langruntime.CheckedI32(2)
	}
	if value == (EnumValue{Kind: EnumValueUnknown}) || value == (EnumValue{Kind: EnumValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor2574)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (EnumValue{Kind: EnumValueNull})}
}
func EnumFromCaseGuard(value CheckOutcome) EnumValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return EnumValue{Kind: EnumValueError, Error: error}
	}
	return EnumUnresolved(unresolvedFlavor)
}

type DateValueKind uint8

const (
	DateValueUnknown DateValueKind = iota
	DateValueUnimplemented
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
func MakeStoredDateValue(value int) DateValue {
	value = langruntime.CheckedI32(value)
	if value >= langruntime.CheckedSignedNegate(2451552) && value < langruntime.CheckedSignedNegate(2451545) {
		return DateValue{Kind: DateValueValue, Value: value}
	}
	return MakeDateValue(value)
}
func DateIsNull(value DateValue) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == DateValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == DateValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == DateValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor3134 := unresolvedFlavor
	if value.Kind == DateValueUnknown {
		if conditionFlavor3134 < 1 {
			conditionFlavor3134 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == DateValueUnimplemented {
		conditionFlavor3134 = langruntime.CheckedI32(2)
	}
	if value == (DateValue{Kind: DateValueUnknown}) || value == (DateValue{Kind: DateValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor3134)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (DateValue{Kind: DateValueNull})}
}
func DateFromCaseGuard(value CheckOutcome) DateValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	return DateUnresolved(unresolvedFlavor)
}

type TextValueKind uint8

const (
	TextValueUnknown TextValueKind = iota
	TextValueUnimplemented
	TextValueNull
	TextValueValue
	TextValueError
	TextValueNonNull
)

type TextValue struct {
	Kind  TextValueKind
	Value string
	Error SqlError
}
type XmlKnowledge struct {
	Document BoolValue
	Content  BoolValue
}
type XmlValueKind uint8

const (
	XmlValueUnknown XmlValueKind = iota
	XmlValueUnimplemented
	XmlValueNull
	XmlValueValue
	XmlValueRenderedText
	XmlValueError
	XmlValueNonNull
)

type XmlValue struct {
	Kind         XmlValueKind
	Value        string
	RenderedText string
	Error        SqlError
	NonNull      XmlKnowledge
}

func CopyXmlValue(value XmlValue) XmlValue {
	switch value.Kind {
	case XmlValueUnknown:
		return XmlValue{Kind: XmlValueUnknown}
	case XmlValueUnimplemented:
		return XmlValue{Kind: XmlValueUnimplemented}
	case XmlValueNull:
		return XmlValue{Kind: XmlValueNull}
	case XmlValueValue:
		return XmlValue{Kind: XmlValueValue, Value: langruntime.CheckedString(value.Value)}
	case XmlValueRenderedText:
		return XmlValue{Kind: XmlValueRenderedText, RenderedText: langruntime.CheckedString(value.RenderedText)}
	case XmlValueError:
		return XmlValue{Kind: XmlValueError, Error: value.Error}
	case XmlValueNonNull:
		return XmlValue{Kind: XmlValueNonNull, NonNull: value.NonNull}
	}
	panic("unknown enum variant")
}

type XmlConcatState struct {
	Status            CheckOutcome
	HasValue          bool
	Version           string
	VersionConsistent bool
	Standalone        int
	Body              string
}

func CopyXmlConcatState(value XmlConcatState) XmlConcatState {
	return XmlConcatState{Status: value.Status, HasValue: value.HasValue, Version: langruntime.CheckedString(value.Version), VersionConsistent: value.VersionConsistent, Standalone: langruntime.CheckedI32(value.Standalone), Body: langruntime.CheckedString(value.Body)}
}
func XmlUnknown() XmlValue {
	return XmlValue{Kind: XmlValueUnknown}
}
func XmlNull() XmlValue {
	return XmlValue{Kind: XmlValueNull}
}
func MakeXmlValue(source string) XmlValue {
	source = langruntime.CheckedString(source)
	unresolvedFlavor := 0
	characters := []rune(source)
	index := 0
	for index < len(characters) {
		if characters[index] == '\x00' {
			return XmlUnresolved(unresolvedFlavor)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return XmlValue{Kind: XmlValueValue, Value: source}
}
func XmlFromRenderedText(input TextValue) XmlValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return XmlValue{Kind: XmlValueError, Error: error}
	}
	if input.Kind == TextValueNull {
		return XmlValue{Kind: XmlValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		checked := MakeXmlValue(value)
		if checked.Kind == XmlValueValue {
			source := langruntime.CheckedString(checked.Value)
			return XmlValue{Kind: XmlValueRenderedText, RenderedText: source}
		}
	}
	return XmlUnresolved(unresolvedFlavor)
}
func MakeXmlKnowledge(document BoolValue, content BoolValue) XmlValue {
	unresolvedFlavor := 0
	if document.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if content.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if document.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if content.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	validDocument := document == (BoolValue{Kind: BoolValueUnknown}) || document == (BoolValue{Kind: BoolValueUnimplemented})
	validContent := content == (BoolValue{Kind: BoolValueUnknown}) || content == (BoolValue{Kind: BoolValueUnimplemented})
	if document.Kind == BoolValueValue {
		validDocument = true
	}
	if content.Kind == BoolValueValue {
		validContent = true
	}
	if validDocument == false || validContent == false {
		return XmlUnresolved(unresolvedFlavor)
	}
	if document == (BoolValue{Kind: BoolValueValue, Value: true}) && content == (BoolValue{Kind: BoolValueValue, Value: false}) {
		return XmlUnresolved(unresolvedFlavor)
	}
	actualDocument := document
	actualContent := content
	if document == (BoolValue{Kind: BoolValueValue, Value: true}) {
		actualContent = BoolValue{Kind: BoolValueValue, Value: true}
	}
	if content == (BoolValue{Kind: BoolValueValue, Value: false}) {
		actualDocument = BoolValue{Kind: BoolValueValue, Value: false}
	}
	return XmlValue{Kind: XmlValueNonNull, NonNull: XmlKnowledge{Document: actualDocument, Content: actualContent}}
}
func MakeXmlNonNull(document BoolValue) XmlValue {
	return MakeXmlKnowledge(document, BoolValue{Kind: BoolValueUnknown})
}
func XmlIsNull(input XmlValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == XmlValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == XmlValueNonNull {
		knowledge := input.NonNull
		_ = knowledge
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == XmlValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == XmlValueNonNull {
		knowledge := input.NonNull
		checked := MakeXmlKnowledge(knowledge.Document, knowledge.Content)
		conditionFlavor4278 := unresolvedFlavor
		if checked.Kind == XmlValueUnknown {
			if conditionFlavor4278 < 1 {
				conditionFlavor4278 = langruntime.CheckedI32(1)
			}
		}
		if checked.Kind == XmlValueUnknown {
			return BoolUnresolved(conditionFlavor4278)
		}
		conditionFlavor42791 := unresolvedFlavor
		if checked.Kind == XmlValueUnimplemented {
			conditionFlavor42791 = langruntime.CheckedI32(2)
		}
		if checked.Kind == XmlValueUnimplemented {
			return BoolUnresolved(conditionFlavor42791)
		}
	}
	if input.Kind == XmlValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor4304 := unresolvedFlavor
	if input.Kind == XmlValueUnknown {
		if conditionFlavor4304 < 1 {
			conditionFlavor4304 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == XmlValueUnknown {
		return BoolUnresolved(conditionFlavor4304)
	}
	conditionFlavor43085 := unresolvedFlavor
	if input.Kind == XmlValueUnimplemented {
		conditionFlavor43085 = langruntime.CheckedI32(2)
	}
	if input.Kind == XmlValueUnimplemented {
		return BoolUnresolved(conditionFlavor43085)
	}
	if input.Kind == XmlValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func XmlFromCaseGuard(input CheckOutcome) XmlValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return XmlValue{Kind: XmlValueError, Error: error}
	}
	if input.Kind == CheckOutcomeNull {
		return XmlValue{Kind: XmlValueNull}
	}
	return XmlUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	chars := []rune(value)
	index := 0
	for index < len(chars) {
		code := int(langruntime.CheckedChar(chars[index]))
		if code == 0 || (code >= 55296 && code <= 57343) {
			return TextUnresolved(unresolvedFlavor)
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
	CheckOutcomeUnimplemented
	CheckOutcomeError
)

type CheckOutcome struct {
	Kind  CheckOutcomeKind
	Error SqlError
}
type CheckEvaluationResult struct {
	Outcome CheckOutcome
	Reason  int
}

func MakeCheckEvaluationResult(outcome CheckOutcome, reason int) CheckEvaluationResult {
	reason = langruntime.CheckedI32(reason)
	return CheckEvaluationResult{Outcome: outcome, Reason: reason}
}
func CheckEvaluationOutcome(input CheckEvaluationResult) CheckOutcome {
	return input.Outcome
}
func CheckEvaluationReason(input CheckEvaluationResult) Int4Value {
	return Int4Value{Kind: Int4ValueValue, Value: input.Reason}
}
func CheckRequirementCode(input int) int {
	input = langruntime.CheckedI32(input)
	return input
}
func CheckRequirementMerge(left int, right int) int {
	left = langruntime.CheckedI32(left)
	right = langruntime.CheckedI32(right)
	if left < 0 || right < 0 || left > 511 || right > 511 {
		return langruntime.CheckedSignedNegate(1)
	}
	a := left
	b := right
	weight := 1
	output := 0
	for a > 0 || b > 0 {
		if langruntime.CheckedSignedRemainder(a, 2) != 0 || langruntime.CheckedSignedRemainder(b, 2) != 0 {
			output = langruntime.CheckedI32(langruntime.CheckedSignedAdd(output, weight))
		}
		a = langruntime.CheckedI32(langruntime.CheckedSignedDivide(a, 2))
		b = langruntime.CheckedI32(langruntime.CheckedSignedDivide(b, 2))
		weight = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(weight, 2))
	}
	return output
}
func CheckRequirementFilter(nullness BoolValue, reason int, partial bool) int {
	reason = langruntime.CheckedI32(reason)
	if nullness == (BoolValue{Kind: BoolValueUnknown}) || nullness == (BoolValue{Kind: BoolValueUnimplemented}) {
		if reason > 0 {
			return reason
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if partial && nullness == (BoolValue{Kind: BoolValueValue, Value: false}) {
		return reason
	}
	return 0
}
func CheckTextRequirement(input TextValue, reason int) int {
	reason = langruntime.CheckedI32(reason)
	if input == (TextValue{Kind: TextValueNonNull}) {
		if reason > 0 {
			return reason
		}
		return langruntime.CheckedSignedNegate(1)
	}
	nullness := TextIsNull(input)
	return CheckRequirementFilter(nullness, reason, false)
}
func CheckXmlRequirement(input XmlValue, reason int) int {
	reason = langruntime.CheckedI32(reason)
	if input.Kind == XmlValueRenderedText {
		return langruntime.CheckedSignedNegate(1)
	}
	if input.Kind == XmlValueNonNull {
		if reason > 0 {
			return reason
		}
		return langruntime.CheckedSignedNegate(1)
	}
	nullness := XmlIsNull(input)
	return CheckRequirementFilter(nullness, reason, false)
}
func CheckRequirementForOutcome(input CheckOutcome, reason int) int {
	reason = langruntime.CheckedI32(reason)
	if input == (CheckOutcome{Kind: CheckOutcomeUnknown}) || input == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return reason
	}
	return 0
}
func CheckRequirementMessage(reason int) TextValue {
	reason = langruntime.CheckedI32(reason)
	if reason <= 0 || reason > 511 {
		return TextValue{Kind: TextValueUnknown}
	}
	output := langruntime.NewTextBuffer("")
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 1)), 2) != 0 {
		output = append(output, "XPath decimal conversion needs sql.codegen.checks.xpathPowerOfTenBits captured from the target PostgreSQL. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 2)), 2) != 0 {
		output = append(output, "XPath evaluation reaches a cyclic XML traversal that cannot be completed locally. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 4)), 2) != 0 {
		output = append(output, "The reached XPath operation or XML serialization is not implemented by the local evaluator. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 8)), 2) != 0 {
		output = append(output, "XPath evaluation needs sql.codegen.checks.xpathRecursionLimit for the target PostgreSQL XML library. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 16)), 2) != 0 {
		output = append(output, "XPath numeric XML output needs sql.codegen.checks.extraFloatDigits matching the PostgreSQL session. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 32)), 2) != 0 {
		output = append(output, "XPath document serialization depends on unavailable native XML notation ordering. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 64)), 2) != 0 {
		output = append(output, "XPath evaluation needs sql.codegen.checks.serverEncoding: UTF8. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 128)), 2) != 0 {
		output = append(output, "XPath evaluation needs the original XML storage bytes for this rendered value. "...)
	}
	if langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(reason, 256)), 2) != 0 {
		output = append(output, "XPath evaluation needs complete namespace mapping values. "...)
	}
	if string(output) == "" {
		return TextValue{Kind: TextValueUnknown}
	}
	return TextValue{Kind: TextValueValue, Value: string(output)}
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

func CopySqlErrorDescription(value SqlErrorDescription) SqlErrorDescription {
	return SqlErrorDescription{Message: langruntime.CheckedString(value.Message)}
}

const sqlErrorNumericOutOfRange = 3452547
const sqlErrorNotNullViolation = 3505682
const sqlErrorCheckViolation = 3505720
const sqlErrorDatatypeMismatch = 6822148
const sqlErrorCardinalityViolation = 3405888
const sqlErrorNullValueNotAllowed = 3452548
const sqlErrorInvalidDatetimeFormat = 3452551
const sqlErrorDatetimeFieldOverflow = 3452552
const sqlErrorTimezoneDisplacement = 3452553
const sqlErrorInvalidUseOfEscape = 3452556
const sqlErrorZeroLengthCharacterString = 3452559
const sqlErrorInvalidXmlDocument = 3452566
const sqlErrorNotXmlDocument = 3452565
const sqlErrorInvalidXmlContent = 3452567
const sqlErrorInvalidXmlComment = 3452572
const sqlErrorInvalidXmlProcessingInstruction = 3452573
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
	if error.State == sqlErrorDatatypeMismatch {
		return SqlErrorDescription{Message: "could not convert row type"}
	}
	if error.State == sqlErrorZeroLengthCharacterString {
		return SqlErrorDescription{Message: "zero-length character string"}
	}
	if error.State == sqlErrorInvalidXmlProcessingInstruction {
		return SqlErrorDescription{Message: "invalid XML processing instruction"}
	}
	if error.State == sqlErrorNotXmlDocument {
		return SqlErrorDescription{Message: "not an XML document"}
	}
	if error.State == sqlErrorInvalidXmlDocument {
		return SqlErrorDescription{Message: "invalid XML document"}
	}
	if error.State == sqlErrorInvalidXmlContent {
		return SqlErrorDescription{Message: "invalid XML content"}
	}
	if error.State == sqlErrorInvalidXmlComment {
		return SqlErrorDescription{Message: "invalid XML comment"}
	}
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
	BoolValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == BoolValueError {
		error := value.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	conditionFlavor8484 := unresolvedFlavor
	if value.Kind == BoolValueUnknown {
		if conditionFlavor8484 < 1 {
			conditionFlavor8484 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == BoolValueUnimplemented {
		conditionFlavor8484 = langruntime.CheckedI32(2)
	}
	if value == (BoolValue{Kind: BoolValueUnknown}) || value == (BoolValue{Kind: BoolValueUnimplemented}) {
		return CheckUnresolved(conditionFlavor8484)
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
	unresolvedFlavor := 0
	if value.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == Int4ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor8694 := unresolvedFlavor
	if value.Kind == Int4ValueUnknown {
		if conditionFlavor8694 < 1 {
			conditionFlavor8694 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Int4ValueUnimplemented {
		conditionFlavor8694 = langruntime.CheckedI32(2)
	}
	if value == (Int4Value{Kind: Int4ValueUnknown}) || value == (Int4Value{Kind: Int4ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor8694)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Int4Value{Kind: Int4ValueNull})}
}
func Int8IsNull(value Int8Value) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == Int8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == Int8ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor8824 := unresolvedFlavor
	if value.Kind == Int8ValueUnknown {
		if conditionFlavor8824 < 1 {
			conditionFlavor8824 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Int8ValueUnimplemented {
		conditionFlavor8824 = langruntime.CheckedI32(2)
	}
	if value == (Int8Value{Kind: Int8ValueUnknown}) || value == (Int8Value{Kind: Int8ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor8824)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Int8Value{Kind: Int8ValueNull})}
}
func TextIsNull(value TextValue) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == TextValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor8954 := unresolvedFlavor
	if value.Kind == TextValueUnknown {
		if conditionFlavor8954 < 1 {
			conditionFlavor8954 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		conditionFlavor8954 = langruntime.CheckedI32(2)
	}
	if value == (TextValue{Kind: TextValueUnknown}) || value == (TextValue{Kind: TextValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor8954)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (TextValue{Kind: TextValueNull})}
}
func BoolIsNull(value BoolValue) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == BoolValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor9084 := unresolvedFlavor
	if value.Kind == BoolValueUnknown {
		if conditionFlavor9084 < 1 {
			conditionFlavor9084 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == BoolValueUnimplemented {
		conditionFlavor9084 = langruntime.CheckedI32(2)
	}
	if value == (BoolValue{Kind: BoolValueUnknown}) || value == (BoolValue{Kind: BoolValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor9084)
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
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor9314 := unresolvedFlavor
	if value.Kind == CheckOutcomeUnknown {
		if conditionFlavor9314 < 1 {
			conditionFlavor9314 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == CheckOutcomeUnimplemented {
		conditionFlavor9314 = langruntime.CheckedI32(2)
	}
	if value == (CheckOutcome{Kind: CheckOutcomeUnknown}) || value == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return BoolUnresolved(conditionFlavor9314)
	}
	if value == (CheckOutcome{Kind: CheckOutcomeNull}) {
		return BoolValue{Kind: BoolValueNull}
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (CheckOutcome{Kind: CheckOutcomeTrue})}
}
func Int4FromCaseGuard(value CheckOutcome) Int4Value {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	return Int4Unresolved(unresolvedFlavor)
}
func Int8FromCaseGuard(value CheckOutcome) Int8Value {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	return Int8Unresolved(unresolvedFlavor)
}
func TextFromCaseGuard(value CheckOutcome) TextValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	return TextUnresolved(unresolvedFlavor)
}

type NumericValueKind uint8

const (
	NumericValueUnknown NumericValueKind = iota
	NumericValueUnimplemented
	NumericValueNull
	NumericValueValue
	NumericValueError
)

type NumericValue struct {
	Kind  NumericValueKind
	Value string
	Error SqlError
}

func CopyNumericValue(value NumericValue) NumericValue {
	switch value.Kind {
	case NumericValueUnknown:
		return NumericValue{Kind: NumericValueUnknown}
	case NumericValueUnimplemented:
		return NumericValue{Kind: NumericValueUnimplemented}
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
	unresolvedFlavor := 0
	if value.Kind == NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == NumericValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor9924 := unresolvedFlavor
	if value.Kind == NumericValueUnknown {
		if conditionFlavor9924 < 1 {
			conditionFlavor9924 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == NumericValueUnimplemented {
		conditionFlavor9924 = langruntime.CheckedI32(2)
	}
	if value == (NumericValue{Kind: NumericValueUnknown}) || value == (NumericValue{Kind: NumericValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor9924)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (NumericValue{Kind: NumericValueNull})}
}
func NumericFromCaseGuard(value CheckOutcome) NumericValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return NumericValue{Kind: NumericValueError, Error: error}
	}
	return NumericUnresolved(unresolvedFlavor)
}
func MakeNumericValue(value string) NumericValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	parts := NumericParts(value)
	if parts.Valid == false {
		return NumericUnresolved(unresolvedFlavor)
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
	JsonValueUnimplemented
	JsonValueNonNull
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
	unresolvedFlavor := 0
	syntax := JsonSyntaxScan(source)
	if syntax.Valid == false {
		return JsonUnresolved(unresolvedFlavor)
	}
	return JsonValue{Kind: JsonValueValue, Value: JsonPayload{Source: source, Kind: syntax.Kind, Depth: syntax.MaxDepth}}
}
func JsonFromCoercedText(input TextValue) JsonValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return JsonUnresolved(unresolvedFlavor)
}
func JsonIsNull(input JsonValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor10764 := unresolvedFlavor
	if input.Kind == JsonValueUnknown {
		if conditionFlavor10764 < 1 {
			conditionFlavor10764 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnknown {
		return BoolUnresolved(conditionFlavor10764)
	}
	conditionFlavor10787 := unresolvedFlavor
	if input.Kind == JsonValueUnimplemented {
		conditionFlavor10787 = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueUnimplemented {
		return BoolUnresolved(conditionFlavor10787)
	}
	if input.Kind == JsonValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func JsonFromCaseGuard(value CheckOutcome) JsonValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return JsonValue{Kind: JsonValueError, Error: error}
	}
	return JsonUnresolved(unresolvedFlavor)
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

func CopyJsonbNode(value JsonbNode) JsonbNode {
	return JsonbNode{Kind: langruntime.CheckedI32(value.Kind), Child: langruntime.CheckedIndex(value.Child), Next: langruntime.CheckedIndex(value.Next), KeyStart: langruntime.CheckedIndex(value.KeyStart), KeyEnd: langruntime.CheckedIndex(value.KeyEnd), TextStart: langruntime.CheckedIndex(value.TextStart), TextEnd: langruntime.CheckedIndex(value.TextEnd)}
}

type JsonbPayload struct {
	Characters []rune
	Nodes      []JsonbNode
	Root       int
}

func CopyJsonbPayload(value JsonbPayload) JsonbPayload {
	return JsonbPayload{Characters: langruntime.CheckedChars(value.Characters), Nodes: langruntime.CheckedStructs(value.Nodes, CopyJsonbNode), Root: langruntime.CheckedIndex(value.Root)}
}

type JsonbKnowledge struct {
	Maximum int64
	Kind    int
	Length  int
	Shape   JsonbPayload
}

func CopyJsonbKnowledge(value JsonbKnowledge) JsonbKnowledge {
	return JsonbKnowledge{Maximum: value.Maximum, Kind: langruntime.CheckedI32(value.Kind), Length: langruntime.CheckedI32(value.Length), Shape: CopyJsonbPayload(value.Shape)}
}

type JsonbValueKind uint8

const (
	JsonbValueUnknown JsonbValueKind = iota
	JsonbValueUnimplemented
	JsonbValueNonNull
	JsonbValueNull
	JsonbValueValue
	JsonbValueError
)

type JsonbValue struct {
	Kind    JsonbValueKind
	NonNull JsonbKnowledge
	Value   JsonbPayload
	Error   SqlError
}

func CopyJsonbValue(value JsonbValue) JsonbValue {
	switch value.Kind {
	case JsonbValueUnknown:
		return JsonbValue{Kind: JsonbValueUnknown}
	case JsonbValueUnimplemented:
		return JsonbValue{Kind: JsonbValueUnimplemented}
	case JsonbValueNonNull:
		return JsonbValue{Kind: JsonbValueNonNull, NonNull: CopyJsonbKnowledge(value.NonNull)}
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
	JsonbInputUnimplemented
	JsonbInputScalarUnknown
	JsonbInputJsonNonNull
	JsonbInputJsonbNonNull
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
	ScalarUnknown  string
	JsonbNonNull   JsonbKnowledge
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
	case JsonbInputUnimplemented:
		return JsonbInput{Kind: JsonbInputUnimplemented}
	case JsonbInputScalarUnknown:
		return JsonbInput{Kind: JsonbInputScalarUnknown, ScalarUnknown: langruntime.CheckedString(value.ScalarUnknown)}
	case JsonbInputJsonNonNull:
		return JsonbInput{Kind: JsonbInputJsonNonNull}
	case JsonbInputJsonbNonNull:
		return JsonbInput{Kind: JsonbInputJsonbNonNull, JsonbNonNull: CopyJsonbKnowledge(value.JsonbNonNull)}
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

type JsonRecordInputPayload struct {
	TypeName string
	State    int
	Error    SqlError
	Fields   []ArrayElement
	Values   []JsonbInput
	Position int
}

func CopyJsonRecordInputPayload(value JsonRecordInputPayload) JsonRecordInputPayload {
	return JsonRecordInputPayload{TypeName: langruntime.CheckedString(value.TypeName), State: langruntime.CheckedI32(value.State), Error: value.Error, Fields: langruntime.CheckedStructs(value.Fields, CopyArrayElement), Values: langruntime.CheckedStructs(value.Values, CopyJsonbInput), Position: langruntime.CheckedIndex(value.Position)}
}

type JsonRecordInputPlanKind uint8

const (
	JsonRecordInputPlanValue JsonRecordInputPlanKind = iota
)

type JsonRecordInputPlan struct {
	Kind  JsonRecordInputPlanKind
	Value JsonRecordInputPayload
}

func CopyJsonRecordInputPlan(value JsonRecordInputPlan) JsonRecordInputPlan {
	switch value.Kind {
	case JsonRecordInputPlanValue:
		return JsonRecordInputPlan{Kind: JsonRecordInputPlanValue, Value: CopyJsonRecordInputPayload(value.Value)}
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
	JsonbArgumentsUnimplemented
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
	case JsonbArgumentsUnimplemented:
		return JsonbArguments{Kind: JsonbArgumentsUnimplemented}
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
	if input.Kind == BoolValueUnimplemented {
		return JsonbInput{Kind: JsonbInputUnimplemented}
	}
	return JsonbInput{Kind: JsonbInputScalarUnknown, ScalarUnknown: "1110000"}
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
	if input.Kind == NumericValueUnimplemented {
		return JsonbInput{Kind: JsonbInputUnimplemented}
	}
	return JsonbInput{Kind: JsonbInputScalarUnknown, ScalarUnknown: "1001000"}
}
func JsonbInputFromText(input TextValue) JsonbInput {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return JsonbInputUnresolved(unresolvedFlavor)
}
func JsonbInputFromJson(input JsonValue) JsonbInput {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueError {
		error := input.Error
		return JsonbInput{Kind: JsonbInputError, Error: error}
	}
	if input.Kind == JsonValueNonNull {
		return JsonbInput{Kind: JsonbInputJsonNonNull}
	}
	if input.Kind == JsonValueNull {
		return JsonbInput{Kind: JsonbInputNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		return JsonbInput{Kind: JsonbInputJson, Json: value}
	}
	return JsonbInputUnresolved(unresolvedFlavor)
}
func JsonbInputFromJsonb(input JsonbValue) JsonbInput {
	input = CopyJsonbValue(input)
	unresolvedFlavor := 0
	if input.Kind == JsonbValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonbValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueNonNull {
		maximum := CopyJsonbKnowledge(input.NonNull)
		return JsonbInput{Kind: JsonbInputJsonbNonNull, JsonbNonNull: maximum}
	}
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
	return JsonbInputUnresolved(unresolvedFlavor)
}
func jsonbInputFloat(number float64) JsonbInput {
	unresolvedFlavor := 0
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
	return JsonbInputUnresolved(unresolvedFlavor)
}
func JsonbInputFromFloat4(input Float4Value) JsonbInput {
	unresolvedFlavor := 0
	if input.Kind == Float4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Float4ValueUnspecifiedNan {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == Float4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return JsonbInputUnresolved(unresolvedFlavor)
}
func JsonbInputFromFloat8(input Float8Value) JsonbInput {
	unresolvedFlavor := 0
	if input.Kind == Float8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Float8ValueUnspecifiedNan {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == Float8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return JsonbInputUnresolved(unresolvedFlavor)
}
func MakeJsonbValue(source string) JsonbValue {
	source = langruntime.CheckedString(source)
	unresolvedFlavor := 0
	parsed := jsonbParseText(TextValue{Kind: TextValueValue, Value: source}, false)
	if parsed.Kind == JsonbValueError {
		return JsonbUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return JsonbValue{Kind: JsonbValueError, Error: error}
	}
	return JsonbUnresolved(unresolvedFlavor)
}
func JsonbIsNull(input JsonbValue) BoolValue {
	input = CopyJsonbValue(input)
	unresolvedFlavor := 0
	if input.Kind == JsonbValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonbValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor13964 := unresolvedFlavor
	if input.Kind == JsonbValueUnknown {
		if conditionFlavor13964 < 1 {
			conditionFlavor13964 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonbValueUnknown {
		return BoolUnresolved(conditionFlavor13964)
	}
	conditionFlavor13987 := unresolvedFlavor
	if input.Kind == JsonbValueUnimplemented {
		conditionFlavor13987 = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueUnimplemented {
		return BoolUnresolved(conditionFlavor13987)
	}
	if input.Kind == JsonbValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func JsonbFromCoercedValue(input JsonbValue) JsonbValue {
	input = CopyJsonbValue(input)
	unresolvedFlavor := 0
	if input.Kind == JsonbValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonbValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		if jsonbInputValid(&value) == false {
			return JsonbUnresolved(unresolvedFlavor)
		}
		source := jsonbRender(JsonbValue{Kind: JsonbValueValue, Value: value}, false, false)
		if source.Kind == TextValueValue {
			text := langruntime.CheckedString(source.Value)
			return MakeJsonbValue(text)
		}
		return JsonbUnresolved(unresolvedFlavor)
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
	NetworkValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == NetworkValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == NetworkValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == NetworkValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor14584 := unresolvedFlavor
	if value.Kind == NetworkValueUnknown {
		if conditionFlavor14584 < 1 {
			conditionFlavor14584 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == NetworkValueUnimplemented {
		conditionFlavor14584 = langruntime.CheckedI32(2)
	}
	if value == (NetworkValue{Kind: NetworkValueUnknown}) || value == (NetworkValue{Kind: NetworkValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor14584)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (NetworkValue{Kind: NetworkValueNull})}
}
func NetworkFromCaseGuard(value CheckOutcome) NetworkValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	return NetworkUnresolved(unresolvedFlavor)
}
func MakeNetworkValue(value string) NetworkValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	chars := []rune(value)
	if len(chars) > 256 {
		return NetworkUnresolved(unresolvedFlavor)
	}
	parsed := networkParse(value, false)
	if parsed.Kind == NetworkValueError {
		return NetworkUnresolved(unresolvedFlavor)
	}
	return parsed
}
func MakeCidrValue(value string) NetworkValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	chars := []rune(value)
	if len(chars) > 256 {
		return NetworkUnresolved(unresolvedFlavor)
	}
	parsed := networkParse(value, true)
	if parsed.Kind == NetworkValueError {
		return NetworkUnresolved(unresolvedFlavor)
	}
	return parsed
}

type BitValueKind uint8

const (
	BitValueUnknown BitValueKind = iota
	BitValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == BitValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == BitValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == BitValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor15184 := unresolvedFlavor
	if value.Kind == BitValueUnknown {
		if conditionFlavor15184 < 1 {
			conditionFlavor15184 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == BitValueUnimplemented {
		conditionFlavor15184 = langruntime.CheckedI32(2)
	}
	if value == (BitValue{Kind: BitValueUnknown}) || value == (BitValue{Kind: BitValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor15184)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (BitValue{Kind: BitValueNull})}
}
func BitFromCaseGuard(value CheckOutcome) BitValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return BitValue{Kind: BitValueError, Error: error}
	}
	return BitUnresolved(unresolvedFlavor)
}
func MakeBitValue(value string) BitValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	chars := []rune(value)
	if len(chars) > 2147483640 {
		return BitUnresolved(unresolvedFlavor)
	}
	index := 0
	for index < len(chars) {
		if chars[index] != '0' && chars[index] != '1' {
			return BitUnresolved(unresolvedFlavor)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return BitValue{Kind: BitValueValue, Value: value}
}

type ByteaValueKind uint8

const (
	ByteaValueUnknown ByteaValueKind = iota
	ByteaValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == ByteaValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == ByteaValueUnspecified {
		width := langruntime.CheckedI32(value.Unspecified)
		_ = width
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == ByteaValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == ByteaValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor15694 := unresolvedFlavor
	if value.Kind == ByteaValueUnknown {
		if conditionFlavor15694 < 1 {
			conditionFlavor15694 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == ByteaValueUnimplemented {
		conditionFlavor15694 = langruntime.CheckedI32(2)
	}
	if value == (ByteaValue{Kind: ByteaValueUnknown}) || value == (ByteaValue{Kind: ByteaValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor15694)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (ByteaValue{Kind: ByteaValueNull})}
}
func ByteaFromCaseGuard(value CheckOutcome) ByteaValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return ByteaValue{Kind: ByteaValueError, Error: error}
	}
	return ByteaUnresolved(unresolvedFlavor)
}
func MakeByteaValue(value string) ByteaValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	chars := []rune(value)
	even := true
	output := langruntime.NewTextBuffer("")
	index := 0
	for index < len(chars) {
		character := langruntime.AsciiLowercase(chars[index])
		code := int(langruntime.CheckedChar(character))
		if (code < 48 || code > 57) && (code < 97 || code > 102) {
			return ByteaUnresolved(unresolvedFlavor)
		}
		output = append(output, string(langruntime.CheckedChar(character))...)
		even = even == false
		index = langruntime.CheckedAdd(index, 1)
	}
	if even == false {
		return ByteaUnresolved(unresolvedFlavor)
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
	MacaddrValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == MacaddrValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == MacaddrValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == MacaddrValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor16334 := unresolvedFlavor
	if value.Kind == MacaddrValueUnknown {
		if conditionFlavor16334 < 1 {
			conditionFlavor16334 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == MacaddrValueUnimplemented {
		conditionFlavor16334 = langruntime.CheckedI32(2)
	}
	if value == (MacaddrValue{Kind: MacaddrValueUnknown}) || value == (MacaddrValue{Kind: MacaddrValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor16334)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (MacaddrValue{Kind: MacaddrValueNull})}
}
func MacaddrFromCaseGuard(value CheckOutcome) MacaddrValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return MacaddrValue{Kind: MacaddrValueError, Error: error}
	}
	return MacaddrUnresolved(unresolvedFlavor)
}
func MakeMacaddrValue(value string) MacaddrValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	chars := []rune(value)
	if len(chars) > 256 {
		return MacaddrUnresolved(unresolvedFlavor)
	}
	text := macText{chars: chars}
	parsed := macaddrParse(&text)
	if parsed.valid == false {
		return MacaddrUnresolved(unresolvedFlavor)
	}
	return MacaddrValue{Kind: MacaddrValueValue, Value: parsed.address}
}

type Macaddr8ValueKind uint8

const (
	Macaddr8ValueUnknown Macaddr8ValueKind = iota
	Macaddr8ValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == Macaddr8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Macaddr8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == Macaddr8ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor16814 := unresolvedFlavor
	if value.Kind == Macaddr8ValueUnknown {
		if conditionFlavor16814 < 1 {
			conditionFlavor16814 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Macaddr8ValueUnimplemented {
		conditionFlavor16814 = langruntime.CheckedI32(2)
	}
	if value == (Macaddr8Value{Kind: Macaddr8ValueUnknown}) || value == (Macaddr8Value{Kind: Macaddr8ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor16814)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Macaddr8Value{Kind: Macaddr8ValueNull})}
}
func Macaddr8FromCaseGuard(value CheckOutcome) Macaddr8Value {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Macaddr8Value{Kind: Macaddr8ValueError, Error: error}
	}
	return Macaddr8Unresolved(unresolvedFlavor)
}
func MakeMacaddr8Value(value string) Macaddr8Value {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	chars := []rune(value)
	if len(chars) > 256 {
		return Macaddr8Unresolved(unresolvedFlavor)
	}
	text := macText{chars: chars}
	parsed := macaddr8Parse(&text)
	if parsed.valid == false {
		return Macaddr8Unresolved(unresolvedFlavor)
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
	UuidValueUnimplemented
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
	unresolvedFlavor := 0
	if value.Kind == UuidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == UuidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == UuidValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor17414 := unresolvedFlavor
	if value.Kind == UuidValueUnknown {
		if conditionFlavor17414 < 1 {
			conditionFlavor17414 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == UuidValueUnimplemented {
		conditionFlavor17414 = langruntime.CheckedI32(2)
	}
	if value == (UuidValue{Kind: UuidValueUnknown}) || value == (UuidValue{Kind: UuidValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor17414)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (UuidValue{Kind: UuidValueNull})}
}
func UuidFromCaseGuard(value CheckOutcome) UuidValue {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return UuidValue{Kind: UuidValueError, Error: error}
	}
	return UuidUnresolved(unresolvedFlavor)
}
func MakeUuidValue(value string) UuidValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
	parsed := uuidParse(value)
	if parsed.Kind == UuidValueError {
		return UuidUnresolved(unresolvedFlavor)
	}
	return parsed
}

type Float4ValueKind uint8

const (
	Float4ValueUnknown Float4ValueKind = iota
	Float4ValueUnimplemented
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
	unresolvedFlavor := 0
	bits := langruntime.F32ToI32Bits(value)
	rounded := Float4Number(bits)
	if value == value && rounded != value {
		return Float4Unresolved(unresolvedFlavor)
	}
	return Float4Value{Kind: Float4ValueValue, Value: bits}
}
func Float4IsNull(value Float4Value) BoolValue {
	unresolvedFlavor := 0
	if value.Kind == Float4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Float4ValueUnspecifiedNan {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Float4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == Float4ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor18114 := unresolvedFlavor
	if value.Kind == Float4ValueUnknown {
		if conditionFlavor18114 < 1 {
			conditionFlavor18114 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Float4ValueUnimplemented {
		conditionFlavor18114 = langruntime.CheckedI32(2)
	}
	if value == (Float4Value{Kind: Float4ValueUnknown}) || value == (Float4Value{Kind: Float4ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor18114)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Float4Value{Kind: Float4ValueNull})}
}
func Float4FromCaseGuard(value CheckOutcome) Float4Value {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Float4Value{Kind: Float4ValueError, Error: error}
	}
	return Float4Unresolved(unresolvedFlavor)
}

type Float8ValueKind uint8

const (
	Float8ValueUnknown Float8ValueKind = iota
	Float8ValueUnimplemented
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

func CopyFloat8Value(value Float8Value) Float8Value {
	switch value.Kind {
	case Float8ValueUnknown:
		return Float8Value{Kind: Float8ValueUnknown}
	case Float8ValueUnimplemented:
		return Float8Value{Kind: Float8ValueUnimplemented}
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
	unresolvedFlavor := 0
	if value.Kind == Float8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Float8ValueUnspecifiedNan {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Float8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == Float8ValueError {
		error := value.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor18764 := unresolvedFlavor
	if value.Kind == Float8ValueUnknown {
		if conditionFlavor18764 < 1 {
			conditionFlavor18764 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == Float8ValueUnimplemented {
		conditionFlavor18764 = langruntime.CheckedI32(2)
	}
	if value == (Float8Value{Kind: Float8ValueUnknown}) || value == (Float8Value{Kind: Float8ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor18764)
	}
	return BoolValue{Kind: BoolValueValue, Value: value == (Float8Value{Kind: Float8ValueNull})}
}
func Float8FromCaseGuard(value CheckOutcome) Float8Value {
	unresolvedFlavor := 0
	if value.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == CheckOutcomeError {
		error := value.Error
		return Float8Value{Kind: Float8ValueError, Error: error}
	}
	return Float8Unresolved(unresolvedFlavor)
}

type TimeValueKind uint8

const (
	TimeValueUnknown TimeValueKind = iota
	TimeValueUnimplemented
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
	unresolvedFlavor := 0
	if time < int64(0) || time > int64(86400000000) {
		return TimeUnresolved(unresolvedFlavor)
	}
	return TimeValue{Kind: TimeValueValue, Value: time}
}
func TimeIsNull(input TimeValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == TimeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TimeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TimeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor19214 := unresolvedFlavor
	if input.Kind == TimeValueUnknown {
		if conditionFlavor19214 < 1 {
			conditionFlavor19214 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TimeValueUnimplemented {
		conditionFlavor19214 = langruntime.CheckedI32(2)
	}
	if input == (TimeValue{Kind: TimeValueUnknown}) || input == (TimeValue{Kind: TimeValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor19214)
	}
	return BoolValue{Kind: BoolValueValue, Value: input == (TimeValue{Kind: TimeValueNull})}
}
func TimeFromCaseGuard(input CheckOutcome) TimeValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TimeValue{Kind: TimeValueError, Error: error}
	}
	return TimeUnresolved(unresolvedFlavor)
}

type TimetzPayload struct {
	Time int64
	Zone int
}
type TimetzValueKind uint8

const (
	TimetzValueUnknown TimetzValueKind = iota
	TimetzValueUnimplemented
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
	unresolvedFlavor := 0
	if time < int64(0) || time > int64(86400000000) {
		return TimetzUnresolved(unresolvedFlavor)
	}
	return TimetzValue{Kind: TimetzValueValue, Value: TimetzPayload{Time: time, Zone: zone}}
}
func TimetzIsNull(input TimetzValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == TimetzValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TimetzValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TimetzValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor19754 := unresolvedFlavor
	if input.Kind == TimetzValueUnknown {
		if conditionFlavor19754 < 1 {
			conditionFlavor19754 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TimetzValueUnimplemented {
		conditionFlavor19754 = langruntime.CheckedI32(2)
	}
	if input == (TimetzValue{Kind: TimetzValueUnknown}) || input == (TimetzValue{Kind: TimetzValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor19754)
	}
	return BoolValue{Kind: BoolValueValue, Value: input == (TimetzValue{Kind: TimetzValueNull})}
}
func TimetzFromCaseGuard(input CheckOutcome) TimetzValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TimetzValue{Kind: TimetzValueError, Error: error}
	}
	return TimetzUnresolved(unresolvedFlavor)
}

type IntervalPayload struct {
	Months int
	Days   int
	Time   int64
}
type IntervalValueKind uint8

const (
	IntervalValueUnknown IntervalValueKind = iota
	IntervalValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == IntervalValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == IntervalValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == IntervalValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor20274 := unresolvedFlavor
	if input.Kind == IntervalValueUnknown {
		if conditionFlavor20274 < 1 {
			conditionFlavor20274 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == IntervalValueUnimplemented {
		conditionFlavor20274 = langruntime.CheckedI32(2)
	}
	if input == (IntervalValue{Kind: IntervalValueUnknown}) || input == (IntervalValue{Kind: IntervalValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor20274)
	}
	return BoolValue{Kind: BoolValueValue, Value: input == (IntervalValue{Kind: IntervalValueNull})}
}
func IntervalFromCaseGuard(input CheckOutcome) IntervalValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	return IntervalUnresolved(unresolvedFlavor)
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
	PointValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == PointValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PointValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == PointValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor20824 := unresolvedFlavor
	if input.Kind == PointValueUnknown {
		if conditionFlavor20824 < 1 {
			conditionFlavor20824 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == PointValueUnimplemented {
		conditionFlavor20824 = langruntime.CheckedI32(2)
	}
	if input == (PointValue{Kind: PointValueUnknown}) || input == (PointValue{Kind: PointValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor20824)
	}
	return MakeBoolValue(input == (PointValue{Kind: PointValueNull}))
}
func PointFromCaseGuard(input CheckOutcome) PointValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PointValue{Kind: PointValueError, Error: error}
	}
	return PointUnresolved(unresolvedFlavor)
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
	LineValueUnimplemented
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
	unresolvedFlavor := 0
	first := Float8Number(a)
	second := Float8Number(b)
	if langruntime.F64Abs(first) <= float64(0.000001) && langruntime.F64Abs(second) <= float64(0.000001) {
		return LineUnresolved(unresolvedFlavor)
	}
	return LineValue{Kind: LineValueValue, Value: LinePayload{A: a, B: b, C: c, WireKnown: true}}
}
func MakeStoredLineBits(a int64, b int64, c int64) LineValue {
	return LineValue{Kind: LineValueValue, Value: LinePayload{A: a, B: b, C: c, WireKnown: true}}
}
func LineIsNull(input LineValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == LineValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == LineValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == LineValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor21424 := unresolvedFlavor
	if input.Kind == LineValueUnknown {
		if conditionFlavor21424 < 1 {
			conditionFlavor21424 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == LineValueUnimplemented {
		conditionFlavor21424 = langruntime.CheckedI32(2)
	}
	if input == (LineValue{Kind: LineValueUnknown}) || input == (LineValue{Kind: LineValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor21424)
	}
	return MakeBoolValue(input == (LineValue{Kind: LineValueNull}))
}
func LineFromCaseGuard(input CheckOutcome) LineValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return LineValue{Kind: LineValueError, Error: error}
	}
	return LineUnresolved(unresolvedFlavor)
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
	LsegValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == LsegValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == LsegValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == LsegValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor21934 := unresolvedFlavor
	if input.Kind == LsegValueUnknown {
		if conditionFlavor21934 < 1 {
			conditionFlavor21934 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == LsegValueUnimplemented {
		conditionFlavor21934 = langruntime.CheckedI32(2)
	}
	if input == (LsegValue{Kind: LsegValueUnknown}) || input == (LsegValue{Kind: LsegValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor21934)
	}
	return MakeBoolValue(input == (LsegValue{Kind: LsegValueNull}))
}
func LsegFromCaseGuard(input CheckOutcome) LsegValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return LsegValue{Kind: LsegValueError, Error: error}
	}
	return LsegUnresolved(unresolvedFlavor)
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
	BoxValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == BoxValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BoxValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BoxValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == BoxValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor22454 := unresolvedFlavor
	if input.Kind == BoxValueUnknown {
		if conditionFlavor22454 < 1 {
			conditionFlavor22454 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BoxValueUnimplemented {
		conditionFlavor22454 = langruntime.CheckedI32(2)
	}
	if input == (BoxValue{Kind: BoxValueUnknown}) || input == (BoxValue{Kind: BoxValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor22454)
	}
	return MakeBoolValue(input == (BoxValue{Kind: BoxValueNull}))
}
func BoxFromCaseGuard(input CheckOutcome) BoxValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return BoxValue{Kind: BoxValueError, Error: error}
	}
	return BoxUnresolved(unresolvedFlavor)
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
	PathValueUnimplemented
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
	case PathValueUnimplemented:
		return PathValue{Kind: PathValueUnimplemented}
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
	unresolvedFlavor := 0
	if len(payload.Points) == 0 {
		return PathUnresolved(unresolvedFlavor)
	}
	return PathValue{Kind: PathValueValue, Value: payload}
}
func StartStoredPath(closed bool) PathValue {
	points := []PointPayload{}
	payload := PathPayload{Closed: closed, Points: points}
	return PathValue{Kind: PathValueValue, Value: payload}
}
func AppendStoredPathPoint(path PathValue, point PointValue) PathValue {
	path = CopyPathValue(path)
	unresolvedFlavor := 0
	if path.Kind == PathValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if point.Kind == PointValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if path.Kind == PathValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if point.Kind == PointValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if path.Kind == PathValueError {
		error := path.Error
		return PathValue{Kind: PathValueError, Error: error}
	}
	if point.Kind == PointValueError {
		error := point.Error
		return PathValue{Kind: PathValueError, Error: error}
	}
	if path.Kind == PathValueValue {
		payload := CopyPathPayload(path.Value)
		closed := payload.Closed
		points := payload.Points
		if point.Kind == PointValueValue {
			value := point.Value
			langruntime.CheckedAdd(len(points), 1)
			points = append(points, value)
			updated := PathPayload{Closed: closed, Points: points}
			return PathValue{Kind: PathValueValue, Value: updated}
		}
	}
	return PathUnresolved(unresolvedFlavor)
}
func PathIsNull(input PathValue) BoolValue {
	input = CopyPathValue(input)
	unresolvedFlavor := 0
	if input.Kind == PathValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PathValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == PathValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor23254 := unresolvedFlavor
	if input.Kind == PathValueUnknown {
		if conditionFlavor23254 < 1 {
			conditionFlavor23254 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == PathValueUnknown {
		return BoolUnresolved(conditionFlavor23254)
	}
	conditionFlavor23277 := unresolvedFlavor
	if input.Kind == PathValueUnimplemented {
		conditionFlavor23277 = langruntime.CheckedI32(2)
	}
	if input.Kind == PathValueUnimplemented {
		return BoolUnresolved(conditionFlavor23277)
	}
	if input.Kind == PathValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func PathFromCaseGuard(input CheckOutcome) PathValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PathValue{Kind: PathValueError, Error: error}
	}
	return PathUnresolved(unresolvedFlavor)
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
	PolygonValueUnimplemented
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
	case PolygonValueUnimplemented:
		return PolygonValue{Kind: PolygonValueUnimplemented}
	case PolygonValueNull:
		return PolygonValue{Kind: PolygonValueNull}
	case PolygonValueValue:
		return PolygonValue{Kind: PolygonValueValue, Value: CopyPolygonPayload(value.Value)}
	case PolygonValueError:
		return PolygonValue{Kind: PolygonValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func StartStoredPolygon(bounds BoxValue) PolygonValue {
	points := []PointPayload{}
	payload := PolygonPayload{Points: points, Bounds: bounds}
	return PolygonValue{Kind: PolygonValueValue, Value: payload}
}
func AppendStoredPolygonPoint(polygon PolygonValue, point PointValue) PolygonValue {
	polygon = CopyPolygonValue(polygon)
	unresolvedFlavor := 0
	if polygon.Kind == PolygonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if point.Kind == PointValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if polygon.Kind == PolygonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if point.Kind == PointValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if polygon.Kind == PolygonValueError {
		error := polygon.Error
		return PolygonValue{Kind: PolygonValueError, Error: error}
	}
	if point.Kind == PointValueError {
		error := point.Error
		return PolygonValue{Kind: PolygonValueError, Error: error}
	}
	if polygon.Kind == PolygonValueValue {
		payload := CopyPolygonPayload(polygon.Value)
		bounds := payload.Bounds
		points := payload.Points
		if point.Kind == PointValueValue {
			value := point.Value
			langruntime.CheckedAdd(len(points), 1)
			points = append(points, value)
			updated := PolygonPayload{Bounds: bounds, Points: points}
			return PolygonValue{Kind: PolygonValueValue, Value: updated}
		}
	}
	return PolygonUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	maximumPoints := 134217725
	fallback := 0
	maximum := langruntime.IndexFromI32(maximumPoints, fallback)
	if len(payload.Points) == 0 || len(payload.Points) > maximum {
		return PolygonUnresolved(unresolvedFlavor)
	}
	calculated := polygonCalculatedBounds(CopyPolygonPayload(payload))
	bounds := payload.Bounds
	if bounds == (BoxValue{Kind: BoxValueUnknown}) || bounds == (BoxValue{Kind: BoxValueUnimplemented}) {
		bounds = BoxValue{Kind: BoxValueNonNull}
		if polygonBoundsAmbiguous(CopyPolygonPayload(payload), calculated) == false {
			bounds = BoxValue{Kind: BoxValueValue, Value: calculated}
		}
	}
	if bounds.Kind == BoxValueValue {
		actual := bounds.Value
		if polygonCoordinateEqual(actual.HighX, calculated.HighX) == false || polygonCoordinateEqual(actual.HighY, calculated.HighY) == false || polygonCoordinateEqual(actual.LowX, calculated.LowX) == false || polygonCoordinateEqual(actual.LowY, calculated.LowY) == false {
			return PolygonUnresolved(unresolvedFlavor)
		}
	}
	if bounds == (BoxValue{Kind: BoxValueNull}) {
		return PolygonUnresolved(unresolvedFlavor)
	}
	if bounds.Kind == BoxValueError {
		return PolygonUnresolved(unresolvedFlavor)
	}
	return PolygonValue{Kind: PolygonValueValue, Value: PolygonPayload{Points: payload.Points, Bounds: bounds}}
}
func MakePolygonPoints(payload PolygonPayload) PolygonValue {
	payload = CopyPolygonPayload(payload)
	unresolvedFlavor := 0
	maximumPoints := 134217725
	fallback := 0
	maximum := langruntime.IndexFromI32(maximumPoints, fallback)
	if len(payload.Points) == 0 || len(payload.Points) > maximum {
		return PolygonUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == PolygonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PolygonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == PolygonValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor25214 := unresolvedFlavor
	if input.Kind == PolygonValueUnknown {
		if conditionFlavor25214 < 1 {
			conditionFlavor25214 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == PolygonValueUnknown {
		return BoolUnresolved(conditionFlavor25214)
	}
	conditionFlavor25237 := unresolvedFlavor
	if input.Kind == PolygonValueUnimplemented {
		conditionFlavor25237 = langruntime.CheckedI32(2)
	}
	if input.Kind == PolygonValueUnimplemented {
		return BoolUnresolved(conditionFlavor25237)
	}
	if input.Kind == PolygonValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func PolygonFromCaseGuard(input CheckOutcome) PolygonValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PolygonValue{Kind: PolygonValueError, Error: error}
	}
	return PolygonUnresolved(unresolvedFlavor)
}

type CircleValueKind uint8

const (
	CircleValueUnknown CircleValueKind = iota
	CircleValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == CircleValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CircleValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CircleValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor25674 := unresolvedFlavor
	if input.Kind == CircleValueUnknown {
		if conditionFlavor25674 < 1 {
			conditionFlavor25674 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == CircleValueUnimplemented {
		conditionFlavor25674 = langruntime.CheckedI32(2)
	}
	if input == (CircleValue{Kind: CircleValueUnknown}) || input == (CircleValue{Kind: CircleValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor25674)
	}
	return MakeBoolValue(input == (CircleValue{Kind: CircleValueNull}))
}
func CircleFromCaseGuard(input CheckOutcome) CircleValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return CircleValue{Kind: CircleValueError, Error: error}
	}
	return CircleUnresolved(unresolvedFlavor)
}

type AclitemPayload struct {
	Grantee      int64
	Grantor      int64
	Privileges   int64
	GrantOptions int64
}
type AclitemCatalogPayload struct {
	Privileges     int64
	GrantOptions   int64
	PublicGrantee  bool
	InvalidGrantor bool
}
type AclitemValueKind uint8

const (
	AclitemValueUnknown AclitemValueKind = iota
	AclitemValueUnimplemented
	AclitemValueNull
	AclitemValueValue
	AclitemValueError
	AclitemValueCatalog
)

type AclitemValue struct {
	Kind    AclitemValueKind
	Value   AclitemPayload
	Error   SqlError
	Catalog AclitemCatalogPayload
}

func AclitemUnknown() AclitemValue {
	return AclitemValue{Kind: AclitemValueUnknown}
}
func AclitemNull() AclitemValue {
	return AclitemValue{Kind: AclitemValueNull}
}
func MakeAclitemValue(grantee int64, grantor int64, privileges int64, grantOptions int64) AclitemValue {
	unresolvedFlavor := 0
	if grantee < int64(0) || grantee > int64(4294967295) || grantor < int64(0) || grantor > int64(4294967295) || privileges < int64(0) || privileges > int64(4294967295) || grantOptions < int64(0) || grantOptions > int64(4294967295) {
		return AclitemUnresolved(unresolvedFlavor)
	}
	return AclitemValue{Kind: AclitemValueValue, Value: AclitemPayload{Grantee: grantee, Grantor: grantor, Privileges: privileges, GrantOptions: grantOptions}}
}
func MakeAclitemCatalogValue(privileges int64, grantOptions int64, publicGrantee bool, invalidGrantor bool) AclitemValue {
	unresolvedFlavor := 0
	if privileges < int64(0) || privileges > int64(4294967295) || grantOptions < int64(0) || grantOptions > int64(4294967295) {
		return AclitemUnresolved(unresolvedFlavor)
	}
	if publicGrantee && invalidGrantor {
		return MakeAclitemValue(int64(0), int64(0), privileges, grantOptions)
	}
	return AclitemValue{Kind: AclitemValueCatalog, Catalog: AclitemCatalogPayload{Privileges: privileges, GrantOptions: grantOptions, PublicGrantee: publicGrantee, InvalidGrantor: invalidGrantor}}
}
func AclitemIsNull(input AclitemValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == AclitemValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == AclitemValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == AclitemValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor26264 := unresolvedFlavor
	if input.Kind == AclitemValueUnknown {
		if conditionFlavor26264 < 1 {
			conditionFlavor26264 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == AclitemValueUnimplemented {
		conditionFlavor26264 = langruntime.CheckedI32(2)
	}
	if input == (AclitemValue{Kind: AclitemValueUnknown}) || input == (AclitemValue{Kind: AclitemValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor26264)
	}
	return MakeBoolValue(input == (AclitemValue{Kind: AclitemValueNull}))
}
func AclitemFromCaseGuard(input CheckOutcome) AclitemValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return AclitemValue{Kind: AclitemValueError, Error: error}
	}
	return AclitemUnresolved(unresolvedFlavor)
}

type MoneyValueKind uint8

const (
	MoneyValueUnknown MoneyValueKind = iota
	MoneyValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == MoneyValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MoneyValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == MoneyValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor26594 := unresolvedFlavor
	if input.Kind == MoneyValueUnknown {
		if conditionFlavor26594 < 1 {
			conditionFlavor26594 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == MoneyValueUnimplemented {
		conditionFlavor26594 = langruntime.CheckedI32(2)
	}
	if input == (MoneyValue{Kind: MoneyValueUnknown}) || input == (MoneyValue{Kind: MoneyValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor26594)
	}
	return MakeBoolValue(input == (MoneyValue{Kind: MoneyValueNull}))
}
func MoneyFromCaseGuard(input CheckOutcome) MoneyValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return MoneyValue{Kind: MoneyValueError, Error: error}
	}
	return MoneyUnresolved(unresolvedFlavor)
}

type InternalCharValueKind uint8

const (
	InternalCharValueUnknown InternalCharValueKind = iota
	InternalCharValueUnimplemented
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
	unresolvedFlavor := 0
	if units < 0 || units > 255 {
		return InternalCharUnresolved(unresolvedFlavor)
	}
	return InternalCharValue{Kind: InternalCharValueValue, Value: units}
}
func InternalCharIsNull(input InternalCharValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == InternalCharValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == InternalCharValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == InternalCharValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor27004 := unresolvedFlavor
	if input.Kind == InternalCharValueUnknown {
		if conditionFlavor27004 < 1 {
			conditionFlavor27004 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == InternalCharValueUnimplemented {
		conditionFlavor27004 = langruntime.CheckedI32(2)
	}
	if input == (InternalCharValue{Kind: InternalCharValueUnknown}) || input == (InternalCharValue{Kind: InternalCharValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor27004)
	}
	return MakeBoolValue(input == (InternalCharValue{Kind: InternalCharValueNull}))
}
func InternalCharFromCaseGuard(input CheckOutcome) InternalCharValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return InternalCharValue{Kind: InternalCharValueError, Error: error}
	}
	return InternalCharUnresolved(unresolvedFlavor)
}

type OidValueKind uint8

const (
	OidValueUnknown OidValueKind = iota
	OidValueUnimplemented
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
	unresolvedFlavor := 0
	if units < int64(0) || units > int64(4294967295) {
		return OidUnresolved(unresolvedFlavor)
	}
	return OidValue{Kind: OidValueValue, Value: units}
}
func OidIsNull(input OidValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == OidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == OidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == OidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor27414 := unresolvedFlavor
	if input.Kind == OidValueUnknown {
		if conditionFlavor27414 < 1 {
			conditionFlavor27414 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == OidValueUnimplemented {
		conditionFlavor27414 = langruntime.CheckedI32(2)
	}
	if input == (OidValue{Kind: OidValueUnknown}) || input == (OidValue{Kind: OidValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor27414)
	}
	return MakeBoolValue(input == (OidValue{Kind: OidValueNull}))
}
func OidFromCaseGuard(input CheckOutcome) OidValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return OidValue{Kind: OidValueError, Error: error}
	}
	return OidUnresolved(unresolvedFlavor)
}

type XidValueKind uint8

const (
	XidValueUnknown XidValueKind = iota
	XidValueUnimplemented
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
	unresolvedFlavor := 0
	if units < int64(0) || units > int64(4294967295) {
		return XidUnresolved(unresolvedFlavor)
	}
	return XidValue{Kind: XidValueValue, Value: units}
}
func XidIsNull(input XidValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == XidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == XidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == XidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor27824 := unresolvedFlavor
	if input.Kind == XidValueUnknown {
		if conditionFlavor27824 < 1 {
			conditionFlavor27824 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == XidValueUnimplemented {
		conditionFlavor27824 = langruntime.CheckedI32(2)
	}
	if input == (XidValue{Kind: XidValueUnknown}) || input == (XidValue{Kind: XidValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor27824)
	}
	return MakeBoolValue(input == (XidValue{Kind: XidValueNull}))
}
func XidFromCaseGuard(input CheckOutcome) XidValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return XidValue{Kind: XidValueError, Error: error}
	}
	return XidUnresolved(unresolvedFlavor)
}

type CidValueKind uint8

const (
	CidValueUnknown CidValueKind = iota
	CidValueUnimplemented
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
	unresolvedFlavor := 0
	if units < int64(0) || units > int64(4294967295) {
		return CidUnresolved(unresolvedFlavor)
	}
	return CidValue{Kind: CidValueValue, Value: units}
}
func CidIsNull(input CidValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == CidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor28234 := unresolvedFlavor
	if input.Kind == CidValueUnknown {
		if conditionFlavor28234 < 1 {
			conditionFlavor28234 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == CidValueUnimplemented {
		conditionFlavor28234 = langruntime.CheckedI32(2)
	}
	if input == (CidValue{Kind: CidValueUnknown}) || input == (CidValue{Kind: CidValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor28234)
	}
	return MakeBoolValue(input == (CidValue{Kind: CidValueNull}))
}
func CidFromCaseGuard(input CheckOutcome) CidValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return CidValue{Kind: CidValueError, Error: error}
	}
	return CidUnresolved(unresolvedFlavor)
}

type SnapshotXid struct {
	Bits int64
}

func CopySnapshotXid(value SnapshotXid) SnapshotXid {
	return SnapshotXid{Bits: value.Bits}
}

type SnapshotPayload struct {
	Xmin int64
	Xmax int64
	Xip  []SnapshotXid
}

func CopySnapshotPayload(value SnapshotPayload) SnapshotPayload {
	return SnapshotPayload{Xmin: value.Xmin, Xmax: value.Xmax, Xip: langruntime.CheckedStructs(value.Xip, CopySnapshotXid)}
}

type SnapshotValueKind uint8

const (
	SnapshotValueUnknown SnapshotValueKind = iota
	SnapshotValueUnimplemented
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
	case SnapshotValueUnimplemented:
		return SnapshotValue{Kind: SnapshotValueUnimplemented}
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
	unresolvedFlavor := 0
	if SnapshotCountFits(len(payload.Xip)) == false {
		return SnapshotUnresolved(unresolvedFlavor)
	}
	if langruntime.CheckedI64Remainder(payload.Xmin, int64(4294967296)) == int64(0) || langruntime.CheckedI64Remainder(payload.Xmax, int64(4294967296)) == int64(0) || SnapshotXidOrder(payload.Xmin, payload.Xmax) > 0 {
		return SnapshotUnresolved(unresolvedFlavor)
	}
	index := 0
	previous := int64(0)
	for index < len(payload.Xip) {
		bits := payload.Xip[index].Bits
		if SnapshotXidOrder(bits, payload.Xmin) < 0 || SnapshotXidOrder(bits, payload.Xmax) > 0 || SnapshotXidOrder(bits, previous) <= 0 {
			return SnapshotUnresolved(unresolvedFlavor)
		}
		previous = bits
		index = langruntime.CheckedAdd(index, 1)
	}
	return SnapshotValue{Kind: SnapshotValueValue, Value: payload}
}
func StartStoredSnapshot(xmin int64, xmax int64) SnapshotValue {
	xip := []SnapshotXid{}
	return MakeSnapshotValue(SnapshotPayload{Xmin: xmin, Xmax: xmax, Xip: xip})
}
func AppendStoredSnapshot(input SnapshotValue, bits int64) SnapshotValue {
	input = CopySnapshotValue(input)
	if input.Kind == SnapshotValueValue {
		payload := CopySnapshotPayload(input.Value)
		xmin := payload.Xmin
		xmax := payload.Xmax
		xip := payload.Xip
		langruntime.CheckedAdd(len(xip), 1)
		xip = append(xip, SnapshotXid{Bits: bits})
		return SnapshotValue{Kind: SnapshotValueValue, Value: SnapshotPayload{Xmin: xmin, Xmax: xmax, Xip: xip}}
	}
	return input
}
func SnapshotIsNull(input SnapshotValue) BoolValue {
	input = CopySnapshotValue(input)
	unresolvedFlavor := 0
	if input.Kind == SnapshotValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == SnapshotValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == SnapshotValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor29284 := unresolvedFlavor
	if input.Kind == SnapshotValueUnknown {
		if conditionFlavor29284 < 1 {
			conditionFlavor29284 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == SnapshotValueUnknown {
		return BoolUnresolved(conditionFlavor29284)
	}
	conditionFlavor29307 := unresolvedFlavor
	if input.Kind == SnapshotValueUnimplemented {
		conditionFlavor29307 = langruntime.CheckedI32(2)
	}
	if input.Kind == SnapshotValueUnimplemented {
		return BoolUnresolved(conditionFlavor29307)
	}
	if input.Kind == SnapshotValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func SnapshotFromCaseGuard(input CheckOutcome) SnapshotValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return SnapshotValue{Kind: SnapshotValueError, Error: error}
	}
	return SnapshotUnresolved(unresolvedFlavor)
}

type Xid8ValueKind uint8

const (
	Xid8ValueUnknown Xid8ValueKind = iota
	Xid8ValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == Xid8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Xid8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == Xid8ValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor29704 := unresolvedFlavor
	if input.Kind == Xid8ValueUnknown {
		if conditionFlavor29704 < 1 {
			conditionFlavor29704 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == Xid8ValueUnimplemented {
		conditionFlavor29704 = langruntime.CheckedI32(2)
	}
	if input == (Xid8Value{Kind: Xid8ValueUnknown}) || input == (Xid8Value{Kind: Xid8ValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor29704)
	}
	return MakeBoolValue(input == (Xid8Value{Kind: Xid8ValueNull}))
}
func Xid8FromCaseGuard(input CheckOutcome) Xid8Value {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return Xid8Value{Kind: Xid8ValueError, Error: error}
	}
	return Xid8Unresolved(unresolvedFlavor)
}

type PgLsnValueKind uint8

const (
	PgLsnValueUnknown PgLsnValueKind = iota
	PgLsnValueUnimplemented
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
	unresolvedFlavor := 0
	if input.Kind == PgLsnValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PgLsnValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == PgLsnValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor30074 := unresolvedFlavor
	if input.Kind == PgLsnValueUnknown {
		if conditionFlavor30074 < 1 {
			conditionFlavor30074 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == PgLsnValueUnimplemented {
		conditionFlavor30074 = langruntime.CheckedI32(2)
	}
	if input == (PgLsnValue{Kind: PgLsnValueUnknown}) || input == (PgLsnValue{Kind: PgLsnValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor30074)
	}
	return MakeBoolValue(input == (PgLsnValue{Kind: PgLsnValueNull}))
}
func PgLsnFromCaseGuard(input CheckOutcome) PgLsnValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return PgLsnValue{Kind: PgLsnValueError, Error: error}
	}
	return PgLsnUnresolved(unresolvedFlavor)
}

type TidValueKind uint8

const (
	TidValueUnknown TidValueKind = iota
	TidValueUnimplemented
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
	unresolvedFlavor := 0
	if units < int64(0) || units > int64(281474976710655) {
		return TidUnresolved(unresolvedFlavor)
	}
	return TidValue{Kind: TidValueValue, Value: units}
}
func TidIsNull(input TidValue) BoolValue {
	unresolvedFlavor := 0
	if input.Kind == TidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TidValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor30484 := unresolvedFlavor
	if input.Kind == TidValueUnknown {
		if conditionFlavor30484 < 1 {
			conditionFlavor30484 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TidValueUnimplemented {
		conditionFlavor30484 = langruntime.CheckedI32(2)
	}
	if input == (TidValue{Kind: TidValueUnknown}) || input == (TidValue{Kind: TidValueUnimplemented}) {
		return BoolUnresolved(conditionFlavor30484)
	}
	return MakeBoolValue(input == (TidValue{Kind: TidValueNull}))
}
func TidFromCaseGuard(input CheckOutcome) TidValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TidValue{Kind: TidValueError, Error: error}
	}
	return TidUnresolved(unresolvedFlavor)
}
func MakeTidParts(block int64, offset int) TidValue {
	offset = langruntime.CheckedI32(offset)
	unresolvedFlavor := 0
	if block < int64(0) || block > int64(4294967295) || offset < 0 || offset > 65535 {
		return TidUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == JsonpathValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonpathValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonpathValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor30854 := unresolvedFlavor
	if input.Kind == JsonpathValueUnknown {
		if conditionFlavor30854 < 1 {
			conditionFlavor30854 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonpathValueUnknown {
		return BoolUnresolved(conditionFlavor30854)
	}
	conditionFlavor30877 := unresolvedFlavor
	if input.Kind == JsonpathValueUnimplemented {
		conditionFlavor30877 = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonpathValueUnimplemented {
		return BoolUnresolved(conditionFlavor30877)
	}
	if input.Kind == JsonpathValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func JsonpathFromCaseGuard(input CheckOutcome) JsonpathValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return JsonpathValue{Kind: JsonpathValueError, Error: error}
	}
	return JsonpathUnresolved(unresolvedFlavor)
}
func JsonpathFromCoercedValue(input JsonpathValue) JsonpathValue {
	input = CopyJsonpathValue(input)
	unresolvedFlavor := 0
	if input.Kind == JsonpathValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonpathValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonpathValueStoredText {
		text := langruntime.CheckedString(input.StoredText)
		characters := []rune(text)
		if len(characters) == 0 {
			return JsonpathUnresolved(unresolvedFlavor)
		}
		index := 0
		for index < len(characters) {
			if characters[index] == '\x00' {
				return JsonpathUnresolved(unresolvedFlavor)
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		return JsonpathValue{Kind: JsonpathValueStoredText, StoredText: text}
	}
	if input.Kind == JsonpathValueValue {
		value := CopyJsonpathPayload(input.Value)
		if value.Root == 0 || value.Root >= len(value.Nodes) {
			return JsonpathUnresolved(unresolvedFlavor)
		}
		index := 0
		for index < len(value.Characters) {
			if value.Characters[index] == '\x00' {
				return JsonpathUnresolved(unresolvedFlavor)
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		visited := []int{}
		langruntime.CheckedAdd(len(visited), 1)
		visited = append(visited, langruntime.CheckedIndex(0))
		index = langruntime.CheckedIndex(1)
		for index < len(value.Nodes) {
			if jsonpathPayloadNodeValid(&value, index) == false {
				return JsonpathUnresolved(unresolvedFlavor)
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
				return JsonpathUnresolved(unresolvedFlavor)
			}
			visited[visit.node] = langruntime.CheckedIndex(1)
			node := value.Nodes[visit.node]
			if (node.Kind == JsonpathNodeSubscript) != visit.list {
				return JsonpathUnresolved(unresolvedFlavor)
			}
			if visit.list == false && jsonpathAccessorKind(node.Kind) != visit.accessor {
				return JsonpathUnresolved(unresolvedFlavor)
			}
			if node.Kind == JsonpathNodeCurrent && visit.filters == 0 {
				return JsonpathUnresolved(unresolvedFlavor)
			}
			if node.Kind == JsonpathNodeLast && visit.subscript == false {
				return JsonpathUnresolved(unresolvedFlavor)
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

type TsvectorPosition struct {
	Position int
	Weight   int
}

func CopyTsvectorPosition(value TsvectorPosition) TsvectorPosition {
	return TsvectorPosition{Position: langruntime.CheckedI32(value.Position), Weight: langruntime.CheckedI32(value.Weight)}
}

type TsvectorLexeme struct {
	Text      string
	Positions []TsvectorPosition
}

func CopyTsvectorLexeme(value TsvectorLexeme) TsvectorLexeme {
	return TsvectorLexeme{Text: langruntime.CheckedString(value.Text), Positions: langruntime.CheckedStructs(value.Positions, CopyTsvectorPosition)}
}

type TsvectorPayload struct {
	Lexemes     []TsvectorLexeme
	NativeBytes int
}

func CopyTsvectorPayload(value TsvectorPayload) TsvectorPayload {
	return TsvectorPayload{Lexemes: langruntime.CheckedStructs(value.Lexemes, CopyTsvectorLexeme), NativeBytes: langruntime.CheckedI32(value.NativeBytes)}
}

type TsvectorValueKind uint8

const (
	TsvectorValueUnknown TsvectorValueKind = iota
	TsvectorValueUnimplemented
	TsvectorValueNull
	TsvectorValueValue
	TsvectorValueError
)

type TsvectorValue struct {
	Kind  TsvectorValueKind
	Value TsvectorPayload
	Error SqlError
}

func CopyTsvectorValue(value TsvectorValue) TsvectorValue {
	switch value.Kind {
	case TsvectorValueUnknown:
		return TsvectorValue{Kind: TsvectorValueUnknown}
	case TsvectorValueUnimplemented:
		return TsvectorValue{Kind: TsvectorValueUnimplemented}
	case TsvectorValueNull:
		return TsvectorValue{Kind: TsvectorValueNull}
	case TsvectorValueValue:
		return TsvectorValue{Kind: TsvectorValueValue, Value: CopyTsvectorPayload(value.Value)}
	case TsvectorValueError:
		return TsvectorValue{Kind: TsvectorValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func TsvectorUnknown() TsvectorValue {
	return TsvectorValue{Kind: TsvectorValueUnknown}
}
func TsvectorNull() TsvectorValue {
	return TsvectorValue{Kind: TsvectorValueNull}
}
func MakeStoredTsvectorPayload(nativeBytes int) TsvectorPayload {
	nativeBytes = langruntime.CheckedI32(nativeBytes)
	lexemes := []TsvectorLexeme{}
	return TsvectorPayload{Lexemes: lexemes, NativeBytes: nativeBytes}
}
func MakeStoredTsvectorLexeme(text string) TsvectorLexeme {
	text = langruntime.CheckedString(text)
	positions := []TsvectorPosition{}
	return TsvectorLexeme{Text: text, Positions: positions}
}
func TsvectorAppendStoredPosition(input TsvectorLexeme, position int, weight int) TsvectorLexeme {
	input = CopyTsvectorLexeme(input)
	position = langruntime.CheckedI32(position)
	weight = langruntime.CheckedI32(weight)
	positions := input.Positions
	langruntime.CheckedAdd(len(positions), 1)
	positions = append(positions, TsvectorPosition{Position: position, Weight: weight})
	return TsvectorLexeme{Text: input.Text, Positions: positions}
}
func TsvectorAppendStoredLexeme(input TsvectorPayload, lexeme TsvectorLexeme) TsvectorPayload {
	input = CopyTsvectorPayload(input)
	lexeme = CopyTsvectorLexeme(lexeme)
	lexemes := input.Lexemes
	langruntime.CheckedAdd(len(lexemes), 1)
	lexemes = append(lexemes, CopyTsvectorLexeme(lexeme))
	return TsvectorPayload{Lexemes: lexemes, NativeBytes: input.NativeBytes}
}
func TsvectorLexemeBytes(input string) int {
	input = langruntime.CheckedString(input)
	chars := []rune(input)
	bytes := 0
	index := 0
	for index < len(chars) {
		point := int(langruntime.CheckedChar(chars[index]))
		width := 1
		if point == 0 {
			return langruntime.CheckedSignedNegate(1)
		}
		if point >= 65536 {
			width = langruntime.CheckedI32(4)
		} else if point >= 2048 {
			width = langruntime.CheckedI32(3)
		} else if point >= 128 {
			width = langruntime.CheckedI32(2)
		}
		if bytes > langruntime.CheckedSignedSubtract(2147483647, width) {
			return langruntime.CheckedSignedNegate(1)
		}
		bytes = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bytes, width))
		index = langruntime.CheckedAdd(index, 1)
	}
	return bytes
}
func TsvectorLexemeOrder(left string, right string) int {
	left = langruntime.CheckedString(left)
	right = langruntime.CheckedString(right)
	a := []rune(left)
	b := []rune(right)
	index := 0
	for index < len(a) && index < len(b) {
		if (int(langruntime.CheckedChar(a[index]))) < (int(langruntime.CheckedChar(b[index]))) {
			return langruntime.CheckedSignedNegate(1)
		}
		if (int(langruntime.CheckedChar(a[index]))) > (int(langruntime.CheckedChar(b[index]))) {
			return 1
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	if len(a) < len(b) {
		return langruntime.CheckedSignedNegate(1)
	}
	if len(a) > len(b) {
		return 1
	}
	return 0
}
func TsvectorCanonicalBytes(input *TsvectorPayload) int {
	input = langruntime.CheckedBorrowed(input, CopyTsvectorPayload)
	if len(input.Lexemes) > 1048575 {
		return langruntime.CheckedSignedNegate(1)
	}
	bytes := 0
	index := 0
	for index < len(input.Lexemes) {
		width := TsvectorLexemeBytes(input.Lexemes[index].Text)
		if width < 0 || width > 2047 {
			return langruntime.CheckedSignedNegate(1)
		}
		bytes = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bytes, width))
		count := len(input.Lexemes[index].Positions)
		if count > 256 {
			return langruntime.CheckedSignedNegate(1)
		}
		if count > 0 {
			if langruntime.CheckedSignedRemainder(bytes, 2) != 0 {
				bytes = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bytes, 1))
			}
			bytes = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(bytes, 2), langruntime.CheckedSignedMultiply((int(int32(count))), 2)))
		}
		if bytes > 1048575 {
			return langruntime.CheckedSignedNegate(1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(8, langruntime.CheckedSignedMultiply((int(int32(len(input.Lexemes)))), 4)), bytes)
}
func MakeTsvectorValue(input TsvectorPayload) TsvectorValue {
	input = CopyTsvectorPayload(input)
	unresolvedFlavor := 0
	if input.NativeBytes > 1073741823 {
		return TsvectorUnresolved(unresolvedFlavor)
	}
	if TsvectorCanonicalBytes(&input) < 0 {
		return TsvectorUnresolved(unresolvedFlavor)
	}
	if input.NativeBytes != langruntime.CheckedSignedNegate(1) && input.NativeBytes < langruntime.CheckedSignedAdd(8, langruntime.CheckedSignedMultiply((int(int32(len(input.Lexemes)))), 4)) {
		return TsvectorUnresolved(unresolvedFlavor)
	}
	index := 0
	for index < len(input.Lexemes) {
		text := input.Lexemes[index].Text
		if text == "" {
			return TsvectorUnresolved(unresolvedFlavor)
		}
		if index > 0 && TsvectorLexemeOrder(input.Lexemes[langruntime.CheckedSubtract(index, 1)].Text, text) > 0 {
			return TsvectorUnresolved(unresolvedFlavor)
		}
		position := 0
		previous := langruntime.CheckedSignedNegate(1)
		for position < len(input.Lexemes[index].Positions) {
			value := input.Lexemes[index].Positions[position]
			if value.Position < 0 || value.Position < previous || value.Position > 16383 || value.Weight < 0 || value.Weight > 3 {
				return TsvectorUnresolved(unresolvedFlavor)
			}
			previous = langruntime.CheckedI32(value.Position)
			position = langruntime.CheckedAdd(position, 1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return TsvectorValue{Kind: TsvectorValueValue, Value: input}
}
func TsvectorIsNull(input TsvectorValue) BoolValue {
	input = CopyTsvectorValue(input)
	unresolvedFlavor := 0
	if input.Kind == TsvectorValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TsvectorValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TsvectorValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor33584 := unresolvedFlavor
	if input.Kind == TsvectorValueUnknown {
		if conditionFlavor33584 < 1 {
			conditionFlavor33584 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TsvectorValueUnknown {
		return BoolUnresolved(conditionFlavor33584)
	}
	conditionFlavor335890 := unresolvedFlavor
	if input.Kind == TsvectorValueUnimplemented {
		conditionFlavor335890 = langruntime.CheckedI32(2)
	}
	if input.Kind == TsvectorValueUnimplemented {
		return BoolUnresolved(conditionFlavor335890)
	}
	if input.Kind == TsvectorValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func TsvectorFromCaseGuard(input CheckOutcome) TsvectorValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TsvectorValue{Kind: TsvectorValueError, Error: error}
	}
	return TsvectorUnresolved(unresolvedFlavor)
}

type TsqueryNode struct {
	Kind     int
	Text     string
	Weight   int
	Prefix   bool
	Distance int
	Left     int
	Right    int
}

func CopyTsqueryNode(value TsqueryNode) TsqueryNode {
	return TsqueryNode{Kind: langruntime.CheckedI32(value.Kind), Text: langruntime.CheckedString(value.Text), Weight: langruntime.CheckedI32(value.Weight), Prefix: value.Prefix, Distance: langruntime.CheckedI32(value.Distance), Left: langruntime.CheckedIndex(value.Left), Right: langruntime.CheckedIndex(value.Right)}
}

type TsqueryPayload struct {
	Nodes       []TsqueryNode
	Root        int
	NativeBytes int
}

func CopyTsqueryPayload(value TsqueryPayload) TsqueryPayload {
	return TsqueryPayload{Nodes: langruntime.CheckedStructs(value.Nodes, CopyTsqueryNode), Root: langruntime.CheckedIndex(value.Root), NativeBytes: langruntime.CheckedI32(value.NativeBytes)}
}

type TsqueryValueKind uint8

const (
	TsqueryValueUnknown TsqueryValueKind = iota
	TsqueryValueUnimplemented
	TsqueryValueNull
	TsqueryValueValue
	TsqueryValueError
)

type TsqueryValue struct {
	Kind  TsqueryValueKind
	Value TsqueryPayload
	Error SqlError
}

func CopyTsqueryValue(value TsqueryValue) TsqueryValue {
	switch value.Kind {
	case TsqueryValueUnknown:
		return TsqueryValue{Kind: TsqueryValueUnknown}
	case TsqueryValueUnimplemented:
		return TsqueryValue{Kind: TsqueryValueUnimplemented}
	case TsqueryValueNull:
		return TsqueryValue{Kind: TsqueryValueNull}
	case TsqueryValueValue:
		return TsqueryValue{Kind: TsqueryValueValue, Value: CopyTsqueryPayload(value.Value)}
	case TsqueryValueError:
		return TsqueryValue{Kind: TsqueryValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func TsqueryUnknown() TsqueryValue {
	return TsqueryValue{Kind: TsqueryValueUnknown}
}
func TsqueryNull() TsqueryValue {
	return TsqueryValue{Kind: TsqueryValueNull}
}
func TsqueryCanonicalBytes(input *TsqueryPayload) int {
	input = langruntime.CheckedBorrowed(input, CopyTsqueryPayload)
	if len(input.Nodes) > 89478484 {
		return langruntime.CheckedSignedNegate(1)
	}
	count := int(int32(len(input.Nodes)))
	bytes := langruntime.CheckedI64Add(int64(8), langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(count))), int64(12)))
	index := 0
	for index < len(input.Nodes) {
		if input.Nodes[index].Kind == 0 {
			width := TsvectorLexemeBytes(input.Nodes[index].Text)
			if width < 0 || width > 2047 {
				return langruntime.CheckedSignedNegate(1)
			}
			bytes = langruntime.CheckedI64Add(langruntime.CheckedI64Add(bytes, (int64(langruntime.CheckedI32(width)))), int64(1))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	if bytes > int64(1073741823) {
		return langruntime.CheckedSignedNegate(1)
	}
	return int(int32(bytes))
}
func MakeTsqueryValue(input TsqueryPayload) TsqueryValue {
	input = CopyTsqueryPayload(input)
	unresolvedFlavor := 0
	if len(input.Nodes) > 89478484 {
		return TsqueryUnresolved(unresolvedFlavor)
	}
	if input.NativeBytes < langruntime.CheckedSignedNegate(1) || input.NativeBytes > 1073741823 {
		return TsqueryUnresolved(unresolvedFlavor)
	}
	count := int(int32(len(input.Nodes)))
	if input.NativeBytes != langruntime.CheckedSignedNegate(1) && (int64(langruntime.CheckedI32(input.NativeBytes))) < langruntime.CheckedI64Add(int64(8), langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(count))), int64(12))) {
		return TsqueryUnresolved(unresolvedFlavor)
	}
	if len(input.Nodes) == 0 {
		if input.Root != 0 {
			return TsqueryUnresolved(unresolvedFlavor)
		}
		return TsqueryValue{Kind: TsqueryValueValue, Value: input}
	}
	if input.Root != langruntime.CheckedSubtract(len(input.Nodes), 1) {
		return TsqueryUnresolved(unresolvedFlavor)
	}
	stack := []int{}
	depth := 0
	index := 0
	for index < len(input.Nodes) {
		node := input.Nodes[index]
		if node.Kind < 0 || node.Kind > 4 {
			return TsqueryUnresolved(unresolvedFlavor)
		}
		if node.Kind == 0 {
			width := TsvectorLexemeBytes(node.Text)
			if width < 0 || width > 2047 {
				return TsqueryUnresolved(unresolvedFlavor)
			}
			if node.Weight < 0 || node.Weight > 15 || node.Distance != 0 || node.Left != 0 || node.Right != 0 {
				return TsqueryUnresolved(unresolvedFlavor)
			}
		} else {
			if node.Text != "" || node.Weight != 0 || node.Prefix {
				return TsqueryUnresolved(unresolvedFlavor)
			}
			if node.Kind != 4 && node.Distance != 0 {
				return TsqueryUnresolved(unresolvedFlavor)
			}
			if node.Kind == 4 && (node.Distance < langruntime.CheckedSignedNegate(32768) || node.Distance > 32767) {
				return TsqueryUnresolved(unresolvedFlavor)
			}
			if node.Kind == 1 {
				if depth < 1 || node.Left != stack[langruntime.CheckedSubtract(depth, 1)] || node.Right != 0 {
					return TsqueryUnresolved(unresolvedFlavor)
				}
				depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
			} else {
				if depth < 2 || node.Left != stack[langruntime.CheckedSubtract(depth, 2)] || node.Right != stack[langruntime.CheckedSubtract(depth, 1)] {
					return TsqueryUnresolved(unresolvedFlavor)
				}
				depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 2))
			}
		}
		if depth < len(stack) {
			stack[depth] = langruntime.CheckedIndex(index)
		} else {
			langruntime.CheckedAdd(len(stack), 1)
			stack = append(stack, langruntime.CheckedIndex(index))
		}
		depth = langruntime.CheckedAdd(depth, 1)
		index = langruntime.CheckedAdd(index, 1)
	}
	if depth != 1 {
		return TsqueryUnresolved(unresolvedFlavor)
	}
	return TsqueryValue{Kind: TsqueryValueValue, Value: input}
}
func TsqueryIsNull(input TsqueryValue) BoolValue {
	input = CopyTsqueryValue(input)
	unresolvedFlavor := 0
	if input.Kind == TsqueryValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TsqueryValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TsqueryValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor34644 := unresolvedFlavor
	if input.Kind == TsqueryValueUnknown {
		if conditionFlavor34644 < 1 {
			conditionFlavor34644 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TsqueryValueUnknown {
		return BoolUnresolved(conditionFlavor34644)
	}
	conditionFlavor346489 := unresolvedFlavor
	if input.Kind == TsqueryValueUnimplemented {
		conditionFlavor346489 = langruntime.CheckedI32(2)
	}
	if input.Kind == TsqueryValueUnimplemented {
		return BoolUnresolved(conditionFlavor346489)
	}
	if input.Kind == TsqueryValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func TsqueryFromCaseGuard(input CheckOutcome) TsqueryValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return TsqueryValue{Kind: TsqueryValueError, Error: error}
	}
	return TsqueryUnresolved(unresolvedFlavor)
}
func MakeTsqueryPayload(nativeBytes int) TsqueryPayload {
	nativeBytes = langruntime.CheckedI32(nativeBytes)
	nodes := []TsqueryNode{}
	return TsqueryPayload{Nodes: nodes, Root: 0, NativeBytes: nativeBytes}
}
func TsqueryAppendNode(input TsqueryPayload, kind int, text string, weight int, prefix bool, distance int, left int, right int) TsqueryPayload {
	input = CopyTsqueryPayload(input)
	kind = langruntime.CheckedI32(kind)
	text = langruntime.CheckedString(text)
	weight = langruntime.CheckedI32(weight)
	distance = langruntime.CheckedI32(distance)
	left = langruntime.CheckedIndex(left)
	right = langruntime.CheckedIndex(right)
	nodes := input.Nodes
	root := len(nodes)
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, TsqueryNode{Kind: kind, Text: text, Weight: weight, Prefix: prefix, Distance: distance, Left: left, Right: right})
	return TsqueryPayload{Nodes: nodes, Root: root, NativeBytes: input.NativeBytes}
}
func AclitemUnresolved(flavor int) AclitemValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return AclitemValue{Kind: AclitemValueUnknown}
	}
	return AclitemValue{Kind: AclitemValueUnimplemented}
}
func ArrayUnresolved(flavor int) ArrayValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ArrayValue{Kind: ArrayValueUnknown}
	}
	return ArrayValue{Kind: ArrayValueUnimplemented}
}
func BitUnresolved(flavor int) BitValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return BitValue{Kind: BitValueUnknown}
	}
	return BitValue{Kind: BitValueUnimplemented}
}
func BoolUnresolved(flavor int) BoolValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueUnimplemented}
}
func BoxUnresolved(flavor int) BoxValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return BoxValue{Kind: BoxValueUnknown}
	}
	return BoxValue{Kind: BoxValueUnimplemented}
}
func ByteaUnresolved(flavor int) ByteaValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ByteaValue{Kind: ByteaValueUnknown}
	}
	return ByteaValue{Kind: ByteaValueUnimplemented}
}
func CidUnresolved(flavor int) CidValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return CidValue{Kind: CidValueUnknown}
	}
	return CidValue{Kind: CidValueUnimplemented}
}
func CircleUnresolved(flavor int) CircleValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return CircleValue{Kind: CircleValueUnknown}
	}
	return CircleValue{Kind: CircleValueUnimplemented}
}
func CompositeRowUnresolved(flavor int) CompositeValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return CompositeValue{Kind: CompositeValueUnknown}
	}
	return CompositeValue{Kind: CompositeValueUnimplemented}
}
func DateUnresolved(flavor int) DateValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return DateValue{Kind: DateValueUnknown}
	}
	return DateValue{Kind: DateValueUnimplemented}
}
func EnumUnresolved(flavor int) EnumValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return EnumValue{Kind: EnumValueUnknown}
	}
	return EnumValue{Kind: EnumValueUnimplemented}
}
func Float4Unresolved(flavor int) Float4Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Float4Value{Kind: Float4ValueUnknown}
	}
	return Float4Value{Kind: Float4ValueUnimplemented}
}
func Float8Unresolved(flavor int) Float8Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Float8Value{Kind: Float8ValueUnknown}
	}
	return Float8Value{Kind: Float8ValueUnimplemented}
}
func Int2Unresolved(flavor int) Int2Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Int2Value{Kind: Int2ValueUnknown}
	}
	return Int2Value{Kind: Int2ValueUnimplemented}
}
func Int4Unresolved(flavor int) Int4Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	return Int4Value{Kind: Int4ValueUnimplemented}
}
func Int8Unresolved(flavor int) Int8Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Int8Value{Kind: Int8ValueUnknown}
	}
	return Int8Value{Kind: Int8ValueUnimplemented}
}
func InternalCharUnresolved(flavor int) InternalCharValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return InternalCharValue{Kind: InternalCharValueUnknown}
	}
	return InternalCharValue{Kind: InternalCharValueUnimplemented}
}
func IntervalUnresolved(flavor int) IntervalValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return IntervalValue{Kind: IntervalValueUnknown}
	}
	return IntervalValue{Kind: IntervalValueUnimplemented}
}
func JsonbUnresolved(flavor int) JsonbValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return JsonbValue{Kind: JsonbValueUnknown}
	}
	return JsonbValue{Kind: JsonbValueUnimplemented}
}
func JsonpathUnresolved(flavor int) JsonpathValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return JsonpathValue{Kind: JsonpathValueUnknown}
	}
	return JsonpathValue{Kind: JsonpathValueUnimplemented}
}
func JsonUnresolved(flavor int) JsonValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return JsonValue{Kind: JsonValueUnknown}
	}
	return JsonValue{Kind: JsonValueUnimplemented}
}
func LineUnresolved(flavor int) LineValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return LineValue{Kind: LineValueUnknown}
	}
	return LineValue{Kind: LineValueUnimplemented}
}
func LsegUnresolved(flavor int) LsegValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return LsegValue{Kind: LsegValueUnknown}
	}
	return LsegValue{Kind: LsegValueUnimplemented}
}
func Macaddr8Unresolved(flavor int) Macaddr8Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Macaddr8Value{Kind: Macaddr8ValueUnknown}
	}
	return Macaddr8Value{Kind: Macaddr8ValueUnimplemented}
}
func MacaddrUnresolved(flavor int) MacaddrValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return MacaddrValue{Kind: MacaddrValueUnknown}
	}
	return MacaddrValue{Kind: MacaddrValueUnimplemented}
}
func MoneyUnresolved(flavor int) MoneyValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return MoneyValue{Kind: MoneyValueUnknown}
	}
	return MoneyValue{Kind: MoneyValueUnimplemented}
}
func MultirangeUnresolved(flavor int) MultirangeValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return MultirangeValue{Kind: MultirangeValueUnknown}
	}
	return MultirangeValue{Kind: MultirangeValueUnimplemented}
}
func NetworkUnresolved(flavor int) NetworkValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return NetworkValue{Kind: NetworkValueUnknown}
	}
	return NetworkValue{Kind: NetworkValueUnimplemented}
}
func NumericUnresolved(flavor int) NumericValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return NumericValue{Kind: NumericValueUnknown}
	}
	return NumericValue{Kind: NumericValueUnimplemented}
}
func OidUnresolved(flavor int) OidValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return OidValue{Kind: OidValueUnknown}
	}
	return OidValue{Kind: OidValueUnimplemented}
}
func PathUnresolved(flavor int) PathValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return PathValue{Kind: PathValueUnknown}
	}
	return PathValue{Kind: PathValueUnimplemented}
}
func PgLsnUnresolved(flavor int) PgLsnValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return PgLsnValue{Kind: PgLsnValueUnknown}
	}
	return PgLsnValue{Kind: PgLsnValueUnimplemented}
}
func PointUnresolved(flavor int) PointValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return PointValue{Kind: PointValueUnknown}
	}
	return PointValue{Kind: PointValueUnimplemented}
}
func PolygonUnresolved(flavor int) PolygonValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return PolygonValue{Kind: PolygonValueUnknown}
	}
	return PolygonValue{Kind: PolygonValueUnimplemented}
}
func RangeUnresolved(flavor int) RangeValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return RangeValue{Kind: RangeValueUnknown}
	}
	return RangeValue{Kind: RangeValueUnimplemented}
}
func SnapshotUnresolved(flavor int) SnapshotValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return SnapshotValue{Kind: SnapshotValueUnknown}
	}
	return SnapshotValue{Kind: SnapshotValueUnimplemented}
}
func TextUnresolved(flavor int) TextValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TextValue{Kind: TextValueUnknown}
	}
	return TextValue{Kind: TextValueUnimplemented}
}
func TidUnresolved(flavor int) TidValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TidValue{Kind: TidValueUnknown}
	}
	return TidValue{Kind: TidValueUnimplemented}
}
func TimestamptzUnresolved(flavor int) TimestamptzValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TimestamptzValue{Kind: TimestamptzValueUnknown}
	}
	return TimestamptzValue{Kind: TimestamptzValueUnimplemented}
}
func TimestampUnresolved(flavor int) TimestampValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TimestampValue{Kind: TimestampValueUnknown}
	}
	return TimestampValue{Kind: TimestampValueUnimplemented}
}
func TimetzUnresolved(flavor int) TimetzValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TimetzValue{Kind: TimetzValueUnknown}
	}
	return TimetzValue{Kind: TimetzValueUnimplemented}
}
func TimeUnresolved(flavor int) TimeValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TimeValue{Kind: TimeValueUnknown}
	}
	return TimeValue{Kind: TimeValueUnimplemented}
}
func TsqueryUnresolved(flavor int) TsqueryValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TsqueryValue{Kind: TsqueryValueUnknown}
	}
	return TsqueryValue{Kind: TsqueryValueUnimplemented}
}
func TsvectorUnresolved(flavor int) TsvectorValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TsvectorValue{Kind: TsvectorValueUnknown}
	}
	return TsvectorValue{Kind: TsvectorValueUnimplemented}
}
func UuidUnresolved(flavor int) UuidValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return UuidValue{Kind: UuidValueUnknown}
	}
	return UuidValue{Kind: UuidValueUnimplemented}
}
func Xid8Unresolved(flavor int) Xid8Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Xid8Value{Kind: Xid8ValueUnknown}
	}
	return Xid8Value{Kind: Xid8ValueUnimplemented}
}
func XidUnresolved(flavor int) XidValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return XidValue{Kind: XidValueUnknown}
	}
	return XidValue{Kind: XidValueUnimplemented}
}
func XmlUnresolved(flavor int) XmlValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return XmlValue{Kind: XmlValueUnknown}
	}
	return XmlValue{Kind: XmlValueUnimplemented}
}
func ArrayArgumentsUnresolved(flavor int) ArrayArguments {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ArrayArguments{Kind: ArrayArgumentsUnknown}
	}
	return ArrayArguments{Kind: ArrayArgumentsUnimplemented}
}
func ArrayChildrenArgumentsUnresolved(flavor int) ArrayChildrenArguments {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsUnknown}
	}
	return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsUnimplemented}
}
func ArrayElementUnresolved(flavor int) ArrayElement {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ArrayElement{Kind: ArrayElementUnknown}
	}
	return ArrayElement{Kind: ArrayElementUnimplemented}
}
func ArrayTextEventUnresolved(flavor int) ArrayTextEvent {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ArrayTextEvent{Kind: ArrayTextEventUnknown}
	}
	return ArrayTextEvent{Kind: ArrayTextEventUnimplemented}
}
func ArrayTextPlanUnresolved(flavor int) ArrayTextPlan {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return ArrayTextPlan{Kind: ArrayTextPlanUnknown}
	}
	return ArrayTextPlan{Kind: ArrayTextPlanUnimplemented}
}
func CompositeTextPlanUnresolved(flavor int) CompositeTextPlan {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return CompositeTextPlan{Kind: CompositeTextPlanUnknown}
	}
	return CompositeTextPlan{Kind: CompositeTextPlanUnimplemented}
}
func JsonbArgumentsUnresolved(flavor int) JsonbArguments {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return JsonbArguments{Kind: JsonbArgumentsUnknown}
	}
	return JsonbArguments{Kind: JsonbArgumentsUnimplemented}
}
func JsonbInputUnresolved(flavor int) JsonbInput {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return JsonbInput{Kind: JsonbInputUnknown}
	}
	return JsonbInput{Kind: JsonbInputUnimplemented}
}
func RangeTextPlanUnresolved(flavor int) RangeTextPlan {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return RangeTextPlan{Kind: RangeTextPlanUnknown}
	}
	return RangeTextPlan{Kind: RangeTextPlanUnimplemented}
}
func CheckUnresolved(flavor int) CheckOutcome {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return CheckOutcome{Kind: CheckOutcomeUnknown}
	}
	return CheckOutcome{Kind: CheckOutcomeUnimplemented}
}
func ResolutionContext(flavor int) int {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 2 {
		return 2
	}
	return 1
}

type NumericLayout struct {
	Valid   bool
	Special int
	Sign    int
	Weight  int
	First   int
	End     int
}

func CopyNumericLayout(value NumericLayout) NumericLayout {
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
func NetworkCidrHostBitsZero(address NetworkAddress) bool {
	remaining := address.Prefix
	wordIndex := 0
	wordCount := 8
	if address.Family == 4 {
		wordCount = langruntime.CheckedIndex(2)
	} else if address.Family != 6 {
		return false
	}
	if remaining < 0 || remaining > langruntime.CheckedSignedMultiply((int(int32(wordCount))), 16) {
		return false
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
			return false
		}
		wordIndex = langruntime.CheckedAdd(wordIndex, 1)
	}
	return true
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
	if cidr && NetworkCidrHostBitsZero(address) == false {
		return NetworkValue{Kind: NetworkValueError, Error: MakeSqlError(sqlErrorInvalidTextRepresentation)}
	}
	return NetworkValue{Kind: NetworkValueValue, Value: address}
}
func NetworkFromText(input TextValue) NetworkValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	conditionFlavor4234 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor4234 < 1 {
			conditionFlavor4234 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor4234 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return NetworkUnresolved(conditionFlavor4234)
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return NetworkValue{Kind: NetworkValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return networkParse(value, false)
	}
	return NetworkUnresolved(unresolvedFlavor)
}
func CidrFromText(input TextValue) NetworkValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return NetworkValue{Kind: NetworkValueError, Error: error}
	}
	conditionFlavor4424 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor4424 < 1 {
			conditionFlavor4424 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor4424 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return NetworkUnresolved(conditionFlavor4424)
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return NetworkValue{Kind: NetworkValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return networkParse(value, true)
	}
	return NetworkUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return MacaddrValue{Kind: MacaddrValueError, Error: error}
	}
	conditionFlavor2884 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor2884 < 1 {
			conditionFlavor2884 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor2884 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return MacaddrUnresolved(conditionFlavor2884)
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return MacaddrValue{Kind: MacaddrValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		if len(chars) > 256 {
			return MacaddrUnresolved(unresolvedFlavor)
		}
		text := macText{chars: chars}
		parsed := macaddrParse(&text)
		if parsed.valid == false {
			return MacaddrValue{Kind: MacaddrValueError, Error: MakeSqlError(parsed.state)}
		}
		return MacaddrValue{Kind: MacaddrValueValue, Value: parsed.address}
	}
	return MacaddrUnresolved(unresolvedFlavor)
}
func Macaddr8FromText(input TextValue) Macaddr8Value {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return Macaddr8Value{Kind: Macaddr8ValueError, Error: error}
	}
	conditionFlavor3164 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor3164 < 1 {
			conditionFlavor3164 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor3164 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return Macaddr8Unresolved(conditionFlavor3164)
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return Macaddr8Value{Kind: Macaddr8ValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		if len(chars) > 256 {
			return Macaddr8Unresolved(unresolvedFlavor)
		}
		text := macText{chars: chars}
		parsed := macaddr8Parse(&text)
		if parsed.valid == false {
			return Macaddr8Value{Kind: Macaddr8ValueError, Error: MakeSqlError(parsed.state)}
		}
		return Macaddr8Value{Kind: Macaddr8ValueValue, Value: parsed.address}
	}
	return Macaddr8Unresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return UuidValue{Kind: UuidValueError, Error: error}
	}
	conditionFlavor854 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor854 < 1 {
			conditionFlavor854 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor854 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return UuidUnresolved(conditionFlavor854)
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return UuidValue{Kind: UuidValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return uuidParse(value)
	}
	return UuidUnresolved(unresolvedFlavor)
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

func CopyJsonSyntaxLayout(value JsonSyntaxLayout) JsonSyntaxLayout {
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
func jsonReadDecodeStringContext(source *jsonSyntaxSource, token jsonReadToken, utf8 bool) TextValue {
	token = copyjsonReadToken(token)
	unresolvedFlavor := 0
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
						return TextUnresolved(ResolutionContext(unresolvedFlavor))
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
func jsonReadSelect(value string, key string, index int, object bool, asText bool, utf8 bool) TextValue {
	value = langruntime.CheckedString(value)
	key = langruntime.CheckedString(key)
	index = langruntime.CheckedI32(index)
	unresolvedFlavor := 0
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
			decoded = jsonReadDecodeStringContext(&source, token, utf8)
			if decoded.Kind == TextValueError {
				error := decoded.Error
				return TextValue{Kind: TextValueError, Error: error}
			}
			conditionFlavor23812 := unresolvedFlavor
			if decoded.Kind == TextValueUnknown {
				if conditionFlavor23812 < 1 {
					conditionFlavor23812 = langruntime.CheckedI32(1)
				}
			}
			if decoded.Kind == TextValueUnimplemented {
				conditionFlavor23812 = langruntime.CheckedI32(2)
			}
			if (decoded == (TextValue{Kind: TextValueUnknown}) || decoded == (TextValue{Kind: TextValueUnimplemented})) || decoded == (TextValue{Kind: TextValueNonNull}) {
				return TextUnresolved(conditionFlavor23812)
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
	return JsonReadFieldContext(input, key, asText, false)
}
func JsonReadFieldContext(input JsonValue, key TextValue, asText bool, utf8 bool) TextValue {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if key.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if key.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if key.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if key.Kind == TextValueError {
		error := key.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	conditionFlavor3144 := unresolvedFlavor
	if input.Kind == JsonValueUnknown {
		if conditionFlavor3144 < 1 {
			conditionFlavor3144 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnknown {
		return TextUnresolved(conditionFlavor3144)
	}
	conditionFlavor3167 := unresolvedFlavor
	if input.Kind == JsonValueUnimplemented {
		conditionFlavor3167 = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueUnimplemented {
		return TextUnresolved(conditionFlavor3167)
	}
	conditionFlavor3194 := unresolvedFlavor
	if key.Kind == TextValueUnknown {
		if conditionFlavor3194 < 1 {
			conditionFlavor3194 = langruntime.CheckedI32(1)
		}
	}
	if key.Kind == TextValueUnimplemented {
		conditionFlavor3194 = langruntime.CheckedI32(2)
	}
	if (key == (TextValue{Kind: TextValueUnknown}) || key == (TextValue{Kind: TextValueUnimplemented})) || key == (TextValue{Kind: TextValueNonNull}) {
		return TextUnresolved(conditionFlavor3194)
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
			return jsonReadSelect(value.Source, name, 0, true, asText, utf8)
		}
	}
	return TextUnresolved(unresolvedFlavor)
}
func JsonReadElement(input JsonValue, index Int4Value, asText bool) TextValue {
	return JsonReadElementContext(input, index, asText, false)
}
func JsonReadElementContext(input JsonValue, index Int4Value, asText bool, utf8 bool) TextValue {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if index.Kind == Int4ValueError {
		error := index.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	conditionFlavor3524 := unresolvedFlavor
	if input.Kind == JsonValueUnknown {
		if conditionFlavor3524 < 1 {
			conditionFlavor3524 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnknown {
		return TextUnresolved(conditionFlavor3524)
	}
	conditionFlavor3547 := unresolvedFlavor
	if input.Kind == JsonValueUnimplemented {
		conditionFlavor3547 = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueUnimplemented {
		return TextUnresolved(conditionFlavor3547)
	}
	conditionFlavor3574 := unresolvedFlavor
	if index.Kind == Int4ValueUnknown {
		if conditionFlavor3574 < 1 {
			conditionFlavor3574 = langruntime.CheckedI32(1)
		}
	}
	if index.Kind == Int4ValueUnimplemented {
		conditionFlavor3574 = langruntime.CheckedI32(2)
	}
	if index == (Int4Value{Kind: Int4ValueUnknown}) || index == (Int4Value{Kind: Int4ValueUnimplemented}) {
		return TextUnresolved(conditionFlavor3574)
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
			return jsonReadSelect(value.Source, "", number, false, asText, utf8)
		}
	}
	return TextUnresolved(unresolvedFlavor)
}
func JsonReadLength(input JsonValue) Int4Value {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int4Unresolved(unresolvedFlavor)
}
func JsonReadInputScalar(input JsonValue, quoted bool, utf8 bool) TextValue {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if input.Kind == JsonValueNull {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		if value.Kind == 0 {
			return TextValue{Kind: TextValueNull}
		}
		if value.Kind == 4 {
			source := jsonSyntaxSource{characters: []rune(value.Source)}
			token := jsonReadNextToken(&source, 0)
			decoded := jsonReadDecodeStringContext(&source, token, utf8)
			if quoted {
				if decoded.Kind == TextValueValue {
					text := langruntime.CheckedString(decoded.Value)
					result := JsonQuoteString(text)
					return TextValue{Kind: TextValueValue, Value: result}
				}
			}
			return decoded
		}
		return TextValue{Kind: TextValueValue, Value: value.Source}
	}
	return TextUnresolved(unresolvedFlavor)
}
func JsonReadObjectReady(input JsonValue, utf8 bool) CheckOutcome {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueValue {
		value := input.Value
		kind := value.Kind
		source := JsonValue{Kind: JsonValueValue, Value: value}
		checked := TextValue{Kind: TextValueNull}
		if kind == 4 {
			checked = JsonReadInputScalar(source, false, utf8)
		} else if kind == 6 {
			key := MakeTextValue("")
			checked = JsonReadFieldContext(source, key, false, utf8)
		}
		if checked.Kind == TextValueError {
			error := checked.Error
			return CheckOutcome{Kind: CheckOutcomeError, Error: error}
		}
		conditionFlavor4458 := unresolvedFlavor
		if checked.Kind == TextValueUnknown {
			if conditionFlavor4458 < 1 {
				conditionFlavor4458 = langruntime.CheckedI32(1)
			}
		}
		if checked.Kind == TextValueUnimplemented {
			conditionFlavor4458 = langruntime.CheckedI32(2)
		}
		if (checked == (TextValue{Kind: TextValueUnknown}) || checked == (TextValue{Kind: TextValueUnimplemented})) || checked == (TextValue{Kind: TextValueNonNull}) {
			return CheckUnresolved(conditionFlavor4458)
		}
		if kind == 6 {
			return CheckOutcome{Kind: CheckOutcomeTrue}
		}
		return CheckOutcome{Kind: CheckOutcomeError, Error: MakeSqlError(jsonReadNonArray)}
	}
	if input.Kind == JsonValueError {
		error := input.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	return CheckUnresolved(unresolvedFlavor)
}
func JsonKindText(kind int) TextValue {
	kind = langruntime.CheckedI32(kind)
	unresolvedFlavor := 0
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
	return TextUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
			return Int4Unresolved(unresolvedFlavor)
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
	return Int4Unresolved(unresolvedFlavor)
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
			if (decoded == (TextValue{Kind: TextValueUnknown}) || decoded == (TextValue{Kind: TextValueUnimplemented})) || decoded == (TextValue{Kind: TextValueNonNull}) {
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
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if path.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if path.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	conditionFlavor4284 := unresolvedFlavor
	if pathState.Kind == Int4ValueUnknown {
		if conditionFlavor4284 < 1 {
			conditionFlavor4284 = langruntime.CheckedI32(1)
		}
	}
	if pathState.Kind == Int4ValueUnimplemented {
		conditionFlavor4284 = langruntime.CheckedI32(2)
	}
	if pathState == (Int4Value{Kind: Int4ValueUnknown}) || pathState == (Int4Value{Kind: Int4ValueUnimplemented}) {
		return TextUnresolved(conditionFlavor4284)
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
				if key.Kind == ArrayElementUnimplemented {
					uncertain = true
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			document := parseJsonArrayPathDocument(value.Source, utf8)
			if document.state == langruntime.CheckedSignedNegate(2) {
				if uncertain {
					return TextUnresolved(ResolutionContext(unresolvedFlavor))
				}
				return TextValue{Kind: TextValueError, Error: document.error}
			}
			if (document.state != 1 || document.root == 0) && utf8 == false {
				return TextUnresolved(ResolutionContext(unresolvedFlavor))
			}
			if document.state != 1 || document.root == 0 {
				return TextUnresolved(unresolvedFlavor)
			}
			initial := []int{}
			langruntime.CheckedAdd(len(initial), 1)
			initial = append(initial, langruntime.CheckedIndex(document.root))
			candidates := jsonArrayPathCandidates{nodes: initial, state: 1}
			index = langruntime.CheckedIndex(0)
			for index < len(keys.Elements) {
				key := ArrayElementToText(CopyArrayElement(keys.Elements[index]))
				keyFlavor := unresolvedFlavor
				if key == (TextValue{Kind: TextValueUnknown}) || key == (TextValue{Kind: TextValueNonNull}) {
					if keyFlavor < 1 {
						keyFlavor = langruntime.CheckedI32(1)
					}
				}
				if key == (TextValue{Kind: TextValueUnimplemented}) {
					keyFlavor = langruntime.CheckedI32(2)
				}
				candidates = copyjsonArrayPathCandidates(jsonArrayPathNext(&document, candidates, key))
				if candidates.state != 1 {
					return TextUnresolved(keyFlavor)
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
	return TextUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if arrays.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if arrays.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
			if document.state != 1 && utf8 == false {
				return JsonUnresolved(ResolutionContext(unresolvedFlavor))
			}
			if document.state != 1 {
				return JsonUnresolved(unresolvedFlavor)
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
							return JsonUnresolved(unresolvedFlavor)
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
	return JsonUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	following := jsonReadNextToken(source, token.end)
	if following.start < len(source.characters) && source.characters[following.start] == '"' {
		decoded := jsonReadDecodeStringContext(source, following, utf8)
		if decoded.Kind == TextValueError {
			error := decoded.Error
			return BoolValue{Kind: BoolValueError, Error: error}
		}
		conditionFlavor498 := unresolvedFlavor
		if decoded.Kind == TextValueUnknown {
			if conditionFlavor498 < 1 {
				conditionFlavor498 = langruntime.CheckedI32(1)
			}
		}
		if decoded.Kind == TextValueUnimplemented {
			conditionFlavor498 = langruntime.CheckedI32(2)
		}
		if (decoded == (TextValue{Kind: TextValueUnknown}) || decoded == (TextValue{Kind: TextValueUnimplemented})) || decoded == (TextValue{Kind: TextValueNonNull}) {
			return BoolUnresolved(conditionFlavor498)
		}
	}
	if following.syntax == jsonSyntaxInvalid {
		return BoolValue{Kind: BoolValueError, Error: MakeSqlError(jsonReadInvalidText)}
	}
	return BoolValue{Kind: BoolValueValue, Value: true}
}
func jsonbNumberText(source *jsonSyntaxSource, token jsonReadToken, utf8 bool) TextValue {
	token = copyjsonReadToken(token)
	unresolvedFlavor := 0
	ready := jsonbScalarReady(source, token, utf8)
	if ready.Kind == BoolValueError {
		error := ready.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	conditionFlavor654 := unresolvedFlavor
	if ready.Kind == BoolValueUnknown {
		if conditionFlavor654 < 1 {
			conditionFlavor654 = langruntime.CheckedI32(1)
		}
	}
	if ready.Kind == BoolValueUnimplemented {
		conditionFlavor654 = langruntime.CheckedI32(2)
	}
	if ready == (BoolValue{Kind: BoolValueUnknown}) || ready == (BoolValue{Kind: BoolValueUnimplemented}) {
		return TextUnresolved(conditionFlavor654)
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
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
				conditionFlavor31716 := unresolvedFlavor
				if decoded.Kind == TextValueUnknown {
					if conditionFlavor31716 < 1 {
						conditionFlavor31716 = langruntime.CheckedI32(1)
					}
				}
				if decoded.Kind == TextValueUnimplemented {
					conditionFlavor31716 = langruntime.CheckedI32(2)
				}
				if (decoded == (TextValue{Kind: TextValueUnknown}) || decoded == (TextValue{Kind: TextValueUnimplemented})) || decoded == (TextValue{Kind: TextValueNonNull}) {
					return JsonbUnresolved(conditionFlavor31716)
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
				conditionFlavor34116 := unresolvedFlavor
				if decision.Kind == BoolValueUnknown {
					if conditionFlavor34116 < 1 {
						conditionFlavor34116 = langruntime.CheckedI32(1)
					}
				}
				if decision.Kind == BoolValueUnimplemented {
					conditionFlavor34116 = langruntime.CheckedI32(2)
				}
				if decision == (BoolValue{Kind: BoolValueUnknown}) || decision == (BoolValue{Kind: BoolValueUnimplemented}) {
					return JsonbUnresolved(conditionFlavor34116)
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
					conditionFlavor36120 := unresolvedFlavor
					if decision.Kind == BoolValueUnknown {
						if conditionFlavor36120 < 1 {
							conditionFlavor36120 = langruntime.CheckedI32(1)
						}
					}
					if decision.Kind == BoolValueUnimplemented {
						conditionFlavor36120 = langruntime.CheckedI32(2)
					}
					if decision == (BoolValue{Kind: BoolValueUnknown}) || decision == (BoolValue{Kind: BoolValueUnimplemented}) {
						return JsonbUnresolved(conditionFlavor36120)
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
						conditionFlavor39324 := unresolvedFlavor
						if decoded.Kind == TextValueUnknown {
							if conditionFlavor39324 < 1 {
								conditionFlavor39324 = langruntime.CheckedI32(1)
							}
						}
						if decoded.Kind == TextValueUnimplemented {
							conditionFlavor39324 = langruntime.CheckedI32(2)
						}
						if (decoded == (TextValue{Kind: TextValueUnknown}) || decoded == (TextValue{Kind: TextValueUnimplemented})) || decoded == (TextValue{Kind: TextValueNonNull}) {
							return JsonbUnresolved(conditionFlavor39324)
						}
					}
					if admission && token.kind == jsonReadQuote {
						ready := jsonbScalarReady(&source, token, utf8)
						if ready.Kind == BoolValueError {
							error := ready.Error
							return JsonbValue{Kind: JsonbValueError, Error: error}
						}
						conditionFlavor40224 := unresolvedFlavor
						if ready.Kind == BoolValueUnknown {
							if conditionFlavor40224 < 1 {
								conditionFlavor40224 = langruntime.CheckedI32(1)
							}
						}
						if ready.Kind == BoolValueUnimplemented {
							conditionFlavor40224 = langruntime.CheckedI32(2)
						}
						if ready == (BoolValue{Kind: BoolValueUnknown}) || ready == (BoolValue{Kind: BoolValueUnimplemented}) {
							return JsonbUnresolved(conditionFlavor40224)
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
							conditionFlavor42328 := unresolvedFlavor
							if decision.Kind == BoolValueUnknown {
								if conditionFlavor42328 < 1 {
									conditionFlavor42328 = langruntime.CheckedI32(1)
								}
							}
							if decision.Kind == BoolValueUnimplemented {
								conditionFlavor42328 = langruntime.CheckedI32(2)
							}
							if decision == (BoolValue{Kind: BoolValueUnknown}) || decision == (BoolValue{Kind: BoolValueUnimplemented}) {
								return JsonbUnresolved(conditionFlavor42328)
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
	return JsonbUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == JsonbValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonbValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueNonNull {
		maximum := CopyJsonbKnowledge(input.NonNull)
		_ = maximum
		if pretty {
			return TextUnresolved(unresolvedFlavor)
		}
		return TextValue{Kind: TextValueNonNull}
	}
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
							return TextUnresolved(ResolutionContext(unresolvedFlavor))
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
	return TextUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == JsonbValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonbValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueValue {
		value := CopyJsonbPayload(input.Value)
		normalized := jsonbNormalizeObjects(jsonbPreorder(value))
		if admission {
			admitted := JsonbStorageAdmission(&normalized)
			if admitted.Kind == BoolValueError {
				error := admitted.Error
				return JsonbValue{Kind: JsonbValueError, Error: error}
			}
			conditionFlavor9012 := unresolvedFlavor
			if admitted.Kind == BoolValueUnknown {
				if conditionFlavor9012 < 1 {
					conditionFlavor9012 = langruntime.CheckedI32(1)
				}
			}
			if admitted.Kind == BoolValueUnimplemented {
				conditionFlavor9012 = langruntime.CheckedI32(2)
			}
			if admitted == (BoolValue{Kind: BoolValueUnknown}) || admitted == (BoolValue{Kind: BoolValueUnimplemented}) {
				return JsonbUnresolved(conditionFlavor9012)
			}
		}
		return JsonbValue{Kind: JsonbValueValue, Value: normalized}
	}
	return input
}
func JsonbNormalizeShape(input JsonbPayload) JsonbPayload {
	input = CopyJsonbPayload(input)
	return jsonbNormalizeObjects(jsonbPreorder(input))
}
func JsonbShapeValue(maximum int64, shape JsonbPayload) JsonbValue {
	shape = CopyJsonbPayload(shape)
	normalized := JsonbNormalizeShape(shape)
	if JsonbShapeExact(&normalized, normalized.Root) {
		return JsonbRebuild(JsonbValue{Kind: JsonbValueValue, Value: normalized}, true)
	}
	return JsonbPartialTree(maximum, normalized)
}
func JsonbFromString(input TextValue) JsonbValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
				return JsonbUnresolved(unresolvedFlavor)
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
	return JsonbUnresolved(unresolvedFlavor)
}
func JsonbDetachSubtree(input JsonbPayload) JsonbPayload {
	input = CopyJsonbPayload(input)
	compact := jsonbPreorder(input)
	characters := []rune{}
	nodes := []JsonbNode{}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, compact.Nodes[0])
	position := 1
	for position < len(compact.Nodes) {
		node := compact.Nodes[position]
		keyStart := len(characters)
		offset := node.KeyStart
		for offset < node.KeyEnd {
			langruntime.CheckedAdd(len(characters), 1)
			characters = append(characters, langruntime.CheckedChar(compact.Characters[offset]))
			offset = langruntime.CheckedAdd(offset, 1)
		}
		keyEnd := len(characters)
		textStart := len(characters)
		offset = langruntime.CheckedIndex(node.TextStart)
		for offset < node.TextEnd {
			langruntime.CheckedAdd(len(characters), 1)
			characters = append(characters, langruntime.CheckedChar(compact.Characters[offset]))
			offset = langruntime.CheckedAdd(offset, 1)
		}
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, JsonbNode{Kind: node.Kind, Child: node.Child, Next: node.Next, KeyStart: keyStart, KeyEnd: keyEnd, TextStart: textStart, TextEnd: len(characters)})
		position = langruntime.CheckedAdd(position, 1)
	}
	return JsonbPayload{Characters: characters, Nodes: nodes, Root: compact.Root}
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
	return JsonbArrayInputPayload{State: langruntime.CheckedI32(value.State), Error: value.Error, Dimensions: langruntime.CheckedStructs(value.Dimensions, CopyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement), Values: langruntime.CheckedStructs(value.Values, CopyJsonbInput), Position: langruntime.CheckedIndex(value.Position)}
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
	unresolvedFlavor := 0
	if input.Position < len(input.Elements) {
		return CopyArrayElement(input.Elements[input.Position])
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func AppendJsonbArrayInput(input JsonbArrayInputPayload, value JsonbInput) JsonbArrayInputPayload {
	values := input.Values
	langruntime.CheckedAdd(len(values), 1)
	values = append(values, CopyJsonbInput(value))
	return JsonbArrayInputPayload{State: input.State, Error: input.Error, Dimensions: input.Dimensions, Elements: input.Elements, Values: values, Position: langruntime.CheckedAdd(input.Position, 1)}
}
func JsonbArrayInputArguments(input JsonbArrayInputPayload) JsonbArguments {
	unresolvedFlavor := 0
	if input.State == langruntime.CheckedSignedNegate(3) {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.State == langruntime.CheckedSignedNegate(2) {
		return JsonbArguments{Kind: JsonbArgumentsError, Error: input.Error}
	}
	if input.State == 0 {
		return JsonbArguments{Kind: JsonbArgumentsNull}
	}
	if input.State != 1 || len(input.Values) != len(input.Elements) {
		return JsonbArgumentsUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if size.low > jsonbStorageLimit {
		return BoolValue{Kind: BoolValueError, Error: MakeSqlError(jsonbStorageError)}
	}
	if size.high > jsonbStorageLimit {
		return BoolUnresolved(ResolutionContext(unresolvedFlavor))
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
						if decision == (BoolValue{Kind: BoolValueUnknown}) || decision == (BoolValue{Kind: BoolValueUnimplemented}) {
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
				if decision == (BoolValue{Kind: BoolValueUnknown}) || decision == (BoolValue{Kind: BoolValueUnimplemented}) {
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
func JsonbPartialAdd(current int64, extra int64) int64 {
	if current < int64(0) || extra < int64(0) || current > jsonbStorageLimit || extra > jsonbStorageLimit {
		return langruntime.CheckedI64Add(jsonbStorageLimit, int64(1))
	}
	total := langruntime.CheckedI64Add(current, extra)
	if total > jsonbStorageLimit {
		return langruntime.CheckedI64Add(jsonbStorageLimit, int64(1))
	}
	return total
}
func JsonbPartialScalarBound() int64 {
	return langruntime.CheckedI64Add(langruntime.CheckedI64Add(int64(131072), int64(16383)), int64(16))
}
func JsonbPartialValue(maximum int64) JsonbValue {
	return JsonbPartialShape(maximum, langruntime.CheckedSignedNegate(1), langruntime.CheckedSignedNegate(1))
}
func JsonbPartialShape(maximum int64, kind int, length int) JsonbValue {
	kind = langruntime.CheckedI32(kind)
	length = langruntime.CheckedI32(length)
	unresolvedFlavor := 1
	if maximum < int64(0) || maximum > jsonbStorageLimit {
		return JsonbUnresolved(unresolvedFlavor)
	}
	return JsonbValue{Kind: JsonbValueNonNull, NonNull: JsonbKnowledge{Maximum: maximum, Kind: kind, Length: length, Shape: JsonbEmptyShape()}}
}
func JsonbEmptyShape() JsonbPayload {
	characters := []rune{}
	nodes := []JsonbNode{}
	return JsonbPayload{Characters: characters, Nodes: nodes, Root: 0}
}
func JsonbPartialTree(maximum int64, shape JsonbPayload) JsonbValue {
	shape = CopyJsonbPayload(shape)
	unresolvedFlavor := 1
	if maximum < int64(0) || maximum > jsonbStorageLimit {
		return JsonbUnresolved(unresolvedFlavor)
	}
	root := shape.Nodes[shape.Root]
	length := langruntime.CheckedSignedNegate(1)
	if root.Kind >= 5 {
		length = langruntime.CheckedI32(0)
		member := root.Child
		for member > 0 {
			length = langruntime.CheckedI32(langruntime.CheckedSignedAdd(length, 1))
			member = langruntime.CheckedIndex(shape.Nodes[member].Next)
		}
	}
	kind := root.Kind
	if kind == 7 {
		kind = langruntime.CheckedI32(JsonbHoleKind(&shape, shape.Root))
	}
	return JsonbValue{Kind: JsonbValueNonNull, NonNull: JsonbKnowledge{Maximum: maximum, Kind: kind, Length: length, Shape: shape}}
}
func JsonbHoleKind(shape *JsonbPayload, index int) int {
	shape = langruntime.CheckedBorrowed(shape, CopyJsonbPayload)
	index = langruntime.CheckedIndex(index)
	node := shape.Nodes[index]
	if node.Kind != 7 {
		return node.Kind
	}
	found := langruntime.CheckedSignedNegate(1)
	kind := 0
	for kind < 7 {
		if JsonbHoleAllows(shape, index, kind) {
			if found >= 0 {
				return langruntime.CheckedSignedNegate(1)
			}
			found = langruntime.CheckedI32(kind)
		}
		kind = langruntime.CheckedI32(langruntime.CheckedSignedAdd(kind, 1))
	}
	return found
}
func JsonbHoleAllows(shape *JsonbPayload, index int, kind int) bool {
	shape = langruntime.CheckedBorrowed(shape, CopyJsonbPayload)
	index = langruntime.CheckedIndex(index)
	kind = langruntime.CheckedI32(kind)
	node := shape.Nodes[index]
	if node.Kind != 7 {
		return node.Kind == kind
	}
	position := node.TextStart
	current := 0
	for position < node.TextEnd {
		if current == kind {
			return shape.Characters[position] == '1'
		}
		current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
		position = langruntime.CheckedAdd(position, 1)
	}
	return false
}
func JsonbKindFlags(kind int) string {
	kind = langruntime.CheckedI32(kind)
	flags := langruntime.NewTextBuffer("")
	current := 0
	for current < 7 {
		if kind < 0 || current == kind {
			flags = append(flags, string(langruntime.CheckedChar('1'))...)
		} else {
			flags = append(flags, string(langruntime.CheckedChar('0'))...)
		}
		current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
	}
	return string(flags)
}
func JsonbHolePayload(flags string) JsonbPayload {
	flags = langruntime.CheckedString(flags)
	characters := []rune(flags)
	nodes := []JsonbNode{}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, JsonbNode{Kind: langruntime.CheckedSignedNegate(1), Child: 0, Next: 0, KeyStart: 0, KeyEnd: 0, TextStart: 0, TextEnd: 0})
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, JsonbNode{Kind: 7, Child: 0, Next: 0, KeyStart: 0, KeyEnd: 0, TextStart: 0, TextEnd: len(characters)})
	return JsonbPayload{Characters: characters, Nodes: nodes, Root: 1}
}
func JsonbRootAllows(facts *JsonbKnowledge, kind int) bool {
	facts = langruntime.CheckedBorrowed(facts, CopyJsonbKnowledge)
	kind = langruntime.CheckedI32(kind)
	if len(facts.Shape.Nodes) < 2 {
		return true
	}
	node := facts.Shape.Nodes[facts.Shape.Root]
	if node.Kind != 7 {
		return node.Kind == kind
	}
	position := node.TextStart
	current := 0
	for position < node.TextEnd {
		if current == kind {
			return facts.Shape.Characters[position] == '1'
		}
		current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
		position = langruntime.CheckedAdd(position, 1)
	}
	return false
}
func JsonbShapeExact(shape *JsonbPayload, index int) bool {
	shape = langruntime.CheckedBorrowed(shape, CopyJsonbPayload)
	index = langruntime.CheckedIndex(index)
	pending := []int{}
	langruntime.CheckedAdd(len(pending), 1)
	pending = append(pending, langruntime.CheckedIndex(index))
	depth := 1
	for depth > 0 {
		depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
		node := shape.Nodes[pending[depth]]
		if node.Kind == 7 {
			return false
		}
		child := node.Child
		for child > 0 {
			if depth == len(pending) {
				langruntime.CheckedAdd(len(pending), 1)
				pending = append(pending, langruntime.CheckedIndex(child))
			} else {
				pending[depth] = langruntime.CheckedIndex(child)
			}
			depth = langruntime.CheckedAdd(depth, 1)
			child = langruntime.CheckedIndex(shape.Nodes[child].Next)
		}
	}
	return true
}
func JsonbHasShape(facts *JsonbKnowledge) bool {
	facts = langruntime.CheckedBorrowed(facts, CopyJsonbKnowledge)
	return len(facts.Shape.Nodes) > 1
}
func JsonbPartialBound(value *JsonbPayload) int64 {
	value = langruntime.CheckedBorrowed(value, CopyJsonbPayload)
	maximum := int64(16)
	index := 0
	for index < len(value.Characters) {
		maximum = JsonbPartialAdd(maximum, int64(6))
		index = langruntime.CheckedAdd(index, 1)
	}
	index = langruntime.CheckedIndex(0)
	for index < len(value.Nodes) {
		maximum = JsonbPartialAdd(maximum, int64(16))
		index = langruntime.CheckedAdd(index, 1)
	}
	storage := jsonbStorageLayout(value)
	if storage.high > maximum {
		maximum = storage.high
	}
	return JsonbPartialAdd(int64(0), maximum)
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

func CopyJsonpathNode(value JsonpathNode) JsonpathNode {
	return JsonpathNode{Kind: langruntime.CheckedI32(value.Kind), Next: langruntime.CheckedIndex(value.Next), Left: langruntime.CheckedIndex(value.Left), Right: langruntime.CheckedIndex(value.Right), TextStart: langruntime.CheckedIndex(value.TextStart), TextEnd: langruntime.CheckedIndex(value.TextEnd), First: langruntime.CheckedI32(value.First), Last: langruntime.CheckedI32(value.Last), Flags: langruntime.CheckedI32(value.Flags)}
}

type JsonpathPayload struct {
	Characters []rune
	Nodes      []JsonpathNode
	Root       int
	Lax        bool
}

func CopyJsonpathPayload(value JsonpathPayload) JsonpathPayload {
	return JsonpathPayload{Characters: langruntime.CheckedChars(value.Characters), Nodes: langruntime.CheckedStructs(value.Nodes, CopyJsonpathNode), Root: langruntime.CheckedIndex(value.Root), Lax: value.Lax}
}

type JsonpathValueKind uint8

const (
	JsonpathValueUnknown JsonpathValueKind = iota
	JsonpathValueUnimplemented
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
	case JsonpathValueUnimplemented:
		return JsonpathValue{Kind: JsonpathValueUnimplemented}
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
func MakeStoredJsonpathPayload(lax bool, root int) JsonpathPayload {
	root = langruntime.CheckedI32(root)
	characters := []rune{}
	nodes := []JsonpathNode{}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, JsonpathNode{Kind: 0, Next: 0, Left: 0, Right: 0, TextStart: 0, TextEnd: 0, First: 0, Last: 0, Flags: 0})
	return JsonpathPayload{Characters: characters, Nodes: nodes, Root: langruntime.IndexFromI32(root, 0), Lax: lax}
}
func AppendStoredJsonpathNode(input JsonpathPayload, kind int, next int, left int, right int, text string, first int, last int, flags int) JsonpathPayload {
	input = CopyJsonpathPayload(input)
	kind = langruntime.CheckedI32(kind)
	next = langruntime.CheckedI32(next)
	left = langruntime.CheckedI32(left)
	right = langruntime.CheckedI32(right)
	text = langruntime.CheckedString(text)
	first = langruntime.CheckedI32(first)
	last = langruntime.CheckedI32(last)
	flags = langruntime.CheckedI32(flags)
	characters := input.Characters
	nodes := input.Nodes
	root := input.Root
	if next < 0 || left < 0 || right < 0 {
		root = langruntime.CheckedIndex(0)
	}
	start := len(characters)
	source := []rune(text)
	index := 0
	for index < len(source) {
		langruntime.CheckedAdd(len(characters), 1)
		characters = append(characters, langruntime.CheckedChar(source[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, JsonpathNode{Kind: kind, Next: langruntime.IndexFromI32(next, 0), Left: langruntime.IndexFromI32(left, 0), Right: langruntime.IndexFromI32(right, 0), TextStart: start, TextEnd: len(characters), First: first, Last: last, Flags: flags})
	return JsonpathPayload{Characters: characters, Nodes: nodes, Root: root, Lax: input.Lax}
}
func MakeStoredJsonpathValue(input JsonpathPayload) JsonpathValue {
	input = CopyJsonpathPayload(input)
	return JsonpathFromCoercedValue(JsonpathValue{Kind: JsonpathValueValue, Value: input})
}

type ArrayElementKind uint8

const (
	ArrayElementUnknown ArrayElementKind = iota
	ArrayElementUnimplemented
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
	ArrayElementJsonNonNull
	ArrayElementJsonb
	ArrayElementJsonbNonNull
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
	ArrayElementComposite
	ArrayElementXml
	ArrayElementXmlRenderedText
	ArrayElementXmlNonNull
	ArrayElementTextNonNull
	ArrayElementAclitem
	ArrayElementTsvector
	ArrayElementTsquery
	ArrayElementAclitemCatalog
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
	JsonbNonNull       JsonbKnowledge
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
	Composite          CompositePayload
	Xml                string
	XmlRenderedText    string
	XmlNonNull         XmlKnowledge
	Aclitem            AclitemPayload
	Tsvector           TsvectorPayload
	Tsquery            TsqueryPayload
	AclitemCatalog     AclitemCatalogPayload
}

func CopyArrayElement(value ArrayElement) ArrayElement {
	switch value.Kind {
	case ArrayElementUnknown:
		return ArrayElement{Kind: ArrayElementUnknown}
	case ArrayElementUnimplemented:
		return ArrayElement{Kind: ArrayElementUnimplemented}
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
	case ArrayElementJsonNonNull:
		return ArrayElement{Kind: ArrayElementJsonNonNull}
	case ArrayElementJsonb:
		return ArrayElement{Kind: ArrayElementJsonb, Jsonb: CopyJsonbPayload(value.Jsonb)}
	case ArrayElementJsonbNonNull:
		return ArrayElement{Kind: ArrayElementJsonbNonNull, JsonbNonNull: CopyJsonbKnowledge(value.JsonbNonNull)}
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
	case ArrayElementComposite:
		return ArrayElement{Kind: ArrayElementComposite, Composite: CopyCompositePayload(value.Composite)}
	case ArrayElementXml:
		return ArrayElement{Kind: ArrayElementXml, Xml: langruntime.CheckedString(value.Xml)}
	case ArrayElementXmlRenderedText:
		return ArrayElement{Kind: ArrayElementXmlRenderedText, XmlRenderedText: langruntime.CheckedString(value.XmlRenderedText)}
	case ArrayElementXmlNonNull:
		return ArrayElement{Kind: ArrayElementXmlNonNull, XmlNonNull: value.XmlNonNull}
	case ArrayElementTextNonNull:
		return ArrayElement{Kind: ArrayElementTextNonNull}
	case ArrayElementAclitem:
		return ArrayElement{Kind: ArrayElementAclitem, Aclitem: value.Aclitem}
	case ArrayElementTsvector:
		return ArrayElement{Kind: ArrayElementTsvector, Tsvector: CopyTsvectorPayload(value.Tsvector)}
	case ArrayElementTsquery:
		return ArrayElement{Kind: ArrayElementTsquery, Tsquery: CopyTsqueryPayload(value.Tsquery)}
	case ArrayElementAclitemCatalog:
		return ArrayElement{Kind: ArrayElementAclitemCatalog, AclitemCatalog: value.AclitemCatalog}
	}
	panic("unknown enum variant")
}
func ArrayElementFamily(input ArrayElement) int {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementJsonbNonNull {
		maximum := CopyJsonbKnowledge(input.JsonbNonNull)
		_ = maximum
		return 12
	}
	if input.Kind == ArrayElementJsonNonNull {
		return 11
	}
	if input.Kind == ArrayElementAclitemCatalog {
		return 46
	}
	if input.Kind == ArrayElementTsquery {
		return 48
	}
	if input.Kind == ArrayElementTsvector {
		return 47
	}
	if input.Kind == ArrayElementAclitem {
		return 46
	}
	if input.Kind == ArrayElementTextNonNull {
		return 8
	}
	if input.Kind == ArrayElementXmlNonNull {
		return 45
	}
	if input.Kind == ArrayElementXml {
		return 45
	}
	if input.Kind == ArrayElementXmlRenderedText {
		return 45
	}
	if input.Kind == ArrayElementComposite {
		return 44
	}
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToArray(input ArrayElement) ArrayValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayUnresolved(unresolvedFlavor)
}
func ArrayElementFromInt2(input Int2Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Int2ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Int2ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToInt2(input ArrayElement) Int2Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int2Unresolved(unresolvedFlavor)
}
func ArrayElementFromInt4(input Int4Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToInt4(input ArrayElement) Int4Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int4Unresolved(unresolvedFlavor)
}
func ArrayElementFromInt8(input Int8Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Int8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Int8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToInt8(input ArrayElement) Int8Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int8Unresolved(unresolvedFlavor)
}
func ArrayElementFromTimestamp(input TimestampValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == TimestampValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TimestampValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTimestamp(input ArrayElement) TimestampValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TimestampUnresolved(unresolvedFlavor)
}
func ArrayElementFromTimestamptz(input TimestamptzValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == TimestamptzValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TimestamptzValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTimestamptz(input ArrayElement) TimestamptzValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TimestamptzUnresolved(unresolvedFlavor)
}
func ArrayElementFromEnum(input EnumValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == EnumValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == EnumValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToEnum(input ArrayElement) EnumValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return EnumUnresolved(unresolvedFlavor)
}
func ArrayElementFromDate(input DateValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == DateValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == DateValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToDate(input ArrayElement) DateValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return DateUnresolved(unresolvedFlavor)
}
func ArrayElementFromText(input TextValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input == (TextValue{Kind: TextValueNonNull}) {
		return ArrayElement{Kind: ArrayElementTextNonNull}
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToText(input ArrayElement) TextValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementTextNonNull {
		return TextValue{Kind: TextValueNonNull}
	}
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
	return TextUnresolved(unresolvedFlavor)
}
func ArrayElementFromBool(input BoolValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToBool(input ArrayElement) BoolValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}
func ArrayElementFromNumeric(input NumericValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == NumericValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == NumericValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToNumeric(input ArrayElement) NumericValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return NumericUnresolved(unresolvedFlavor)
}
func ArrayElementFromJson(input JsonValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == JsonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == JsonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonValueNonNull {
		return ArrayElement{Kind: ArrayElementJsonNonNull}
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToJson(input ArrayElement) JsonValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementJsonNonNull {
		return JsonValue{Kind: JsonValueNonNull}
	}
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
	return JsonUnresolved(unresolvedFlavor)
}
func ArrayElementFromJsonb(input JsonbValue) ArrayElement {
	input = CopyJsonbValue(input)
	unresolvedFlavor := 0
	if input.Kind == JsonbValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonbValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == JsonbValueNonNull {
		maximum := CopyJsonbKnowledge(input.NonNull)
		return ArrayElement{Kind: ArrayElementJsonbNonNull, JsonbNonNull: maximum}
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToJsonb(input ArrayElement) JsonbValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementJsonbNonNull {
		maximum := CopyJsonbKnowledge(input.JsonbNonNull)
		return JsonbValue{Kind: JsonbValueNonNull, NonNull: maximum}
	}
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
	return JsonbUnresolved(unresolvedFlavor)
}
func ArrayElementFromNetwork(input NetworkValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == NetworkValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == NetworkValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToNetwork(input ArrayElement) NetworkValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return NetworkUnresolved(unresolvedFlavor)
}
func ArrayElementFromBit(input BitValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == BitValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BitValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToBit(input ArrayElement) BitValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BitUnresolved(unresolvedFlavor)
}
func ArrayElementFromBytea(input ByteaValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == ByteaValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ByteaValueUnspecified {
		width := langruntime.CheckedI32(input.Unspecified)
		_ = width
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == ByteaValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToBytea(input ArrayElement) ByteaValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ByteaUnresolved(unresolvedFlavor)
}
func ArrayElementFromMacaddr(input MacaddrValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == MacaddrValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MacaddrValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToMacaddr(input ArrayElement) MacaddrValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return MacaddrUnresolved(unresolvedFlavor)
}
func ArrayElementFromMacaddr8(input Macaddr8Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Macaddr8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Macaddr8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToMacaddr8(input ArrayElement) Macaddr8Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Macaddr8Unresolved(unresolvedFlavor)
}
func ArrayElementFromUuid(input UuidValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == UuidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == UuidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToUuid(input ArrayElement) UuidValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return UuidUnresolved(unresolvedFlavor)
}
func ArrayElementFromFloat4(input Float4Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Float4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Float4ValueUnspecifiedNan {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == Float4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToFloat4(input ArrayElement) Float4Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Float4Unresolved(unresolvedFlavor)
}
func ArrayElementFromFloat8(input Float8Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Float8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Float8ValueUnspecifiedNan {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == Float8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToFloat8(input ArrayElement) Float8Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Float8Unresolved(unresolvedFlavor)
}
func ArrayElementFromTime(input TimeValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == TimeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TimeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTime(input ArrayElement) TimeValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TimeUnresolved(unresolvedFlavor)
}
func ArrayElementFromTimetz(input TimetzValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == TimetzValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TimetzValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTimetz(input ArrayElement) TimetzValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TimetzUnresolved(unresolvedFlavor)
}
func ArrayElementFromInterval(input IntervalValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == IntervalValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == IntervalValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToInterval(input ArrayElement) IntervalValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return IntervalUnresolved(unresolvedFlavor)
}
func ArrayElementFromPoint(input PointValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == PointValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PointValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToPoint(input ArrayElement) PointValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return PointUnresolved(unresolvedFlavor)
}
func ArrayElementFromLine(input LineValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == LineValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == LineValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToLine(input ArrayElement) LineValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return LineUnresolved(unresolvedFlavor)
}
func ArrayElementFromLseg(input LsegValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == LsegValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == LsegValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToLseg(input ArrayElement) LsegValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return LsegUnresolved(unresolvedFlavor)
}
func ArrayElementFromBox(input BoxValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == BoxValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BoxValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BoxValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToBox(input ArrayElement) BoxValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoxUnresolved(unresolvedFlavor)
}
func ArrayElementFromPath(input PathValue) ArrayElement {
	input = CopyPathValue(input)
	unresolvedFlavor := 0
	if input.Kind == PathValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PathValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToPath(input ArrayElement) PathValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return PathUnresolved(unresolvedFlavor)
}
func ArrayElementFromPolygon(input PolygonValue) ArrayElement {
	input = CopyPolygonValue(input)
	unresolvedFlavor := 0
	if input.Kind == PolygonValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PolygonValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToPolygon(input ArrayElement) PolygonValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return PolygonUnresolved(unresolvedFlavor)
}
func ArrayElementFromCircle(input CircleValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == CircleValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CircleValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToCircle(input ArrayElement) CircleValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return CircleUnresolved(unresolvedFlavor)
}
func ArrayElementFromMoney(input MoneyValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == MoneyValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MoneyValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToMoney(input ArrayElement) MoneyValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return MoneyUnresolved(unresolvedFlavor)
}
func ArrayElementFromInternalChar(input InternalCharValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == InternalCharValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == InternalCharValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToInternalChar(input ArrayElement) InternalCharValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return InternalCharUnresolved(unresolvedFlavor)
}
func ArrayElementFromOid(input OidValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == OidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == OidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToOid(input ArrayElement) OidValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return OidUnresolved(unresolvedFlavor)
}
func ArrayElementFromXid(input XidValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == XidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == XidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToXid(input ArrayElement) XidValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return XidUnresolved(unresolvedFlavor)
}
func ArrayElementFromCid(input CidValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == CidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToCid(input ArrayElement) CidValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return CidUnresolved(unresolvedFlavor)
}
func ArrayElementFromSnapshot(input SnapshotValue) ArrayElement {
	input = CopySnapshotValue(input)
	unresolvedFlavor := 0
	if input.Kind == SnapshotValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == SnapshotValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToSnapshot(input ArrayElement) SnapshotValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return SnapshotUnresolved(unresolvedFlavor)
}
func ArrayElementFromXid8(input Xid8Value) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == Xid8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Xid8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToXid8(input ArrayElement) Xid8Value {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Xid8Unresolved(unresolvedFlavor)
}
func ArrayElementFromPgLsn(input PgLsnValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == PgLsnValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == PgLsnValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToPgLsn(input ArrayElement) PgLsnValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return PgLsnUnresolved(unresolvedFlavor)
}
func ArrayElementFromTid(input TidValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == TidValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TidValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTid(input ArrayElement) TidValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TidUnresolved(unresolvedFlavor)
}
func ArrayElementFromJsonpath(input JsonpathValue) ArrayElement {
	input = CopyJsonpathValue(input)
	unresolvedFlavor := 0
	if input.Kind == JsonpathValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == JsonpathValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToJsonpath(input ArrayElement) JsonpathValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return JsonpathUnresolved(unresolvedFlavor)
}
func ArrayElementFromRange(input RangeValue) ArrayElement {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToRange(input ArrayElement) RangeValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return RangeUnresolved(unresolvedFlavor)
}
func ArrayElementFromMultirange(input MultirangeValue) ArrayElement {
	input = CopyMultirangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToMultirange(input ArrayElement) MultirangeValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return MultirangeUnresolved(unresolvedFlavor)
}
func ArrayElementFromXml(input XmlValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == XmlValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == XmlValueNonNull {
		knowledge := input.NonNull
		_ = knowledge
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == XmlValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == XmlValueNonNull {
		knowledge := input.NonNull
		checked := MakeXmlKnowledge(knowledge.Document, knowledge.Content)
		if checked.Kind == XmlValueNonNull {
			actual := checked.NonNull
			return ArrayElement{Kind: ArrayElementXmlNonNull, XmlNonNull: actual}
		}
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	if input.Kind == XmlValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == XmlValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == XmlValueValue {
		value := langruntime.CheckedString(input.Value)
		return ArrayElement{Kind: ArrayElementXml, Xml: value}
	}
	if input.Kind == XmlValueRenderedText {
		value := langruntime.CheckedString(input.RenderedText)
		return ArrayElement{Kind: ArrayElementXmlRenderedText, XmlRenderedText: value}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToXml(input ArrayElement) XmlValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementXmlNonNull {
		knowledge := input.XmlNonNull
		return MakeXmlKnowledge(knowledge.Document, knowledge.Content)
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return XmlValue{Kind: XmlValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return XmlValue{Kind: XmlValueNull}
	}
	if input.Kind == ArrayElementXml {
		value := langruntime.CheckedString(input.Xml)
		return XmlValue{Kind: XmlValueValue, Value: value}
	}
	if input.Kind == ArrayElementXmlRenderedText {
		value := langruntime.CheckedString(input.XmlRenderedText)
		return XmlValue{Kind: XmlValueRenderedText, RenderedText: value}
	}
	return XmlUnresolved(unresolvedFlavor)
}
func ArrayElementFromAclitem(input AclitemValue) ArrayElement {
	unresolvedFlavor := 0
	if input.Kind == AclitemValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == AclitemValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == AclitemValueCatalog {
		value := input.Catalog
		return ArrayElement{Kind: ArrayElementAclitemCatalog, AclitemCatalog: value}
	}
	if input.Kind == AclitemValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input == (AclitemValue{Kind: AclitemValueNull}) {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == AclitemValueValue {
		value := input.Value
		return ArrayElement{Kind: ArrayElementAclitem, Aclitem: value}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToAclitem(input ArrayElement) AclitemValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementAclitemCatalog {
		value := input.AclitemCatalog
		return MakeAclitemCatalogValue(value.Privileges, value.GrantOptions, value.PublicGrantee, value.InvalidGrantor)
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return AclitemValue{Kind: AclitemValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return AclitemValue{Kind: AclitemValueNull}
	}
	if input.Kind == ArrayElementAclitem {
		value := input.Aclitem
		return AclitemValue{Kind: AclitemValueValue, Value: value}
	}
	return AclitemUnresolved(unresolvedFlavor)
}
func ArrayElementFromTsvector(input TsvectorValue) ArrayElement {
	input = CopyTsvectorValue(input)
	unresolvedFlavor := 0
	if input.Kind == TsvectorValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TsvectorValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TsvectorValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TsvectorValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TsvectorValueValue {
		value := CopyTsvectorPayload(input.Value)
		return ArrayElement{Kind: ArrayElementTsvector, Tsvector: value}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTsvector(input ArrayElement) TsvectorValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return TsvectorValue{Kind: TsvectorValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TsvectorValue{Kind: TsvectorValueNull}
	}
	if input.Kind == ArrayElementTsvector {
		value := CopyTsvectorPayload(input.Tsvector)
		return TsvectorValue{Kind: TsvectorValueValue, Value: value}
	}
	return TsvectorUnresolved(unresolvedFlavor)
}
func ArrayElementFromTsquery(input TsqueryValue) ArrayElement {
	input = CopyTsqueryValue(input)
	unresolvedFlavor := 0
	if input.Kind == TsqueryValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TsqueryValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TsqueryValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == TsqueryValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == TsqueryValueValue {
		value := CopyTsqueryPayload(input.Value)
		return ArrayElement{Kind: ArrayElementTsquery, Tsquery: value}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToTsquery(input ArrayElement) TsqueryValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return TsqueryValue{Kind: TsqueryValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return TsqueryValue{Kind: TsqueryValueNull}
	}
	if input.Kind == ArrayElementTsquery {
		value := CopyTsqueryPayload(input.Tsquery)
		return TsqueryValue{Kind: TsqueryValueValue, Value: value}
	}
	return TsqueryUnresolved(unresolvedFlavor)
}

type CompositePayload struct {
	TypeName string
	Fields   []ArrayElement
}

func CopyCompositePayload(value CompositePayload) CompositePayload {
	return CompositePayload{TypeName: langruntime.CheckedString(value.TypeName), Fields: langruntime.CheckedStructs(value.Fields, CopyArrayElement)}
}

type CompositeValueKind uint8

const (
	CompositeValueUnknown CompositeValueKind = iota
	CompositeValueUnimplemented
	CompositeValueNull
	CompositeValueError
	CompositeValueValue
)

type CompositeValue struct {
	Kind  CompositeValueKind
	Error SqlError
	Value CompositePayload
}

func CopyCompositeValue(value CompositeValue) CompositeValue {
	switch value.Kind {
	case CompositeValueUnknown:
		return CompositeValue{Kind: CompositeValueUnknown}
	case CompositeValueUnimplemented:
		return CompositeValue{Kind: CompositeValueUnimplemented}
	case CompositeValueNull:
		return CompositeValue{Kind: CompositeValueNull}
	case CompositeValueError:
		return CompositeValue{Kind: CompositeValueError, Error: value.Error}
	case CompositeValueValue:
		return CompositeValue{Kind: CompositeValueValue, Value: CopyCompositePayload(value.Value)}
	}
	panic("unknown enum variant")
}
func CompositeUnknown() CompositeValue {
	return CompositeValue{Kind: CompositeValueUnknown}
}
func CompositeNull() CompositeValue {
	return CompositeValue{Kind: CompositeValueNull}
}
func CompositeFromCaseGuard(input CheckOutcome) CompositeValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return CompositeValue{Kind: CompositeValueError, Error: error}
	}
	return CompositeRowUnresolved(unresolvedFlavor)
}
func MakeCompositeValue(input CompositePayload) CompositeValue {
	input = CopyCompositePayload(input)
	unresolvedFlavor := 0
	identity := []rune(input.TypeName)
	if len(identity) == 0 || len(input.Fields) > 2147483647 {
		return CompositeRowUnresolved(unresolvedFlavor)
	}
	index := 0
	for index < len(identity) {
		if identity[index] == '\x00' {
			return CompositeRowUnresolved(unresolvedFlavor)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	fields := input.Fields
	index = langruntime.CheckedIndex(0)
	for index < len(fields) {
		source := CopyArrayElement(fields[index])
		checked := arrayCoercedOwnedElement(CopyArrayElement(source))
		if checked.Kind == ArrayElementError {
			error := checked.Error
			return CompositeValue{Kind: CompositeValueError, Error: error}
		}
		checkedUnresolved := false
		if checked.Kind == ArrayElementUnknown {
			checkedUnresolved = true
		}
		if checked.Kind == ArrayElementUnimplemented {
			checkedUnresolved = true
		}
		if checkedUnresolved {
			family := ArrayElementFamily(source)
			if family >= 41 && family <= 44 {
				return CompositeRowUnresolved(unresolvedFlavor)
			}
		}
		fields[index] = CopyArrayElement(checked)
		index = langruntime.CheckedAdd(index, 1)
	}
	return CompositeValue{Kind: CompositeValueValue, Value: CompositePayload{TypeName: input.TypeName, Fields: fields}}
}
func CompositeFromCoercedValue(input CompositeValue) CompositeValue {
	input = CopyCompositeValue(input)
	if input.Kind == CompositeValueValue {
		value := CopyCompositePayload(input.Value)
		return MakeCompositeValue(value)
	}
	return input
}
func MakeCompositeFields(typeName string) CompositeValue {
	typeName = langruntime.CheckedString(typeName)
	fields := []ArrayElement{}
	return MakeCompositeValue(CompositePayload{TypeName: typeName, Fields: fields})
}
func AppendCompositeField(input CompositeValue, field ArrayElement) CompositeValue {
	input = CopyCompositeValue(input)
	field = CopyArrayElement(field)
	if input.Kind == CompositeValueValue {
		value := CopyCompositePayload(input.Value)
		fields := value.Fields
		langruntime.CheckedAdd(len(fields), 1)
		fields = append(fields, CopyArrayElement(field))
		return MakeCompositeValue(CompositePayload{TypeName: value.TypeName, Fields: fields})
	}
	return input
}
func PrepareCompositeRowCoercion(input CompositeValue, typeName string) CompositeValue {
	input = CopyCompositeValue(input)
	typeName = langruntime.CheckedString(typeName)
	checked := CompositeFromCoercedValue(input)
	if checked.Kind == CompositeValueValue {
		return MakeCompositeFields(typeName)
	}
	return checked
}
func InvalidCompositeRowCoercion(input CompositeValue) CompositeValue {
	input = CopyCompositeValue(input)
	checked := CompositeFromCoercedValue(input)
	if checked.Kind == CompositeValueValue {
		return CompositeValue{Kind: CompositeValueError, Error: MakeSqlError(sqlErrorDatatypeMismatch)}
	}
	return checked
}
func CompositeFieldCount(input CompositeValue) Int4Value {
	input = CopyCompositeValue(input)
	unresolvedFlavor := 0
	if input.Kind == CompositeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CompositeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	checked := CompositeFromCoercedValue(input)
	if checked.Kind == CompositeValueError {
		error := checked.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if checked.Kind == CompositeValueNull {
		return Int4Value{Kind: Int4ValueNull}
	}
	if checked.Kind == CompositeValueValue {
		value := CopyCompositePayload(checked.Value)
		return MakeInt4Value(int(int32(len(value.Fields))))
	}
	return Int4Unresolved(unresolvedFlavor)
}
func CompositeFieldAt(input CompositeValue, index Int4Value) ArrayElement {
	input = CopyCompositeValue(input)
	unresolvedFlavor := 0
	if input.Kind == CompositeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CompositeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	checked := CompositeFromCoercedValue(input)
	if checked.Kind == CompositeValueError {
		error := checked.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if index.Kind == Int4ValueError {
		error := index.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if checked.Kind == CompositeValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	checkedFlavor := unresolvedFlavor
	if checked.Kind == CompositeValueUnknown {
		if checkedFlavor < 1 {
			checkedFlavor = langruntime.CheckedI32(1)
		}
	}
	if checked.Kind == CompositeValueUnimplemented {
		checkedFlavor = langruntime.CheckedI32(2)
	}
	if checked.Kind == CompositeValueValue {
		value := CopyCompositePayload(checked.Value)
		if index.Kind == Int4ValueValue {
			offset := langruntime.CheckedI32(index.Value)
			position := langruntime.IndexFromI32(offset, len(value.Fields))
			if offset >= 0 && position < len(value.Fields) {
				return CopyArrayElement(value.Fields[position])
			}
		}
	}
	return ArrayElementUnresolved(checkedFlavor)
}
func CompositeDatumIsNull(input CompositeValue) BoolValue {
	input = CopyCompositeValue(input)
	unresolvedFlavor := 0
	if input.Kind == CompositeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CompositeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	checked := CompositeFromCoercedValue(input)
	if checked.Kind == CompositeValueError {
		error := checked.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor1224 := unresolvedFlavor
	if checked.Kind == CompositeValueUnknown {
		if conditionFlavor1224 < 1 {
			conditionFlavor1224 = langruntime.CheckedI32(1)
		}
	}
	if checked.Kind == CompositeValueUnknown {
		return BoolUnresolved(conditionFlavor1224)
	}
	conditionFlavor12293 := unresolvedFlavor
	if checked.Kind == CompositeValueUnimplemented {
		conditionFlavor12293 = langruntime.CheckedI32(2)
	}
	if checked.Kind == CompositeValueUnimplemented {
		return BoolUnresolved(conditionFlavor12293)
	}
	if checked.Kind == CompositeValueNull {
		return MakeBoolValue(true)
	}
	return MakeBoolValue(false)
}
func compositeRowNullTest(input CompositeValue, negated bool) BoolValue {
	input = CopyCompositeValue(input)
	unresolvedFlavor := 0
	if input.Kind == CompositeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CompositeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	checked := CompositeFromCoercedValue(input)
	if checked.Kind == CompositeValueError {
		error := checked.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	if checked.Kind == CompositeValueNull {
		return MakeBoolValue(negated == false)
	}
	if checked.Kind == CompositeValueValue {
		value := CopyCompositePayload(checked.Value)
		unknown := false
		fieldFlavor := unresolvedFlavor
		index := 0
		for index < len(value.Fields) {
			field := CopyArrayElement(value.Fields[index])
			known := true
			if field.Kind == ArrayElementUnknown {
				unknown = true
				known = false
				if fieldFlavor < 1 {
					fieldFlavor = langruntime.CheckedI32(1)
				}
			}
			if field.Kind == ArrayElementUnimplemented {
				unknown = true
				known = false
				fieldFlavor = langruntime.CheckedI32(2)
			}
			if known {
				isNull := false
				if field.Kind == ArrayElementNull {
					isNull = true
				}
				if isNull == negated {
					return MakeBoolValue(false)
				}
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		if unknown {
			return BoolUnresolved(fieldFlavor)
		}
		return MakeBoolValue(true)
	}
	return BoolUnresolved(unresolvedFlavor)
}
func CompositeRowIsNull(input CompositeValue) BoolValue {
	input = CopyCompositeValue(input)
	return compositeRowNullTest(input, false)
}
func CompositeIsNull(input CompositeValue) BoolValue {
	input = CopyCompositeValue(input)
	return CompositeDatumIsNull(input)
}
func CompositeRowIsNotNull(input CompositeValue) BoolValue {
	input = CopyCompositeValue(input)
	return compositeRowNullTest(input, true)
}
func ArrayElementFromComposite(input CompositeValue) ArrayElement {
	input = CopyCompositeValue(input)
	unresolvedFlavor := 0
	if input.Kind == CompositeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CompositeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CompositeValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == CompositeValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == CompositeValueValue {
		value := CopyCompositePayload(input.Value)
		return ArrayElement{Kind: ArrayElementComposite, Composite: value}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayElementToComposite(input ArrayElement) CompositeValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return CompositeValue{Kind: CompositeValueError, Error: error}
	}
	if input.Kind == ArrayElementNull {
		return CompositeValue{Kind: CompositeValueNull}
	}
	if input.Kind == ArrayElementComposite {
		value := CopyCompositePayload(input.Composite)
		return CompositeValue{Kind: CompositeValueValue, Value: value}
	}
	return CompositeRowUnresolved(unresolvedFlavor)
}

type CompositeTypeNode struct {
	TypeName     string
	Kind         int
	ElementType  string
	Child        int
	Fields       []int
	BoundProfile RangeBoundContext
}

func CopyCompositeTypeNode(value CompositeTypeNode) CompositeTypeNode {
	return CompositeTypeNode{TypeName: langruntime.CheckedString(value.TypeName), Kind: langruntime.CheckedI32(value.Kind), ElementType: langruntime.CheckedString(value.ElementType), Child: langruntime.CheckedIndex(value.Child), Fields: langruntime.CheckedIndices(value.Fields), BoundProfile: CopyRangeBoundContext(value.BoundProfile)}
}

type CompositeTypeContext struct {
	Nodes []CompositeTypeNode
}

func CopyCompositeTypeContext(value CompositeTypeContext) CompositeTypeContext {
	return CompositeTypeContext{Nodes: langruntime.CheckedStructs(value.Nodes, CopyCompositeTypeNode)}
}

type CompositeTypePlanKind uint8

const (
	CompositeTypePlanValue CompositeTypePlanKind = iota
)

type CompositeTypePlan struct {
	Kind  CompositeTypePlanKind
	Value CompositeTypeContext
}

func CopyCompositeTypePlan(value CompositeTypePlan) CompositeTypePlan {
	switch value.Kind {
	case CompositeTypePlanValue:
		return CompositeTypePlan{Kind: CompositeTypePlanValue, Value: CopyCompositeTypeContext(value.Value)}
	}
	panic("unknown enum variant")
}
func EmptyCompositeTypePlan() CompositeTypePlan {
	nodes := []CompositeTypeNode{}
	return CompositeTypePlan{Kind: CompositeTypePlanValue, Value: CompositeTypeContext{Nodes: nodes}}
}
func AppendCompositeTypeNode(input CompositeTypePlan, typeName string, kind int, elementType string, child int, boundProfile RangeBoundContext) CompositeTypePlan {
	input = CopyCompositeTypePlan(input)
	typeName = langruntime.CheckedString(typeName)
	kind = langruntime.CheckedI32(kind)
	elementType = langruntime.CheckedString(elementType)
	child = langruntime.CheckedI32(child)
	boundProfile = CopyRangeBoundContext(boundProfile)
	if input.Kind == CompositeTypePlanValue {
		value := CopyCompositeTypeContext(input.Value)
		nodes := value.Nodes
		fields := []int{}
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, CopyCompositeTypeNode(CompositeTypeNode{TypeName: typeName, Kind: kind, ElementType: elementType, Child: langruntime.IndexFromI32(child, 2147483647), Fields: fields, BoundProfile: boundProfile}))
		return CompositeTypePlan{Kind: CompositeTypePlanValue, Value: CompositeTypeContext{Nodes: nodes}}
	}
	return input
}
func AppendCompositeTypeField(input CompositeTypePlan, index int, child int) CompositeTypePlan {
	input = CopyCompositeTypePlan(input)
	index = langruntime.CheckedI32(index)
	child = langruntime.CheckedI32(child)
	if input.Kind == CompositeTypePlanValue {
		value := CopyCompositeTypeContext(input.Value)
		nodes := value.Nodes
		position := langruntime.IndexFromI32(index, len(nodes))
		if position < len(nodes) {
			node := CopyCompositeTypeNode(nodes[position])
			fields := node.Fields
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, langruntime.CheckedIndex(langruntime.IndexFromI32(child, 2147483647)))
			nodes[position] = CopyCompositeTypeNode(CompositeTypeNode{TypeName: node.TypeName, Kind: node.Kind, ElementType: node.ElementType, Child: node.Child, Fields: fields, BoundProfile: node.BoundProfile})
		}
		return CompositeTypePlan{Kind: CompositeTypePlanValue, Value: CompositeTypeContext{Nodes: nodes}}
	}
	return input
}
func compositeTypeContextValid(context *CompositeTypeContext) bool {
	index := 0
	for index < len(context.Nodes) {
		node := CopyCompositeTypeNode(context.Nodes[index])
		if node.TypeName == "" || node.Kind < 0 || node.Kind > 48 {
			return false
		}
		if node.Kind == 41 && (node.ElementType == "" || node.Child >= len(context.Nodes)) {
			return false
		}
		if node.Kind > 0 && node.Kind < 41 || node.Kind == 42 || node.Kind == 43 || node.Kind >= 45 {
			profile := node.BoundProfile
			if len(profile.Nodes) == 0 || RangeBoundProfileValid(&profile) == false {
				return false
			}
			if profile.Nodes[0].Kind != node.Kind {
				return false
			}
		}
		field := 0
		for field < len(node.Fields) {
			if node.Kind != 44 || node.Fields[field] >= len(context.Nodes) {
				return false
			}
			field = langruntime.CheckedAdd(field, 1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return len(context.Nodes) > 0
}
func compositePrepareCell(input ArrayElement, context *CompositeTypeContext, index int) ArrayElement {
	input = CopyArrayElement(input)
	index = langruntime.CheckedIndex(index)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementNull {
		return input
	}
	if input.Kind == ArrayElementUnknown {
		return input
	}
	if input.Kind == ArrayElementUnimplemented {
		return input
	}
	if input.Kind == ArrayElementError {
		return input
	}
	if index >= len(context.Nodes) {
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	node := CopyCompositeTypeNode(context.Nodes[index])
	if ArrayElementFamily(CopyArrayElement(input)) != node.Kind {
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	if input.Kind == ArrayElementComposite {
		payload := CopyCompositePayload(input.Composite)
		if node.Kind != 44 || payload.TypeName != node.TypeName || len(payload.Fields) != len(node.Fields) {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
		fields := []ArrayElement{}
		position := 0
		for position < len(payload.Fields) {
			original := CopyArrayElement(payload.Fields[position])
			checked := compositePrepareCell(CopyArrayElement(original), context, node.Fields[position])
			if checked.Kind == ArrayElementError {
				error := checked.Error
				return ArrayElement{Kind: ArrayElementError, Error: error}
			}
			conditionFlavor27312 := unresolvedFlavor
			if checked.Kind == ArrayElementUnknown {
				if conditionFlavor27312 < 1 {
					conditionFlavor27312 = langruntime.CheckedI32(1)
				}
			}
			if checked.Kind == ArrayElementUnknown {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if original.Kind == ArrayElementUnimplemented {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor27312)
				}
			}
			conditionFlavor27715 := unresolvedFlavor
			if checked.Kind == ArrayElementUnimplemented {
				conditionFlavor27715 = langruntime.CheckedI32(2)
			}
			if checked.Kind == ArrayElementUnimplemented {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor27715)
				}
			}
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, CopyArrayElement(checked))
			position = langruntime.CheckedAdd(position, 1)
		}
		return ArrayElementFromComposite(MakeCompositeValue(CompositePayload{TypeName: payload.TypeName, Fields: fields}))
	}
	if input.Kind == ArrayElementArray {
		payload := CopyArrayPayload(input.Array)
		if node.Kind != 41 || payload.ElementType != node.ElementType || payload.ElementKind != context.Nodes[node.Child].Kind {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
		elements := []ArrayElement{}
		position := 0
		for position < len(payload.Elements) {
			original := CopyArrayElement(payload.Elements[position])
			checked := compositePrepareCell(CopyArrayElement(original), context, node.Child)
			conditionFlavor29412 := unresolvedFlavor
			if checked.Kind == ArrayElementUnknown {
				if conditionFlavor29412 < 1 {
					conditionFlavor29412 = langruntime.CheckedI32(1)
				}
			}
			if checked.Kind == ArrayElementUnknown {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if original.Kind == ArrayElementUnimplemented {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor29412)
				}
			}
			conditionFlavor29815 := unresolvedFlavor
			if checked.Kind == ArrayElementUnimplemented {
				conditionFlavor29815 = langruntime.CheckedI32(2)
			}
			if checked.Kind == ArrayElementUnimplemented {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor29815)
				}
			}
			langruntime.CheckedAdd(len(elements), 1)
			elements = append(elements, CopyArrayElement(checked))
			position = langruntime.CheckedAdd(position, 1)
		}
		return ArrayElementFromArray(MakeArrayValue(ArrayPayload{NullBitmap: payload.NullBitmap, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Dimensions: payload.Dimensions, Elements: elements}))
	}
	profile := node.BoundProfile
	return RangePrepareProfiledBound(input, &profile)
}
func CompositePrepareScalarCell(checked ArrayElement) ArrayElement {
	unresolvedFlavor := 0
	if checked.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if checked.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if checked.Kind == ArrayElementTsquery {
		payload := CopyTsqueryPayload(checked.Tsquery)
		return ArrayElementFromTsquery(MakeTsqueryValue(payload))
	}
	if checked.Kind == ArrayElementTsvector {
		payload := CopyTsvectorPayload(checked.Tsvector)
		return ArrayElementFromTsvector(MakeTsvectorValue(payload))
	}
	if checked.Kind == ArrayElementEnum {
		payload := checked.Enum
		return ArrayElementFromEnum(MakeEnumValue(payload.Ordinal))
	}
	if checked.Kind == ArrayElementDate {
		value := langruntime.CheckedI32(checked.Date)
		return ArrayElementFromDate(MakeStoredDateValue(value))
	}
	if checked.Kind == ArrayElementTimestamp {
		value := checked.Timestamp
		return ArrayElementFromTimestamp(MakeStoredTimestampValue(value))
	}
	if checked.Kind == ArrayElementTimestamptz {
		value := checked.Timestamptz
		return ArrayElementFromTimestamptz(MakeStoredTimestamptzValue(value))
	}
	if checked.Kind == ArrayElementXid {
		value := checked.Xid
		return ArrayElementFromXid(MakeXidValue(value))
	}
	if checked.Kind == ArrayElementCid {
		value := checked.Cid
		return ArrayElementFromCid(MakeCidValue(value))
	}
	if checked.Kind == ArrayElementInterval {
		payload := checked.Interval
		return ArrayElementFromInterval(MakeIntervalValue(payload.Months, payload.Days, payload.Time))
	}
	if checked.Kind == ArrayElementText {
		text := langruntime.CheckedString(checked.Text)
		characters := []rune(text)
		position := 0
		for position < len(characters) {
			if characters[position] == '\x00' {
				return ArrayElementUnresolved(unresolvedFlavor)
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		return ArrayElement{Kind: ArrayElementText, Text: text}
	}
	if checked.Kind == ArrayElementByteaUnspecified {
		length := langruntime.CheckedI32(checked.ByteaUnspecified)
		if length < 0 {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
	}
	if checked.Kind == ArrayElementNumeric {
		text := langruntime.CheckedString(checked.Numeric)
		return ArrayElementFromNumeric(MakeNumericValue(text))
	}
	if checked.Kind == ArrayElementJson {
		payload := checked.Json
		value := MakeJsonValue(payload.Source)
		if value.Kind == JsonValueValue {
			actual := value.Value
			if actual.Kind == payload.Kind && actual.Depth == payload.Depth {
				return ArrayElement{Kind: ArrayElementJson, Json: actual}
			}
		}
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	if checked.Kind == ArrayElementJsonb {
		payload := CopyJsonbPayload(checked.Jsonb)
		return ArrayElementFromJsonb(JsonbFromCoercedValue(JsonbValue{Kind: JsonbValueValue, Value: payload}))
	}
	if checked.Kind == ArrayElementXmlNonNull {
		value := checked.XmlNonNull
		return ArrayElementFromXml(MakeXmlKnowledge(value.Document, value.Content))
	}
	if checked.Kind == ArrayElementXml {
		value := langruntime.CheckedString(checked.Xml)
		return ArrayElementFromXml(MakeXmlValue(value))
	}
	if checked.Kind == ArrayElementXmlRenderedText {
		value := langruntime.CheckedString(checked.XmlRenderedText)
		return ArrayElementFromXml(XmlFromRenderedText(TextValue{Kind: TextValueValue, Value: value}))
	}
	if checked.Kind == ArrayElementJsonpath {
		payload := CopyJsonpathPayload(checked.Jsonpath)
		return ArrayElementFromJsonpath(JsonpathFromCoercedValue(JsonpathValue{Kind: JsonpathValueValue, Value: payload}))
	}
	if checked.Kind == ArrayElementJsonpathStoredText {
		text := langruntime.CheckedString(checked.JsonpathStoredText)
		return ArrayElementFromJsonpath(JsonpathFromCoercedValue(JsonpathValue{Kind: JsonpathValueStoredText, StoredText: text}))
	}
	if checked.Kind == ArrayElementSnapshot {
		payload := CopySnapshotPayload(checked.Snapshot)
		return ArrayElementFromSnapshot(MakeSnapshotValue(payload))
	}
	if checked.Kind == ArrayElementPath {
		payload := CopyPathPayload(checked.Path)
		return ArrayElementFromPath(MakePathValue(payload))
	}
	if checked.Kind == ArrayElementPolygon {
		payload := CopyPolygonPayload(checked.Polygon)
		return ArrayElementFromPolygon(MakePolygonValue(payload))
	}
	return checked
}
func CompositeFromCoercedPlan(input CompositeValue, plan CompositeTypePlan) CompositeValue {
	input = CopyCompositeValue(input)
	plan = CopyCompositeTypePlan(plan)
	unresolvedFlavor := 0
	if input.Kind == CompositeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CompositeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CompositeValueValue {
		payload := CopyCompositePayload(input.Value)
		if plan.Kind == CompositeTypePlanValue {
			context := CopyCompositeTypeContext(plan.Value)
			if compositeTypeContextValid(&context) == false {
				return CompositeRowUnresolved(unresolvedFlavor)
			}
			if context.Nodes[0].Kind != 44 {
				return CompositeRowUnresolved(unresolvedFlavor)
			}
			return ArrayElementToComposite(compositePrepareCell(ArrayElement{Kind: ArrayElementComposite, Composite: payload}, &context, 0))
		}
		return CompositeRowUnresolved(unresolvedFlavor)
	}
	return input
}
func ArrayFromCoercedCompositePlan(input ArrayValue, elementType string, plan CompositeTypePlan) ArrayValue {
	input = CopyArrayValue(input)
	elementType = langruntime.CheckedString(elementType)
	plan = CopyCompositeTypePlan(plan)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if plan.Kind == CompositeTypePlanValue {
			context := CopyCompositeTypeContext(plan.Value)
			if compositeTypeContextValid(&context) == false {
				return ArrayUnresolved(unresolvedFlavor)
			}
			if (context.Nodes[0].Kind != 41 && context.Nodes[0].Kind != 44) || payload.ElementKind != context.Nodes[0].Kind || payload.ElementType != elementType {
				return ArrayUnresolved(unresolvedFlavor)
			}
			elements := []ArrayElement{}
			position := 0
			for position < len(payload.Elements) {
				original := CopyArrayElement(payload.Elements[position])
				checked := compositePrepareCell(CopyArrayElement(original), &context, 0)
				conditionFlavor44316 := unresolvedFlavor
				if checked.Kind == ArrayElementUnknown {
					if conditionFlavor44316 < 1 {
						conditionFlavor44316 = langruntime.CheckedI32(1)
					}
				}
				if checked.Kind == ArrayElementUnknown {
					partial := false
					if original.Kind == ArrayElementUnknown {
						partial = true
					}
					if original.Kind == ArrayElementUnimplemented {
						partial = true
					}
					if partial == false {
						return ArrayUnresolved(conditionFlavor44316)
					}
				}
				conditionFlavor45319 := unresolvedFlavor
				if checked.Kind == ArrayElementUnimplemented {
					conditionFlavor45319 = langruntime.CheckedI32(2)
				}
				if checked.Kind == ArrayElementUnimplemented {
					partial := false
					if original.Kind == ArrayElementUnknown {
						partial = true
					}
					if partial == false {
						return ArrayUnresolved(conditionFlavor45319)
					}
				}
				langruntime.CheckedAdd(len(elements), 1)
				elements = append(elements, CopyArrayElement(checked))
				position = langruntime.CheckedAdd(position, 1)
			}
			return MakeArrayValue(ArrayPayload{NullBitmap: payload.NullBitmap, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Dimensions: payload.Dimensions, Elements: elements})
		}
		return ArrayUnresolved(unresolvedFlavor)
	}
	return input
}

type CompositeTextPayload struct {
	Characters []rune
	Position   int
	Expected   int
	Fields     []ArrayElement
	Current    TextValue
}

func CopyCompositeTextPayload(value CompositeTextPayload) CompositeTextPayload {
	return CompositeTextPayload{Characters: langruntime.CheckedChars(value.Characters), Position: langruntime.CheckedIndex(value.Position), Expected: langruntime.CheckedIndex(value.Expected), Fields: langruntime.CheckedStructs(value.Fields, CopyArrayElement), Current: value.Current}
}

type CompositeTextPlanKind uint8

const (
	CompositeTextPlanUnknown CompositeTextPlanKind = iota
	CompositeTextPlanUnimplemented
	CompositeTextPlanNull
	CompositeTextPlanError
	CompositeTextPlanValue
)

type CompositeTextPlan struct {
	Kind  CompositeTextPlanKind
	Error SqlError
	Value CompositeTextPayload
}

func CopyCompositeTextPlan(value CompositeTextPlan) CompositeTextPlan {
	switch value.Kind {
	case CompositeTextPlanUnknown:
		return CompositeTextPlan{Kind: CompositeTextPlanUnknown}
	case CompositeTextPlanUnimplemented:
		return CompositeTextPlan{Kind: CompositeTextPlanUnimplemented}
	case CompositeTextPlanNull:
		return CompositeTextPlan{Kind: CompositeTextPlanNull}
	case CompositeTextPlanError:
		return CompositeTextPlan{Kind: CompositeTextPlanError, Error: value.Error}
	case CompositeTextPlanValue:
		return CompositeTextPlan{Kind: CompositeTextPlanValue, Value: CopyCompositeTextPayload(value.Value)}
	}
	panic("unknown enum variant")
}

type RangeSupport struct {
	Comparison int
	Canonical  int
}

const RangeComparisonOidVector = 441

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
	RangeTextPlanUnimplemented
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
	case RangeTextPlanUnimplemented:
		return RangeTextPlan{Kind: RangeTextPlanUnimplemented}
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
	comparison := input.Comparison == 0 || (kind == 41 && input.Comparison == RangeComparisonOidVector) || (kind == 12 && input.Comparison == 120) || (kind == 48 && input.Comparison == 148) || (kind == 13 && RangeSupportIsCidr(input)) || (kind == 33 && RangeOidAliasMode(input, "") > 0) || (kind == 8 && (input.Comparison == 108 || input.Comparison == 200 || input.Comparison == 208)) || (input.Comparison == kind && (kind == 2 || kind == 3 || kind == 4 || kind == 5 || kind == 6 || kind == 7 || kind == 8 || kind == 10 || kind == 1 || kind == 9 || kind == 12 || kind == 13 || kind == 14 || kind == 15 || kind == 16 || kind == 17 || kind == 18 || kind == 19 || kind == 20 || kind == 21 || kind == 22 || kind == 23 || kind == 31 || kind == 32 || kind == 33 || kind == 37 || kind == 38 || kind == 39 || kind == 41 || kind == 42 || kind == 43 || kind == 44 || kind == 47 || kind == 48))
	canonical := input.Canonical == 0 || input.Canonical == 1 || (input.Canonical == kind && (kind == 2 || kind == 3 || kind == 7))
	return comparison && canonical
}
func RangeSupportIsCidr(input RangeSupport) bool {
	return input.Comparison == 100 || input.Comparison == 113
}
func RangeComparisonUnavailable(comparison int) bool {
	comparison = langruntime.CheckedI32(comparison)
	return comparison == 0 || comparison == 100 || comparison == 120 || comparison == 200 || (comparison > 300 && comparison < 330)
}
func RangeSupportJsonbUtf8(input RangeSupport) bool {
	return input.Comparison == 12 || input.Comparison == 120
}
func RangeOidAliasMode(input RangeSupport, elementType string) int {
	elementType = langruntime.CheckedString(elementType)
	if input.Comparison >= 331 && input.Comparison <= 336 {
		return langruntime.CheckedSignedSubtract(input.Comparison, 330)
	}
	if input.Comparison >= 301 && input.Comparison <= 306 {
		return langruntime.CheckedSignedSubtract(input.Comparison, 300)
	}
	if elementType == "pg_catalog.regoper" {
		return 2
	}
	if elementType == "pg_catalog.regoperator" {
		return 4
	}
	if elementType == "pg_catalog.regprocedure" {
		return 3
	}
	if elementType == "pg_catalog.regtype" {
		return 5
	}
	if elementType == "pg_catalog.regclass" || elementType == "pg_catalog.regcollation" || elementType == "pg_catalog.regconfig" || elementType == "pg_catalog.regdictionary" || elementType == "pg_catalog.regproc" {
		return 1
	}
	if elementType == "pg_catalog.regnamespace" || elementType == "pg_catalog.regrole" {
		return 6
	}
	return 0
}

type RangeBoundField struct {
	TypeName            string
	Child               int
	ComparisonAvailable bool
}

func CopyRangeBoundField(value RangeBoundField) RangeBoundField {
	return RangeBoundField{TypeName: langruntime.CheckedString(value.TypeName), Child: langruntime.CheckedIndex(value.Child), ComparisonAvailable: value.ComparisonAvailable}
}

type RangeBoundProfile struct {
	TypeName          string
	Kind              int
	Comparison        int
	Canonical         int
	MissingComparison bool
	ElementType       string
	Child             int
	EnumLabels        string
	EnumCount         int
	Fields            []RangeBoundField
}

func CopyRangeBoundProfile(value RangeBoundProfile) RangeBoundProfile {
	return RangeBoundProfile{TypeName: langruntime.CheckedString(value.TypeName), Kind: langruntime.CheckedI32(value.Kind), Comparison: langruntime.CheckedI32(value.Comparison), Canonical: langruntime.CheckedI32(value.Canonical), MissingComparison: value.MissingComparison, ElementType: langruntime.CheckedString(value.ElementType), Child: langruntime.CheckedIndex(value.Child), EnumLabels: langruntime.CheckedString(value.EnumLabels), EnumCount: langruntime.CheckedI32(value.EnumCount), Fields: langruntime.CheckedStructs(value.Fields, CopyRangeBoundField)}
}

type RangeBoundContext struct {
	Nodes []RangeBoundProfile
}

func CopyRangeBoundContext(value RangeBoundContext) RangeBoundContext {
	return RangeBoundContext{Nodes: langruntime.CheckedStructs(value.Nodes, CopyRangeBoundProfile)}
}
func EmptyRangeBoundContext() RangeBoundContext {
	nodes := []RangeBoundProfile{}
	return RangeBoundContext{Nodes: nodes}
}
func RangeBoundContextSnapshot(input *RangeBoundContext) RangeBoundContext {
	nodes := []RangeBoundProfile{}
	index := 0
	for index < len(input.Nodes) {
		langruntime.CheckedAdd(len(nodes), 1)
		nodes = append(nodes, CopyRangeBoundProfile(CopyRangeBoundProfile(input.Nodes[index])))
		index = langruntime.CheckedAdd(index, 1)
	}
	return RangeBoundContext{Nodes: nodes}
}
func AppendRangeBoundProfile(input RangeBoundContext, typeName string, kind int, comparison int, missingComparison bool, elementType string, child int, enumLabels string, enumCount int) RangeBoundContext {
	input = CopyRangeBoundContext(input)
	typeName = langruntime.CheckedString(typeName)
	kind = langruntime.CheckedI32(kind)
	comparison = langruntime.CheckedI32(comparison)
	elementType = langruntime.CheckedString(elementType)
	child = langruntime.CheckedI32(child)
	enumLabels = langruntime.CheckedString(enumLabels)
	enumCount = langruntime.CheckedI32(enumCount)
	return AppendRangeBoundProfileWithCanonical(input, typeName, kind, comparison, 1, missingComparison, elementType, child, enumLabels, enumCount)
}
func AppendRangeBoundProfileWithCanonical(input RangeBoundContext, typeName string, kind int, comparison int, canonical int, missingComparison bool, elementType string, child int, enumLabels string, enumCount int) RangeBoundContext {
	input = CopyRangeBoundContext(input)
	typeName = langruntime.CheckedString(typeName)
	kind = langruntime.CheckedI32(kind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	elementType = langruntime.CheckedString(elementType)
	child = langruntime.CheckedI32(child)
	enumLabels = langruntime.CheckedString(enumLabels)
	enumCount = langruntime.CheckedI32(enumCount)
	nodes := input.Nodes
	fields := []RangeBoundField{}
	langruntime.CheckedAdd(len(nodes), 1)
	nodes = append(nodes, CopyRangeBoundProfile(RangeBoundProfile{TypeName: typeName, Kind: kind, Comparison: comparison, Canonical: canonical, MissingComparison: missingComparison, ElementType: elementType, Child: langruntime.IndexFromI32(child, 2147483647), EnumLabels: enumLabels, EnumCount: enumCount, Fields: fields}))
	return RangeBoundContext{Nodes: nodes}
}
func AppendRangeBoundField(input RangeBoundContext, parent int, child int, typeName string, comparisonAvailable bool) RangeBoundContext {
	input = CopyRangeBoundContext(input)
	parent = langruntime.CheckedI32(parent)
	child = langruntime.CheckedI32(child)
	typeName = langruntime.CheckedString(typeName)
	nodes := input.Nodes
	index := langruntime.IndexFromI32(parent, len(nodes))
	if index < len(nodes) {
		node := CopyRangeBoundProfile(nodes[index])
		fields := node.Fields
		langruntime.CheckedAdd(len(fields), 1)
		fields = append(fields, RangeBoundField{TypeName: typeName, Child: langruntime.IndexFromI32(child, len(nodes)), ComparisonAvailable: comparisonAvailable})
		nodes[index] = CopyRangeBoundProfile(RangeBoundProfile{TypeName: node.TypeName, Kind: node.Kind, Comparison: node.Comparison, Canonical: node.Canonical, MissingComparison: node.MissingComparison, ElementType: node.ElementType, Child: node.Child, EnumLabels: node.EnumLabels, EnumCount: node.EnumCount, Fields: fields})
	}
	return RangeBoundContext{Nodes: nodes}
}

type RangePayload struct {
	TypeName       string
	ElementType    string
	ElementKind    int
	EnumLabels     string
	EnumCount      int
	BoundProfile   RangeBoundContext
	Support        RangeSupport
	Empty          bool
	LowerInclusive bool
	UpperInclusive bool
	Bounds         []ArrayElement
}

func CopyRangePayload(value RangePayload) RangePayload {
	return RangePayload{TypeName: langruntime.CheckedString(value.TypeName), ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), EnumLabels: langruntime.CheckedString(value.EnumLabels), EnumCount: langruntime.CheckedI32(value.EnumCount), BoundProfile: CopyRangeBoundContext(value.BoundProfile), Support: value.Support, Empty: value.Empty, LowerInclusive: value.LowerInclusive, UpperInclusive: value.UpperInclusive, Bounds: langruntime.CheckedStructs(value.Bounds, CopyArrayElement)}
}

type RangeValueKind uint8

const (
	RangeValueUnknown RangeValueKind = iota
	RangeValueUnimplemented
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
	case RangeValueUnimplemented:
		return RangeValue{Kind: RangeValueUnimplemented}
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
func RangePayloadWithBounds(input RangePayload, bounds []ArrayElement) RangePayload {
	input = CopyRangePayload(input)
	bounds = langruntime.CheckedStructs(bounds, CopyArrayElement)
	return RangePayload{TypeName: input.TypeName, ElementType: input.ElementType, ElementKind: input.ElementKind, EnumLabels: input.EnumLabels, EnumCount: input.EnumCount, BoundProfile: input.BoundProfile, Support: input.Support, Empty: input.Empty, LowerInclusive: input.LowerInclusive, UpperInclusive: input.UpperInclusive, Bounds: bounds}
}
func rangePayloadWithSupport(input RangePayload, support RangeSupport) RangePayload {
	input = CopyRangePayload(input)
	return RangePayload{TypeName: input.TypeName, ElementType: input.ElementType, ElementKind: input.ElementKind, EnumLabels: input.EnumLabels, EnumCount: input.EnumCount, BoundProfile: input.BoundProfile, Support: support, Empty: input.Empty, LowerInclusive: input.LowerInclusive, UpperInclusive: input.UpperInclusive, Bounds: input.Bounds}
}
func rangePayloadWithDefinition(input RangePayload, labels string, count int) RangePayload {
	input = CopyRangePayload(input)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	return RangePayload{TypeName: input.TypeName, ElementType: input.ElementType, ElementKind: input.ElementKind, EnumLabels: labels, EnumCount: count, BoundProfile: input.BoundProfile, Support: input.Support, Empty: input.Empty, LowerInclusive: input.LowerInclusive, UpperInclusive: input.UpperInclusive, Bounds: input.Bounds}
}
func RangeEnumDefinitionValid(labels string, count int) bool {
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	if count < 0 {
		return count == langruntime.CheckedSignedNegate(1) && labels == ""
	}
	if count == 0 {
		return labels == ""
	}
	characters := []rune(labels)
	seen := 0
	start := 0
	position := 0
	for position <= len(characters) {
		if position == len(characters) || characters[position] == '\x00' {
			earlier := 0
			for earlier < start {
				end := earlier
				for end < len(characters) && characters[end] != '\x00' {
					end = langruntime.CheckedAdd(end, 1)
				}
				if langruntime.CheckedSubtract(end, earlier) == langruntime.CheckedSubtract(position, start) {
					offset := 0
					equal := true
					for offset < langruntime.CheckedSubtract(position, start) {
						if characters[langruntime.CheckedAdd(earlier, offset)] != characters[langruntime.CheckedAdd(start, offset)] {
							equal = false
						}
						offset = langruntime.CheckedAdd(offset, 1)
					}
					if equal {
						return false
					}
				}
				earlier = langruntime.CheckedIndex(langruntime.CheckedAdd(end, 1))
			}
			if seen >= count {
				return false
			}
			seen = langruntime.CheckedI32(langruntime.CheckedSignedAdd(seen, 1))
			start = langruntime.CheckedIndex(langruntime.CheckedAdd(position, 1))
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return seen == count
}
func RangeEnumBoundValid(input ArrayElement, count int) bool {
	input = CopyArrayElement(input)
	count = langruntime.CheckedI32(count)
	if input.Kind == ArrayElementEnum {
		payload := input.Enum
		return count >= 0 && payload.Ordinal >= 0 && payload.Ordinal < count && payload.LabelOid >= int64(0) && payload.LabelOid <= int64(4294967295)
	}
	return true
}
func RangeWithEnumDefinition(input RangeValue, labels string, count int) RangeValue {
	input = CopyRangeValue(input)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		return MakeCoercedRangeValue(rangePayloadWithDefinition(value, labels, count))
	}
	return input
}
func RangeBoundProfileValid(profile *RangeBoundContext) bool {
	profile = langruntime.CheckedBorrowed(profile, CopyRangeBoundContext)
	index := 0
	for index < len(profile.Nodes) {
		node := CopyRangeBoundProfile(profile.Nodes[index])
		if node.TypeName == "" || node.Kind < 0 || node.Kind > 48 {
			return false
		}
		if node.Kind >= 41 && node.Kind <= 43 {
			if node.ElementType == "" || node.Child <= index || node.Child >= len(profile.Nodes) || (node.Comparison != 0 && node.Comparison != node.Kind && (node.Kind != 41 || node.Comparison != RangeComparisonOidVector)) {
				return false
			}
			if node.Comparison == RangeComparisonOidVector && (node.TypeName != "pg_catalog.oidvector" || node.ElementType != "pg_catalog.oid" || profile.Nodes[node.Child].Kind != 33) {
				return false
			}
			if node.Kind == 43 && (profile.Nodes[node.Child].Kind != 42 || node.ElementType != profile.Nodes[node.Child].TypeName) {
				return false
			}
			if node.Kind == 42 {
				child := CopyRangeBoundProfile(profile.Nodes[node.Child])
				if RangeSupportValid(MakeRangeSupport(child.Comparison, node.Canonical), child.Kind) == false {
					return false
				}
			}
		} else {
			if node.Child != 0 || node.ElementType != "" {
				return false
			}
			if node.MissingComparison {
				if node.Comparison != 0 {
					return false
				}
			} else if RangeSupportValid(MakeRangeSupport(node.Comparison, 1), node.Kind) == false {
				return false
			}
		}
		if len(node.Fields) > 2147483647 || (node.Kind != 44 && len(node.Fields) != 0) {
			return false
		}
		field := 0
		for field < len(node.Fields) {
			entry := node.Fields[field]
			if entry.TypeName == "" || entry.Child <= index || entry.Child >= len(profile.Nodes) {
				return false
			}
			field = langruntime.CheckedAdd(field, 1)
		}
		if node.MissingComparison && node.Comparison != 0 {
			return false
		}
		if node.Kind != 42 && node.Canonical != 1 {
			return false
		}
		if node.Kind == 6 {
			if RangeEnumDefinitionValid(node.EnumLabels, node.EnumCount) == false {
				return false
			}
		} else if node.EnumLabels != "" || node.EnumCount != langruntime.CheckedSignedNegate(1) {
			return false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return true
}
func RangeBoundProfilesEqual(left *RangeBoundContext, right *RangeBoundContext) bool {
	left = langruntime.CheckedBorrowed(left, CopyRangeBoundContext)
	right = langruntime.CheckedBorrowed(right, CopyRangeBoundContext)
	if len(left.Nodes) != len(right.Nodes) {
		return false
	}
	index := 0
	for index < len(left.Nodes) {
		a := CopyRangeBoundProfile(left.Nodes[index])
		b := CopyRangeBoundProfile(right.Nodes[index])
		if a.TypeName != b.TypeName || a.Kind != b.Kind || a.Comparison != b.Comparison || a.Canonical != b.Canonical || a.MissingComparison != b.MissingComparison || a.ElementType != b.ElementType || a.Child != b.Child || a.EnumLabels != b.EnumLabels || a.EnumCount != b.EnumCount {
			return false
		}
		if len(a.Fields) != len(b.Fields) {
			return false
		}
		field := 0
		for field < len(a.Fields) {
			x := a.Fields[field]
			y := b.Fields[field]
			if x.TypeName != y.TypeName || x.Child != y.Child || x.ComparisonAvailable != y.ComparisonAvailable {
				return false
			}
			field = langruntime.CheckedAdd(field, 1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return true
}
func rangePayloadWithBoundProfile(input RangePayload, profile RangeBoundContext) RangePayload {
	input = CopyRangePayload(input)
	profile = CopyRangeBoundContext(profile)
	return RangePayload{TypeName: input.TypeName, ElementType: input.ElementType, ElementKind: input.ElementKind, EnumLabels: input.EnumLabels, EnumCount: input.EnumCount, BoundProfile: profile, Support: input.Support, Empty: input.Empty, LowerInclusive: input.LowerInclusive, UpperInclusive: input.UpperInclusive, Bounds: input.Bounds}
}
func RangeWithBoundProfile(input RangeValue, profile RangeBoundContext) RangeValue {
	input = CopyRangeValue(input)
	profile = CopyRangeBoundContext(profile)
	if input.Kind == RangeValueValue {
		payload := CopyRangePayload(input.Value)
		return MakeCoercedRangeValue(rangePayloadWithBoundProfile(payload, profile))
	}
	return input
}
func RangeBoundContextBranch(profile *RangeBoundContext, start int) RangeBoundContext {
	profile = langruntime.CheckedBorrowed(profile, CopyRangeBoundContext)
	start = langruntime.CheckedIndex(start)
	if start >= len(profile.Nodes) || RangeBoundProfileValid(profile) == false {
		return EmptyRangeBoundContext()
	}
	if profile.Nodes[start].Kind < 41 || profile.Nodes[start].Kind >= 45 {
		return EmptyRangeBoundContext()
	}
	indices := []int{}
	index := 0
	for index < len(profile.Nodes) {
		langruntime.CheckedAdd(len(indices), 1)
		indices = append(indices, langruntime.CheckedIndex(len(profile.Nodes)))
		index = langruntime.CheckedAdd(index, 1)
	}
	indices[start] = langruntime.CheckedIndex(0)
	index = langruntime.CheckedIndex(start)
	count := 0
	for index < len(profile.Nodes) {
		if indices[index] < len(profile.Nodes) {
			indices[index] = langruntime.CheckedIndex(count)
			count = langruntime.CheckedAdd(count, 1)
			node := CopyRangeBoundProfile(profile.Nodes[index])
			if node.Kind >= 41 && node.Kind <= 43 {
				indices[node.Child] = langruntime.CheckedIndex(0)
			}
			field := 0
			for field < len(node.Fields) {
				indices[node.Fields[field].Child] = langruntime.CheckedIndex(0)
				field = langruntime.CheckedAdd(field, 1)
			}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	nodes := []RangeBoundProfile{}
	index = langruntime.CheckedIndex(start)
	for index < len(profile.Nodes) {
		if indices[index] < len(profile.Nodes) {
			node := CopyRangeBoundProfile(profile.Nodes[index])
			child := 0
			if node.Kind >= 41 && node.Kind <= 43 {
				child = langruntime.CheckedIndex(indices[node.Child])
			}
			fields := []RangeBoundField{}
			field := 0
			for field < len(node.Fields) {
				entry := node.Fields[field]
				langruntime.CheckedAdd(len(fields), 1)
				fields = append(fields, RangeBoundField{TypeName: entry.TypeName, Child: indices[entry.Child], ComparisonAvailable: entry.ComparisonAvailable})
				field = langruntime.CheckedAdd(field, 1)
			}
			langruntime.CheckedAdd(len(nodes), 1)
			nodes = append(nodes, CopyRangeBoundProfile(RangeBoundProfile{TypeName: node.TypeName, Kind: node.Kind, Comparison: node.Comparison, Canonical: node.Canonical, MissingComparison: node.MissingComparison, ElementType: node.ElementType, Child: child, EnumLabels: node.EnumLabels, EnumCount: node.EnumCount, Fields: fields}))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return RangeBoundContext{Nodes: nodes}
}
func rangeProfiledValueAt(input ArrayElement, profile *RangeBoundContext, index int) ArrayElement {
	input = CopyArrayElement(input)
	index = langruntime.CheckedIndex(index)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementNull {
		return input
	}
	if input.Kind == ArrayElementUnknown {
		return input
	}
	if input.Kind == ArrayElementUnimplemented {
		return input
	}
	if input.Kind == ArrayElementError {
		return input
	}
	if index >= len(profile.Nodes) {
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	node := CopyRangeBoundProfile(profile.Nodes[index])
	if ArrayElementFamily(CopyArrayElement(input)) != node.Kind {
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	if input.Kind == ArrayElementComposite {
		payload := CopyCompositePayload(input.Composite)
		if node.Kind != 44 || payload.TypeName != node.TypeName || len(payload.Fields) != len(node.Fields) {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
		fields := []ArrayElement{}
		position := 0
		for position < len(payload.Fields) {
			original := CopyArrayElement(payload.Fields[position])
			checked := rangeProfiledValueAt(CopyArrayElement(original), profile, node.Fields[position].Child)
			if checked.Kind == ArrayElementError {
				error := checked.Error
				return ArrayElement{Kind: ArrayElementError, Error: error}
			}
			conditionFlavor62612 := unresolvedFlavor
			if checked.Kind == ArrayElementUnknown {
				if conditionFlavor62612 < 1 {
					conditionFlavor62612 = langruntime.CheckedI32(1)
				}
			}
			if checked.Kind == ArrayElementUnknown {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if original.Kind == ArrayElementUnimplemented {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor62612)
				}
			}
			conditionFlavor63615 := unresolvedFlavor
			if checked.Kind == ArrayElementUnimplemented {
				conditionFlavor63615 = langruntime.CheckedI32(2)
			}
			if checked.Kind == ArrayElementUnimplemented {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor63615)
				}
			}
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, CopyArrayElement(checked))
			position = langruntime.CheckedAdd(position, 1)
		}
		return ArrayElementFromComposite(MakeCompositeValue(CompositePayload{TypeName: payload.TypeName, Fields: fields}))
	}
	if input.Kind == ArrayElementArray {
		payload := CopyArrayPayload(input.Array)
		if payload.ElementType != node.ElementType || payload.ElementKind != profile.Nodes[node.Child].Kind {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
		elements := []ArrayElement{}
		position := 0
		for position < len(payload.Elements) {
			original := CopyArrayElement(payload.Elements[position])
			prepared := rangeProfiledValueAt(CopyArrayElement(original), profile, node.Child)
			conditionFlavor66412 := unresolvedFlavor
			if prepared.Kind == ArrayElementUnknown {
				if conditionFlavor66412 < 1 {
					conditionFlavor66412 = langruntime.CheckedI32(1)
				}
			}
			if prepared.Kind == ArrayElementUnknown {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if original.Kind == ArrayElementUnimplemented {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor66412)
				}
			}
			conditionFlavor67415 := unresolvedFlavor
			if prepared.Kind == ArrayElementUnimplemented {
				conditionFlavor67415 = langruntime.CheckedI32(2)
			}
			if prepared.Kind == ArrayElementUnimplemented {
				partial := false
				if original.Kind == ArrayElementUnknown {
					partial = true
				}
				if partial == false {
					return ArrayElementUnresolved(conditionFlavor67415)
				}
			}
			langruntime.CheckedAdd(len(elements), 1)
			elements = append(elements, CopyArrayElement(prepared))
			position = langruntime.CheckedAdd(position, 1)
		}
		return ArrayElementFromArray(MakeArrayValue(ArrayPayload{NullBitmap: payload.NullBitmap, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Dimensions: payload.Dimensions, Elements: elements}))
	}
	if input.Kind == ArrayElementRange {
		payload := CopyRangePayload(input.Range)
		child := CopyRangeBoundProfile(profile.Nodes[node.Child])
		if payload.TypeName != node.TypeName || payload.ElementType != node.ElementType || payload.ElementKind != child.Kind {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
		labels := langruntime.NewTextBuffer("")
		count := langruntime.CheckedSignedNegate(1)
		if child.Kind == 6 {
			labels = langruntime.NewTextBuffer(child.EnumLabels)
			count = langruntime.CheckedI32(child.EnumCount)
		}
		context := RangeBoundContextBranch(profile, node.Child)
		value := MakeCoercedRangeValue(RangePayload{TypeName: payload.TypeName, ElementType: payload.ElementType, ElementKind: payload.ElementKind, EnumLabels: string(labels), EnumCount: count, BoundProfile: context, Support: MakeRangeSupport(child.Comparison, node.Canonical), Empty: payload.Empty, LowerInclusive: payload.LowerInclusive, UpperInclusive: payload.UpperInclusive, Bounds: payload.Bounds})
		return ArrayElementFromRange(value)
	}
	if input.Kind == ArrayElementMultirange {
		payload := CopyMultirangePayload(input.Multirange)
		member := CopyRangeBoundProfile(profile.Nodes[node.Child])
		child := CopyRangeBoundProfile(profile.Nodes[member.Child])
		if payload.TypeName != node.TypeName || payload.RangeType != node.ElementType || payload.ElementType != member.ElementType || payload.ElementKind != child.Kind {
			return ArrayElementUnresolved(unresolvedFlavor)
		}
		ranges := []RangeValue{}
		position := 0
		for position < len(payload.Ranges) {
			original := ArrayElementFromRange(CopyRangeValue(payload.Ranges[position]))
			prepared := rangeProfiledValueAt(original, profile, node.Child)
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(ArrayElementToRange(prepared)))
			position = langruntime.CheckedAdd(position, 1)
		}
		return ArrayElementFromMultirange(MultirangeFromProfiledRanges(payload.TypeName, payload.RangeType, payload.ElementType, payload.ElementKind, ranges, MakeRangeSupport(child.Comparison, member.Canonical)))
	}
	if rangeBoundValueValid(CopyArrayElement(input), node.TypeName == "pg_catalog.cidr") && RangeEnumBoundValid(CopyArrayElement(input), node.EnumCount) {
		return CompositePrepareScalarCell(input)
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func RangePrepareProfiledBound(input ArrayElement, profile *RangeBoundContext) ArrayElement {
	input = CopyArrayElement(input)
	profile = langruntime.CheckedBorrowed(profile, CopyRangeBoundContext)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if RangeBoundProfileValid(profile) == false {
		return ArrayElementUnresolved(unresolvedFlavor)
	}
	nested := false
	index := 0
	for index < len(profile.Nodes) {
		if profile.Nodes[index].Kind >= 42 {
			nested = true
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	prepared := input
	if nested == false {
		if prepared.Kind == ArrayElementArray {
			payload := CopyArrayPayload(prepared.Array)
			prepared = CopyArrayElement(ArrayElementFromArray(MakeArrayValue(payload)))
		}
	}
	return rangeProfiledValueAt(prepared, profile, 0)
}
func rangeBoundWordValid(value int) bool {
	value = langruntime.CheckedI32(value)
	return value >= 0 && value <= 65535
}
func rangeBoundValueValid(input ArrayElement, cidr bool) bool {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementTsquery {
		value := CopyTsqueryPayload(input.Tsquery)
		checked := MakeTsqueryValue(value)
		if checked.Kind == TsqueryValueValue {
			return true
		}
		return false
	}
	if input.Kind == ArrayElementTsvector {
		value := CopyTsvectorPayload(input.Tsvector)
		checked := MakeTsvectorValue(value)
		if checked.Kind == TsvectorValueValue {
			return true
		}
		return false
	}
	if input.Kind == ArrayElementAclitemCatalog {
		value := input.AclitemCatalog
		return MakeAclitemCatalogValue(value.Privileges, value.GrantOptions, value.PublicGrantee, value.InvalidGrantor) != (AclitemValue{Kind: AclitemValueUnknown}) && MakeAclitemCatalogValue(value.Privileges, value.GrantOptions, value.PublicGrantee, value.InvalidGrantor) != (AclitemValue{Kind: AclitemValueUnimplemented})
	}
	if input.Kind == ArrayElementAclitem {
		value := input.Aclitem
		return MakeAclitemValue(value.Grantee, value.Grantor, value.Privileges, value.GrantOptions) != (AclitemValue{Kind: AclitemValueUnknown}) && MakeAclitemValue(value.Grantee, value.Grantor, value.Privileges, value.GrantOptions) != (AclitemValue{Kind: AclitemValueUnimplemented})
	}
	if input.Kind == ArrayElementInt2 {
		value := langruntime.CheckedI32(input.Int2)
		return MakeInt2Value(value) != (Int2Value{Kind: Int2ValueUnknown}) && MakeInt2Value(value) != (Int2Value{Kind: Int2ValueUnimplemented})
	}
	if input.Kind == ArrayElementBit {
		value := langruntime.CheckedString(input.Bit)
		return MakeBitValue(value) != (BitValue{Kind: BitValueUnknown}) && MakeBitValue(value) != (BitValue{Kind: BitValueUnimplemented})
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
		return MakeTimeValue(value) != (TimeValue{Kind: TimeValueUnknown}) && MakeTimeValue(value) != (TimeValue{Kind: TimeValueUnimplemented})
	}
	if input.Kind == ArrayElementTimetz {
		value := input.Timetz
		return MakeTimetzValue(value.Time, value.Zone) != (TimetzValue{Kind: TimetzValueUnknown}) && MakeTimetzValue(value.Time, value.Zone) != (TimetzValue{Kind: TimetzValueUnimplemented})
	}
	if input.Kind == ArrayElementInternalChar {
		value := langruntime.CheckedI32(input.InternalChar)
		return MakeInternalCharValue(value) != (InternalCharValue{Kind: InternalCharValueUnknown}) && MakeInternalCharValue(value) != (InternalCharValue{Kind: InternalCharValueUnimplemented})
	}
	if input.Kind == ArrayElementOid {
		value := input.Oid
		return MakeOidValue(value) != (OidValue{Kind: OidValueUnknown}) && MakeOidValue(value) != (OidValue{Kind: OidValueUnimplemented})
	}
	if input.Kind == ArrayElementTid {
		value := input.Tid
		return MakeTidValue(value) != (TidValue{Kind: TidValueUnknown}) && MakeTidValue(value) != (TidValue{Kind: TidValueUnimplemented})
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
		return (cidr == false || NetworkCidrHostBitsZero(value)) && rangeBoundWordValid(value.Word0) && rangeBoundWordValid(value.Word1) && rangeBoundWordValid(value.Word2) && rangeBoundWordValid(value.Word3) && rangeBoundWordValid(value.Word4) && rangeBoundWordValid(value.Word5) && rangeBoundWordValid(value.Word6) && rangeBoundWordValid(value.Word7)
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
	unresolvedFlavor := 0
	value := input
	if value.ElementKind != 6 {
		value = CopyRangePayload(rangePayloadWithDefinition(value, "", langruntime.CheckedSignedNegate(1)))
	}
	if RangeEnumDefinitionValid(value.EnumLabels, value.EnumCount) == false {
		return RangeUnresolved(unresolvedFlavor)
	}
	if value.ElementKind < 41 || value.ElementKind >= 45 {
		emptyProfile := EmptyRangeBoundContext()
		value = CopyRangePayload(rangePayloadWithBoundProfile(value, emptyProfile))
	}
	boundProfile := CopyRangeBoundContext(value.BoundProfile)
	if RangeBoundProfileValid(&boundProfile) == false {
		return RangeUnresolved(unresolvedFlavor)
	}
	if len(value.BoundProfile.Nodes) > 0 && value.BoundProfile.Nodes[0].Kind != value.ElementKind {
		return RangeUnresolved(unresolvedFlavor)
	}
	support := value.Support
	if value.TypeName == "" || value.ElementType == "" || value.ElementKind < 1 {
		return RangeUnresolved(unresolvedFlavor)
	}
	if RangeSupportEqual(support, RangeUnknownSupport()) {
		support = RangeBuiltinSupport(value.TypeName, value.ElementType, value.ElementKind)
	}
	if RangeSupportValid(support, value.ElementKind) == false {
		return RangeUnresolved(unresolvedFlavor)
	}
	expected := RangeBuiltinSupport(value.TypeName, value.ElementType, value.ElementKind)
	if RangeSupportEqual(expected, RangeUnknownSupport()) == false && RangeSupportEqual(support, expected) == false {
		return RangeUnresolved(unresolvedFlavor)
	}
	if value.Empty {
		if len(value.Bounds) != 0 || value.LowerInclusive || value.UpperInclusive {
			return RangeUnresolved(unresolvedFlavor)
		}
		return RangeValue{Kind: RangeValueValue, Value: rangePayloadWithSupport(value, support)}
	}
	if len(value.Bounds) != 2 {
		return RangeUnresolved(unresolvedFlavor)
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
			return RangeUnresolved(unresolvedFlavor)
		}
		if rangeBoundValueValid(CopyArrayElement(bound), RangeSupportIsCidr(support) || value.ElementType == "pg_catalog.cidr") == false {
			return RangeUnresolved(unresolvedFlavor)
		}
		if RangeEnumBoundValid(CopyArrayElement(bound), value.EnumCount) == false {
			return RangeUnresolved(unresolvedFlavor)
		}
		if bound.Kind == ArrayElementNull {
			if (index == 0 && value.LowerInclusive) || (index == 1 && value.UpperInclusive) {
				return RangeUnresolved(unresolvedFlavor)
			}
		}
		if value.ElementKind >= 41 && value.ElementKind <= 44 && kind != 0 {
			normalized := RangePrepareProfiledBound(CopyArrayElement(bound), &boundProfile)
			if normalized.Kind == ArrayElementError {
				error := normalized.Error
				return RangeValue{Kind: RangeValueError, Error: error}
			}
			conditionFlavor93412 := unresolvedFlavor
			if normalized.Kind == ArrayElementUnknown {
				if conditionFlavor93412 < 1 {
					conditionFlavor93412 = langruntime.CheckedI32(1)
				}
			}
			if normalized.Kind == ArrayElementUnknown {
				return RangeUnresolved(conditionFlavor93412)
			}
			conditionFlavor934103 := unresolvedFlavor
			if normalized.Kind == ArrayElementUnimplemented {
				conditionFlavor934103 = langruntime.CheckedI32(2)
			}
			if normalized.Kind == ArrayElementUnimplemented {
				return RangeUnresolved(conditionFlavor934103)
			}
			value.Bounds[index] = CopyArrayElement(normalized)
		}
		if bound.Kind == ArrayElementJsonb {
			payload := CopyJsonbPayload(bound.Jsonb)
			normalized := JsonbFromCoercedValue(JsonbValue{Kind: JsonbValueValue, Value: payload})
			normalizedFlavor := unresolvedFlavor
			if normalized.Kind == JsonbValueUnknown {
				if normalizedFlavor < 1 {
					normalizedFlavor = langruntime.CheckedI32(1)
				}
			}
			if normalized.Kind == JsonbValueUnimplemented {
				normalizedFlavor = langruntime.CheckedI32(2)
			}
			known := false
			if normalized.Kind == JsonbValueValue {
				payload := CopyJsonbPayload(normalized.Value)
				value.Bounds[index] = CopyArrayElement(ArrayElement{Kind: ArrayElementJsonb, Jsonb: payload})
				known = true
			}
			if known == false {
				return RangeUnresolved(normalizedFlavor)
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
	return RangeFromDefinedBounds(typeName, elementType, elementKind, empty, lowerInclusive, upperInclusive, lower, upper, support, "", langruntime.CheckedSignedNegate(1))
}
func RangeFromDefinedBounds(typeName string, elementType string, elementKind int, empty bool, lowerInclusive bool, upperInclusive bool, lower ArrayElement, upper ArrayElement, support RangeSupport, enumLabels string, enumCount int) RangeValue {
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	lower = CopyArrayElement(lower)
	upper = CopyArrayElement(upper)
	enumLabels = langruntime.CheckedString(enumLabels)
	enumCount = langruntime.CheckedI32(enumCount)
	profile := EmptyRangeBoundContext()
	return RangeFromTypedBounds(typeName, elementType, elementKind, empty, lowerInclusive, upperInclusive, lower, upper, support, enumLabels, enumCount, profile)
}
func RangeFromTypedBounds(typeName string, elementType string, elementKind int, empty bool, lowerInclusive bool, upperInclusive bool, lower ArrayElement, upper ArrayElement, support RangeSupport, enumLabels string, enumCount int, boundProfile RangeBoundContext) RangeValue {
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	lower = CopyArrayElement(lower)
	upper = CopyArrayElement(upper)
	enumLabels = langruntime.CheckedString(enumLabels)
	enumCount = langruntime.CheckedI32(enumCount)
	boundProfile = CopyRangeBoundContext(boundProfile)
	bounds := []ArrayElement{}
	if empty == false {
		langruntime.CheckedAdd(len(bounds), 1)
		bounds = append(bounds, CopyArrayElement(lower))
		langruntime.CheckedAdd(len(bounds), 1)
		bounds = append(bounds, CopyArrayElement(upper))
	}
	return MakeCoercedRangeValue(RangePayload{TypeName: typeName, ElementType: elementType, ElementKind: elementKind, EnumLabels: enumLabels, EnumCount: enumCount, BoundProfile: boundProfile, Support: support, Empty: empty, LowerInclusive: lowerInclusive, UpperInclusive: upperInclusive, Bounds: bounds})
}
func RangeRequireType(input RangeValue, typeName string, elementType string, elementKind int) RangeValue {
	input = CopyRangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		if value.TypeName != typeName || value.ElementType != elementType || value.ElementKind != elementKind {
			return RangeUnresolved(unresolvedFlavor)
		}
		expected := RangeBuiltinSupport(typeName, elementType, elementKind)
		if RangeSupportEqual(expected, RangeUnknownSupport()) == false && RangeSupportEqual(value.Support, expected) == false {
			return RangeUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueValue {
		payload := CopyRangePayload(input.Value)
		if payload.TypeName != typeName || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return RangeUnresolved(unresolvedFlavor)
		}
		support := RangeSupport{Comparison: comparison, Canonical: canonical}
		return MakeCoercedRangeValue(rangePayloadWithSupport(payload, support))
	}
	return input
}
func RangeFromCoercedDefinedProfile(input RangeValue, typeName string, elementType string, elementKind int, comparison int, canonical int, labels string, count int) RangeValue {
	input = CopyRangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueValue {
		payload := CopyRangePayload(input.Value)
		if payload.TypeName != typeName || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return RangeUnresolved(unresolvedFlavor)
		}
		defined := rangePayloadWithDefinition(payload, labels, count)
		return MakeCoercedRangeValue(rangePayloadWithSupport(defined, MakeRangeSupport(comparison, canonical)))
	}
	return input
}
func RangeFromCoercedTypedProfile(input RangeValue, typeName string, elementType string, elementKind int, comparison int, canonical int, boundProfile RangeBoundContext) RangeValue {
	input = CopyRangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	boundProfile = CopyRangeBoundContext(boundProfile)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueValue {
		payload := CopyRangePayload(input.Value)
		if payload.TypeName != typeName || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return RangeUnresolved(unresolvedFlavor)
		}
		typed := rangePayloadWithBoundProfile(payload, boundProfile)
		return MakeCoercedRangeValue(rangePayloadWithSupport(typed, MakeRangeSupport(comparison, canonical)))
	}
	return input
}
func RangeRequireSupport(input RangeValue, expected RangeSupport) RangeValue {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueValue {
		value := CopyRangePayload(input.Value)
		if RangeSupportEqual(value.Support, expected) == false {
			return RangeUnresolved(unresolvedFlavor)
		}
		return RangeValue{Kind: RangeValueValue, Value: value}
	}
	return input
}
func RangeIsNull(input RangeValue) BoolValue {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor11554 := unresolvedFlavor
	if input.Kind == RangeValueUnknown {
		if conditionFlavor11554 < 1 {
			conditionFlavor11554 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == RangeValueUnknown {
		return BoolUnresolved(conditionFlavor11554)
	}
	conditionFlavor11577 := unresolvedFlavor
	if input.Kind == RangeValueUnimplemented {
		conditionFlavor11577 = langruntime.CheckedI32(2)
	}
	if input.Kind == RangeValueUnimplemented {
		return BoolUnresolved(conditionFlavor11577)
	}
	if input.Kind == RangeValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func RangeFromCaseGuard(input CheckOutcome) RangeValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	return RangeUnresolved(unresolvedFlavor)
}
func RangeEmptyState(input RangeValue) BoolValue {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}
func RangeBound(input RangeValue, upper bool) ArrayElement {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func RangeBoundFlag(input RangeValue, upper bool, infinite bool) BoolValue {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
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
func MultirangePayloadWithRanges(input MultirangePayload, ranges []RangeValue) MultirangePayload {
	input = CopyMultirangePayload(input)
	ranges = langruntime.CheckedStructs(ranges, CopyRangeValue)
	return MultirangePayload{TypeName: input.TypeName, RangeType: input.RangeType, ElementType: input.ElementType, ElementKind: input.ElementKind, Support: input.Support, Ranges: ranges}
}

type MultirangeValueKind uint8

const (
	MultirangeValueUnknown MultirangeValueKind = iota
	MultirangeValueUnimplemented
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
	case MultirangeValueUnimplemented:
		return MultirangeValue{Kind: MultirangeValueUnimplemented}
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

func CopyMultirangeTextPlan(value MultirangeTextPlan) MultirangeTextPlan {
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
	unresolvedFlavor := 0
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
	memberFlavor := unresolvedFlavor
	if supported.Kind == RangeValueUnknown {
		memberFlavor = langruntime.CheckedI32(1)
	}
	if supported.Kind == RangeValueValue {
		payload := CopyRangePayload(supported.Value)
		if payload.Empty {
			return RangeUnresolved(unresolvedFlavor)
		}
		return RangeValue{Kind: RangeValueValue, Value: payload}
	}
	return RangeUnresolved(memberFlavor)
}
func MakeCoercedMultirangeValue(input MultirangePayload) MultirangeValue {
	input = CopyMultirangePayload(input)
	unresolvedFlavor := 0
	payload := input
	support := payload.Support
	if payload.TypeName == "" || payload.RangeType == "" || payload.ElementType == "" || payload.ElementKind < 1 {
		return MultirangeUnresolved(unresolvedFlavor)
	}
	expected := RangeBuiltinSupport(payload.RangeType, payload.ElementType, payload.ElementKind)
	if RangeSupportEqual(support, RangeUnknownSupport()) {
		support = expected
	}
	if RangeSupportValid(support, payload.ElementKind) == false {
		return MultirangeUnresolved(unresolvedFlavor)
	}
	if RangeSupportEqual(expected, RangeUnknownSupport()) == false && RangeSupportEqual(support, expected) == false {
		return MultirangeUnresolved(unresolvedFlavor)
	}
	ranges := []RangeValue{}
	index := 0
	for index < len(payload.Ranges) {
		member := multirangeComponent(&payload, index, support)
		if member.Kind == RangeValueError {
			error := member.Error
			return MultirangeValue{Kind: MultirangeValueError, Error: error}
		}
		memberFlavor := unresolvedFlavor
		if member.Kind == RangeValueUnknown {
			if memberFlavor < 1 {
				memberFlavor = langruntime.CheckedI32(1)
			}
		}
		if member.Kind == RangeValueUnimplemented {
			memberFlavor = langruntime.CheckedI32(2)
		}
		known := false
		if member.Kind == RangeValueValue {
			span := CopyRangePayload(member.Value)
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(RangeValue{Kind: RangeValueValue, Value: span}))
			known = true
		}
		if known == false {
			return MultirangeUnresolved(memberFlavor)
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
func MultirangeFromCoercedArray(input ArrayValue, typeName string, rangeType string, elementType string, elementKind int, support RangeSupport) MultirangeValue {
	input = CopyArrayValue(input)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	coerced := ArrayFromCoercedValue(input, rangeType, 42)
	if coerced.Kind == ArrayValueError {
		error := coerced.Error
		return MultirangeValue{Kind: MultirangeValueError, Error: error}
	}
	if coerced.Kind == ArrayValueValue {
		payload := CopyArrayPayload(coerced.Value)
		if payload.ElementType != rangeType || payload.ElementKind != 42 || len(payload.Dimensions) > 1 {
			return MultirangeUnresolved(unresolvedFlavor)
		}
		ranges := []RangeValue{}
		index := 0
		for index < len(payload.Elements) {
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(ArrayElementToRange(CopyArrayElement(payload.Elements[index]))))
			index = langruntime.CheckedAdd(index, 1)
		}
		return MultirangeFromProfiledRanges(typeName, rangeType, elementType, elementKind, ranges, support)
	}
	return MultirangeUnresolved(unresolvedFlavor)
}
func MultirangeFromCoercedProfile(input MultirangeValue, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int) MultirangeValue {
	input = CopyMultirangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	return MultirangeFromCoercedDefinedProfile(input, typeName, rangeType, elementType, elementKind, comparison, canonical, "", langruntime.CheckedSignedNegate(1))
}
func MultirangeFromCoercedDefinedProfile(input MultirangeValue, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int, labels string, count int) MultirangeValue {
	input = CopyMultirangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if payload.TypeName != typeName || payload.RangeType != rangeType || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return MultirangeUnresolved(unresolvedFlavor)
		}
		ranges := payload.Ranges
		index := 0
		for index < len(ranges) {
			if count >= 0 {
				ranges[index] = CopyRangeValue(RangeFromCoercedDefinedProfile(CopyRangeValue(ranges[index]), rangeType, elementType, elementKind, comparison, canonical, labels, count))
			} else {
				ranges[index] = CopyRangeValue(RangeFromCoercedProfile(CopyRangeValue(ranges[index]), rangeType, elementType, elementKind, comparison, canonical))
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		return MultirangeFromProfiledRanges(typeName, rangeType, elementType, elementKind, ranges, RangeSupport{Comparison: comparison, Canonical: canonical})
	}
	return input
}
func MultirangeFromCoercedTypedProfile(input MultirangeValue, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int, boundProfile RangeBoundContext) MultirangeValue {
	input = CopyMultirangeValue(input)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	boundProfile = CopyRangeBoundContext(boundProfile)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if payload.TypeName != typeName || payload.RangeType != rangeType || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return MultirangeUnresolved(unresolvedFlavor)
		}
		ranges := payload.Ranges
		index := 0
		for index < len(ranges) {
			ranges[index] = CopyRangeValue(RangeFromCoercedTypedProfile(CopyRangeValue(ranges[index]), rangeType, elementType, elementKind, comparison, canonical, CopyRangeBoundContext(boundProfile)))
			index = langruntime.CheckedAdd(index, 1)
		}
		return MultirangeFromProfiledRanges(typeName, rangeType, elementType, elementKind, ranges, MakeRangeSupport(comparison, canonical))
	}
	return input
}
func MultirangeRequireSupport(input MultirangeValue, expected RangeSupport) MultirangeValue {
	input = CopyMultirangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if RangeSupportEqual(payload.Support, expected) == false {
			return MultirangeUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == MultirangeValueValue {
		payload := CopyMultirangePayload(input.Value)
		if payload.TypeName != typeName || payload.RangeType != rangeType || payload.ElementType != elementType || payload.ElementKind != elementKind {
			return MultirangeUnresolved(unresolvedFlavor)
		}
		return MakeCoercedMultirangeValue(payload)
	}
	return input
}
func MultirangeIsNull(input MultirangeValue) BoolValue {
	input = CopyMultirangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}
func MultirangeFromCaseGuard(input CheckOutcome) MultirangeValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return MultirangeValue{Kind: MultirangeValueError, Error: error}
	}
	return MultirangeUnresolved(unresolvedFlavor)
}
func MultirangeEmptyState(input MultirangeValue) BoolValue {
	input = CopyMultirangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return RangeUnresolved(unresolvedFlavor)
}
func MultirangeBound(input MultirangeValue, upper bool) ArrayElement {
	input = CopyMultirangeValue(input)
	boundary := MultirangeBoundary(input, upper)
	return RangeBound(boundary, upper)
}
func MultirangeBoundFlag(input MultirangeValue, upper bool, infinite bool) BoolValue {
	input = CopyMultirangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}
func DomainConversionStart(input BoolValue, notNull bool) CheckOutcome {
	unresolvedFlavor := 0
	if input.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == BoolValueError {
		error := input.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if input != (BoolValue{Kind: BoolValueValue, Value: true}) && input != (BoolValue{Kind: BoolValueValue, Value: false}) {
		return CheckUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	conditionFlavor454 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor454 < 1 {
			conditionFlavor454 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor454 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return ArrayElementUnresolved(conditionFlavor454)
	}
	return input
}
func FinishXmlDomainConversion(input XmlValue, result CheckOutcome) XmlValue {
	unresolvedFlavor := 0
	if input.Kind == XmlValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == XmlValueNonNull {
		knowledge := input.NonNull
		_ = knowledge
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == XmlValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return XmlValue{Kind: XmlValueError, Error: error}
	}
	conditionFlavor604 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor604 < 1 {
			conditionFlavor604 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor604 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return XmlUnresolved(conditionFlavor604)
	}
	return input
}
func FinishDomainArrayInput(input ArrayTextPayload, converted ArrayArguments) ArrayValue {
	input = CopyArrayTextPayload(input)
	converted = CopyArrayArguments(converted)
	unresolvedFlavor := 0
	if converted.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if converted.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	conditionFlavor704 := unresolvedFlavor
	if converted.Kind == ArrayArgumentsUnknown {
		if conditionFlavor704 < 1 {
			conditionFlavor704 = langruntime.CheckedI32(1)
		}
	}
	if converted.Kind == ArrayArgumentsUnknown {
		return ArrayUnresolved(conditionFlavor704)
	}
	conditionFlavor727 := unresolvedFlavor
	if converted.Kind == ArrayArgumentsUnimplemented {
		conditionFlavor727 = langruntime.CheckedI32(2)
	}
	if converted.Kind == ArrayArgumentsUnimplemented {
		return ArrayUnresolved(conditionFlavor727)
	}
	return FinishPreparedArrayText(input, converted)
}
func FinishArrayDomainConversion(input ArrayValue, result CheckOutcome) ArrayValue {
	input = CopyArrayValue(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	conditionFlavor874 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor874 < 1 {
			conditionFlavor874 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor874 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return ArrayUnresolved(conditionFlavor874)
	}
	return input
}
func FinishRangeDomainConversion(input RangeValue, result CheckOutcome) RangeValue {
	input = CopyRangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == RangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == RangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return RangeValue{Kind: RangeValueError, Error: error}
	}
	conditionFlavor1024 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor1024 < 1 {
			conditionFlavor1024 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor1024 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return RangeUnresolved(conditionFlavor1024)
	}
	return input
}
func FinishMultirangeDomainConversion(input MultirangeValue, result CheckOutcome) MultirangeValue {
	input = CopyMultirangeValue(input)
	unresolvedFlavor := 0
	if input.Kind == MultirangeValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == MultirangeValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return MultirangeValue{Kind: MultirangeValueError, Error: error}
	}
	conditionFlavor1204 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor1204 < 1 {
			conditionFlavor1204 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor1204 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return MultirangeUnresolved(conditionFlavor1204)
	}
	return input
}
func FinishTsvectorDomainConversion(input TsvectorValue, result CheckOutcome) TsvectorValue {
	input = CopyTsvectorValue(input)
	unresolvedFlavor := 0
	if input.Kind == TsvectorValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TsvectorValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return TsvectorValue{Kind: TsvectorValueError, Error: error}
	}
	conditionFlavor1334 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor1334 < 1 {
			conditionFlavor1334 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor1334 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return TsvectorUnresolved(conditionFlavor1334)
	}
	return input
}
func FinishTsqueryDomainConversion(input TsqueryValue, result CheckOutcome) TsqueryValue {
	input = CopyTsqueryValue(input)
	unresolvedFlavor := 0
	if input.Kind == TsqueryValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TsqueryValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == CheckOutcomeError {
		error := result.Error
		return TsqueryValue{Kind: TsqueryValueError, Error: error}
	}
	conditionFlavor1444 := unresolvedFlavor
	if result.Kind == CheckOutcomeUnknown {
		if conditionFlavor1444 < 1 {
			conditionFlavor1444 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == CheckOutcomeUnimplemented {
		conditionFlavor1444 = langruntime.CheckedI32(2)
	}
	if result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return TsqueryUnresolved(conditionFlavor1444)
	}
	return input
}

type ArrayDimension struct {
	Lower  int
	Length int
}

func CopyArrayDimension(value ArrayDimension) ArrayDimension {
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
	return ArrayPayload{NullBitmap: value.NullBitmap, ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Dimensions: langruntime.CheckedStructs(value.Dimensions, CopyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement)}
}

type ArrayValueKind uint8

const (
	ArrayValueUnknown ArrayValueKind = iota
	ArrayValueUnimplemented
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
	case ArrayValueUnimplemented:
		return ArrayValue{Kind: ArrayValueUnimplemented}
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
	ArrayArgumentsUnimplemented
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
	case ArrayArgumentsUnimplemented:
		return ArrayArguments{Kind: ArrayArgumentsUnimplemented}
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
	return ArrayOutputPayload{NullBitmap: value.NullBitmap, State: langruntime.CheckedI32(value.State), Error: value.Error, Dimensions: langruntime.CheckedStructs(value.Dimensions, CopyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement)}
}

type ArrayOutputPlanKind uint8

const (
	ArrayOutputPlanValue ArrayOutputPlanKind = iota
)

type ArrayOutputPlan struct {
	Kind  ArrayOutputPlanKind
	Value ArrayOutputPayload
}

func CopyArrayOutputPlan(value ArrayOutputPlan) ArrayOutputPlan {
	switch value.Kind {
	case ArrayOutputPlanValue:
		return ArrayOutputPlan{Kind: ArrayOutputPlanValue, Value: CopyArrayOutputPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func ArrayValueValidity(input BoolValue, unknownValid bool) CheckOutcome {
	unresolvedFlavor := 0
	if input.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == BoolValueError {
		error := input.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	conditionFlavor544 := unresolvedFlavor
	if input.Kind == BoolValueUnknown {
		if conditionFlavor544 < 1 {
			conditionFlavor544 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BoolValueUnimplemented {
		conditionFlavor544 = langruntime.CheckedI32(2)
	}
	if (input == (BoolValue{Kind: BoolValueUnknown}) || input == (BoolValue{Kind: BoolValueUnimplemented})) && unknownValid == false {
		return CheckUnresolved(conditionFlavor544)
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func ArrayValidityFinish(left CheckOutcome, right CheckOutcome) CheckOutcome {
	if left == (CheckOutcome{Kind: CheckOutcomeUnknown}) && right == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return right
	}
	if left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || left == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return left
	}
	if left.Kind == CheckOutcomeError {
		return left
	}
	return right
}
func ArrayValidityResult(validity CheckOutcome, result CheckOutcome) CheckOutcome {
	if validity == (CheckOutcome{Kind: CheckOutcomeUnknown}) && result == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return result
	}
	if CaseGuardStops(validity) {
		return validity
	}
	return result
}
func ArrayValidityUnknown(input CheckOutcome) bool {
	return input == (CheckOutcome{Kind: CheckOutcomeUnknown}) || input == (CheckOutcome{Kind: CheckOutcomeUnimplemented})
}
func ArrayValidityPossible(input CheckOutcome) CheckOutcome {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	conditionFlavor784 := unresolvedFlavor
	if input.Kind == CheckOutcomeUnknown {
		if conditionFlavor784 < 1 {
			conditionFlavor784 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == CheckOutcomeUnimplemented {
		conditionFlavor784 = langruntime.CheckedI32(2)
	}
	if input == (CheckOutcome{Kind: CheckOutcomeUnknown}) || input == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return CheckUnresolved(conditionFlavor784)
	}
	if input.Kind == CheckOutcomeError {
		return CheckUnresolved(unresolvedFlavor)
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}
func ArrayValidityPossibleUnder(input CheckOutcome, guard CheckOutcome) CheckOutcome {
	if input.Kind == CheckOutcomeError {
		if guard == (CheckOutcome{Kind: CheckOutcomeUnknown}) {
			return CheckUnresolved(1)
		}
		return CheckUnresolved(2)
	}
	return ArrayValidityPossible(input)
}
func ArrayConstructorFromValidity(input ArrayValue, validity CheckOutcome) ArrayValue {
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if validity.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if validity.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if validity.Kind == CheckOutcomeError {
		error := validity.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	conditionFlavor994 := unresolvedFlavor
	if validity.Kind == CheckOutcomeUnknown {
		if conditionFlavor994 < 1 {
			conditionFlavor994 = langruntime.CheckedI32(1)
		}
	}
	if validity.Kind == CheckOutcomeUnimplemented {
		conditionFlavor994 = langruntime.CheckedI32(2)
	}
	if validity == (CheckOutcome{Kind: CheckOutcomeUnknown}) || validity == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return ArrayUnresolved(conditionFlavor994)
	}
	return input
}
func ArrayCastValidity(input ArrayElement, source string, target string, alwaysValid bool) CheckOutcome {
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
		return CheckUnresolved(ResolutionContext(unresolvedFlavor))
	}
	return CheckUnresolved(unresolvedFlavor)
}
func AppendArrayCastConversion(input ArrayOutputPayload, element ArrayElement, validity CheckOutcome) ArrayOutputPayload {
	if element.Kind == ArrayElementUnknown {
		if validity.Kind == CheckOutcomeError {
			error := validity.Error
			return AppendArrayConversion(input, ArrayElement{Kind: ArrayElementError, Error: error}, true)
		}
		return AppendArrayConversion(input, element, validity == (CheckOutcome{Kind: CheckOutcomeTrue}))
	}
	if element.Kind == ArrayElementUnimplemented {
		if validity.Kind == CheckOutcomeError {
			error := validity.Error
			return AppendArrayConversion(input, ArrayElement{Kind: ArrayElementError, Error: error}, true)
		}
		return AppendArrayConversion(input, element, validity == (CheckOutcome{Kind: CheckOutcomeTrue}))
	}
	return AppendArrayConversion(input, element, true)
}
func ArrayOutputFlavor(state int, flavor int) int {
	if state == langruntime.CheckedSignedNegate(1) || flavor == 2 {
		return 2
	}
	if state == langruntime.CheckedSignedNegate(3) {
		return 1
	}
	return flavor
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
			state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(3))
		}
		if element.Kind == ArrayElementUnimplemented {
			state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
	}
	if state == langruntime.CheckedSignedNegate(3) && unknownValid == false {
		if element.Kind == ArrayElementUnimplemented {
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
	unresolvedFlavor := 0
	if input.State == langruntime.CheckedSignedNegate(2) {
		return ArrayArguments{Kind: ArrayArgumentsError, Error: input.Error}
	}
	if input.State != 1 {
		return ArrayArgumentsUnresolved(ArrayOutputFlavor(input.State, unresolvedFlavor))
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
	if input.Kind == ArrayValueUnknown {
		state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(3))
	}
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
	unresolvedFlavor := 0
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if index.Kind == Int4ValueValue {
		offset := langruntime.CheckedI32(index.Value)
		position := langruntime.IndexFromI32(offset, len(input.Elements))
		if offset >= 0 && position < len(input.Elements) {
			return CopyArrayElement(input.Elements[position])
		}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayUnknown() ArrayValue {
	return ArrayValue{Kind: ArrayValueUnknown}
}
func ArrayNull() ArrayValue {
	return ArrayValue{Kind: ArrayValueNull}
}
func ArrayIsNull(input ArrayValue) BoolValue {
	input = CopyArrayValue(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueError {
		error := input.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor3214 := unresolvedFlavor
	if input.Kind == ArrayValueUnknown {
		if conditionFlavor3214 < 1 {
			conditionFlavor3214 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == ArrayValueUnknown {
		return BoolUnresolved(conditionFlavor3214)
	}
	conditionFlavor3237 := unresolvedFlavor
	if input.Kind == ArrayValueUnimplemented {
		conditionFlavor3237 = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueUnimplemented {
		return BoolUnresolved(conditionFlavor3237)
	}
	if input.Kind == ArrayValueNull {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func ArrayFromCaseGuard(input CheckOutcome) ArrayValue {
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == CheckOutcomeError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	return ArrayUnresolved(unresolvedFlavor)
}
func arrayCoercedOwnedElement(element ArrayElement) ArrayElement {
	element = CopyArrayElement(element)
	if element.Kind == ArrayElementTsquery {
		value := CopyTsqueryPayload(element.Tsquery)
		return ArrayElementFromTsquery(MakeTsqueryValue(value))
	}
	if element.Kind == ArrayElementTsvector {
		value := CopyTsvectorPayload(element.Tsvector)
		return ArrayElementFromTsvector(MakeTsvectorValue(value))
	}
	if element.Kind == ArrayElementAclitemCatalog {
		value := element.AclitemCatalog
		return ArrayElementFromAclitem(MakeAclitemCatalogValue(value.Privileges, value.GrantOptions, value.PublicGrantee, value.InvalidGrantor))
	}
	if element.Kind == ArrayElementAclitem {
		value := element.Aclitem
		return ArrayElementFromAclitem(MakeAclitemValue(value.Grantee, value.Grantor, value.Privileges, value.GrantOptions))
	}
	if element.Kind == ArrayElementXmlNonNull {
		value := element.XmlNonNull
		return ArrayElementFromXml(MakeXmlKnowledge(value.Document, value.Content))
	}
	if element.Kind == ArrayElementXml {
		value := langruntime.CheckedString(element.Xml)
		return ArrayElementFromXml(MakeXmlValue(value))
	}
	if element.Kind == ArrayElementXmlRenderedText {
		value := langruntime.CheckedString(element.XmlRenderedText)
		return ArrayElementFromXml(XmlFromRenderedText(TextValue{Kind: TextValueValue, Value: value}))
	}
	if element.Kind == ArrayElementComposite {
		payload := CopyCompositePayload(element.Composite)
		return ArrayElementFromComposite(MakeCompositeValue(payload))
	}
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
func ArrayDimensionsValid(dimensions []ArrayDimension, cells int) bool {
	dimensions = langruntime.CheckedStructs(dimensions, CopyArrayDimension)
	cells = langruntime.CheckedIndex(cells)
	if len(dimensions) > 6 {
		return false
	}
	count := int64(0)
	if len(dimensions) > 0 {
		count = int64(1)
	}
	position := 0
	for position < len(dimensions) {
		dimension := dimensions[position]
		if dimension.Length < 0 {
			return false
		}
		length := int64(langruntime.CheckedI32(dimension.Length))
		end := langruntime.CheckedI64Add((int64(langruntime.CheckedI32(dimension.Lower))), length)
		if end > int64(2147483648) || (length > int64(0) && count > langruntime.CheckedI64Divide(int64(2147483647), length)) {
			return false
		}
		if length == int64(0) && dimension.Lower == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
			return false
		}
		count = langruntime.CheckedI64Multiply(count, length)
		position = langruntime.CheckedAdd(position, 1)
	}
	return count == int64(langruntime.CheckedI32((int(int32(cells)))))
}
func MakeArrayValue(input ArrayPayload) ArrayValue {
	input = CopyArrayPayload(input)
	unresolvedFlavor := 0
	elements := input.Elements
	position := 0
	for position < len(elements) {
		checked := arrayCoercedOwnedElement(CopyArrayElement(elements[position]))
		if checked.Kind == ArrayElementError {
			error := checked.Error
			return ArrayValue{Kind: ArrayValueError, Error: error}
		}
		conditionFlavor3748 := unresolvedFlavor
		if checked.Kind == ArrayElementUnknown {
			if conditionFlavor3748 < 1 {
				conditionFlavor3748 = langruntime.CheckedI32(1)
			}
		}
		if checked.Kind == ArrayElementUnknown {
			family := ArrayElementFamily(CopyArrayElement(elements[position]))
			if (family >= 41 && family <= 44) || family == 46 || family == 47 || family == 48 {
				return ArrayUnresolved(conditionFlavor3748)
			}
		}
		conditionFlavor37911 := unresolvedFlavor
		if checked.Kind == ArrayElementUnimplemented {
			conditionFlavor37911 = langruntime.CheckedI32(2)
		}
		if checked.Kind == ArrayElementUnimplemented {
			family := ArrayElementFamily(CopyArrayElement(elements[position]))
			if (family >= 41 && family <= 44) || family == 46 || family == 47 || family == 48 {
				return ArrayUnresolved(conditionFlavor37911)
			}
		}
		elements[position] = CopyArrayElement(checked)
		position = langruntime.CheckedAdd(position, 1)
	}
	identity := []rune(input.ElementType)
	if len(identity) == 0 || input.ElementKind < 1 || input.ElementKind > 48 {
		return ArrayUnresolved(unresolvedFlavor)
	}
	position = langruntime.CheckedIndex(0)
	for position < len(identity) {
		if identity[position] == '\x00' {
			return ArrayUnresolved(unresolvedFlavor)
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	if len(input.Dimensions) > 6 {
		return ArrayUnresolved(unresolvedFlavor)
	}
	count := int64(0)
	if len(input.Dimensions) > 0 {
		count = int64(1)
	}
	position = langruntime.CheckedIndex(0)
	for position < len(input.Dimensions) {
		dimension := input.Dimensions[position]
		if dimension.Length < 0 {
			return ArrayUnresolved(unresolvedFlavor)
		}
		length := int64(langruntime.CheckedI32(dimension.Length))
		end := langruntime.CheckedI64Add((int64(langruntime.CheckedI32(dimension.Lower))), length)
		if end > int64(2147483648) || (length > int64(0) && count > langruntime.CheckedI64Divide(int64(2147483647), length)) {
			return ArrayUnresolved(unresolvedFlavor)
		}
		if length == int64(0) && dimension.Lower == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
			return ArrayUnresolved(unresolvedFlavor)
		}
		count = langruntime.CheckedI64Multiply(count, length)
		position = langruntime.CheckedAdd(position, 1)
	}
	if count != int64(langruntime.CheckedI32((int(int32(len(elements)))))) {
		return ArrayUnresolved(unresolvedFlavor)
	}
	position = langruntime.CheckedIndex(0)
	for position < len(elements) {
		kind := ArrayElementFamily(CopyArrayElement(elements[position]))
		if kind != 0 && kind != input.ElementKind {
			return ArrayUnresolved(unresolvedFlavor)
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	nullBitmap := input.NullBitmap
	if nullBitmap == (BoolValue{Kind: BoolValueNull}) {
		return ArrayUnresolved(unresolvedFlavor)
	}
	if nullBitmap.Kind == BoolValueError {
		return ArrayUnresolved(unresolvedFlavor)
	}
	position = langruntime.CheckedIndex(0)
	for position < len(elements) {
		element := CopyArrayElement(elements[position])
		if element.Kind == ArrayElementNull {
			if nullBitmap == (BoolValue{Kind: BoolValueValue, Value: false}) {
				return ArrayUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		if value.ElementType != elementType || value.ElementKind != elementKind {
			return ArrayUnresolved(unresolvedFlavor)
		}
		return MakeArrayValue(value)
	}
	return input
}
func CatalogVectorFromCoerced(input ArrayValue, oid bool) ArrayValue {
	input = CopyArrayValue(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		identity := langruntime.NewTextBuffer("pg_catalog.int2")
		kind := 1
		if oid {
			identity = langruntime.NewTextBuffer("pg_catalog.oid")
			kind = langruntime.CheckedI32(33)
		}
		if value.ElementType != string(identity) || value.ElementKind != kind {
			return ArrayUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		value := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&value, types, kinds, 0) == false {
			return ArrayUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayRangeIdentityValid(&payload, typeName, elementType, elementKind) == false {
			return ArrayUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayMultirangeIdentityValid(&payload, typeName, rangeType, elementType, elementKind) == false {
			return ArrayUnresolved(unresolvedFlavor)
		}
		return MakeArrayValue(payload)
	}
	return input
}
func arrayElementWithTypedRangeProfile(input ArrayElement, multirangeType string, rangeType string, elementType string, elementKind int, comparison int, canonical int, labels string, count int, boundProfile *RangeBoundContext) ArrayElement {
	input = CopyArrayElement(input)
	multirangeType = langruntime.CheckedString(multirangeType)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	if input.Kind == ArrayElementArray {
		nested := CopyArrayPayload(input.Array)
		converted := arrayWithTypedRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: nested}, multirangeType, rangeType, elementType, elementKind, comparison, canonical, labels, count, boundProfile)
		return ArrayElementFromArray(converted)
	}
	if input.Kind == ArrayElementRange {
		span := CopyRangePayload(input.Range)
		if len(boundProfile.Nodes) > 0 {
			return ArrayElementFromRange(RangeFromCoercedTypedProfile(RangeValue{Kind: RangeValueValue, Value: span}, rangeType, elementType, elementKind, comparison, canonical, RangeBoundContextSnapshot(boundProfile)))
		}
		if count >= 0 {
			return ArrayElementFromRange(RangeFromCoercedDefinedProfile(RangeValue{Kind: RangeValueValue, Value: span}, rangeType, elementType, elementKind, comparison, canonical, labels, count))
		}
		converted := RangeFromCoercedProfile(RangeValue{Kind: RangeValueValue, Value: span}, rangeType, elementType, elementKind, comparison, canonical)
		return ArrayElementFromRange(converted)
	}
	if input.Kind == ArrayElementMultirange {
		spans := CopyMultirangePayload(input.Multirange)
		if len(boundProfile.Nodes) > 0 {
			return ArrayElementFromMultirange(MultirangeFromCoercedTypedProfile(MultirangeValue{Kind: MultirangeValueValue, Value: spans}, multirangeType, rangeType, elementType, elementKind, comparison, canonical, RangeBoundContextSnapshot(boundProfile)))
		}
		if count >= 0 {
			return ArrayElementFromMultirange(MultirangeFromCoercedDefinedProfile(MultirangeValue{Kind: MultirangeValueValue, Value: spans}, multirangeType, rangeType, elementType, elementKind, comparison, canonical, labels, count))
		}
		converted := MultirangeFromCoercedProfile(MultirangeValue{Kind: MultirangeValueValue, Value: spans}, multirangeType, rangeType, elementType, elementKind, comparison, canonical)
		return ArrayElementFromMultirange(converted)
	}
	return input
}
func arrayWithTypedRangeProfile(input ArrayValue, multirangeType string, rangeType string, elementType string, elementKind int, comparison int, canonical int, labels string, count int, boundProfile *RangeBoundContext) ArrayValue {
	input = CopyArrayValue(input)
	multirangeType = langruntime.CheckedString(multirangeType)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
			if element.Kind == ArrayElementUnimplemented {
				convert = false
			}
			if convert {
				converted := arrayElementWithTypedRangeProfile(element, multirangeType, rangeType, elementType, elementKind, comparison, canonical, labels, count, boundProfile)
				if converted.Kind == ArrayElementError {
					error := converted.Error
					return ArrayValue{Kind: ArrayValueError, Error: error}
				}
				conditionFlavor81916 := unresolvedFlavor
				if converted.Kind == ArrayElementUnknown {
					if conditionFlavor81916 < 1 {
						conditionFlavor81916 = langruntime.CheckedI32(1)
					}
				}
				if converted.Kind == ArrayElementUnknown {
					return ArrayUnresolved(conditionFlavor81916)
				}
				conditionFlavor82119 := unresolvedFlavor
				if converted.Kind == ArrayElementUnimplemented {
					conditionFlavor82119 = langruntime.CheckedI32(2)
				}
				if converted.Kind == ArrayElementUnimplemented {
					return ArrayUnresolved(conditionFlavor82119)
				}
				elements[position] = CopyArrayElement(converted)
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		return MakeArrayValue(ArrayPayload{NullBitmap: payload.NullBitmap, ElementType: payload.ElementType, ElementKind: payload.ElementKind, Dimensions: payload.Dimensions, Elements: elements})
	}
	return input
}
func arrayWithRangeProfile(input ArrayValue, multirangeType string, rangeType string, elementType string, elementKind int, comparison int, canonical int, labels string, count int) ArrayValue {
	input = CopyArrayValue(input)
	multirangeType = langruntime.CheckedString(multirangeType)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	profile := EmptyRangeBoundContext()
	return arrayWithTypedRangeProfile(input, multirangeType, rangeType, elementType, elementKind, comparison, canonical, labels, count, &profile)
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
	return ArrayFromCoercedRangeDefinedProfileTree(input, types, kinds, typeName, elementType, elementKind, comparison, canonical, "", langruntime.CheckedSignedNegate(1))
}
func ArrayFromCoercedRangeDefinedProfileTree(input ArrayValue, types string, kinds string, typeName string, elementType string, elementKind int, comparison int, canonical int, labels string, count int) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayRangeIdentityValid(&payload, typeName, elementType, elementKind) == false {
			return ArrayUnresolved(unresolvedFlavor)
		}
		return arrayWithRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: payload}, "", typeName, elementType, elementKind, comparison, canonical, labels, count)
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
	return ArrayFromCoercedMultirangeDefinedProfileTree(input, types, kinds, typeName, rangeType, elementType, elementKind, comparison, canonical, "", langruntime.CheckedSignedNegate(1))
}
func ArrayFromCoercedMultirangeDefinedProfileTree(input ArrayValue, types string, kinds string, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int, labels string, count int) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	labels = langruntime.CheckedString(labels)
	count = langruntime.CheckedI32(count)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayMultirangeIdentityValid(&payload, typeName, rangeType, elementType, elementKind) == false {
			return ArrayUnresolved(unresolvedFlavor)
		}
		return arrayWithRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: payload}, typeName, rangeType, elementType, elementKind, comparison, canonical, labels, count)
	}
	return input
}
func ArrayFromCoercedRangeTypedProfileTree(input ArrayValue, types string, kinds string, typeName string, elementType string, elementKind int, comparison int, canonical int, boundProfile RangeBoundContext) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	boundProfile = CopyRangeBoundContext(boundProfile)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayRangeIdentityValid(&payload, typeName, elementType, elementKind) == false {
			return ArrayUnresolved(unresolvedFlavor)
		}
		return arrayWithTypedRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: payload}, "", typeName, elementType, elementKind, comparison, canonical, "", langruntime.CheckedSignedNegate(1), &boundProfile)
	}
	return input
}
func ArrayFromCoercedMultirangeTypedProfileTree(input ArrayValue, types string, kinds string, typeName string, rangeType string, elementType string, elementKind int, comparison int, canonical int, boundProfile RangeBoundContext) ArrayValue {
	input = CopyArrayValue(input)
	types = langruntime.CheckedString(types)
	kinds = langruntime.CheckedString(kinds)
	typeName = langruntime.CheckedString(typeName)
	rangeType = langruntime.CheckedString(rangeType)
	elementType = langruntime.CheckedString(elementType)
	elementKind = langruntime.CheckedI32(elementKind)
	comparison = langruntime.CheckedI32(comparison)
	canonical = langruntime.CheckedI32(canonical)
	boundProfile = CopyRangeBoundContext(boundProfile)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueValue {
		payload := CopyArrayPayload(input.Value)
		if arrayTreeIdentityValid(&payload, types, kinds, 0) == false || arrayMultirangeIdentityValid(&payload, typeName, rangeType, elementType, elementKind) == false {
			return ArrayUnresolved(unresolvedFlavor)
		}
		return arrayWithTypedRangeProfile(ArrayValue{Kind: ArrayValueValue, Value: payload}, typeName, rangeType, elementType, elementKind, comparison, canonical, "", langruntime.CheckedSignedNegate(1), &boundProfile)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayArgumentsError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if input.Kind == ArrayArgumentsValue {
		value := CopyArrayPayload(input.Value)
		return MakeArrayValue(value)
	}
	return ArrayUnresolved(unresolvedFlavor)
}
func ArrayFlatElement(input ArrayValue, offset Int4Value) ArrayElement {
	input = CopyArrayValue(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if offset.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if offset.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func FinishArrayConstructor(input ArrayArguments) ArrayValue {
	input = CopyArrayArguments(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayUnresolved(unresolvedFlavor)
}

type ArrayChildrenPayload struct {
	ElementType string
	ElementKind int
	Arrays      []ArrayValue
}

func CopyArrayChildrenPayload(value ArrayChildrenPayload) ArrayChildrenPayload {
	return ArrayChildrenPayload{ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Arrays: langruntime.CheckedStructs(value.Arrays, CopyArrayValue)}
}

type ArrayChildrenArgumentsKind uint8

const (
	ArrayChildrenArgumentsUnknown ArrayChildrenArgumentsKind = iota
	ArrayChildrenArgumentsUnimplemented
	ArrayChildrenArgumentsError
	ArrayChildrenArgumentsValue
)

type ArrayChildrenArguments struct {
	Kind  ArrayChildrenArgumentsKind
	Error SqlError
	Value ArrayChildrenPayload
}

func CopyArrayChildrenArguments(value ArrayChildrenArguments) ArrayChildrenArguments {
	switch value.Kind {
	case ArrayChildrenArgumentsUnknown:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsUnknown}
	case ArrayChildrenArgumentsUnimplemented:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsUnimplemented}
	case ArrayChildrenArgumentsError:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsError, Error: value.Error}
	case ArrayChildrenArgumentsValue:
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsValue, Value: CopyArrayChildrenPayload(value.Value)}
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
	input = CopyArrayChildrenArguments(input)
	child = CopyArrayValue(child)
	if input.Kind == ArrayChildrenArgumentsError {
		return input
	}
	if child.Kind == ArrayValueError {
		error := child.Error
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsError, Error: error}
	}
	if input.Kind == ArrayChildrenArgumentsValue {
		value := CopyArrayChildrenPayload(input.Value)
		arrays := value.Arrays
		langruntime.CheckedAdd(len(arrays), 1)
		arrays = append(arrays, CopyArrayValue(child))
		return ArrayChildrenArguments{Kind: ArrayChildrenArgumentsValue, Value: ArrayChildrenPayload{ElementType: value.ElementType, ElementKind: value.ElementKind, Arrays: arrays}}
	}
	return input
}
func FinishArrayChildren(input ArrayChildrenArguments) ArrayValue {
	input = CopyArrayChildrenArguments(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayChildrenArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayChildrenArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayChildrenArgumentsError {
		error := input.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if input.Kind == ArrayChildrenArgumentsValue {
		value := CopyArrayChildrenPayload(input.Value)
		position := 0
		for position < len(value.Arrays) {
			child := CopyArrayValue(value.Arrays[position])
			conditionFlavor116912 := unresolvedFlavor
			if child.Kind == ArrayValueUnknown {
				if conditionFlavor116912 < 1 {
					conditionFlavor116912 = langruntime.CheckedI32(1)
				}
			}
			if child.Kind == ArrayValueUnknown {
				return ArrayUnresolved(conditionFlavor116912)
			}
			conditionFlavor117115 := unresolvedFlavor
			if child.Kind == ArrayValueUnimplemented {
				conditionFlavor117115 = langruntime.CheckedI32(2)
			}
			if child.Kind == ArrayValueUnimplemented {
				return ArrayUnresolved(conditionFlavor117115)
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
	return ArrayUnresolved(unresolvedFlavor)
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
	return ArrayTextPayload{State: langruntime.CheckedI32(value.State), Dimensions: langruntime.CheckedStructs(value.Dimensions, CopyArrayDimension), Events: langruntime.CheckedStructs(value.Events, CopyArrayTextEvent)}
}

type ArrayTextPlanKind uint8

const (
	ArrayTextPlanUnknown ArrayTextPlanKind = iota
	ArrayTextPlanUnimplemented
	ArrayTextPlanNull
	ArrayTextPlanValue
)

type ArrayTextPlan struct {
	Kind  ArrayTextPlanKind
	Value ArrayTextPayload
}

func CopyArrayTextPlan(value ArrayTextPlan) ArrayTextPlan {
	switch value.Kind {
	case ArrayTextPlanUnknown:
		return ArrayTextPlan{Kind: ArrayTextPlanUnknown}
	case ArrayTextPlanUnimplemented:
		return ArrayTextPlan{Kind: ArrayTextPlanUnimplemented}
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
	ArrayTextEventUnimplemented
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
	case ArrayTextEventUnimplemented:
		return ArrayTextEvent{Kind: ArrayTextEventUnimplemented}
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
	dimensions = langruntime.CheckedStructs(dimensions, CopyArrayDimension)
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
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	conditionFlavor15154 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor15154 < 1 {
			conditionFlavor15154 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor15154 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return ArrayTextPlanUnresolved(conditionFlavor15154)
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
	return ArrayTextPlanUnresolved(unresolvedFlavor)
}
func ArrayTextEventCount(input *ArrayTextPayload) Int4Value {
	return Int4Value{Kind: Int4ValueValue, Value: int(int32(len(input.Events)))}
}
func ArrayTextEventAt(input *ArrayTextPayload, index Int4Value) TextValue {
	unresolvedFlavor := 0
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if index.Kind == Int4ValueError {
		error := index.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	if index.Kind == Int4ValueValue {
		position := langruntime.CheckedI32(index.Value)
		if position < 0 {
			return TextUnresolved(unresolvedFlavor)
		}
		offset := langruntime.IndexFromI32(position, 0)
		if offset >= len(input.Events) {
			return TextUnresolved(unresolvedFlavor)
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
		if event.Kind == ArrayTextEventUnknown {
			return TextUnresolved(ResolutionContext(unresolvedFlavor))
		}
	}
	return TextUnresolved(unresolvedFlavor)
}
func FinishArrayText(plan ArrayTextPlan, converted ArrayArguments) ArrayValue {
	plan = CopyArrayTextPlan(plan)
	converted = CopyArrayArguments(converted)
	unresolvedFlavor := 0
	if plan.Kind == ArrayTextPlanUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if converted.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if plan.Kind == ArrayTextPlanUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if converted.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
				conditionFlavor177416 := unresolvedFlavor
				if element.Kind == ArrayElementUnknown {
					if conditionFlavor177416 < 1 {
						conditionFlavor177416 = langruntime.CheckedI32(1)
					}
				}
				if element.Kind == ArrayElementUnknown {
					if value.ElementType != "pg_catalog.name" {
						return ArrayUnresolved(conditionFlavor177416)
					}
				}
				conditionFlavor177819 := unresolvedFlavor
				if element.Kind == ArrayElementUnimplemented {
					conditionFlavor177819 = langruntime.CheckedI32(2)
				}
				if element.Kind == ArrayElementUnimplemented {
					if value.ElementType != "pg_catalog.name" {
						return ArrayUnresolved(conditionFlavor177819)
					}
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			return MakeArrayValue(ArrayPayload{NullBitmap: value.NullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: payload.Dimensions, Elements: value.Elements})
		}
	}
	return ArrayUnresolved(unresolvedFlavor)
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
	if plan.Kind == ArrayTextPlanUnknown {
		state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(3))
	}
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
	unresolvedFlavor := 0
	if input.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value < 2147483647 {
			return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedAdd(value, 1)}
		}
	}
	return Int4Unresolved(unresolvedFlavor)
}
func FinishPreparedArrayText(input ArrayTextPayload, converted ArrayArguments) ArrayValue {
	input = CopyArrayTextPayload(input)
	converted = CopyArrayArguments(converted)
	unresolvedFlavor := 0
	if converted.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if converted.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.State == 0 {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if input.State != 1 {
		return ArrayUnresolved(ArrayOutputFlavor(input.State, unresolvedFlavor))
	}
	return FinishArrayText(ArrayTextPlan{Kind: ArrayTextPlanValue, Value: input}, converted)
}

type ArraySubscriptBound struct {
	Provided bool
	State    int
	Value    int
}

func CopyArraySubscriptBound(value ArraySubscriptBound) ArraySubscriptBound {
	return ArraySubscriptBound{Provided: value.Provided, State: langruntime.CheckedI32(value.State), Value: langruntime.CheckedI32(value.Value)}
}

type ArraySubscriptPayload struct {
	Upper []ArraySubscriptBound
	Lower []ArraySubscriptBound
}

func CopyArraySubscriptPayload(value ArraySubscriptPayload) ArraySubscriptPayload {
	return ArraySubscriptPayload{Upper: langruntime.CheckedStructs(value.Upper, CopyArraySubscriptBound), Lower: langruntime.CheckedStructs(value.Lower, CopyArraySubscriptBound)}
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
		return ArraySubscripts{Kind: ArraySubscriptsValue, Value: CopyArraySubscriptPayload(value.Value)}
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
		payload := CopyArraySubscriptPayload(input.Value)
		state := langruntime.CheckedSignedNegate(1)
		value := 0
		if index.Kind == Int4ValueUnimplemented {
			state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(2))
		}
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
			lower = append(lower, CopyArraySubscriptBound(bound))
		} else {
			langruntime.CheckedAdd(len(upper), 1)
			upper = append(upper, CopyArraySubscriptBound(bound))
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func arraySubscriptState(input *ArraySubscriptPayload) int {
	state := 1
	position := 0
	for position < langruntime.CheckedAdd(len(input.Upper), len(input.Lower)) {
		bound := ArraySubscriptBound{Provided: false, State: 1, Value: 0}
		if position < len(input.Upper) {
			bound = CopyArraySubscriptBound(input.Upper[position])
		} else {
			bound = CopyArraySubscriptBound(input.Lower[langruntime.CheckedSubtract(position, len(input.Upper))])
		}
		if bound.Provided {
			if bound.State == langruntime.CheckedSignedNegate(2) {
				state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(2))
			}
			if bound.State == langruntime.CheckedSignedNegate(1) && state != langruntime.CheckedSignedNegate(2) {
				state = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
			}
			if bound.State == 0 && state > 0 {
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if input.Kind == ArrayValueNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	conditionFlavor19974 := unresolvedFlavor
	if input.Kind == ArrayValueUnknown {
		if conditionFlavor19974 < 1 {
			conditionFlavor19974 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == ArrayValueUnknown {
		return ArrayElementUnresolved(conditionFlavor19974)
	}
	conditionFlavor19997 := unresolvedFlavor
	if input.Kind == ArrayValueUnimplemented {
		conditionFlavor19997 = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueUnimplemented {
		return ArrayElementUnresolved(conditionFlavor19997)
	}
	if indices.Kind == ArraySubscriptsError {
		error := indices.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if indices.Kind == ArraySubscriptsValue {
		bounds := CopyArraySubscriptPayload(indices.Value)
		state := arraySubscriptState(&bounds)
		if state < 0 {
			boundFlavor := 1
			if state == langruntime.CheckedSignedNegate(2) {
				boundFlavor = langruntime.CheckedI32(2)
			}
			return ArrayElementUnresolved(boundFlavor)
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
					return ArrayElementUnresolved(unresolvedFlavor)
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
	return ArrayElementUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueError {
		return input
	}
	if input.Kind == ArrayValueNull {
		return input
	}
	if input.Kind == ArrayValueUnknown {
		return input
	}
	if input.Kind == ArrayValueUnimplemented {
		return input
	}
	if indices.Kind == ArraySubscriptsError {
		error := indices.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	if indices.Kind == ArraySubscriptsValue {
		bounds := CopyArraySubscriptPayload(indices.Value)
		state := arraySubscriptState(&bounds)
		if state < 0 {
			boundFlavor := 1
			if state == langruntime.CheckedSignedNegate(2) {
				boundFlavor = langruntime.CheckedI32(2)
			}
			return ArrayUnresolved(boundFlavor)
		}
		if state == 0 {
			return ArrayValue{Kind: ArrayValueNull}
		}
		if input.Kind == ArrayValueValue {
			payload := CopyArrayPayload(input.Value)
			if len(bounds.Upper) != len(bounds.Lower) || len(bounds.Upper) == 0 {
				return ArrayUnresolved(unresolvedFlavor)
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
					return ArrayUnresolved(unresolvedFlavor)
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
	return ArrayUnresolved(unresolvedFlavor)
}

const arrayComparisonUndefined = 6822435
const arrayComparisonTypeMismatch = 6822148

type ArrayComparisonPayload struct {
	Left   []ArrayElement
	Right  []ArrayElement
	Limit  int
	State  int
	Error  SqlError
	Tail   int
	Value  int
	Flavor int
}

func CopyArrayComparisonPayload(value ArrayComparisonPayload) ArrayComparisonPayload {
	return ArrayComparisonPayload{Left: langruntime.CheckedStructs(value.Left, CopyArrayElement), Right: langruntime.CheckedStructs(value.Right, CopyArrayElement), Limit: langruntime.CheckedIndex(value.Limit), State: langruntime.CheckedI32(value.State), Error: value.Error, Tail: langruntime.CheckedI32(value.Tail), Value: langruntime.CheckedI32(value.Value), Flavor: langruntime.CheckedI32(value.Flavor)}
}

type ArrayComparisonPlanKind uint8

const (
	ArrayComparisonPlanValue ArrayComparisonPlanKind = iota
)

type ArrayComparisonPlan struct {
	Kind  ArrayComparisonPlanKind
	Value ArrayComparisonPayload
}

func CopyArrayComparisonPlan(value ArrayComparisonPlan) ArrayComparisonPlan {
	switch value.Kind {
	case ArrayComparisonPlanValue:
		return ArrayComparisonPlan{Kind: ArrayComparisonPlanValue, Value: CopyArrayComparisonPayload(value.Value)}
	}
	panic("unknown enum variant")
}
func ArrayComparisonUnresolved(flavor int, value int) ArrayComparisonPayload {
	left := []ArrayElement{}
	right := []ArrayElement{}
	return ArrayComparisonPayload{Left: left, Right: right, Limit: 0, State: langruntime.CheckedSignedNegate(1), Error: MakeSqlError(0), Tail: 0, Value: value, Flavor: flavor}
}
func ArrayComparisonFlavor(input *ArrayComparisonPayload, flavor int) int {
	if flavor == 2 || input.Flavor == 2 {
		return 2
	}
	if input.Flavor == 1 {
		return 1
	}
	return flavor
}
func arrayComparisonState(state int, error SqlError, value int) ArrayComparisonPayload {
	state = langruntime.CheckedI32(state)
	value = langruntime.CheckedI32(value)
	left := []ArrayElement{}
	right := []ArrayElement{}
	return ArrayComparisonPayload{Left: left, Right: right, Limit: 0, State: state, Error: error, Tail: 0, Value: value, Flavor: 2}
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
	deferredFlavor := 0
	if left.Kind == ArrayValueUnknown {
		deferredFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == ArrayValueUnknown {
		deferredFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == ArrayValueUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == ArrayValueUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if deferredFlavor > 0 {
		return ArrayComparisonUnresolved(deferredFlavor, 0)
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
			return ArrayComparisonPayload{Left: a.Elements, Right: b.Elements, Limit: limit, State: 1, Error: MakeSqlError(0), Tail: tail, Value: 0, Flavor: 2}
		}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArrayComparisonInitial(input *ArrayComparisonPayload) Int4Value {
	unresolvedFlavor := 0
	if input.State == langruntime.CheckedSignedNegate(2) {
		return Int4Value{Kind: Int4ValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return Int4Unresolved(ArrayComparisonFlavor(input, unresolvedFlavor))
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
	unresolvedFlavor := 0
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayComparisonPair(left ArrayElement, right ArrayElement, equality bool) Int4Value {
	left = CopyArrayElement(left)
	right = CopyArrayElement(right)
	unresolvedFlavor := 0
	if left.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left.Kind == ArrayElementError {
		error := left.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if right.Kind == ArrayElementError {
		error := right.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	conditionFlavor23804 := unresolvedFlavor
	if left.Kind == ArrayElementUnknown {
		if conditionFlavor23804 < 1 {
			conditionFlavor23804 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == ArrayElementUnknown {
		return Int4Unresolved(conditionFlavor23804)
	}
	conditionFlavor23827 := unresolvedFlavor
	if left.Kind == ArrayElementUnimplemented {
		conditionFlavor23827 = langruntime.CheckedI32(2)
	}
	if left.Kind == ArrayElementUnimplemented {
		return Int4Unresolved(conditionFlavor23827)
	}
	conditionFlavor23854 := unresolvedFlavor
	if right.Kind == ArrayElementUnknown {
		if conditionFlavor23854 < 1 {
			conditionFlavor23854 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == ArrayElementUnknown {
		return Int4Unresolved(conditionFlavor23854)
	}
	conditionFlavor23877 := unresolvedFlavor
	if right.Kind == ArrayElementUnimplemented {
		conditionFlavor23877 = langruntime.CheckedI32(2)
	}
	if right.Kind == ArrayElementUnimplemented {
		return Int4Unresolved(conditionFlavor23877)
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
	unresolvedFlavor := 0
	if input.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == BoolValueError {
		error := input.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	conditionFlavor24274 := unresolvedFlavor
	if input.Kind == BoolValueUnknown {
		if conditionFlavor24274 < 1 {
			conditionFlavor24274 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BoolValueUnimplemented {
		conditionFlavor24274 = langruntime.CheckedI32(2)
	}
	if input == (BoolValue{Kind: BoolValueUnknown}) || input == (BoolValue{Kind: BoolValueUnimplemented}) {
		return Int4Unresolved(conditionFlavor24274)
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
	unresolvedFlavor := 0
	if input.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
		return Int4Unresolved(unresolvedFlavor)
	}
	return input
}
func ArrayOrderFromEquality(input BoolValue, deferredFlavor int) Int4Value {
	deferredFlavor = langruntime.CheckedI32(deferredFlavor)
	unresolvedFlavor := deferredFlavor
	if input.Kind == BoolValueUnknown {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int4Unresolved(unresolvedFlavor)
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
		return ArrayComparisonPayload{Left: payload.Right, Right: payload.Left, Limit: payload.Limit, State: payload.State, Error: payload.Error, Tail: payload.Tail, Value: payload.Value, Flavor: payload.Flavor}
	}
	return payload
}
func ArrayMembershipInitial(input *ArrayComparisonPayload, all bool) BoolValue {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if input.State == langruntime.CheckedSignedNegate(2) {
		return BoolValue{Kind: BoolValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return BoolUnresolved(ArrayComparisonFlavor(input, unresolvedFlavor))
	}
	if input.State == 0 {
		return BoolValue{Kind: BoolValueNull}
	}
	return BoolValue{Kind: BoolValueValue, Value: all}
}
func ArrayMembershipContinues(input *ArrayComparisonPayload, index Int4Value, result BoolValue, all bool) bool {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
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
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayMembershipMatchInitial(input *ArrayComparisonPayload, index Int4Value) BoolValue {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	source := ArrayMembershipElementAt(input, index, false)
	if source.Kind == ArrayElementError {
		error := source.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	return BoolValue{Kind: BoolValueValue, Value: false}
}
func ArrayMembershipScanContinues(input *ArrayComparisonPayload, sourceIndex Int4Value, index Int4Value, matched BoolValue) bool {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
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
	if comparison.Kind == Int4ValueUnimplemented {
		value = BoolValue{Kind: BoolValueUnimplemented}
	}
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
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementNull {
		return ArrayElement{Kind: ArrayElementNull}
	}
	if input.Kind == ArrayElementError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func FinishArrayCoercion(input ArrayOutputPayload, converted ArrayArguments, binary bool) ArrayValue {
	input = CopyArrayOutputPayload(input)
	converted = CopyArrayArguments(converted)
	unresolvedFlavor := 0
	if converted.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if converted.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.State == langruntime.CheckedSignedNegate(2) {
		return ArrayValue{Kind: ArrayValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) || input.State == langruntime.CheckedSignedNegate(3) {
		return ArrayUnresolved(ArrayOutputFlavor(input.State, unresolvedFlavor))
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
			return ArrayUnresolved(unresolvedFlavor)
		}
		nullBitmap := value.NullBitmap
		dimensions := []ArrayDimension{}
		if binary || len(value.Elements) > 0 {
			position := 0
			for position < len(input.Dimensions) {
				langruntime.CheckedAdd(len(dimensions), 1)
				dimensions = append(dimensions, input.Dimensions[position])
				position = langruntime.CheckedAdd(position, 1)
			}
		}
		if binary {
			nullBitmap = input.NullBitmap
		}
		return MakeArrayValue(ArrayPayload{NullBitmap: nullBitmap, ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: dimensions, Elements: value.Elements})
	}
	return ArrayUnresolved(unresolvedFlavor)
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
	deferredFlavor := 0
	if needle.Kind == ArrayElementUnknown {
		deferredFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnknown {
		deferredFlavor = langruntime.CheckedI32(1)
	}
	if needle.Kind == ArrayElementUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayValueUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if deferredFlavor > 0 {
		return ArrayComparisonUnresolved(deferredFlavor, 0)
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
		nullFlavor := 0
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
				if nullFlavor < 1 {
					nullFlavor = langruntime.CheckedI32(1)
				}
			}
			if cell.Kind == ArrayElementUnimplemented {
				unknownNull = true
				nullFlavor = langruntime.CheckedI32(2)
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		if knownNull {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayBucketNullElement), 0)
		}
		if unknownNull {
			return ArrayComparisonUnresolved(nullFlavor, 0)
		}
		if available == false {
			return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arrayComparisonUndefined), 0)
		}
		needles := []ArrayElement{}
		langruntime.CheckedAdd(len(needles), 1)
		needles = append(needles, CopyArrayElement(needle))
		return ArrayComparisonPayload{Limit: len(array.Elements), Left: array.Elements, Right: needles, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 0, Flavor: 2}
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
	unresolvedFlavor := 0
	if input.State == 1 && len(input.Right) == 1 {
		return CopyArrayElement(input.Right[0])
	}
	return ArrayElementUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if low.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if high.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if low.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if high.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if low.Kind == Int4ValueValue {
		left := langruntime.CheckedI32(low.Value)
		if high.Kind == Int4ValueValue {
			right := langruntime.CheckedI32(high.Value)
			if left >= 0 && left <= right {
				return Int4Value{Kind: Int4ValueValue, Value: langruntime.CheckedSignedAdd(left, langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(right, left)), 2))}
			}
		}
	}
	return Int4Unresolved(unresolvedFlavor)
}
func ArrayBucketLower(low Int4Value, high Int4Value, compared Int4Value) Int4Value {
	unresolvedFlavor := 0
	if low.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if high.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if compared.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if low.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if high.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if compared.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int4Unresolved(unresolvedFlavor)
}
func ArrayBucketUpper(low Int4Value, high Int4Value, compared Int4Value) Int4Value {
	unresolvedFlavor := 0
	if low.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if high.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if compared.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if low.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if high.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if compared.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return Int4Unresolved(unresolvedFlavor)
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
		needleFlavor := 0
		if needle.Kind == ArrayElementUnknown {
			needleUnknown = true
			needleFlavor = langruntime.CheckedI32(1)
		}
		if needle.Kind == ArrayElementUnimplemented {
			needleUnknown = true
			needleFlavor = langruntime.CheckedI32(2)
		}
		knownNull := false
		unknownNull := false
		cellFlavor := 0
		position := 0
		for position < len(array.Elements) {
			element := CopyArrayElement(array.Elements[position])
			if element.Kind == ArrayElementNull {
				knownNull = true
			}
			if element.Kind == ArrayElementUnknown {
				unknownNull = true
				if cellFlavor < 1 {
					cellFlavor = langruntime.CheckedI32(1)
				}
			}
			if element.Kind == ArrayElementUnimplemented {
				unknownNull = true
				cellFlavor = langruntime.CheckedI32(2)
			}
			position = langruntime.CheckedAdd(position, 1)
		}
		searchFlavor := needleFlavor
		if (needleNull || needleUnknown) && cellFlavor > searchFlavor {
			searchFlavor = langruntime.CheckedI32(cellFlavor)
		}
		if needleNull && knownNull == false && unknownNull == false {
			return arrayComparisonState(2, MakeSqlError(0), 0)
		}
		if provided {
			if start == (Int4Value{Kind: Int4ValueUnknown}) {
				return ArrayComparisonUnresolved(1, 0)
			}
			if start == (Int4Value{Kind: Int4ValueUnimplemented}) {
				return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
			}
			if start == (Int4Value{Kind: Int4ValueNull}) {
				if knownNull == false && (needleUnknown || (needleNull && unknownNull)) {
					return ArrayComparisonUnresolved(searchFlavor, 0)
				}
				return arrayComparisonState(langruntime.CheckedSignedNegate(2), MakeSqlError(arraySearchNullStart), 0)
			}
		}
		if available == false {
			if knownNull == false && (needleUnknown || (needleNull && unknownNull)) {
				return ArrayComparisonUnresolved(searchFlavor, 0)
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
		return ArrayComparisonPayload{Limit: len(array.Elements), Left: array.Elements, Right: needles, State: 1, Error: MakeSqlError(0), Tail: lower, Value: int(int32(offset)), Flavor: 2}
	}
	deferredFlavor := 1
	if input.Kind == ArrayValueUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if needle.Kind == ArrayElementUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if provided && start == (Int4Value{Kind: Int4ValueUnimplemented}) {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	return ArrayComparisonUnresolved(deferredFlavor, 0)
}
func ArraySearchInitial(input *ArrayComparisonPayload) Int4Value {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if input.State == langruntime.CheckedSignedNegate(2) {
		return Int4Value{Kind: Int4ValueError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return Int4Unresolved(ArrayComparisonFlavor(input, unresolvedFlavor))
	}
	return Int4Value{Kind: Int4ValueNull}
}
func ArraySearchStart(input *ArrayComparisonPayload) Int4Value {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	return Int4Value{Kind: Int4ValueValue, Value: input.Value}
}
func ArraySearchContinues(input *ArrayComparisonPayload, index Int4Value, result Int4Value, all bool) bool {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	if input.State != 1 {
		return false
	}
	if result.Kind == Int4ValueError {
		return false
	}
	if result == (Int4Value{Kind: Int4ValueUnknown}) || result == (Int4Value{Kind: Int4ValueUnimplemented}) {
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
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if input.State == 1 && len(input.Right) == 1 {
		return CopyArrayElement(input.Right[0])
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArraySearchResultStep(input *ArrayComparisonPayload, index Int4Value, compared Int4Value) Int4Value {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if compared.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if compared.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if compared.Kind == Int4ValueError {
		error := compared.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	conditionFlavor30214 := unresolvedFlavor
	if compared.Kind == Int4ValueUnknown {
		if conditionFlavor30214 < 1 {
			conditionFlavor30214 = langruntime.CheckedI32(1)
		}
	}
	if compared.Kind == Int4ValueUnimplemented {
		conditionFlavor30214 = langruntime.CheckedI32(2)
	}
	if compared == (Int4Value{Kind: Int4ValueUnknown}) || compared == (Int4Value{Kind: Int4ValueUnimplemented}) {
		return Int4Unresolved(conditionFlavor30214)
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
	return Int4Unresolved(unresolvedFlavor)
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
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	values = CopyArrayArguments(values)
	unresolvedFlavor := 0
	if values.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if result.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if values.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if result.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.State == 0 {
		return ArrayValue{Kind: ArrayValueNull}
	}
	if result.Kind == Int4ValueError {
		error := result.Error
		return ArrayValue{Kind: ArrayValueError, Error: error}
	}
	conditionFlavor30594 := unresolvedFlavor
	if result.Kind == Int4ValueUnknown {
		if conditionFlavor30594 < 1 {
			conditionFlavor30594 = langruntime.CheckedI32(1)
		}
	}
	if result.Kind == Int4ValueUnimplemented {
		conditionFlavor30594 = langruntime.CheckedI32(2)
	}
	if result == (Int4Value{Kind: Int4ValueUnknown}) || result == (Int4Value{Kind: Int4ValueUnimplemented}) {
		return ArrayUnresolved(conditionFlavor30594)
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
		if len(array.Elements) == 0 {
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
		return ArrayComparisonPayload{Limit: len(array.Elements), Left: array.Elements, Right: queries, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 0, Flavor: 2}
	}
	deferredFlavor := 1
	if input.Kind == ArrayValueUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if needle.Kind == ArrayElementUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if replacement.Kind == ArrayElementUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	return ArrayComparisonUnresolved(deferredFlavor, 0)
}
func ArrayRewriteNeedle(input *ArrayComparisonPayload) ArrayElement {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if input.State == 1 && len(input.Right) == 2 {
		return CopyArrayElement(input.Right[0])
	}
	return ArrayElementUnresolved(unresolvedFlavor)
}
func ArrayRewriteContinues(input *ArrayComparisonPayload, index Int4Value, result Int4Value) bool {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
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
	plan = langruntime.CheckedBorrowed(plan, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if input.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if compared.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if compared.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayArgumentsError {
		return input
	}
	if compared.Kind == Int4ValueError {
		error := compared.Error
		return ArrayArguments{Kind: ArrayArgumentsError, Error: error}
	}
	source := ArrayMembershipElementAt(plan, index, false)
	conditionFlavor31564 := unresolvedFlavor
	if compared.Kind == Int4ValueUnknown {
		if conditionFlavor31564 < 1 {
			conditionFlavor31564 = langruntime.CheckedI32(1)
		}
	}
	if compared.Kind == Int4ValueUnimplemented {
		conditionFlavor31564 = langruntime.CheckedI32(2)
	}
	if compared == (Int4Value{Kind: Int4ValueUnknown}) || compared == (Int4Value{Kind: Int4ValueUnimplemented}) {
		if remove {
			return ArrayArgumentsUnresolved(conditionFlavor31564)
		}
		if source.Kind == ArrayElementNull {
			replacement := CopyArrayElement(plan.Right[1])
			if replacement.Kind == ArrayElementNull {
				return AppendArrayArgument(input, ArrayElement{Kind: ArrayElementNull})
			}
		}
		return AppendArrayArgument(input, ArrayElementUnresolved(conditionFlavor31564))
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
	return ArrayArgumentsUnresolved(unresolvedFlavor)
}
func ArrayRewriteChanged(input *ArrayComparisonPayload, compared Int4Value, remove bool) BoolValue {
	input = langruntime.CheckedBorrowed(input, CopyArrayComparisonPayload)
	unresolvedFlavor := 0
	if compared.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if compared.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}
func FinishArrayRewrite(original ArrayValue, plan *ArrayComparisonPayload, values ArrayArguments, remove bool, changed BoolValue) ArrayValue {
	original = CopyArrayValue(original)
	plan = langruntime.CheckedBorrowed(plan, CopyArrayComparisonPayload)
	values = CopyArrayArguments(values)
	unresolvedFlavor := 0
	if original.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if values.Kind == ArrayArgumentsUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if changed.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if original.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if values.Kind == ArrayArgumentsUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if changed.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if plan.State == langruntime.CheckedSignedNegate(2) {
		return ArrayValue{Kind: ArrayValueError, Error: plan.Error}
	}
	if plan.State == langruntime.CheckedSignedNegate(1) {
		return ArrayUnresolved(ArrayComparisonFlavor(plan, unresolvedFlavor))
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
	return ArrayUnresolved(unresolvedFlavor)
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

func CopyArraySortPayload(value ArraySortPayload) ArraySortPayload {
	return ArraySortPayload{NullBitmap: value.NullBitmap, ElementType: langruntime.CheckedString(value.ElementType), ElementKind: langruntime.CheckedI32(value.ElementKind), Dimensions: langruntime.CheckedStructs(value.Dimensions, CopyArrayDimension), Elements: langruntime.CheckedStructs(value.Elements, CopyArrayElement), Order: langruntime.CheckedIndices(value.Order), Buffer: langruntime.CheckedIndices(value.Buffer), Ties: langruntime.CheckedIndices(value.Ties), Rows: langruntime.CheckedI32(value.Rows), Width: langruntime.CheckedI32(value.Width), Run: langruntime.CheckedI32(value.Run), Segment: langruntime.CheckedI32(value.Segment), Left: langruntime.CheckedI32(value.Left), Right: langruntime.CheckedI32(value.Right), Output: langruntime.CheckedI32(value.Output), Phase: langruntime.CheckedI32(value.Phase), Tie: langruntime.CheckedI32(value.Tie), State: langruntime.CheckedI32(value.State), Error: value.Error, Descending: value.Descending, NullsFirst: value.NullsFirst}
}

type ArraySortPlanKind uint8

const (
	ArraySortPlanValue ArraySortPlanKind = iota
)

type ArraySortPlan struct {
	Kind  ArraySortPlanKind
	Value ArraySortPayload
}

func CopyArraySortPlan(value ArraySortPlan) ArraySortPlan {
	switch value.Kind {
	case ArraySortPlanValue:
		return ArraySortPlan{Kind: ArraySortPlanValue, Value: CopyArraySortPayload(value.Value)}
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
	deferredFlavor := 0
	if input.Kind == ArrayValueUnknown {
		deferredFlavor = langruntime.CheckedI32(1)
	}
	if seed == (Int8Value{Kind: Int8ValueUnknown}) {
		deferredFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if seed == (Int8Value{Kind: Int8ValueUnimplemented}) {
		deferredFlavor = langruntime.CheckedI32(2)
	}
	if deferredFlavor > 0 {
		return ArrayComparisonUnresolved(deferredFlavor, 1)
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
		return ArrayComparisonPayload{Left: value.Elements, Right: right, Limit: limit, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 1, Flavor: 2}
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 1)
}
func ArrayHashInitial64(input *ArrayComparisonPayload) Int8Value {
	unresolvedFlavor := 0
	initial := ArrayComparisonInitial(input)
	if initial.Kind == Int4ValueError {
		error := initial.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	conditionFlavor33524 := unresolvedFlavor
	if initial.Kind == Int4ValueUnknown {
		if conditionFlavor33524 < 1 {
			conditionFlavor33524 = langruntime.CheckedI32(1)
		}
	}
	if initial.Kind == Int4ValueUnimplemented {
		conditionFlavor33524 = langruntime.CheckedI32(2)
	}
	if initial == (Int4Value{Kind: Int4ValueUnknown}) || initial == (Int4Value{Kind: Int4ValueUnimplemented}) {
		return Int8Unresolved(conditionFlavor33524)
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
	unresolvedFlavor := 0
	if left.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left == (BoolValue{Kind: BoolValueValue, Value: true}) || right == (BoolValue{Kind: BoolValueValue, Value: true}) {
		return BoolValue{Kind: BoolValueValue, Value: true}
	}
	if left == (BoolValue{Kind: BoolValueValue, Value: false}) && right == (BoolValue{Kind: BoolValueValue, Value: false}) {
		return BoolValue{Kind: BoolValueValue, Value: false}
	}
	return BoolUnresolved(unresolvedFlavor)
}
func ArrayElementBitmap(input ArrayElement) BoolValue {
	input = CopyArrayElement(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayElementUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayElementUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	conditionFlavor204 := unresolvedFlavor
	if input.Kind == ArrayElementUnknown {
		if conditionFlavor204 < 1 {
			conditionFlavor204 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == ArrayElementUnknown {
		return BoolUnresolved(conditionFlavor204)
	}
	conditionFlavor227 := unresolvedFlavor
	if input.Kind == ArrayElementUnimplemented {
		conditionFlavor227 = langruntime.CheckedI32(2)
	}
	if input.Kind == ArrayElementUnimplemented {
		return BoolUnresolved(conditionFlavor227)
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
	unresolvedFlavor := 0
	if left.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left == right {
		return left
	}
	return BoolUnresolved(unresolvedFlavor)
}
func ArrayNullBitmap(input ArrayValue) BoolValue {
	input = CopyArrayValue(input)
	unresolvedFlavor := 0
	if input.Kind == ArrayValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == ArrayValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}

type TsvectorStorageEntry struct {
	NativeBytes int
	LexemeCount int
}

func CopyTsvectorStorageEntry(value TsvectorStorageEntry) TsvectorStorageEntry {
	return TsvectorStorageEntry{NativeBytes: langruntime.CheckedI32(value.NativeBytes), LexemeCount: langruntime.CheckedI32(value.LexemeCount)}
}

type TsvectorStoragePlan struct {
	Entries []TsvectorStorageEntry
	Valid   bool
}

func CopyTsvectorStoragePlan(value TsvectorStoragePlan) TsvectorStoragePlan {
	return TsvectorStoragePlan{Entries: langruntime.CheckedStructs(value.Entries, CopyTsvectorStorageEntry), Valid: value.Valid}
}
func MakeTsvectorStoragePlan() TsvectorStoragePlan {
	entries := []TsvectorStorageEntry{}
	return TsvectorStoragePlan{Entries: entries, Valid: true}
}
func AppendTsvectorStorage(input TsvectorStoragePlan, bytes int, count int) TsvectorStoragePlan {
	input = CopyTsvectorStoragePlan(input)
	bytes = langruntime.CheckedI32(bytes)
	count = langruntime.CheckedI32(count)
	entries := input.Entries
	valid := input.Valid && count >= 0 && count <= 1048575 && bytes >= langruntime.CheckedSignedAdd(8, langruntime.CheckedSignedMultiply(count, 4)) && bytes <= 1073741823
	langruntime.CheckedAdd(len(entries), 1)
	entries = append(entries, CopyTsvectorStorageEntry(TsvectorStorageEntry{NativeBytes: bytes, LexemeCount: count}))
	return TsvectorStoragePlan{Entries: entries, Valid: valid}
}
func ApplyTsvectorStorage(input TsvectorValue, plan *TsvectorStoragePlan, index Int4Value) TsvectorValue {
	input = CopyTsvectorValue(input)
	plan = langruntime.CheckedBorrowed(plan, CopyTsvectorStoragePlan)
	if input.Kind == TsvectorValueNull {
		return input
	}
	if input.Kind == TsvectorValueError {
		error := input.Error
		return TsvectorValue{Kind: TsvectorValueError, Error: error}
	}
	if input.Kind == TsvectorValueValue {
		value := CopyTsvectorPayload(input.Value)
		if index.Kind == Int4ValueValue {
			offset := langruntime.CheckedI32(index.Value)
			position := langruntime.IndexFromI32(offset, len(plan.Entries))
			if plan.Valid && offset >= 0 && position < len(plan.Entries) {
				entry := plan.Entries[position]
				if len(value.Lexemes) == langruntime.IndexFromI32(entry.LexemeCount, 0) {
					return MakeTsvectorValue(TsvectorPayload{Lexemes: value.Lexemes, NativeBytes: entry.NativeBytes})
				}
			}
		}
		return TsvectorValue{Kind: TsvectorValueValue, Value: TsvectorPayload{Lexemes: value.Lexemes, NativeBytes: langruntime.CheckedSignedNegate(1)}}
	}
	return input
}
func AdvanceTsvectorStorage(nullness BoolValue, index Int4Value) Int4Value {
	unresolvedFlavor := 0
	if nullness.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if index.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if nullness.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if index.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if nullness.Kind == BoolValueError {
		error := nullness.Error
		return Int4Value{Kind: Int4ValueError, Error: error}
	}
	if nullness == (BoolValue{Kind: BoolValueValue, Value: true}) {
		return index
	}
	if nullness == (BoolValue{Kind: BoolValueValue, Value: false}) {
		if index.Kind == Int4ValueValue {
			value := langruntime.CheckedI32(index.Value)
			if value < 2147483647 {
				return MakeInt4Value(langruntime.CheckedSignedAdd(value, 1))
			}
		}
	}
	return Int4Unresolved(unresolvedFlavor)
}
func FinishTsvectorStorage(input ArrayElement, plan *TsvectorStoragePlan, index Int4Value) ArrayElement {
	input = CopyArrayElement(input)
	plan = langruntime.CheckedBorrowed(plan, CopyTsvectorStoragePlan)
	if input.Kind == ArrayElementError {
		error := input.Error
		return ArrayElement{Kind: ArrayElementError, Error: error}
	}
	if index.Kind == Int4ValueValue {
		count := langruntime.CheckedI32(index.Value)
		if plan.Valid && count >= 0 && langruntime.IndexFromI32(count, 0) == len(plan.Entries) {
			return input
		}
	}
	return clearTsvectorStorage(input)
}
func clearTsvectorStorage(input ArrayElement) ArrayElement {
	input = CopyArrayElement(input)
	if input.Kind == ArrayElementTsvector {
		value := CopyTsvectorPayload(input.Tsvector)
		return ArrayElement{Kind: ArrayElementTsvector, Tsvector: TsvectorPayload{Lexemes: value.Lexemes, NativeBytes: langruntime.CheckedSignedNegate(1)}}
	}
	if input.Kind == ArrayElementArray {
		value := CopyArrayPayload(input.Array)
		elements := []ArrayElement{}
		i := 0
		for i < len(value.Elements) {
			langruntime.CheckedAdd(len(elements), 1)
			elements = append(elements, CopyArrayElement(clearTsvectorStorage(CopyArrayElement(value.Elements[i]))))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementArray, Array: ArrayPayload{ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: value.Dimensions, NullBitmap: value.NullBitmap, Elements: elements}}
	}
	if input.Kind == ArrayElementComposite {
		value := CopyCompositePayload(input.Composite)
		fields := []ArrayElement{}
		i := 0
		for i < len(value.Fields) {
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, CopyArrayElement(clearTsvectorStorage(CopyArrayElement(value.Fields[i]))))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementComposite, Composite: CompositePayload{TypeName: value.TypeName, Fields: fields}}
	}
	if input.Kind == ArrayElementRange {
		value := CopyRangePayload(input.Range)
		bounds := []ArrayElement{}
		i := 0
		for i < len(value.Bounds) {
			langruntime.CheckedAdd(len(bounds), 1)
			bounds = append(bounds, CopyArrayElement(clearTsvectorStorage(CopyArrayElement(value.Bounds[i]))))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementRange, Range: RangePayloadWithBounds(value, bounds)}
	}
	if input.Kind == ArrayElementMultirange {
		value := CopyMultirangePayload(input.Multirange)
		ranges := []RangeValue{}
		i := 0
		for i < len(value.Ranges) {
			member := ArrayElementFromRange(CopyRangeValue(value.Ranges[i]))
			restored := clearTsvectorStorage(member)
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(ArrayElementToRange(restored)))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementMultirange, Multirange: MultirangePayloadWithRanges(value, ranges)}
	}
	return input
}

type arrayStorageEntry struct {
	path       string
	dimensions int
	elements   int
	nullBitmap bool
}

func copyarrayStorageEntry(value arrayStorageEntry) arrayStorageEntry {
	return arrayStorageEntry{path: langruntime.CheckedString(value.path), dimensions: langruntime.CheckedI32(value.dimensions), elements: langruntime.CheckedI32(value.elements), nullBitmap: value.nullBitmap}
}

type ArrayStoragePlan struct {
	entries []arrayStorageEntry
	valid   bool
}

func CopyArrayStoragePlan(value ArrayStoragePlan) ArrayStoragePlan {
	return ArrayStoragePlan{entries: langruntime.CheckedStructs(value.entries, copyarrayStorageEntry), valid: value.valid}
}
func MakeArrayStoragePlan() ArrayStoragePlan {
	entries := []arrayStorageEntry{}
	return ArrayStoragePlan{entries: entries, valid: true}
}
func AppendArrayStorage(input ArrayStoragePlan, path string, dimensions int, elements int, bitmap bool) ArrayStoragePlan {
	input = CopyArrayStoragePlan(input)
	path = langruntime.CheckedString(path)
	dimensions = langruntime.CheckedI32(dimensions)
	elements = langruntime.CheckedI32(elements)
	entries := input.entries
	valid := input.valid && dimensions >= 0 && dimensions <= 6 && elements >= 0
	langruntime.CheckedAdd(len(entries), 1)
	entries = append(entries, copyarrayStorageEntry(arrayStorageEntry{path: path, dimensions: dimensions, elements: elements, nullBitmap: bitmap}))
	return ArrayStoragePlan{entries: entries, valid: valid}
}
func arrayStorageChildPath(path string, index int) string {
	path = langruntime.CheckedString(path)
	index = langruntime.CheckedIndex(index)
	child := langruntime.NewTextBuffer(path)
	child = append(child, string(langruntime.CheckedChar('/'))...)
	number := int(int32(index))
	wide := int64(langruntime.CheckedI32(number))
	text := TextSignedNumber(wide)
	child = append(child, text...)
	return string(child)
}
func arrayStorageMissingBitmap(input *ArrayPayload, unresolvedFlavor int) BoolValue {
	unresolvedFlavor = langruntime.CheckedI32(unresolvedFlavor)
	elements := ArrayElementsBitmap(input)
	if elements == (BoolValue{Kind: BoolValueValue, Value: true}) {
		return elements
	}
	localFlavor2254 := unresolvedFlavor
	if elements.Kind == BoolValueUnknown {
		if localFlavor2254 < 1 {
			localFlavor2254 = langruntime.CheckedI32(1)
		}
	}
	if elements.Kind == BoolValueUnimplemented {
		localFlavor2254 = langruntime.CheckedI32(2)
	}
	return BoolUnresolved(localFlavor2254)
}
func ForgetArrayStorage(input ArrayElement) ArrayElement {
	input = CopyArrayElement(input)
	return forgetArrayStorageAs(input, 1)
}
func DiscardArrayStorage(input ArrayElement) ArrayElement {
	input = CopyArrayElement(input)
	return forgetArrayStorageAs(input, 2)
}
func forgetArrayStorageAs(input ArrayElement, flavor int) ArrayElement {
	input = CopyArrayElement(input)
	flavor = langruntime.CheckedI32(flavor)
	if input.Kind == ArrayElementArray {
		value := CopyArrayPayload(input.Array)
		bitmap := arrayStorageMissingBitmap(&value, flavor)
		elements := []ArrayElement{}
		i := 0
		for i < len(value.Elements) {
			langruntime.CheckedAdd(len(elements), 1)
			elements = append(elements, CopyArrayElement(forgetArrayStorageAs(CopyArrayElement(value.Elements[i]), flavor)))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementArray, Array: ArrayPayload{ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: value.Dimensions, Elements: elements, NullBitmap: bitmap}}
	}
	if input.Kind == ArrayElementComposite {
		value := CopyCompositePayload(input.Composite)
		fields := []ArrayElement{}
		i := 0
		for i < len(value.Fields) {
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, CopyArrayElement(forgetArrayStorageAs(CopyArrayElement(value.Fields[i]), flavor)))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementComposite, Composite: CompositePayload{TypeName: value.TypeName, Fields: fields}}
	}
	if input.Kind == ArrayElementRange {
		value := CopyRangePayload(input.Range)
		bounds := []ArrayElement{}
		i := 0
		for i < len(value.Bounds) {
			langruntime.CheckedAdd(len(bounds), 1)
			bounds = append(bounds, CopyArrayElement(forgetArrayStorageAs(CopyArrayElement(value.Bounds[i]), flavor)))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementRange, Range: RangePayloadWithBounds(value, bounds)}
	}
	if input.Kind == ArrayElementMultirange {
		value := CopyMultirangePayload(input.Multirange)
		ranges := []RangeValue{}
		i := 0
		for i < len(value.Ranges) {
			member := ArrayElementFromRange(CopyRangeValue(value.Ranges[i]))
			restored := forgetArrayStorageAs(member, flavor)
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(ArrayElementToRange(restored)))
			i = langruntime.CheckedAdd(i, 1)
		}
		return ArrayElement{Kind: ArrayElementMultirange, Multirange: MultirangePayloadWithRanges(value, ranges)}
	}
	return input
}

type arrayStorageResult struct {
	value   ArrayElement
	matched int
	valid   bool
}

func copyarrayStorageResult(value arrayStorageResult) arrayStorageResult {
	return arrayStorageResult{value: CopyArrayElement(value.value), matched: langruntime.CheckedIndex(value.matched), valid: value.valid}
}
func applyArrayStorageAt(input ArrayElement, plan *ArrayStoragePlan, path string) arrayStorageResult {
	input = CopyArrayElement(input)
	path = langruntime.CheckedString(path)
	if input.Kind == ArrayElementArray {
		value := CopyArrayPayload(input.Array)
		matched := 0
		bitmap := arrayStorageMissingBitmap(&value, 2)
		valid := true
		i := 0
		for i < len(plan.entries) {
			entry := copyarrayStorageEntry(plan.entries[i])
			if entry.path == path {
				matched = langruntime.CheckedAdd(matched, 1)
				if langruntime.IndexFromI32(entry.dimensions, 2147483647) != len(value.Dimensions) || langruntime.IndexFromI32(entry.elements, 2147483647) != len(value.Elements) || (entry.nullBitmap == false && bitmap == (BoolValue{Kind: BoolValueValue, Value: true})) {
					valid = false
				}
				bitmap = BoolValue{Kind: BoolValueValue, Value: entry.nullBitmap}
			}
			i = langruntime.CheckedAdd(i, 1)
		}
		if matched != 1 {
			valid = false
		}
		elements := []ArrayElement{}
		i = langruntime.CheckedIndex(0)
		for i < len(value.Elements) {
			childPath := arrayStorageChildPath(path, i)
			child := applyArrayStorageAt(CopyArrayElement(value.Elements[i]), plan, childPath)
			matched = langruntime.CheckedAdd(matched, child.matched)
			valid = valid && child.valid
			langruntime.CheckedAdd(len(elements), 1)
			elements = append(elements, CopyArrayElement(child.value))
			i = langruntime.CheckedAdd(i, 1)
		}
		restored := ArrayElement{Kind: ArrayElementArray, Array: ArrayPayload{ElementType: value.ElementType, ElementKind: value.ElementKind, Dimensions: value.Dimensions, Elements: elements, NullBitmap: bitmap}}
		return arrayStorageResult{value: restored, matched: matched, valid: valid}
	}
	if input.Kind == ArrayElementComposite {
		value := CopyCompositePayload(input.Composite)
		fields := []ArrayElement{}
		matched := 0
		valid := true
		i := 0
		for i < len(value.Fields) {
			childPath := arrayStorageChildPath(path, i)
			child := applyArrayStorageAt(CopyArrayElement(value.Fields[i]), plan, childPath)
			matched = langruntime.CheckedAdd(matched, child.matched)
			valid = valid && child.valid
			langruntime.CheckedAdd(len(fields), 1)
			fields = append(fields, CopyArrayElement(child.value))
			i = langruntime.CheckedAdd(i, 1)
		}
		restored := ArrayElement{Kind: ArrayElementComposite, Composite: CompositePayload{TypeName: value.TypeName, Fields: fields}}
		return arrayStorageResult{value: restored, matched: matched, valid: valid}
	}
	if input.Kind == ArrayElementRange {
		value := CopyRangePayload(input.Range)
		bounds := []ArrayElement{}
		matched := 0
		valid := true
		i := 0
		for i < len(value.Bounds) {
			childPath := arrayStorageChildPath(path, i)
			child := applyArrayStorageAt(CopyArrayElement(value.Bounds[i]), plan, childPath)
			matched = langruntime.CheckedAdd(matched, child.matched)
			valid = valid && child.valid
			langruntime.CheckedAdd(len(bounds), 1)
			bounds = append(bounds, CopyArrayElement(child.value))
			i = langruntime.CheckedAdd(i, 1)
		}
		restored := ArrayElement{Kind: ArrayElementRange, Range: RangePayloadWithBounds(value, bounds)}
		return arrayStorageResult{value: restored, matched: matched, valid: valid}
	}
	if input.Kind == ArrayElementMultirange {
		value := CopyMultirangePayload(input.Multirange)
		ranges := []RangeValue{}
		matched := 0
		valid := true
		i := 0
		for i < len(value.Ranges) {
			childPath := arrayStorageChildPath(path, i)
			member := ArrayElementFromRange(CopyRangeValue(value.Ranges[i]))
			child := applyArrayStorageAt(member, plan, childPath)
			matched = langruntime.CheckedAdd(matched, child.matched)
			valid = valid && child.valid
			langruntime.CheckedAdd(len(ranges), 1)
			ranges = append(ranges, CopyRangeValue(ArrayElementToRange(child.value)))
			i = langruntime.CheckedAdd(i, 1)
		}
		restored := ArrayElement{Kind: ArrayElementMultirange, Multirange: MultirangePayloadWithRanges(value, ranges)}
		return arrayStorageResult{value: restored, matched: matched, valid: valid}
	}
	return arrayStorageResult{value: input, matched: 0, valid: true}
}
func ApplyArrayStorage(input ArrayElement, plan *ArrayStoragePlan) ArrayElement {
	input = CopyArrayElement(input)
	plan = langruntime.CheckedBorrowed(plan, CopyArrayStoragePlan)
	result := applyArrayStorageAt(input, plan, "")
	if plan.valid && result.valid && result.matched == len(plan.entries) {
		return result.value
	}
	return DiscardArrayStorage(result.value)
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
		return ArrayComparisonPayload{Left: value.Elements, Right: right, Limit: limit, State: 1, Error: MakeSqlError(0), Tail: 0, Value: 0, Flavor: 2}
	}
	if input.Kind == ArrayValueUnknown {
		return ArrayComparisonUnresolved(1, 0)
	}
	return arrayComparisonState(langruntime.CheckedSignedNegate(1), MakeSqlError(0), 0)
}
func ArrayQuantifierInitial(input *ArrayComparisonPayload, any bool) CheckOutcome {
	unresolvedFlavor := 0
	if input.State == langruntime.CheckedSignedNegate(2) {
		return CheckOutcome{Kind: CheckOutcomeError, Error: input.Error}
	}
	if input.State == langruntime.CheckedSignedNegate(1) {
		return CheckUnresolved(ArrayComparisonFlavor(input, unresolvedFlavor))
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
	if (result == (CheckOutcome{Kind: CheckOutcomeUnknown}) || result == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) && safe == false {
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
	unresolvedFlavor := 0
	if input.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if validity.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if validity.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if validity.Kind == CheckOutcomeError {
		error := validity.Error
		return BoolValue{Kind: BoolValueError, Error: error}
	}
	conditionFlavor1074 := unresolvedFlavor
	if validity.Kind == CheckOutcomeUnknown {
		if conditionFlavor1074 < 1 {
			conditionFlavor1074 = langruntime.CheckedI32(1)
		}
	}
	if validity.Kind == CheckOutcomeUnimplemented {
		conditionFlavor1074 = langruntime.CheckedI32(2)
	}
	if validity == (CheckOutcome{Kind: CheckOutcomeUnknown}) || validity == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return BoolUnresolved(conditionFlavor1074)
	}
	return BoolFromCheck(input)
}
func BitFromLiteral(value string) BitValue {
	value = langruntime.CheckedString(value)
	unresolvedFlavor := 0
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
		return BitUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return BitValue{Kind: BitValueError, Error: error}
	}
	conditionFlavor644 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor644 < 1 {
			conditionFlavor644 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor644 = langruntime.CheckedI32(2)
	}
	if (input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull}) {
		return BitUnresolved(conditionFlavor644)
	}
	if input == (TextValue{Kind: TextValueNull}) {
		return BitValue{Kind: BitValueNull}
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		return BitFromLiteral(value)
	}
	return BitUnresolved(unresolvedFlavor)
}
func BitToText(input BitValue) TextValue {
	unresolvedFlavor := 0
	if input.Kind == BitValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == BitValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == BitValueError {
		error := input.Error
		return TextValue{Kind: TextValueError, Error: error}
	}
	conditionFlavor834 := unresolvedFlavor
	if input.Kind == BitValueUnknown {
		if conditionFlavor834 < 1 {
			conditionFlavor834 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == BitValueUnimplemented {
		conditionFlavor834 = langruntime.CheckedI32(2)
	}
	if input == (BitValue{Kind: BitValueUnknown}) || input == (BitValue{Kind: BitValueUnimplemented}) {
		return TextUnresolved(conditionFlavor834)
	}
	if input == (BitValue{Kind: BitValueNull}) {
		return TextValue{Kind: TextValueNull}
	}
	if input.Kind == BitValueValue {
		value := langruntime.CheckedString(input.Value)
		return TextValue{Kind: TextValueValue, Value: value}
	}
	return TextUnresolved(unresolvedFlavor)
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
	return Int4Unresolved(1)
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
	return Int8Unresolved(1)
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

const ordinalDateAbsent = 0
const ordinalDateFound = 1
const ordinalDateDeferred = 2
const ordinalDateSyntax = 3
const ordinalDateOverflow = 4
const ordinalDateCalendar = 5

type ordinalDateText struct {
	state      int
	next       int
	year       int
	overflow   bool
	month      int
	day        int
	minusZone  bool
	julian     bool
	julianTime int64
}

func copyordinalDateText(value ordinalDateText) ordinalDateText {
	return ordinalDateText{state: langruntime.CheckedI32(value.state), next: langruntime.CheckedIndex(value.next), year: langruntime.CheckedI32(value.year), overflow: value.overflow, month: langruntime.CheckedI32(value.month), day: langruntime.CheckedI32(value.day), minusZone: value.minusZone, julian: value.julian, julianTime: value.julianTime}
}

type ordinalCalendar struct {
	known bool
	year  int
	month int
	day   int
}

func copyordinalCalendar(value ordinalCalendar) ordinalCalendar {
	return ordinalCalendar{known: value.known, year: langruntime.CheckedI32(value.year), month: langruntime.CheckedI32(value.month), day: langruntime.CheckedI32(value.day)}
}
func englishDateLetter(value rune) bool {
	value = langruntime.CheckedChar(value)
	code := int(langruntime.CheckedChar(langruntime.AsciiLowercase(value)))
	return code >= 97 && code <= 122
}
func englishDateWord(text *timestampText, start int, end int) string {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	word := langruntime.NewTextBuffer("")
	index := start
	for index < end && englishDateLetter(text.chars[index]) {
		word = append(word, string(langruntime.CheckedChar(langruntime.AsciiLowercase(text.chars[index])))...)
		index = langruntime.CheckedAdd(index, 1)
	}
	return string(word)
}
func englishDateWordEnd(text *timestampText, start int, end int) int {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	index := start
	for index < end && englishDateLetter(text.chars[index]) {
		index = langruntime.CheckedAdd(index, 1)
	}
	return index
}
func englishDateMonth(word string) int {
	word = langruntime.CheckedString(word)
	if word == "jan" || word == "january" {
		return 1
	}
	if word == "feb" || word == "february" {
		return 2
	}
	if word == "mar" || word == "march" {
		return 3
	}
	if word == "apr" || word == "april" {
		return 4
	}
	if word == "may" {
		return 5
	}
	if word == "jun" || word == "june" {
		return 6
	}
	if word == "jul" || word == "july" {
		return 7
	}
	if word == "aug" || word == "august" {
		return 8
	}
	if word == "sep" || word == "sept" || word == "september" {
		return 9
	}
	if word == "oct" || word == "october" {
		return 10
	}
	if word == "nov" || word == "november" {
		return 11
	}
	if word == "dec" || word == "december" {
		return 12
	}
	return 0
}
func englishDateWeekday(word string) bool {
	word = langruntime.CheckedString(word)
	return word == "sun" || word == "sunday" || word == "mon" || word == "monday" || word == "tue" || word == "tues" || word == "tuesday" || word == "wed" || word == "wednesday" || word == "thu" || word == "thur" || word == "thurs" || word == "thursday" || word == "fri" || word == "friday" || word == "sat" || word == "saturday"
}
func englishDateGap(text *timestampText, start int, end int) int {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	index := start
	for index < end && (dateTextSpace(text.chars[index]) || text.chars[index] == ',') {
		index = langruntime.CheckedAdd(index, 1)
	}
	return index
}
func englishDateDelimiter(value rune) bool {
	value = langruntime.CheckedChar(value)
	return value == '-' || value == '/' || value == '.'
}
func englishDateResult(state int, next int, year int, month int, day int) ordinalDateText {
	state = langruntime.CheckedI32(state)
	next = langruntime.CheckedIndex(next)
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	return ordinalDateText{state: state, next: next, year: year, overflow: false, month: month, day: day, minusZone: false, julian: false, julianTime: int64(-1)}
}
func englishDateFields(first *timestampNumber, second *timestampNumber, month int, next int, delimited bool, numberFirst bool) ordinalDateText {
	month = langruntime.CheckedI32(month)
	next = langruntime.CheckedIndex(next)
	if delimited == false && (first.digits >= 6 || second.digits >= 6) {
		return englishDateResult(ordinalDateSyntax, next, 0, 0, 0)
	}
	if delimited && (first.digits >= 10 || second.digits >= 10) {
		return englishDateResult(ordinalDateDeferred, next, 0, 0, 0)
	}
	if first.digits >= 3 {
		return englishDateResult(ordinalDateCalendar, next, first.value, month, second.value)
	}
	if second.digits < 3 || (delimited == false && numberFirst && (first.value < 1 || first.value > 31)) {
		return englishDateResult(ordinalDateDeferred, next, 0, 0, 0)
	}
	return englishDateResult(ordinalDateCalendar, next, second.value, month, first.value)
}
func readEnglishTrailingMonth(text *timestampText, first *timestampNumber, secondStart int, end int) ordinalDateText {
	secondStart = langruntime.CheckedIndex(secondStart)
	end = langruntime.CheckedIndex(end)
	absent := englishDateResult(ordinalDateAbsent, secondStart, 0, 0, 0)
	second := readTimestampNumber(text, secondStart, end)
	wordStart := englishDateGap(text, second.next, end)
	if wordStart == end || englishDateLetter(text.chars[wordStart]) == false {
		return absent
	}
	word := englishDateWord(text, wordStart, end)
	month := englishDateMonth(word)
	if month == 0 {
		return absent
	}
	wordEnd := englishDateWordEnd(text, wordStart, end)
	if wordEnd < end && dateTextSpace(text.chars[wordEnd]) == false && langruntime.AsciiLowercase(text.chars[wordEnd]) != 't' && text.chars[wordEnd] != '+' {
		return englishDateResult(ordinalDateDeferred, wordEnd, 0, 0, 0)
	}
	if first.digits >= 6 || second.digits >= 6 {
		return englishDateResult(ordinalDateSyntax, wordEnd, 0, 0, 0)
	}
	if first.digits <= 2 {
		return englishDateResult(ordinalDateDeferred, wordEnd, 0, 0, 0)
	}
	if (second.digits == 3 && second.value >= 1 && second.value <= 366) || second.value < 1 || second.value > 31 {
		return englishDateResult(ordinalDateSyntax, wordEnd, 0, 0, 0)
	}
	return englishDateResult(ordinalDateCalendar, wordEnd, first.value, month, second.value)
}
func readEnglishDate(text *timestampText, start int, end int) ordinalDateText {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	absent := englishDateResult(ordinalDateAbsent, start, 0, 0, 0)
	index := start
	leading := englishDateWord(text, index, end)
	if englishDateWeekday(leading) {
		leadingEnd := englishDateWordEnd(text, index, end)
		index = langruntime.CheckedIndex(englishDateGap(text, leadingEnd, end))
		if index == leadingEnd {
			return absent
		}
	}
	if index == end {
		return absent
	}
	if englishDateLetter(text.chars[index]) {
		word := englishDateWord(text, index, end)
		month := englishDateMonth(word)
		if month == 0 {
			return absent
		}
		after := englishDateWordEnd(text, index, end)
		if after < end && englishDateDelimiter(text.chars[after]) {
			delimiter := text.chars[after]
			first := readTimestampNumber(text, langruntime.CheckedAdd(after, 1), end)
			if first.digits == 0 || first.next == end || text.chars[first.next] != delimiter {
				return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
			}
			second := readTimestampNumber(text, langruntime.CheckedAdd(first.next, 1), end)
			if second.digits == 0 || (second.next < end && dateTextSpace(text.chars[second.next]) == false) {
				return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
			}
			return englishDateFields(&first, &second, month, second.next, true, false)
		}
		firstStart := englishDateGap(text, after, end)
		first := readTimestampNumber(text, firstStart, end)
		if first.digits == 0 {
			return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
		}
		secondStart := englishDateGap(text, first.next, end)
		second := readTimestampNumber(text, secondStart, end)
		if secondStart == first.next || second.digits == 0 || (second.next < end && dateTextSpace(text.chars[second.next]) == false && langruntime.AsciiLowercase(text.chars[second.next]) != 't' && text.chars[second.next] != '+') {
			return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
		}
		return englishDateFields(&first, &second, month, second.next, false, false)
	}
	first := readTimestampNumber(text, index, end)
	if first.digits == 0 || first.next == end {
		return absent
	}
	after := first.next
	if englishDateDelimiter(text.chars[after]) && langruntime.CheckedAdd(after, 1) < end && englishDateLetter(text.chars[langruntime.CheckedAdd(after, 1)]) {
		delimiter := text.chars[after]
		word := englishDateWord(text, langruntime.CheckedAdd(after, 1), end)
		month := englishDateMonth(word)
		wordEnd := englishDateWordEnd(text, langruntime.CheckedAdd(after, 1), end)
		if month == 0 || wordEnd == end || text.chars[wordEnd] != delimiter {
			return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
		}
		second := readTimestampNumber(text, langruntime.CheckedAdd(wordEnd, 1), end)
		if second.digits == 0 || (second.next < end && dateTextSpace(text.chars[second.next]) == false) {
			return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
		}
		return englishDateFields(&first, &second, month, second.next, true, true)
	}
	wordStart := englishDateGap(text, after, end)
	if wordStart < end && wordStart > after && dateTextDigit(text.chars[wordStart]) >= 0 {
		return readEnglishTrailingMonth(text, &first, wordStart, end)
	}
	if wordStart == end || englishDateLetter(text.chars[wordStart]) == false {
		return absent
	}
	word := englishDateWord(text, wordStart, end)
	month := englishDateMonth(word)
	if month == 0 {
		return absent
	}
	wordEnd := englishDateWordEnd(text, wordStart, end)
	secondStart := englishDateGap(text, wordEnd, end)
	second := readTimestampNumber(text, secondStart, end)
	if second.digits == 0 || (second.next < end && dateTextSpace(text.chars[second.next]) == false && langruntime.AsciiLowercase(text.chars[second.next]) != 't' && text.chars[second.next] != '+') {
		return englishDateResult(ordinalDateDeferred, after, 0, 0, 0)
	}
	return englishDateFields(&first, &second, month, second.next, false, true)
}
func readJulianDate(text *timestampText, start int, end int) ordinalDateText {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	absent := englishDateResult(ordinalDateAbsent, start, 0, 0, 0)
	label := englishDateWord(text, start, end)
	if label != "j" && label != "jd" && label != "julian" {
		return absent
	}
	index := englishDateWordEnd(text, start, end)
	for index < end && dateTextSpace(text.chars[index]) {
		index = langruntime.CheckedAdd(index, 1)
	}
	number := readTimestampNumber(text, index, end)
	if number.digits == 0 {
		if index == end {
			return englishDateResult(ordinalDateSyntax, index, 0, 0, 0)
		}
		return englishDateResult(ordinalDateDeferred, index, 0, 0, 0)
	}
	if number.overflow {
		if number.next == end {
			return englishDateResult(ordinalDateOverflow, index, 0, 0, 0)
		}
		return englishDateResult(ordinalDateDeferred, index, 0, 0, 0)
	}
	index = langruntime.CheckedIndex(number.next)
	julianTime := int64(-1)
	if index < end && text.chars[index] == '.' {
		fraction := readTimestampNumber(text, langruntime.CheckedAdd(index, 1), end)
		if fraction.digits == 0 {
			return englishDateResult(ordinalDateDeferred, index, 0, 0, 0)
		}
		fractionText := langruntime.NewTextBuffer("")
		fractionText = append(fractionText, string(langruntime.CheckedChar('0'))...)
		digit := index
		for digit < fraction.next {
			fractionText = append(fractionText, string(langruntime.CheckedChar(text.chars[digit]))...)
			digit = langruntime.CheckedAdd(digit, 1)
		}
		parsed := langruntime.F64FromText(string(fractionText), float64(0.0))
		scaled := langruntime.F64Multiply(parsed, float64(86400000000.0))
		seconds := langruntime.F64ToI32((langruntime.F64Divide(scaled, float64(1000000.0))))
		secondsFloat := float64(seconds)
		remainder := langruntime.F64Subtract(scaled, langruntime.F64Multiply(secondsFloat, float64(1000000.0)))
		if remainder < float64(0.0) {
			seconds = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(seconds, 1))
			remainder = langruntime.F64Add(remainder, float64(1000000.0))
		}
		microseconds := langruntime.F64ToI32(remainder)
		wideSeconds := int64(langruntime.CheckedI32(seconds))
		wideMicroseconds := int64(langruntime.CheckedI32(microseconds))
		julianTime = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(wideSeconds, int64(1000000)), wideMicroseconds)
		index = langruntime.CheckedIndex(fraction.next)
	}
	if index < end && dateTextSpace(text.chars[index]) == false && langruntime.AsciiLowercase(text.chars[index]) != 't' && langruntime.AsciiLowercase(text.chars[index]) != 'z' && text.chars[index] != '+' {
		return englishDateResult(ordinalDateDeferred, index, 0, 0, 0)
	}
	wideDay := int64(langruntime.CheckedI32(number.value))
	calendar := julianCalendar(wideDay)
	return ordinalDateText{state: ordinalDateCalendar, next: index, year: calendar.year, overflow: false, month: calendar.month, day: calendar.day, minusZone: false, julian: true, julianTime: julianTime}
}
func readOrderedDate(text *timestampText, start int, end int, dateOrder int, bc bool) ordinalDateText {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	dateOrder = langruntime.CheckedI32(dateOrder)
	absent := englishDateResult(ordinalDateAbsent, start, 0, 0, 0)
	haveYear := false
	haveMonth := false
	haveDay := false
	textMonth := false
	twoDigitYear := false
	year := 0
	month := 0
	day := 0
	fields := 0
	index := start
	dateEnd := start
	for index < end && (haveYear && haveMonth && haveDay) == false {
		tokenStart := index
		word := englishDateWord(text, tokenStart, end)
		wordMonth := englishDateMonth(word)
		if wordMonth > 0 {
			wordEnd := englishDateWordEnd(text, tokenStart, end)
			if wordEnd < end && dateTextSpace(text.chars[wordEnd]) == false {
				break
			}
			if haveMonth {
				if textMonth || haveDay || month < 1 || month > 31 {
					return englishDateResult(ordinalDateSyntax, wordEnd, 0, 0, 0)
				}
				day = langruntime.CheckedI32(month)
				haveDay = true
			}
			month = langruntime.CheckedI32(wordMonth)
			haveMonth = true
			textMonth = true
			index = langruntime.CheckedIndex(wordEnd)
		} else {
			number := readTimestampNumber(text, tokenStart, end)
			if number.digits == 0 {
				break
			}
			if number.next < end && dateTextSpace(text.chars[number.next]) == false {
				break
			}
			if number.digits == 3 || number.digits >= 6 || number.overflow {
				if fields == 0 {
					return absent
				}
				return englishDateResult(ordinalDateDeferred, number.next, 0, 0, 0)
			}
			value := number.value
			long := number.digits >= 3
			assignedYear := false
			if haveYear == false && haveMonth == false && haveDay == false {
				if long || dateOrder == 3 {
					year = langruntime.CheckedI32(value)
					haveYear = true
					assignedYear = true
				} else if dateOrder == 2 {
					day = langruntime.CheckedI32(value)
					haveDay = true
				} else {
					month = langruntime.CheckedI32(value)
					haveMonth = true
				}
			} else if haveYear && haveMonth == false && haveDay == false {
				month = langruntime.CheckedI32(value)
				haveMonth = true
			} else if haveMonth && haveYear == false && haveDay == false {
				if textMonth && (long || dateOrder == 3) {
					year = langruntime.CheckedI32(value)
					haveYear = true
					assignedYear = true
				} else {
					day = langruntime.CheckedI32(value)
					haveDay = true
				}
			} else if haveYear && haveMonth && haveDay == false {
				if textMonth && long && twoDigitYear {
					day = langruntime.CheckedI32(year)
					year = langruntime.CheckedI32(value)
					twoDigitYear = false
				} else {
					day = langruntime.CheckedI32(value)
				}
				haveDay = true
			} else if haveDay && haveYear == false && haveMonth == false {
				month = langruntime.CheckedI32(value)
				haveMonth = true
			} else if haveMonth && haveDay && haveYear == false {
				year = langruntime.CheckedI32(value)
				haveYear = true
				assignedYear = true
			} else {
				return englishDateResult(ordinalDateSyntax, number.next, 0, 0, 0)
			}
			if assignedYear {
				twoDigitYear = number.digits <= 2
			}
			index = langruntime.CheckedIndex(number.next)
		}
		fields = langruntime.CheckedAdd(fields, 1)
		dateEnd = langruntime.CheckedIndex(index)
		for index < end && dateTextSpace(text.chars[index]) {
			index = langruntime.CheckedAdd(index, 1)
		}
	}
	if fields < 2 {
		return absent
	}
	if (haveYear && haveMonth && haveDay) == false {
		return englishDateResult(ordinalDateDeferred, dateEnd, 0, 0, 0)
	}
	if twoDigitYear && bc == false {
		if year < 70 {
			year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(year, 2000))
		} else {
			year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(year, 1900))
		}
	}
	return englishDateResult(ordinalDateCalendar, dateEnd, year, month, day)
}
func readDateFields(text *timestampText, start int, end int, dateOrder int, bc bool) ordinalDateText {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	dateOrder = langruntime.CheckedI32(dateOrder)
	ordinal := readOrdinalDate(text, start, end)
	if dateOrder > 0 && (ordinal.state == ordinalDateAbsent || ordinal.state == ordinalDateDeferred) {
		ordered := readOrderedDate(text, start, end, dateOrder, bc)
		if ordered.state != ordinalDateAbsent {
			return ordered
		}
	}
	return ordinal
}
func readOrdinalDate(text *timestampText, start int, end int) ordinalDateText {
	start = langruntime.CheckedIndex(start)
	end = langruntime.CheckedIndex(end)
	julian := readJulianDate(text, start, end)
	if julian.state != ordinalDateAbsent {
		return julian
	}
	english := readEnglishDate(text, start, end)
	if english.state != ordinalDateAbsent {
		return english
	}
	year := readTimestampNumber(text, start, end)
	index := year.next
	state := ordinalDateAbsent
	month := 0
	day := 0
	minusZone := false
	if year.digits > 0 && index < end {
		separator := text.chars[index]
		if separator == '-' || separator == '/' || separator == '.' {
			field := readTimestampNumber(text, langruntime.CheckedAdd(index, 1), end)
			if field.digits > 0 && (field.next == end || text.chars[field.next] != separator) {
				index = langruntime.CheckedIndex(field.next)
				if field.digits == 3 && field.value >= 1 && field.value <= 366 {
					state = langruntime.CheckedI32(ordinalDateFound)
					day = langruntime.CheckedI32(field.value)
					minusZone = separator != '-'
					if year.digits <= 2 {
						state = langruntime.CheckedI32(ordinalDateDeferred)
					}
				} else if year.overflow || field.overflow {
					state = langruntime.CheckedI32(ordinalDateDeferred)
					if index == end {
						state = langruntime.CheckedI32(ordinalDateOverflow)
					}
				} else {
					state = langruntime.CheckedI32(ordinalDateSyntax)
				}
			}
		} else if dateTextSpace(separator) && year.digits >= 3 && year.digits <= 5 {
			position := index
			for position < end && dateTextSpace(text.chars[position]) {
				position = langruntime.CheckedAdd(position, 1)
			}
			field := readTimestampNumber(text, position, end)
			if field.digits == 3 && field.value >= 1 && field.value <= 366 && (field.next == end || dateTextSpace(text.chars[field.next]) || langruntime.AsciiLowercase(text.chars[field.next]) == 't' || text.chars[field.next] == '+') {
				state = langruntime.CheckedI32(ordinalDateFound)
				day = langruntime.CheckedI32(field.value)
				index = langruntime.CheckedIndex(field.next)
			} else if field.digits >= 6 {
				state = langruntime.CheckedI32(ordinalDateSyntax)
			} else if field.digits > 0 && field.next == end {
				index = langruntime.CheckedIndex(field.next)
				state = langruntime.CheckedI32(ordinalDateOverflow)
				if year.value != 0 && field.value >= 1 && field.value <= 12 {
					state = langruntime.CheckedI32(ordinalDateSyntax)
				}
			} else if field.digits > 0 && dateTextSpace(text.chars[field.next]) {
				thirdStart := field.next
				for thirdStart < end && dateTextSpace(text.chars[thirdStart]) {
					thirdStart = langruntime.CheckedAdd(thirdStart, 1)
				}
				third := readTimestampNumber(text, thirdStart, end)
				if third.digits >= 6 {
					state = langruntime.CheckedI32(ordinalDateSyntax)
				} else if third.digits > 0 && (third.next == end || dateTextSpace(text.chars[third.next]) || langruntime.AsciiLowercase(text.chars[third.next]) == 't' || text.chars[third.next] == '+') {
					state = langruntime.CheckedI32(ordinalDateCalendar)
					month = langruntime.CheckedI32(field.value)
					day = langruntime.CheckedI32(third.value)
					index = langruntime.CheckedIndex(third.next)
				} else if third.digits == 0 && thirdStart < end && langruntime.AsciiLowercase(text.chars[thirdStart]) == 't' && (langruntime.CheckedAdd(thirdStart, 1) == end || dateTextDigit(text.chars[langruntime.CheckedAdd(thirdStart, 1)]) >= 0 || dateTextSpace(text.chars[langruntime.CheckedAdd(thirdStart, 1)])) {
					state = langruntime.CheckedI32(ordinalDateSyntax)
				} else if third.digits > 0 && third.next < end && text.chars[third.next] == ':' {
					state = langruntime.CheckedI32(ordinalDateCalendar)
					month = langruntime.CheckedI32(field.value)
					day = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
					index = langruntime.CheckedIndex(field.next)
				}
			}
		}
	}
	return ordinalDateText{state: state, next: index, year: year.value, overflow: year.overflow, month: month, day: day, minusZone: minusZone, julian: false, julianTime: int64(-1)}
}
func ordinalInt4Range(value int64) bool {
	return value >= int64(-2147483648) && value <= int64(2147483647)
}
func calendarFromOrdinal(year int, day int) ordinalCalendar {
	year = langruntime.CheckedI32(year)
	day = langruntime.CheckedI32(day)
	if year == 0 {
		return ordinalCalendar{known: true, year: 0, month: 1, day: 1}
	}
	astronomical := int64(langruntime.CheckedI32(year))
	if year < 0 {
		astronomical = langruntime.CheckedI64Add(astronomical, int64(1))
	}
	shifted := langruntime.CheckedI64Add(astronomical, int64(4799))
	century := langruntime.CheckedI64Divide(shifted, int64(100))
	scaled := langruntime.CheckedI64Multiply(shifted, int64(365))
	based := langruntime.CheckedI64Subtract(scaled, int64(32167))
	leap := langruntime.CheckedI64Add(based, (langruntime.CheckedI64Add(langruntime.CheckedI64Subtract(langruntime.CheckedI64Divide(shifted, int64(4)), century), langruntime.CheckedI64Divide(century, int64(4)))))
	first := langruntime.CheckedI64Add(leap, int64(429))
	wideDay := int64(langruntime.CheckedI32(day))
	counted := langruntime.CheckedI64Add(first, wideDay)
	julianDay := langruntime.CheckedI64Subtract(counted, int64(1))
	if ordinalInt4Range(shifted) == false || ordinalInt4Range(scaled) == false || ordinalInt4Range(based) == false || ordinalInt4Range(leap) == false || ordinalInt4Range(first) == false || ordinalInt4Range(counted) == false || ordinalInt4Range(julianDay) == false {
		return ordinalCalendar{known: false, year: 0, month: 0, day: 0}
	}
	return julianCalendar(julianDay)
}
func julianCalendar(julianDay int64) ordinalCalendar {
	julian := langruntime.CheckedI64Add(julianDay, int64(32044))
	if julian < int64(0) {
		julian = langruntime.CheckedI64Add(julian, int64(4294967296))
	}
	era := langruntime.CheckedI64Divide(julian, int64(146097))
	extra := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((langruntime.CheckedI64Subtract(julian, langruntime.CheckedI64Multiply(era, int64(146097)))), int64(4)), int64(3))
	julian = langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(julian, int64(60)), langruntime.CheckedI64Multiply(era, int64(3))), langruntime.CheckedI64Divide(extra, int64(146097)))
	if julian >= int64(4294967296) {
		julian = langruntime.CheckedI64Subtract(julian, int64(4294967296))
	}
	cycle := langruntime.CheckedI64Divide(julian, int64(1461))
	julian = langruntime.CheckedI64Subtract(julian, langruntime.CheckedI64Multiply(cycle, int64(1461)))
	cycleYear := langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(julian, int64(4)), int64(1461))
	if cycleYear != int64(0) {
		julian = langruntime.CheckedI64Add(langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(julian, int64(305))), int64(365)), int64(123))
	} else {
		julian = langruntime.CheckedI64Add(langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(julian, int64(306))), int64(366)), int64(123))
	}
	cycleYear = langruntime.CheckedI64Add(cycleYear, langruntime.CheckedI64Multiply(cycle, int64(4)))
	calendarYear := langruntime.CheckedI64Subtract(cycleYear, int64(4800))
	if calendarYear <= int64(0) {
		calendarYear = langruntime.CheckedI64Subtract(calendarYear, int64(1))
	}
	monthIndex := langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(julian, int64(2141)), int64(65536))
	calendarDay := langruntime.CheckedI64Subtract(julian, langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(int64(7834), monthIndex), int64(256)))
	calendarMonth := langruntime.CheckedI64Add(langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(monthIndex, int64(10))), int64(12)), int64(1))
	return ordinalCalendar{known: true, year: int(int32(calendarYear)), month: int(int32(calendarMonth)), day: int(int32(calendarDay))}
}
func calendarShortYear(year int, digits int, bc bool) int {
	year = langruntime.CheckedI32(year)
	digits = langruntime.CheckedIndex(digits)
	if digits == 2 && bc == false {
		if year < 70 {
			return langruntime.CheckedSignedAdd(year, 2000)
		}
		return langruntime.CheckedSignedAdd(year, 1900)
	}
	return year
}
func DateFromText(value TextValue) DateValue {
	return DateFromTextOrder(value, 0)
}
func DateFromTextOrder(value TextValue, dateOrder int) DateValue {
	dateOrder = langruntime.CheckedI32(dateOrder)
	unresolvedFlavor := 0
	if value.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == TextValueError {
		error := value.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	conditionFlavor8234 := unresolvedFlavor
	if value.Kind == TextValueUnknown {
		if conditionFlavor8234 < 1 {
			conditionFlavor8234 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		conditionFlavor8234 = langruntime.CheckedI32(2)
	}
	if (value == (TextValue{Kind: TextValueUnknown}) || value == (TextValue{Kind: TextValueUnimplemented})) || value == (TextValue{Kind: TextValueNonNull}) {
		return DateUnresolved(conditionFlavor8234)
	}
	if value == (TextValue{Kind: TextValueNull}) {
		return DateValue{Kind: DateValueNull}
	}
	if value.Kind == TextValueValue {
		text := langruntime.CheckedString(value.Value)
		chars := []rune(text)
		buffer := temporalFieldBuffer(text, 129)
		if buffer == 1 {
			return DateValue{Kind: DateValueError, Error: SqlError{State: invalidDateText}}
		}
		if len(chars) > 128 {
			if buffer == 0 {
				compact := temporalCollapsedSpace(text)
				compactChars := []rune(compact)
				if len(compactChars) <= 128 {
					return DateFromTextOrder(TextValue{Kind: TextValueValue, Value: compact}, dateOrder)
				}
			}
			return DateUnresolved(unresolvedFlavor)
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
		if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 1)]) == 'c' && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 2)]) == 'b' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				if englishDateLetter(chars[langruntime.CheckedSubtract(end, 3)]) {
					return DateUnresolved(ResolutionContext(unresolvedFlavor))
				}
				return DateUnresolved(unresolvedFlavor)
			}
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		} else if langruntime.CheckedSubtract(end, start) >= 2 && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 1)]) == 'd' && langruntime.AsciiLowercase(chars[langruntime.CheckedSubtract(end, 2)]) == 'a' {
			if langruntime.CheckedSubtract(end, start) > 2 && dateTextSpace(chars[langruntime.CheckedSubtract(end, 3)]) == false && dateTextDigit(chars[langruntime.CheckedSubtract(end, 3)]) < 0 {
				if englishDateLetter(chars[langruntime.CheckedSubtract(end, 3)]) {
					return DateUnresolved(ResolutionContext(unresolvedFlavor))
				}
				return DateUnresolved(unresolvedFlavor)
			}
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 2))
		}
		for start < end && dateTextSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		label := langruntime.NewTextBuffer("")
		labelEnd := start
		for labelEnd < end {
			character := langruntime.AsciiLowercase(chars[labelEnd])
			code := int(langruntime.CheckedChar(character))
			if code < 97 || code > 122 {
				break
			}
			label = append(label, string(langruntime.CheckedChar(character))...)
			labelEnd = langruntime.CheckedAdd(labelEnd, 1)
		}
		if string(label) == "j" || string(label) == "jd" || string(label) == "julian" {
			index := labelEnd
			for index < end && dateTextSpace(chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
			if index == end {
				return DateValue{Kind: DateValueError, Error: SqlError{State: invalidDateText}}
			}
			first := index
			julian := 0
			overflow := false
			for index < end && dateTextDigit(chars[index]) >= 0 {
				digit := dateTextDigit(chars[index])
				if julian < 214748364 || (julian == 214748364 && digit <= 7) {
					julian = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(julian, 10), digit))
				} else {
					overflow = true
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			if index == first {
				return DateUnresolved(unresolvedFlavor)
			}
			if index != end {
				return dateFromTemporalText(TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(text)}, dateOrder)
			}
			if overflow {
				return DateValue{Kind: DateValueError, Error: SqlError{State: dateFieldOverflow}}
			}
			return MakeDateValue(langruntime.CheckedSignedSubtract(julian, 2451545))
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
		return dateFromTemporalText(TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(text)}, dateOrder)
	}
	return DateUnresolved(unresolvedFlavor)
}
func dateFromTemporalText(value TextValue, dateOrder int) DateValue {
	dateOrder = langruntime.CheckedI32(dateOrder)
	unresolvedFlavor := 0
	if value.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	parsed := parseTemporalText(value, false, true, dateOrder)
	if parsed.Kind == Int8ValueError {
		error := parsed.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	if parsed.Kind == Int8ValueValue {
		days := parsed.Value
		if days >= int64(-2147483648) && days <= int64(2147483647) {
			narrow := int(int32(days))
			return MakeDateValue(narrow)
		}
	}
	localFlavor9724 := unresolvedFlavor
	if parsed.Kind == Int8ValueUnknown {
		if localFlavor9724 < 1 {
			localFlavor9724 = langruntime.CheckedI32(1)
		}
	}
	if parsed.Kind == Int8ValueUnimplemented {
		localFlavor9724 = langruntime.CheckedI32(2)
	}
	return DateUnresolved(localFlavor9724)
}
func DateFromYmd(year int, month int, day int) DateValue {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	unresolvedFlavor := 0
	days := calendarDaysFromYmd(year, month, day)
	if days.Kind == Int4ValueError {
		error := days.Error
		return DateValue{Kind: DateValueError, Error: error}
	}
	if days.Kind == Int4ValueValue {
		value := langruntime.CheckedI32(days.Value)
		return MakeDateValue(value)
	}
	localFlavor9844 := unresolvedFlavor
	if days.Kind == Int4ValueUnknown {
		if localFlavor9844 < 1 {
			localFlavor9844 = langruntime.CheckedI32(1)
		}
	}
	if days.Kind == Int4ValueUnimplemented {
		localFlavor9844 = langruntime.CheckedI32(2)
	}
	return DateUnresolved(localFlavor9844)
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
const temporalFieldOverflow = 3452552

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
func timestampCalendarMicroseconds(year int, month int, day int, hour int, minute int, second int, microsecond int, offsetSeconds int, withTimezone bool, allowFractionCarry bool, missingTimezone bool, compactClock bool, ordinalDay int, dateOnly bool) Int8Value {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	offsetSeconds = langruntime.CheckedI32(offsetSeconds)
	ordinalDay = langruntime.CheckedI32(ordinalDay)
	unresolvedFlavor := 0
	maxFraction := 999999
	if allowFractionCarry {
		maxFraction = langruntime.CheckedI32(1000000)
	}
	if compactClock == false && (hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 || microsecond < 0 || microsecond > maxFraction) {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	clockSeconds := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(hour, 60), minute)), 60), second)
	clockWide := int64(langruntime.CheckedI32(clockSeconds))
	fractionWide := int64(langruntime.CheckedI32(microsecond))
	clock := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(clockWide, int64(1000000)), fractionWide)
	if compactClock == false && clock > int64(86400000000) {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	if offsetSeconds < langruntime.CheckedSignedNegate(57599) || offsetSeconds > 57599 {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampZone}}
	}
	if day < 0 {
		if year != 0 && month >= 1 && month <= 12 {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	calendarYear := year
	calendarMonth := month
	calendarDay := day
	if ordinalDay > 0 {
		ordinal := calendarFromOrdinal(year, ordinalDay)
		if ordinal.known == false {
			return Int8Unresolved(unresolvedFlavor)
		}
		calendarYear = langruntime.CheckedI32(ordinal.year)
		calendarMonth = langruntime.CheckedI32(ordinal.month)
		calendarDay = langruntime.CheckedI32(ordinal.day)
	}
	days := calendarDaysFromYmd(calendarYear, calendarMonth, calendarDay)
	if days.Kind == Int4ValueError {
		error := days.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	if days.Kind == Int4ValueValue {
		dayValue := langruntime.CheckedI32(days.Value)
		if dateOnly {
			dateWide := int64(langruntime.CheckedI32(dayValue))
			return Int8Value{Kind: Int8ValueValue, Value: dateWide}
		}
		if missingTimezone {
			return Int8Unresolved(ResolutionContext(unresolvedFlavor))
		}
		if (calendarYear == langruntime.CheckedSignedNegate(4714) && calendarMonth < 11) || (compactClock == false && dayValue < langruntime.CheckedSignedNegate(2451546)) || dayValue > 106751983 {
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
	localFlavor1434 := unresolvedFlavor
	if days.Kind == Int4ValueUnknown {
		if localFlavor1434 < 1 {
			localFlavor1434 = langruntime.CheckedI32(1)
		}
	}
	if days.Kind == Int4ValueUnimplemented {
		localFlavor1434 = langruntime.CheckedI32(2)
	}
	return Int8Unresolved(localFlavor1434)
}
func temporalSkippedPunctuation(value rune) bool {
	value = langruntime.CheckedChar(value)
	return value == '!' || value == '"' || value == '#' || value == '$' || value == '%' || value == '&' || value == '\'' || value == '(' || value == ')' || value == '*' || value == ',' || value == ';' || value == '<' || value == '=' || value == '>' || value == '?' || value == '@' || value == '[' || value == '\\' || value == ']' || value == '^' || value == '`' || value == '{' || value == '|' || value == '}' || value == '~'
}
func temporalNumberAfterClock(hour int, minute int, second int, compactClock bool, yearOverflow bool) Int8Value {
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	unresolvedFlavor := 0
	if yearOverflow || compactClock || hour == 24 {
		return Int8Unresolved(unresolvedFlavor)
	}
	if hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 {
		return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
	}
	return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
}
func parseTimestampText(value TextValue, withTimezone bool) Int8Value {
	return parseTemporalText(value, withTimezone, false, 0)
}
func temporalSpecialWord(word string) bool {
	word = langruntime.CheckedString(word)
	return word == "now" || word == "today" || word == "tomorrow" || word == "yesterday" || word == "epoch" || word == "infinity" || word == "-infinity"
}
func temporalSpecialWordConflict(input string, dateOrder int) bool {
	input = langruntime.CheckedString(input)
	dateOrder = langruntime.CheckedI32(dateOrder)
	chars := []rune(input)
	index := 0
	fields := 0
	previousSign := false
	found := false
	specialStart := 0
	specialEnd := 0
	specialFirst := false
	specialSign := false
	for index < len(chars) && found == false {
		if dateTextSpace(chars[index]) {
			index = langruntime.CheckedAdd(index, 1)
		} else {
			start := index
			word := langruntime.NewTextBuffer("")
			for index < len(chars) && dateTextSpace(chars[index]) == false {
				word = append(word, string(langruntime.CheckedChar(langruntime.AsciiLowercase(chars[index])))...)
				index = langruntime.CheckedAdd(index, 1)
			}
			if temporalSpecialWord(string(word)) {
				found = true
				specialStart = langruntime.CheckedIndex(start)
				specialEnd = langruntime.CheckedIndex(index)
				specialFirst = fields == 0
				specialSign = previousSign
			}
			previousSign = string(word) == "+" || string(word) == "-"
			fields = langruntime.CheckedI32(langruntime.CheckedSignedAdd(fields, 1))
		}
	}
	if found == false || specialSign {
		return false
	}
	if specialFirst {
		next := specialEnd
		for next < len(chars) && dateTextSpace(chars[next]) {
			next = langruntime.CheckedAdd(next, 1)
		}
		word := langruntime.NewTextBuffer("")
		for next < len(chars) && dateTextSpace(chars[next]) == false {
			word = append(word, string(langruntime.CheckedChar(langruntime.AsciiLowercase(chars[next])))...)
			next = langruntime.CheckedAdd(next, 1)
		}
		return temporalSpecialWord(string(word))
	}
	prefix := langruntime.NewTextBuffer("")
	position := 0
	for position < specialStart {
		prefix = append(prefix, string(langruntime.CheckedChar(chars[position]))...)
		position = langruntime.CheckedAdd(position, 1)
	}
	before := parseTemporalText(TextValue{Kind: TextValueValue, Value: string(prefix)}, false, false, dateOrder)
	if before.Kind == Int8ValueValue {
		return true
	}
	return false
}
func temporalLoneDateField(text string) int {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	start := 0
	for start < len(chars) && dateTextSpace(chars[start]) {
		start = langruntime.CheckedAdd(start, 1)
	}
	end := start
	for end < len(chars) && dateTextDigit(chars[end]) >= 0 {
		end = langruntime.CheckedAdd(end, 1)
	}
	if end == start || end >= len(chars) {
		return 0
	}
	delimiter := chars[end]
	if delimiter != '-' && delimiter != '/' && delimiter != '.' {
		return 0
	}
	if langruntime.CheckedAdd(end, 1) < len(chars) && dateTextSpace(chars[langruntime.CheckedAdd(end, 1)]) == false {
		return 0
	}
	significant := start
	for langruntime.CheckedAdd(significant, 1) < end && chars[significant] == '0' {
		significant = langruntime.CheckedAdd(significant, 1)
	}
	digits := langruntime.CheckedSubtract(end, significant)
	fits := digits < 10
	if digits == 10 {
		limit := []rune("2147483647")
		place := 0
		decided := false
		fits = true
		for place < 10 && decided == false {
			digit := dateTextDigit(chars[langruntime.CheckedAdd(significant, place)])
			bound := dateTextDigit(limit[place])
			if digit != bound {
				fits = digit < bound
				decided = true
			}
			place = langruntime.CheckedAdd(place, 1)
		}
	}
	if fits {
		return 1
	}
	return 2
}
func temporalRelativeWord(input string) bool {
	input = langruntime.CheckedString(input)
	chars := []rune(input)
	start := 0
	end := len(chars)
	for start < end && dateTextSpace(chars[start]) {
		start = langruntime.CheckedAdd(start, 1)
	}
	for start < end && dateTextSpace(chars[langruntime.CheckedSubtract(end, 1)]) {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	word := langruntime.NewTextBuffer("")
	for start < end {
		word = append(word, string(langruntime.CheckedChar(langruntime.AsciiLowercase(chars[start])))...)
		start = langruntime.CheckedAdd(start, 1)
	}
	return string(word) == "now" || string(word) == "today" || string(word) == "tomorrow" || string(word) == "yesterday"
}
func temporalZoneWord(text *timestampText, from int, end int) bool {
	from = langruntime.CheckedIndex(from)
	end = langruntime.CheckedIndex(end)
	start := from
	for start < end && dateTextSpace(text.chars[start]) {
		start = langruntime.CheckedAdd(start, 1)
	}
	if start == end || englishDateLetter(text.chars[start]) == false {
		return false
	}
	index := start
	for index < end {
		character := text.chars[index]
		if englishDateLetter(character) == false && dateTextDigit(character) < 0 && character != '/' && character != '_' && character != '+' && character != '-' {
			return false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	word := englishDateWord(text, start, end)
	if englishDateMonth(word) != 0 || englishDateWeekday(word) {
		return false
	}
	keyword := 0
	for keyword < len(temporalFieldWords) {
		if word == temporalFieldWords[keyword] {
			return false
		}
		keyword = langruntime.CheckedAdd(keyword, 1)
	}
	return true
}

var temporalFieldWords = []string{"ad", "allballs", "ago", "am", "at", "bc", "d", "epoch", "h", "infinity", "j", "jd", "julian", "m", "mm", "now", "on", "pm", "s", "t", "today", "tomorrow", "y", "yesterday", "z", "zulu"}

func temporalTextAnyOrder(input string, withTimezone bool, dateOnly bool) Int8Value {
	input = langruntime.CheckedString(input)
	monthFirst := parseTemporalText(TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(input)}, withTimezone, dateOnly, 1)
	dayFirst := parseTemporalText(TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(input)}, withTimezone, dateOnly, 2)
	yearFirst := parseTemporalText(TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(input)}, withTimezone, dateOnly, 3)
	if monthFirst == dayFirst && dayFirst == yearFirst {
		return monthFirst
	}
	flavor := 1
	if monthFirst == (Int8Value{Kind: Int8ValueUnimplemented}) || dayFirst == (Int8Value{Kind: Int8ValueUnimplemented}) || yearFirst == (Int8Value{Kind: Int8ValueUnimplemented}) {
		flavor = langruntime.CheckedI32(2)
	}
	return Int8Unresolved(flavor)
}

var temporalCoreTokens = []string{"ad", "allballs", "am", "apr", "april", "at", "aug", "august", "bc", "d", "dec", "december", "dow", "doy", "dst", "epoch", "feb", "february", "fri", "friday", "h", "infinity", "isodow", "isoyear", "j", "jan", "january", "jd", "jul", "julian", "july", "jun", "june", "m", "mar", "march", "may", "mm", "mon", "monday", "now", "nov", "november", "oct", "october", "on", "pm", "s", "sat", "saturday", "sep", "sept", "september", "sun", "sunday", "t", "thu", "thur", "thurs", "thursday", "today", "tomorrow", "tue", "tues", "tuesday", "wed", "wednesday", "weds", "y", "yesterday"}

func TemporalCoreToken(word string) bool {
	word = langruntime.CheckedString(word)
	token := 0
	for token < len(temporalCoreTokens) {
		if temporalCoreTokens[token] == word {
			return true
		}
		token = langruntime.CheckedAdd(token, 1)
	}
	return false
}
func temporalAsciiDigit(value rune) bool {
	value = langruntime.CheckedChar(value)
	code := int(langruntime.CheckedChar(value))
	return code >= 48 && code <= 57
}
func temporalAsciiAlnum(value rune) bool {
	value = langruntime.CheckedChar(value)
	return temporalAsciiDigit(value) || englishDateLetter(value)
}
func temporalFieldBuffer(text string, limit int) int {
	text = langruntime.CheckedString(text)
	limit = langruntime.CheckedIndex(limit)
	chars := []rune(text)
	length := len(chars)
	index := 0
	for index < length {
		code := int(langruntime.CheckedChar(chars[index]))
		if code >= 128 {
			return langruntime.CheckedSignedNegate(1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	position := 0
	fields := 0
	index = langruntime.CheckedIndex(0)
	for index < length {
		character := chars[index]
		code := int(langruntime.CheckedChar(character))
		punctuation := (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126)
		if dateTextSpace(character) {
			index = langruntime.CheckedAdd(index, 1)
		} else if punctuation && character != '+' && character != '-' && character != '.' {
			index = langruntime.CheckedAdd(index, 1)
		} else {
			if fields >= 25 {
				return 1
			}
			end := langruntime.CheckedAdd(index, 1)
			skipped := 0
			if temporalAsciiDigit(character) {
				for end < length && temporalAsciiDigit(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
				if end < length && chars[end] == ':' {
					end = langruntime.CheckedAdd(end, 1)
					for end < length && (temporalAsciiDigit(chars[end]) || chars[end] == ':' || chars[end] == '.') {
						end = langruntime.CheckedAdd(end, 1)
					}
				} else if end < length && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.') {
					delimiter := chars[end]
					end = langruntime.CheckedAdd(end, 1)
					if end < length && temporalAsciiDigit(chars[end]) {
						for end < length && temporalAsciiDigit(chars[end]) {
							end = langruntime.CheckedAdd(end, 1)
						}
						if end < length && chars[end] == delimiter {
							end = langruntime.CheckedAdd(end, 1)
							for end < length && (temporalAsciiDigit(chars[end]) || chars[end] == delimiter) {
								end = langruntime.CheckedAdd(end, 1)
							}
						}
					} else {
						for end < length && (temporalAsciiAlnum(chars[end]) || chars[end] == delimiter) {
							end = langruntime.CheckedAdd(end, 1)
						}
					}
				}
			} else if character == '.' {
				for end < length && temporalAsciiDigit(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
			} else if englishDateLetter(character) {
				for end < length && englishDateLetter(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
				joined := false
				if end < length && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.') {
					joined = true
				} else if end < length && (chars[end] == '+' || temporalAsciiDigit(chars[end])) {
					word := langruntime.NewTextBuffer("")
					letter := index
					for letter < end {
						word = append(word, string(langruntime.CheckedChar(langruntime.AsciiLowercase(chars[letter])))...)
						letter = langruntime.CheckedAdd(letter, 1)
					}
					joined = true
					token := 0
					for token < len(temporalCoreTokens) {
						if temporalCoreTokens[token] == string(word) {
							joined = false
						}
						token = langruntime.CheckedAdd(token, 1)
					}
				}
				if joined {
					end = langruntime.CheckedAdd(end, 1)
					for end < length && (temporalAsciiAlnum(chars[end]) || chars[end] == '+' || chars[end] == '-' || chars[end] == '/' || chars[end] == '_' || chars[end] == '.' || chars[end] == ':') {
						end = langruntime.CheckedAdd(end, 1)
					}
				}
			} else if character == '+' || character == '-' {
				for end < length && dateTextSpace(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
					skipped = langruntime.CheckedAdd(skipped, 1)
				}
				if end < length && temporalAsciiDigit(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
					for end < length && (temporalAsciiDigit(chars[end]) || chars[end] == ':' || chars[end] == '.' || chars[end] == '-') {
						end = langruntime.CheckedAdd(end, 1)
					}
				} else if end < length && englishDateLetter(chars[end]) {
					for end < length && englishDateLetter(chars[end]) {
						end = langruntime.CheckedAdd(end, 1)
					}
				} else {
					return 1
				}
			} else {
				return 1
			}
			appended := langruntime.CheckedSubtract(langruntime.CheckedSubtract(end, index), skipped)
			if langruntime.CheckedAdd(position, appended) >= limit {
				return 1
			}
			position = langruntime.CheckedAdd(position, langruntime.CheckedAdd(appended, 1))
			fields = langruntime.CheckedAdd(fields, 1)
			index = langruntime.CheckedIndex(end)
		}
	}
	return 0
}
func TemporalTrailingZoneStart(text string) int64 {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	length := len(chars)
	index := 0
	for index < length {
		if (int(langruntime.CheckedChar(chars[index]))) >= 128 {
			return int64(-1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	last := int64(-1)
	lastEnd := 0
	index = langruntime.CheckedIndex(0)
	for index < length {
		character := chars[index]
		code := int(langruntime.CheckedChar(character))
		punctuation := (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126)
		if dateTextSpace(character) || (punctuation && character != '+' && character != '-' && character != '.') {
			index = langruntime.CheckedAdd(index, 1)
		} else {
			end := langruntime.CheckedAdd(index, 1)
			zone := false
			if temporalAsciiDigit(character) {
				for end < length && temporalAsciiDigit(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
				if end < length && chars[end] == ':' {
					end = langruntime.CheckedAdd(end, 1)
					for end < length && (temporalAsciiDigit(chars[end]) || chars[end] == ':' || chars[end] == '.') {
						end = langruntime.CheckedAdd(end, 1)
					}
				} else if end < length && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.') {
					delimiter := chars[end]
					end = langruntime.CheckedAdd(end, 1)
					if end < length && temporalAsciiDigit(chars[end]) {
						for end < length && temporalAsciiDigit(chars[end]) {
							end = langruntime.CheckedAdd(end, 1)
						}
						if end < length && chars[end] == delimiter {
							end = langruntime.CheckedAdd(end, 1)
							for end < length && (temporalAsciiDigit(chars[end]) || chars[end] == delimiter) {
								end = langruntime.CheckedAdd(end, 1)
							}
						}
					} else {
						for end < length && (temporalAsciiAlnum(chars[end]) || chars[end] == delimiter) {
							end = langruntime.CheckedAdd(end, 1)
						}
					}
				}
			} else if character == '.' {
				for end < length && temporalAsciiDigit(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
			} else if englishDateLetter(character) {
				for end < length && englishDateLetter(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
				joined := false
				if end < length && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.') {
					joined = true
				} else if end < length && (chars[end] == '+' || temporalAsciiDigit(chars[end])) {
					word := langruntime.NewTextBuffer("")
					letter := index
					for letter < end {
						word = append(word, string(langruntime.CheckedChar(langruntime.AsciiLowercase(chars[letter])))...)
						letter = langruntime.CheckedAdd(letter, 1)
					}
					joined = true
					token := 0
					for token < len(temporalCoreTokens) {
						if temporalCoreTokens[token] == string(word) {
							joined = false
						}
						token = langruntime.CheckedAdd(token, 1)
					}
				}
				if joined {
					zone = true
					end = langruntime.CheckedAdd(end, 1)
					for end < length && (temporalAsciiAlnum(chars[end]) || chars[end] == '+' || chars[end] == '-' || chars[end] == '/' || chars[end] == '_' || chars[end] == '.' || chars[end] == ':') {
						end = langruntime.CheckedAdd(end, 1)
					}
				}
			} else if character == '+' || character == '-' {
				for end < length && dateTextSpace(chars[end]) {
					end = langruntime.CheckedAdd(end, 1)
				}
				for end < length && (temporalAsciiAlnum(chars[end]) || chars[end] == ':' || chars[end] == '.' || chars[end] == '-') {
					end = langruntime.CheckedAdd(end, 1)
				}
			} else {
				return int64(-1)
			}
			if zone {
				last = int64(langruntime.CheckedI32((int(int32(index)))))
			} else {
				last = int64(-1)
			}
			lastEnd = langruntime.CheckedIndex(end)
			index = langruntime.CheckedIndex(end)
		}
	}
	rest := lastEnd
	for rest < length && dateTextSpace(chars[rest]) {
		rest = langruntime.CheckedAdd(rest, 1)
	}
	if rest != length {
		return int64(-1)
	}
	return last
}
func temporalCollapsedSpace(text string) string {
	text = langruntime.CheckedString(text)
	chars := []rune(text)
	output := langruntime.NewTextBuffer("")
	previous := false
	index := 0
	for index < len(chars) {
		if dateTextSpace(chars[index]) {
			if previous == false {
				output = append(output, string(langruntime.CheckedChar(' '))...)
			}
			previous = true
		} else {
			output = append(output, string(langruntime.CheckedChar(chars[index]))...)
			previous = false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return string(output)
}
func temporalFirstDateField(chars []rune) []rune {
	chars = langruntime.CheckedChars(chars)
	start := 0
	for start < len(chars) && dateTextSpace(chars[start]) {
		start = langruntime.CheckedAdd(start, 1)
	}
	firstEnd := start
	for firstEnd < len(chars) && dateTextDigit(chars[firstEnd]) >= 0 {
		firstEnd = langruntime.CheckedAdd(firstEnd, 1)
	}
	if firstEnd == start || firstEnd == len(chars) {
		return chars
	}
	delimiter := chars[firstEnd]
	if delimiter != '-' && delimiter != '/' {
		return chars
	}
	fieldEnd := firstEnd
	parts := 1
	run := 0
	collapsed := false
	for fieldEnd < len(chars) && (chars[fieldEnd] == delimiter || dateTextDigit(chars[fieldEnd]) >= 0) {
		if chars[fieldEnd] == delimiter {
			run = langruntime.CheckedI32(langruntime.CheckedSignedAdd(run, 1))
			if run > 1 {
				collapsed = true
			}
		} else {
			if run > 0 {
				parts = langruntime.CheckedI32(langruntime.CheckedSignedAdd(parts, 1))
			}
			run = langruntime.CheckedI32(0)
		}
		fieldEnd = langruntime.CheckedAdd(fieldEnd, 1)
	}
	if fieldEnd < len(chars) && englishDateLetter(chars[fieldEnd]) && run == 0 && parts >= 2 && collapsed == false {
		wordEnd := fieldEnd
		for wordEnd < len(chars) && englishDateLetter(chars[wordEnd]) {
			wordEnd = langruntime.CheckedAdd(wordEnd, 1)
		}
		if wordEnd == len(chars) || dateTextSpace(chars[wordEnd]) {
			spaced := []rune{}
			index := 0
			for index < len(chars) {
				if index == fieldEnd {
					langruntime.CheckedAdd(len(spaced), 1)
					spaced = append(spaced, langruntime.CheckedChar(' '))
				}
				langruntime.CheckedAdd(len(spaced), 1)
				spaced = append(spaced, langruntime.CheckedChar(chars[index]))
				index = langruntime.CheckedAdd(index, 1)
			}
			return spaced
		}
	}
	if fieldEnd < len(chars) && englishDateLetter(chars[fieldEnd]) {
		return chars
	}
	if run >= 2 {
		rejected := []rune{}
		return rejected
	}
	trailing := run == 1 && parts >= 2
	if collapsed == false && trailing == false {
		return chars
	}
	copyEnd := fieldEnd
	if trailing {
		copyEnd = langruntime.CheckedIndex(langruntime.CheckedSubtract(fieldEnd, 1))
	}
	output := []rune{}
	index := 0
	for index < len(chars) {
		character := chars[index]
		inside := index >= firstEnd && index < fieldEnd
		if inside == false || (index < copyEnd && (character != delimiter || chars[langruntime.CheckedSubtract(index, 1)] != delimiter)) {
			langruntime.CheckedAdd(len(output), 1)
			output = append(output, langruntime.CheckedChar(character))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return output
}
func parseTemporalText(value TextValue, withTimezone bool, dateOnly bool, dateOrder int) Int8Value {
	dateOrder = langruntime.CheckedI32(dateOrder)
	spelled := value
	if value.Kind == TextValueValue {
		text := langruntime.CheckedString(value.Value)
		limit := 153
		if dateOnly {
			limit = langruntime.CheckedIndex(129)
		}
		buffer := temporalFieldBuffer(text, limit)
		if buffer == 1 {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		compact := langruntime.NewTextBuffer(langruntime.CheckedString(text))
		if buffer == 0 {
			compact = langruntime.NewTextBuffer(temporalCollapsedSpace(text))
		}
		lone := temporalLoneDateField(string(compact))
		if lone == 1 {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		if lone == 2 {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: temporalFieldOverflow}}
		}
		typed := []rune(string(compact))
		typedLength := len(typed)
		fields := temporalFirstDateField(typed)
		if len(fields) == 0 && typedLength != 0 {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		output := langruntime.NewTextBuffer("")
		index := 0
		for index < len(fields) {
			output = append(output, string(langruntime.CheckedChar(fields[index]))...)
			index = langruntime.CheckedAdd(index, 1)
		}
		spelled = TextValue{Kind: TextValueValue, Value: string(output)}
	}
	return parseTemporalFields(spelled, withTimezone, dateOnly, dateOrder)
}
func parseTemporalFields(value TextValue, withTimezone bool, dateOnly bool, dateOrder int) Int8Value {
	dateOrder = langruntime.CheckedI32(dateOrder)
	unresolvedFlavor := 0
	if value.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if value.Kind == TextValueError {
		error := value.Error
		return Int8Value{Kind: Int8ValueError, Error: error}
	}
	conditionFlavor2184 := unresolvedFlavor
	if value.Kind == TextValueUnknown {
		if conditionFlavor2184 < 1 {
			conditionFlavor2184 = langruntime.CheckedI32(1)
		}
	}
	if value.Kind == TextValueUnimplemented {
		conditionFlavor2184 = langruntime.CheckedI32(2)
	}
	if (value == (TextValue{Kind: TextValueUnknown}) || value == (TextValue{Kind: TextValueUnimplemented})) || value == (TextValue{Kind: TextValueNonNull}) {
		return Int8Unresolved(conditionFlavor2184)
	}
	if value == (TextValue{Kind: TextValueNull}) {
		return Int8Value{Kind: Int8ValueNull}
	}
	if value.Kind == TextValueValue {
		input := langruntime.CheckedString(value.Value)
		chars := []rune(input)
		if len(chars) > 128 {
			return Int8Unresolved(unresolvedFlavor)
		}
		if temporalSpecialWordConflict(input, dateOrder) {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		if temporalRelativeWord(input) {
			return Int8Unresolved(ResolutionContext(unresolvedFlavor))
		}
		bc := false
		eras := 0
		scanned := []rune{}
		eraIndex := 0
		for eraIndex < len(chars) {
			eraEnd := eraIndex
			for eraEnd < len(chars) && englishDateLetter(chars[eraEnd]) {
				eraEnd = langruntime.CheckedAdd(eraEnd, 1)
			}
			if eraEnd == eraIndex {
				eraCharacter := chars[eraIndex]
				eraFieldStart := len(scanned) == 0 || dateTextSpace(scanned[langruntime.CheckedSubtract(len(scanned), 1)])
				if temporalSkippedPunctuation(eraCharacter) || (eraFieldStart && (eraCharacter == '/' || eraCharacter == ':' || eraCharacter == '_')) {
					langruntime.CheckedAdd(len(scanned), 1)
					scanned = append(scanned, langruntime.CheckedChar(' '))
				} else {
					langruntime.CheckedAdd(len(scanned), 1)
					scanned = append(scanned, langruntime.CheckedChar(eraCharacter))
				}
				eraIndex = langruntime.CheckedAdd(eraIndex, 1)
			} else {
				eraLetter := langruntime.AsciiLowercase(chars[eraIndex])
				era := langruntime.CheckedSubtract(eraEnd, eraIndex) == 2 && ((eraLetter == 'b' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(eraIndex, 1)]) == 'c') || (eraLetter == 'a' && langruntime.AsciiLowercase(chars[langruntime.CheckedAdd(eraIndex, 1)]) == 'd'))
				if era {
					eraLeading := true
					eraDigitBefore := false
					eraBefore := 0
					for eraBefore < eraIndex {
						if dateTextSpace(chars[eraBefore]) == false {
							eraLeading = false
						}
						if dateTextDigit(chars[eraBefore]) >= 0 {
							eraDigitBefore = true
						}
						eraBefore = langruntime.CheckedAdd(eraBefore, 1)
					}
					if eraLeading {
						return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
					}
					eraTrailing := true
					eraAfter := eraEnd
					for eraAfter < len(chars) {
						if dateTextSpace(chars[eraAfter]) == false {
							eraTrailing = false
						}
						eraAfter = langruntime.CheckedAdd(eraAfter, 1)
					}
					if (eraDigitBefore == false && eraTrailing == false) || eras > 0 {
						return Int8Unresolved(unresolvedFlavor)
					}
					eraPrevious := chars[langruntime.CheckedSubtract(eraIndex, 1)]
					if dateTextSpace(eraPrevious) == false && dateTextDigit(eraPrevious) < 0 {
						return Int8Unresolved(unresolvedFlavor)
					}
					if eraEnd < len(chars) {
						eraNext := chars[eraEnd]
						if dateTextSpace(eraNext) == false && dateTextDigit(eraNext) < 0 && eraNext != '+' {
							return Int8Unresolved(unresolvedFlavor)
						}
					}
					eras = langruntime.CheckedAdd(eras, 1)
					if eraLetter == 'b' {
						bc = true
					}
					langruntime.CheckedAdd(len(scanned), 1)
					scanned = append(scanned, langruntime.CheckedChar(' '))
					langruntime.CheckedAdd(len(scanned), 1)
					scanned = append(scanned, langruntime.CheckedChar(' '))
				} else {
					for eraIndex < eraEnd {
						langruntime.CheckedAdd(len(scanned), 1)
						scanned = append(scanned, langruntime.CheckedChar(chars[eraIndex]))
						eraIndex = langruntime.CheckedAdd(eraIndex, 1)
					}
				}
				eraIndex = langruntime.CheckedIndex(eraEnd)
			}
		}
		text := timestampText{chars: scanned}
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
		for start < end && dateTextSpace(text.chars[langruntime.CheckedSubtract(end, 1)]) {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		if langruntime.CheckedSubtract(end, start) == 5 && langruntime.AsciiLowercase(text.chars[start]) == 'e' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 1)]) == 'p' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 2)]) == 'o' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 3)]) == 'c' && langruntime.AsciiLowercase(text.chars[langruntime.CheckedAdd(start, 4)]) == 'h' {
			return timestampCalendarMicroseconds(1970, 1, 1, 0, 0, 0, 0, 0, withTimezone, false, false, false, 0, dateOnly)
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
		leadingWord := englishDateWord(&text, start, end)
		if englishDateWeekday(leadingWord) {
			leadingEnd := englishDateWordEnd(&text, start, end)
			after := englishDateGap(&text, leadingEnd, end)
			tokenEnd := after
			delimited := false
			longNumber := false
			digitRun := 0
			for tokenEnd < end && dateTextSpace(text.chars[tokenEnd]) == false {
				character := text.chars[tokenEnd]
				if dateTextDigit(character) >= 0 {
					digitRun = langruntime.CheckedAdd(digitRun, 1)
					if digitRun >= 10 {
						longNumber = true
					}
				} else {
					digitRun = langruntime.CheckedIndex(0)
					if tokenEnd > after && englishDateDelimiter(character) {
						delimited = true
					}
				}
				tokenEnd = langruntime.CheckedAdd(tokenEnd, 1)
			}
			firstWord := englishDateWord(&text, after, end)
			julianLabel := firstWord == "j" || firstWord == "jd" || firstWord == "julian"
			if delimited && julianLabel == false && after < end {
				if longNumber {
					return Int8Unresolved(unresolvedFlavor)
				}
				return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
			}
			if after > leadingEnd {
				start = langruntime.CheckedIndex(after)
			}
		}
		ordinal := readDateFields(&text, start, end, dateOrder, bc)
		if ordinal.state == ordinalDateSyntax {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		}
		if ordinal.state == ordinalDateOverflow {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
		}
		if ordinal.state == ordinalDateDeferred {
			if dateOrder == 0 {
				return temporalTextAnyOrder(langruntime.CheckedString(input), withTimezone, dateOnly)
			}
			return Int8Unresolved(unresolvedFlavor)
		}
		yearField := readTimestampNumber(&text, start, end)
		year := yearField.value
		yearOverflow := yearField.overflow
		index := yearField.next
		month := 0
		day := 0
		ordinalDay := 0
		julianDate := false
		julianTime := int64(-1)
		if ordinal.state == ordinalDateFound {
			year = langruntime.CheckedI32(ordinal.year)
			yearOverflow = ordinal.overflow
			index = langruntime.CheckedIndex(ordinal.next)
			ordinalDay = langruntime.CheckedI32(ordinal.day)
		} else if ordinal.state == ordinalDateCalendar {
			year = langruntime.CheckedI32(ordinal.year)
			yearOverflow = false
			index = langruntime.CheckedIndex(ordinal.next)
			month = langruntime.CheckedI32(ordinal.month)
			day = langruntime.CheckedI32(ordinal.day)
			julianDate = ordinal.julian
			julianTime = ordinal.julianTime
		} else if yearField.digits >= 6 && (index == end || (text.chars[index] != '-' && text.chars[index] != '/' && text.chars[index] != '.')) {
			compactYear := readTimestampNumber(&text, start, langruntime.CheckedSubtract(index, 4))
			if compactYear.overflow {
				return Int8Unresolved(unresolvedFlavor)
			}
			year = langruntime.CheckedI32(calendarShortYear(compactYear.value, compactYear.digits, bc))
			yearOverflow = false
			compactMonth := readTimestampNumber(&text, langruntime.CheckedSubtract(index, 4), langruntime.CheckedSubtract(index, 2))
			compactDay := readTimestampNumber(&text, langruntime.CheckedSubtract(index, 2), index)
			month = langruntime.CheckedI32(compactMonth.value)
			day = langruntime.CheckedI32(compactDay.value)
		} else {
			if (yearField.digits == 1 || yearField.digits == 2) && dateOrder == 0 && index < end {
				return temporalTextAnyOrder(langruntime.CheckedString(input), withTimezone, dateOnly)
			}
			if (yearField.digits == 1 || yearField.digits == 2) && dateOrder > 0 && index < end {
				separator := text.chars[index]
				if separator != '-' && separator != '/' && separator != '.' {
					return Int8Unresolved(unresolvedFlavor)
				}
				secondField := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(secondField.next)
				if secondField.digits < 1 || secondField.digits > 2 || index == end || text.chars[index] != separator {
					return Int8Unresolved(unresolvedFlavor)
				}
				thirdField := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(thirdField.next)
				if thirdField.digits < 1 || thirdField.overflow || (index < end && text.chars[index] == separator) {
					return Int8Unresolved(unresolvedFlavor)
				}
				shortYear := thirdField.value
				yearDigits := thirdField.digits
				if dateOrder == 1 {
					month = langruntime.CheckedI32(yearField.value)
					day = langruntime.CheckedI32(secondField.value)
				} else if dateOrder == 2 {
					day = langruntime.CheckedI32(yearField.value)
					month = langruntime.CheckedI32(secondField.value)
				} else {
					shortYear = langruntime.CheckedI32(yearField.value)
					yearDigits = langruntime.CheckedIndex(yearField.digits)
					month = langruntime.CheckedI32(secondField.value)
					day = langruntime.CheckedI32(thirdField.value)
				}
				year = langruntime.CheckedI32(shortYear)
				if yearDigits <= 2 && bc == false {
					if year < 70 {
						year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(year, 2000))
					} else {
						year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(year, 1900))
					}
				}
			} else if yearField.digits < 3 || index == end {
				if yearField.digits == 0 && start < end && englishDateLetter(text.chars[start]) {
					return Int8Unresolved(ResolutionContext(unresolvedFlavor))
				}
				return Int8Unresolved(unresolvedFlavor)
			} else {
				separator := text.chars[index]
				if separator != '-' && separator != '/' && separator != '.' {
					return Int8Unresolved(unresolvedFlavor)
				}
				monthField := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(monthField.next)
				if monthField.digits < 1 || index == end || text.chars[index] != separator {
					return Int8Unresolved(unresolvedFlavor)
				}
				dayField := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(dayField.next)
				if index < end && text.chars[index] == separator {
					extraField := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
					if dayField.digits == 0 || extraField.digits == 0 || extraField.overflow || yearOverflow || monthField.overflow || dayField.overflow || (monthField.digits == 3 && monthField.value >= 1 && monthField.value <= 366) {
						return Int8Unresolved(unresolvedFlavor)
					}
					return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
				}
				if monthField.digits == 3 && monthField.value >= 1 && monthField.value <= 366 {
					if dayField.digits > 0 {
						if yearOverflow || dayField.overflow {
							if index == end {
								return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
							}
							return Int8Unresolved(unresolvedFlavor)
						}
						return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
					}
					ordinalDay = langruntime.CheckedI32(monthField.value)
				} else {
					if dayField.digits < 1 {
						if yearOverflow || monthField.overflow {
							if index == end {
								return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
							}
							return Int8Unresolved(unresolvedFlavor)
						}
						return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
					}
					if monthField.overflow || dayField.overflow {
						yearOverflow = true
					}
					month = langruntime.CheckedI32(monthField.value)
					day = langruntime.CheckedI32(dayField.value)
				}
			}
		}
		if bc && julianDate == false {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, year))
		}
		julianHour := 0
		julianMinute := 0
		julianSecond := 0
		julianFraction := 0
		if julianTime >= int64(0) {
			julianHour = langruntime.CheckedI32(int(int32((langruntime.CheckedI64Divide(julianTime, int64(3600000000))))))
			julianMinute = langruntime.CheckedI32(int(int32((langruntime.CheckedI64Remainder(langruntime.CheckedI64Divide(julianTime, int64(60000000)), int64(60))))))
			julianSecond = langruntime.CheckedI32(int(int32((langruntime.CheckedI64Remainder(langruntime.CheckedI64Divide(julianTime, int64(1000000)), int64(60))))))
			julianFraction = langruntime.CheckedI32(int(int32((langruntime.CheckedI64Remainder(julianTime, int64(1000000))))))
		}
		if index == end {
			if yearOverflow {
				return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
			}
			return timestampCalendarMicroseconds(year, month, day, julianHour, julianMinute, julianSecond, julianFraction, 0, false, false, withTimezone, false, ordinalDay, dateOnly)
		}
		deferredZone := false
		deferredZoneStart := index
		deferredZoneEnd := index
		zoneOnly := text.chars[index] == '+' || langruntime.AsciiLowercase(text.chars[index]) == 'z' || (ordinal.state == ordinalDateFound && ordinal.minusZone && text.chars[index] == '-')
		if langruntime.AsciiLowercase(text.chars[index]) == 't' {
			index = langruntime.CheckedAdd(index, 1)
		} else if dateTextSpace(text.chars[index]) {
			for index < end && dateTextSpace(text.chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
			leadingWord := englishDateWord(&text, index, end)
			if englishDateWeekday(leadingWord) {
				index = langruntime.CheckedIndex(englishDateWordEnd(&text, index, end))
				for index < end && dateTextSpace(text.chars[index]) {
					index = langruntime.CheckedAdd(index, 1)
				}
			}
			if index < end && langruntime.AsciiLowercase(text.chars[index]) == 't' && (langruntime.CheckedAdd(index, 1) == end || dateTextDigit(text.chars[langruntime.CheckedAdd(index, 1)]) >= 0 || dateTextSpace(text.chars[langruntime.CheckedAdd(index, 1)])) {
				index = langruntime.CheckedAdd(index, 1)
				for index < end && dateTextSpace(text.chars[index]) {
					index = langruntime.CheckedAdd(index, 1)
				}
				if index == end {
					return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
				}
			}
			clockWord := englishDateWord(&text, index, end)
			if index == end || text.chars[index] == '+' || text.chars[index] == '-' || langruntime.AsciiLowercase(text.chars[index]) == 'z' || clockWord == "am" || clockWord == "pm" {
				zoneOnly = true
			}
		} else if zoneOnly == false {
			return Int8Unresolved(unresolvedFlavor)
		}
		if zoneOnly && index < end {
			zoneMark := langruntime.AsciiLowercase(text.chars[index])
			if zoneMark == '+' || zoneMark == '-' || zoneMark == 'z' {
				tokenEnd := langruntime.CheckedAdd(index, 1)
				if zoneMark != 'z' {
					for tokenEnd < end && (dateTextDigit(text.chars[tokenEnd]) >= 0 || text.chars[tokenEnd] == ':') {
						tokenEnd = langruntime.CheckedAdd(tokenEnd, 1)
					}
				}
				clockStart := tokenEnd
				for clockStart < end && dateTextSpace(text.chars[clockStart]) {
					clockStart = langruntime.CheckedAdd(clockStart, 1)
				}
				digitStart := clockStart
				if digitStart < end && langruntime.AsciiLowercase(text.chars[digitStart]) == 't' {
					digitStart = langruntime.CheckedAdd(digitStart, 1)
				}
				zoneBody := zoneMark == 'z' || tokenEnd > langruntime.CheckedAdd(index, 1)
				if zoneBody && clockStart > tokenEnd && digitStart < end && dateTextDigit(text.chars[digitStart]) >= 0 {
					deferredZone = true
					deferredZoneStart = langruntime.CheckedIndex(index)
					deferredZoneEnd = langruntime.CheckedIndex(tokenEnd)
					index = langruntime.CheckedIndex(digitStart)
				}
			}
			if deferredZone {
				zoneOnly = false
			}
		}
		hours := readTimestampNumber(&text, index, end)
		index = langruntime.CheckedIndex(hours.next)
		hour := hours.value
		minute := 0
		second := 0
		fraction := 0
		fractional := false
		compactClock := false
		if hours.digits > 0 && index < end && text.chars[index] == ':' {
			minutes := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
			index = langruntime.CheckedIndex(minutes.next)
			if minutes.digits < 1 {
				return Int8Unresolved(unresolvedFlavor)
			}
			minute = langruntime.CheckedI32(minutes.value)
			if index < end && text.chars[index] == ':' {
				seconds := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(seconds.next)
				if seconds.digits < 1 {
					return Int8Unresolved(unresolvedFlavor)
				}
				second = langruntime.CheckedI32(seconds.value)
				fractional = true
			}
		} else if hours.digits == 4 || hours.digits == 6 {
			compactClock = true
			fractional = true
			if hours.digits == 6 {
				second = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(hour, 100))
				hour = langruntime.CheckedI32(langruntime.CheckedSignedDivide(hour, 100))
			}
			minute = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(hour, 100))
			hour = langruntime.CheckedI32(langruntime.CheckedSignedDivide(hour, 100))
		} else if hours.digits > 0 {
			if yearOverflow || deferredZone {
				return Int8Unresolved(unresolvedFlavor)
			}
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
		} else if zoneOnly == false {
			if temporalZoneWord(&text, index, end) {
				return Int8Unresolved(ResolutionContext(unresolvedFlavor))
			}
			return Int8Unresolved(unresolvedFlavor)
		}
		if julianTime >= int64(0) {
			if hours.digits > 0 {
				return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
			}
			hour = langruntime.CheckedI32(julianHour)
			minute = langruntime.CheckedI32(julianMinute)
			second = langruntime.CheckedI32(julianSecond)
			fraction = langruntime.CheckedI32(julianFraction)
		}
		if fractional && index < end && text.chars[index] == '.' {
			fractionStart := langruntime.CheckedAdd(index, 1)
			digits := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
			index = langruntime.CheckedIndex(digits.next)
			if digits.digits < 1 {
				return Int8Unresolved(unresolvedFlavor)
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
		for index < end && dateTextSpace(text.chars[index]) {
			index = langruntime.CheckedAdd(index, 1)
		}
		meridian := 0
		for index < end && englishDateLetter(text.chars[index]) {
			word := englishDateWord(&text, index, end)
			if word == "am" || word == "pm" {
				if meridian != 0 {
					return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
				}
				meridian = langruntime.CheckedI32(1)
				if word == "pm" {
					meridian = langruntime.CheckedI32(2)
				}
			} else if englishDateWeekday(word) == false {
				break
			}
			index = langruntime.CheckedIndex(englishDateWordEnd(&text, index, end))
			for index < end && dateTextSpace(text.chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
		}
		resumeIndex := index
		if deferredZone {
			index = langruntime.CheckedIndex(deferredZoneStart)
		}
		offset := 0
		missingTimezone := false
		if index < end && langruntime.AsciiLowercase(text.chars[index]) == 'z' {
			index = langruntime.CheckedAdd(index, 1)
		} else if index < end && (text.chars[index] == '+' || text.chars[index] == '-') {
			sign := text.chars[index]
			zoneHour := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
			index = langruntime.CheckedIndex(zoneHour.next)
			if zoneHour.digits < 1 || zoneHour.digits > 4 {
				return Int8Unresolved(unresolvedFlavor)
			}
			hours := zoneHour.value
			minutes := 0
			seconds := 0
			if index < end && text.chars[index] == ':' {
				if zoneHour.digits > 2 {
					return Int8Unresolved(unresolvedFlavor)
				}
				zoneMinute := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
				index = langruntime.CheckedIndex(zoneMinute.next)
				if zoneMinute.digits < 1 {
					return Int8Unresolved(unresolvedFlavor)
				}
				minutes = langruntime.CheckedI32(zoneMinute.value)
				if index < end && text.chars[index] == ':' {
					zoneSecond := readTimestampNumber(&text, langruntime.CheckedAdd(index, 1), end)
					index = langruntime.CheckedIndex(zoneSecond.next)
					if zoneSecond.digits < 1 {
						return Int8Unresolved(unresolvedFlavor)
					}
					seconds = langruntime.CheckedI32(zoneSecond.value)
				}
			} else if zoneHour.digits > 2 {
				hours = langruntime.CheckedI32(langruntime.CheckedSignedDivide(zoneHour.value, 100))
				minutes = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(zoneHour.value, 100))
			}
			if hours > 15 || minutes > 59 || seconds > 59 {
				offset = langruntime.CheckedI32(57600)
			} else {
				offset = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(hours, 60), minutes)), 60), seconds))
				if sign == '-' {
					offset = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, offset))
				}
			}
		} else if index < end && deferredZone == false && hours.digits > 0 && dateTextDigit(text.chars[index]) >= 0 {
			return temporalNumberAfterClock(hour, minute, second, compactClock, yearOverflow)
		} else if index != end {
			if temporalZoneWord(&text, index, end) {
				return Int8Unresolved(ResolutionContext(unresolvedFlavor))
			}
			return Int8Unresolved(unresolvedFlavor)
		} else if withTimezone {
			missingTimezone = true
		}
		if deferredZone {
			if index != deferredZoneEnd {
				return Int8Unresolved(unresolvedFlavor)
			}
			if offset < langruntime.CheckedSignedNegate(57599) || offset > 57599 {
				return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampZone}}
			}
			index = langruntime.CheckedIndex(resumeIndex)
		}
		for index < end && dateTextSpace(text.chars[index]) {
			index = langruntime.CheckedAdd(index, 1)
		}
		for index < end && englishDateLetter(text.chars[index]) {
			word := englishDateWord(&text, index, end)
			if word == "am" || word == "pm" {
				if meridian != 0 {
					return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampText}}
				}
				meridian = langruntime.CheckedI32(1)
				if word == "pm" {
					meridian = langruntime.CheckedI32(2)
				}
			} else if englishDateWeekday(word) == false {
				break
			}
			index = langruntime.CheckedIndex(englishDateWordEnd(&text, index, end))
			for index < end && dateTextSpace(text.chars[index]) {
				index = langruntime.CheckedAdd(index, 1)
			}
		}
		if index < end && deferredZone == false && hours.digits > 0 && dateTextDigit(text.chars[index]) >= 0 {
			afterClock := temporalNumberAfterClock(hour, minute, second, compactClock, yearOverflow)
			conditionFlavor93112 := unresolvedFlavor
			if afterClock.Kind == Int8ValueUnknown {
				if conditionFlavor93112 < 1 {
					conditionFlavor93112 = langruntime.CheckedI32(1)
				}
			}
			if afterClock.Kind == Int8ValueUnimplemented {
				conditionFlavor93112 = langruntime.CheckedI32(2)
			}
			if afterClock == (Int8Value{Kind: Int8ValueUnknown}) || afterClock == (Int8Value{Kind: Int8ValueUnimplemented}) {
				return Int8Unresolved(conditionFlavor93112)
			}
			if afterClock.Kind == Int8ValueError {
				error := afterClock.Error
				if error.State == invalidTimestampText && (offset < langruntime.CheckedSignedNegate(57599) || offset > 57599) {
					return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampZone}}
				}
			}
			return afterClock
		}
		if index != end {
			if temporalZoneWord(&text, index, end) {
				return Int8Unresolved(ResolutionContext(unresolvedFlavor))
			}
			return Int8Unresolved(unresolvedFlavor)
		}
		if yearOverflow {
			return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
		}
		if meridian != 0 {
			if hour > 12 {
				if offset < langruntime.CheckedSignedNegate(57599) || offset > 57599 {
					return Int8Value{Kind: Int8ValueError, Error: SqlError{State: invalidTimestampZone}}
				}
				return Int8Value{Kind: Int8ValueError, Error: SqlError{State: timestampFieldOverflow}}
			}
			if meridian == 1 && hour == 12 {
				hour = langruntime.CheckedI32(0)
			} else if meridian == 2 && hour != 12 {
				hour = langruntime.CheckedI32(langruntime.CheckedSignedAdd(hour, 12))
			}
		}
		return timestampCalendarMicroseconds(year, month, day, hour, minute, second, fraction, offset, withTimezone, true, missingTimezone, compactClock, ordinalDay, dateOnly)
	}
	return Int8Unresolved(unresolvedFlavor)
}
func timestampFromMicroseconds(value Int8Value) TimestampValue {
	unresolvedFlavor := 0
	if value.Kind == Int8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TimestampUnresolved(unresolvedFlavor)
}
func TimestampFromCalendar(year int, month int, day int, hour int, minute int, second int, microsecond int) TimestampValue {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	hour = langruntime.CheckedI32(hour)
	minute = langruntime.CheckedI32(minute)
	second = langruntime.CheckedI32(second)
	microsecond = langruntime.CheckedI32(microsecond)
	parsed := timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, 0, false, false, false, false, 0, false)
	return timestampFromMicroseconds(parsed)
}
func TimestampFromText(value TextValue) TimestampValue {
	parsed := parseTimestampText(value, false)
	return timestampFromMicroseconds(parsed)
}
func TimestampFromTextOrder(value TextValue, dateOrder int) TimestampValue {
	dateOrder = langruntime.CheckedI32(dateOrder)
	parsed := parseTemporalText(value, false, false, dateOrder)
	return timestampFromMicroseconds(parsed)
}
func timestamptzFromMicroseconds(value Int8Value) TimestamptzValue {
	unresolvedFlavor := 0
	if value.Kind == Int8ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int8ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return TimestamptzUnresolved(unresolvedFlavor)
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
	parsed := timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, offsetSeconds, true, false, false, false, 0, false)
	return timestamptzFromMicroseconds(parsed)
}
func TimestamptzFromText(value TextValue) TimestamptzValue {
	parsed := parseTimestampText(value, true)
	return timestamptzFromMicroseconds(parsed)
}
func TimestamptzFromTextOrder(value TextValue, dateOrder int) TimestamptzValue {
	dateOrder = langruntime.CheckedI32(dateOrder)
	parsed := parseTemporalText(value, true, false, dateOrder)
	return timestamptzFromMicroseconds(parsed)
}

const clockInputSyntax = 3452551
const clockInputRange = 3452552

func clockInputAlpha(character rune) bool {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(langruntime.AsciiLowercase(character)))
	return code >= 97 && code <= 122
}
func clockInputComplete(text string) string {
	text = langruntime.CheckedString(text)
	characters := []rune(text)
	result := langruntime.NewTextBuffer("")
	active := true
	seen := false
	position := 0
	for position < len(characters) {
		character := characters[position]
		if dateTextDigit(character) >= 0 {
			seen = true
		}
		if character == '+' || character == '-' || clockInputAlpha(character) || (seen && dateTextSpace(character)) {
			active = false
		}
		result = append(result, string(langruntime.CheckedChar(character))...)
		if active && seen && character == ':' {
			missing := langruntime.CheckedAdd(position, 1) == len(characters)
			if langruntime.CheckedAdd(position, 1) < len(characters) {
				next := characters[langruntime.CheckedAdd(position, 1)]
				missing = next == ':' || next == '.' || next == '+' || next == '-' || dateTextSpace(next) || clockInputAlpha(next)
			}
			if missing {
				result = append(result, string(langruntime.CheckedChar('0'))...)
			}
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	return string(result)
}
func clockGrammarNormalized(input TextValue) TextValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		start := 0
		end := len(chars)
		for start < end && (dateTextSpace(chars[start]) || chars[start] == ':') {
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
					conditionFlavor9420 := unresolvedFlavor
					if parsed.Kind == DateValueUnknown {
						if conditionFlavor9420 < 1 {
							conditionFlavor9420 = langruntime.CheckedI32(1)
						}
					}
					if parsed.Kind == DateValueUnimplemented {
						conditionFlavor9420 = langruntime.CheckedI32(2)
					}
					if parsed == (DateValue{Kind: DateValueUnknown}) || parsed == (DateValue{Kind: DateValueUnimplemented}) {
						return TextUnresolved(conditionFlavor9420)
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
		if langruntime.CheckedAdd(start, 1) < end && langruntime.AsciiLowercase(chars[start]) == 't' && dateTextDigit(chars[langruntime.CheckedAdd(start, 1)]) >= 0 {
			start = langruntime.CheckedAdd(start, 1)
		}
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
		normalized = langruntime.NewTextBuffer(clockInputComplete(string(normalized)))
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
	unresolvedFlavor := 0
	if rawInput.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if rawInput.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if rawInput.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
		keyword := langruntime.NewTextBuffer("")
		digitCount := 0
		wordEnd := start
		for wordEnd < end && clockInputAlpha(text.chars[wordEnd]) {
			wordEnd = langruntime.CheckedAdd(wordEnd, 1)
		}
		wordDigits := wordEnd
		for wordDigits < end && dateTextDigit(text.chars[wordDigits]) >= 0 {
			wordDigits = langruntime.CheckedAdd(wordDigits, 1)
		}
		scan := start
		for scan < end {
			keyword = append(keyword, string(langruntime.CheckedChar(langruntime.AsciiLowercase(text.chars[scan])))...)
			if dateTextDigit(text.chars[scan]) >= 0 {
				digitCount = langruntime.CheckedAdd(digitCount, 1)
			}
			scan = langruntime.CheckedAdd(scan, 1)
		}
		if digitCount == 0 {
			if string(keyword) == "now" {
				return TextUnresolved(ResolutionContext(unresolvedFlavor))
			}
			if string(keyword) == "allballs" {
				return MakeTextValue("2000-01-01 00:00:00+00")
			}
			return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputSyntax)}
		}
		if wordEnd > start && wordDigits == end && langruntime.CheckedSubtract(wordDigits, wordEnd) < 4 {
			return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputSyntax)}
		}
		numericEnd := start
		for numericEnd < end && dateTextDigit(text.chars[numericEnd]) >= 0 {
			numericEnd = langruntime.CheckedAdd(numericEnd, 1)
		}
		if numericEnd > start && langruntime.CheckedSubtract(numericEnd, start) < 4 && numericEnd < end && text.chars[numericEnd] != ':' {
			return TextValue{Kind: TextValueError, Error: MakeSqlError(clockInputSyntax)}
		}
		if numericEnd > start && numericEnd < end && text.chars[numericEnd] == '.' {
			numericEnd = langruntime.CheckedAdd(numericEnd, 1)
			for numericEnd < end && dateTextDigit(text.chars[numericEnd]) >= 0 {
				numericEnd = langruntime.CheckedAdd(numericEnd, 1)
			}
		}
		if numericEnd == end {
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
				return TextUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	localFlavor3344 := unresolvedFlavor
	if parsed.Kind == Int8ValueUnknown {
		if localFlavor3344 < 1 {
			localFlavor3344 = langruntime.CheckedI32(1)
		}
	}
	if parsed.Kind == Int8ValueUnimplemented {
		localFlavor3344 = langruntime.CheckedI32(2)
	}
	return TimeUnresolved(localFlavor3344)
}
func TimetzFromText(input TextValue) TimetzValue {
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	localFlavor3594 := unresolvedFlavor
	if utc.Kind == Int8ValueUnknown {
		if localFlavor3594 < 1 {
			localFlavor3594 = langruntime.CheckedI32(1)
		}
	}
	if utc.Kind == Int8ValueUnimplemented {
		localFlavor3594 = langruntime.CheckedI32(2)
	}
	if local.Kind == Int8ValueUnknown {
		if localFlavor3594 < 1 {
			localFlavor3594 = langruntime.CheckedI32(1)
		}
	}
	if local.Kind == Int8ValueUnimplemented {
		localFlavor3594 = langruntime.CheckedI32(2)
	}
	return TimetzUnresolved(localFlavor3594)
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
	unresolvedFlavor := 0
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
		return Int8Unresolved(unresolvedFlavor)
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
	check := mask
	stored := input.mask
	for check > 0 {
		if langruntime.CheckedSignedRemainder(check, 2) != 0 && langruntime.CheckedSignedRemainder(stored, 2) != 0 {
			return intervalInputFail(input, intervalInputSyntax)
		}
		check = langruntime.CheckedI32(langruntime.CheckedSignedDivide(check, 2))
		stored = langruntime.CheckedI32(langruntime.CheckedSignedDivide(stored, 2))
	}
	return intervalInputAcc{years: int(int32(years)), months: int(int32(months)), days: int(int32(days)), time: micros, mask: langruntime.CheckedSignedAdd(input.mask, mask), error: 0}
}
func intervalUnitsFromText(input TextValue, fieldMask int, style int) IntervalValue {
	fieldMask = langruntime.CheckedI32(fieldMask)
	style = langruntime.CheckedI32(style)
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
			return IntervalUnresolved(unresolvedFlavor)
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
		forceNegative := false
		if style == 3 && start < end {
			first := intervalTokenText(&buffer, tokens[start])
			leading := []rune(first)
			forceNegative = len(leading) > 0 && leading[0] == '-'
			scan := langruntime.CheckedAdd(start, 1)
			for scan < end {
				next := intervalTokenText(&buffer, tokens[scan])
				characters := []rune(next)
				if len(characters) > 0 && (characters[0] == '+' || characters[0] == '-') {
					forceNegative = false
				}
				scan = langruntime.CheckedAdd(scan, 1)
			}
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
				if forceNegative && acc.time > int64(0) {
					acc = copyintervalInputAcc(intervalInputAcc{years: acc.years, months: acc.months, days: acc.days, time: langruntime.CheckedI64Subtract(int64(0), acc.time), mask: acc.mask, error: acc.error})
				}
				numbers = langruntime.CheckedI32(langruntime.CheckedSignedAdd(numbers, 1))
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
				if whole == (Int8Value{Kind: Int8ValueUnknown}) || whole == (Int8Value{Kind: Int8ValueUnimplemented}) {
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
				conditionFlavor49016 := unresolvedFlavor
				if whole.Kind == Int8ValueUnknown {
					if conditionFlavor49016 < 1 {
						conditionFlavor49016 = langruntime.CheckedI32(1)
					}
				}
				if whole.Kind == Int8ValueUnimplemented {
					conditionFlavor49016 = langruntime.CheckedI32(2)
				}
				if whole == (Int8Value{Kind: Int8ValueUnknown}) || whole == (Int8Value{Kind: Int8ValueUnimplemented}) {
					asciiField := false
					scan := 0
					for scan < len(tokenChars) {
						if dateTextDigit(tokenChars[scan]) >= 0 || intervalInputAlpha(tokenChars[scan]) {
							asciiField = true
						}
						scan = langruntime.CheckedAdd(scan, 1)
					}
					if asciiField == false {
						return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
					}
					return IntervalUnresolved(conditionFlavor49016)
				}
				if whole.Kind == Int8ValueValue {
					number := whole.Value
					value := number
					fraction := intervalInputFraction(token)
					if forceNegative {
						if value > int64(0) {
							value = langruntime.CheckedI64Subtract(int64(0), value)
						}
						if fraction > float64(0.0) {
							fraction = langruntime.F64Subtract(float64(0.0), fraction)
						}
					}
					if unit < 0 {
						unit = langruntime.CheckedI32(implicitUnit)
					}
					acc = copyintervalInputAcc(intervalInputAdd(acc, value, fraction, unit))
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
				}
			}
		}
		if pending || numbers == 0 {
			return IntervalValue{Kind: IntervalValueError, Error: MakeSqlError(intervalInputSyntax)}
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
	return IntervalUnresolved(unresolvedFlavor)
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
	secondText := langruntime.NewTextBuffer(intervalTokenText(&buffer, fields[1]))
	if string(secondText) == "" {
		secondText = langruntime.NewTextBuffer("0")
	}
	firstNumber := intervalInputWhole(firstText)
	secondNumber := intervalInputWhole(string(secondText))
	if firstNumber.Kind == Int8ValueError {
		error := firstNumber.Error
		return intervalInputFail(input, intervalClockErrorState(error, rangeError))
	}
	if secondNumber.Kind == Int8ValueError {
		error := secondNumber.Error
		return intervalInputFail(input, intervalClockErrorState(error, rangeError))
	}
	if (firstNumber == (Int8Value{Kind: Int8ValueUnknown}) || firstNumber == (Int8Value{Kind: Int8ValueUnimplemented})) || (secondNumber == (Int8Value{Kind: Int8ValueUnknown}) || secondNumber == (Int8Value{Kind: Int8ValueUnimplemented})) {
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
	secondChars := []rune(string(secondText))
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
		if string(fractionText) == "" {
			fractionText = langruntime.NewTextBuffer("0")
		}
		lastNumber := intervalInputWhole(string(fractionText))
		if lastNumber.Kind == Int8ValueError {
			error := lastNumber.Error
			return intervalInputFail(input, intervalClockErrorState(error, rangeError))
		}
		if lastNumber == (Int8Value{Kind: Int8ValueUnknown}) || lastNumber == (Int8Value{Kind: Int8ValueUnimplemented}) {
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
		fractionText = langruntime.NewTextBuffer(string(secondText))
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
func intervalIsoHexDigit(value rune) int {
	value = langruntime.CheckedChar(value)
	code := int(langruntime.CheckedChar(value))
	if code >= 48 && code <= 57 {
		return langruntime.CheckedSignedSubtract(code, 48)
	}
	if code >= 65 && code <= 70 {
		return langruntime.CheckedSignedSubtract(code, 55)
	}
	if code >= 97 && code <= 102 {
		return langruntime.CheckedSignedSubtract(code, 87)
	}
	return langruntime.CheckedSignedNegate(1)
}
func intervalIsoHex(input *intervalInputText, start int, negative bool, width int) intervalIsoNumber {
	start = langruntime.CheckedIndex(start)
	width = langruntime.CheckedIndex(width)
	index := start
	mantissa := int64(0)
	value := float64(0.0)
	digits := 0
	scale := int64(0)
	wide := false
	for index < len(input.chars) && intervalIsoHexDigit(input.chars[index]) >= 0 {
		if mantissa >= langruntime.CheckedI64Divide(int64(9007199254740992), int64(16)) {
			wide = true
		} else {
			digit := intervalIsoHexDigit(input.chars[index])
			mantissa = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(mantissa, int64(16)), (int64(langruntime.CheckedI32(digit))))
			value = langruntime.F64Add(langruntime.F64Multiply(value, float64(16.0)), (float64(digit)))
		}
		index = langruntime.CheckedAdd(index, 1)
		digits = langruntime.CheckedAdd(digits, 1)
	}
	if index < len(input.chars) && input.chars[index] == '.' {
		point := langruntime.CheckedAdd(index, 1)
		if (point < len(input.chars) && intervalIsoHexDigit(input.chars[point]) >= 0) || digits > 0 {
			index = langruntime.CheckedIndex(point)
			for index < len(input.chars) && intervalIsoHexDigit(input.chars[index]) >= 0 {
				if mantissa >= langruntime.CheckedI64Divide(int64(9007199254740992), int64(16)) {
					wide = true
				} else {
					digit := intervalIsoHexDigit(input.chars[index])
					mantissa = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(mantissa, int64(16)), (int64(langruntime.CheckedI32(digit))))
					value = langruntime.F64Add(langruntime.F64Multiply(value, float64(16.0)), (float64(digit)))
					scale = langruntime.CheckedI64Subtract(scale, int64(4))
				}
				index = langruntime.CheckedAdd(index, 1)
				digits = langruntime.CheckedAdd(digits, 1)
			}
		}
	}
	if digits == 0 {
		return intervalIsoNumberFail(start, 0, 0)
	}
	if wide {
		return intervalIsoNumberFail(index, width, 1)
	}
	if index < len(input.chars) && (input.chars[index] == 'p' || input.chars[index] == 'P') {
		cursor := langruntime.CheckedAdd(index, 1)
		exponentNegative := false
		if cursor < len(input.chars) && (input.chars[cursor] == '+' || input.chars[cursor] == '-') {
			exponentNegative = input.chars[cursor] == '-'
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		if cursor < len(input.chars) && dateTextDigit(input.chars[cursor]) >= 0 {
			exponent := int64(0)
			for cursor < len(input.chars) && dateTextDigit(input.chars[cursor]) >= 0 {
				if exponent < int64(100000) {
					exponent = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(exponent, int64(10)), (int64(langruntime.CheckedI32(dateTextDigit(input.chars[cursor])))))
				}
				cursor = langruntime.CheckedAdd(cursor, 1)
			}
			if exponentNegative {
				scale = langruntime.CheckedI64Subtract(scale, exponent)
			} else {
				scale = langruntime.CheckedI64Add(scale, exponent)
			}
			index = langruntime.CheckedIndex(cursor)
		}
	}
	if mantissa != int64(0) {
		if scale > int64(1100) || scale < int64(-1200) {
			return intervalIsoNumberFail(index, width, intervalInputSyntax)
		}
		for scale > int64(0) {
			value = langruntime.F64Multiply(value, float64(2.0))
			scale = langruntime.CheckedI64Subtract(scale, int64(1))
		}
		for scale < int64(0) {
			value = langruntime.F64Divide(value, float64(2.0))
			scale = langruntime.CheckedI64Add(scale, int64(1))
		}
		if langruntime.F64Abs(value) < float64(2.2250738585072014e-308) || langruntime.F64Abs(value) == langruntime.F64Divide(float64(1.0), float64(0.0)) {
			return intervalIsoNumberFail(index, width, intervalInputSyntax)
		}
	}
	if negative {
		value = langruntime.F64Subtract(float64(0.0), value)
	}
	if value < float64(-1.0e15) || value > float64(1.0e15) {
		return intervalIsoNumberFail(index, width, intervalInputRange)
	}
	high := langruntime.F64ToI32((langruntime.F64Divide(value, float64(1000000000.0))))
	rest := langruntime.F64Subtract(value, langruntime.F64Multiply((float64(high)), float64(1000000000.0)))
	low := langruntime.F64ToI32(rest)
	fraction := langruntime.F64Subtract(rest, (float64(low)))
	return intervalIsoNumber{whole: langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(high))), int64(1000000000)), (int64(langruntime.CheckedI32(low)))), fractionBits: langruntime.F64ToI64Bits(fraction), next: index, width: width, error: 0}
}
func intervalIsoRead(input *intervalInputText, start int) intervalIsoNumber {
	start = langruntime.CheckedIndex(start)
	index := start
	number := langruntime.NewTextBuffer("")
	if index < len(input.chars) && input.chars[index] == '-' {
		number = append(number, string(langruntime.CheckedChar('-'))...)
		index = langruntime.CheckedAdd(index, 1)
		if langruntime.CheckedAdd(index, 2) < len(input.chars) {
			a := langruntime.AsciiLowercase(input.chars[index])
			b := langruntime.AsciiLowercase(input.chars[langruntime.CheckedAdd(index, 1)])
			c := langruntime.AsciiLowercase(input.chars[langruntime.CheckedAdd(index, 2)])
			if (a == 'i' && b == 'n' && c == 'f') || (a == 'n' && b == 'a' && c == 'n') {
				return intervalIsoNumberFail(index, 0, intervalInputRange)
			}
		}
	}
	width := 0
	for index < len(input.chars) && dateTextDigit(input.chars[index]) >= 0 {
		number = append(number, string(langruntime.CheckedChar(input.chars[index]))...)
		index = langruntime.CheckedAdd(index, 1)
		width = langruntime.CheckedAdd(width, 1)
	}
	if width == 1 && input.chars[langruntime.CheckedSubtract(index, 1)] == '0' && index < len(input.chars) && (input.chars[index] == 'x' || input.chars[index] == 'X') {
		hex := intervalIsoHex(input, langruntime.CheckedAdd(index, 1), input.chars[start] == '-', width)
		if hex.width > 0 {
			return hex
		}
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
	unresolvedFlavor := 0
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
			if number.error == 1 {
				return IntervalUnresolved(unresolvedFlavor)
			}
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
func IntervalFromTextFieldsContext(input TextValue, fields Int4Value, style int) IntervalValue {
	style = langruntime.CheckedI32(style)
	unresolvedFlavor := 0
	if input.Kind == TextValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueNonNull {
		if unresolvedFlavor < 1 {
			unresolvedFlavor = langruntime.CheckedI32(1)
		}
	}
	if fields.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if input.Kind == TextValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if fields.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if input.Kind == TextValueError {
		error := input.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	if fields.Kind == Int4ValueError {
		error := fields.Error
		return IntervalValue{Kind: IntervalValueError, Error: error}
	}
	conditionFlavor10604 := unresolvedFlavor
	if input.Kind == TextValueUnknown {
		if conditionFlavor10604 < 1 {
			conditionFlavor10604 = langruntime.CheckedI32(1)
		}
	}
	if input.Kind == TextValueUnimplemented {
		conditionFlavor10604 = langruntime.CheckedI32(2)
	}
	if fields.Kind == Int4ValueUnknown {
		if conditionFlavor10604 < 1 {
			conditionFlavor10604 = langruntime.CheckedI32(1)
		}
	}
	if fields.Kind == Int4ValueUnimplemented {
		conditionFlavor10604 = langruntime.CheckedI32(2)
	}
	if ((input == (TextValue{Kind: TextValueUnknown}) || input == (TextValue{Kind: TextValueUnimplemented})) || input == (TextValue{Kind: TextValueNonNull})) || (fields == (Int4Value{Kind: Int4ValueUnknown}) || fields == (Int4Value{Kind: Int4ValueUnimplemented})) {
		return IntervalUnresolved(conditionFlavor10604)
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
				return IntervalUnresolved(unresolvedFlavor)
			}
			return intervalInputIso(text)
		}
		if style < 1 || style > 4 {
			ordinary := intervalUnitsFromText(TextValue{Kind: TextValueValue, Value: langruntime.CheckedString(text)}, fieldMask, 1)
			standard := intervalUnitsFromText(TextValue{Kind: TextValueValue, Value: text}, fieldMask, 3)
			return IntervalInputAgreement(ordinary, standard)
		}
		return intervalUnitsFromText(TextValue{Kind: TextValueValue, Value: text}, fieldMask, style)
	}
	return intervalUnitsFromText(input, fieldMask, style)
}
func IntervalInputAgreement(left IntervalValue, right IntervalValue) IntervalValue {
	unresolvedFlavor := 0
	if left.Kind == IntervalValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == IntervalValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == IntervalValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == IntervalValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left == right {
		return left
	}
	return IntervalUnresolved(ResolutionContext(unresolvedFlavor))
}
func IntervalFromTextFields(input TextValue, fields Int4Value) IntervalValue {
	return IntervalFromTextFieldsContext(input, fields, 0)
}
func IntervalFromTextContext(input TextValue, style int) IntervalValue {
	style = langruntime.CheckedI32(style)
	return IntervalFromTextFieldsContext(input, MakeInt4Value(32767), style)
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
	clockField := false
	output := langruntime.NewTextBuffer("")
	for index < len(chars) {
		current := chars[index]
		if current == '[' || current == ']' || current == '{' || current == '}' || current == ',' || current == '"' {
			current = langruntime.CheckedChar(' ')
		}
		if current == ':' {
			if dateTextDigit(previous) >= 0 || clockField {
				clockField = true
			} else {
				current = langruntime.CheckedChar(' ')
			}
		}
		if dateTextSpace(current) {
			dateField = false
			word = false
			clockField = false
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
			clockField = false
		}
		output = append(output, string(langruntime.CheckedChar(current))...)
		previous = langruntime.CheckedChar(current)
		index = langruntime.CheckedAdd(index, 1)
	}
	return string(output)
}
func intervalInputYearMonth(text string) Int8Value {
	text = langruntime.CheckedString(text)
	unresolvedFlavor := 0
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
		return Int8Unresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if left.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	conditionFlavor264 := unresolvedFlavor
	if left.Kind == CheckOutcomeUnknown {
		if conditionFlavor264 < 1 {
			conditionFlavor264 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == CheckOutcomeUnimplemented {
		conditionFlavor264 = langruntime.CheckedI32(2)
	}
	if right.Kind == CheckOutcomeUnknown {
		if conditionFlavor264 < 1 {
			conditionFlavor264 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == CheckOutcomeUnimplemented {
		conditionFlavor264 = langruntime.CheckedI32(2)
	}
	if (left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || left == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) || (right == (CheckOutcome{Kind: CheckOutcomeUnknown}) || right == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) {
		return CheckUnresolved(conditionFlavor264)
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
	unresolvedFlavor := 0
	if left.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	conditionFlavor604 := unresolvedFlavor
	if left.Kind == CheckOutcomeUnknown {
		if conditionFlavor604 < 1 {
			conditionFlavor604 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == CheckOutcomeUnimplemented {
		conditionFlavor604 = langruntime.CheckedI32(2)
	}
	if right.Kind == CheckOutcomeUnknown {
		if conditionFlavor604 < 1 {
			conditionFlavor604 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == CheckOutcomeUnimplemented {
		conditionFlavor604 = langruntime.CheckedI32(2)
	}
	if (left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || left == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) || (right == (CheckOutcome{Kind: CheckOutcomeUnknown}) || right == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) {
		return CheckUnresolved(conditionFlavor604)
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
	unresolvedFlavor := 0
	if leftNull.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if rightNull.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if leftNull.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if rightNull.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return CheckUnresolved(unresolvedFlavor)
}
func CaseGuardStops(value CheckOutcome) bool {
	if value == (CheckOutcome{Kind: CheckOutcomeUnknown}) || value == (CheckOutcome{Kind: CheckOutcomeUnimplemented}) {
		return true
	}
	if value.Kind == CheckOutcomeError {
		return true
	}
	return false
}
func MinmaxNullsChooseRight(leftNull BoolValue, rightNull BoolValue) CheckOutcome {
	unresolvedFlavor := 0
	if leftNull.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if rightNull.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if leftNull.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if rightNull.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return CheckUnresolved(unresolvedFlavor)
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
	unresolvedFlavor := 0
	if value.Kind == Int4ValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if value.Kind == Int4ValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
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
	return BoolUnresolved(unresolvedFlavor)
}
func ConstantFinish(left CheckOutcome, right CheckOutcome) CheckOutcome {
	unresolvedFlavor := 0
	if left.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if right.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if left.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if right.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if left.Kind == CheckOutcomeError {
		error := left.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if right.Kind == CheckOutcomeError {
		error := right.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	conditionFlavor134 := unresolvedFlavor
	if left.Kind == CheckOutcomeUnknown {
		if conditionFlavor134 < 1 {
			conditionFlavor134 = langruntime.CheckedI32(1)
		}
	}
	if left.Kind == CheckOutcomeUnimplemented {
		conditionFlavor134 = langruntime.CheckedI32(2)
	}
	if right.Kind == CheckOutcomeUnknown {
		if conditionFlavor134 < 1 {
			conditionFlavor134 = langruntime.CheckedI32(1)
		}
	}
	if right.Kind == CheckOutcomeUnimplemented {
		conditionFlavor134 = langruntime.CheckedI32(2)
	}
	if (left == (CheckOutcome{Kind: CheckOutcomeUnknown}) || left == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) || (right == (CheckOutcome{Kind: CheckOutcomeUnknown}) || right == (CheckOutcome{Kind: CheckOutcomeUnimplemented})) {
		return CheckUnresolved(conditionFlavor134)
	}
	return CheckOutcome{Kind: CheckOutcomeTrue}
}

const collationConflict = 6844250

func CollationConflictArgument(state CheckOutcome, nullness BoolValue) CheckOutcome {
	unresolvedFlavor := 0
	if state.Kind == CheckOutcomeUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if nullness.Kind == BoolValueUnknown {
		unresolvedFlavor = langruntime.CheckedI32(1)
	}
	if state.Kind == CheckOutcomeUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if nullness.Kind == BoolValueUnimplemented {
		unresolvedFlavor = langruntime.CheckedI32(2)
	}
	if state.Kind == CheckOutcomeError {
		error := state.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if nullness.Kind == BoolValueError {
		error := nullness.Error
		return CheckOutcome{Kind: CheckOutcomeError, Error: error}
	}
	if nullness == (BoolValue{Kind: BoolValueValue, Value: true}) || state == (CheckOutcome{Kind: CheckOutcomeNull}) {
		return CheckOutcome{Kind: CheckOutcomeNull}
	}
	if nullness == (BoolValue{Kind: BoolValueValue, Value: false}) && state == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return CheckOutcome{Kind: CheckOutcomeFalse}
	}
	return CheckUnresolved(unresolvedFlavor)
}
func CollationConflictStart() CheckOutcome {
	return CheckOutcome{Kind: CheckOutcomeFalse}
}
func CollationConflictFinish(state CheckOutcome) CheckOutcome {
	if state == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return CheckOutcome{Kind: CheckOutcomeError, Error: MakeSqlError(collationConflict)}
	}
	return state
}

const nondeterministicCollation = 466560

func NondeterministicCollationFinish(state CheckOutcome) CheckOutcome {
	if state == (CheckOutcome{Kind: CheckOutcomeFalse}) {
		return CheckOutcome{Kind: CheckOutcomeError, Error: MakeSqlError(nondeterministicCollation)}
	}
	return state
}
