package pgsid

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
)

// JSON is a json or jsonb value: the document's text, decoded into T only when asked. Its zero
// value is the JSON null document; SQL NULL needs a pointer.
type JSON[T any] struct {
	// The null document is held as no text, so that every way of writing it is the same value.
	text  string
	check *jsonCheck
}

type jsonCheck struct {
	run func(text []byte, decode func() error) error
}

// JSONOf encodes value as encoding/json does, without escaping HTML characters.
func JSONOf[T any](value T) (JSON[T], error) {
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return JSON[T]{}, err
	}
	return jsonOf[T](strings.TrimSuffix(buffer.String(), "\n")), nil
}

// JSONText keeps text as written, which must be one JSON document.
func JSONText[T any](text string) (JSON[T], error) {
	if !json.Valid([]byte(text)) {
		return JSON[T]{}, fmt.Errorf("invalid JSON text %q", text)
	}
	return jsonOf[T](text), nil
}

// Text returns the document as written or as the server sent it.
func (j JSON[T]) Text() string {
	if j.text == "" {
		return "null"
	}
	return j.text
}
func (j JSON[T]) String() string { return j.Text() }

// Value decodes the document into T, through the check the document carries, if any.
func (j JSON[T]) Value() (T, error) {
	var value T
	text := []byte(j.Text())
	decode := func() error { return json.Unmarshal(text, &value) }
	var err error
	if j.check == nil {
		err = decode()
	} else {
		err = j.check.run(text, decode)
	}
	return value, err
}

// WithCheck returns the document with a check that Value runs in place of decoding: it is given
// the text and the decoding, and what it returns is Value's error.
func (j JSON[T]) WithCheck(check func(text []byte, decode func() error) error) JSON[T] {
	j.check = &jsonCheck{run: check}
	return j
}

func (j JSON[T]) MarshalJSON() ([]byte, error) { return []byte(j.Text()), nil }
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

// pgx sends json and jsonb parameters in text, so the document goes as written.
func (j JSON[T]) TextValue() (pgtype.Text, error) {
	return pgtype.Text{String: j.Text(), Valid: true}, nil
}

// NullableJSON is the scan target for a document that may be SQL NULL: NULL leaves the pointer
// nil, and every document, the null document included, is a container.
func NullableJSON[T any](target **JSON[T]) pgtype.BytesScanner { return nullableJSON[T]{target} }

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
