package pg_catalog

import (
	langruntime "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx/checkrust/langruntime"
	checkruntime "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx/checkrust/checkruntime"
)

func Int48lt65ji(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			wideLeft := int64(langruntime.CheckedI32(leftValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: wideLeft < rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int84ltZ0bo(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			wideRight := int64(langruntime.CheckedI32(rightValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue < wideRight}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int8ltCryd(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue < rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int48le532p(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			wideLeft := int64(langruntime.CheckedI32(leftValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: wideLeft <= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int84le0gdr(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			wideRight := int64(langruntime.CheckedI32(rightValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue <= wideRight}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int8le9fr4(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue <= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int48neInar(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			wideLeft := int64(langruntime.CheckedI32(leftValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: wideLeft != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int84ne6b8h(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			wideRight := int64(langruntime.CheckedI32(rightValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != wideRight}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int8neUr2k(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int48eq7ot5(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			wideLeft := int64(langruntime.CheckedI32(leftValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: wideLeft == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int84eqBnoq(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			wideRight := int64(langruntime.CheckedI32(rightValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == wideRight}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int8eqJdhd(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int48gtSrgr(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			wideLeft := int64(langruntime.CheckedI32(leftValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: wideLeft > rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int84gtP7f5(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			wideRight := int64(langruntime.CheckedI32(rightValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue > wideRight}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int8gt3ehj(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue > rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int48geD53z(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			wideLeft := int64(langruntime.CheckedI32(leftValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: wideLeft >= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int84geBiti(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			wideRight := int64(langruntime.CheckedI32(rightValue))
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue >= wideRight}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int8geQfhv(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue >= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BooleqY6qu(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	left = checkruntime.CopyBoolValue(left)
	right = checkruntime.CopyBoolValue(right)
	if left.Kind == checkruntime.BoolValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.BoolValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.BoolValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BoolneZlce(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	left = checkruntime.CopyBoolValue(left)
	right = checkruntime.CopyBoolValue(right)
	if left.Kind == checkruntime.BoolValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.BoolValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.BoolValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BoolltCgkk(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	left = checkruntime.CopyBoolValue(left)
	right = checkruntime.CopyBoolValue(right)
	if left.Kind == checkruntime.BoolValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.BoolValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.BoolValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == false && rightValue == true}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Boolle0cme(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	left = checkruntime.CopyBoolValue(left)
	right = checkruntime.CopyBoolValue(right)
	if left.Kind == checkruntime.BoolValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.BoolValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.BoolValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == false || rightValue == true}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Boolgt6vb2(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	left = checkruntime.CopyBoolValue(left)
	right = checkruntime.CopyBoolValue(right)
	if left.Kind == checkruntime.BoolValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.BoolValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.BoolValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == true && rightValue == false}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BoolgeGviq(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	left = checkruntime.CopyBoolValue(left)
	right = checkruntime.CopyBoolValue(right)
	if left.Kind == checkruntime.BoolValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.BoolValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || right == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.BoolValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == true || rightValue == false}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func EnumEqW63e(left checkruntime.EnumValue, right checkruntime.EnumValue) checkruntime.BoolValue {
	left = checkruntime.CopyEnumValue(left)
	right = checkruntime.CopyEnumValue(right)
	if left.Kind == checkruntime.EnumValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.EnumValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.EnumValue{Kind: checkruntime.EnumValueUnknown}) || right == (checkruntime.EnumValue{Kind: checkruntime.EnumValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.EnumValue{Kind: checkruntime.EnumValueNull}) || right == (checkruntime.EnumValue{Kind: checkruntime.EnumValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.EnumValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.EnumValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func EnumNeTph2(left checkruntime.EnumValue, right checkruntime.EnumValue) checkruntime.BoolValue {
	left = checkruntime.CopyEnumValue(left)
	right = checkruntime.CopyEnumValue(right)
	if left.Kind == checkruntime.EnumValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.EnumValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.EnumValue{Kind: checkruntime.EnumValueUnknown}) || right == (checkruntime.EnumValue{Kind: checkruntime.EnumValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.EnumValue{Kind: checkruntime.EnumValueNull}) || right == (checkruntime.EnumValue{Kind: checkruntime.EnumValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.EnumValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.EnumValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4gt5vlv(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue > rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4eqLrxe(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4ge2xvk(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue >= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4le9wb6(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue <= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4lt9gej(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue < rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4neQhun(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}

const sqlstateNumericValueOutOfRange = 3452547

func Int4plSj3s(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			minValue := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1)
			if rightValue > 0 && leftValue > langruntime.CheckedSignedSubtract(2147483647, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if rightValue < 0 && leftValue < langruntime.CheckedSignedSubtract(minValue, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedAdd(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int4miDtqk(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	left = checkruntime.CopyInt4Value(left)
	right = checkruntime.CopyInt4Value(right)
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			minValue := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1)
			if rightValue < 0 && leftValue > langruntime.CheckedSignedAdd(2147483647, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if rightValue > 0 && leftValue < langruntime.CheckedSignedAdd(minValue, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func textHasPrefix(text string, prefix string) bool {
	text = langruntime.CheckedString(text)
	prefix = langruntime.CheckedString(prefix)
	textChars := []rune(text)
	prefixChars := []rune(prefix)
	if len(prefixChars) > len(textChars) {
		return false
	}
	index := 0
	for index < len(prefixChars) {
		textCode := int(langruntime.CheckedChar(textChars[index]))
		prefixCode := int(langruntime.CheckedChar(prefixChars[index]))
		if textCode != prefixCode {
			return false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return true
}
func textCodepointBefore(left string, right string) bool {
	left = langruntime.CheckedString(left)
	right = langruntime.CheckedString(right)
	leftChars := []rune(left)
	rightChars := []rune(right)
	index := 0
	for index < len(leftChars) && index < len(rightChars) {
		leftCode := int(langruntime.CheckedChar(leftChars[index]))
		rightCode := int(langruntime.CheckedChar(rightChars[index]))
		if leftCode < rightCode {
			return true
		}
		if leftCode > rightCode {
			return false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return len(leftChars) < len(rightChars)
}
func LengthEhpe(value checkruntime.TextValue) checkruntime.Int4Value {
	value = checkruntime.CopyTextValue(value)
	if value.Kind == checkruntime.TextValueError {
		error := value.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if value == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if value == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if value.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(value.Value)
		chars := []rune(text)
		index := 0
		length := 0
		for index < len(chars) {
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
			length = langruntime.CheckedIndex(langruntime.CheckedAdd(length, 1))
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: length}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TexteqAet8(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	left = checkruntime.CopyTextValue(left)
	right = checkruntime.CopyTextValue(right)
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Textne1urq(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	left = checkruntime.CopyTextValue(left)
	right = checkruntime.CopyTextValue(right)
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextLtZinq(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	left = checkruntime.CopyTextValue(left)
	right = checkruntime.CopyTextValue(right)
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: textCodepointBefore(leftValue, rightValue)}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextLeWb3z(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	left = checkruntime.CopyTextValue(left)
	right = checkruntime.CopyTextValue(right)
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: textCodepointBefore(leftValue, rightValue) || leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextGtRb7n(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	left = checkruntime.CopyTextValue(left)
	right = checkruntime.CopyTextValue(right)
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: textCodepointBefore(rightValue, leftValue)}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func StartsWith6ctf(text checkruntime.TextValue, prefix checkruntime.TextValue) checkruntime.BoolValue {
	text = checkruntime.CopyTextValue(text)
	prefix = checkruntime.CopyTextValue(prefix)
	if text.Kind == checkruntime.TextValueError {
		error := text.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if prefix.Kind == checkruntime.TextValueError {
		error := prefix.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if text == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || prefix == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if text == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || prefix == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if text.Kind == checkruntime.TextValueValue {
		textValue := langruntime.CheckedString(text.Value)
		if prefix.Kind == checkruntime.TextValueValue {
			prefixValue := langruntime.CheckedString(prefix.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: textHasPrefix(textValue, prefixValue)}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextGeT8pg(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	left = checkruntime.CopyTextValue(left)
	right = checkruntime.CopyTextValue(right)
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: textCodepointBefore(rightValue, leftValue) || leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
