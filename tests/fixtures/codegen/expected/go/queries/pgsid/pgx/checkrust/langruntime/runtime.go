package langruntime

import "unicode/utf8"

func checkedOpaqueBorrow[T any](value *T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	return value
}

func checkedBorrowed[T any](value *T, copyValue func(T) T) *T {
	if value == nil {
		panic("nil borrowed value")
	}
	copied := copyValue(*value)
	return &copied
}

const maxSharedIndex = 2147483647
const minSharedI32 = -2147483648

func CheckedIndex(value int) int {
	if value < 0 || value > maxSharedIndex {
		panic("index outside shared numeric range")
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

func checkedChars(value []rune) []rune {
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

func checkedStructs[T any](value []T, copyValue func(T) T) []T {
	CheckedIndex(len(value))
	result := make([]T, len(value))
	for index, entry := range value {
		result[index] = copyValue(entry)
	}
	return result
}
