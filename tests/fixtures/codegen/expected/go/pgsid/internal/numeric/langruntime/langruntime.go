package langruntime

import (
	"math"
	"math/big"

	"strings"
	"unicode/utf8"
)

func CheckedBorrowed[T any](value *T, copyValue func(T) T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	copied := copyValue(*value)
	return &copied
}

const MaxSharedIndex = 2147483647
const MinSharedI32 = -2147483648

const MaxSharedI64 int64 = 9223372036854775807
const MinSharedI64 int64 = -9223372036854775808

func CheckedI64Add(left int64, right int64) int64 {
	if (right > 0 && left > MaxSharedI64-right) || (right < 0 && left < MinSharedI64-right) {
		panic("i64 overflow")
	}
	return left + right
}

func CheckedI64Subtract(left int64, right int64) int64 {
	if (right < 0 && left > MaxSharedI64+right) || (right > 0 && left < MinSharedI64+right) {
		panic("i64 overflow")
	}
	return left - right
}

func CheckedI64Multiply(left int64, right int64) int64 {
	if (left == MinSharedI64 && right == -1) || (right == MinSharedI64 && left == -1) {
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
	if left == MinSharedI64 && right == -1 {
		panic("i64 overflow")
	}
	return left / right
}

func CheckedI64Remainder(left int64, right int64) int64 {
	if right == 0 {
		panic("integer remainder by zero")
	}
	if left == MinSharedI64 && right == -1 {
		panic("i64 overflow")
	}
	return left % right
}

func CheckedIndex(value int) int {
	if value < 0 || value > MaxSharedIndex {
		panic("index outside shared numeric range")
	}
	return value
}

func IndexFromI32(value int, fallback int) int {
	CheckedI32(value)
	CheckedIndex(fallback)
	if value < 0 {
		return fallback
	}
	return value
}

func CheckedI32(value int) int {
	if value < -2147483648 || value > MaxSharedIndex {
		panic("signed integer outside shared numeric range")
	}
	return value
}

func CheckedAdd(left int, right int) int {
	CheckedIndex(left)
	CheckedIndex(right)
	if right > MaxSharedIndex-left {
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
	if value == MinSharedI32 {
		panic("signed integer overflow")
	}
	return -value
}

func CheckedSignedAdd(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	if (right > 0 && left > MaxSharedIndex-right) || (right < 0 && left < MinSharedI32-right) {
		panic("signed integer overflow")
	}
	return left + right
}

func CheckedSignedSubtract(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	if (right < 0 && left > MaxSharedIndex+right) || (right > 0 && left < MinSharedI32+right) {
		panic("signed integer overflow")
	}
	return left - right
}

func CheckedSignedMultiply(left int, right int) int {
	CheckedI32(left)
	CheckedI32(right)
	result := int64(left) * int64(right)
	if result < MinSharedI32 || result > MaxSharedIndex {
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
	if left == MinSharedI32 && right == -1 {
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
	if left == MinSharedI32 && right == -1 {
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

func NewTextBuffer(value string) []byte {
	return []byte(value)
}

func CheckedString(value string) string {
	if len(value) > MaxSharedIndex || !utf8.ValidString(value) {
		panic("invalid or oversized string")
	}
	return value
}

func CheckedChars(value []rune) []rune {
	if len(value) > MaxSharedIndex {
		panic("vector outside shared numeric range")
	}
	result := make([]rune, len(value))
	for index, character := range value {
		result[index] = CheckedChar(character)
	}
	return result
}

func CheckedIndices(value []int) []int {
	if len(value) > MaxSharedIndex {
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

func F64Add(left float64, right float64) float64 { return float64(left + right) }

func F64Multiply(left float64, right float64) float64 { return float64(left * right) }
func F64Divide(left float64, right float64) float64   { return float64(left / right) }

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

func kernelDigitsToBig(digits []int) *big.Int {
	value := new(big.Int)
	if len(digits) == 0 {
		return value
	}
	text := make([]byte, 0, len(digits)*4)
	for _, digit := range digits {
		text = append(text, byte('0'+digit/1000), byte('0'+digit/100%10), byte('0'+digit/10%10), byte('0'+digit%10))
	}
	value.SetString(string(text), 10)
	return value
}

func kernelDigitsFromBig(value *big.Int, length int) []int {
	if value.Sign() == 0 {
		return make([]int, length)
	}
	return kernelDigitsFromText(value.Text(10), length)
}

func kernelDigitsFromText(text string, length int) []int {
	digits := make([]int, length)
	if len(text) > length*4 {
		panic("kernel result exceeds its digits")
	}
	text = strings.Repeat("0", length*4-len(text)) + text
	for index := range digits {
		group := text[index*4 : index*4+4]
		digits[index] = int(group[0]-'0')*1000 + int(group[1]-'0')*100 + int(group[2]-'0')*10 + int(group[3]-'0')
	}
	return digits
}

const kernelShortDigits = 32

func kernelShortProduct(long []int, short []int) []int {
	product := make([]int, len(long)+len(short))
	for row := len(short) - 1; row >= 0; row-- {
		factor := short[row]
		if factor == 0 {
			continue
		}
		carry := 0
		for column := len(long) - 1; column >= 0; column-- {
			at := row + column + 1
			value := product[at] + factor*long[column] + carry
			carry = value / 10000
			product[at] = value - carry*10000
		}
		for at := row; carry > 0; at-- {
			value := product[at] + carry
			carry = value / 10000
			product[at] = value - carry*10000
		}
	}
	return product
}

func KernelDigitsProduct(left []int, right []int) []int {
	if len(left) <= kernelShortDigits || len(right) <= kernelShortDigits {
		if len(left) < len(right) {
			return kernelShortProduct(right, left)
		}
		return kernelShortProduct(left, right)
	}
	product := new(big.Int).Mul(kernelDigitsToBig(left), kernelDigitsToBig(right))
	return kernelDigitsFromBig(product, len(left)+len(right))
}

func KernelDigitsQuotient(dividend []int, divisor []int) []int {
	first := 0
	for first < len(divisor) && divisor[first] == 0 {
		first++
	}
	if first == len(divisor) {
		return make([]int, len(dividend))
	}
	if len(divisor)-first <= 2 {
		single := 0
		for _, digit := range divisor[first:] {
			single = single*10000 + digit
		}
		quotient := make([]int, len(dividend))
		carry := 0
		for index, digit := range dividend {
			value := carry*10000 + digit
			quotient[index] = value / single
			carry = value - quotient[index]*single
		}
		return quotient
	}
	quotient := new(big.Int).Quo(kernelDigitsToBig(dividend), kernelDigitsToBig(divisor))
	return kernelDigitsFromBig(quotient, len(dividend))
}
