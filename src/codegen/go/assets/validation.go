package pgsidpgx

import (
	"bytes"
	"encoding/json"
	"fmt"
	"reflect"
	"sync"

	"github.com/dlclark/regexp2"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

type QueryValidationError struct {
	Query  string
	Column string
	Err    error
}

func (e *QueryValidationError) Error() string {
	return fmt.Sprintf("invalid %s.%s: %v", e.Query, e.Column, e.Err)
}
func (e *QueryValidationError) Unwrap() error { return e.Err }

type validationKey struct{ spec, column string }
type compiledValidation struct {
	once   sync.Once
	schema *jsonschema.Schema
	err    error
}

var compiledValidations sync.Map

type ecmaRegexp regexp2.Regexp

func (re *ecmaRegexp) MatchString(value string) bool {
	matched, err := (*regexp2.Regexp)(re).MatchString(value)
	return err == nil && matched
}
func (re *ecmaRegexp) String() string { return (*regexp2.Regexp)(re).String() }
func compileECMA(pattern string) (jsonschema.Regexp, error) {
	re, err := regexp2.Compile(pattern, regexp2.ECMAScript)
	return (*ecmaRegexp)(re), err
}

func compiledJSONSchema(spec, column string) (*jsonschema.Schema, error) {
	entry, _ := compiledValidations.LoadOrStore(validationKey{spec, column}, &compiledValidation{})
	cached := entry.(*compiledValidation)
	cached.once.Do(func() {
		var config struct {
			Resources map[string]json.RawMessage `json:"resources"`
			Columns   map[string]json.RawMessage `json:"columns"`
		}
		if cached.err = json.Unmarshal([]byte(spec), &config); cached.err != nil {
			return
		}
		compiler := jsonschema.NewCompiler()
		compiler.UseLoader(jsonschema.SchemeURLLoader{})
		compiler.UseRegexpEngine(compileECMA)
		for url, data := range config.Resources {
			document, err := jsonschema.UnmarshalJSON(bytes.NewReader(data))
			if err != nil {
				cached.err = err
				return
			}
			if cached.err = compiler.AddResource(url, document); cached.err != nil {
				return
			}
		}
		document, err := jsonschema.UnmarshalJSON(bytes.NewReader(config.Columns[column]))
		if err != nil {
			cached.err = err
			return
		}
		const url = "https://pgsid.invalid/output.json"
		if cached.err = compiler.AddResource(url, document); cached.err != nil {
			return
		}
		cached.schema, cached.err = compiler.Compile(url)
	})
	return cached.schema, cached.err
}

type validatedJSON struct {
	target              any
	spec, query, column string
	nullable            bool
}

func ValidatedJSON(target any, spec, query, column string, nullable bool) any {
	return &validatedJSON{target: target, spec: spec, query: query, column: column, nullable: nullable}
}

func (s *validatedJSON) Scan(value any) error {
	var nullable interface {
		SQLTarget() any
		SetSQLValid(bool)
	}
	target := s.target
	if s.nullable {
		var ok bool
		nullable, ok = target.(interface {
			SQLTarget() any
			SetSQLValid(bool)
		})
		if !ok {
			return fmt.Errorf("invalid nullable JSON destination %T", target)
		}
		target = nullable.SQLTarget()
	}
	destination := reflect.ValueOf(target)
	if destination.Kind() != reflect.Pointer || destination.IsNil() {
		return fmt.Errorf("JSON destination must be a non-nil pointer, got %T", target)
	}
	if value == nil {
		if nullable != nil {
			nullable.SetSQLValid(false)
			return nil
		}
		value := destination.Elem()
		switch value.Kind() {
		case reflect.Pointer, reflect.Slice, reflect.Map, reflect.Interface:
			value.SetZero()
			return nil
		default:
			return fmt.Errorf("cannot scan SQL NULL into %T", target)
		}
	}
	var data []byte
	switch value := value.(type) {
	case []byte:
		data = value
	case string:
		data = []byte(value)
	default:
		return fmt.Errorf("cannot scan JSON from %T", value)
	}
	schema, err := compiledJSONSchema(s.spec, s.column)
	if err == nil {
		var document any
		document, err = jsonschema.UnmarshalJSON(bytes.NewReader(data))
		if err == nil {
			err = schema.Validate(document)
		}
	}
	if err != nil {
		return &QueryValidationError{Query: s.query, Column: s.column, Err: err}
	}
	decoded := reflect.New(destination.Elem().Type())
	if err := json.Unmarshal(data, decoded.Interface()); err != nil {
		return &QueryValidationError{Query: s.query, Column: s.column, Err: err}
	}
	destination.Elem().Set(decoded.Elem())
	if nullable != nil {
		nullable.SetSQLValid(true)
	}
	return nil
}
