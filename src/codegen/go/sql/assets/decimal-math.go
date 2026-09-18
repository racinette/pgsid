/*
PostgreSQL Database Management System
(also known as Postgres, formerly known as Postgres95)

Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group

Portions Copyright (c) 1994, The Regents of the University of California

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose, without fee, and without a written agreement
is hereby granted, provided that the above copyright notice and this
paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
*/

package pgsidsql

import (
	"github.com/shopspring/decimal"
	"math"
	"math/big"
	"strconv"
	"strings"
)

type SqlDecimalMath struct {
	Value decimal.Decimal
	Scale int32
	Error string
}

func sqlDecimalMathRound(value decimal.Decimal, scale int32) SqlDecimalMath {
	return SqlDecimalMath{Value: value.Round(scale), Scale: scale}
}

func sqlDecimalMathDigits(value decimal.Decimal) ([]int64, int) {
	if value.IsZero() {
		return nil, 0
	}
	text := strings.TrimPrefix(value.Coefficient().String(), "-")
	adjusted := len(text) + int(value.Exponent()) - 1
	weight := adjusted / 4
	if adjusted < 0 && adjusted%4 != 0 {
		weight--
	}
	length := adjusted - weight*4 + 1
	if len(text) < length {
		text += strings.Repeat("0", length-len(text))
	}
	text = strings.Repeat("0", 4-length) + text
	if len(text)%4 != 0 {
		text += strings.Repeat("0", 4-len(text)%4)
	}
	digits := make([]int64, len(text)/4)
	for i := range digits {
		digits[i], _ = strconv.ParseInt(text[i*4:i*4+4], 10, 64)
	}
	for len(digits) > 0 && digits[len(digits)-1] == 0 {
		digits = digits[:len(digits)-1]
	}
	return digits, weight
}

func sqlDecimalMathWeight(value decimal.Decimal) int {
	_, weight := sqlDecimalMathDigits(value)
	return weight
}

func sqlDecimalMathFromPairs(pairs []*big.Int, weight int, negative bool) decimal.Decimal {
	var text strings.Builder
	for _, pair := range pairs {
		p := pair.String()
		text.WriteString(strings.Repeat("0", 8-len(p)))
		text.WriteString(p)
	}
	coefficient := new(big.Int)
	coefficient.SetString(text.String(), 10)
	if negative {
		coefficient.Neg(coefficient)
	}
	return decimal.NewFromBigInt(coefficient, int32(4*(weight+1-2*len(pairs))))
}

func sqlDecimalMathAdd(a, b SqlDecimalMath, subtract bool) SqlDecimalMath {
	if a.Error != "" {
		return a
	}
	if b.Error != "" {
		return b
	}
	value := a.Value.Add(b.Value)
	if subtract {
		value = a.Value.Sub(b.Value)
	}
	scale := a.Scale
	if b.Scale > scale {
		scale = b.Scale
	}
	return SqlDecimalMath{Value: value, Scale: scale}
}

func sqlDecimalMathMul(a, b SqlDecimalMath, scale int32) SqlDecimalMath {
	if a.Error != "" {
		return a
	}
	if b.Error != "" {
		return b
	}
	x, wx := sqlDecimalMathDigits(a.Value)
	y, wy := sqlDecimalMathDigits(b.Value)
	if len(x) > len(y) {
		x, y = y, x
		wx, wy = wy, wx
	}
	if len(x) == 0 {
		return SqlDecimalMath{Scale: scale}
	}
	nx, ny := len(x), len(y)
	px, py := (nx+1)/2, (ny+1)/2
	full := (nx+ny)/2 + 1
	offset := full - px - py + 1
	weight := wx + wy + 1 + 2*full - nx - ny - nx%2 - ny%2
	maxdigits := weight + 1 + (int(scale)+3)/4 + 2
	count := min(full, maxdigits/2+1)
	if count >= full || (nx <= 6 && scale == a.Scale+b.Scale) {
		return sqlDecimalMathRound(a.Value.Mul(b.Value), scale)
	}
	if count <= offset {
		return SqlDecimalMath{Scale: scale}
	}
	if count-offset >= 64 {
		exact := a.Value.Mul(b.Value).Abs()
		bound := decimal.New(int64(min(px, py))*99999999, int32(4*(weight+1-2*count)))
		lower := exact.Sub(bound)
		if lower.Sign() < 0 {
			lower = decimal.Zero
		}
		high, low := sqlDecimalMathRound(exact, scale), sqlDecimalMathRound(lower, scale)
		// Omitted convolution terms lie within this interval; equal rounded endpoints certify the result.
		if high.Value.Equal(low.Value) {
			if a.Value.Sign() != b.Value.Sign() {
				high.Value = high.Value.Neg()
			}
			return high
		}
	}
	pairs := make([]*big.Int, count)
	for i := range pairs {
		pairs[i] = new(big.Int)
	}
	if count-offset >= 64 {
		// Each field holds a convolution coefficient without carrying into its neighbor.
		pack := func(digits []int64, length int) *big.Int {
			var text strings.Builder
			for i := 0; i < length; i++ {
				p := digits[2*i] * 10000
				if 2*i+1 < len(digits) {
					p += digits[2*i+1]
				}
				chunk := strconv.FormatInt(p, 16)
				text.WriteString(strings.Repeat("0", 18-len(chunk)))
				text.WriteString(chunk)
			}
			value := new(big.Int)
			value.SetString(text.String(), 16)
			return value
		}
		lx, ly := min(px, count-offset), min(py, count-offset)
		product := new(big.Int).Mul(pack(x, lx), pack(y, ly)).Text(16)
		product = strings.Repeat("0", (lx+ly-1)*18-len(product)) + product
		for i := 0; i < min(count-offset, lx+ly-1); i++ {
			pairs[i+offset].SetString(product[i*18:(i+1)*18], 16)
		}
	} else {
		for i := 0; i < min(px, count-offset); i++ {
			p := x[2*i] * 10000
			if 2*i+1 < nx {
				p += x[2*i+1]
			}
			for j := 0; j < min(py, count-i-offset); j++ {
				q := y[2*j] * 10000
				if 2*j+1 < ny {
					q += y[2*j+1]
				}
				product := new(big.Int).Mul(big.NewInt(p), big.NewInt(q))
				pairs[i+j+offset].Add(pairs[i+j+offset], product)
			}
		}
	}
	carry, base := new(big.Int), big.NewInt(100000000)
	for i := count - 1; i >= 0; i-- {
		value := new(big.Int).Add(pairs[i], carry)
		carry.QuoRem(value, base, pairs[i])
	}
	return sqlDecimalMathRound(sqlDecimalMathFromPairs(pairs, weight, a.Value.Sign() != b.Value.Sign()), scale)
}

func sqlDecimalMathDiv(a, b SqlDecimalMath, scale int32, exact bool) SqlDecimalMath {
	if a.Error != "" {
		return a
	}
	if b.Error != "" {
		return b
	}
	if b.Value.IsZero() {
		return SqlDecimalMath{Error: "22012"}
	}
	if a.Value.IsZero() {
		return SqlDecimalMath{Scale: scale}
	}
	x, wx := sqlDecimalMathDigits(a.Value)
	y, wy := sqlDecimalMathDigits(b.Value)
	if exact || len(y) <= 12 {
		return SqlDecimalMath{Value: a.Value.DivRound(b.Value, scale), Scale: scale}
	}
	weight := wx - wy + 1
	ndigits := max(weight+1+(int(scale)+3)/4, 1) + 4
	count := (ndigits + 1) / 2
	divisorCount := min((len(y)+1)/2, count)
	dividend := make([]int64, count+1)
	divisor := make([]int64, divisorCount)
	for i := range divisor {
		divisor[i] = y[2*i] * 10000
		if 2*i+1 < len(y) {
			divisor[i] += y[2*i+1]
		}
	}
	for i := 0; i < min((len(x)+1)/2, count); i++ {
		dividend[i] = x[2*i] * 10000
		if 2*i+1 < len(x) {
			dividend[i] += x[2*i+1]
		}
	}
	fdivisor := float64(float64(divisor[0]) * 100000000)
	if divisorCount > 1 {
		fdivisor += float64(divisor[1])
	}
	inverse := 1 / fdivisor
	digit := func(q int) int64 {
		f := (float64(float64(dividend[q])*100000000) + float64(dividend[q+1])) * inverse
		d := int64(f)
		if f < 0 {
			d--
		}
		return d
	}
	floor := func(v int64) int64 {
		if v < 0 {
			return -((-v - 1) / 100000000) - 1
		}
		return v / 100000000
	}
	maxdiv := int64(1)
	for q := 0; q < count; q++ {
		d := digit(q)
		if d != 0 {
			abs := d
			if abs < 0 {
				abs = -abs
			}
			maxdiv += abs
			if maxdiv > 92233720368 {
				carry := int64(0)
				for i := min(q+divisorCount-2, count-1); i > q; i-- {
					v := dividend[i] + carry
					carry = floor(v)
					dividend[i] = v - carry*100000000
				}
				dividend[q] += carry
				d = digit(q)
				abs = d
				if abs < 0 {
					abs = -abs
				}
				maxdiv = 1 + abs
			}
			for i := 0; i < min(divisorCount, count-q); i++ {
				dividend[q+i] -= d * divisor[i]
			}
		}
		dividend[q+1] += dividend[q] * 100000000
		dividend[q] = d
	}
	carry := int64(0)
	pairs := make([]*big.Int, count)
	for i := count - 1; i >= 0; i-- {
		v := dividend[i] + carry
		carry = floor(v)
		pairs[i] = big.NewInt(v - carry*100000000)
	}
	return sqlDecimalMathRound(sqlDecimalMathFromPairs(pairs, weight, a.Value.Sign() != b.Value.Sign()), scale)
}

func sqlDecimalMathSqrt(a SqlDecimalMath, scale int32) SqlDecimalMath {
	if a.Error != "" {
		return a
	}
	if a.Value.Sign() < 0 {
		return SqlDecimalMath{Error: "2201F"}
	}
	if a.Value.IsZero() {
		return SqlDecimalMath{Scale: scale}
	}
	coefficient := a.Value.Coefficient()
	exponent := int64(a.Value.Exponent()) + 2*int64(scale)
	numerator, denominator := new(big.Int).Set(coefficient), big.NewInt(1)
	if exponent >= 0 {
		numerator.Mul(numerator, new(big.Int).Exp(big.NewInt(10), big.NewInt(exponent), nil))
	} else {
		denominator.Exp(big.NewInt(10), big.NewInt(-exponent), nil)
	}
	q := new(big.Int).Sqrt(new(big.Int).Quo(numerator, denominator))
	midpoint := new(big.Int).Add(new(big.Int).Lsh(new(big.Int).Set(q), 1), big.NewInt(1))
	midpoint.Mul(midpoint, midpoint)
	midpoint.Mul(midpoint, denominator)
	if new(big.Int).Lsh(new(big.Int).Set(numerator), 2).Cmp(midpoint) >= 0 {
		q.Add(q, big.NewInt(1))
	}
	return SqlDecimalMath{Value: decimal.NewFromBigInt(q, -scale), Scale: scale}
}

func sqlDecimalMathFloat(value decimal.Decimal) float64 {
	result, _ := strconv.ParseFloat(value.String(), 64)
	return result
}

func sqlDecimalMathExp(a SqlDecimalMath, scale int32) SqlDecimalMath {
	if a.Error != "" {
		return a
	}
	val := sqlDecimalMathFloat(a.Value)
	x := a
	ndiv := 0
	if math.Abs(val) >= 6000 {
		if val > 0 {
			return SqlDecimalMath{Error: "22003"}
		}
		return SqlDecimalMath{Scale: scale}
	}
	dweight := int(val * 0.434294481903252)
	for math.Abs(val) > 0.01 {
		ndiv++
		val /= 2
	}
	if ndiv > 0 {
		x = sqlDecimalMathDiv(x, SqlDecimalMath{Value: decimal.NewFromInt(1 << ndiv)}, x.Scale+int32(ndiv), true)
	}
	sig := max(1+dweight+int(scale)+int(float64(ndiv)*0.301029995663981), 0) + 8
	local := int32(sig - 1)
	result := sqlDecimalMathAdd(SqlDecimalMath{Value: decimal.NewFromInt(1)}, x, false)
	term := sqlDecimalMathDiv(sqlDecimalMathMul(x, x, local), SqlDecimalMath{Value: decimal.NewFromInt(2)}, local, true)
	ni := int64(2)
	for term.Error == "" && !term.Value.IsZero() {
		result = sqlDecimalMathAdd(result, term, false)
		ni++
		term = sqlDecimalMathDiv(sqlDecimalMathMul(term, x, local), SqlDecimalMath{Value: decimal.NewFromInt(ni)}, local, true)
	}
	if term.Error != "" {
		return term
	}
	for ndiv > 0 {
		ndiv--
		result = sqlDecimalMathMul(result, result, int32(max(0, sig-sqlDecimalMathWeight(result.Value)*8)))
	}
	if result.Error != "" {
		return result
	}
	return sqlDecimalMathRound(result.Value, scale)
}

func sqlDecimalMathLnWeight(value decimal.Decimal) int {
	if value.Sign() <= 0 {
		return 0
	}
	if value.GreaterThanOrEqual(decimal.New(9, -1)) && value.LessThanOrEqual(decimal.New(11, -1)) {
		digits, weight := sqlDecimalMathDigits(value.Sub(decimal.NewFromInt(1)))
		if len(digits) == 0 {
			return 0
		}
		return weight*4 + int(math.Log10(float64(digits[0])))
	}
	digits, weight := sqlDecimalMathDigits(value)
	d, w := digits[0], weight*4
	if len(digits) > 1 {
		d = d*10000 + digits[1]
		w -= 4
	}
	return int(math.Log10(math.Abs(math.Log(float64(d)) + float64(float64(w)*2.302585092994046))))
}

func sqlDecimalMathLn(a SqlDecimalMath, scale int32) SqlDecimalMath {
	if a.Error != "" {
		return a
	}
	if a.Value.Sign() <= 0 {
		return SqlDecimalMath{Error: "2201E"}
	}
	x := a
	factor := int64(2)
	nsqrt := 0
	for x.Value.LessThanOrEqual(decimal.New(9, -1)) || x.Value.GreaterThanOrEqual(decimal.New(11, -1)) {
		x = sqlDecimalMathSqrt(x, scale-int32(sqlDecimalMathWeight(x.Value)*4/2)+8)
		if x.Error != "" {
			return x
		}
		factor *= 2
		nsqrt++
	}
	local := scale + int32(float64(nsqrt+1)*0.301029995663981) + 8
	one := SqlDecimalMath{Value: decimal.NewFromInt(1)}
	result := sqlDecimalMathDiv(sqlDecimalMathAdd(x, one, true), sqlDecimalMathAdd(x, one, false), local, false)
	xx := result
	x = sqlDecimalMathMul(result, result, local)
	ni := int64(1)
	for {
		ni += 2
		xx = sqlDecimalMathMul(xx, x, local)
		term := sqlDecimalMathDiv(xx, SqlDecimalMath{Value: decimal.NewFromInt(ni)}, local, true)
		if term.Error != "" {
			return term
		}
		if term.Value.IsZero() {
			break
		}
		result = sqlDecimalMathAdd(result, term, false)
		if sqlDecimalMathWeight(term.Value) < sqlDecimalMathWeight(result.Value)-int(local)*2/4 {
			break
		}
	}
	return sqlDecimalMathMul(result, SqlDecimalMath{Value: decimal.NewFromInt(factor)}, scale)
}

func sqlDecimalMathScale(estimate float64, scales ...int32) int32 {
	scale := 16 - int(estimate)
	for _, s := range scales {
		scale = max(scale, int(s))
	}
	return int32(min(1000, max(0, scale)))
}

func sqlDecimalMathPowerInt(a SqlDecimalMath, exponent int64, exponentScale int32) SqlDecimalMath {
	digits, weight := sqlDecimalMathDigits(a.Value)
	f := float64(0)
	if len(digits) > 0 {
		f = float64(digits[0])
		p := weight * 4
		for i := 1; i < len(digits) && i < 4; i++ {
			f = f*10000 + float64(digits[i])
			p -= 4
		}
		f = float64(exponent) * (math.Log10(f) + float64(p))
	}
	if f > 131072 {
		return SqlDecimalMath{Error: "22003"}
	}
	if f+1 < -1000 {
		return SqlDecimalMath{Scale: 1000}
	}
	scale := sqlDecimalMathScale(f, a.Scale, exponentScale)
	one := SqlDecimalMath{Value: decimal.NewFromInt(1)}
	switch exponent {
	case 0:
		return SqlDecimalMath{Value: one.Value, Scale: scale}
	case 1:
		return sqlDecimalMathRound(a.Value, scale)
	case -1:
		return sqlDecimalMathDiv(one, a, scale, true)
	case 2:
		return sqlDecimalMathMul(a, a, scale)
	}
	if len(digits) == 0 {
		return SqlDecimalMath{Scale: scale}
	}
	sig := 1 + int(scale) + int(f) + int(math.Log(math.Abs(float64(exponent)))) + 8
	mask := exponent
	if mask < 0 {
		mask = -mask
	}
	base := a
	result := one
	if mask%2 != 0 {
		result = a
	}
	for mask >>= 1; mask > 0; mask >>= 1 {
		local := int32(max(0, min(sig-sqlDecimalMathWeight(base.Value)*8, 2*int(base.Scale))))
		base = sqlDecimalMathMul(base, base, local)
		if mask%2 != 0 {
			local = int32(max(0, min(sig-(sqlDecimalMathWeight(base.Value)+sqlDecimalMathWeight(result.Value))*4, int(base.Scale+result.Scale))))
			result = sqlDecimalMathMul(base, result, local)
		}
		if sqlDecimalMathWeight(base.Value) > 32767 || sqlDecimalMathWeight(result.Value) > 32767 {
			if exponent > 0 {
				return SqlDecimalMath{Error: "22003"}
			}
			return SqlDecimalMath{Scale: scale}
		}
	}
	if exponent < 0 {
		return sqlDecimalMathDiv(one, result, scale, false)
	}
	return sqlDecimalMathRound(result.Value, scale)
}

func sqlDecimalMathPower(a, b SqlDecimalMath) SqlDecimalMath {
	if b.Value.Equal(b.Value.Truncate(0)) && b.Value.GreaterThanOrEqual(decimal.NewFromInt(-2147483648)) && b.Value.LessThanOrEqual(decimal.NewFromInt(2147483647)) {
		return sqlDecimalMathPowerInt(a, b.Value.IntPart(), b.Scale)
	}
	if a.Value.IsZero() {
		return SqlDecimalMath{Scale: 16}
	}
	negative := a.Value.Sign() < 0
	if negative && !b.Value.Equal(b.Value.Truncate(0)) {
		return SqlDecimalMath{Error: "2201F"}
	}
	base := SqlDecimalMath{Value: a.Value.Abs(), Scale: a.Scale}
	lw := sqlDecimalMathLnWeight(base.Value)
	local := int32(max(0, 8-lw))
	product := sqlDecimalMathMul(sqlDecimalMathLn(base, local), b, local)
	if product.Error != "" {
		return product
	}
	val := sqlDecimalMathFloat(product.Value)
	if math.Abs(val) > 2000*3.01 {
		if val > 0 {
			return SqlDecimalMath{Error: "22003"}
		}
		return SqlDecimalMath{Scale: 1000}
	}
	val *= 0.434294481903252
	scale := sqlDecimalMathScale(val, a.Scale, b.Scale)
	sig := max(0, int(scale)+int(val))
	local = int32(max(0, sig-lw+8))
	product = sqlDecimalMathMul(sqlDecimalMathLn(base, local), b, local)
	result := sqlDecimalMathExp(product, scale)
	if negative && !b.Value.Mod(decimal.NewFromInt(2)).IsZero() {
		result.Value = result.Value.Neg()
	}
	return result
}

func sqlDecimalMathUnary(a SqlDecimal, operation string) SqlDecimal {
	if a.Error != "" || !a.Valid {
		return a
	}
	if a.Special != "" {
		if a.Special == "-Infinity" {
			if operation == "exp" {
				return sqlDecimalResult(decimal.Zero, 0)
			}
			code := "2201E"
			if operation == "sqrt" {
				code = "2201F"
			}
			return SqlDecimal{Error: code}
		}
		return a
	}
	input := SqlDecimalMath{Value: a.Value, Scale: a.Scale}
	var result SqlDecimalMath
	switch operation {
	case "sqrt":
		result = sqlDecimalMathSqrt(input, sqlDecimalMathScale(float64(sqlDecimalMathWeight(a.Value)*2+1), a.Scale))
	case "exp":
		val := math.Max(-2000, math.Min(2000, sqlDecimalMathFloat(a.Value)*0.434294481903252))
		result = sqlDecimalMathExp(input, sqlDecimalMathScale(val, a.Scale))
	default:
		result = sqlDecimalMathLn(input, sqlDecimalMathScale(float64(sqlDecimalMathLnWeight(a.Value)), a.Scale))
	}
	if result.Error != "" {
		return SqlDecimal{Error: result.Error}
	}
	return sqlDecimalResult(result.Value, max(0, result.Scale))
}

func decimalPower(a, b SqlDecimal) SqlDecimal {
	if a.Error != "" {
		return a
	}
	if b.Error != "" {
		return b
	}
	if !a.Valid || !b.Valid {
		return SqlDecimal{}
	}
	if a.Special == "NaN" || b.Special == "NaN" {
		if (a.Special == "NaN" && b.Special == "" && b.Value.IsZero()) || (b.Special == "NaN" && a.Special == "" && a.Value.Equal(decimal.NewFromInt(1))) {
			return sqlDecimalResult(decimal.NewFromInt(1), 0)
		}
		return SqlDecimal{Special: "NaN", Valid: true}
	}
	sx, sy := sqlDecimalSign(a), sqlDecimalSign(b)
	integral := b.Special != "" || b.Value.Equal(b.Value.Truncate(0))
	if sx == 0 && sy < 0 || sx < 0 && !integral {
		return SqlDecimal{Error: "2201F"}
	}
	if a.Special != "" || b.Special != "" {
		if (a.Special == "" && a.Value.Equal(decimal.NewFromInt(1))) || sy == 0 {
			return sqlDecimalResult(decimal.NewFromInt(1), 0)
		}
		if sx == 0 {
			return sqlDecimalResult(decimal.Zero, 0)
		}
		if b.Special != "" {
			if a.Special == "" && a.Value.Equal(decimal.NewFromInt(-1)) {
				return sqlDecimalResult(decimal.NewFromInt(1), 0)
			}
			greater := a.Special != "" || a.Value.Abs().GreaterThan(decimal.NewFromInt(1))
			if greater == (sy > 0) {
				return SqlDecimal{Special: "Infinity", Valid: true}
			}
			return sqlDecimalResult(decimal.Zero, 0)
		}
		if sy < 0 {
			return sqlDecimalResult(decimal.Zero, 0)
		}
		special := "Infinity"
		if sx < 0 && !b.Value.Mod(decimal.NewFromInt(2)).IsZero() {
			special = "-Infinity"
		}
		return SqlDecimal{Special: special, Valid: true}
	}
	result := sqlDecimalMathPower(SqlDecimalMath{Value: a.Value, Scale: a.Scale}, SqlDecimalMath{Value: b.Value, Scale: b.Scale})
	if result.Error != "" {
		return SqlDecimal{Error: result.Error}
	}
	return sqlDecimalResult(result.Value, result.Scale)
}

func decimalLog(base, a SqlDecimal) SqlDecimal {
	if base.Error != "" {
		return base
	}
	if a.Error != "" {
		return a
	}
	if !base.Valid || !a.Valid {
		return SqlDecimal{}
	}
	if base.Special == "NaN" || a.Special == "NaN" {
		return SqlDecimal{Special: "NaN", Valid: true}
	}
	if base.Special != "" || a.Special != "" {
		if sqlDecimalSign(base) <= 0 || sqlDecimalSign(a) <= 0 {
			return SqlDecimal{Error: "2201E"}
		}
		if base.Special != "" {
			if a.Special != "" {
				return SqlDecimal{Special: "NaN", Valid: true}
			}
			return sqlDecimalResult(decimal.Zero, 0)
		}
		return SqlDecimal{Special: "Infinity", Valid: true}
	}
	bw, aw := sqlDecimalMathLnWeight(base.Value), sqlDecimalMathLnWeight(a.Value)
	dw := aw - bw
	scale := sqlDecimalMathScale(float64(dw), base.Scale, a.Scale)
	denominator := sqlDecimalMathLn(SqlDecimalMath{Value: base.Value, Scale: base.Scale}, max(0, scale+int32(dw-bw)+8))
	numerator := sqlDecimalMathLn(SqlDecimalMath{Value: a.Value, Scale: a.Scale}, max(0, scale+int32(dw-aw)+8))
	result := sqlDecimalMathDiv(numerator, denominator, scale, false)
	if result.Error != "" {
		return SqlDecimal{Error: result.Error}
	}
	return sqlDecimalResult(result.Value, result.Scale)
}

func decimalSqrt(a SqlDecimal) SqlDecimal { return sqlDecimalMathUnary(a, "sqrt") }
func decimalExp(a SqlDecimal) SqlDecimal  { return sqlDecimalMathUnary(a, "exp") }
func decimalLn(a SqlDecimal) SqlDecimal   { return sqlDecimalMathUnary(a, "ln") }
func decimalLog10(a SqlDecimal) SqlDecimal {
	return decimalLog(sqlDecimalResult(decimal.NewFromInt(10), 0), a)
}
