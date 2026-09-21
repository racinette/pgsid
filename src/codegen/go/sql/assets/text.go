package pgsidsql

import (
	"strings"
	"unicode/utf8"
)

func bpcharText(value SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: strings.TrimRight(value.Value, " "), Valid: true}
}

func booleanText(value SqlBoolean) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	if value.Value {
		return SqlText{Value: "true", Valid: true}
	}
	return SqlText{Value: "false", Valid: true}
}

func varcharCoerce(value SqlText, typmod SqlInteger, explicit SqlBoolean) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if typmod.Error != "" {
		return SqlText{Error: typmod.Error}
	}
	if explicit.Error != "" {
		return SqlText{Error: explicit.Error}
	}
	if !value.Valid || !typmod.Valid || !explicit.Valid {
		return SqlText{}
	}
	limit := typmod.Value - 4
	if limit < 0 {
		return value
	}
	characters := []rune(value.Value)
	if int64(len(characters)) > limit {
		if !explicit.Value {
			for _, character := range characters[limit:] {
				if character != ' ' {
					return SqlText{Error: "22001"}
				}
			}
		}
		characters = characters[:limit]
	}
	output := string(characters)
	return SqlText{Value: output, Valid: true}
}

func bpcharCoerce(value SqlText, typmod SqlInteger, explicit SqlBoolean) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if typmod.Error != "" {
		return SqlText{Error: typmod.Error}
	}
	if explicit.Error != "" {
		return SqlText{Error: explicit.Error}
	}
	if !value.Valid || !typmod.Valid || !explicit.Valid {
		return SqlText{}
	}
	limit := typmod.Value - 4
	if limit < 0 {
		return value
	}
	characters := []rune(value.Value)
	if int64(len(characters)) < limit && int64(len(value.Value))+limit-int64(len(characters)) > 1073741819 {
		return SqlText{Error: "XX000"}
	}
	if int64(len(characters)) > limit {
		if !explicit.Value {
			for _, character := range characters[limit:] {
				if character != ' ' {
					return SqlText{Error: "22001"}
				}
			}
		}
		characters = characters[:limit]
	}
	output := string(characters)
	output += strings.Repeat(" ", int(limit)-len(characters))
	return SqlText{Value: output, Valid: true}
}

func bpcharLength(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(utf8.RuneCountInString(strings.TrimRight(value.Value, " "))), Valid: true}
}

func bpcharEq(left, right SqlText) SqlBoolean { return textEq(bpcharText(left), bpcharText(right)) }

func bpcharNe(left, right SqlText) SqlBoolean { return textNe(bpcharText(left), bpcharText(right)) }

func bpcharLt(left, right SqlText) SqlBoolean { return textLt(bpcharText(left), bpcharText(right)) }

func bpcharLe(left, right SqlText) SqlBoolean { return textLe(bpcharText(left), bpcharText(right)) }

func bpcharGt(left, right SqlText) SqlBoolean { return textGt(bpcharText(left), bpcharText(right)) }

func bpcharGe(left, right SqlText) SqlBoolean { return textGe(bpcharText(left), bpcharText(right)) }

func sqlTextSubstring(value string, start, length int64, hasLength bool) (string, string) {
	if hasLength && length < 0 {
		return "", "22011"
	}
	characters := []rune(value)
	first := max(start, 1) - 1
	end := int64(len(characters))
	if hasLength && start+length <= 2147483647 {
		end = max(0, start+length-1)
	}
	first = min(first, int64(len(characters)))
	end = min(max(first, end), int64(len(characters)))
	return string(characters[first:end]), ""
}

func textSubstring(value SqlText, start SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if start.Error != "" {
		return SqlText{Error: start.Error}
	}
	if !value.Valid || !start.Valid {
		return SqlText{}
	}
	output, code := sqlTextSubstring(value.Value, start.Value, 0, false)
	return SqlText{Value: output, Valid: code == "", Error: code}
}

func textSubstringLength(value SqlText, start SqlInteger, length SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if start.Error != "" {
		return SqlText{Error: start.Error}
	}
	if length.Error != "" {
		return SqlText{Error: length.Error}
	}
	if !value.Valid || !start.Valid || !length.Valid {
		return SqlText{}
	}
	output, code := sqlTextSubstring(value.Value, start.Value, length.Value, true)
	return SqlText{Value: output, Valid: code == "", Error: code}
}

func textLeft(value SqlText, count SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if count.Error != "" {
		return SqlText{Error: count.Error}
	}
	if !value.Valid || !count.Valid {
		return SqlText{}
	}
	characters := []rune(value.Value)
	size, amount := int64(len(characters)), count.Value
	if amount < 0 {
		amount = max(0, size+amount)
	} else {
		amount = min(amount, size)
	}
	return SqlText{Value: string(characters[:amount]), Valid: true}
}

func textRight(value SqlText, count SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if count.Error != "" {
		return SqlText{Error: count.Error}
	}
	if !value.Valid || !count.Valid {
		return SqlText{}
	}
	if count.Value == -2147483648 {
		return value
	}
	characters := []rune(value.Value)
	size, amount := int64(len(characters)), count.Value
	if amount < 0 {
		amount = max(0, size+amount)
	} else {
		amount = min(amount, size)
	}
	return SqlText{Value: string(characters[size-amount:]), Valid: true}
}

func textTrimBoth(value SqlText, charactersToTrim SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if charactersToTrim.Error != "" {
		return SqlText{Error: charactersToTrim.Error}
	}
	if !value.Valid || !charactersToTrim.Valid {
		return SqlText{}
	}
	trim := func(character rune) bool { return strings.ContainsRune(charactersToTrim.Value, character) }
	return SqlText{Value: strings.TrimFunc(value.Value, trim), Valid: true}
}

func textTrimBothSpace(value SqlText) SqlText {
	return textTrimBoth(value, SqlText{Value: " ", Valid: true})
}

func textTrimLeft(value SqlText, charactersToTrim SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if charactersToTrim.Error != "" {
		return SqlText{Error: charactersToTrim.Error}
	}
	if !value.Valid || !charactersToTrim.Valid {
		return SqlText{}
	}
	trim := func(character rune) bool { return strings.ContainsRune(charactersToTrim.Value, character) }
	return SqlText{Value: strings.TrimLeftFunc(value.Value, trim), Valid: true}
}

func textTrimLeftSpace(value SqlText) SqlText {
	return textTrimLeft(value, SqlText{Value: " ", Valid: true})
}

func textTrimRight(value SqlText, charactersToTrim SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if charactersToTrim.Error != "" {
		return SqlText{Error: charactersToTrim.Error}
	}
	if !value.Valid || !charactersToTrim.Valid {
		return SqlText{}
	}
	trim := func(character rune) bool { return strings.ContainsRune(charactersToTrim.Value, character) }
	return SqlText{Value: strings.TrimRightFunc(value.Value, trim), Valid: true}
}

func textTrimRightSpace(value SqlText) SqlText {
	return textTrimRight(value, SqlText{Value: " ", Valid: true})
}

func textReplace(value SqlText, search SqlText, replacement SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if search.Error != "" {
		return SqlText{Error: search.Error}
	}
	if replacement.Error != "" {
		return SqlText{Error: replacement.Error}
	}
	if !value.Valid || !search.Valid || !replacement.Valid {
		return SqlText{}
	}
	if search.Value == "" {
		return value
	}
	return SqlText{Value: strings.ReplaceAll(value.Value, search.Value, replacement.Value), Valid: true}
}

func textTranslate(value SqlText, from SqlText, to SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if from.Error != "" {
		return SqlText{Error: from.Error}
	}
	if to.Error != "" {
		return SqlText{Error: to.Error}
	}
	if !value.Valid || !from.Valid || !to.Valid {
		return SqlText{}
	}
	source, target := []rune(from.Value), []rune(to.Value)
	var output strings.Builder
	for _, character := range value.Value {
		index := -1
		for i, candidate := range source {
			if character == candidate {
				index = i
				break
			}
		}
		if index < 0 {
			output.WriteRune(character)
		} else if index < len(target) {
			output.WriteRune(target[index])
		}
	}
	return SqlText{Value: output.String(), Valid: true}
}

func textPosition(value SqlText, search SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if search.Error != "" {
		return SqlInteger{Error: search.Error}
	}
	if !value.Valid || !search.Valid {
		return SqlInteger{}
	}
	index := strings.Index(value.Value, search.Value)
	if index < 0 {
		return SqlInteger{Value: 0, Valid: true}
	}
	return SqlInteger{Value: int64(utf8.RuneCountInString(value.Value[:index]) + 1), Valid: true}
}

func textStartsWith(value SqlText, prefix SqlText) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if prefix.Error != "" {
		return SqlBoolean{Error: prefix.Error}
	}
	if !value.Valid || !prefix.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.HasPrefix(value.Value, prefix.Value), Valid: true}
}

func textSplitPart(value SqlText, separator SqlText, field SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if separator.Error != "" {
		return SqlText{Error: separator.Error}
	}
	if field.Error != "" {
		return SqlText{Error: field.Error}
	}
	if !value.Valid || !separator.Valid || !field.Valid {
		return SqlText{}
	}
	if field.Value == 0 {
		return SqlText{Error: "22023"}
	}
	fields := []string{value.Value}
	if separator.Value != "" {
		fields = strings.Split(value.Value, separator.Value)
	}
	index := field.Value - 1
	if field.Value < 0 {
		index = int64(len(fields)) + field.Value
	}
	if index < 0 || index >= int64(len(fields)) {
		return SqlText{Value: "", Valid: true}
	}
	return SqlText{Value: fields[index], Valid: true}
}

func textReverse(value SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	characters := []rune(value.Value)
	for i, j := 0, len(characters)-1; i < j; i, j = i+1, j-1 {
		characters[i], characters[j] = characters[j], characters[i]
	}
	return SqlText{Value: string(characters), Valid: true}
}

func textAscii(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	character, _ := utf8.DecodeRuneInString(value.Value)
	if value.Value == "" {
		character = 0
	}
	return SqlInteger{Value: int64(character), Valid: true}
}

func textBitLength(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	length := int64(len(value.Value)) * 8
	if length > 2147483647 {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: length, Valid: true}
}

func textRepeat(value SqlText, count SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if count.Error != "" {
		return SqlText{Error: count.Error}
	}
	if !value.Valid || !count.Valid {
		return SqlText{}
	}
	times := max(0, count.Value)
	if int64(len(value.Value))*times > 1073741819 {
		return SqlText{Error: "54000"}
	}
	if value.Value == "" {
		return value
	}
	return SqlText{Value: strings.Repeat(value.Value, int(times)), Valid: true}
}

func textPadLeft(value SqlText, count SqlInteger, fill SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if count.Error != "" {
		return SqlText{Error: count.Error}
	}
	if fill.Error != "" {
		return SqlText{Error: fill.Error}
	}
	if !value.Valid || !count.Valid || !fill.Valid {
		return SqlText{}
	}
	characters, padding := []rune(value.Value), []rune(fill.Value)
	size := max(0, count.Value)
	if len(padding) == 0 {
		size = min(size, int64(len(characters)))
	}
	if size*4 > 1073741819 {
		return SqlText{Error: "54000"}
	}
	source := string(characters[:min(size, int64(len(characters)))])
	needed := max(0, size-int64(len(characters)))
	extra := ""
	if len(padding) > 0 {
		extra = strings.Repeat(fill.Value, int(needed)/len(padding)) + string(padding[:int(needed)%len(padding)])
	}
	return SqlText{Value: extra + source, Valid: true}
}

func textPadLeftSpace(value SqlText, count SqlInteger) SqlText {
	return textPadLeft(value, count, SqlText{Value: " ", Valid: true})
}

func textPadRight(value SqlText, count SqlInteger, fill SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if count.Error != "" {
		return SqlText{Error: count.Error}
	}
	if fill.Error != "" {
		return SqlText{Error: fill.Error}
	}
	if !value.Valid || !count.Valid || !fill.Valid {
		return SqlText{}
	}
	characters, padding := []rune(value.Value), []rune(fill.Value)
	size := max(0, count.Value)
	if len(padding) == 0 {
		size = min(size, int64(len(characters)))
	}
	if size*4 > 1073741819 {
		return SqlText{Error: "54000"}
	}
	source := string(characters[:min(size, int64(len(characters)))])
	needed := max(0, size-int64(len(characters)))
	extra := ""
	if len(padding) > 0 {
		extra = strings.Repeat(fill.Value, int(needed)/len(padding)) + string(padding[:int(needed)%len(padding)])
	}
	return SqlText{Value: source + extra, Valid: true}
}

func textPadRightSpace(value SqlText, count SqlInteger) SqlText {
	return textPadRight(value, count, SqlText{Value: " ", Valid: true})
}

func textOverlayLength(value SqlText, replacement SqlText, start SqlInteger, length SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if replacement.Error != "" {
		return SqlText{Error: replacement.Error}
	}
	if start.Error != "" {
		return SqlText{Error: start.Error}
	}
	if length.Error != "" {
		return SqlText{Error: length.Error}
	}
	if !value.Valid || !replacement.Valid || !start.Valid || !length.Valid {
		return SqlText{}
	}
	if start.Value <= 0 {
		return SqlText{Error: "22011"}
	}
	end := start.Value + length.Value
	if end > 2147483647 || end < -2147483648 {
		return SqlText{Error: "22003"}
	}
	left, _ := sqlTextSubstring(value.Value, 1, start.Value-1, true)
	right, _ := sqlTextSubstring(value.Value, end, 0, false)
	return SqlText{Value: left + replacement.Value + right, Valid: true}
}

func textOverlay(value, replacement SqlText, start SqlInteger) SqlText {
	return textOverlayLength(value, replacement, start, textLength(replacement))
}

func textLikeNextChar(bytes []byte) []byte {
	if len(bytes) == 0 {
		return bytes
	}
	bytes = bytes[1:]
	for len(bytes) > 0 && bytes[0]&0xC0 == 0x80 {
		bytes = bytes[1:]
	}
	return bytes
}

func textLikeCharLen(bytes []byte) int {
	if len(bytes) == 0 {
		return 0
	}
	lead := bytes[0]
	width := 1
	if lead&0x80 == 0 {
		width = 1
	} else if lead&0xE0 == 0xC0 {
		width = 2
	} else if lead&0xF0 == 0xE0 {
		width = 3
	} else if lead&0xF8 == 0xF0 {
		width = 4
	}
	if width > len(bytes) {
		return len(bytes)
	}
	return width
}

func textLikeMatch(text, pattern []byte) (int, string) {
	if len(pattern) == 1 && pattern[0] == '%' {
		return 1, ""
	}
	for len(text) > 0 && len(pattern) > 0 {
		if pattern[0] == '\\' {
			pattern = pattern[1:]
			if len(pattern) == 0 {
				return 0, "22025"
			}
			if pattern[0] != text[0] {
				return 0, ""
			}
		} else if pattern[0] == '%' {
			pattern = pattern[1:]
			for len(pattern) > 0 {
				if pattern[0] == '%' {
					pattern = pattern[1:]
				} else if pattern[0] == '_' {
					if len(text) == 0 {
						return -1, ""
					}
					text = textLikeNextChar(text)
					pattern = pattern[1:]
				} else {
					break
				}
			}
			if len(pattern) == 0 {
				return 1, ""
			}
			var first byte
			if pattern[0] == '\\' {
				if len(pattern) < 2 {
					return 0, "22025"
				}
				first = pattern[1]
			} else {
				first = pattern[0]
			}
			for len(text) > 0 {
				if text[0] == first {
					matched, err := textLikeMatch(text, pattern)
					if err != "" {
						return 0, err
					}
					if matched != 0 {
						return matched, ""
					}
				}
				text = textLikeNextChar(text)
			}
			return -1, ""
		} else if pattern[0] == '_' {
			text = textLikeNextChar(text)
			pattern = pattern[1:]
			continue
		} else if pattern[0] != text[0] {
			return 0, ""
		}
		text = text[1:]
		pattern = pattern[1:]
	}
	if len(text) > 0 {
		return 0, ""
	}
	for len(pattern) > 0 && pattern[0] == '%' {
		pattern = pattern[1:]
	}
	if len(pattern) <= 0 {
		return 1, ""
	}
	return -1, ""
}

func textLike(value, pattern SqlText) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if pattern.Error != "" {
		return SqlBoolean{Error: pattern.Error}
	}
	if !value.Valid || !pattern.Valid {
		return SqlBoolean{}
	}
	matched, err := textLikeMatch([]byte(value.Value), []byte(pattern.Value))
	if err != "" {
		return SqlBoolean{Error: err}
	}
	return SqlBoolean{Value: matched == 1, Valid: true}
}

func textNotLike(value, pattern SqlText) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if pattern.Error != "" {
		return SqlBoolean{Error: pattern.Error}
	}
	if !value.Valid || !pattern.Valid {
		return SqlBoolean{}
	}
	matched, err := textLikeMatch([]byte(value.Value), []byte(pattern.Value))
	if err != "" {
		return SqlBoolean{Error: err}
	}
	return SqlBoolean{Value: matched != 1, Valid: true}
}

func textLikeEscape(pattern, escape SqlText) SqlText {
	if pattern.Error != "" {
		return SqlText{Error: pattern.Error}
	}
	if escape.Error != "" {
		return SqlText{Error: escape.Error}
	}
	if !pattern.Valid || !escape.Valid {
		return SqlText{}
	}
	bytes := []byte(pattern.Value)
	mark := []byte(escape.Value)
	output := make([]byte, 0, len(bytes)*2)
	if len(mark) == 0 {
		for len(bytes) > 0 {
			if bytes[0] == '\\' {
				output = append(output, '\\')
			}
			width := textLikeCharLen(bytes)
			output = append(output, bytes[:width]...)
			bytes = bytes[width:]
		}
	} else {
		if textLikeCharLen(mark) != len(mark) {
			return SqlText{Error: "22025"}
		}
		if mark[0] == '\\' {
			return pattern
		}
		afterEscape := false
		for len(bytes) > 0 {
			same := textLikeCharLen(bytes) == len(mark)
			if same {
				for index := range mark {
					if bytes[index] != mark[index] {
						same = false
						break
					}
				}
			}
			if same && !afterEscape {
				output = append(output, '\\')
				bytes = bytes[len(mark):]
				afterEscape = true
			} else if bytes[0] == '\\' {
				output = append(output, '\\')
				if !afterEscape {
					output = append(output, '\\')
				}
				bytes = bytes[textLikeCharLen(bytes):]
				afterEscape = false
			} else {
				width := textLikeCharLen(bytes)
				output = append(output, bytes[:width]...)
				bytes = bytes[width:]
				afterEscape = false
			}
		}
	}
	return SqlText{Value: string(output), Valid: true}
}
