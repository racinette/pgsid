package pgsidpgx

import (
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"reflect"
	"strconv"
	"strings"
)

// ArrayDimensionError reports an array whose number of dimensions its declaration does not allow,
// naming the setting that declares them.
type ArrayDimensionError struct {
	Query     string
	Column    string
	Setting   string
	Allowed   []int
	Actual    int
	Parameter bool
}

func (e *ArrayDimensionError) Error() string {
	allowed := make([]string, len(e.Allowed))
	for index, count := range e.Allowed {
		allowed[index] = strconv.Itoa(count)
	}
	source := "the server returned"
	if e.Parameter {
		source = "the parameter holds"
	}
	return fmt.Sprintf("%s.%s: %s an array of %d dimensions where %s allows %s", e.Query, e.Column, source, e.Actual, e.Setting, strings.Join(allowed, " or "))
}

type arrayDeclaration struct {
	allowed                []int
	setting, query, column string
	nullable               bool
}

func (d arrayDeclaration) check(depth int, parameter bool) error {
	for _, count := range d.allowed {
		if depth == count {
			return nil
		}
	}
	return &ArrayDimensionError{Query: d.query, Column: d.column, Setting: d.setting, Allowed: append([]int(nil), d.allowed...), Actual: depth, Parameter: parameter}
}

// The arrays of each declared count, by their number of dimensions.
func memberTypes(members []any) map[int]reflect.Type {
	types := make(map[int]reflect.Type, len(members))
	for _, member := range members {
		memberType := reflect.TypeOf(member)
		depth := 0
		for leaf := memberType; leaf.Kind() == reflect.Slice; leaf = leaf.Elem() {
			depth++
		}
		types[depth] = memberType
	}
	return types
}

// ValidateArrayInput checks that an array parameter is rectangular and has a declared number of
// dimensions. An empty array of any declared count is sent as the empty array, not as NULL.
func ValidateArrayInput[T any](value any, allowed []int, setting, query, column string, nullable bool) (any, error) {
	declaration := arrayDeclaration{allowed: allowed, setting: setting, query: query, column: column, nullable: nullable}
	array := reflect.ValueOf(value)
	for array.IsValid() && (array.Kind() == reflect.Pointer || array.Kind() == reflect.Interface) {
		if array.IsNil() {
			array = reflect.Value{}
			break
		}
		array = array.Elem()
	}
	if !array.IsValid() {
		if nullable {
			return nil, nil
		}
		return nil, fmt.Errorf("%s.%s: SQL NULL array is not allowed", query, column)
	}
	element := reflect.TypeFor[T]()
	depth := 0
	for leaf := array.Type(); leaf != element; leaf = leaf.Elem() {
		if leaf.Kind() != reflect.Slice {
			return nil, fmt.Errorf("%s.%s: invalid array input %T", query, column, value)
		}
		depth++
	}
	if array.Len() == 0 {
		return reflect.MakeSlice(array.Type(), 0, 0).Interface(), nil
	}
	if err := declaration.check(depth, true); err != nil {
		return nil, err
	}
	var rectangular func(reflect.Value, int) error
	rectangular = func(level reflect.Value, remaining int) error {
		if remaining == 1 {
			return nil
		}
		length := -1
		for index := 0; index < level.Len(); index++ {
			item := level.Index(index)
			if item.Len() == 0 || (length >= 0 && item.Len() != length) {
				return fmt.Errorf("%s.%s: array dimensions must have equal, positive lengths", query, column)
			}
			length = item.Len()
			if err := rectangular(item, remaining-1); err != nil {
				return err
			}
		}
		return nil
	}
	if err := rectangular(array, depth); err != nil {
		return nil, err
	}
	return array.Interface(), nil
}

type arrayDimensionTarget[T any] struct {
	target  any
	members map[int]reflect.Type
	flat    []T
	arrayDeclaration
}

// ArrayTarget scans an array into target, a nested slice of the one declared count, or the
// interface that several declared counts share, given the array of each count as members.
func ArrayTarget[T any](target any, members []any, allowed []int, setting, query, column string, nullable bool) pgtype.ArraySetter {
	return &arrayDimensionTarget[T]{target: target, members: memberTypes(members), arrayDeclaration: arrayDeclaration{allowed: allowed, setting: setting, query: query, column: column, nullable: nullable}}
}

func (s *arrayDimensionTarget[T]) SetDimensions(dimensions []pgtype.ArrayDimension) error {
	if dimensions == nil && !s.nullable {
		return fmt.Errorf("%s.%s: SQL NULL array is not allowed", s.query, s.column)
	}
	// An empty array has no dimensions to constrain.
	if len(dimensions) > 0 {
		if err := s.check(len(dimensions), false); err != nil {
			return err
		}
	}
	target := s.target
	if nullable, ok := target.(interface {
		SQLTarget() any
		SetSQLValid(bool)
	}); ok {
		nullable.SetSQLValid(dimensions != nil)
		target = nullable.SQLTarget()
	}
	field := reflect.ValueOf(target)
	if field.Kind() != reflect.Pointer || field.IsNil() {
		return fmt.Errorf("%s.%s: invalid array target %T", s.query, s.column, target)
	}
	field = field.Elem()
	if dimensions == nil {
		field.SetZero()
		s.flat = nil
		return nil
	}
	arrayType := field.Type()
	if field.Kind() == reflect.Interface {
		depth := len(dimensions)
		if depth == 0 {
			depth = s.allowed[0]
		}
		var ok bool
		if arrayType, ok = s.members[depth]; !ok {
			return fmt.Errorf("%s.%s: no array type of %d dimensions", s.query, s.column, depth)
		}
	}
	if len(dimensions) == 0 {
		field.Set(reflect.MakeSlice(arrayType, 0, 0))
		s.flat = make([]T, 0)
		return nil
	}
	leaf := arrayType
	for range dimensions {
		if leaf.Kind() != reflect.Slice {
			return fmt.Errorf("%s.%s: target does not match array dimensions", s.query, s.column)
		}
		leaf = leaf.Elem()
	}
	if leaf != reflect.TypeFor[T]() {
		return fmt.Errorf("%s.%s: target does not match array element type", s.query, s.column)
	}
	count := 1
	for _, dimension := range dimensions {
		count *= int(dimension.Length)
	}
	s.flat = make([]T, count)
	flat := reflect.ValueOf(s.flat)
	var reshape func(reflect.Type, int, int) reflect.Value
	reshape = func(sliceType reflect.Type, depth, offset int) reflect.Value {
		length := int(dimensions[depth].Length)
		if depth == len(dimensions)-1 {
			return flat.Slice3(offset, offset+length, offset+length).Convert(sliceType)
		}
		stride := 1
		for _, dimension := range dimensions[depth+1:] {
			stride *= int(dimension.Length)
		}
		result := reflect.MakeSlice(sliceType, length, length)
		for index := 0; index < length; index++ {
			result.Index(index).Set(reshape(sliceType.Elem(), depth+1, offset+index*stride))
		}
		return result
	}
	field.Set(reshape(arrayType, 0, 0))
	return nil
}

func (s *arrayDimensionTarget[T]) ScanIndex(index int) any { return &s.flat[index] }
func (s *arrayDimensionTarget[T]) ScanIndexType() any     { return new(T) }
