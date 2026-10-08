package langruntime

import (
	"math"
	"strconv"
	"strings"
	"unicode/utf8"
)

func checkedOpaqueBorrow[T any](value *T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	return value
}

func CheckedBorrowed[T any](value *T, copyValue func(T) T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	copied := copyValue(*value)
	return &copied
}

const maxSharedIndex = 2147483647
const minSharedI32 = -2147483648

const maxSharedI64 int64 = 9223372036854775807
const minSharedI64 int64 = -9223372036854775808

func CheckedI64Add(left int64, right int64) int64 {
	if (right > 0 && left > maxSharedI64-right) || (right < 0 && left < minSharedI64-right) {
		panic("i64 overflow")
	}
	return left + right
}

func CheckedI64Subtract(left int64, right int64) int64 {
	if (right < 0 && left > maxSharedI64+right) || (right > 0 && left < minSharedI64+right) {
		panic("i64 overflow")
	}
	return left - right
}

func CheckedI64Multiply(left int64, right int64) int64 {
	if (left == minSharedI64 && right == -1) || (right == minSharedI64 && left == -1) {
		panic("i64 overflow")
	}
	result := left * right
	if right != 0 && result/right != left {
		panic("i64 overflow")
	}
	return result
}

func CheckedI64Divide(left int64, right int64) int64 {
	if right == 0 {
		panic("integer division by zero")
	}
	if left == minSharedI64 && right == -1 {
		panic("i64 overflow")
	}
	return left / right
}

func CheckedI64Remainder(left int64, right int64) int64 {
	if right == 0 {
		panic("integer remainder by zero")
	}
	if left == minSharedI64 && right == -1 {
		panic("i64 overflow")
	}
	return left % right
}

func CheckedIndex(value int) int {
	if value < 0 || value > maxSharedIndex {
		panic("index outside shared numeric range")
	}
	return value
}

func indexFromI32(value int, fallback int) int {
	CheckedI32(value)
	CheckedIndex(fallback)
	if value < 0 {
		return fallback
	}
	return value
}

func CheckedI32(value int) int {
	if value < -2147483648 || value > maxSharedIndex {
		panic("signed integer outside shared numeric range")
	}
	return value
}

func CheckedAdd(left int, right int) int {
	CheckedIndex(left)
	CheckedIndex(right)
	if right > maxSharedIndex-left {
		panic("shared numeric overflow")
	}
	return left + right
}

func CheckedSubtract(left int, right int) int {
	CheckedIndex(left)
	CheckedIndex(right)
	if right > left {
		panic("shared numeric underflow")
	}
	return left - right
}

func CheckedSignedNegate(value int) int {
	CheckedI32(value)
	if value == minSharedI32 {
		panic("signed integer overflow")
	}
	return -value
}

func CheckedSignedAdd(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	if (right > 0 && left > maxSharedIndex-right) || (right < 0 && left < minSharedI32-right) {
		panic("signed integer overflow")
	}
	return left + right
}

func CheckedSignedSubtract(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	if (right < 0 && left > maxSharedIndex+right) || (right > 0 && left < minSharedI32+right) {
		panic("signed integer overflow")
	}
	return left - right
}

func CheckedSignedMultiply(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	result := int64(left) * int64(right)
	if result < minSharedI32 || result > maxSharedIndex {
		panic("signed integer overflow")
	}
	return int(result)
}

func CheckedSignedDivide(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	if right == 0 {
		panic("integer division by zero")
	}
	if left == minSharedI32 && right == -1 {
		panic("signed integer overflow")
	}
	return left / right
}

func CheckedSignedRemainder(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	if right == 0 {
		panic("integer remainder by zero")
	}
	if left == minSharedI32 && right == -1 {
		panic("signed integer overflow")
	}
	return left % right
}

func CheckedChar(value rune) rune {
	if value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) {
		panic("invalid Unicode scalar")
	}
	return value
}

func CharacterFromI32(value int, fallback rune) rune {
	CheckedI32(value)
	CheckedChar(fallback)
	if value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) {
		return fallback
	}
	return rune(value)
}

func AsciiLowercase(value rune) rune {
	CheckedChar(value)
	if value >= 'A' && value <= 'Z' {
		return value + ('a' - 'A')
	}
	return value
}

func CheckedString(value string) string {
	if len(value) > maxSharedIndex || !utf8.ValidString(value) {
		panic("invalid or oversized string")
	}
	return value
}

func CheckedChars(value []rune) []rune {
	if len(value) > maxSharedIndex {
		panic("vector outside shared numeric range")
	}
	result := make([]rune, len(value))
	for index, character := range value {
		result[index] = CheckedChar(character)
	}
	return result
}

func checkedIndices(value []int) []int {
	if len(value) > maxSharedIndex {
		panic("vector outside shared numeric range")
	}
	result := make([]int, len(value))
	for index, position := range value {
		result[index] = CheckedIndex(position)
	}
	return result
}

func CheckedStructs[T any](value []T, copyValue func(T) T) []T {
	CheckedIndex(len(value))
	result := make([]T, len(value))
	for index, entry := range value {
		result[index] = copyValue(entry)
	}
	return result
}

func f64Negate(value float64) float64                 { return -value }
func F64Add(left float64, right float64) float64      { return float64(left + right) }
func f64Subtract(left float64, right float64) float64 { return float64(left - right) }
func F64Multiply(left float64, right float64) float64 { return float64(left * right) }
func F64Divide(left float64, right float64) float64   { return float64(left / right) }
func F64Abs(value float64) float64                    { return math.Abs(value) }
func F64Ln(value float64) float64                     { return math.Log(value) }
func F64Log10(value float64) float64                  { return math.Log10(value) }
func F64ToI32(value float64) int {
	if math.IsNaN(value) {
		return 0
	}
	if value >= 2147483647 {
		return 2147483647
	}
	if value <= -2147483648 {
		return -2147483648
	}
	return int(math.Trunc(value))
}

func F64FromText(value string, fallback float64) float64 {
	unsigned := value
	if len(unsigned) > 0 && (unsigned[0] == '+' || unsigned[0] == '-') {
		unsigned = unsigned[1:]
	}
	if strings.EqualFold(unsigned, "nan") {
		return math.NaN()
	}
	if strings.ContainsAny(value, "_xXpP") {
		return fallback
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err == nil {
		return parsed
	}
	if problem, ok := err.(*strconv.NumError); ok && problem.Err == strconv.ErrRange {
		return parsed
	}
	return fallback
}
