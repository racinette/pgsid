package pgsid

import (
	"bytes"
	"encoding/json"
	"fmt"
)

type Null[T any] struct {
	V     T
	Valid bool
}
type Undefined[T any] struct {
	V   T
	Set bool
}
type NullOrUndefined[T any] struct {
	V     T
	Set   bool
	Valid bool
}

func (n Null[T]) MarshalJSON() ([]byte, error) {
	if !n.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(n.V)
}
func (n *Null[T]) UnmarshalJSON(data []byte) error {
	var value T
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		*n = Null[T]{}
		return nil
	}
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	*n = Null[T]{V: value, Valid: true}
	return nil
}
func (n Null[T]) SQLValue() any {
	if !n.Valid {
		return nil
	}
	return n.V
}
func (n Null[T]) SQLUnderlying() any { return n.V }
func (n Null[T]) SQLValid() bool     { return n.Valid }
func (n *Null[T]) SQLTarget() any    { return &n.V }
func (n *Null[T]) SetSQLValid(valid bool) {
	n.Valid = valid
	if !valid {
		var zero T
		n.V = zero
	}
}

func (n Undefined[T]) IsZero() bool { return !n.Set }
func (n Undefined[T]) MarshalJSON() ([]byte, error) {
	if !n.Set {
		return nil, fmt.Errorf("cannot marshal an undefined value outside an object property")
	}
	data, err := json.Marshal(n.V)
	if err != nil {
		return nil, err
	}
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		return nil, fmt.Errorf("null is not allowed for this property")
	}
	return data, nil
}
func (n *Undefined[T]) UnmarshalJSON(data []byte) error {
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		return fmt.Errorf("null is not allowed for this property")
	}
	var value T
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	*n = Undefined[T]{V: value, Set: true}
	return nil
}

func (n NullOrUndefined[T]) IsZero() bool { return !n.Set }
func (n NullOrUndefined[T]) MarshalJSON() ([]byte, error) {
	if !n.Set {
		return nil, fmt.Errorf("cannot marshal an undefined value outside an object property")
	}
	if !n.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(n.V)
}
func (n *NullOrUndefined[T]) UnmarshalJSON(data []byte) error {
	var value T
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		*n = NullOrUndefined[T]{Set: true}
		return nil
	}
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	*n = NullOrUndefined[T]{V: value, Set: true, Valid: true}
	return nil
}
