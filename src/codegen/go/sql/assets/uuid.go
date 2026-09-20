package pgsidsql

type SqlUuid struct {
	Value [16]byte
	Valid bool
	Error string
}

func uuidHexDigit(value byte) (byte, bool) {
	switch {
	case value >= '0' && value <= '9':
		return value - '0', true
	case value >= 'a' && value <= 'f':
		return value - 'a' + 10, true
	case value >= 'A' && value <= 'F':
		return value - 'A' + 10, true
	default:
		return 0, false
	}
}

func uuidInput(value string) SqlUuid {
	var output SqlUuid
	index := 0
	braces := len(value) > 0 && value[0] == '{'
	if braces {
		index++
	}
	for i := range output.Value {
		if index+1 >= len(value) {
			return SqlUuid{Error: "22P02"}
		}
		high, highValid := uuidHexDigit(value[index])
		low, lowValid := uuidHexDigit(value[index+1])
		if !highValid || !lowValid {
			return SqlUuid{Error: "22P02"}
		}
		output.Value[i] = high<<4 | low
		index += 2
		if index < len(value) && value[index] == '-' && i%2 == 1 && i < len(output.Value)-1 {
			index++
		}
	}
	if braces {
		if index >= len(value) || value[index] != '}' {
			return SqlUuid{Error: "22P02"}
		}
		index++
	}
	if index != len(value) {
		return SqlUuid{Error: "22P02"}
	}
	output.Valid = true
	return output
}

func uuidFromText(value SqlText) SqlUuid {
	if value.Error != "" {
		return SqlUuid{Error: value.Error}
	}
	if !value.Valid {
		return SqlUuid{}
	}
	return uuidInput(value.Value)
}

func uuidText(value SqlUuid) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	const digits = "0123456789abcdef"
	var output [36]byte
	byteIndex := 0
	for index := range output {
		if index == 8 || index == 13 || index == 18 || index == 23 {
			output[index] = '-'
			continue
		}
		current := value.Value[byteIndex/2]
		if byteIndex%2 == 0 {
			output[index] = digits[current>>4]
		} else {
			output[index] = digits[current&15]
		}
		byteIndex++
	}
	return SqlText{Value: string(output[:]), Valid: true}
}

func uuidCompare(left, right SqlUuid) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	for index := range left.Value {
		if left.Value[index] != right.Value[index] {
			return SqlInteger{Value: int64(left.Value[index]) - int64(right.Value[index]), Valid: true}
		}
	}
	return SqlInteger{Value: 0, Valid: true}
}

func uuidComparison(left, right SqlUuid, operation string) SqlBoolean {
	comparison := uuidCompare(left, right)
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

func uuidEq(left, right SqlUuid) SqlBoolean { return uuidComparison(left, right, "eq") }
func uuidNe(left, right SqlUuid) SqlBoolean { return uuidComparison(left, right, "ne") }
func uuidLt(left, right SqlUuid) SqlBoolean { return uuidComparison(left, right, "lt") }
func uuidLe(left, right SqlUuid) SqlBoolean { return uuidComparison(left, right, "le") }
func uuidGt(left, right SqlUuid) SqlBoolean { return uuidComparison(left, right, "gt") }
func uuidGe(left, right SqlUuid) SqlBoolean { return uuidComparison(left, right, "ge") }

func uuidExtractVersion(value SqlUuid) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid || value.Value[8]&0xc0 != 0x80 {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(value.Value[6] >> 4), Valid: true}
}

func sqlIsNullUuid(value SqlUuid) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullUuid(value SqlUuid) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseUuid(otherwise func() SqlUuid, conditions []func() SqlBoolean, branches []func() SqlUuid) SqlUuid {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlUuid{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceUuid(operands ...func() SqlUuid) SqlUuid {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlUuid{}
}
