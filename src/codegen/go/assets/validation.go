package pgsidpgx

import (
	"bytes"
	"crypto/sha256"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strings"
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

type compiledValidation struct {
	once   sync.Once
	schema *jsonschema.Schema
	err    error
}

type schemaRegistry struct {
	resources string
	once      sync.Once
	compiler  *jsonschema.Compiler
	err       error
	mutex     sync.Mutex
	compiled  sync.Map
}

func newSchemaRegistry(resources string) *schemaRegistry {
	return &schemaRegistry{resources: resources}
}

var validationSchemas = newSchemaRegistry(schemaResources)

func ValidateJSON(data []byte, contract string) error {
	schema, err := compiledJSONSchema(contract)
	if err != nil {
		return err
	}
	document, err := jsonschema.UnmarshalJSON(bytes.NewReader(data))
	if err != nil {
		return err
	}
	return schema.Validate(document)
}

func ValidateValue(value any, contract string) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return ValidateJSON(data, contract)
}

func ValidateJSONInput(value any, contract, query, column string, nullable bool) (any, error) {
	fail := func(err error) (any, error) {
		return nil, &QueryValidationError{Query: query, Column: column, Err: err}
	}
	if valuer, ok := value.(driver.Valuer); ok {
		encoded, err := valuer.Value()
		if err != nil {
			return fail(err)
		}
		value = encoded
	}
	rv := reflect.ValueOf(value)
	isNull := value == nil || ((rv.Kind() == reflect.Pointer || rv.Kind() == reflect.Interface) && rv.IsNil())
	if isNull && nullable {
		return nil, nil
	}
	var data []byte
	var err error
	if raw, ok := value.([]byte); ok {
		data = raw
	} else {
		data, err = json.Marshal(value)
	}
	if err == nil {
		err = ValidateJSON(data, contract)
	}
	if err != nil {
		return fail(err)
	}
	return json.RawMessage(data), nil
}

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

func compiledJSONSchema(contract string) (*jsonschema.Schema, error) {
	return validationSchemas.compile(contract)
}

func (r *schemaRegistry) compile(contract string) (*jsonschema.Schema, error) {
	entry, _ := r.compiled.LoadOrStore(contract, &compiledValidation{})
	cached := entry.(*compiledValidation)
	cached.once.Do(func() {
		r.once.Do(func() {
			var resources map[string]json.RawMessage
			if r.err = json.Unmarshal([]byte(r.resources), &resources); r.err != nil {
				return
			}
			r.compiler = jsonschema.NewCompiler()
			r.compiler.UseLoader(jsonschema.SchemeURLLoader{})
			r.compiler.UseRegexpEngine(compileECMA)
			urls := make([]string, 0, len(resources))
			for url := range resources {
				urls = append(urls, url)
			}
			sort.Strings(urls)
			for _, url := range urls {
				document, err := jsonschema.UnmarshalJSON(bytes.NewReader(resources[url]))
				if err != nil {
					r.err = err
					return
				}
				if r.err = r.compiler.AddResource(url, document); r.err != nil {
					return
				}
			}
		})
		if r.err != nil {
			cached.err = r.err
			return
		}
		r.mutex.Lock()
		defer r.mutex.Unlock()
		url := contract
		if strings.HasPrefix(contract, "{") || contract == "true" || contract == "false" {
			document, err := jsonschema.UnmarshalJSON(strings.NewReader(contract))
			if err != nil {
				cached.err = err
				return
			}
			url = fmt.Sprintf("pgsid:///validation/%x.json", sha256.Sum256([]byte(contract)))
			if cached.err = r.compiler.AddResource(url, document); cached.err != nil {
				return
			}
		}
		cached.schema, cached.err = r.compiler.Compile(url)
	})
	return cached.schema, cached.err
}

type validatedJSON struct {
	target                  any
	contract, query, column string
	nullable                bool
}

func ValidatedJSON(target any, contract, query, column string, nullable bool) any {
	return &validatedJSON{target: target, contract: contract, query: query, column: column, nullable: nullable}
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
	err := ValidateJSON(data, s.contract)
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
