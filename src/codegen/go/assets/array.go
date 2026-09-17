package pgsidpgx

import (
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"reflect"
)

type ArrayDimensionError struct {
	Query   string
	Column  string
	Allowed []int
	Actual  int
}

func (e *ArrayDimensionError) Error() string {
	return fmt.Sprintf("%s.%s: expected array dimensions %v, received %d", e.Query, e.Column, e.Allowed, e.Actual)
}

func checkArrayDimensions(dimensions []pgtype.ArrayDimension, allowed []int, query, column string, nullable bool) error {
	if dimensions == nil {
		if nullable {
			return nil
		}
		return fmt.Errorf("%s.%s: SQL NULL array is not allowed", query, column)
	}
	// Empty arrays have no dimensions to constrain.
	if len(dimensions) == 0 {
		return nil
	}
	for _, depth := range allowed {
		if len(dimensions) == depth {
			return nil
		}
	}
	return &ArrayDimensionError{Query: query, Column: column, Allowed: append([]int(nil), allowed...), Actual: len(dimensions)}
}

func ValidateArrayInput[T any](value any, allowed []int, query, column string, nullable bool) (any, error) {
	var array pgtype.Array[T]
	switch v := value.(type) {
	case nil:
		return nil, checkArrayDimensions(nil, allowed, query, column, nullable)
	case pgtype.Array[T]:
		array = v
	case *pgtype.Array[T]:
		if v == nil {
			return nil, checkArrayDimensions(nil, allowed, query, column, nullable)
		}
		array = *v
	default:
		return nil, fmt.Errorf("%s.%s: invalid array input %T", query, column, value)
	}
	dimensions := array.Dimensions()
	if err := checkArrayDimensions(dimensions, allowed, query, column, nullable); err != nil {
		return nil, err
	}
	if dimensions == nil {
		return nil, nil
	}
	count := int64(0)
	if len(dimensions) > 0 {
		count = 1
	}
	for _, dimension := range dimensions {
		if dimension.Length <= 0 {
			return nil, fmt.Errorf("%s.%s: array dimensions must have positive lengths", query, column)
		}
		if count > int64(len(array.Elements))/int64(dimension.Length) {
			return nil, fmt.Errorf("%s.%s: array dimensions do not match element count", query, column)
		}
		count *= int64(dimension.Length)
	}
	if count != int64(len(array.Elements)) {
		return nil, fmt.Errorf("%s.%s: array dimensions do not match element count", query, column)
	}
	return value, nil
}

type arrayDimensionTarget[T any] struct {
	target        any
	array         *pgtype.Array[T]
	flat          []T
	allowed       []int
	query, column string
	nullable      bool
}

func ArrayTarget[T any](target any, allowed []int, query, column string, nullable bool) pgtype.ArraySetter {
	return &arrayDimensionTarget[T]{target: target, allowed: allowed, query: query, column: column, nullable: nullable}
}

func (s *arrayDimensionTarget[T]) SetDimensions(dimensions []pgtype.ArrayDimension) error {
	if err := checkArrayDimensions(dimensions, s.allowed, s.query, s.column, s.nullable); err != nil {
		return err
	}
	target := s.target
	if nullable, ok := target.(interface {
		SQLTarget() any
		SetSQLValid(bool)
	}); ok {
		nullable.SetSQLValid(dimensions != nil)
		target = nullable.SQLTarget()
	}
	if pointer, ok := target.(**pgtype.Array[T]); ok {
		if dimensions == nil {
			*pointer = nil
			return nil
		}
		*pointer = new(pgtype.Array[T])
		target = *pointer
	}
	if pointer, ok := target.(*pgtype.Array[T]); ok {
		s.array = pointer
		return s.array.SetDimensions(dimensions)
	}
	slice := reflect.ValueOf(target)
	if slice.Kind() != reflect.Pointer || slice.IsNil() {
		return fmt.Errorf("%s.%s: invalid array target %T", s.query, s.column, target)
	}
	slice = slice.Elem()
	if slice.Kind() == reflect.Slice {
		if dimensions == nil {
			slice.SetZero()
			s.flat = nil
			return nil
		}
		if len(dimensions) == 0 {
			slice.Set(reflect.MakeSlice(slice.Type(), 0, 0))
			s.flat = make([]T, 0)
			return nil
		}
		leaf := slice.Type()
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
		slice.Set(reshape(slice.Type(), 0, 0))
		return nil
	}
	return fmt.Errorf("%s.%s: invalid array target %T", s.query, s.column, target)
}

func (s *arrayDimensionTarget[T]) ScanIndex(index int) any {
	if s.array != nil {
		return s.array.ScanIndex(index)
	}
	return &s.flat[index]
}
func (s *arrayDimensionTarget[T]) ScanIndexType() any { return new(T) }
