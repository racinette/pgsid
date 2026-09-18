package pgsidsql

import "strconv"

type SqlInteger struct {
	Value int64
	Valid bool
	Error string
}

type SqlBoolean struct {
	Value bool
	Valid bool
	Error string
}

func sqlIntegerInput(value string, bits int) SqlInteger {
	integer, err := strconv.ParseInt(value, 10, bits)
	if err != nil {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: integer, Valid: true}
}

func sqlIntegerRange(value SqlInteger, min, max int64) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	if value.Value < min || value.Value > max {
		return SqlInteger{Error: "22003"}
	}
	return value
}

func sqlIntegerAdd(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if right.Value > 0 && left.Value > max-right.Value || right.Value < 0 && left.Value < min-right.Value {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: left.Value + right.Value, Valid: true}
}

func sqlIntegerSub(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if right.Value > 0 && left.Value < min+right.Value || right.Value < 0 && left.Value > max+right.Value {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: left.Value - right.Value, Valid: true}
}

func sqlIntegerMul(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	a, b := left.Value, right.Value
	if a > 0 && (b > 0 && a > max/b || b < 0 && b < min/a) || a < 0 && (b > 0 && a < min/b || b < 0 && a < max/b) {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: a * b, Valid: true}
}

func sqlIntegerNeg(value SqlInteger, min, max int64) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	if value.Value == min {
		return SqlInteger{Error: "22003"}
	}
	return sqlIntegerRange(SqlInteger{Value: -value.Value, Valid: true}, min, max)
}

func sqlIntegerAbs(value SqlInteger, min, max int64) SqlInteger {
	if value.Value < 0 {
		return sqlIntegerNeg(value, min, max)
	}
	return sqlIntegerRange(value, min, max)
}

func sqlIntegerCompare(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	var order int64
	if left.Value < right.Value {
		order = -1
	} else if left.Value > right.Value {
		order = 1
	}
	return SqlInteger{Value: order, Valid: true}
}

func sqlComparisonResult(order SqlInteger, result bool) SqlBoolean {
	return SqlBoolean{Value: result, Valid: order.Valid, Error: order.Error}
}

func sqlIntegerDiv(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if right.Value == 0 {
		return SqlInteger{Error: "22012"}
	}
	if left.Value == min && right.Value == -1 {
		return SqlInteger{Error: "22003"}
	}
	return sqlIntegerRange(SqlInteger{Value: left.Value / right.Value, Valid: true}, min, max)
}

func sqlIntegerMod(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if right.Value == 0 {
		return SqlInteger{Error: "22012"}
	}
	if right.Value == -1 {
		return SqlInteger{Value: 0, Valid: true}
	}
	return sqlIntegerRange(SqlInteger{Value: left.Value % right.Value, Valid: true}, min, max)
}

func sqlIntegerMagnitude(value int64) uint64 {
	if value < 0 {
		return uint64(-(value + 1)) + 1
	}
	return uint64(value)
}

func sqlIntegerGcdMagnitude(a, b uint64) uint64 {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

func sqlIntegerGcd(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	value := sqlIntegerGcdMagnitude(sqlIntegerMagnitude(left.Value), sqlIntegerMagnitude(right.Value))
	if value > uint64(max) {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: int64(value), Valid: true}
}

func sqlIntegerLcm(left, right SqlInteger, min, max int64) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	if left.Value == 0 || right.Value == 0 {
		return SqlInteger{Value: 0, Valid: true}
	}
	a, b := sqlIntegerMagnitude(left.Value), sqlIntegerMagnitude(right.Value)
	factor := a / sqlIntegerGcdMagnitude(a, b)
	if factor > uint64(max)/b {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: int64(factor * b), Valid: true}
}

func int2Input(value string) SqlInteger {
	return sqlIntegerInput(value, 16)
}

func int2Add(left, right SqlInteger) SqlInteger {
	return sqlIntegerAdd(left, right, -32768, 32767)
}

func int2Sub(left, right SqlInteger) SqlInteger {
	return sqlIntegerSub(left, right, -32768, 32767)
}

func int2Mul(left, right SqlInteger) SqlInteger {
	return sqlIntegerMul(left, right, -32768, 32767)
}

func int2Neg(value SqlInteger) SqlInteger {
	return sqlIntegerNeg(value, -32768, 32767)
}

func int2Abs(value SqlInteger) SqlInteger {
	return sqlIntegerAbs(value, -32768, 32767)
}

func int2Cast(value SqlInteger) SqlInteger {
	return sqlIntegerRange(value, -32768, 32767)
}

func int4Input(value string) SqlInteger {
	return sqlIntegerInput(value, 32)
}

func int4Add(left, right SqlInteger) SqlInteger {
	return sqlIntegerAdd(left, right, -2147483648, 2147483647)
}

func int4Sub(left, right SqlInteger) SqlInteger {
	return sqlIntegerSub(left, right, -2147483648, 2147483647)
}

func int4Mul(left, right SqlInteger) SqlInteger {
	return sqlIntegerMul(left, right, -2147483648, 2147483647)
}

func int4Neg(value SqlInteger) SqlInteger {
	return sqlIntegerNeg(value, -2147483648, 2147483647)
}

func int4Abs(value SqlInteger) SqlInteger {
	return sqlIntegerAbs(value, -2147483648, 2147483647)
}

func int4Cast(value SqlInteger) SqlInteger {
	return sqlIntegerRange(value, -2147483648, 2147483647)
}

func int8Input(value string) SqlInteger {
	return sqlIntegerInput(value, 64)
}

func int8Add(left, right SqlInteger) SqlInteger {
	return sqlIntegerAdd(left, right, -9223372036854775808, 9223372036854775807)
}

func int8Sub(left, right SqlInteger) SqlInteger {
	return sqlIntegerSub(left, right, -9223372036854775808, 9223372036854775807)
}

func int8Mul(left, right SqlInteger) SqlInteger {
	return sqlIntegerMul(left, right, -9223372036854775808, 9223372036854775807)
}

func int8Neg(value SqlInteger) SqlInteger {
	return sqlIntegerNeg(value, -9223372036854775808, 9223372036854775807)
}

func int8Abs(value SqlInteger) SqlInteger {
	return sqlIntegerAbs(value, -9223372036854775808, 9223372036854775807)
}

func int8Cast(value SqlInteger) SqlInteger {
	return sqlIntegerRange(value, -9223372036854775808, 9223372036854775807)
}

func integerEq(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value == 0)
}

func integerNe(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value != 0)
}

func integerLt(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value < 0)
}

func integerLe(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value <= 0)
}

func integerGt(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value > 0)
}

func integerGe(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value >= 0)
}

func int2Div(left, right SqlInteger) SqlInteger {
	return sqlIntegerDiv(left, right, -32768, 32767)
}

func int2Mod(left, right SqlInteger) SqlInteger {
	return sqlIntegerMod(left, right, -32768, 32767)
}

func int4Div(left, right SqlInteger) SqlInteger {
	return sqlIntegerDiv(left, right, -2147483648, 2147483647)
}

func int4Mod(left, right SqlInteger) SqlInteger {
	return sqlIntegerMod(left, right, -2147483648, 2147483647)
}

func int4Gcd(left, right SqlInteger) SqlInteger {
	return sqlIntegerGcd(left, right, -2147483648, 2147483647)
}

func int4Lcm(left, right SqlInteger) SqlInteger {
	return sqlIntegerLcm(left, right, -2147483648, 2147483647)
}

func int8Div(left, right SqlInteger) SqlInteger {
	return sqlIntegerDiv(left, right, -9223372036854775808, 9223372036854775807)
}

func int8Mod(left, right SqlInteger) SqlInteger {
	return sqlIntegerMod(left, right, -9223372036854775808, 9223372036854775807)
}

func int8Gcd(left, right SqlInteger) SqlInteger {
	return sqlIntegerGcd(left, right, -9223372036854775808, 9223372036854775807)
}

func int8Lcm(left, right SqlInteger) SqlInteger {
	return sqlIntegerLcm(left, right, -9223372036854775808, 9223372036854775807)
}

func int2And(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int16(left.Value & right.Value)), Valid: true}
}

func int2Or(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int16(left.Value | right.Value)), Valid: true}
}

func int2Xor(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int16(left.Value ^ right.Value)), Valid: true}
}

func int2Shl(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int16(left.Value << (uint64(right.Value) & 31))), Valid: true}
}

func int2Shr(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int16(left.Value >> (uint64(right.Value) & 31))), Valid: true}
}

func int2Not(value SqlInteger) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlInteger{Value: int64(int16(^value.Value)), Valid: true}
}

func int2Identity(value SqlInteger) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlInteger{Value: int64(int16(value.Value)), Valid: true}
}

func int4And(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int32(left.Value & right.Value)), Valid: true}
}

func int4Or(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int32(left.Value | right.Value)), Valid: true}
}

func int4Xor(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int32(left.Value ^ right.Value)), Valid: true}
}

func int4Shl(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int32(left.Value << (uint64(right.Value) & 31))), Valid: true}
}

func int4Shr(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int32(left.Value >> (uint64(right.Value) & 31))), Valid: true}
}

func int4Not(value SqlInteger) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlInteger{Value: int64(int32(^value.Value)), Valid: true}
}

func int4Identity(value SqlInteger) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlInteger{Value: int64(int32(value.Value)), Valid: true}
}

func int8And(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int64(left.Value & right.Value)), Valid: true}
}

func int8Or(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int64(left.Value | right.Value)), Valid: true}
}

func int8Xor(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int64(left.Value ^ right.Value)), Valid: true}
}

func int8Shl(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int64(left.Value << (uint64(right.Value) & 63))), Valid: true}
}

func int8Shr(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(int64(left.Value >> (uint64(right.Value) & 63))), Valid: true}
}

func int8Not(value SqlInteger) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlInteger{Value: int64(int64(^value.Value)), Valid: true}
}

func int8Identity(value SqlInteger) SqlInteger {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlInteger{Value: int64(int64(value.Value)), Valid: true}
}
