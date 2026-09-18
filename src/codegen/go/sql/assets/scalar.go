package pgsidsql

import (
	"strings"
	"unicode/utf8"
)

type SqlText struct {
	Value string
	Valid bool
	Error string
}

func booleanInput(value bool) SqlBoolean { return SqlBoolean{Value: value, Valid: true} }
func textInput(value string) SqlText     { return SqlText{Value: value, Valid: true} }
func sqlBooleanNot(value SqlBoolean) SqlBoolean {
	if value.Error != "" || !value.Valid {
		return value
	}
	value.Value = !value.Value
	return value
}

func sqlBooleanAnd(left, right func() SqlBoolean) SqlBoolean {
	a := left()
	if a.Error != "" {
		return a
	}
	if a.Valid && a.Value == false {
		return a
	}
	b := right()
	if b.Error != "" {
		return b
	}
	if b.Valid && b.Value == false {
		return b
	}
	if !a.Valid || !b.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: true, Valid: true}
}

func sqlBooleanOr(left, right func() SqlBoolean) SqlBoolean {
	a := left()
	if a.Error != "" {
		return a
	}
	if a.Valid && a.Value == true {
		return a
	}
	b := right()
	if b.Error != "" {
		return b
	}
	if b.Valid && b.Value == true {
		return b
	}
	if !a.Valid || !b.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: false, Valid: true}
}

func sqlIsNullInteger(value SqlInteger) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullInteger(value SqlInteger) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseInteger(otherwise func() SqlInteger, conditions []func() SqlBoolean, branches []func() SqlInteger) SqlInteger {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlInteger{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceInteger(operands ...func() SqlInteger) SqlInteger {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlInteger{}
}

func sqlIsNullFloat(value SqlFloat) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullFloat(value SqlFloat) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseFloat(otherwise func() SqlFloat, conditions []func() SqlBoolean, branches []func() SqlFloat) SqlFloat {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlFloat{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceFloat(operands ...func() SqlFloat) SqlFloat {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlFloat{}
}

func sqlIsNullDecimal(value SqlDecimal) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullDecimal(value SqlDecimal) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseDecimal(otherwise func() SqlDecimal, conditions []func() SqlBoolean, branches []func() SqlDecimal) SqlDecimal {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlDecimal{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceDecimal(operands ...func() SqlDecimal) SqlDecimal {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlDecimal{}
}

func sqlIsNullBoolean(value SqlBoolean) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullBoolean(value SqlBoolean) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseBoolean(otherwise func() SqlBoolean, conditions []func() SqlBoolean, branches []func() SqlBoolean) SqlBoolean {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlBoolean{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceBoolean(operands ...func() SqlBoolean) SqlBoolean {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlBoolean{}
}

func sqlIsNullText(value SqlText) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullText(value SqlText) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseText(otherwise func() SqlText, conditions []func() SqlBoolean, branches []func() SqlText) SqlText {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlText{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceText(operands ...func() SqlText) SqlText {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlText{}
}

func booleanEq(left, right SqlBoolean) SqlBoolean {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	a, b := 0, 0
	if left.Value {
		a = 1
	}
	if right.Value {
		b = 1
	}
	return SqlBoolean{Value: a == b, Valid: true}
}

func textEq(left, right SqlText) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.Compare(left.Value, right.Value) == 0, Valid: true}
}

func booleanNe(left, right SqlBoolean) SqlBoolean {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	a, b := 0, 0
	if left.Value {
		a = 1
	}
	if right.Value {
		b = 1
	}
	return SqlBoolean{Value: a != b, Valid: true}
}

func textNe(left, right SqlText) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.Compare(left.Value, right.Value) != 0, Valid: true}
}

func booleanLt(left, right SqlBoolean) SqlBoolean {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	a, b := 0, 0
	if left.Value {
		a = 1
	}
	if right.Value {
		b = 1
	}
	return SqlBoolean{Value: a < b, Valid: true}
}

func textLt(left, right SqlText) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.Compare(left.Value, right.Value) < 0, Valid: true}
}

func booleanLe(left, right SqlBoolean) SqlBoolean {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	a, b := 0, 0
	if left.Value {
		a = 1
	}
	if right.Value {
		b = 1
	}
	return SqlBoolean{Value: a <= b, Valid: true}
}

func textLe(left, right SqlText) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.Compare(left.Value, right.Value) <= 0, Valid: true}
}

func booleanGt(left, right SqlBoolean) SqlBoolean {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	a, b := 0, 0
	if left.Value {
		a = 1
	}
	if right.Value {
		b = 1
	}
	return SqlBoolean{Value: a > b, Valid: true}
}

func textGt(left, right SqlText) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.Compare(left.Value, right.Value) > 0, Valid: true}
}

func booleanGe(left, right SqlBoolean) SqlBoolean {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	a, b := 0, 0
	if left.Value {
		a = 1
	}
	if right.Value {
		b = 1
	}
	return SqlBoolean{Value: a >= b, Valid: true}
}

func textGe(left, right SqlText) SqlBoolean {
	if left.Error != "" {
		return SqlBoolean{Error: left.Error}
	}
	if right.Error != "" {
		return SqlBoolean{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: strings.Compare(left.Value, right.Value) >= 0, Valid: true}
}

func textLength(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(utf8.RuneCountInString(value.Value)), Valid: true}
}

func textOctetLength(value SqlText) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(len(value.Value)), Valid: true}
}

func textConcat(left, right SqlText) SqlText {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlText{}
	}
	return SqlText{Value: left.Value + right.Value, Valid: true}
}
