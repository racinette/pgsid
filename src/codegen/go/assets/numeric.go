package pgsid

import (
	"encoding/json"
	"fmt"
	"math/big"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	checkruntime "pgsid.invalid/numeric/checkruntime"
	pg_catalog "pgsid.invalid/numeric/pg_catalog"
)

// Numeric is a PostgreSQL numeric: exact, keeping its scale, NaN and the infinities, with
// PostgreSQL's own arithmetic and order from the CHECK evaluator. A value is made from text, which
// is read as numeric input reads it, or from an integer, and is read back as its exact text. The
// zero value is 0.
type Numeric struct{ text string }

// NumericError is the error PostgreSQL raises for a numeric operation, such as division by zero.
type NumericError struct{ Code, Message string }

func (e *NumericError) Error() string    { return e.Message + " (SQLSTATE " + e.Code + ")" }
func (e *NumericError) SQLState() string { return e.Code }

// NumericOf reads text as numeric input does, so it accepts what the server accepts and keeps the
// scale written.
func NumericOf(text string) (Numeric, error) {
	return numericResult(pg_catalog.ScalarNumericFromText(checkruntime.MakeTextValue(text)))
}
func NumericFromInt64(value int64) Numeric { return Numeric{text: strconv.FormatInt(value, 10)} }
func NumericFromBigInt(value *big.Int) Numeric {
	if value == nil {
		return Numeric{}
	}
	return Numeric{text: value.String()}
}

// String returns the value as numeric output writes it.
func (n Numeric) String() string {
	if n.text == "" {
		return "0"
	}
	return n.text
}

// Float64 returns the nearest double, losing precision beyond it and the scale.
func (n Numeric) Float64() float64 {
	value, _ := strconv.ParseFloat(n.String(), 64)
	return value
}

func (n Numeric) Add(other Numeric) (Numeric, error) {
	return numericResult(pg_catalog.NumericAddO3d7(n.operand(), other.operand()))
}
func (n Numeric) Sub(other Numeric) (Numeric, error) {
	return numericResult(pg_catalog.NumericSubYs09(n.operand(), other.operand()))
}
func (n Numeric) Mul(other Numeric) (Numeric, error) {
	return numericResult(pg_catalog.NumericMulBj4l(n.operand(), other.operand()))
}
func (n Numeric) Div(other Numeric) (Numeric, error) {
	return numericResult(pg_catalog.NumericDivPnzm(n.operand(), other.operand()))
}
func (n Numeric) Mod(other Numeric) (Numeric, error) {
	return numericResult(pg_catalog.NumericMod8ywz(n.operand(), other.operand()))
}
func (n Numeric) Neg() Numeric { return numericValue(pg_catalog.NumericUminusWcmy(n.operand())) }
func (n Numeric) Abs() Numeric { return numericValue(pg_catalog.NumericAbs6g5e(n.operand())) }

// Round rounds to scale digits after the decimal point, before it where scale is negative.
func (n Numeric) Round(scale int32) (Numeric, error) {
	return numericResult(pg_catalog.RoundOtcq(n.operand(), checkruntime.MakeInt4Value(int(scale))))
}

// Trunc truncates to scale digits after the decimal point, before it where scale is negative.
func (n Numeric) Trunc(scale int32) (Numeric, error) {
	return numericResult(pg_catalog.TruncHay3(n.operand(), checkruntime.MakeInt4Value(int(scale))))
}

// Cmp orders values as PostgreSQL does, NaN equal to itself and after every other value: -1, 0 or 1.
func (n Numeric) Cmp(other Numeric) int {
	result := pg_catalog.NumericCmp6h4s(n.operand(), other.operand())
	if result.Kind != checkruntime.Int4ValueValue {
		panic("pgsid: the numeric comparison has no result")
	}
	switch {
	case result.Value < 0:
		return -1
	case result.Value > 0:
		return 1
	}
	return 0
}

// Equal reports whether the values are equal as numbers, whatever their scales.
func (n Numeric) Equal(other Numeric) bool {
	result := pg_catalog.NumericEqFw7r(n.operand(), other.operand())
	if result.Kind != checkruntime.BoolValueValue {
		panic("pgsid: the numeric comparison has no result")
	}
	return result.Value
}
func (n Numeric) IsNaN() bool { return n.text == "NaN" }
func (n Numeric) IsInf() bool { return n.text == "Infinity" || n.text == "-Infinity" }

// Sign is -1, 0 or 1, or NaN for NaN.
func (n Numeric) Sign() Numeric { return numericValue(pg_catalog.Sign2rsu(n.operand())) }

func (n Numeric) operand() checkruntime.NumericValue {
	return checkruntime.MakeNumericValue(n.String())
}
func numericResult(value checkruntime.NumericValue) (Numeric, error) {
	switch value.Kind {
	case checkruntime.NumericValueValue:
		return Numeric{text: value.Value}, nil
	case checkruntime.NumericValueError:
		code := strings.ToUpper(strconv.FormatInt(int64(value.Error.State), 36))
		for len(code) < 5 {
			code = "0" + code
		}
		return Numeric{}, &NumericError{Code: code, Message: checkruntime.SqlErrorMessage(value.Error).Message}
	}
	return Numeric{}, fmt.Errorf("pgsid: the numeric operation has no result")
}

// An operation that cannot fail.
func numericValue(value checkruntime.NumericValue) Numeric {
	result, err := numericResult(value)
	if err != nil {
		panic(err)
	}
	return result
}

// MarshalJSON writes the exact text as a JSON string; a JSON number would round it.
func (n Numeric) MarshalJSON() ([]byte, error) { return json.Marshal(n.String()) }

// UnmarshalJSON reads a JSON string or number as numeric input.
func (n *Numeric) UnmarshalJSON(data []byte) error {
	text := string(data)
	if unquoted, err := strconv.Unquote(text); err == nil {
		text = unquoted
	}
	value, err := NumericOf(text)
	if err != nil {
		return err
	}
	*n = value
	return nil
}
func (n Numeric) MarshalText() ([]byte, error) { return []byte(n.String()), nil }
func (n *Numeric) UnmarshalText(data []byte) error {
	value, err := NumericOf(string(data))
	if err != nil {
		return err
	}
	*n = value
	return nil
}

// pgx moves the value as its numeric type; the server's numeric output is the text kept.
func (n *Numeric) ScanNumeric(value pgtype.Numeric) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Numeric")
	}
	text, err := value.Value()
	if err != nil {
		return err
	}
	n.text = text.(string)
	return nil
}
func (n Numeric) NumericValue() (pgtype.Numeric, error) {
	var value pgtype.Numeric
	if err := value.Scan(n.String()); err != nil {
		return pgtype.Numeric{}, err
	}
	return value, nil
}

// The simple protocol has no parameter type to plan by, so pgx sends the value as its text.
func (n Numeric) TextValue() (pgtype.Text, error) {
	return pgtype.Text{String: n.String(), Valid: true}, nil
}
