package pgsid

import (
	"fmt"
	"strings"
	"sync"

	"github.com/jackc/pgx/v5/pgtype"
)

// Bound is one end of a range: a value the range does or does not include, or no end at all. Its
// zero value is unbounded.
type Bound[T any] struct {
	value     T
	present   bool
	inclusive bool
}

func Inclusive[T any](value T) Bound[T] {
	return Bound[T]{value: value, present: true, inclusive: true}
}
func Exclusive[T any](value T) Bound[T] { return Bound[T]{value: value, present: true} }
func Unbounded[T any]() Bound[T]        { return Bound[T]{} }

// Value returns the bound's value, or false for an unbounded end.
func (b Bound[T]) Value() (T, bool) { return b.value, b.present }

// Inclusive reports whether the range includes the bound's value; an unbounded end includes none.
func (b Bound[T]) Inclusive() bool { return b.inclusive }

// Range is a PostgreSQL range: empty, or the values between its two bounds. Its zero value has
// no bounds and holds every value.
type Range[T any] struct {
	lower, upper Bound[T]
	empty        bool
}

func RangeOf[T any](lower, upper Bound[T]) Range[T] { return Range[T]{lower: lower, upper: upper} }
func EmptyRange[T any]() Range[T]                   { return Range[T]{empty: true} }
func (r Range[T]) IsEmpty() bool                    { return r.empty }

// Lower and Upper are unbounded for the empty range.
func (r Range[T]) Lower() Bound[T] { return r.lower }
func (r Range[T]) Upper() Bound[T] { return r.upper }

func (r Range[T]) IsNull() bool { return false }
func (r Range[T]) BoundTypes() (lower, upper pgtype.BoundType) {
	if r.empty {
		return pgtype.Empty, pgtype.Empty
	}
	return boundType(r.lower), boundType(r.upper)
}
func (r Range[T]) Bounds() (lower, upper any) { return r.lower.value, r.upper.value }
func (r *Range[T]) ScanNull() error           { return fmt.Errorf("cannot scan NULL into pgsid.Range") }
func (r *Range[T]) ScanBounds() (lowerTarget, upperTarget any) {
	return &r.lower.value, &r.upper.value
}
func (r *Range[T]) SetBoundTypes(lower, upper pgtype.BoundType) error {
	if lower == pgtype.Empty || upper == pgtype.Empty {
		if lower != upper {
			return fmt.Errorf("a range bound alone cannot be empty")
		}
		*r = EmptyRange[T]()
		return nil
	}
	lowerBound, err := boundOf(r.lower.value, lower)
	if err != nil {
		return err
	}
	upperBound, err := boundOf(r.upper.value, upper)
	if err != nil {
		return err
	}
	*r = RangeOf(lowerBound, upperBound)
	return nil
}

// TextValue writes the range as range input reads it, for the simple protocol, which has no
// parameter type to plan by.
func (r Range[T]) TextValue() (pgtype.Text, error) {
	if r.empty {
		return pgtype.Text{String: "empty", Valid: true}, nil
	}
	var b strings.Builder
	b.WriteByte("(["[boolIndex(r.lower.inclusive)])
	for index, bound := range []Bound[T]{r.lower, r.upper} {
		if index == 1 {
			b.WriteByte(',')
		}
		if bound.present {
			text, err := elementText(bound.value)
			if err != nil {
				return pgtype.Text{}, err
			}
			writeRangeBound(&b, text)
		}
	}
	b.WriteByte(")]"[boolIndex(r.upper.inclusive)])
	return pgtype.Text{String: b.String(), Valid: true}, nil
}

// Multirange is a PostgreSQL multirange: its ranges in order. With no ranges it is the empty
// multirange, never NULL.
type Multirange[T any] []Range[T]

func (m Multirange[T]) IsNull() bool    { return false }
func (m Multirange[T]) Len() int        { return len(m) }
func (m Multirange[T]) Index(i int) any { return m[i] }
func (m Multirange[T]) IndexType() any  { return Range[T]{} }
func (m *Multirange[T]) ScanNull() error {
	return fmt.Errorf("cannot scan NULL into pgsid.Multirange")
}
func (m *Multirange[T]) SetLen(n int) error {
	*m = make(Multirange[T], n)
	return nil
}
func (m *Multirange[T]) ScanIndex(i int) any { return &(*m)[i] }

// pgx plans a scan through a nil pointer, so the type is named without reading the value.
func (m *Multirange[T]) ScanIndexType() any { return new(Range[T]) }
func (m Multirange[T]) TextValue() (pgtype.Text, error) {
	parts := make([]string, len(m))
	for index, item := range m {
		text, err := item.TextValue()
		if err != nil {
			return pgtype.Text{}, err
		}
		parts[index] = text.String
	}
	return pgtype.Text{String: "{" + strings.Join(parts, ",") + "}", Valid: true}, nil
}

func boundType[T any](bound Bound[T]) pgtype.BoundType {
	switch {
	case !bound.present:
		return pgtype.Unbounded
	case bound.inclusive:
		return pgtype.Inclusive
	}
	return pgtype.Exclusive
}
func boundOf[T any](value T, kind pgtype.BoundType) (Bound[T], error) {
	switch kind {
	case pgtype.Inclusive:
		return Inclusive(value), nil
	case pgtype.Exclusive:
		return Exclusive(value), nil
	case pgtype.Unbounded:
		return Unbounded[T](), nil
	}
	return Bound[T]{}, fmt.Errorf("invalid range bound type %q", kind)
}
func boolIndex(value bool) int {
	if value {
		return 1
	}
	return 0
}

var (
	textMapOnce sync.Once
	textMap     *pgtype.Map
)

func elementText(value any) (string, error) {
	if valuer, ok := value.(pgtype.TextValuer); ok {
		text, err := valuer.TextValue()
		return text.String, err
	}
	textMapOnce.Do(func() { textMap = pgtype.NewMap() })
	// An empty buffer tells an empty text apart from NULL, which encodes as nil.
	text, err := textMap.Encode(0, pgtype.TextFormatCode, value, []byte{})
	if err != nil {
		return "", err
	}
	if text == nil {
		return "", fmt.Errorf("a range bound cannot be NULL")
	}
	return string(text), nil
}

// Range input reads an unquoted bound up to the next delimiter and drops nothing inside quotes,
// where a doubled quote or backslash stands for one.
func writeRangeBound(b *strings.Builder, text string) {
	if text != "" && !strings.ContainsAny(text, "\"\\()[],{} \t\n\r\v\f") {
		b.WriteString(text)
		return
	}
	b.WriteByte('"')
	for _, character := range text {
		if character == '"' || character == '\\' {
			b.WriteRune(character)
		}
		b.WriteRune(character)
	}
	b.WriteByte('"')
}
