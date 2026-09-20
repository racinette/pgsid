package pgsidsql

type SqlEnum struct {
	Type  string
	Label string
	Order int64
	Valid bool
	Error string
}

func enumInput(value, enumType string, labels []string) SqlEnum {
	for order, label := range labels {
		if value == label {
			return SqlEnum{
				Type:  enumType,
				Label: value,
				Order: int64(order),
				Valid: true,
			}
		}
	}
	return SqlEnum{Error: "22P02"}
}

func enumFromText(value SqlText, enumType string, labels []string) SqlEnum {
	if value.Error != "" {
		return SqlEnum{Error: value.Error}
	}
	if !value.Valid {
		return SqlEnum{}
	}
	return enumInput(value.Value, enumType, labels)
}

func enumText(value SqlEnum) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: value.Label, Valid: true}
}

func enumCompare(left, right SqlEnum) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if left.Type != right.Type {
		return SqlInteger{Error: "42883"}
	}
	return SqlInteger{Value: left.Order - right.Order, Valid: true}
}

func enumComparison(left, right SqlEnum, operation string) SqlBoolean {
	comparison := enumCompare(left, right)
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

func enumEq(left, right SqlEnum) SqlBoolean { return enumComparison(left, right, "eq") }
func enumNe(left, right SqlEnum) SqlBoolean { return enumComparison(left, right, "ne") }
func enumLt(left, right SqlEnum) SqlBoolean { return enumComparison(left, right, "lt") }
func enumLe(left, right SqlEnum) SqlBoolean { return enumComparison(left, right, "le") }
func enumGt(left, right SqlEnum) SqlBoolean { return enumComparison(left, right, "gt") }
func enumGe(left, right SqlEnum) SqlBoolean { return enumComparison(left, right, "ge") }

func sqlIsNullEnum(value SqlEnum) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullEnum(value SqlEnum) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseEnum(otherwise func() SqlEnum, conditions []func() SqlBoolean, branches []func() SqlEnum) SqlEnum {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlEnum{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceEnum(operands ...func() SqlEnum) SqlEnum {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlEnum{}
}
