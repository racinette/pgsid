package generated

import "unicode/utf8"

const maxSharedIndex = 2147483647

func checkedIndex(value int) int {
	if value < 0 || value > maxSharedIndex {
		panic("index outside shared numeric range")
	}
	return value
}

func checkedI32(value int) int {
	if value < -2147483648 || value > maxSharedIndex {
		panic("signed integer outside shared numeric range")
	}
	return value
}

func checkedAdd(left int, right int) int {
	checkedIndex(left)
	checkedIndex(right)
	if right > maxSharedIndex-left {
		panic("shared numeric overflow")
	}
	return left + right
}

func checkedSubtract(left int, right int) int {
	checkedIndex(left)
	checkedIndex(right)
	if right > left {
		panic("shared numeric underflow")
	}
	return left - right
}

func checkedChar(value rune) rune {
	if value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) {
		panic("invalid Unicode scalar")
	}
	return value
}

func asciiLowercase(value rune) rune {
	checkedChar(value)
	if value >= 'A' && value <= 'Z' {
		return value + ('a' - 'A')
	}
	return value
}

func checkedString(value string) string {
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
		result[index] = checkedChar(character)
	}
	return result
}
