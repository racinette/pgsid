package pg_catalog

import (
	langruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/langruntime"
	checkruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/checkruntime"
)

func addressAndWord(left int, right int) int {
	left = langruntime.CheckedI32(left)
	right = langruntime.CheckedI32(right)
	a := left
	b := right
	place := 1
	result := 0
	for place < 65536 {
		if langruntime.CheckedSignedRemainder(a, 2) == 1 && langruntime.CheckedSignedRemainder(b, 2) == 1 {
			result = langruntime.CheckedI32(langruntime.CheckedSignedAdd(result, place))
		}
		a = langruntime.CheckedI32(langruntime.CheckedSignedDivide(a, 2))
		b = langruntime.CheckedI32(langruntime.CheckedSignedDivide(b, 2))
		place = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(place, 2))
	}
	return result
}
func Int48lt65ji(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.BoolValue {
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
func Int8pl1v1h(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			if rightValue > int64(0) && leftValue > langruntime.CheckedI64Subtract(int64(9223372036854775807), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if rightValue < int64(0) && leftValue < langruntime.CheckedI64Subtract(int64(-9223372036854775808), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Add(leftValue, rightValue)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int8miJasl(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			if rightValue < int64(0) && leftValue > langruntime.CheckedI64Add(int64(9223372036854775807), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if rightValue > int64(0) && leftValue < langruntime.CheckedI64Add(int64(-9223372036854775808), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(leftValue, rightValue)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int8umCthl(input checkruntime.Int8Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.Int8ValueValue {
		payload := input.Value
		if payload == int64(-9223372036854775808) {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(int64(0), payload)}
	}
	return input
}
func Int8up9qey(input checkruntime.Int8Value) checkruntime.Int8Value {
	return input
}
func Int8absCmj6(input checkruntime.Int8Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.Int8ValueValue {
		payload := input.Value
		if payload < int64(0) {
			return Int8umCthl(input)
		}
	}
	return input
}
func Abs36t4(input checkruntime.Int8Value) checkruntime.Int8Value {
	return Int8absCmj6(input)
}
func Int28plBh5j(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(left)
	return Int8pl1v1h(widened, right)
}
func Int82plE0uq(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(right)
	return Int8pl1v1h(left, widened)
}
func Int28miUjbh(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(left)
	return Int8miJasl(widened, right)
}
func Int82miUovj(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(right)
	return Int8miJasl(left, widened)
}
func Int48plY1r4(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Mzac(left)
	return Int8pl1v1h(widened, right)
}
func Int84pl2n77(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.Int8Value {
	widened := Int8Mzac(right)
	return Int8pl1v1h(left, widened)
}
func Int48miNeop(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Mzac(left)
	return Int8miJasl(widened, right)
}
func Int84mi867a(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.Int8Value {
	widened := Int8Mzac(right)
	return Int8miJasl(left, widened)
}
func Int8mul6t1m(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			if leftValue > int64(0) && rightValue > int64(0) && leftValue > langruntime.CheckedI64Divide(int64(9223372036854775807), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if leftValue > int64(0) && rightValue < int64(0) && rightValue < langruntime.CheckedI64Divide(int64(-9223372036854775808), leftValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if leftValue < int64(0) && rightValue > int64(0) && leftValue < langruntime.CheckedI64Divide(int64(-9223372036854775808), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if leftValue < int64(0) && rightValue < int64(0) && leftValue < langruntime.CheckedI64Divide(int64(9223372036854775807), rightValue) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Multiply(leftValue, rightValue)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int8div8s66(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			if rightValue == int64(0) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if leftValue == int64(-9223372036854775808) && rightValue == int64(-1) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Divide(leftValue, rightValue)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int8mod2t8f(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			if rightValue == int64(0) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if rightValue == int64(-1) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(0)}
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Remainder(leftValue, rightValue)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int28mulLmrp(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(left)
	return Int8mul6t1m(widened, right)
}
func Int28divYfcw(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(left)
	return Int8div8s66(widened, right)
}
func Int82mul60eu(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(right)
	return Int8mul6t1m(left, widened)
}
func Int82divBfmp(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.Int8Value {
	widened := checkruntime.Int2ToInt8(right)
	return Int8div8s66(left, widened)
}
func Int48mulKykj(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Mzac(left)
	return Int8mul6t1m(widened, right)
}
func Int48divXx1r(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Mzac(left)
	return Int8div8s66(widened, right)
}
func Int84mul636w(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.Int8Value {
	widened := Int8Mzac(right)
	return Int8mul6t1m(left, widened)
}
func Int84divW65p(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.Int8Value {
	widened := Int8Mzac(right)
	return Int8div8s66(left, widened)
}
func ByteaeqZ0yh(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.ByteaValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.ByteaValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.ByteaValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.ByteaValueValue {
			b := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: a == b}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func ByteaneVolo(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.ByteaValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.ByteaValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.ByteaValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.ByteaValueValue {
			b := langruntime.CheckedString(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: a != b}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BooleqY6qu(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
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
func bpcharCodepointCompare(left string, right string) int {
	left = langruntime.CheckedString(left)
	right = langruntime.CheckedString(right)
	leftChars := []rune(left)
	rightChars := []rune(right)
	leftLength := len(leftChars)
	rightLength := len(rightChars)
	for leftLength > 0 {
		if leftChars[langruntime.CheckedSubtract(leftLength, 1)] != ' ' {
			break
		}
		leftLength = langruntime.CheckedIndex(langruntime.CheckedSubtract(leftLength, 1))
	}
	for rightLength > 0 {
		if rightChars[langruntime.CheckedSubtract(rightLength, 1)] != ' ' {
			break
		}
		rightLength = langruntime.CheckedIndex(langruntime.CheckedSubtract(rightLength, 1))
	}
	index := 0
	for index < leftLength && index < rightLength {
		leftCode := int(langruntime.CheckedChar(leftChars[index]))
		rightCode := int(langruntime.CheckedChar(rightChars[index]))
		if leftCode < rightCode {
			return langruntime.CheckedSignedNegate(1)
		}
		if leftCode > rightCode {
			return 1
		}
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
	}
	if leftLength < rightLength {
		return langruntime.CheckedSignedNegate(1)
	}
	if leftLength > rightLength {
		return 1
	}
	return 0
}
func BpchareqNpys(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
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
			comparison := bpcharCodepointCompare(leftValue, rightValue)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: comparison == 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpchargeO6oj(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
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
			comparison := bpcharCodepointCompare(leftValue, rightValue)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: comparison >= 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpchargtKxc4(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
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
			comparison := bpcharCodepointCompare(leftValue, rightValue)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: comparison > 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Bpcharle0rch(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
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
			comparison := bpcharCodepointCompare(leftValue, rightValue)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: comparison <= 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpcharltQrb5(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
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
			comparison := bpcharCodepointCompare(leftValue, rightValue)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: comparison < 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpcharneQkuu(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
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
			comparison := bpcharCodepointCompare(leftValue, rightValue)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: comparison != 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MakeDateZ9pv(year checkruntime.Int4Value, month checkruntime.Int4Value, day checkruntime.Int4Value) checkruntime.DateValue {
	if year.Kind == checkruntime.Int4ValueError {
		error := year.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if month.Kind == checkruntime.Int4ValueError {
		error := month.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if day.Kind == checkruntime.Int4ValueError {
		error := day.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if year == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || month == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || day == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if year == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || month == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || day == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if year.Kind == checkruntime.Int4ValueValue {
		yearValue := langruntime.CheckedI32(year.Value)
		if month.Kind == checkruntime.Int4ValueValue {
			monthValue := langruntime.CheckedI32(month.Value)
			if day.Kind == checkruntime.Int4ValueValue {
				dayValue := langruntime.CheckedI32(day.Value)
				return checkruntime.DateFromYmd(yearValue, monthValue, dayValue)
			}
		}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func DateEqD4us(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateNeNpdb(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateLt843e(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue < rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateLe5cqw(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue <= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateGt5025(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue > rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateGe8wil(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue >= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func EnumEqW63e(left checkruntime.EnumValue, right checkruntime.EnumValue) checkruntime.BoolValue {
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

const sqlstateDivisionByZero = 3452582

func Int4mul284v(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
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
			if leftValue > 0 && rightValue > 0 && leftValue > langruntime.CheckedSignedDivide(2147483647, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if leftValue > 0 && rightValue < 0 && rightValue < langruntime.CheckedSignedDivide(minValue, leftValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if leftValue < 0 && rightValue > 0 && leftValue < langruntime.CheckedSignedDivide(minValue, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			if leftValue < 0 && rightValue < 0 && leftValue < langruntime.CheckedSignedDivide(2147483647, rightValue) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedMultiply(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int4div8ogr(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
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
			if rightValue == 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if leftValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) && rightValue == langruntime.CheckedSignedNegate(1) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedDivide(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int4modJ4pe(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
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
			if rightValue == 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if rightValue == langruntime.CheckedSignedNegate(1) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedRemainder(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Abs5ajw(input checkruntime.Int4Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		if value < 0 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(0, value)}
		}
	}
	return input
}
func Int41z1k(input checkruntime.Int2Value) checkruntime.Int4Value {
	return checkruntime.Int2ToInt4(input)
}
func Int8Sxtp(input checkruntime.Int2Value) checkruntime.Int8Value {
	return checkruntime.Int2ToInt8(input)
}
func Int215a3(input checkruntime.Int4Value) checkruntime.Int2Value {
	return smallintResult(input)
}
func Int8Mzac(input checkruntime.Int4Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		payload := langruntime.CheckedI32(input.Value)
		widened := int64(langruntime.CheckedI32(payload))
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: widened}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int45ywh(input checkruntime.Int8Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		payload := input.Value
		if payload < int64(-2147483648) || payload > int64(2147483647) {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		narrowed := int(int32(payload))
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: narrowed}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int2Gmpv(input checkruntime.Int8Value) checkruntime.Int2Value {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		payload := input.Value
		if payload < int64(-32768) || payload > int64(32767) {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		narrowed := int(int32(payload))
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: narrowed}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}

const macConversionOutOfRange = 3452547

func macaddrCompare(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.MacaddrValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.MacaddrValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) || right == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) || right == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.MacaddrValueValue {
		a := left.Value
		if right.Kind == checkruntime.MacaddrValueValue {
			b := right.Value
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: checkruntime.MacAddressCompare(a, b)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func MacaddrEqUthl(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.BoolValue {
	result := macaddrCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MacaddrNeEtmb(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.BoolValue {
	result := macaddrCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MacaddrLt8vk5(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.BoolValue {
	result := macaddrCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MacaddrLe6qq0(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.BoolValue {
	result := macaddrCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MacaddrGt4kss(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.BoolValue {
	result := macaddrCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MacaddrGeIuvk(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.BoolValue {
	result := macaddrCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func MacaddrCmpJv7y(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.Int4Value {
	return macaddrCompare(left, right)
}
func macaddr8Compare(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.Int4Value {
	if left.Kind == checkruntime.Macaddr8ValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.Macaddr8ValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) || right == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) || right == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.Macaddr8ValueValue {
		a := left.Value
		if right.Kind == checkruntime.Macaddr8ValueValue {
			b := right.Value
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: checkruntime.MacAddressCompare(a, b)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Macaddr8EqWy3p(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.BoolValue {
	result := macaddr8Compare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Macaddr8NeJ20a(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.BoolValue {
	result := macaddr8Compare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Macaddr8Lt5tsr(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.BoolValue {
	result := macaddr8Compare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Macaddr8LeDmol(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.BoolValue {
	result := macaddr8Compare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Macaddr8GtO95h(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.BoolValue {
	result := macaddr8Compare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Macaddr8Ge054u(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.BoolValue {
	result := macaddr8Compare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Macaddr8CmpId7f(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.Int4Value {
	return macaddr8Compare(left, right)
}
func MacaddrNot4gjk(input checkruntime.MacaddrValue) checkruntime.MacaddrValue {
	if input.Kind == checkruntime.MacaddrValueValue {
		a := input.Value
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueValue, Value: checkruntime.MacAddress{Word0: langruntime.CheckedSignedSubtract(65535, a.Word0), Word1: langruntime.CheckedSignedSubtract(65535, a.Word1), Word2: langruntime.CheckedSignedSubtract(65535, a.Word2), Word3: 0}}
	}
	return input
}
func TruncBgg8(input checkruntime.MacaddrValue) checkruntime.MacaddrValue {
	if input.Kind == checkruntime.MacaddrValueValue {
		a := input.Value
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueValue, Value: checkruntime.MacAddress{Word0: a.Word0, Word1: langruntime.CheckedSignedMultiply(langruntime.CheckedSignedDivide(a.Word1, 256), 256), Word2: 0, Word3: 0}}
	}
	return input
}
func macaddrBitwise(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue, union bool) checkruntime.MacaddrValue {
	if left.Kind == checkruntime.MacaddrValueError {
		error := left.Error
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueError, Error: error}
	}
	if right.Kind == checkruntime.MacaddrValueError {
		error := right.Error
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueError, Error: error}
	}
	if left == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) || right == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) {
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}
	}
	if left == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) || right == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) {
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}
	}
	if left.Kind == checkruntime.MacaddrValueValue {
		a := left.Value
		if right.Kind == checkruntime.MacaddrValueValue {
			b := right.Value
			word0 := addressAndWord(a.Word0, b.Word0)
			if union {
				word0 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word0, b.Word0), word0))
			}
			word1 := addressAndWord(a.Word1, b.Word1)
			if union {
				word1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word1, b.Word1), word1))
			}
			word2 := addressAndWord(a.Word2, b.Word2)
			if union {
				word2 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word2, b.Word2), word2))
			}
			word3 := addressAndWord(a.Word3, b.Word3)
			if union {
				word3 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word3, b.Word3), word3))
			}
			return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueValue, Value: checkruntime.MacAddress{Word0: word0, Word1: word1, Word2: word2, Word3: word3}}
		}
	}
	return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}
}
func MacaddrAndKy45(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.MacaddrValue {
	return macaddrBitwise(left, right, false)
}
func MacaddrOrWqx0(left checkruntime.MacaddrValue, right checkruntime.MacaddrValue) checkruntime.MacaddrValue {
	return macaddrBitwise(left, right, true)
}
func Macaddr8NotUfi9(input checkruntime.Macaddr8Value) checkruntime.Macaddr8Value {
	if input.Kind == checkruntime.Macaddr8ValueValue {
		a := input.Value
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueValue, Value: checkruntime.MacAddress{Word0: langruntime.CheckedSignedSubtract(65535, a.Word0), Word1: langruntime.CheckedSignedSubtract(65535, a.Word1), Word2: langruntime.CheckedSignedSubtract(65535, a.Word2), Word3: langruntime.CheckedSignedSubtract(65535, a.Word3)}}
	}
	return input
}
func TruncY4rb(input checkruntime.Macaddr8Value) checkruntime.Macaddr8Value {
	if input.Kind == checkruntime.Macaddr8ValueValue {
		a := input.Value
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueValue, Value: checkruntime.MacAddress{Word0: a.Word0, Word1: langruntime.CheckedSignedMultiply(langruntime.CheckedSignedDivide(a.Word1, 256), 256), Word2: 0, Word3: 0}}
	}
	return input
}
func macaddr8Bitwise(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value, union bool) checkruntime.Macaddr8Value {
	if left.Kind == checkruntime.Macaddr8ValueError {
		error := left.Error
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Macaddr8ValueError {
		error := right.Error
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueError, Error: error}
	}
	if left == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) || right == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) {
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}
	}
	if left == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) || right == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) {
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}
	}
	if left.Kind == checkruntime.Macaddr8ValueValue {
		a := left.Value
		if right.Kind == checkruntime.Macaddr8ValueValue {
			b := right.Value
			word0 := addressAndWord(a.Word0, b.Word0)
			if union {
				word0 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word0, b.Word0), word0))
			}
			word1 := addressAndWord(a.Word1, b.Word1)
			if union {
				word1 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word1, b.Word1), word1))
			}
			word2 := addressAndWord(a.Word2, b.Word2)
			if union {
				word2 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word2, b.Word2), word2))
			}
			word3 := addressAndWord(a.Word3, b.Word3)
			if union {
				word3 = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word3, b.Word3), word3))
			}
			return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueValue, Value: checkruntime.MacAddress{Word0: word0, Word1: word1, Word2: word2, Word3: word3}}
		}
	}
	return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}
}
func Macaddr8AndCeah(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.Macaddr8Value {
	return macaddr8Bitwise(left, right, false)
}
func Macaddr8Or6kdp(left checkruntime.Macaddr8Value, right checkruntime.Macaddr8Value) checkruntime.Macaddr8Value {
	return macaddr8Bitwise(left, right, true)
}
func Macaddr8Set7bit2kgh(input checkruntime.Macaddr8Value) checkruntime.Macaddr8Value {
	if input.Kind == checkruntime.Macaddr8ValueValue {
		a := input.Value
		intersection := addressAndWord(a.Word0, 512)
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueValue, Value: checkruntime.MacAddress{Word0: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(a.Word0, 512), intersection), Word1: a.Word1, Word2: a.Word2, Word3: a.Word3}}
	}
	return input
}
func Macaddr8Ta7j(input checkruntime.MacaddrValue) checkruntime.Macaddr8Value {
	if input.Kind == checkruntime.MacaddrValueError {
		error := input.Error
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueError, Error: error}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) {
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) {
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}
	}
	if input.Kind == checkruntime.MacaddrValueValue {
		a := input.Value
		insertedHigh := 254
		return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueValue, Value: checkruntime.MacAddress{Word0: a.Word0, Word1: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(langruntime.CheckedSignedDivide(a.Word1, 256), 256), 255), Word2: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(insertedHigh, 256), langruntime.CheckedSignedRemainder(a.Word1, 256)), Word3: a.Word2}}
	}
	return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}
}
func MacaddrXnt6(input checkruntime.Macaddr8Value) checkruntime.MacaddrValue {
	if input.Kind == checkruntime.Macaddr8ValueError {
		error := input.Error
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueError, Error: error}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) {
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) {
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}
	}
	if input.Kind == checkruntime.Macaddr8ValueValue {
		a := input.Value
		if langruntime.CheckedSignedRemainder(a.Word1, 256) != 255 || langruntime.CheckedSignedDivide(a.Word2, 256) != 254 {
			return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueError, Error: checkruntime.MakeSqlError(macConversionOutOfRange)}
		}
		return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueValue, Value: checkruntime.MacAddress{Word0: a.Word0, Word1: langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(langruntime.CheckedSignedDivide(a.Word1, 256), 256), langruntime.CheckedSignedRemainder(a.Word2, 256)), Word2: a.Word3, Word3: 0}}
	}
	return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}
}
func macAddressByte(address checkruntime.MacAddress, index int) int {
	index = langruntime.CheckedI32(index)
	word := address.Word0
	if index >= 6 {
		word = langruntime.CheckedI32(address.Word3)
	} else if index >= 4 {
		word = langruntime.CheckedI32(address.Word2)
	} else if index >= 2 {
		word = langruntime.CheckedI32(address.Word1)
	}
	if langruntime.CheckedSignedRemainder(index, 2) == 0 {
		return langruntime.CheckedSignedDivide(word, 256)
	}
	return langruntime.CheckedSignedRemainder(word, 256)
}
func macOutputText(address checkruntime.MacAddress, size int) string {
	size = langruntime.CheckedI32(size)
	output := ""
	index := 0
	for index < size {
		if index > 0 {
			output = output + string(langruntime.CheckedChar(':'))
		}
		byte := macAddressByte(address, index)
		if byte < 16 {
			output = output + string(langruntime.CheckedChar('0'))
		}
		number := checkruntime.TextNumber(byte, 16)
		output = output + number
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	return output
}
func macOutputBytes(address checkruntime.MacAddress, size int) string {
	size = langruntime.CheckedI32(size)
	output := ""
	index := 0
	for index < size {
		byte := macAddressByte(address, index)
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, byte))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	return output
}
func macHashBytes(address checkruntime.MacAddress, size int) []checkruntime.HashByte {
	size = langruntime.CheckedI32(size)
	bytes := []checkruntime.HashByte{}
	index := 0
	for index < size {
		byte := macAddressByte(address, index)
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(byte))}))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	return bytes
}
func MacaddrToText(input checkruntime.MacaddrValue) checkruntime.TextValue {
	if input.Kind == checkruntime.MacaddrValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.MacaddrValueValue {
		address := input.Value
		result := macOutputText(address, 6)
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: result}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func MacaddrSendFk4p(input checkruntime.MacaddrValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.MacaddrValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.MacaddrValueValue {
		address := input.Value
		result := macOutputBytes(address, 6)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: result}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func HashmacaddrIh2y(input checkruntime.MacaddrValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.MacaddrValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.MacaddrValueValue {
		address := input.Value
		bytes := macHashBytes(address, 6)
		result := checkruntime.HashBytes32(bytes)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: result}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Hashmacaddrextended94rh(left checkruntime.MacaddrValue, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.MacaddrValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.MacaddrValueValue {
		address := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			seed := right.Value
			bytes := macHashBytes(address, 6)
			result := checkruntime.HashBytes64(bytes, seed)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Macaddr8ToText(input checkruntime.Macaddr8Value) checkruntime.TextValue {
	if input.Kind == checkruntime.Macaddr8ValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.Macaddr8ValueValue {
		address := input.Value
		result := macOutputText(address, 8)
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: result}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func Macaddr8SendQten(input checkruntime.Macaddr8Value) checkruntime.ByteaValue {
	if input.Kind == checkruntime.Macaddr8ValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.Macaddr8ValueValue {
		address := input.Value
		result := macOutputBytes(address, 8)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: result}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Hashmacaddr872kw(input checkruntime.Macaddr8Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.Macaddr8ValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.Macaddr8ValueValue {
		address := input.Value
		bytes := macHashBytes(address, 8)
		result := checkruntime.HashBytes32(bytes)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: result}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Hashmacaddr8extended63o8(left checkruntime.Macaddr8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.Macaddr8ValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.Macaddr8ValueValue {
		address := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			seed := right.Value
			bytes := macHashBytes(address, 8)
			result := checkruntime.HashBytes64(bytes, seed)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}

const sqlstateInvalidParameterValue = 3452619

func networkCompare(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			if a.Family < b.Family {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if a.Family > b.Family {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			bits := a.Prefix
			if b.Prefix < bits {
				bits = langruntime.CheckedI32(b.Prefix)
			}
			order := checkruntime.NetworkPrefixCompare(a, b, bits)
			if order != 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: order}
			}
			prefixOrder := langruntime.CheckedSignedSubtract(a.Prefix, b.Prefix)
			if prefixOrder != 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: prefixOrder}
			}
			width := 32
			if a.Family == 6 {
				width = langruntime.CheckedI32(128)
			}
			fullOrder := checkruntime.NetworkPrefixCompare(a, b, width)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: fullOrder}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func NetworkEqI7hn(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NetworkNeVmql(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NetworkLt0kbr(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NetworkLeN61s(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NetworkGtI6x7(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NetworkGeQ7pc(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func networkContains(left checkruntime.NetworkValue, right checkruntime.NetworkValue, strict bool) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			if a.Family != b.Family || a.Prefix < b.Prefix {
				return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: false}
			}
			if strict && a.Prefix == b.Prefix {
				return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: false}
			}
			order := checkruntime.NetworkPrefixCompare(a, b, b.Prefix)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NetworkSubY7j2(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	return networkContains(left, right, true)
}
func NetworkSubeq9psu(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	return networkContains(left, right, false)
}
func NetworkSup1zu4(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	return networkContains(right, left, true)
}
func NetworkSupeqUtj6(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	return networkContains(right, left, false)
}
func NetworkOverlapZbdv(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			if a.Family != b.Family {
				return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: false}
			}
			bits := a.Prefix
			if b.Prefix < bits {
				bits = langruntime.CheckedI32(b.Prefix)
			}
			order := checkruntime.NetworkPrefixCompare(a, b, bits)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func networkResultAddress(family int, prefix int, words []checkruntime.NetworkWord) checkruntime.NetworkAddress {
	family = langruntime.CheckedIndex(family)
	prefix = langruntime.CheckedI32(prefix)
	words = langruntime.CheckedStructs(words, checkruntime.CopyNetworkWord)
	return checkruntime.NetworkAddress{Family: family, Prefix: prefix, Word0: words[0].Value, Word1: words[1].Value, Word2: words[2].Value, Word3: words[3].Value, Word4: words[4].Value, Word5: words[5].Value, Word6: words[6].Value, Word7: words[7].Value}
}
func networkAddOffset(address checkruntime.NetworkAddress, offset int64) checkruntime.NetworkValue {
	words := []checkruntime.NetworkWord{}
	for len(words) < 8 {
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: 0}))
	}
	index := 8
	if address.Family == 4 {
		index = langruntime.CheckedIndex(2)
	}
	remaining := offset
	carry := 0
	for index > 0 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		digit := langruntime.CheckedI64Remainder(remaining, int64(65536))
		remaining = langruntime.CheckedI64Divide(remaining, int64(65536))
		if digit < int64(0) {
			digit = langruntime.CheckedI64Add(digit, int64(65536))
			remaining = langruntime.CheckedI64Subtract(remaining, int64(1))
		}
		narrowDigit := int(int32(digit))
		sum := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(checkruntime.NetworkAddressWord(address, index), narrowDigit), carry)
		words[index] = checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: langruntime.CheckedSignedRemainder(sum, 65536)})
		carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(sum, 65536))
	}
	if (remaining != int64(0) || carry != 0) && (remaining != int64(-1) || carry != 1) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
	}
	result := networkResultAddress(address.Family, address.Prefix, words)
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
}
func InetplEu7x(left checkruntime.NetworkValue, right checkruntime.Int8Value) checkruntime.NetworkValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		address := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			offset := right.Value
			return networkAddOffset(address, offset)
		}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func Int8plInet3uh7(left checkruntime.Int8Value, right checkruntime.NetworkValue) checkruntime.NetworkValue {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if right.Kind == checkruntime.NetworkValueValue {
		address := right.Value
		if left.Kind == checkruntime.Int8ValueValue {
			offset := left.Value
			return networkAddOffset(address, offset)
		}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func InetmiInt8Z4fj(left checkruntime.NetworkValue, right checkruntime.Int8Value) checkruntime.NetworkValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		address := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			offset := right.Value
			if offset == int64(-9223372036854775808) {
				return networkAddOffset(address, offset)
			}
			negated := langruntime.CheckedI64Subtract(int64(0), offset)
			return networkAddOffset(address, negated)
		}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func InetmiJocm(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.Int8Value {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			if a.Family != b.Family {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateInvalidParameterValue)}
			}
			wordCount := 8
			if a.Family == 4 {
				wordCount = langruntime.CheckedIndex(2)
			}
			words := []checkruntime.NetworkWord{}
			for len(words) < wordCount {
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: 0}))
			}
			index := wordCount
			borrow := 0
			for index > 0 {
				index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
				difference := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(checkruntime.NetworkAddressWord(a, index), checkruntime.NetworkAddressWord(b, index)), borrow)
				borrow = langruntime.CheckedI32(0)
				if difference < 0 {
					difference = langruntime.CheckedI32(langruntime.CheckedSignedAdd(difference, 65536))
					borrow = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				words[index] = checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: difference})
			}
			if a.Family == 4 {
				high := int64(langruntime.CheckedI32(words[0].Value))
				low := int64(langruntime.CheckedI32(words[1].Value))
				result := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(high, int64(65536)), low)
				if borrow < 0 {
					result = langruntime.CheckedI64Subtract(result, int64(4294967296))
				}
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
			}
			expected := 0
			high := words[4].Value
			if high >= 32768 {
				expected = langruntime.CheckedI32(65535)
				high = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(high, 65536))
			}
			upperIndex := 0
			for upperIndex < 4 {
				if words[upperIndex].Value != expected {
					return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
				}
				upperIndex = langruntime.CheckedAdd(upperIndex, 1)
			}
			result := int64(langruntime.CheckedI32(high))
			lowerIndex := 5
			for lowerIndex < 8 {
				word := int64(langruntime.CheckedI32(words[lowerIndex].Value))
				result = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(result, int64(65536)), word)
				lowerIndex = langruntime.CheckedAdd(lowerIndex, 1)
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func networkMaxBits(address checkruntime.NetworkAddress) int {
	if address.Family == 4 {
		return 32
	}
	return 128
}
func networkHostDivisor(bits int) int {
	bits = langruntime.CheckedI32(bits)
	remaining := langruntime.CheckedSignedSubtract(16, bits)
	divisor := 1
	for remaining > 0 {
		divisor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(divisor, 2))
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	return divisor
}
func networkApplyPrefix(address checkruntime.NetworkAddress, prefix int, fillHost bool) checkruntime.NetworkAddress {
	prefix = langruntime.CheckedI32(prefix)
	words := []checkruntime.NetworkWord{}
	remaining := prefix
	index := 0
	for index < 8 {
		bits := remaining
		if bits > 16 {
			bits = langruntime.CheckedI32(16)
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, bits))
		divisor := networkHostDivisor(bits)
		source := checkruntime.NetworkAddressWord(address, index)
		word := langruntime.CheckedSignedMultiply(langruntime.CheckedSignedDivide(source, divisor), divisor)
		if fillHost {
			word = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(word, divisor), 1))
		}
		if address.Family == 4 && index >= 2 {
			word = langruntime.CheckedI32(0)
		}
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: word}))
		index = langruntime.CheckedAdd(index, 1)
	}
	return networkResultAddress(address.Family, prefix, words)
}
func networkMask(address checkruntime.NetworkAddress, host bool) checkruntime.NetworkAddress {
	words := []checkruntime.NetworkWord{}
	remaining := address.Prefix
	index := 0
	for index < 8 {
		bits := remaining
		if bits > 16 {
			bits = langruntime.CheckedI32(16)
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, bits))
		divisor := networkHostDivisor(bits)
		word := langruntime.CheckedSignedSubtract(65536, divisor)
		if host {
			word = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(divisor, 1))
		}
		if address.Family == 4 && index >= 2 {
			word = langruntime.CheckedI32(0)
		}
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: word}))
		index = langruntime.CheckedAdd(index, 1)
	}
	width := networkMaxBits(address)
	return networkResultAddress(address.Family, width, words)
}
func networkSetMasklen(left checkruntime.NetworkValue, right checkruntime.Int4Value, clearHost bool) checkruntime.NetworkValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		address := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			requested := langruntime.CheckedI32(right.Value)
			width := networkMaxBits(address)
			prefix := requested
			if prefix == langruntime.CheckedSignedNegate(1) {
				prefix = langruntime.CheckedI32(width)
			}
			if prefix < 0 || prefix > width {
				return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: checkruntime.MakeSqlError(sqlstateInvalidParameterValue)}
			}
			if clearHost {
				result := networkApplyPrefix(address, prefix, false)
				return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
			}
			words := []checkruntime.NetworkWord{}
			index := 0
			for index < 8 {
				word := checkruntime.NetworkAddressWord(address, index)
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: word}))
				index = langruntime.CheckedAdd(index, 1)
			}
			result := networkResultAddress(address.Family, prefix, words)
			return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
		}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func Family2lcf(input checkruntime.NetworkValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		if address.Family == 4 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 4}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 6}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func MasklenKk20(input checkruntime.NetworkValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: address.Prefix}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func NetworkO215(input checkruntime.NetworkValue) checkruntime.NetworkValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		result := networkApplyPrefix(address, address.Prefix, false)
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func Cidr6idb(input checkruntime.NetworkValue) checkruntime.NetworkValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		result := networkApplyPrefix(address, address.Prefix, false)
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func BroadcastIlgu(input checkruntime.NetworkValue) checkruntime.NetworkValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		result := networkApplyPrefix(address, address.Prefix, true)
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func NetmaskBt5i(input checkruntime.NetworkValue) checkruntime.NetworkValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		result := networkMask(address, false)
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func HostmaskVz12(input checkruntime.NetworkValue) checkruntime.NetworkValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		result := networkMask(address, true)
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func SetMasklenA6b0(left checkruntime.NetworkValue, right checkruntime.Int4Value) checkruntime.NetworkValue {
	return networkSetMasklen(left, right, false)
}
func SetMasklen00t7(left checkruntime.NetworkValue, right checkruntime.Int4Value) checkruntime.NetworkValue {
	return networkSetMasklen(left, right, true)
}
func InetSameFamilyOgv6(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: a.Family == b.Family}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func InetMergeIflm(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.NetworkValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			if a.Family != b.Family {
				return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: checkruntime.MakeSqlError(sqlstateInvalidParameterValue)}
			}
			limit := a.Prefix
			if b.Prefix < limit {
				limit = langruntime.CheckedI32(b.Prefix)
			}
			common := 0
			for common < limit {
				next := langruntime.CheckedSignedAdd(common, 1)
				order := checkruntime.NetworkPrefixCompare(a, b, next)
				if order != 0 {
					break
				}
				common = langruntime.CheckedI32(next)
			}
			result := networkApplyPrefix(a, common, false)
			return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
		}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func networkBitwise(left checkruntime.NetworkValue, right checkruntime.NetworkValue, union bool) checkruntime.NetworkValue {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if right.Kind == checkruntime.NetworkValueError {
		error := right.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		a := left.Value
		if right.Kind == checkruntime.NetworkValueValue {
			b := right.Value
			if a.Family != b.Family {
				return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: checkruntime.MakeSqlError(sqlstateInvalidParameterValue)}
			}
			prefix := a.Prefix
			if b.Prefix > prefix {
				prefix = langruntime.CheckedI32(b.Prefix)
			}
			words := []checkruntime.NetworkWord{}
			index := 0
			for index < 8 {
				first := checkruntime.NetworkAddressWord(a, index)
				second := checkruntime.NetworkAddressWord(b, index)
				intersection := addressAndWord(first, second)
				word := intersection
				if union {
					word = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(first, second), intersection))
				}
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: word}))
				index = langruntime.CheckedAdd(index, 1)
			}
			result := networkResultAddress(a.Family, prefix, words)
			return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
		}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func InetandQxb6(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.NetworkValue {
	return networkBitwise(left, right, false)
}
func InetorKw39(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.NetworkValue {
	return networkBitwise(left, right, true)
}
func Inetnot8bow(input checkruntime.NetworkValue) checkruntime.NetworkValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		words := []checkruntime.NetworkWord{}
		index := 0
		for index < 8 {
			source := checkruntime.NetworkAddressWord(address, index)
			word := langruntime.CheckedSignedSubtract(65535, source)
			if address.Family == 4 && index >= 2 {
				word = langruntime.CheckedI32(0)
			}
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, checkruntime.CopyNetworkWord(checkruntime.NetworkWord{Value: word}))
			index = langruntime.CheckedAdd(index, 1)
		}
		result := networkResultAddress(address.Family, address.Prefix, words)
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueValue, Value: result}
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func NetworkCmp7dun(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.Int4Value {
	return networkCompare(left, right)
}
func networkSelect(left checkruntime.NetworkValue, right checkruntime.NetworkValue, larger bool) checkruntime.NetworkValue {
	result := networkCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		if (larger && order > 0) || (larger == false && order < 0) {
			return left
		}
		return right
	}
	return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}
}
func NetworkLargerWb5u(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.NetworkValue {
	return networkSelect(left, right, true)
}
func NetworkSmallerNmw8(left checkruntime.NetworkValue, right checkruntime.NetworkValue) checkruntime.NetworkValue {
	return networkSelect(left, right, false)
}
func networkHashBytes(address checkruntime.NetworkAddress) []checkruntime.HashByte {
	bytes := []checkruntime.HashByte{}
	family := int64(2)
	wordCount := 2
	if address.Family == 6 {
		family = int64(3)
		wordCount = langruntime.CheckedIndex(8)
	}
	langruntime.CheckedAdd(len(bytes), 1)
	bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: family}))
	prefix := int64(langruntime.CheckedI32(address.Prefix))
	langruntime.CheckedAdd(len(bytes), 1)
	bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: prefix}))
	index := 0
	for index < wordCount {
		word := checkruntime.NetworkAddressWord(address, index)
		high := langruntime.CheckedSignedDivide(word, 256)
		low := langruntime.CheckedSignedRemainder(word, 256)
		highByte := int64(langruntime.CheckedI32(high))
		lowByte := int64(langruntime.CheckedI32(low))
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: highByte}))
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: lowByte}))
		index = langruntime.CheckedAdd(index, 1)
	}
	return bytes
}
func HashinetFhly(input checkruntime.NetworkValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		bytes := networkHashBytes(address)
		hash := checkruntime.HashBytes32(bytes)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: hash}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func HashinetextendedN7xh(left checkruntime.NetworkValue, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.NetworkValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.NetworkValueValue {
		address := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			seed := right.Value
			bytes := networkHashBytes(address)
			hash := checkruntime.HashBytes64(bytes, seed)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: hash}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func networkIpv4Text(address checkruntime.NetworkAddress, start int, octets int) string {
	start = langruntime.CheckedIndex(start)
	octets = langruntime.CheckedI32(octets)
	output := ""
	index := start
	high := true
	remaining := octets
	for remaining > 0 {
		if remaining != octets {
			output = output + string(langruntime.CheckedChar('.'))
		}
		byte := checkruntime.NetworkAddressByte(address, index, high)
		number := checkruntime.TextNumber(byte, 10)
		output = output + number
		if high {
			high = false
		} else {
			high = true
			index = langruntime.CheckedAdd(index, 1)
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	return output
}
func networkHostText(address checkruntime.NetworkAddress) string {
	if address.Family == 4 {
		return networkIpv4Text(address, 0, 4)
	}
	bestStart := 0
	bestLength := 0
	currentStart := 0
	currentLength := 0
	index := 0
	for index < 8 {
		if checkruntime.NetworkAddressWord(address, index) == 0 {
			if currentLength == 0 {
				currentStart = langruntime.CheckedIndex(index)
			}
			currentLength = langruntime.CheckedAdd(currentLength, 1)
		} else {
			if currentLength > bestLength {
				bestStart = langruntime.CheckedIndex(currentStart)
				bestLength = langruntime.CheckedIndex(currentLength)
			}
			currentLength = langruntime.CheckedIndex(0)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	if currentLength > bestLength {
		bestStart = langruntime.CheckedIndex(currentStart)
		bestLength = langruntime.CheckedIndex(currentLength)
	}
	if bestLength < 2 {
		bestLength = langruntime.CheckedIndex(0)
	}
	output := ""
	position := 0
	for position < 8 {
		if bestLength != 0 && position >= bestStart && position < langruntime.CheckedAdd(bestStart, bestLength) {
			if position == bestStart {
				output = output + string(langruntime.CheckedChar(':'))
			}
		} else {
			if position != 0 {
				output = output + string(langruntime.CheckedChar(':'))
			}
			if position == 6 && bestStart == 0 && (bestLength == 6 || (bestLength == 7 && address.Word7 != 1) || (bestLength == 5 && address.Word5 == 65535)) {
				dotted := networkIpv4Text(address, 6, 4)
				output = output + dotted
				break
			}
			word := checkruntime.NetworkAddressWord(address, position)
			number := checkruntime.TextNumber(word, 16)
			output = output + number
		}
		position = langruntime.CheckedAdd(position, 1)
	}
	if bestLength != 0 && langruntime.CheckedAdd(bestStart, bestLength) == 8 {
		output = output + string(langruntime.CheckedChar(':'))
	}
	return output
}
func networkCidrText(address checkruntime.NetworkAddress) string {
	output := ""
	if address.Family == 4 {
		if address.Prefix == 0 {
			output = output + string(langruntime.CheckedChar('0'))
		} else {
			octets := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(address.Prefix, 7)), 8)
			output = langruntime.CheckedString(networkIpv4Text(address, 0, octets))
		}
	} else if address.Prefix == 0 {
		output = output + "::"
	} else {
		words := langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(address.Prefix, 15)), 16)
		if words == 1 {
			words = langruntime.CheckedI32(2)
		}
		zeroStart := 0
		zeroLength := 0
		currentStart := 0
		currentLength := 0
		index := 0
		remaining := words
		for remaining > 0 {
			if checkruntime.NetworkAddressWord(address, index) == 0 {
				if currentLength == 0 {
					currentStart = langruntime.CheckedIndex(index)
				}
				currentLength = langruntime.CheckedAdd(currentLength, 1)
			} else if currentLength != 0 && zeroLength < currentLength {
				zeroStart = langruntime.CheckedIndex(currentStart)
				zeroLength = langruntime.CheckedIndex(currentLength)
				currentLength = langruntime.CheckedIndex(0)
			}
			index = langruntime.CheckedAdd(index, 1)
			remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
		}
		if currentLength != 0 && zeroLength < currentLength {
			zeroStart = langruntime.CheckedIndex(currentStart)
			zeroLength = langruntime.CheckedIndex(currentLength)
		}
		ipv4 := zeroLength != index && zeroStart == 0 && (zeroLength == 6 || (zeroLength == 5 && address.Word5 == 65535) || (zeroLength == 7 && langruntime.CheckedSignedDivide(address.Word7, 256) != 0 && langruntime.CheckedSignedRemainder(address.Word7, 256) != 1))
		position := 0
		printed := false
		for position < index {
			if zeroLength != 0 && position >= zeroStart && position < langruntime.CheckedAdd(zeroStart, zeroLength) {
				if position == zeroStart {
					output = output + string(langruntime.CheckedChar(':'))
					printed = true
				}
				if position == langruntime.CheckedSubtract(index, 1) {
					output = output + string(langruntime.CheckedChar(':'))
				}
			} else if ipv4 && position > 5 {
				if position == 6 {
					output = output + string(langruntime.CheckedChar(':'))
				} else {
					output = output + string(langruntime.CheckedChar('.'))
				}
				high := checkruntime.NetworkAddressByte(address, position, true)
				number := checkruntime.TextNumber(high, 10)
				output = output + number
				if position != 7 || address.Prefix > 120 {
					output = output + string(langruntime.CheckedChar('.'))
					low := checkruntime.NetworkAddressByte(address, position, false)
					lowNumber := checkruntime.TextNumber(low, 10)
					output = output + lowNumber
				}
				printed = true
			} else {
				if printed {
					output = output + string(langruntime.CheckedChar(':'))
				}
				word := checkruntime.NetworkAddressWord(address, position)
				number := checkruntime.TextNumber(word, 16)
				output = output + number
				printed = true
			}
			position = langruntime.CheckedAdd(position, 1)
		}
	}
	output = output + string(langruntime.CheckedChar('/'))
	prefix := checkruntime.TextNumber(address.Prefix, 10)
	output = output + prefix
	return output
}
func networkOutput(input checkruntime.NetworkValue, mode int) checkruntime.TextValue {
	mode = langruntime.CheckedI32(mode)
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		if mode == 3 {
			return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: networkCidrText(address)}
		}
		output := networkHostText(address)
		if mode == 1 || (mode == 2 && address.Prefix != networkMaxBits(address)) {
			output = output + string(langruntime.CheckedChar('/'))
			prefix := checkruntime.TextNumber(address.Prefix, 10)
			output = output + prefix
		}
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func HostH4jb(input checkruntime.NetworkValue) checkruntime.TextValue {
	return networkOutput(input, 0)
}
func Text99pc(input checkruntime.NetworkValue) checkruntime.TextValue {
	return networkOutput(input, 1)
}
func AbbrevXdee(input checkruntime.NetworkValue) checkruntime.TextValue {
	return networkOutput(input, 2)
}
func Abbrev5tby(input checkruntime.NetworkValue) checkruntime.TextValue {
	return networkOutput(input, 3)
}
func networkSend(input checkruntime.NetworkValue, cidr bool) checkruntime.ByteaValue {
	if input.Kind == checkruntime.NetworkValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.NetworkValue{Kind: checkruntime.NetworkValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.NetworkValueValue {
		address := input.Value
		family := 2
		size := 4
		cidrFlag := 0
		if address.Family == 6 {
			family = langruntime.CheckedI32(3)
			size = langruntime.CheckedI32(16)
		}
		if cidr {
			cidrFlag = langruntime.CheckedI32(1)
		}
		output := ""
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, family))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, address.Prefix))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, cidrFlag))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, size))
		index := 0
		high := true
		remaining := size
		for remaining > 0 {
			byte := checkruntime.NetworkAddressByte(address, index, high)
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, byte))
			if high {
				high = false
			} else {
				high = true
				index = langruntime.CheckedAdd(index, 1)
			}
			remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
		}
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func InetSendZ9ng(input checkruntime.NetworkValue) checkruntime.ByteaValue {
	return networkSend(input, false)
}
func CidrSendS007(input checkruntime.NetworkValue) checkruntime.ByteaValue {
	return networkSend(input, true)
}
func numericCompare(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		leftValue := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			rightValue := langruntime.CheckedString(right.Value)
			a := checkruntime.NumericParts(leftValue)
			b := checkruntime.NumericParts(rightValue)
			if a.Valid == false || b.Valid == false {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
			}
			if a.Special < b.Special {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if a.Special > b.Special {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			if a.Special != 1 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			if a.Sign < b.Sign {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if a.Sign > b.Sign {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			if a.Sign == 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			if a.Weight < b.Weight {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(0, a.Sign)}
			}
			if a.Weight > b.Weight {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: a.Sign}
			}
			leftChars := []rune(leftValue)
			rightChars := []rune(rightValue)
			i := a.First
			j := b.First
			for i < a.End || j < b.End {
				for i < a.End && (leftChars[i] == '.' || leftChars[i] == '_') {
					i = langruntime.CheckedAdd(i, 1)
				}
				for j < b.End && (rightChars[j] == '.' || rightChars[j] == '_') {
					j = langruntime.CheckedAdd(j, 1)
				}
				x := '0'
				y := '0'
				if i < a.End {
					x = langruntime.CheckedChar(leftChars[i])
					i = langruntime.CheckedAdd(i, 1)
				}
				if j < b.End {
					y = langruntime.CheckedChar(rightChars[j])
					j = langruntime.CheckedAdd(j, 1)
				}
				xCode := int(langruntime.CheckedChar(x))
				yCode := int(langruntime.CheckedChar(y))
				if xCode < yCode {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(0, a.Sign)}
				}
				if xCode > yCode {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: a.Sign}
				}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func NumericEqFw7r(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NumericGeW8pw(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NumericGtH1pi(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NumericLeBbpc(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NumericLtZl16(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func NumericNeGyip(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.BoolValue {
	result := numericCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int24eqCfkl(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4eqLrxe(leftWide, right)
}
func Int24geHurd(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4ge2xvk(leftWide, right)
}
func Int24gt98sb(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4gt5vlv(leftWide, right)
}
func Int24le56y6(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4le9wb6(leftWide, right)
}
func Int24ltGuxt(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4lt9gej(leftWide, right)
}
func Int24ne11ts(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4neQhun(leftWide, right)
}
func Int28eq47dr(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt8(left)
	return Int8eqJdhd(leftWide, right)
}
func Int28geXhie(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt8(left)
	return Int8geQfhv(leftWide, right)
}
func Int28gtXmpc(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt8(left)
	return Int8gt3ehj(leftWide, right)
}
func Int28leJsoj(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt8(left)
	return Int8le9fr4(leftWide, right)
}
func Int28ltF4ka(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt8(left)
	return Int8ltCryd(leftWide, right)
}
func Int28ne4fh8(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt8(left)
	return Int8neUr2k(leftWide, right)
}
func Int2eqU7zv(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4eqLrxe(leftWide, rightWide)
}
func Int2geLd2i(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4ge2xvk(leftWide, rightWide)
}
func Int2gt681i(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4gt5vlv(leftWide, rightWide)
}
func Int2leEp4u(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4le9wb6(leftWide, rightWide)
}
func Int2ltQvze(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4lt9gej(leftWide, rightWide)
}
func Int2neUz14(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4neQhun(leftWide, rightWide)
}
func Int42eqRd78(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4eqLrxe(left, rightWide)
}
func Int42geT5ib(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4ge2xvk(left, rightWide)
}
func Int42gtBicd(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4gt5vlv(left, rightWide)
}
func Int42le570s(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4le9wb6(left, rightWide)
}
func Int42ltEtdm(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4lt9gej(left, rightWide)
}
func Int42neBeca(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4neQhun(left, rightWide)
}
func Int82eqJdpt(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt8(right)
	return Int8eqJdhd(left, rightWide)
}
func Int82geEh8t(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt8(right)
	return Int8geQfhv(left, rightWide)
}
func Int82gt7e3o(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt8(right)
	return Int8gt3ehj(left, rightWide)
}
func Int82leJth3(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt8(right)
	return Int8le9fr4(left, rightWide)
}
func Int82ltXt99(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt8(right)
	return Int8ltCryd(left, rightWide)
}
func Int82ne6rol(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.BoolValue {
	rightWide := checkruntime.Int2ToInt8(right)
	return Int8neUr2k(left, rightWide)
}
func smallintResult(value checkruntime.Int4Value) checkruntime.Int2Value {
	if value.Kind == checkruntime.Int4ValueValue {
		payload := langruntime.CheckedI32(value.Value)
		if payload < langruntime.CheckedSignedNegate(32768) || payload > 32767 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: payload}
	}
	if value.Kind == checkruntime.Int4ValueError {
		error := value.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if value == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func Int2plYujm(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	result := Int4plSj3s(leftWide, rightWide)
	return smallintResult(result)
}
func Int2miUxzm(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	result := Int4miDtqk(leftWide, rightWide)
	return smallintResult(result)
}
func Int2mulK2lr(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	result := Int4mul284v(leftWide, rightWide)
	return smallintResult(result)
}
func Int2divFnwp(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	result := Int4div8ogr(leftWide, rightWide)
	return smallintResult(result)
}
func Int2modZds7(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	leftWide := checkruntime.Int2ToInt4(left)
	rightWide := checkruntime.Int2ToInt4(right)
	result := Int4modJ4pe(leftWide, rightWide)
	return smallintResult(result)
}
func Int2absTyad(input checkruntime.Int2Value) checkruntime.Int2Value {
	wide := checkruntime.Int2ToInt4(input)
	result := Abs5ajw(wide)
	return smallintResult(result)
}
func Abs43i0(input checkruntime.Int2Value) checkruntime.Int2Value {
	return Int2absTyad(input)
}
func ModMzjb(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	return Int2modZds7(left, right)
}
func Int2um8puj(input checkruntime.Int2Value) checkruntime.Int2Value {
	zero := checkruntime.MakeInt4Value(0)
	wide := checkruntime.Int2ToInt4(input)
	result := Int4miDtqk(zero, wide)
	return smallintResult(result)
}
func Int2upNe4g(input checkruntime.Int2Value) checkruntime.Int2Value {
	return input
}
func Int24plIpr8(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4plSj3s(leftWide, right)
}
func Int42plCx9n(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4plSj3s(left, rightWide)
}
func Int24miClza(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4miDtqk(leftWide, right)
}
func Int42miNaln(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4miDtqk(left, rightWide)
}
func Int24mulRdky(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4mul284v(leftWide, right)
}
func Int42mulDh4o(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4mul284v(left, rightWide)
}
func Int24divY2zx(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftWide := checkruntime.Int2ToInt4(left)
	return Int4div8ogr(leftWide, right)
}
func Int42div0fx0(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	rightWide := checkruntime.Int2ToInt4(right)
	return Int4div8ogr(left, rightWide)
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
func TimestampEqJd79(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampGe80hi(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue >= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampGtHxfo(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue > rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampLe1qj4(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue <= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampLtOgss(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue < rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampNeQsye(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestamptzEqK4n3(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue == rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestamptzGeP2rz(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue >= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestamptzGt89jo(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue > rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestamptzLe0urp(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue <= rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestamptzLtB2w5(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue < rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestamptzNe4iy1(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != rightValue}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func uuidCompare(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.UuidValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.UuidValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) || right == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) || right == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.UuidValueValue {
		a := left.Value
		if right.Kind == checkruntime.UuidValueValue {
			b := right.Value
			index := 0
			for index < 8 {
				x := checkruntime.UuidWord(a, index)
				y := checkruntime.UuidWord(b, index)
				if langruntime.CheckedSignedDivide(x, 256) != langruntime.CheckedSignedDivide(y, 256) {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedDivide(x, 256), langruntime.CheckedSignedDivide(y, 256))}
				}
				if langruntime.CheckedSignedRemainder(x, 256) != langruntime.CheckedSignedRemainder(y, 256) {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedRemainder(x, 256), langruntime.CheckedSignedRemainder(y, 256))}
				}
				index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func UuidCmp6t9k(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.Int4Value {
	return uuidCompare(left, right)
}
func UuidEq6czo(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.BoolValue {
	result := uuidCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func UuidNeN2xp(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.BoolValue {
	result := uuidCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func UuidLt50za(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.BoolValue {
	result := uuidCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func UuidLeG9j5(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.BoolValue {
	result := uuidCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func UuidGt0fj1(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.BoolValue {
	result := uuidCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func UuidGe098n(left checkruntime.UuidValue, right checkruntime.UuidValue) checkruntime.BoolValue {
	result := uuidCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func UuidToText(input checkruntime.UuidValue) checkruntime.TextValue {
	if input.Kind == checkruntime.UuidValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.UuidValueValue {
		value := input.Value
		output := ""
		index := 0
		for index < 8 {
			if index == 2 || index == 3 || index == 4 || index == 5 {
				output = output + string(langruntime.CheckedChar('-'))
			}
			word := checkruntime.UuidWord(value, index)
			if word < 4096 {
				output = output + string(langruntime.CheckedChar('0'))
			}
			if word < 256 {
				output = output + string(langruntime.CheckedChar('0'))
			}
			if word < 16 {
				output = output + string(langruntime.CheckedChar('0'))
			}
			digits := checkruntime.TextNumber(word, 16)
			output = output + digits
			index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
		}
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
