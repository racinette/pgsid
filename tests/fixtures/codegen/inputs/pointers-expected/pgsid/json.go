package pgsid

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"github.com/jackc/pgx/v5/pgtype"
)

type JSON[T any] struct {
	text  string
	check *jsonCheck
}
type jsonCheck struct {
	run func(text []byte, decode func() error) error
}

func JSONOf[T any](value T) (JSON[T], error) {
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return JSON[T]{}, err
	}
	return jsonOf[T](strings.TrimSuffix(buffer.String(), "\n")), nil
}
func JSONText[T any](text string) (JSON[T], error) {
	if !json.Valid([]byte(text)) {
		return JSON[T]{}, fmt.Errorf("invalid JSON text %q", text)
	}
	return jsonOf[T](text), nil
}
func (j JSON[T]) Text() string {
	if j.text == "" {
		return "null"
	}
	return j.text
}
func (j JSON[T]) String() string {
	return j.Text()
}
func (j JSON[T]) Value() (T, error) {
	var value T
	text := []byte(j.Text())
	decode := func() error {
		return json.Unmarshal(text, &value)
	}
	var err error
	if j.check == nil {
		err = decode()
	} else {
		err = j.check.run(text, decode)
	}
	return value, err
}
func (j JSON[T]) WithCheck(check func(text []byte, decode func() error) error) JSON[T] {
	j.check = &jsonCheck{run: check}
	return j
}
func (j JSON[T]) MarshalJSON() ([]byte, error) {
	return []byte(j.Text()), nil
}
func (j *JSON[T]) UnmarshalJSON(data []byte) error {
	*j = jsonOf[T](string(data))
	return nil
}
func (j *JSON[T]) ScanBytes(src []byte) error {
	if src == nil {
		return fmt.Errorf("cannot scan NULL into pgsid.JSON")
	}
	*j = jsonOf[T](string(src))
	return nil
}
func (j JSON[T]) TextValue() (pgtype.Text, error) {
	return pgtype.Text{String: j.Text(), Valid: true}, nil
}
func NullableJSON[T any](target **JSON[T]) pgtype.BytesScanner {
	return nullableJSON[T]{target}
}

type nullableJSON[T any] struct{ target **JSON[T] }

func (n nullableJSON[T]) ScanBytes(src []byte) error {
	if src == nil {
		*n.target = nil
		return nil
	}
	document := jsonOf[T](string(src))
	*n.target = &document
	return nil
}
func jsonOf[T any](text string) JSON[T] {
	if text == "null" {
		return JSON[T]{}
	}
	return JSON[T]{text: text}
}
