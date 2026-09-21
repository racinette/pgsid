package pgsidsql

func bitInput(value string) SqlText {
	if len(value) == 0 {
		return SqlText{Value: "", Valid: true}
	}
	lead := value[0]
	if lead == 'x' || lead == 'X' {
		out := make([]byte, 0, (len(value)-1)*4)
		for index := 1; index < len(value); index++ {
			digit := value[index]
			var nibble byte
			switch {
			case digit >= '0' && digit <= '9':
				nibble = digit - '0'
			case digit >= 'A' && digit <= 'F':
				nibble = digit - 'A' + 10
			case digit >= 'a' && digit <= 'f':
				nibble = digit - 'a' + 10
			default:
				return SqlText{Error: "22P02"}
			}
			for shift := 3; shift >= 0; shift-- {
				if nibble&(1<<shift) != 0 {
					out = append(out, '1')
				} else {
					out = append(out, '0')
				}
			}
		}
		return SqlText{Value: string(out), Valid: true}
	}
	body := value
	if lead == 'b' || lead == 'B' {
		body = value[1:]
	}
	for index := 0; index < len(body); index++ {
		if body[index] != '0' && body[index] != '1' {
			return SqlText{Error: "22P02"}
		}
	}
	return SqlText{Value: body, Valid: true}
}

func bitPack(value string) []byte {
	out := make([]byte, (len(value)+7)/8)
	for index := 0; index < len(value); index++ {
		if value[index] == '1' {
			out[index>>3] |= 128 >> (index & 7)
		}
	}
	return out
}

func bitCompare(left, right SqlText) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	leftBytes := bitPack(left.Value)
	rightBytes := bitPack(right.Value)
	length := len(leftBytes)
	if len(rightBytes) < length {
		length = len(rightBytes)
	}
	for index := 0; index < length; index++ {
		if leftBytes[index] != rightBytes[index] {
			return SqlInteger{Value: int64(leftBytes[index]) - int64(rightBytes[index]), Valid: true}
		}
	}
	if len(left.Value) == len(right.Value) {
		return SqlInteger{Value: 0, Valid: true}
	}
	if len(left.Value) < len(right.Value) {
		return SqlInteger{Value: -1, Valid: true}
	}
	return SqlInteger{Value: 1, Valid: true}
}

func bitPredicate(left, right SqlText, operation string) SqlBoolean {
	comparison := bitCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	var result bool
	switch operation {
	case "eq":
		result = comparison.Value == 0
	case "ne":
		result = comparison.Value != 0
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func bitEq(left, right SqlText) SqlBoolean { return bitPredicate(left, right, "eq") }
func bitNe(left, right SqlText) SqlBoolean { return bitPredicate(left, right, "ne") }
func bitLt(left, right SqlText) SqlBoolean { return bitPredicate(left, right, "lt") }
func bitLe(left, right SqlText) SqlBoolean { return bitPredicate(left, right, "le") }
func bitGt(left, right SqlText) SqlBoolean { return bitPredicate(left, right, "gt") }
func bitGe(left, right SqlText) SqlBoolean { return bitPredicate(left, right, "ge") }

func bitLength(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(len(value.Value)), Valid: true}
}

func bitOctetLength(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64((len(value.Value) + 7) / 8), Valid: true}
}

func bitCount(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	var count int64
	for index := 0; index < len(value.Value); index++ {
		if value.Value[index] == '1' {
			count++
		}
	}
	return SqlInteger{Value: count, Valid: true}
}

func bitSameWidth(left, right string) string {
	if len(left) != len(right) {
		return "22026"
	}
	return ""
}

func bitCombine(left, right SqlText, operation string) SqlText {
	if left.Error != "" {
		return SqlText{Error: left.Error}
	}
	if right.Error != "" {
		return SqlText{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlText{}
	}
	if err := bitSameWidth(left.Value, right.Value); err != "" {
		return SqlText{Error: err}
	}
	out := make([]byte, len(left.Value))
	for index := 0; index < len(out); index++ {
		leftBit := left.Value[index] == '1'
		rightBit := right.Value[index] == '1'
		set := false
		switch operation {
		case "and":
			set = leftBit && rightBit
		case "or":
			set = leftBit || rightBit
		case "xor":
			set = leftBit != rightBit
		}
		if set {
			out[index] = '1'
		} else {
			out[index] = '0'
		}
	}
	return SqlText{Value: string(out), Valid: true}
}

func bitAnd(left, right SqlText) SqlText { return bitCombine(left, right, "and") }
func bitOr(left, right SqlText) SqlText  { return bitCombine(left, right, "or") }
func bitXor(left, right SqlText) SqlText { return bitCombine(left, right, "xor") }

func bitNot(value SqlText) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	out := make([]byte, len(value.Value))
	for index := 0; index < len(out); index++ {
		if value.Value[index] == '1' {
			out[index] = '0'
		} else {
			out[index] = '1'
		}
	}
	return SqlText{Value: string(out), Valid: true}
}

func bitShift(value SqlText, amount SqlInteger, right bool) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if amount.Error != "" {
		return SqlText{Error: amount.Error}
	}
	if !value.Valid || !amount.Valid {
		return SqlText{}
	}
	shift := amount.Value
	if shift < 0 {
		magnitude := -shift
		if shift < -2147483640 {
			magnitude = 2147483640
		}
		return bitShift(value, SqlInteger{Value: magnitude, Valid: true}, !right)
	}
	if shift >= int64(len(value.Value)) {
		return SqlText{Value: repeatBit('0', len(value.Value)), Valid: true}
	}
	if right {
		return SqlText{Value: repeatBit('0', int(shift)) + value.Value[:len(value.Value)-int(shift)], Valid: true}
	}
	return SqlText{Value: value.Value[int(shift):] + repeatBit('0', int(shift)), Valid: true}
}

func repeatBit(bit byte, count int) string {
	out := make([]byte, count)
	for index := range out {
		out[index] = bit
	}
	return string(out)
}

func bitShiftLeft(value SqlText, amount SqlInteger) SqlText {
	return bitShift(value, amount, false)
}
func bitShiftRight(value SqlText, amount SqlInteger) SqlText {
	return bitShift(value, amount, true)
}

func bitCat(left, right SqlText) SqlText {
	if left.Error != "" {
		return SqlText{Error: left.Error}
	}
	if right.Error != "" {
		return SqlText{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlText{}
	}
	return SqlText{Value: left.Value + right.Value, Valid: true}
}

func bitSubstring(value string, start int64, length int64, hasLength bool) (string, string) {
	if hasLength && length < 0 {
		return "", "22011"
	}
	first := start
	if first < 1 {
		first = 1
	}
	end := int64(len(value)) + 1
	if hasLength {
		sum := start + length
		if sum <= 2147483647 && sum >= -2147483648 {
			if sum < end {
				end = sum
			}
		}
	}
	if first > int64(len(value)) || end <= first {
		return "", ""
	}
	return value[int(first)-1 : int(end)-1], ""
}

func bitSubstr(value SqlText, start SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if start.Error != "" {
		return SqlText{Error: start.Error}
	}
	if !value.Valid || !start.Valid {
		return SqlText{}
	}
	out, err := bitSubstring(value.Value, start.Value, 0, false)
	if err != "" {
		return SqlText{Error: err}
	}
	return SqlText{Value: out, Valid: true}
}

func bitSubstrLength(value SqlText, start, length SqlInteger) SqlText {
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
	out, err := bitSubstring(value.Value, start.Value, length.Value, true)
	if err != "" {
		return SqlText{Error: err}
	}
	return SqlText{Value: out, Valid: true}
}

func bitOverlayLength(value, replacement SqlText, start, length SqlInteger) SqlText {
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
	prefix, err := bitSubstring(value.Value, 1, start.Value-1, true)
	if err != "" {
		return SqlText{Error: err}
	}
	suffix, err := bitSubstring(value.Value, end, 0, false)
	if err != "" {
		return SqlText{Error: err}
	}
	return SqlText{Value: prefix + replacement.Value + suffix, Valid: true}
}

func bitOverlay(value, replacement SqlText, start SqlInteger) SqlText {
	return bitOverlayLength(value, replacement, start, bitLength(replacement))
}

func bitPosition(value, search SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if search.Error != "" {
		return SqlInteger{Error: search.Error}
	}
	if !value.Valid || !search.Valid {
		return SqlInteger{}
	}
	if len(value.Value) == 0 || len(search.Value) > len(value.Value) {
		return SqlInteger{Value: 0, Valid: true}
	}
	if len(search.Value) == 0 {
		return SqlInteger{Value: 1, Valid: true}
	}
	for index := 0; index <= len(value.Value)-len(search.Value); index++ {
		if value.Value[index:index+len(search.Value)] == search.Value {
			return SqlInteger{Value: int64(index + 1), Valid: true}
		}
	}
	return SqlInteger{Value: 0, Valid: true}
}

func bitGet(value SqlText, index SqlInteger) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if index.Error != "" {
		return SqlInteger{Error: index.Error}
	}
	if !value.Valid || !index.Valid {
		return SqlInteger{}
	}
	if index.Value < 0 || index.Value >= int64(len(value.Value)) {
		return SqlInteger{Error: "2202E"}
	}
	if value.Value[int(index.Value)] == '1' {
		return SqlInteger{Value: 1, Valid: true}
	}
	return SqlInteger{Value: 0, Valid: true}
}

func bitSet(value SqlText, index, next SqlInteger) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if index.Error != "" {
		return SqlText{Error: index.Error}
	}
	if next.Error != "" {
		return SqlText{Error: next.Error}
	}
	if !value.Valid || !index.Valid || !next.Valid {
		return SqlText{}
	}
	if index.Value < 0 || index.Value >= int64(len(value.Value)) {
		return SqlText{Error: "2202E"}
	}
	if next.Value != 0 && next.Value != 1 {
		return SqlText{Error: "22023"}
	}
	out := []byte(value.Value)
	if next.Value == 1 {
		out[int(index.Value)] = '1'
	} else {
		out[int(index.Value)] = '0'
	}
	return SqlText{Value: string(out), Valid: true}
}

func bitTypmod(value SqlText, length SqlInteger, explicit SqlBoolean) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if length.Error != "" {
		return SqlText{Error: length.Error}
	}
	if explicit.Error != "" {
		return SqlText{Error: explicit.Error}
	}
	if !value.Valid || !length.Valid || !explicit.Valid {
		return SqlText{}
	}
	limit := length.Value
	if limit <= 0 || limit > 2147483640 || limit == int64(len(value.Value)) {
		return value
	}
	if !explicit.Value {
		return SqlText{Error: "22026"}
	}
	if int64(len(value.Value)) > limit {
		return SqlText{Value: value.Value[:int(limit)], Valid: true}
	}
	return SqlText{Value: value.Value + repeatBit('0', int(limit)-len(value.Value)), Valid: true}
}

func varbitTypmod(value SqlText, length SqlInteger, explicit SqlBoolean) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if length.Error != "" {
		return SqlText{Error: length.Error}
	}
	if explicit.Error != "" {
		return SqlText{Error: explicit.Error}
	}
	if !value.Valid || !length.Valid || !explicit.Valid {
		return SqlText{}
	}
	limit := length.Value
	if limit <= 0 || limit >= int64(len(value.Value)) {
		return value
	}
	if !explicit.Value {
		return SqlText{Error: "22001"}
	}
	return SqlText{Value: value.Value[:int(limit)], Valid: true}
}

func bitFromInt(value SqlInteger, width SqlInteger, sourceBits int) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if width.Error != "" {
		return SqlText{Error: width.Error}
	}
	if !value.Valid || !width.Valid {
		return SqlText{}
	}
	size := int(width.Value)
	if width.Value <= 0 || width.Value > 2147483640 {
		size = 1
	}
	kept := size
	if sourceBits < kept {
		kept = sourceBits
	}
	out := make([]byte, size)
	for index := 0; index < kept; index++ {
		if (value.Value>>uint(kept-1-index))&1 == 1 {
			out[size-kept+index] = '1'
		} else {
			out[size-kept+index] = '0'
		}
	}
	fill := byte('0')
	if value.Value < 0 {
		fill = '1'
	}
	for index := 0; index < size-kept; index++ {
		out[index] = fill
	}
	return SqlText{Value: string(out), Valid: true}
}

func bitFromInt4(value, width SqlInteger) SqlText { return bitFromInt(value, width, 32) }
func bitFromInt8(value, width SqlInteger) SqlText { return bitFromInt(value, width, 64) }

func bitToInt(value SqlText, width int) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	if len(value.Value) > width {
		return SqlInteger{Error: "22003"}
	}
	var result uint64
	for index := 0; index < len(value.Value); index++ {
		result <<= 1
		if value.Value[index] == '1' {
			result |= 1
		}
	}
	sign := uint64(1) << uint(width-1)
	signed := int64(result)
	if result >= sign {
		signed = int64(result - (sign << 1))
	}
	return SqlInteger{Value: signed, Valid: true}
}

func bitToInt4(value SqlText) SqlInteger { return bitToInt(value, 32) }
func bitToInt8(value SqlText) SqlInteger { return bitToInt(value, 64) }
