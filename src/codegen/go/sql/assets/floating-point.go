package pgsidsql

import (
	"math"
	"strconv"
)

type SqlFloat struct {
	Value float64
	Valid bool
	Error string
}

func sqlFloatInput(bits string, single bool) SqlFloat {
	width := 64
	if single {
		width = 32
	}
	raw, err := strconv.ParseUint(bits, 16, width)
	if err != nil {
		return SqlFloat{Error: "22003"}
	}
	value := math.Float64frombits(raw)
	if single {
		value = float64(math.Float32frombits(uint32(raw)))
	}
	return SqlFloat{Value: value, Valid: true}
}

func sqlFloatRound(value float64, single bool) float64 {
	if single {
		return float64(float32(value))
	}
	return value
}

func sqlFloatAdd(left, right SqlFloat, single bool) SqlFloat {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlFloat{}
	}
	result := sqlFloatRound(left.Value+right.Value, single)
	if math.IsInf(result, 0) && !math.IsInf(left.Value, 0) && !math.IsInf(right.Value, 0) {
		return SqlFloat{Error: "22003"}
	}
	return SqlFloat{Value: result, Valid: true}
}

func sqlFloatSub(left, right SqlFloat, single bool) SqlFloat {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlFloat{}
	}
	result := sqlFloatRound(left.Value-right.Value, single)
	if math.IsInf(result, 0) && !math.IsInf(left.Value, 0) && !math.IsInf(right.Value, 0) {
		return SqlFloat{Error: "22003"}
	}
	return SqlFloat{Value: result, Valid: true}
}

func sqlFloatMul(left, right SqlFloat, single bool) SqlFloat {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlFloat{}
	}
	result := sqlFloatRound(left.Value*right.Value, single)
	if math.IsInf(result, 0) && !math.IsInf(left.Value, 0) && !math.IsInf(right.Value, 0) || result == 0 && left.Value != 0 && right.Value != 0 {
		return SqlFloat{Error: "22003"}
	}
	return SqlFloat{Value: result, Valid: true}
}

func sqlFloatDiv(left, right SqlFloat, single bool) SqlFloat {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlFloat{}
	}
	if right.Value == 0 && !math.IsNaN(left.Value) {
		return SqlFloat{Error: "22012"}
	}
	result := sqlFloatRound(left.Value/right.Value, single)
	if math.IsInf(result, 0) && !math.IsInf(left.Value, 0) || result == 0 && left.Value != 0 && !math.IsInf(right.Value, 0) {
		return SqlFloat{Error: "22003"}
	}
	return SqlFloat{Value: result, Valid: true}
}

func sqlFloatNeg(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlFloat{Value: -value.Value, Valid: true}
}

func sqlFloatAbs(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}
	return SqlFloat{Value: math.Abs(value.Value), Valid: true}
}

func sqlFloatIdentity(value SqlFloat) SqlFloat { return value }

func sqlFloatCompare(left, right SqlFloat) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	var order int64
	if math.IsNaN(left.Value) {
		if !math.IsNaN(right.Value) {
			order = 1
		}
	} else if math.IsNaN(right.Value) || left.Value < right.Value {
		order = -1
	} else if left.Value > right.Value {
		order = 1
	}
	return SqlInteger{Value: order, Valid: true}
}

func float4FromFloat8(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}
	result := float64(float32(value.Value))
	if math.IsInf(result, 0) && !math.IsInf(value.Value, 0) || result == 0 && value.Value != 0 {
		return SqlFloat{Error: "22003"}
	}
	return SqlFloat{Value: result, Valid: true}
}

func float8FromFloat4(value SqlFloat) SqlFloat { return value }

func float4FromInteger(value SqlInteger) SqlFloat {
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	return SqlFloat{Value: float64(float32(value.Value)), Valid: value.Valid}
}

func float8FromInteger(value SqlInteger) SqlFloat {
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	return SqlFloat{Value: float64(value.Value), Valid: value.Valid}
}

func sqlFloatToInteger(value SqlFloat, min int64) SqlInteger {
	if value.Error != "" {
		return SqlInteger{Error: value.Error}
	}
	if !value.Valid {
		return SqlInteger{}
	}
	rounded := math.RoundToEven(value.Value)
	if math.IsNaN(rounded) || rounded < float64(min) || rounded >= -float64(min) {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: int64(rounded), Valid: true}
}

func float4Input(bits string) SqlFloat { return sqlFloatInput(bits, true) }

func float4Add(left, right SqlFloat) SqlFloat { return sqlFloatAdd(left, right, true) }

func float4Sub(left, right SqlFloat) SqlFloat { return sqlFloatSub(left, right, true) }

func float4Mul(left, right SqlFloat) SqlFloat { return sqlFloatMul(left, right, true) }

func float4Div(left, right SqlFloat) SqlFloat { return sqlFloatDiv(left, right, true) }

func float4Neg(value SqlFloat) SqlFloat { return sqlFloatNeg(value) }

func float4Abs(value SqlFloat) SqlFloat { return sqlFloatAbs(value) }

func float4Identity(value SqlFloat) SqlFloat { return sqlFloatIdentity(value) }

func float8Input(bits string) SqlFloat { return sqlFloatInput(bits, false) }

func float8Add(left, right SqlFloat) SqlFloat { return sqlFloatAdd(left, right, false) }

func float8Sub(left, right SqlFloat) SqlFloat { return sqlFloatSub(left, right, false) }

func float8Mul(left, right SqlFloat) SqlFloat { return sqlFloatMul(left, right, false) }

func float8Div(left, right SqlFloat) SqlFloat { return sqlFloatDiv(left, right, false) }

func float8Neg(value SqlFloat) SqlFloat { return sqlFloatNeg(value) }

func float8Abs(value SqlFloat) SqlFloat { return sqlFloatAbs(value) }

func float8Identity(value SqlFloat) SqlFloat { return sqlFloatIdentity(value) }

func floatEq(left, right SqlFloat) SqlBoolean {
	order := sqlFloatCompare(left, right)
	return sqlComparisonResult(order, order.Value == 0)
}

func floatNe(left, right SqlFloat) SqlBoolean {
	order := sqlFloatCompare(left, right)
	return sqlComparisonResult(order, order.Value != 0)
}

func floatLt(left, right SqlFloat) SqlBoolean {
	order := sqlFloatCompare(left, right)
	return sqlComparisonResult(order, order.Value < 0)
}

func floatLe(left, right SqlFloat) SqlBoolean {
	order := sqlFloatCompare(left, right)
	return sqlComparisonResult(order, order.Value <= 0)
}

func floatGt(left, right SqlFloat) SqlBoolean {
	order := sqlFloatCompare(left, right)
	return sqlComparisonResult(order, order.Value > 0)
}

func floatGe(left, right SqlFloat) SqlBoolean {
	order := sqlFloatCompare(left, right)
	return sqlComparisonResult(order, order.Value >= 0)
}

func int2FromFloat(value SqlFloat) SqlInteger { return sqlFloatToInteger(value, -32768) }

func int4FromFloat(value SqlFloat) SqlInteger { return sqlFloatToInteger(value, -2147483648) }

func int8FromFloat(value SqlFloat) SqlInteger { return sqlFloatToInteger(value, -9223372036854775808) }

func float8Ceil(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}

	return SqlFloat{Value: math.Ceil(value.Value), Valid: true}
}

func float8Floor(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}

	return SqlFloat{Value: math.Floor(value.Value), Valid: true}
}

func float8Round(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}

	return SqlFloat{Value: math.RoundToEven(value.Value), Valid: true}
}

func float8Trunc(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}

	return SqlFloat{Value: math.Trunc(value.Value), Valid: true}
}

func float8Sqrt(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}
	if value.Value < 0 {
		return SqlFloat{Error: "2201F"}
	}
	return SqlFloat{Value: math.Sqrt(value.Value), Valid: true}
}

func float8Cbrt(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}

	return SqlFloat{Value: sqlFloatCbrt(value.Value), Valid: true}
}

func sqlFloatCbrt(value float64) float64 {
	const _ = "Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.\nDeveloped at SunPro, a Sun Microsystems, Inc. business.\nPermission to use, copy, modify, and distribute this software is freely granted, provided that this notice is preserved.\nOptimized by Bruce D. Evans."
	raw := math.Float64bits(value)
	high := uint32(raw>>32) & 0x7fffffff
	if high >= 0x7ff00000 {
		return value + value
	}
	bias := uint32(715094163)
	if high < 0x00100000 {
		high = uint32(math.Float64bits(value*0x1p54)>>32) & 0x7fffffff
		if high == 0 {
			return value
		}
		bias = 696219795
	}
	high = high/3 + bias
	t := math.Float64frombits((raw & (uint64(1) << 63)) | (uint64(high) << 32))
	r := float64(t*t) * float64(t/value)
	p0 := 1.87595182427177009643
	p1 := -1.88497979543377169875
	p2 := 1.621429720105354466140
	p3 := -0.758397934778766047437
	p4 := 0.145996192886612446982
	a := float64(p0 + float64(r*float64(p1+float64(r*p2))))
	b := float64(float64(float64(r*r)*r) * float64(p3+float64(r*p4)))
	t = float64(t * float64(a+b))
	t = math.Float64frombits((math.Float64bits(t) + 0x80000000) & 0xffffffffc0000000)
	s := t * t
	r = value / s
	w := t + t
	r = (r - t) / (w + r)
	return t + float64(t*r)
}

func float8Sign(value SqlFloat) SqlFloat {
	if value.Error != "" || !value.Valid {
		return value
	}
	result := 0.0
	if value.Value > 0 {
		result = 1
	} else if value.Value < 0 {
		result = -1
	}
	return SqlFloat{Value: result, Valid: true}
}
