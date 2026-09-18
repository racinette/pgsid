package pgsidsql

import (
	"github.com/shopspring/decimal"
	"math"
	"strconv"
	"strings"
)

type SqlDecimal struct {
	Value   decimal.Decimal
	Scale   int32
	Special string
	Valid   bool
	Error   string
}

func sqlDecimalResult(value decimal.Decimal, scale int32) SqlDecimal {
	if scale > 16383 || (!value.IsZero() && len(strings.TrimPrefix(value.Coefficient().String(), "-"))+int(value.Exponent()) > 131072) {
		return SqlDecimal{Error: "22003"}
	}
	return SqlDecimal{Value: value, Scale: scale, Valid: true}
}

func sqlDecimalText(value SqlDecimal) string {
	if value.Special != "" {
		return value.Special
	}
	return value.Value.StringFixed(value.Scale)
}

func decimalInput(text string) SqlDecimal {
	if text == "NaN" || text == "Infinity" || text == "+Infinity" || text == "-Infinity" {
		if text == "+Infinity" {
			text = "Infinity"
		}
		return SqlDecimal{Special: text, Valid: true}
	}
	exponent := int64(0)
	mantissa := text
	if index := strings.IndexAny(text, "eE"); index >= 0 {
		var err error
		exponent, err = strconv.ParseInt(text[index+1:], 10, 64)
		if err != nil || exponent > 1073741823 || exponent < -1073741823 {
			return SqlDecimal{Error: "22003"}
		}
		mantissa = text[:index]
	}
	fraction := int64(0)
	if index := strings.IndexByte(mantissa, '.'); index >= 0 {
		fraction = int64(len(mantissa) - index - 1)
	}
	scale := fraction - exponent
	if scale < 0 {
		scale = 0
	}
	if scale > 16383 {
		return SqlDecimal{Error: "22003"}
	}
	value, err := decimal.NewFromString(text)
	if err != nil {
		return SqlDecimal{Error: "22003"}
	}
	return sqlDecimalResult(value, int32(scale))
}

func sqlDecimalSign(value SqlDecimal) int {
	if value.Special == "Infinity" {
		return 1
	}
	if value.Special == "-Infinity" {
		return -1
	}
	return value.Value.Sign()
}

func sqlDecimalWeight(value decimal.Decimal) (int, int) {
	if value.IsZero() {
		return 0, 0
	}
	digits := strings.TrimPrefix(value.Coefficient().String(), "-")
	adjusted := len(digits) + int(value.Exponent()) - 1
	weight := adjusted / 4
	if adjusted < 0 && adjusted%4 != 0 {
		weight--
	}
	length := adjusted - weight*4 + 1
	if len(digits) < length {
		digits += strings.Repeat("0", length-len(digits))
	}
	first, _ := strconv.Atoi(digits[:length])
	return weight, first
}

func sqlDecimalBinary(left, right SqlDecimal, op string) SqlDecimal {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlDecimal{}
	}
	if left.Special == "NaN" || right.Special == "NaN" {
		return SqlDecimal{Special: "NaN", Valid: true}
	}
	if (op == "div" || op == "quotient" || op == "mod") && right.Special == "" && right.Value.IsZero() {
		return SqlDecimal{Error: "22012"}
	}
	if left.Special != "" || right.Special != "" {
		nan := SqlDecimal{Special: "NaN", Valid: true}
		sign := sqlDecimalSign(left) * sqlDecimalSign(right)
		special := "Infinity"
		if sign < 0 {
			special = "-Infinity"
		}
		switch op {
		case "add", "sub":
			r := right.Special
			if op == "sub" {
				if r == "Infinity" {
					r = "-Infinity"
				} else if r == "-Infinity" {
					r = "Infinity"
				}
			}
			if left.Special != "" && r != "" && left.Special != r {
				return nan
			}
			if left.Special != "" {
				return left
			}
			return SqlDecimal{Special: r, Valid: true}
		case "mul":
			if sign == 0 {
				return nan
			}
			return SqlDecimal{Special: special, Valid: true}
		case "div", "quotient":
			if left.Special != "" && right.Special != "" {
				return nan
			}
			if right.Special != "" {
				return sqlDecimalResult(decimal.Zero, 0)
			}
			return SqlDecimal{Special: special, Valid: true}
		case "mod":
			if left.Special != "" {
				return nan
			}
			return left
		}
	}
	a, b := left.Value, right.Value
	scale := left.Scale
	if right.Scale > scale {
		scale = right.Scale
	}
	var value decimal.Decimal
	switch op {
	case "add":
		value = a.Add(b)
	case "sub":
		value = a.Sub(b)
	case "mul":
		scale = left.Scale + right.Scale
		if scale > 16383 {
			scale = 16383
		}
		value = a.Mul(b).Round(scale)
	case "div":
		xweight, xfirst := sqlDecimalWeight(a)
		yweight, yfirst := sqlDecimalWeight(b)
		weight := xweight - yweight
		if xfirst <= yfirst {
			weight--
		}
		selected := int32(16 - weight*4)
		if selected > scale {
			scale = selected
		}
		if scale < 0 {
			scale = 0
		}
		if scale > 1000 {
			scale = 1000
		}
		value = a.DivRound(b, scale)
	case "quotient":
		value, _ = a.QuoRem(b, 0)
		scale = 0
	case "mod":
		value = a.Mod(b)
	default:
		panic("unknown decimal operation")
	}
	return sqlDecimalResult(value, scale)
}

func sqlDecimalUnary(value SqlDecimal, op string) SqlDecimal {
	if value.Error != "" || !value.Valid {
		return value
	}
	if op == "identity" {
		return value
	}
	if op == "sign" {
		if value.Special == "NaN" {
			return value
		}
		return sqlDecimalResult(decimal.NewFromInt(int64(sqlDecimalSign(value))), 0)
	}
	if value.Special != "" {
		if op == "neg" {
			if value.Special == "Infinity" {
				value.Special = "-Infinity"
			} else if value.Special == "-Infinity" {
				value.Special = "Infinity"
			}
		}
		if op == "abs" && value.Special == "-Infinity" {
			value.Special = "Infinity"
		}
		return value
	}
	scale := value.Scale
	switch op {
	case "neg":
		value.Value = value.Value.Neg()
	case "abs":
		value.Value = value.Value.Abs()
	case "ceil":
		value.Value = value.Value.Ceil()
		scale = 0
	case "floor":
		value.Value = value.Value.Floor()
		scale = 0
	}
	return sqlDecimalResult(value.Value, scale)
}

func sqlDecimalRound(value SqlDecimal, digits SqlInteger, truncate bool) SqlDecimal {
	if value.Error != "" {
		return value
	}
	if digits.Error != "" {
		return SqlDecimal{Error: digits.Error}
	}
	if !value.Valid || !digits.Valid {
		return SqlDecimal{}
	}
	if value.Special != "" {
		return value
	}
	scale := digits.Value
	minimum := int64(-131073)
	if truncate {
		minimum = -131072
	}
	if scale < minimum {
		scale = minimum
	}
	if scale > 16383 {
		scale = 16383
	}
	var result decimal.Decimal
	if truncate {
		result, _ = value.Value.QuoRem(decimal.New(1, -int32(scale)), 0)
		result = result.Mul(decimal.New(1, -int32(scale)))
	} else {
		result = value.Value.Round(int32(scale))
	}
	if scale < 0 {
		scale = 0
	}
	return sqlDecimalResult(result, int32(scale))
}

func decimalTypmod(value SqlDecimal, typmod SqlInteger) SqlDecimal {
	if value.Error != "" {
		return value
	}
	if typmod.Error != "" {
		return SqlDecimal{Error: typmod.Error}
	}
	if !value.Valid || !typmod.Valid {
		return SqlDecimal{}
	}
	if typmod.Value < 4 || value.Special == "NaN" {
		return value
	}
	if value.Special != "" {
		return SqlDecimal{Error: "22003"}
	}
	encoded := typmod.Value - 4
	precision := (encoded >> 16) & 65535
	scale := ((encoded & 2047) ^ 1024) - 1024
	result := sqlDecimalRound(value, SqlInteger{Value: scale, Valid: true}, false)
	if result.Error != "" {
		return result
	}
	if !result.Value.IsZero() && len(strings.TrimPrefix(result.Value.Coefficient().String(), "-"))+int(result.Value.Exponent()) > int(precision-scale) {
		return SqlDecimal{Error: "22003"}
	}
	return result
}

func sqlDecimalCompare(left, right SqlDecimal) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if left.Special != "" || right.Special != "" {
		rank := func(value SqlDecimal) int {
			switch value.Special {
			case "-Infinity":
				return -1
			case "Infinity":
				return 1
			case "NaN":
				return 2
			}
			return 0
		}
		a, b := rank(left), rank(right)
		if a < b {
			return SqlInteger{Value: -1, Valid: true}
		}
		if a > b {
			return SqlInteger{Value: 1, Valid: true}
		}
		return SqlInteger{Valid: true}
	}
	return SqlInteger{Value: int64(left.Value.Cmp(right.Value)), Valid: true}
}

func sqlDecimalGcd(left, right SqlDecimal, lcm bool) SqlDecimal {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlDecimal{}
	}
	if left.Special != "" || right.Special != "" {
		return SqlDecimal{Special: "NaN", Valid: true}
	}
	x, y := left.Value.Abs(), right.Value.Abs()
	a, b := x, y
	for !b.IsZero() {
		a, b = b, a.Mod(b)
	}
	if lcm {
		if x.IsZero() || y.IsZero() {
			a = decimal.Zero
		} else {
			quotient, _ := x.QuoRem(a, 0)
			a = quotient.Mul(y)
		}
	}
	scale := left.Scale
	if right.Scale > scale {
		scale = right.Scale
	}
	return sqlDecimalResult(a, scale)
}

func decimalFromInteger(value SqlInteger) SqlDecimal {
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !value.Valid {
		return SqlDecimal{}
	}
	return sqlDecimalResult(decimal.NewFromInt(value.Value), 0)
}

func sqlDecimalFromFloat(value SqlFloat, digits int) SqlDecimal {
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !value.Valid {
		return SqlDecimal{}
	}
	if math.IsNaN(value.Value) {
		return SqlDecimal{Special: "NaN", Valid: true}
	}
	if math.IsInf(value.Value, 1) {
		return SqlDecimal{Special: "Infinity", Valid: true}
	}
	if math.IsInf(value.Value, -1) {
		return SqlDecimal{Special: "-Infinity", Valid: true}
	}
	return decimalInput(strconv.FormatFloat(value.Value, 'g', digits, 64))
}

func sqlDecimalToInteger(value SqlDecimal, min, max int64) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	if value.Special != "" {
		return SqlInteger{Error: "0A000"}
	}
	rounded := value.Value.Round(0)
	if rounded.LessThan(decimal.NewFromInt(min)) || rounded.GreaterThan(decimal.NewFromInt(max)) {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: rounded.IntPart(), Valid: true}
}

func sqlDecimalToFloat(value SqlDecimal, width int) SqlFloat {
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !value.Valid {
		return SqlFloat{}
	}
	text := value.Special
	if text == "" {
		text = value.Value.String()
	}
	result, err := strconv.ParseFloat(text, width)
	if err != nil || (value.Special == "" && result == 0 && !value.Value.IsZero()) {
		return SqlFloat{Error: "22003"}
	}
	return SqlFloat{Value: result, Valid: true}
}

func decimalAdd(left, right SqlDecimal) SqlDecimal { return sqlDecimalBinary(left, right, "add") }

func decimalSub(left, right SqlDecimal) SqlDecimal { return sqlDecimalBinary(left, right, "sub") }

func decimalMul(left, right SqlDecimal) SqlDecimal { return sqlDecimalBinary(left, right, "mul") }

func decimalDiv(left, right SqlDecimal) SqlDecimal { return sqlDecimalBinary(left, right, "div") }

func decimalQuotient(left, right SqlDecimal) SqlDecimal {
	return sqlDecimalBinary(left, right, "quotient")
}

func decimalMod(left, right SqlDecimal) SqlDecimal { return sqlDecimalBinary(left, right, "mod") }

func decimalIdentity(value SqlDecimal) SqlDecimal { return sqlDecimalUnary(value, "identity") }

func decimalNeg(value SqlDecimal) SqlDecimal { return sqlDecimalUnary(value, "neg") }

func decimalAbs(value SqlDecimal) SqlDecimal { return sqlDecimalUnary(value, "abs") }

func decimalCeil(value SqlDecimal) SqlDecimal { return sqlDecimalUnary(value, "ceil") }

func decimalFloor(value SqlDecimal) SqlDecimal { return sqlDecimalUnary(value, "floor") }

func decimalSign(value SqlDecimal) SqlDecimal { return sqlDecimalUnary(value, "sign") }

func decimalRound(value SqlDecimal, digits ...SqlInteger) SqlDecimal {
	scale := SqlInteger{Valid: true}
	if len(digits) != 0 {
		scale = digits[0]
	}
	return sqlDecimalRound(value, scale, false)
}

func decimalTrunc(value SqlDecimal, digits ...SqlInteger) SqlDecimal {
	scale := SqlInteger{Valid: true}
	if len(digits) != 0 {
		scale = digits[0]
	}
	return sqlDecimalRound(value, scale, true)
}

func decimalGcd(left, right SqlDecimal) SqlDecimal { return sqlDecimalGcd(left, right, false) }

func decimalLcm(left, right SqlDecimal) SqlDecimal { return sqlDecimalGcd(left, right, true) }

func decimalEq(left, right SqlDecimal) SqlBoolean {
	comparison := sqlDecimalCompare(left, right)
	return sqlComparisonResult(comparison, comparison.Value == 0)
}

func decimalNe(left, right SqlDecimal) SqlBoolean {
	comparison := sqlDecimalCompare(left, right)
	return sqlComparisonResult(comparison, comparison.Value != 0)
}

func decimalLt(left, right SqlDecimal) SqlBoolean {
	comparison := sqlDecimalCompare(left, right)
	return sqlComparisonResult(comparison, comparison.Value < 0)
}

func decimalLe(left, right SqlDecimal) SqlBoolean {
	comparison := sqlDecimalCompare(left, right)
	return sqlComparisonResult(comparison, comparison.Value <= 0)
}

func decimalGt(left, right SqlDecimal) SqlBoolean {
	comparison := sqlDecimalCompare(left, right)
	return sqlComparisonResult(comparison, comparison.Value > 0)
}

func decimalGe(left, right SqlDecimal) SqlBoolean {
	comparison := sqlDecimalCompare(left, right)
	return sqlComparisonResult(comparison, comparison.Value >= 0)
}

func int2FromDecimal(value SqlDecimal) SqlInteger { return sqlDecimalToInteger(value, -32768, 32767) }

func int4FromDecimal(value SqlDecimal) SqlInteger {
	return sqlDecimalToInteger(value, -2147483648, 2147483647)
}

func int8FromDecimal(value SqlDecimal) SqlInteger {
	return sqlDecimalToInteger(value, -9223372036854775808, 9223372036854775807)
}

func decimalFromFloat4(value SqlFloat) SqlDecimal { return sqlDecimalFromFloat(value, 6) }

func float4FromDecimal(value SqlDecimal) SqlFloat { return sqlDecimalToFloat(value, 32) }

func decimalFromFloat8(value SqlFloat) SqlDecimal { return sqlDecimalFromFloat(value, 15) }

func float8FromDecimal(value SqlDecimal) SqlFloat { return sqlDecimalToFloat(value, 64) }

func decimalScale(value SqlDecimal) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid || value.Special != "" {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(value.Scale), Valid: true}
}

func decimalMinScale(value SqlDecimal) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid || value.Special != "" {
		return SqlInteger{}
	}
	text := value.Value.String()
	scale := 0
	if index := strings.IndexByte(text, '.'); index >= 0 {
		scale = len(text) - index - 1
	}
	return SqlInteger{Value: int64(scale), Valid: true}
}

func decimalTrimScale(value SqlDecimal) SqlDecimal {
	if value.Error != "" || !value.Valid || value.Special != "" {
		return value
	}
	value.Scale = int32(decimalMinScale(value).Value)
	return value
}

func decimalWidthBucket(value, lower, upper SqlDecimal, count SqlInteger) SqlInteger {
	for _, operand := range []SqlDecimal{value, lower, upper} {
		if operand.Error != "" {
			return SqlInteger{Error: operand.Error}
		}
	}
	if count.Error != "" {
		return count
	}
	if !value.Valid || !lower.Valid || !upper.Valid || !count.Valid {
		return SqlInteger{}
	}
	if count.Value <= 0 || value.Special == "NaN" || lower.Special != "" || upper.Special != "" || lower.Value.Equal(upper.Value) {
		return SqlInteger{Error: "2201G"}
	}
	ascending := lower.Value.LessThan(upper.Value)
	below := value.Special == "-Infinity" || (value.Special == "" && value.Value.LessThan(lower.Value))
	above := value.Special == "Infinity" || (value.Special == "" && value.Value.GreaterThan(lower.Value))
	if (ascending && below) || (!ascending && above) {
		return SqlInteger{Value: 0, Valid: true}
	}
	beyond := value.Special == "Infinity" || (value.Special == "" && value.Value.GreaterThanOrEqual(upper.Value))
	reverseBeyond := value.Special == "-Infinity" || (value.Special == "" && value.Value.LessThanOrEqual(upper.Value))
	if (ascending && beyond) || (!ascending && reverseBeyond) {
		return sqlIntegerRange(SqlInteger{Value: count.Value + 1, Valid: true}, -2147483648, 2147483647)
	}
	numerator := value.Value.Sub(lower.Value).Mul(decimal.NewFromInt(count.Value))
	denominator := upper.Value.Sub(lower.Value)
	quotient, _ := numerator.QuoRem(denominator, 0)
	return SqlInteger{Value: quotient.IntPart() + 1, Valid: true}
}
