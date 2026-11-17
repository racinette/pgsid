/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */
package checkruntime

import langruntime "example.com/pgsid-fixture/generated/go/pgsid/internal/numeric/langruntime"

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

func MakeInt4Value(value int) Int4Value {
	value = langruntime.CheckedI32(value)
	return Int4Value{Kind: Int4ValueValue, Value: value}
}

func MakeTextValue(value string) TextValue {
	value = langruntime.CheckedString(value)
	return TextValue{Kind: TextValueValue, Value: value}
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
	Value NumericVar
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
		return NumericValue{Kind: NumericValueValue, Value: CopyNumericVar(value.Value)}
	case NumericValueError:
		return NumericValue{Kind: NumericValueError, Error: value.Error}
	}
	panic("unknown enum variant")
}
func MakeNumericValue(value string) NumericValue {
	value = langruntime.CheckedString(value)
	layout := NumericParts(value)
	if layout.Valid == false {
		return NumericUnresolved(0)
	}
	if layout.Special == 3 {
		return NumericValue{Kind: NumericValueValue, Value: NumericVarSpecial(NumericSignNan)}
	}
	if layout.Special == 2 {
		return NumericValue{Kind: NumericValueValue, Value: NumericVarSpecial(NumericSignPinf)}
	}
	if layout.Special == 0 {
		return NumericValue{Kind: NumericValueValue, Value: NumericVarSpecial(NumericSignNinf)}
	}
	chars := []rune(value)
	index := 0
	point := false
	power := false
	fractional := 0
	exponent := 0
	exponentSign := 1
	for index < len(chars) {
		digit := numericDigit(chars[index])
		if digit >= 0 {
			if power {
				exponent = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(exponent, 10), digit))
			} else if point {
				fractional = langruntime.CheckedI32(langruntime.CheckedSignedAdd(fractional, 1))
			}
		} else if chars[index] == '.' {
			point = true
		} else if chars[index] == 'e' || chars[index] == 'E' {
			power = true
		} else if power && chars[index] == '-' {
			exponentSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	dscale := langruntime.CheckedSignedSubtract(fractional, langruntime.CheckedSignedMultiply(exponent, exponentSign))
	if dscale < 0 {
		dscale = langruntime.CheckedI32(0)
	}
	digits := []int{}
	if layout.Sign == 0 {
		return NumericValue{Kind: NumericValueValue, Value: NumericVar{Sign: 1, Weight: 0, Dscale: dscale, Digits: digits}}
	}
	weight := langruntime.CheckedSignedDivide(layout.Weight, 4)
	if langruntime.CheckedSignedRemainder(layout.Weight, 4) < 0 {
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	leading := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(weight, 4), 3), layout.Weight)
	emitted := 0
	group := 0
	index = langruntime.CheckedIndex(layout.First)
	for index < layout.End || langruntime.CheckedSignedRemainder(emitted, 4) != 0 {
		decimal := 0
		if leading > 0 {
			leading = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(leading, 1))
		} else if index < layout.End {
			decimal = langruntime.CheckedI32(numericDigit(chars[index]))
			for decimal < 0 {
				index = langruntime.CheckedAdd(index, 1)
				decimal = langruntime.CheckedI32(numericDigit(chars[index]))
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		group = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(group, 10), decimal))
		emitted = langruntime.CheckedI32(langruntime.CheckedSignedAdd(emitted, 1))
		if langruntime.CheckedSignedRemainder(emitted, 4) == 0 {
			langruntime.CheckedAdd(len(digits), 1)
			digits = append(digits, langruntime.CheckedIndex(langruntime.IndexFromI32(group, 0)))
			group = langruntime.CheckedI32(0)
		}
	}
	return NumericValue{Kind: NumericValueValue, Value: NumericVar{Sign: layout.Sign, Weight: weight, Dscale: dscale, Digits: digits}}
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

func BoolUnresolved(flavor int) BoolValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return BoolValue{Kind: BoolValueUnknown}
	}
	return BoolValue{Kind: BoolValueUnimplemented}
}

func Int4Unresolved(flavor int) Int4Value {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return Int4Value{Kind: Int4ValueUnknown}
	}
	return Int4Value{Kind: Int4ValueUnimplemented}
}

func JsonbUnresolved(flavor int) JsonbValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return JsonbValue{Kind: JsonbValueUnknown}
	}
	return JsonbValue{Kind: JsonbValueUnimplemented}
}

func NumericUnresolved(flavor int) NumericValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return NumericValue{Kind: NumericValueUnknown}
	}
	return NumericValue{Kind: NumericValueUnimplemented}
}

func TextUnresolved(flavor int) TextValue {
	flavor = langruntime.CheckedI32(flavor)
	if flavor == 1 {
		return TextValue{Kind: TextValueUnknown}
	}
	return TextValue{Kind: TextValueUnimplemented}
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

const NumericSignPinf = 2
const NumericSignNinf = 4
const NumericSignNan = 3

type NumericVar struct {
	Sign   int
	Weight int
	Dscale int
	Digits []int
}

func CopyNumericVar(value NumericVar) NumericVar {
	return NumericVar{Sign: langruntime.CheckedI32(value.Sign), Weight: langruntime.CheckedI32(value.Weight), Dscale: langruntime.CheckedI32(value.Dscale), Digits: langruntime.CheckedIndices(value.Digits)}
}
func NumericVarSpecial(sign int) NumericVar {
	sign = langruntime.CheckedI32(sign)
	digits := []int{}
	return NumericVar{Sign: sign, Weight: 0, Dscale: 0, Digits: digits}
}
func NumericText(value *NumericVar) string {
	value = langruntime.CheckedBorrowed(value, CopyNumericVar)
	if value.Sign == NumericSignNan {
		return "NaN"
	}
	if value.Sign == NumericSignPinf {
		return "Infinity"
	}
	if value.Sign == NumericSignNinf {
		return "-Infinity"
	}
	output := langruntime.NewTextBuffer("")
	if value.Sign < 0 {
		output = append(output, string(langruntime.CheckedChar('-'))...)
	}
	count := int(int32(len(value.Digits)))
	if value.Weight < 0 {
		output = append(output, string(langruntime.CheckedChar('0'))...)
	} else {
		d := 0
		for d <= value.Weight {
			dig := 0
			if d < count {
				dig = langruntime.CheckedI32(int(int32(value.Digits[langruntime.IndexFromI32(d, 0)])))
			}
			putit := d > 0
			place := 1000
			for place > 1 {
				d1 := langruntime.CheckedSignedDivide(dig, place)
				dig = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(dig, langruntime.CheckedSignedMultiply(d1, place)))
				if d1 > 0 {
					putit = true
				}
				if putit {
					output = append(output, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(d1, 48)), '0')))...)
				}
				place = langruntime.CheckedI32(langruntime.CheckedSignedDivide(place, 10))
			}
			output = append(output, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(dig, 48)), '0')))...)
			d = langruntime.CheckedI32(langruntime.CheckedSignedAdd(d, 1))
		}
	}
	if value.Dscale > 0 {
		output = append(output, string(langruntime.CheckedChar('.'))...)
		written := 0
		d := langruntime.CheckedSignedAdd(value.Weight, 1)
		for written < value.Dscale {
			dig := 0
			if d >= 0 && d < count {
				dig = langruntime.CheckedI32(int(int32(value.Digits[langruntime.IndexFromI32(d, 0)])))
			}
			place := 1000
			for place > 0 && written < value.Dscale {
				d1 := langruntime.CheckedSignedDivide(dig, place)
				dig = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(dig, langruntime.CheckedSignedMultiply(d1, place)))
				output = append(output, string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(d1, 48)), '0')))...)
				written = langruntime.CheckedI32(langruntime.CheckedSignedAdd(written, 1))
				place = langruntime.CheckedI32(langruntime.CheckedSignedDivide(place, 10))
			}
			d = langruntime.CheckedI32(langruntime.CheckedSignedAdd(d, 1))
		}
	}
	return string(output)
}
func DigitsProduct(left []int, right []int) []int {
	return langruntime.KernelDigitsProduct(left, right)
}
func DigitsQuotient(dividend []int, divisor []int) []int {
	return langruntime.KernelDigitsQuotient(dividend, divisor)
}

type jsonSyntaxSource struct {
	characters []rune
}

type jsonSyntaxToken struct {
	kind int
	end  int
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

type jsonSyntaxTransition struct {
	state  int
	action int
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

func JsonbToText(input JsonbValue) TextValue {
	input = CopyJsonbValue(input)
	return jsonbRender(input, true, false)
}

func JsonbFromText(input TextValue) JsonbValue {
	return jsonbParseText(input, true)
}

func jsonbParseText(input TextValue, admission bool) JsonbValue {
	return jsonbParseTextContext(input, admission, false)
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

func JsonbStorageAdmission(source *JsonbPayload) BoolValue {
	source = langruntime.CheckedBorrowed(source, CopyJsonbPayload)
	return jsonbStorageDecision(jsonbStorageLayout(source))
}
