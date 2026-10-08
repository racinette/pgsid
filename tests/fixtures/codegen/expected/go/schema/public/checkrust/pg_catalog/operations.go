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
func bitComparePayload(left string, right string) int {
	left = langruntime.CheckedString(left)
	right = langruntime.CheckedString(right)
	a := []rune(left)
	b := []rune(right)
	index := 0
	for index < len(a) && index < len(b) {
		leftByte := 0
		rightByte := 0
		weight := 128
		for weight > 0 {
			if index < len(a) {
				if a[index] == '1' {
					leftByte = langruntime.CheckedI32(langruntime.CheckedSignedAdd(leftByte, weight))
				}
			}
			if index < len(b) {
				if b[index] == '1' {
					rightByte = langruntime.CheckedI32(langruntime.CheckedSignedAdd(rightByte, weight))
				}
			}
			weight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(weight, 2))
			index = langruntime.CheckedAdd(index, 1)
		}
		if leftByte != rightByte {
			return langruntime.CheckedSignedSubtract(leftByte, rightByte)
		}
	}
	if len(a) < len(b) {
		return langruntime.CheckedSignedNegate(1)
	}
	if len(a) > len(b) {
		return 1
	}
	return 0
}
func bitCompare(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.BitValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.BitValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || right == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || right == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.BitValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.BitValueValue {
			b := langruntime.CheckedString(right.Value)
			borrowedA := a
			borrowedB := b
			result := bitComparePayload(borrowedA, borrowedB)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: result}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func bitLength(input checkruntime.BitValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		borrowed := value
		result := checkruntime.BitPayloadLength(borrowed)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: result}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func BitLengthE2i8(input checkruntime.BitValue) checkruntime.Int4Value {
	return bitLength(input)
}
func Bitcmp2r1v(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.Int4Value {
	return bitCompare(left, right)
}
func Biteq320u(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BitgePy56(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Bitgt2srl(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BitleY0d7(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Bitlt6ybn(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BitneXjg3(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func LengthR5f9(input checkruntime.BitValue) checkruntime.Int4Value {
	return bitLength(input)
}
func OctetLengthAcdm(input checkruntime.BitValue) checkruntime.Int4Value {
	length := bitLength(input)
	if length.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(length.Value)
		result := langruntime.CheckedSignedDivide(value, 8)
		if langruntime.CheckedSignedRemainder(value, 8) != 0 {
			result = langruntime.CheckedI32(langruntime.CheckedSignedAdd(result, 1))
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: result}
	}
	return length
}
func VarbitcmpVqwo(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.Int4Value {
	return bitCompare(left, right)
}
func VarbiteqD8r9(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value == 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Varbitge3izz(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Varbitgt31v4(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Varbitle42o0(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func VarbitltXsv2(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func VarbitneSbck(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BoolValue {
	compared := bitCompare(left, right)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}

const bitStringLengthMismatch = 3452622
const bitMaxLength = 2147483640
const bitCombineAnd = 0
const bitCombineOr = 1
const bitCombineXor = 2

func bitCombine(left checkruntime.BitValue, right checkruntime.BitValue, operation int) checkruntime.BitValue {
	operation = langruntime.CheckedI32(operation)
	if left.Kind == checkruntime.BitValueError {
		error := left.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if right.Kind == checkruntime.BitValueError {
		error := right.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if left == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || right == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if left == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || right == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if left.Kind == checkruntime.BitValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.BitValueValue {
			b := langruntime.CheckedString(right.Value)
			first := []rune(a)
			second := []rune(b)
			if len(first) != len(second) {
				return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(bitStringLengthMismatch)}
			}
			output := ""
			index := 0
			for index < len(first) {
				leftSet := first[index] == '1'
				rightSet := second[index] == '1'
				set := leftSet && rightSet
				if operation == bitCombineOr {
					set = leftSet || rightSet
				}
				if operation == bitCombineXor {
					set = leftSet != rightSet
				}
				if set {
					output = output + string(langruntime.CheckedChar('1'))
				} else {
					output = output + string(langruntime.CheckedChar('0'))
				}
				index = langruntime.CheckedAdd(index, 1)
			}
			return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func bitShift(input checkruntime.BitValue, distance checkruntime.Int4Value, leftwards bool) checkruntime.BitValue {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if distance.Kind == checkruntime.Int4ValueError {
		error := distance.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || distance == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || distance == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if distance.Kind == checkruntime.Int4ValueValue {
			amount := langruntime.CheckedI32(distance.Value)
			chars := []rune(value)
			magnitude := amount
			towardsLeft := leftwards
			if magnitude < 0 {
				towardsLeft = leftwards == false
				if magnitude < langruntime.CheckedSignedSubtract(0, bitMaxLength) {
					magnitude = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, bitMaxLength))
				}
				magnitude = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, magnitude))
			}
			offset := 0
			counted := 0
			for offset < len(chars) && counted < magnitude {
				offset = langruntime.CheckedAdd(offset, 1)
				counted = langruntime.CheckedI32(langruntime.CheckedSignedAdd(counted, 1))
			}
			output := ""
			index := 0
			for index < len(chars) {
				ch := '0'
				if towardsLeft {
					if offset < langruntime.CheckedSubtract(len(chars), index) {
						ch = langruntime.CheckedChar(chars[langruntime.CheckedAdd(index, offset)])
					}
				} else if index >= offset {
					ch = langruntime.CheckedChar(chars[langruntime.CheckedSubtract(index, offset)])
				}
				output = output + string(langruntime.CheckedChar(ch))
				index = langruntime.CheckedAdd(index, 1)
			}
			return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func BitandMal6(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BitValue {
	return bitCombine(left, right, bitCombineAnd)
}
func BitorEs93(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BitValue {
	return bitCombine(left, right, bitCombineOr)
}
func BitxorAl74(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BitValue {
	return bitCombine(left, right, bitCombineXor)
}
func BitnotXgta(input checkruntime.BitValue) checkruntime.BitValue {
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		output := ""
		index := 0
		for index < len(chars) {
			if chars[index] == '1' {
				output = output + string(langruntime.CheckedChar('0'))
			} else {
				output = output + string(langruntime.CheckedChar('1'))
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
	}
	return input
}
func BitshiftleftQf9d(input checkruntime.BitValue, distance checkruntime.Int4Value) checkruntime.BitValue {
	return bitShift(input, distance, true)
}
func BitshiftrightHgyn(input checkruntime.BitValue, distance checkruntime.Int4Value) checkruntime.BitValue {
	return bitShift(input, distance, false)
}

const bitStringRightTruncation = 3452545

func bitCoerce(input checkruntime.BitValue, width checkruntime.Int4Value, explicit checkruntime.BoolValue, varying bool) checkruntime.BitValue {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if width.Kind == checkruntime.Int4ValueError {
		error := width.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if explicit.Kind == checkruntime.BoolValueError {
		error := explicit.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || width == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || explicit == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || width == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || explicit == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if width.Kind == checkruntime.Int4ValueValue {
			length := langruntime.CheckedI32(width.Value)
			if explicit.Kind == checkruntime.BoolValueValue {
				isExplicit := explicit.Value
				current := checkruntime.BitPayloadLength(value)
				if length <= 0 || length > bitMaxLength || length == current {
					return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: value}
				}
				if varying && length > current {
					return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: value}
				}
				if isExplicit == false {
					if varying {
						return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(bitStringRightTruncation)}
					}
					return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(bitStringLengthMismatch)}
				}
				chars := []rune(value)
				output := ""
				index := 0
				count := 0
				for count < length {
					ch := '0'
					if index < len(chars) {
						ch = langruntime.CheckedChar(chars[index])
					}
					output = output + string(langruntime.CheckedChar(ch))
					index = langruntime.CheckedAdd(index, 1)
					count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
				}
				return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
			}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func BitEqck(input checkruntime.BitValue, width checkruntime.Int4Value, explicit checkruntime.BoolValue) checkruntime.BitValue {
	return bitCoerce(input, width, explicit, false)
}
func Varbit7ap7(input checkruntime.BitValue, width checkruntime.Int4Value, explicit checkruntime.BoolValue) checkruntime.BitValue {
	return bitCoerce(input, width, explicit, true)
}
func BitCountFri1(input checkruntime.BitValue) checkruntime.Int8Value {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		index := 0
		count := int64(0)
		for index < len(chars) {
			if chars[index] == '1' {
				count = langruntime.CheckedI64Add(count, int64(1))
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: count}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}

const bitArraySubscriptError = 3452630
const bitProgramLimitExceeded = 8584704

func bitConcatLength(left int, right int) checkruntime.Int4Value {
	left = langruntime.CheckedI32(left)
	right = langruntime.CheckedI32(right)
	if left > langruntime.CheckedSignedSubtract(bitMaxLength, right) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(bitProgramLimitExceeded)}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedAdd(left, right)}
}
func BitcatT5mn(left checkruntime.BitValue, right checkruntime.BitValue) checkruntime.BitValue {
	if left.Kind == checkruntime.BitValueError {
		error := left.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if right.Kind == checkruntime.BitValueError {
		error := right.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if left == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || right == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if left == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || right == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if left.Kind == checkruntime.BitValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.BitValueValue {
			b := langruntime.CheckedString(right.Value)
			first := checkruntime.BitPayloadLength(a)
			second := checkruntime.BitPayloadLength(b)
			length := bitConcatLength(first, second)
			if length.Kind == checkruntime.Int4ValueError {
				error := length.Error
				return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
			}
			output := a
			output = output + b
			return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func GetBitYgqy(input checkruntime.BitValue, position checkruntime.Int4Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			offset := langruntime.CheckedI32(position.Value)
			if offset < 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(bitArraySubscriptError)}
			}
			chars := []rune(value)
			index := 0
			current := 0
			for index < len(chars) {
				if current == offset {
					if chars[index] == '1' {
						return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
					}
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
				}
				index = langruntime.CheckedAdd(index, 1)
				current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(bitArraySubscriptError)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func SetBit2mfa(input checkruntime.BitValue, position checkruntime.Int4Value, replacement checkruntime.Int4Value) checkruntime.BitValue {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if replacement.Kind == checkruntime.Int4ValueError {
		error := replacement.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || replacement == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || replacement == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			offset := langruntime.CheckedI32(position.Value)
			if replacement.Kind == checkruntime.Int4ValueValue {
				bit := langruntime.CheckedI32(replacement.Value)
				length := checkruntime.BitPayloadLength(value)
				if offset < 0 || offset >= length {
					return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(bitArraySubscriptError)}
				}
				if bit != 0 && bit != 1 {
					return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(sqlstateInvalidParameterValue)}
				}
				chars := []rune(value)
				output := ""
				index := 0
				current := 0
				for index < len(chars) {
					ch := chars[index]
					if current == offset {
						ch = langruntime.CheckedChar('0')
						if bit == 1 {
							ch = langruntime.CheckedChar('1')
						}
					}
					output = output + string(langruntime.CheckedChar(ch))
					index = langruntime.CheckedAdd(index, 1)
					current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
				}
				return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
			}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func bitIntegerEncode(input int64, requested int) string {
	requested = langruntime.CheckedI32(requested)
	width := requested
	if width <= 0 || width > bitMaxLength {
		width = langruntime.CheckedI32(1)
	}
	remaining := input
	reversed := ""
	count := 0
	for count < width {
		odd := langruntime.CheckedI64Remainder(remaining, int64(2)) != int64(0)
		if odd {
			reversed = reversed + string(langruntime.CheckedChar('1'))
		} else {
			reversed = reversed + string(langruntime.CheckedChar('0'))
		}
		negative := remaining < int64(0)
		remaining = langruntime.CheckedI64Divide(remaining, int64(2))
		if negative && odd {
			remaining = langruntime.CheckedI64Subtract(remaining, int64(1))
		}
		count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
	}
	chars := []rune(reversed)
	index := len(chars)
	output := ""
	for index > 0 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		output = output + string(langruntime.CheckedChar(chars[index]))
	}
	return output
}
func bitIntegerDecode(input string, signedWidth int) int64 {
	input = langruntime.CheckedString(input)
	signedWidth = langruntime.CheckedIndex(signedWidth)
	chars := []rune(input)
	result := int64(0)
	index := 0
	if len(chars) == signedWidth {
		if chars[0] == '1' {
			result = int64(-1)
		}
		index = langruntime.CheckedIndex(1)
	}
	for index < len(chars) {
		result = langruntime.CheckedI64Multiply(result, int64(2))
		if chars[index] == '1' {
			result = langruntime.CheckedI64Add(result, int64(1))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return result
}
func BitM5gi(input checkruntime.Int4Value, width checkruntime.Int4Value) checkruntime.BitValue {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if width.Kind == checkruntime.Int4ValueError {
		error := width.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || width == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || width == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if width.Kind == checkruntime.Int4ValueValue {
			length := langruntime.CheckedI32(width.Value)
			widened := int64(langruntime.CheckedI32(value))
			return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: bitIntegerEncode(widened, length)}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func Bit1ahy(input checkruntime.Int8Value, width checkruntime.Int4Value) checkruntime.BitValue {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if width.Kind == checkruntime.Int4ValueError {
		error := width.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || width == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || width == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		if width.Kind == checkruntime.Int4ValueValue {
			length := langruntime.CheckedI32(width.Value)
			return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: bitIntegerEncode(value, length)}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func Int4Lp2l(input checkruntime.BitValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if checkruntime.BitPayloadLength(value) > 32 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		result := bitIntegerDecode(value, 32)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: int(int32(result))}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int809r6(input checkruntime.BitValue) checkruntime.Int8Value {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if checkruntime.BitPayloadLength(value) > 64 {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: bitIntegerDecode(value, 64)}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func BitSend1fyo(input checkruntime.BitValue) checkruntime.ByteaValue {
	return VarbitSendYt0j(input)
}
func VarbitSendYt0j(input checkruntime.BitValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		length := checkruntime.BitPayloadLength(value)
		output := ""
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedDivide(length, 16777216)))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(length, 65536), 256)))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(length, 256), 256)))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedRemainder(length, 256)))
		chars := []rune(value)
		index := 0
		for index < len(chars) {
			byte := 0
			bit := 0
			for bit < 8 {
				byte = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(byte, 2))
				if index < len(chars) {
					if chars[index] == '1' {
						byte = langruntime.CheckedI32(langruntime.CheckedSignedAdd(byte, 1))
					}
					index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
				}
				bit = langruntime.CheckedIndex(langruntime.CheckedAdd(bit, 1))
			}
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, byte))
		}
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func bitOverlay(input checkruntime.BitValue, replacement checkruntime.BitValue, position checkruntime.Int4Value, length checkruntime.Int4Value, hasLength bool) checkruntime.BitValue {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if replacement.Kind == checkruntime.BitValueError {
		error := replacement.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || replacement == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || replacement == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if replacement.Kind == checkruntime.BitValueValue {
		bits := langruntime.CheckedString(replacement.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			start := langruntime.CheckedI32(position.Value)
			if length.Kind == checkruntime.Int4ValueValue {
				supplied := langruntime.CheckedI32(length.Value)
				if start <= 0 {
					return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(bitSubstringError)}
				}
				count := supplied
				if hasLength == false {
					count = langruntime.CheckedI32(checkruntime.BitPayloadLength(bits))
				}
				if count > 0 && start > langruntime.CheckedSignedSubtract(2147483647, count) {
					return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
				}
				end := langruntime.CheckedSignedAdd(start, count)
				prefix := bitSubstring(input, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(start, 1)}, true)
				suffix := bitSubstring(input, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: end}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
				combined := BitcatT5mn(prefix, checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: bits})
				return BitcatT5mn(combined, suffix)
			}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func OverlayDac4(input checkruntime.BitValue, replacement checkruntime.BitValue, position checkruntime.Int4Value) checkruntime.BitValue {
	return bitOverlay(input, replacement, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func OverlayMoi0(input checkruntime.BitValue, replacement checkruntime.BitValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.BitValue {
	return bitOverlay(input, replacement, position, length, true)
}
func Position93b9(input checkruntime.BitValue, pattern checkruntime.BitValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if pattern.Kind == checkruntime.BitValueError {
		error := pattern.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || pattern == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || pattern == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if pattern.Kind == checkruntime.BitValueValue {
			needle := langruntime.CheckedString(pattern.Value)
			length := checkruntime.BitPayloadLength(value)
			patternLength := checkruntime.BitPayloadLength(needle)
			if length == 0 || patternLength > length {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			if patternLength == 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			chars := []rune(value)
			patternChars := []rune(needle)
			last := langruntime.CheckedSubtract(len(chars), len(patternChars))
			start := 0
			position := 1
			for start <= last {
				index := 0
				matches := true
				for index < len(patternChars) && matches {
					if chars[langruntime.CheckedAdd(start, index)] != patternChars[index] {
						matches = false
					}
					index = langruntime.CheckedAdd(index, 1)
				}
				if matches {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: position}
				}
				start = langruntime.CheckedAdd(start, 1)
				position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}

const bitSubstringError = 3452581

func bitSubstring(input checkruntime.BitValue, position checkruntime.Int4Value, length checkruntime.Int4Value, hasLength bool) checkruntime.BitValue {
	if input.Kind == checkruntime.BitValueError {
		error := input.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: error}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
	}
	if input == (checkruntime.BitValue{Kind: checkruntime.BitValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BitValue{Kind: checkruntime.BitValueNull}
	}
	if input.Kind == checkruntime.BitValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			start := langruntime.CheckedI32(position.Value)
			if length.Kind == checkruntime.Int4ValueValue {
				count := langruntime.CheckedI32(length.Value)
				if hasLength && count < 0 {
					return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: checkruntime.MakeSqlError(bitSubstringError)}
				}
				bitlen := checkruntime.BitPayloadLength(value)
				first := start
				if first < 1 {
					first = langruntime.CheckedI32(1)
				}
				end := langruntime.CheckedSignedAdd(bitlen, 1)
				if hasLength && start <= langruntime.CheckedSignedSubtract(2147483647, count) {
					end = langruntime.CheckedI32(langruntime.CheckedSignedAdd(start, count))
					if end > langruntime.CheckedSignedAdd(bitlen, 1) {
						end = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bitlen, 1))
					}
				}
				output := ""
				if first > bitlen || end <= first {
					return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
				}
				chars := []rune(value)
				index := 0
				current := 1
				for index < len(chars) && current < end {
					if current >= first {
						output = output + string(langruntime.CheckedChar(chars[index]))
					}
					index = langruntime.CheckedAdd(index, 1)
					current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
				}
				return checkruntime.BitValue{Kind: checkruntime.BitValueValue, Value: output}
			}
		}
	}
	return checkruntime.BitValue{Kind: checkruntime.BitValueUnknown}
}
func SubstringDfdi(input checkruntime.BitValue, position checkruntime.Int4Value) checkruntime.BitValue {
	return bitSubstring(input, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func SubstringPr1e(input checkruntime.BitValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.BitValue {
	return bitSubstring(input, position, length, true)
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
func byteaAsciiCharacter(value int) rune {
	value = langruntime.CheckedI32(value)
	chars := []rune("\x00\x01\x02\x03\x04\x05\x06\a\b\t\n\v\f\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f")
	index := 0
	count := value
	for count > 0 {
		index = langruntime.CheckedAdd(index, 1)
		count = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(count, 1))
	}
	return chars[index]
}

const byteaMaxLength = 1073741819
const byteaAllocationError = 56966976

func byteaConcatLength(left int, right int) checkruntime.Int4Value {
	left = langruntime.CheckedI32(left)
	right = langruntime.CheckedI32(right)
	if left > langruntime.CheckedSignedSubtract(byteaMaxLength, right) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(byteaAllocationError)}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedAdd(left, right)}
}
func ByteacatZitv(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.ByteaValue {
	if left.Kind == checkruntime.ByteaValueError {
		error := left.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if right.Kind == checkruntime.ByteaValueError {
		error := right.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if left.Kind == checkruntime.ByteaValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.ByteaValueValue {
			b := langruntime.CheckedString(right.Value)
			first := byteaPayloadLength(a)
			second := byteaPayloadLength(b)
			length := byteaConcatLength(first, second)
			if length.Kind == checkruntime.Int4ValueError {
				error := length.Error
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
			}
			output := a
			output = output + b
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func byteaCompare(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.ByteaValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.ByteaValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || right == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.ByteaValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.ByteaValueValue {
			b := langruntime.CheckedString(right.Value)
			first := []rune(a)
			second := []rune(b)
			index := 0
			for index < len(first) && index < len(second) {
				highA := checkruntime.HexDigit(first[index])
				lowA := checkruntime.HexDigit(first[langruntime.CheckedAdd(index, 1)])
				highB := checkruntime.HexDigit(second[index])
				lowB := checkruntime.HexDigit(second[langruntime.CheckedAdd(index, 1)])
				aByte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(highA, 16), lowA)
				bByte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(highB, 16), lowB)
				if aByte != bByte {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(aByte, bByte)}
				}
				index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
			}
			if len(first) < len(second) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if len(first) > len(second) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Byteacmp2x4q(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.Int4Value {
	return byteaCompare(left, right)
}
func BytealtBe6e(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.BoolValue {
	result := byteaCompare(left, right)
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
func BytealeVi7d(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.BoolValue {
	result := byteaCompare(left, right)
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
func Byteagt221r(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.BoolValue {
	result := byteaCompare(left, right)
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
func ByteagePaor(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.BoolValue {
	result := byteaCompare(left, right)
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
func ByteaLargerIqg1(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.ByteaValue {
	result := byteaCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		if order > 0 {
			return left
		}
		return right
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func ByteaSmallerIook(left checkruntime.ByteaValue, right checkruntime.ByteaValue) checkruntime.ByteaValue {
	result := byteaCompare(left, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		if order < 0 {
			return left
		}
		return right
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func byteaLength(input checkruntime.ByteaValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		index := 0
		length := 0
		for index < len(chars) {
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
			length = langruntime.CheckedI32(langruntime.CheckedSignedAdd(length, 1))
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: length}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func LengthJ2mn(input checkruntime.ByteaValue) checkruntime.Int4Value {
	return byteaLength(input)
}
func OctetLengthEml7(input checkruntime.ByteaValue) checkruntime.Int4Value {
	return byteaLength(input)
}
func BitLengthGryu(input checkruntime.ByteaValue) checkruntime.Int4Value {
	length := byteaLength(input)
	if length.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(length.Value)
		return Int4mul284v(checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: value}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 8})
	}
	return length
}
func BitCountU0pl(input checkruntime.ByteaValue) checkruntime.Int8Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		index := 0
		count := int64(0)
		for index < len(chars) {
			digit := checkruntime.HexDigit(chars[index])
			for digit > 0 {
				if langruntime.CheckedSignedRemainder(digit, 2) == 1 {
					count = langruntime.CheckedI64Add(count, int64(1))
				}
				digit = langruntime.CheckedI32(langruntime.CheckedSignedDivide(digit, 2))
			}
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 1))
		}
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: count}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func ReverseW0od(input checkruntime.ByteaValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return input
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		index := len(chars)
		output := ""
		for index > 0 {
			index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 2))
			output = output + string(langruntime.CheckedChar(chars[index]))
			output = output + string(langruntime.CheckedChar(chars[langruntime.CheckedAdd(index, 1)]))
		}
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Byteasend3q2t(input checkruntime.ByteaValue) checkruntime.ByteaValue {
	return input
}

const byteaArraySubscriptError = 3452630

func byteaPayloadLength(input string) int {
	input = langruntime.CheckedString(input)
	chars := []rune(input)
	index := 0
	length := 0
	for index < len(chars) {
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		length = langruntime.CheckedI32(langruntime.CheckedSignedAdd(length, 1))
	}
	return length
}
func byteaReadByte(input string, position int) int {
	input = langruntime.CheckedString(input)
	position = langruntime.CheckedI32(position)
	chars := []rune(input)
	index := 0
	current := 0
	for current < position {
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
	}
	high := checkruntime.HexDigit(chars[index])
	low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
	return langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
}
func byteaPatchByte(input string, position int, replacement int) string {
	input = langruntime.CheckedString(input)
	position = langruntime.CheckedI32(position)
	replacement = langruntime.CheckedI32(replacement)
	chars := []rune(input)
	index := 0
	current := 0
	output := ""
	for index < len(chars) {
		if current == position {
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, replacement))
		} else {
			output = output + string(langruntime.CheckedChar(chars[index]))
			output = output + string(langruntime.CheckedChar(chars[langruntime.CheckedAdd(index, 1)]))
		}
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
	}
	return output
}
func byteaBitMask(position int) int {
	position = langruntime.CheckedI32(position)
	remaining := position
	mask := 1
	for remaining > 0 {
		mask = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(mask, 2))
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	return mask
}
func GetByte48am(input checkruntime.ByteaValue, position checkruntime.Int4Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			offset := langruntime.CheckedI32(position.Value)
			length := byteaPayloadLength(value)
			if offset < 0 || offset >= length {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(byteaArraySubscriptError)}
			}
			byte := byteaReadByte(value, offset)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: byte}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func GetBitThv7(input checkruntime.ByteaValue, position checkruntime.Int8Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if position.Kind == checkruntime.Int8ValueError {
		error := position.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || position == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || position == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int8ValueValue {
			offset := position.Value
			length := byteaPayloadLength(value)
			wideLength := int64(langruntime.CheckedI32(length))
			bitLength := langruntime.CheckedI64Multiply(wideLength, int64(8))
			if offset < int64(0) || offset >= bitLength {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(byteaArraySubscriptError)}
			}
			wideByte := langruntime.CheckedI64Divide(offset, int64(8))
			bytePosition := int(int32(wideByte))
			wideBit := langruntime.CheckedI64Remainder(offset, int64(8))
			bitPosition := int(int32(wideBit))
			byte := byteaReadByte(value, bytePosition)
			mask := byteaBitMask(bitPosition)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(byte, mask)), 2)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func SetByte8mtw(input checkruntime.ByteaValue, position checkruntime.Int4Value, replacement checkruntime.Int4Value) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if replacement.Kind == checkruntime.Int4ValueError {
		error := replacement.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || replacement == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || replacement == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			offset := langruntime.CheckedI32(position.Value)
			if replacement.Kind == checkruntime.Int4ValueValue {
				newValue := langruntime.CheckedI32(replacement.Value)
				length := byteaPayloadLength(value)
				if offset < 0 || offset >= length {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaArraySubscriptError)}
				}
				newByte := langruntime.CheckedSignedRemainder(newValue, 256)
				if newByte < 0 {
					newByte = langruntime.CheckedI32(langruntime.CheckedSignedAdd(newByte, 256))
				}
				output := byteaPatchByte(value, offset, newByte)
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
			}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func SetBit06f4(input checkruntime.ByteaValue, position checkruntime.Int8Value, replacement checkruntime.Int4Value) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if position.Kind == checkruntime.Int8ValueError {
		error := position.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if replacement.Kind == checkruntime.Int4ValueError {
		error := replacement.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || position == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || replacement == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || position == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || replacement == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int8ValueValue {
			offset := position.Value
			if replacement.Kind == checkruntime.Int4ValueValue {
				newValue := langruntime.CheckedI32(replacement.Value)
				length := byteaPayloadLength(value)
				wideLength := int64(langruntime.CheckedI32(length))
				bitLength := langruntime.CheckedI64Multiply(wideLength, int64(8))
				if offset < int64(0) || offset >= bitLength {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaArraySubscriptError)}
				}
				if newValue != 0 && newValue != 1 {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(sqlstateInvalidParameterValue)}
				}
				wideByte := langruntime.CheckedI64Divide(offset, int64(8))
				bytePosition := int(int32(wideByte))
				wideBit := langruntime.CheckedI64Remainder(offset, int64(8))
				bitPosition := int(int32(wideBit))
				byte := byteaReadByte(value, bytePosition)
				mask := byteaBitMask(bitPosition)
				oldBit := langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(byte, mask)), 2)
				difference := langruntime.CheckedSignedMultiply((langruntime.CheckedSignedSubtract(newValue, oldBit)), mask)
				newByte := langruntime.CheckedSignedAdd(byte, difference)
				output := byteaPatchByte(value, bytePosition, newByte)
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
			}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}

const byteaEncodingError = 3452619
const byteaSyntaxError = 3484946
const byteaCodecLimit = 8584704

func byteaCodecLengthFits(length int64) bool {
	return length <= int64(1073741819)
}
func byteaBase64EncodedLength(length int64) int64 {
	return langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(langruntime.CheckedI64Divide((langruntime.CheckedI64Add(length, int64(2))), int64(3)), int64(4)), langruntime.CheckedI64Divide(length, int64(57)))
}
func byteaCodecUtf8Length(value string) int64 {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	index := 0
	length := int64(0)
	for index < len(chars) {
		codepoint := int(langruntime.CheckedChar(chars[index]))
		if codepoint <= 127 {
			length = langruntime.CheckedI64Add(length, int64(1))
		} else if codepoint <= 2047 {
			length = langruntime.CheckedI64Add(length, int64(2))
		} else if codepoint <= 65535 {
			length = langruntime.CheckedI64Add(length, int64(3))
		} else {
			length = langruntime.CheckedI64Add(length, int64(4))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return length
}
func byteaEscapeEncodedLength(value string) int64 {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	index := 0
	length := int64(0)
	for index < len(chars) {
		high := checkruntime.HexDigit(chars[index])
		low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
		byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
		if byte == 0 || byte >= 128 {
			length = langruntime.CheckedI64Add(length, int64(4))
		} else if byte == 92 {
			length = langruntime.CheckedI64Add(length, int64(2))
		} else {
			length = langruntime.CheckedI64Add(length, int64(1))
		}
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
	}
	return length
}
func byteaFormatIs(input string, expected string) bool {
	input = langruntime.CheckedString(input)
	expected = langruntime.CheckedString(expected)
	chars := []rune(input)
	spelling := []rune(expected)
	if len(chars) != len(spelling) {
		return false
	}
	index := 0
	for index < len(chars) {
		if langruntime.AsciiLowercase(chars[index]) != spelling[index] {
			return false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return true
}
func byteaCodecSpace(value rune) bool {
	value = langruntime.CheckedChar(value)
	return value == ' ' || value == '\t' || value == '\r' || value == '\n'
}
func byteaBase64Digit(value rune) int {
	value = langruntime.CheckedChar(value)
	alphabet := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")
	index := 0
	number := 0
	for index < len(alphabet) {
		if alphabet[index] == value {
			return number
		}
		index = langruntime.CheckedAdd(index, 1)
		number = langruntime.CheckedI32(langruntime.CheckedSignedAdd(number, 1))
	}
	return langruntime.CheckedSignedNegate(1)
}
func byteaBase64Character(value int) rune {
	value = langruntime.CheckedI32(value)
	alphabet := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")
	index := 0
	remaining := value
	for remaining > 0 {
		index = langruntime.CheckedAdd(index, 1)
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	return alphabet[index]
}
func byteaBase64Encode(value string) string {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	output := ""
	index := 0
	packed := 0
	count := 0
	line := 0
	for index < len(chars) {
		high := checkruntime.HexDigit(chars[index])
		low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
		byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
		packed = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(packed, 256), byte))
		count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		if count == 3 {
			a := byteaBase64Character(langruntime.CheckedSignedDivide(packed, 262144))
			b := byteaBase64Character(langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(packed, 4096), 64))
			c := byteaBase64Character(langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(packed, 64), 64))
			d := byteaBase64Character(langruntime.CheckedSignedRemainder(packed, 64))
			output = output + string(langruntime.CheckedChar(a))
			output = output + string(langruntime.CheckedChar(b))
			output = output + string(langruntime.CheckedChar(c))
			output = output + string(langruntime.CheckedChar(d))
			packed = langruntime.CheckedI32(0)
			count = langruntime.CheckedI32(0)
			line = langruntime.CheckedI32(langruntime.CheckedSignedAdd(line, 4))
			if line == 76 {
				output = output + string(langruntime.CheckedChar('\n'))
				line = langruntime.CheckedI32(0)
			}
		}
	}
	if count != 0 {
		if count == 1 {
			packed = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(packed, 65536))
		} else {
			packed = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(packed, 256))
		}
		a := byteaBase64Character(langruntime.CheckedSignedDivide(packed, 262144))
		b := byteaBase64Character(langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(packed, 4096), 64))
		output = output + string(langruntime.CheckedChar(a))
		output = output + string(langruntime.CheckedChar(b))
		if count == 2 {
			c := byteaBase64Character(langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(packed, 64), 64))
			output = output + string(langruntime.CheckedChar(c))
		} else {
			output = output + string(langruntime.CheckedChar('='))
		}
		output = output + string(langruntime.CheckedChar('='))
	}
	return output
}
func byteaBase64Decode(value string) checkruntime.ByteaValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	output := ""
	index := 0
	packed := 0
	count := 0
	end := 0
	for index < len(chars) {
		character := chars[index]
		index = langruntime.CheckedAdd(index, 1)
		if byteaCodecSpace(character) == false {
			digit := 0
			if character == '=' {
				if end == 0 {
					if count == 2 {
						end = langruntime.CheckedI32(1)
					} else if count == 3 {
						end = langruntime.CheckedI32(2)
					} else {
						return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
					}
				}
			} else {
				digit = langruntime.CheckedI32(byteaBase64Digit(character))
				if digit < 0 {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
				}
			}
			packed = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(packed, 64), digit))
			count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
			if count == 4 {
				output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(packed, 65536), 256)))
				if end == 0 || end > 1 {
					output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(packed, 256), 256)))
				}
				if end == 0 || end > 2 {
					output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedRemainder(packed, 256)))
				}
				packed = langruntime.CheckedI32(0)
				count = langruntime.CheckedI32(0)
			}
		}
	}
	if count != 0 {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
}
func byteaHexDecode(value string) checkruntime.ByteaValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	output := ""
	index := 0
	for index < len(chars) {
		if byteaCodecSpace(chars[index]) {
			index = langruntime.CheckedAdd(index, 1)
		} else {
			high := checkruntime.HexDigit(chars[index])
			index = langruntime.CheckedAdd(index, 1)
			if high > 15 || index >= len(chars) {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
			}
			low := checkruntime.HexDigit(chars[index])
			index = langruntime.CheckedAdd(index, 1)
			if low > 15 {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
			}
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)))
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
}
func byteaOctalDigit(value rune) int {
	value = langruntime.CheckedChar(value)
	if value == '0' {
		return 0
	}
	if value == '1' {
		return 1
	}
	if value == '2' {
		return 2
	}
	if value == '3' {
		return 3
	}
	if value == '4' {
		return 4
	}
	if value == '5' {
		return 5
	}
	if value == '6' {
		return 6
	}
	if value == '7' {
		return 7
	}
	return 8
}
func byteaEscapeDecodedLength(value string) checkruntime.Int8Value {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	index := 0
	length := int64(0)
	for index < len(chars) {
		character := chars[index]
		index = langruntime.CheckedAdd(index, 1)
		if character != '\\' {
			codepoint := int(langruntime.CheckedChar(character))
			if codepoint <= 127 {
				length = langruntime.CheckedI64Add(length, int64(1))
			} else if codepoint <= 2047 {
				length = langruntime.CheckedI64Add(length, int64(2))
			} else if codepoint <= 65535 {
				length = langruntime.CheckedI64Add(length, int64(3))
			} else {
				length = langruntime.CheckedI64Add(length, int64(4))
			}
		} else if langruntime.CheckedAdd(index, 2) < len(chars) && byteaOctalDigit(chars[index]) <= 3 && byteaOctalDigit(chars[langruntime.CheckedAdd(index, 1)]) <= 7 && byteaOctalDigit(chars[langruntime.CheckedAdd(index, 2)]) <= 7 {
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 3))
			length = langruntime.CheckedI64Add(length, int64(1))
		} else if index < len(chars) && chars[index] == '\\' {
			index = langruntime.CheckedAdd(index, 1)
			length = langruntime.CheckedI64Add(length, int64(1))
		} else {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(byteaSyntaxError)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: length}
}
func byteaEscapeDecode(value string) checkruntime.ByteaValue {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	output := ""
	index := 0
	for index < len(chars) {
		character := chars[index]
		index = langruntime.CheckedAdd(index, 1)
		if character != '\\' {
			output = langruntime.CheckedString(byteaUtf8Character(output, character))
		} else if index < len(chars) && chars[index] == '\\' {
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, 92))
			index = langruntime.CheckedAdd(index, 1)
		} else if langruntime.CheckedAdd(index, 2) < len(chars) {
			a := byteaOctalDigit(chars[index])
			b := byteaOctalDigit(chars[langruntime.CheckedAdd(index, 1)])
			c := byteaOctalDigit(chars[langruntime.CheckedAdd(index, 2)])
			if a > 3 || b > 7 || c > 7 {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaSyntaxError)}
			}
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(a, 64), langruntime.CheckedSignedMultiply(b, 8)), c)))
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 3))
		} else {
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaSyntaxError)}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
}
func byteaEscapeEncode(value string) string {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	output := ""
	index := 0
	for index < len(chars) {
		high := checkruntime.HexDigit(chars[index])
		low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
		byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
		if byte == 0 || byte >= 128 {
			output = output + string(langruntime.CheckedChar('\\'))
			a := byteaAsciiCharacter(langruntime.CheckedSignedAdd(langruntime.CheckedSignedDivide(byte, 64), 48))
			b := byteaAsciiCharacter(langruntime.CheckedSignedAdd(langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(byte, 8), 8), 48))
			c := byteaAsciiCharacter(langruntime.CheckedSignedAdd(langruntime.CheckedSignedRemainder(byte, 8), 48))
			output = output + string(langruntime.CheckedChar(a))
			output = output + string(langruntime.CheckedChar(b))
			output = output + string(langruntime.CheckedChar(c))
		} else if byte == 92 {
			output = output + string(langruntime.CheckedChar('\\'))
			output = output + string(langruntime.CheckedChar('\\'))
		} else {
			character := byteaAsciiCharacter(byte)
			output = output + string(langruntime.CheckedChar(character))
		}
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
	}
	return output
}
func EncodeBvkp(input checkruntime.ByteaValue, format checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if format.Kind == checkruntime.TextValueError {
		error := format.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || format == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || format == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if format.Kind == checkruntime.TextValueValue {
			name := langruntime.CheckedString(format.Value)
			if byteaFormatIs(name, "hex") {
				length := byteaPayloadLength(value)
				encoded := int64(langruntime.CheckedI32(length))
				if byteaCodecLengthFits(langruntime.CheckedI64Multiply(encoded, int64(2))) == false {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(byteaCodecLimit)}
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: value}
			}
			if byteaFormatIs(name, "base64") {
				length := byteaPayloadLength(value)
				bytes := int64(langruntime.CheckedI32(length))
				encoded := byteaBase64EncodedLength(bytes)
				if byteaCodecLengthFits(encoded) == false {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(byteaCodecLimit)}
				}
				result := byteaBase64Encode(value)
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: result}
			}
			if byteaFormatIs(name, "escape") {
				encoded := byteaEscapeEncodedLength(value)
				if byteaCodecLengthFits(encoded) == false {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(byteaCodecLimit)}
				}
				result := byteaEscapeEncode(value)
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: result}
			}
			return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func DecodeB6gt(input checkruntime.TextValue, format checkruntime.TextValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if format.Kind == checkruntime.TextValueError {
		error := format.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || format == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || format == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		if format.Kind == checkruntime.TextValueValue {
			name := langruntime.CheckedString(format.Value)
			if byteaFormatIs(name, "hex") {
				bytes := byteaCodecUtf8Length(value)
				if byteaCodecLengthFits(langruntime.CheckedI64Divide(bytes, int64(2))) == false {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaCodecLimit)}
				}
				return byteaHexDecode(value)
			}
			if byteaFormatIs(name, "base64") {
				bytes := byteaCodecUtf8Length(value)
				if byteaCodecLengthFits(langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(bytes, int64(3)), int64(4))) == false {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaCodecLimit)}
				}
				return byteaBase64Decode(value)
			}
			if byteaFormatIs(name, "escape") {
				estimate := byteaEscapeDecodedLength(value)
				if estimate.Kind == checkruntime.Int8ValueError {
					error := estimate.Error
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
				}
				if estimate.Kind == checkruntime.Int8ValueValue {
					length := estimate.Value
					if byteaCodecLengthFits(length) == false {
						return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaCodecLimit)}
					}
				}
				return byteaEscapeDecode(value)
			}
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEncodingError)}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func byteaHashBytes(value string) []checkruntime.HashByte {
	value = langruntime.CheckedString(value)
	chars := []rune(value)
	bytes := []checkruntime.HashByte{}
	index := 0
	for index < len(chars) {
		high := checkruntime.HexDigit(chars[index])
		low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
		byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(byte))}))
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
	}
	return bytes
}
func HashbyteaMypt(input checkruntime.ByteaValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		bytes := byteaHashBytes(value)
		hash := checkruntime.HashBytes32(bytes)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: hash}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func HashbyteaextendedU1vz(input checkruntime.ByteaValue, seed checkruntime.Int8Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if seed.Kind == checkruntime.Int8ValueError {
		error := seed.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if seed.Kind == checkruntime.Int8ValueValue {
			salt := seed.Value
			bytes := byteaHashBytes(value)
			hash := checkruntime.HashBytes64(bytes, salt)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: hash}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func byteaCrc(input checkruntime.ByteaValue, polynomial int64) checkruntime.Int8Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		crc := int64(4294967295)
		index := 0
		for index < len(chars) {
			high := checkruntime.HexDigit(chars[index])
			low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
			byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
			wideByte := int64(langruntime.CheckedI32(byte))
			crc = checkruntime.HashXor(crc, wideByte)
			bit := 0
			for bit < 8 {
				lowBit := langruntime.CheckedI64Remainder(crc, int64(2))
				crc = langruntime.CheckedI64Divide(crc, int64(2))
				if lowBit == int64(1) {
					crc = checkruntime.HashXor(crc, polynomial)
				}
				bit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bit, 1))
			}
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		}
		result := langruntime.CheckedI64Subtract(int64(4294967295), crc)
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Crc320obw(input checkruntime.ByteaValue) checkruntime.Int8Value {
	return byteaCrc(input, int64(3988292384))
}
func Crc32cF1hu(input checkruntime.ByteaValue) checkruntime.Int8Value {
	return byteaCrc(input, int64(2197175160))
}
func ByteaFromText(input checkruntime.TextValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		if len(chars) >= 2 && chars[0] == '\\' && chars[1] == 'x' {
			length := langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(byteaCodecUtf8Length(value), int64(2))), int64(2))
			if byteaCodecLengthFits(length) == false {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaAllocationError)}
			}
			payload := ""
			index := 2
			for index < len(chars) {
				payload = payload + string(langruntime.CheckedChar(chars[index]))
				index = langruntime.CheckedAdd(index, 1)
			}
			return byteaHexDecode(payload)
		}
		estimate := byteaEscapeDecodedLength(value)
		if estimate.Kind == checkruntime.Int8ValueError {
			error := estimate.Error
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
		}
		if estimate.Kind == checkruntime.Int8ValueValue {
			length := estimate.Value
			if byteaCodecLengthFits(length) == false {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaAllocationError)}
			}
		}
		return byteaEscapeDecode(value)
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func byteaIntegerValue(input checkruntime.ByteaValue, width int) checkruntime.Int8Value {
	width = langruntime.CheckedI32(width)
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		length := byteaPayloadLength(value)
		if length > width {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
		}
		chars := []rune(value)
		index := 0
		result := int64(0)
		for index < len(chars) {
			high := checkruntime.HexDigit(chars[index])
			low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
			byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
			if index == 0 && length == width && byte >= 128 {
				byte = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(byte, 256))
			}
			wideByte := int64(langruntime.CheckedI32(byte))
			result = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(result, int64(256)), wideByte)
			index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		}
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func byteaIntegerSend(value int64, width int) string {
	width = langruntime.CheckedI32(width)
	remaining := value
	bytes := []checkruntime.HashByte{}
	index := 0
	for index < width {
		wideByte := langruntime.CheckedI64Remainder(remaining, int64(256))
		if wideByte < int64(0) {
			wideByte = langruntime.CheckedI64Add(wideByte, int64(256))
		}
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: wideByte}))
		remaining = langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(remaining, wideByte)), int64(256))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	output := ""
	position := len(bytes)
	for position > 0 {
		position = langruntime.CheckedIndex(langruntime.CheckedSubtract(position, 1))
		byte := int(int32(bytes[position].Value))
		output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, byte))
	}
	return output
}
func Int2Hj0w(input checkruntime.ByteaValue) checkruntime.Int2Value {
	result := byteaIntegerValue(input, 2)
	if result.Kind == checkruntime.Int8ValueError {
		error := result.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if result == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if result == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if result.Kind == checkruntime.Int8ValueValue {
		value := result.Value
		narrowed := int(int32(value))
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: narrowed}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func Int4Lvgc(input checkruntime.ByteaValue) checkruntime.Int4Value {
	result := byteaIntegerValue(input, 4)
	if result.Kind == checkruntime.Int8ValueError {
		error := result.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if result == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if result == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if result.Kind == checkruntime.Int8ValueValue {
		value := result.Value
		narrowed := int(int32(value))
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: narrowed}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int8Ih14(input checkruntime.ByteaValue) checkruntime.Int8Value {
	return byteaIntegerValue(input, 8)
}
func Int2send5wzj(input checkruntime.Int2Value) checkruntime.ByteaValue {
	if input.Kind == checkruntime.Int2ValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.Int2ValueValue {
		value := langruntime.CheckedI32(input.Value)
		wideValue := int64(langruntime.CheckedI32(value))
		output := byteaIntegerSend(wideValue, 2)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func ByteaMcxl(input checkruntime.Int2Value) checkruntime.ByteaValue {
	return Int2send5wzj(input)
}
func Int4sendFjzt(input checkruntime.Int4Value) checkruntime.ByteaValue {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		wideValue := int64(langruntime.CheckedI32(value))
		output := byteaIntegerSend(wideValue, 4)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Bytea4poi(input checkruntime.Int4Value) checkruntime.ByteaValue {
	return Int4sendFjzt(input)
}
func Int8sendPjz0(input checkruntime.Int8Value) checkruntime.ByteaValue {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		wideValue := value
		output := byteaIntegerSend(wideValue, 8)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Bytea0om8(input checkruntime.Int8Value) checkruntime.ByteaValue {
	return Int8sendPjz0(input)
}
func DateSendI2tv(input checkruntime.DateValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.DateValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.DateValueValue {
		value := langruntime.CheckedI32(input.Value)
		wideValue := int64(langruntime.CheckedI32(value))
		output := byteaIntegerSend(wideValue, 4)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func TimestampSend3syx(input checkruntime.TimestampValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.TimestampValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.TimestampValueValue {
		value := input.Value
		wideValue := value
		output := byteaIntegerSend(wideValue, 8)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func TimestamptzSendJyu1(input checkruntime.TimestamptzValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.TimestamptzValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.TimestamptzValueValue {
		value := input.Value
		wideValue := value
		output := byteaIntegerSend(wideValue, 8)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func BoolsendOo82(input checkruntime.BoolValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.BoolValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.BoolValueValue {
		value := input.Value
		byte := 0
		if value {
			byte = langruntime.CheckedI32(1)
		}
		output := checkruntime.ByteaAppendByte("", byte)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}

const byteaEscapeError = 3452621

type byteaLikeFrame struct {
	text      int
	pattern   int
	searching bool
	firstHigh rune
	firstLow  rune
}

func copybyteaLikeFrame(value byteaLikeFrame) byteaLikeFrame {
	return byteaLikeFrame{text: langruntime.CheckedIndex(value.text), pattern: langruntime.CheckedIndex(value.pattern), searching: value.searching, firstHigh: langruntime.CheckedChar(value.firstHigh), firstLow: langruntime.CheckedChar(value.firstLow)}
}
func byteaLikeMatch(input string, pattern string) checkruntime.Int4Value {
	input = langruntime.CheckedString(input)
	pattern = langruntime.CheckedString(pattern)
	text := []rune(input)
	chars := []rune(pattern)
	frames := []byteaLikeFrame{}
	langruntime.CheckedAdd(len(frames), 1)
	frames = append(frames, copybyteaLikeFrame(byteaLikeFrame{text: 0, pattern: 0, searching: false, firstHigh: '0', firstLow: '0'}))
	depth := 1
	for depth > 0 {
		current := langruntime.CheckedSubtract(depth, 1)
		frame := frames[current]
		t := frame.text
		p := frame.pattern
		searching := frame.searching
		firstHigh := frame.firstHigh
		firstLow := frame.firstLow
		failed := false
		if searching {
			for t < len(text) && (text[t] != firstHigh || text[langruntime.CheckedAdd(t, 1)] != firstLow) {
				t = langruntime.CheckedIndex(langruntime.CheckedAdd(t, 2))
			}
			if t >= len(text) {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			frames[current] = copybyteaLikeFrame(byteaLikeFrame{text: langruntime.CheckedAdd(t, 2), pattern: p, searching: true, firstHigh: firstHigh, firstLow: firstLow})
			child := byteaLikeFrame{text: t, pattern: p, searching: false, firstHigh: '0', firstLow: '0'}
			if depth < len(frames) {
				frames[depth] = copybyteaLikeFrame(child)
			} else {
				langruntime.CheckedAdd(len(frames), 1)
				frames = append(frames, copybyteaLikeFrame(child))
			}
			depth = langruntime.CheckedAdd(depth, 1)
		} else {
			if t < len(text) && p < len(chars) {
				if chars[p] == '2' && chars[langruntime.CheckedAdd(p, 1)] == '5' {
					p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
					wildcards := true
					for p < len(chars) && wildcards {
						if chars[p] == '2' && chars[langruntime.CheckedAdd(p, 1)] == '5' {
							p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
						} else if chars[p] == '5' && chars[langruntime.CheckedAdd(p, 1)] == 'f' {
							if t >= len(text) {
								return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
							}
							t = langruntime.CheckedIndex(langruntime.CheckedAdd(t, 2))
							p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
						} else {
							wildcards = false
						}
					}
					if p >= len(chars) {
						return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
					}
					literal := p
					if chars[p] == '5' && chars[langruntime.CheckedAdd(p, 1)] == 'c' {
						literal = langruntime.CheckedIndex(langruntime.CheckedAdd(literal, 2))
						if literal >= len(chars) {
							return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(byteaEscapeError)}
						}
					}
					firstHigh = langruntime.CheckedChar(chars[literal])
					firstLow = langruntime.CheckedChar(chars[langruntime.CheckedAdd(literal, 1)])
					searching = true
				} else if chars[p] == '5' && chars[langruntime.CheckedAdd(p, 1)] == 'f' {
					t = langruntime.CheckedIndex(langruntime.CheckedAdd(t, 2))
					p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
				} else {
					if chars[p] == '5' && chars[langruntime.CheckedAdd(p, 1)] == 'c' {
						p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
						if p >= len(chars) {
							return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(byteaEscapeError)}
						}
					}
					if text[t] != chars[p] || text[langruntime.CheckedAdd(t, 1)] != chars[langruntime.CheckedAdd(p, 1)] {
						failed = true
					} else {
						t = langruntime.CheckedIndex(langruntime.CheckedAdd(t, 2))
						p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
					}
				}
			} else if t < len(text) {
				failed = true
			} else {
				for p < len(chars) && chars[p] == '2' && chars[langruntime.CheckedAdd(p, 1)] == '5' {
					p = langruntime.CheckedIndex(langruntime.CheckedAdd(p, 2))
				}
				if p >= len(chars) {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
				}
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if failed {
				depth = langruntime.CheckedIndex(langruntime.CheckedSubtract(depth, 1))
			} else {
				frames[current] = copybyteaLikeFrame(byteaLikeFrame{text: t, pattern: p, searching: searching, firstHigh: firstHigh, firstLow: firstLow})
			}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
}
func byteaLike(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue, negate bool) checkruntime.BoolValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if pattern.Kind == checkruntime.ByteaValueError {
		error := pattern.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || pattern == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || pattern == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if pattern.Kind == checkruntime.ByteaValueValue {
			pat := langruntime.CheckedString(pattern.Value)
			result := byteaLikeMatch(value, pat)
			if result.Kind == checkruntime.Int4ValueError {
				error := result.Error
				return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
			}
			if result.Kind == checkruntime.Int4ValueValue {
				matched := langruntime.CheckedI32(result.Value)
				value := matched == 1
				return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value != negate}
			}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BytealikeJhpm(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.BoolValue {
	return byteaLike(input, pattern, false)
}
func Like9b5r(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.BoolValue {
	return byteaLike(input, pattern, false)
}
func ByteanlikeQodo(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.BoolValue {
	return byteaLike(input, pattern, true)
}
func NotlikeCy7a(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.BoolValue {
	return byteaLike(input, pattern, true)
}
func LikeEscapeHk4j(input checkruntime.ByteaValue, escape checkruntime.ByteaValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if escape.Kind == checkruntime.ByteaValueError {
		error := escape.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || escape == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || escape == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if escape.Kind == checkruntime.ByteaValueValue {
			esc := langruntime.CheckedString(escape.Value)
			length := byteaPayloadLength(value)
			allocated := byteaConcatLength(length, length)
			if allocated.Kind == checkruntime.Int4ValueError {
				error := allocated.Error
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
			}
			chars := []rune(value)
			escapeChars := []rune(esc)
			if len(escapeChars) > 2 {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaEscapeError)}
			}
			if len(escapeChars) == 2 && escapeChars[0] == '5' && escapeChars[1] == 'c' {
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: value}
			}
			output := ""
			index := 0
			afterEscape := false
			for index < len(chars) {
				high := chars[index]
				low := chars[langruntime.CheckedAdd(index, 1)]
				isEscape := false
				if len(escapeChars) == 2 {
					isEscape = high == escapeChars[0] && low == escapeChars[1] && afterEscape == false
				}
				if isEscape {
					output = output + "5c"
					afterEscape = true
				} else {
					if high == '5' && low == 'c' && afterEscape == false {
						output = output + "5c"
					}
					output = output + string(langruntime.CheckedChar(high))
					output = output + string(langruntime.CheckedChar(low))
					afterEscape = false
				}
				index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
			}
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}

var digestMd5K = []int64{int64(3614090360), int64(3905402710), int64(606105819), int64(3250441966), int64(4118548399), int64(1200080426), int64(2821735955), int64(4249261313), int64(1770035416), int64(2336552879), int64(4294925233), int64(2304563134), int64(1804603682), int64(4254626195), int64(2792965006), int64(1236535329), int64(4129170786), int64(3225465664), int64(643717713), int64(3921069994), int64(3593408605), int64(38016083), int64(3634488961), int64(3889429448), int64(568446438), int64(3275163606), int64(4107603335), int64(1163531501), int64(2850285829), int64(4243563512), int64(1735328473), int64(2368359562), int64(4294588738), int64(2272392833), int64(1839030562), int64(4259657740), int64(2763975236), int64(1272893353), int64(4139469664), int64(3200236656), int64(681279174), int64(3936430074), int64(3572445317), int64(76029189), int64(3654602809), int64(3873151461), int64(530742520), int64(3299628645), int64(4096336452), int64(1126891415), int64(2878612391), int64(4237533241), int64(1700485571), int64(2399980690), int64(4293915773), int64(2240044497), int64(1873313359), int64(4264355552), int64(2734768916), int64(1309151649), int64(4149444226), int64(3174756917), int64(718787259), int64(3951481745)}
var digestMd5Shifts = []int{7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21}

func digestMd5Select(round int, b int64, c int64, d int64) int64 {
	round = langruntime.CheckedIndex(round)
	if round < 16 {
		chosen := digestAnd(b, c)
		unchosen := digestAnd(langruntime.CheckedI64Subtract(int64(4294967295), b), d)
		return checkruntime.HashXor(chosen, unchosen)
	}
	if round < 32 {
		chosen := digestAnd(b, d)
		unchosen := digestAnd(c, langruntime.CheckedI64Subtract(int64(4294967295), d))
		return checkruntime.HashXor(chosen, unchosen)
	}
	if round < 48 {
		return digestXor3(b, c, d)
	}
	opposite := langruntime.CheckedI64Subtract(int64(4294967295), d)
	exclusive := checkruntime.HashXor(b, opposite)
	common := digestAnd(b, opposite)
	return checkruntime.HashXor(c, langruntime.CheckedI64Add(exclusive, common))
}
func digestMd5Hex(input string) string {
	input = langruntime.CheckedString(input)
	stateA := int64(1732584193)
	stateB := int64(4023233417)
	stateC := int64(2562383102)
	stateD := int64(271733878)
	bytes := digestPadding(input, false, true)
	offset := 0
	for offset < len(bytes) {
		words := []checkruntime.HashByte{}
		index := 0
		for index < 16 {
			word := int64(0)
			place := int64(1)
			octet := 0
			for octet < 4 {
				word = langruntime.CheckedI64Add(word, langruntime.CheckedI64Multiply(bytes[offset].Value, place))
				place = langruntime.CheckedI64Multiply(place, int64(256))
				offset = langruntime.CheckedAdd(offset, 1)
				octet = langruntime.CheckedAdd(octet, 1)
			}
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, checkruntime.CopyHashByte(checkruntime.HashByte{Value: word}))
			index = langruntime.CheckedAdd(index, 1)
		}
		a := stateA
		b := stateB
		c := stateC
		d := stateD
		round := 0
		roundNumber := 0
		for round < 64 {
			selected := digestMd5Select(round, b, c, d)
			needed := roundNumber
			if round >= 48 {
				needed = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(langruntime.CheckedSignedMultiply(roundNumber, 7), 16))
			} else if round >= 32 {
				needed = langruntime.CheckedI32(langruntime.CheckedSignedRemainder((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(roundNumber, 3), 5)), 16))
			} else if round >= 16 {
				needed = langruntime.CheckedI32(langruntime.CheckedSignedRemainder((langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(roundNumber, 5), 1)), 16))
			}
			position := 0
			for needed > 0 {
				position = langruntime.CheckedAdd(position, 1)
				needed = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(needed, 1))
			}
			sum := digestWrap(langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(a, selected), digestMd5K[round]), words[position].Value))
			rotated := digestRight(sum, langruntime.CheckedSignedSubtract(32, digestMd5Shifts[round]), true)
			next := digestWrap(langruntime.CheckedI64Add(b, rotated))
			a = d
			d = c
			c = b
			b = next
			round = langruntime.CheckedAdd(round, 1)
			roundNumber = langruntime.CheckedI32(langruntime.CheckedSignedAdd(roundNumber, 1))
		}
		stateA = digestWrap(langruntime.CheckedI64Add(stateA, a))
		stateB = digestWrap(langruntime.CheckedI64Add(stateB, b))
		stateC = digestWrap(langruntime.CheckedI64Add(stateC, c))
		stateD = digestWrap(langruntime.CheckedI64Add(stateD, d))
	}
	output := ""
	index := 0
	for index < 4 {
		word := stateA
		if index == 1 {
			word = stateB
		} else if index == 2 {
			word = stateC
		} else if index == 3 {
			word = stateD
		}
		octet := 0
		for octet < 4 {
			byte := langruntime.CheckedI64Remainder(word, int64(256))
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, int(int32(byte))))
			word = langruntime.CheckedI64Divide(word, int64(256))
			octet = langruntime.CheckedAdd(octet, 1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return output
}
func Md5Vpfl(input checkruntime.ByteaValue) checkruntime.TextValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		result := digestMd5Hex(value)
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: result}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func Md5Kt50(input checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		encoded := ""
		index := 0
		for index < len(chars) {
			encoded = langruntime.CheckedString(byteaUtf8Character(encoded, chars[index]))
			index = langruntime.CheckedAdd(index, 1)
		}
		result := digestMd5Hex(encoded)
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: result}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func byteaOverlay(input checkruntime.ByteaValue, replacement checkruntime.ByteaValue, position checkruntime.Int4Value, length checkruntime.Int4Value, hasLength bool) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if replacement.Kind == checkruntime.ByteaValueError {
		error := replacement.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || replacement == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || replacement == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if replacement.Kind == checkruntime.ByteaValueValue {
		bytes := langruntime.CheckedString(replacement.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			start := langruntime.CheckedI32(position.Value)
			if length.Kind == checkruntime.Int4ValueValue {
				supplied := langruntime.CheckedI32(length.Value)
				if start <= 0 {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaSubstringError)}
				}
				count := supplied
				if hasLength == false {
					count = langruntime.CheckedI32(byteaPayloadLength(bytes))
				}
				if count > 0 && start > langruntime.CheckedSignedSubtract(2147483647, count) {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
				}
				end := langruntime.CheckedSignedAdd(start, count)
				prefix := byteaSubstring(input, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(start, 1)}, true)
				suffix := byteaSubstring(input, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: end}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
				combined := ByteacatZitv(prefix, checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: bytes})
				return ByteacatZitv(combined, suffix)
			}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Overlay9neg(input checkruntime.ByteaValue, replacement checkruntime.ByteaValue, position checkruntime.Int4Value) checkruntime.ByteaValue {
	return byteaOverlay(input, replacement, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func Overlay72ov(input checkruntime.ByteaValue, replacement checkruntime.ByteaValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.ByteaValue {
	return byteaOverlay(input, replacement, position, length, true)
}
func Position9w14(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if pattern.Kind == checkruntime.ByteaValueError {
		error := pattern.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || pattern == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || pattern == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if pattern.Kind == checkruntime.ByteaValueValue {
			needle := langruntime.CheckedString(pattern.Value)
			length := byteaPayloadLength(value)
			patternLength := byteaPayloadLength(needle)
			if patternLength == 0 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			if patternLength > length {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
			}
			chars := []rune(value)
			patternChars := []rune(needle)
			last := langruntime.CheckedSubtract(len(chars), len(patternChars))
			start := 0
			position := 1
			for start <= last {
				index := 0
				matches := true
				for index < len(patternChars) && matches {
					if chars[langruntime.CheckedAdd(start, index)] != patternChars[index] {
						matches = false
					}
					index = langruntime.CheckedAdd(index, 1)
				}
				if matches {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: position}
				}
				start = langruntime.CheckedIndex(langruntime.CheckedAdd(start, 2))
				position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}

var digestSha256K = []int64{int64(1116352408), int64(1899447441), int64(3049323471), int64(3921009573), int64(961987163), int64(1508970993), int64(2453635748), int64(2870763221), int64(3624381080), int64(310598401), int64(607225278), int64(1426881987), int64(1925078388), int64(2162078206), int64(2614888103), int64(3248222580), int64(3835390401), int64(4022224774), int64(264347078), int64(604807628), int64(770255983), int64(1249150122), int64(1555081692), int64(1996064986), int64(2554220882), int64(2821834349), int64(2952996808), int64(3210313671), int64(3336571891), int64(3584528711), int64(113926993), int64(338241895), int64(666307205), int64(773529912), int64(1294757372), int64(1396182291), int64(1695183700), int64(1986661051), int64(2177026350), int64(2456956037), int64(2730485921), int64(2820302411), int64(3259730800), int64(3345764771), int64(3516065817), int64(3600352804), int64(4094571909), int64(275423344), int64(430227734), int64(506948616), int64(659060556), int64(883997877), int64(958139571), int64(1322822218), int64(1537002063), int64(1747873779), int64(1955562222), int64(2024104815), int64(2227730452), int64(2361852424), int64(2428436474), int64(2756734187), int64(3204031479), int64(3329325298)}
var digestSha224Initial = []int64{int64(3238371032), int64(914150663), int64(812702999), int64(4144912697), int64(4290775857), int64(1750603025), int64(1694076839), int64(3204075428)}
var digestSha256Initial = []int64{int64(1779033703), int64(3144134277), int64(1013904242), int64(2773480762), int64(1359893119), int64(2600822924), int64(528734635), int64(1541459225)}

func digestWrap(value int64) int64 {
	return langruntime.CheckedI64Remainder(value, int64(4294967296))
}
func digestAnd(left int64, right int64) int64 {
	unequal := checkruntime.HashXor(left, right)
	return langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(langruntime.CheckedI64Add(left, right), unequal)), int64(2))
}
func digestRight(value int64, bits int, rotate bool) int64 {
	bits = langruntime.CheckedI32(bits)
	divisor := int64(1)
	remaining := bits
	for remaining > 0 {
		divisor = langruntime.CheckedI64Multiply(divisor, int64(2))
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	result := langruntime.CheckedI64Divide(value, divisor)
	if rotate {
		result = langruntime.CheckedI64Add(result, langruntime.CheckedI64Multiply(langruntime.CheckedI64Remainder(value, divisor), (langruntime.CheckedI64Divide(int64(4294967296), divisor))))
	}
	return result
}
func digestXor3(a int64, b int64, c int64) int64 {
	pair := checkruntime.HashXor(a, b)
	return checkruntime.HashXor(pair, c)
}
func digestSigma(value int64, first int, second int, last int, rotateLast bool) int64 {
	first = langruntime.CheckedI32(first)
	second = langruntime.CheckedI32(second)
	last = langruntime.CheckedI32(last)
	a := digestRight(value, first, true)
	b := digestRight(value, second, true)
	c := digestRight(value, last, rotateLast)
	return digestXor3(a, b, c)
}
func digestPadding(input string, wide bool, little bool) []checkruntime.HashByte {
	input = langruntime.CheckedString(input)
	chars := []rune(input)
	bytes := []checkruntime.HashByte{}
	bits := int64(0)
	index := 0
	position := 0
	width := 64
	limit := 56
	if wide {
		width = langruntime.CheckedI32(128)
		limit = langruntime.CheckedI32(112)
	}
	for index < len(chars) {
		high := checkruntime.HexDigit(chars[index])
		low := checkruntime.HexDigit(chars[langruntime.CheckedAdd(index, 1)])
		byte := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(high, 16), low)
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(byte))}))
		bits = langruntime.CheckedI64Add(bits, int64(8))
		index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
		position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
		if position == width {
			position = langruntime.CheckedI32(0)
		}
	}
	langruntime.CheckedAdd(len(bytes), 1)
	bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(128)}))
	position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
	if position == width {
		position = langruntime.CheckedI32(0)
	}
	for position != limit {
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(0)}))
		position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
		if position == width {
			position = langruntime.CheckedI32(0)
		}
	}
	if wide {
		zeros := 0
		for zeros < 8 {
			langruntime.CheckedAdd(len(bytes), 1)
			bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(0)}))
			zeros = langruntime.CheckedAdd(zeros, 1)
		}
	}
	count := 0
	divisor := int64(72057594037927936)
	for count < 8 {
		if little {
			langruntime.CheckedAdd(len(bytes), 1)
			bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: langruntime.CheckedI64Remainder(bits, int64(256))}))
			bits = langruntime.CheckedI64Divide(bits, int64(256))
		} else {
			langruntime.CheckedAdd(len(bytes), 1)
			bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: langruntime.CheckedI64Remainder(langruntime.CheckedI64Divide(bits, divisor), int64(256))}))
			divisor = langruntime.CheckedI64Divide(divisor, int64(256))
		}
		count = langruntime.CheckedAdd(count, 1)
	}
	return bytes
}
func digestSha256Hex(input string, short bool) string {
	input = langruntime.CheckedString(input)
	state := []checkruntime.HashByte{}
	initial := 0
	for initial < 8 {
		value := digestSha256Initial[initial]
		if short {
			value = digestSha224Initial[initial]
		}
		langruntime.CheckedAdd(len(state), 1)
		state = append(state, checkruntime.CopyHashByte(checkruntime.HashByte{Value: value}))
		initial = langruntime.CheckedAdd(initial, 1)
	}
	bytes := digestPadding(input, false, false)
	offset := 0
	for offset < len(bytes) {
		words := []checkruntime.HashByte{}
		index := 0
		for index < 16 {
			word := int64(0)
			octet := 0
			for octet < 4 {
				word = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(word, int64(256)), bytes[offset].Value)
				offset = langruntime.CheckedAdd(offset, 1)
				octet = langruntime.CheckedAdd(octet, 1)
			}
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, checkruntime.CopyHashByte(checkruntime.HashByte{Value: word}))
			index = langruntime.CheckedAdd(index, 1)
		}
		for index < 64 {
			a := digestSigma(words[langruntime.CheckedSubtract(index, 15)].Value, 7, 18, 3, false)
			b := digestSigma(words[langruntime.CheckedSubtract(index, 2)].Value, 17, 19, 10, false)
			sum := langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(words[langruntime.CheckedSubtract(index, 16)].Value, a), words[langruntime.CheckedSubtract(index, 7)].Value), b)
			word := digestWrap(sum)
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, checkruntime.CopyHashByte(checkruntime.HashByte{Value: word}))
			index = langruntime.CheckedAdd(index, 1)
		}
		a := state[0].Value
		b := state[1].Value
		c := state[2].Value
		d := state[3].Value
		e := state[4].Value
		f := state[5].Value
		g := state[6].Value
		h := state[7].Value
		round := 0
		for round < 64 {
			sigmaE := digestSigma(e, 6, 11, 25, true)
			chosen := digestAnd(e, f)
			unchosen := digestAnd(langruntime.CheckedI64Subtract(int64(4294967295), e), g)
			choice := checkruntime.HashXor(chosen, unchosen)
			t1 := digestWrap(langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(h, sigmaE), choice), digestSha256K[round]), words[round].Value))
			sigmaA := digestSigma(a, 2, 13, 22, true)
			ab := digestAnd(a, b)
			ac := digestAnd(a, c)
			bc := digestAnd(b, c)
			majority := digestXor3(ab, ac, bc)
			t2 := digestWrap(langruntime.CheckedI64Add(sigmaA, majority))
			h = g
			g = f
			f = e
			e = digestWrap(langruntime.CheckedI64Add(d, t1))
			d = c
			c = b
			b = a
			a = digestWrap(langruntime.CheckedI64Add(t1, t2))
			round = langruntime.CheckedAdd(round, 1)
		}
		state[0] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[0].Value, a))})
		state[1] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[1].Value, b))})
		state[2] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[2].Value, c))})
		state[3] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[3].Value, d))})
		state[4] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[4].Value, e))})
		state[5] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[5].Value, f))})
		state[6] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[6].Value, g))})
		state[7] = checkruntime.CopyHashByte(checkruntime.HashByte{Value: digestWrap(langruntime.CheckedI64Add(state[7].Value, h))})
	}
	output := ""
	index := 0
	count := 8
	if short {
		count = langruntime.CheckedIndex(7)
	}
	for index < count {
		divisor := int64(16777216)
		octet := 0
		for octet < 4 {
			value := langruntime.CheckedI64Remainder(langruntime.CheckedI64Divide(state[index].Value, divisor), int64(256))
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, int(int32(value))))
			divisor = langruntime.CheckedI64Divide(divisor, int64(256))
			octet = langruntime.CheckedAdd(octet, 1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return output
}
func digestSha256(input checkruntime.ByteaValue, short bool) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		result := digestSha256Hex(value, short)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: result}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Sha224S7oo(input checkruntime.ByteaValue) checkruntime.ByteaValue {
	return digestSha256(input, true)
}
func Sha25619zu(input checkruntime.ByteaValue) checkruntime.ByteaValue {
	return digestSha256(input, false)
}

var digestSha512KHigh = []int64{int64(1116352408), int64(1899447441), int64(3049323471), int64(3921009573), int64(961987163), int64(1508970993), int64(2453635748), int64(2870763221), int64(3624381080), int64(310598401), int64(607225278), int64(1426881987), int64(1925078388), int64(2162078206), int64(2614888103), int64(3248222580), int64(3835390401), int64(4022224774), int64(264347078), int64(604807628), int64(770255983), int64(1249150122), int64(1555081692), int64(1996064986), int64(2554220882), int64(2821834349), int64(2952996808), int64(3210313671), int64(3336571891), int64(3584528711), int64(113926993), int64(338241895), int64(666307205), int64(773529912), int64(1294757372), int64(1396182291), int64(1695183700), int64(1986661051), int64(2177026350), int64(2456956037), int64(2730485921), int64(2820302411), int64(3259730800), int64(3345764771), int64(3516065817), int64(3600352804), int64(4094571909), int64(275423344), int64(430227734), int64(506948616), int64(659060556), int64(883997877), int64(958139571), int64(1322822218), int64(1537002063), int64(1747873779), int64(1955562222), int64(2024104815), int64(2227730452), int64(2361852424), int64(2428436474), int64(2756734187), int64(3204031479), int64(3329325298), int64(3391569614), int64(3515267271), int64(3940187606), int64(4118630271), int64(116418474), int64(174292421), int64(289380356), int64(460393269), int64(685471733), int64(852142971), int64(1017036298), int64(1126000580), int64(1288033470), int64(1501505948), int64(1607167915), int64(1816402316)}
var digestSha512KLow = []int64{int64(3609767458), int64(602891725), int64(3964484399), int64(2173295548), int64(4081628472), int64(3053834265), int64(2937671579), int64(3664609560), int64(2734883394), int64(1164996542), int64(1323610764), int64(3590304994), int64(4068182383), int64(991336113), int64(633803317), int64(3479774868), int64(2666613458), int64(944711139), int64(2341262773), int64(2007800933), int64(1495990901), int64(1856431235), int64(3175218132), int64(2198950837), int64(3999719339), int64(766784016), int64(2566594879), int64(3203337956), int64(1034457026), int64(2466948901), int64(3758326383), int64(168717936), int64(1188179964), int64(1546045734), int64(1522805485), int64(2643833823), int64(2343527390), int64(1014477480), int64(1206759142), int64(344077627), int64(1290863460), int64(3158454273), int64(3505952657), int64(106217008), int64(3606008344), int64(1432725776), int64(1467031594), int64(851169720), int64(3100823752), int64(1363258195), int64(3750685593), int64(3785050280), int64(3318307427), int64(3812723403), int64(2003034995), int64(3602036899), int64(1575990012), int64(1125592928), int64(2716904306), int64(442776044), int64(593698344), int64(3733110249), int64(2999351573), int64(3815920427), int64(3928383900), int64(566280711), int64(3454069534), int64(4000239992), int64(1914138554), int64(2731055270), int64(3203993006), int64(320620315), int64(587496836), int64(1086792851), int64(365543100), int64(2618297676), int64(3409855158), int64(4234509866), int64(987167468), int64(1246189591)}
var digestSha384InitialHigh = []int64{int64(3418070365), int64(1654270250), int64(2438529370), int64(355462360), int64(1731405415), int64(2394180231), int64(3675008525), int64(1203062813)}
var digestSha384InitialLow = []int64{int64(3238371032), int64(914150663), int64(812702999), int64(4144912697), int64(4290775857), int64(1750603025), int64(1694076839), int64(3204075428)}
var digestSha512InitialHigh = []int64{int64(1779033703), int64(3144134277), int64(1013904242), int64(2773480762), int64(1359893119), int64(2600822924), int64(528734635), int64(1541459225)}
var digestSha512InitialLow = []int64{int64(4089235720), int64(2227873595), int64(4271175723), int64(1595750129), int64(2917565137), int64(725511199), int64(4215389547), int64(327033209)}

type digestWord struct {
	high int64
	low  int64
}

func copydigestWord(value digestWord) digestWord {
	return digestWord{high: value.high, low: value.low}
}
func digestWideAdd(left digestWord, right digestWord) digestWord {
	left = copydigestWord(left)
	right = copydigestWord(right)
	sum := langruntime.CheckedI64Add(left.low, right.low)
	low := digestWrap(sum)
	high := digestWrap(langruntime.CheckedI64Add(langruntime.CheckedI64Add(left.high, right.high), langruntime.CheckedI64Divide(sum, int64(4294967296))))
	return digestWord{high: high, low: low}
}
func digestWideAnd(left digestWord, right digestWord) digestWord {
	left = copydigestWord(left)
	right = copydigestWord(right)
	high := digestAnd(left.high, right.high)
	low := digestAnd(left.low, right.low)
	return digestWord{high: high, low: low}
}
func digestWideXor(left digestWord, right digestWord) digestWord {
	left = copydigestWord(left)
	right = copydigestWord(right)
	high := checkruntime.HashXor(left.high, right.high)
	low := checkruntime.HashXor(left.low, right.low)
	return digestWord{high: high, low: low}
}
func digestWideNot(value digestWord) digestWord {
	value = copydigestWord(value)
	return digestWord{high: langruntime.CheckedI64Subtract(int64(4294967295), value.high), low: langruntime.CheckedI64Subtract(int64(4294967295), value.low)}
}
func digestWideRight(value digestWord, bits int, rotate bool) digestWord {
	value = copydigestWord(value)
	bits = langruntime.CheckedI32(bits)
	remaining := bits
	high := value.high
	low := value.low
	if remaining >= 32 {
		low = value.high
		high = int64(0)
		if rotate {
			high = value.low
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 32))
	}
	if remaining == 0 {
		return digestWord{high: high, low: low}
	}
	divisor := int64(1)
	for remaining > 0 {
		divisor = langruntime.CheckedI64Multiply(divisor, int64(2))
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
	}
	multiplier := langruntime.CheckedI64Divide(int64(4294967296), divisor)
	shiftedLow := langruntime.CheckedI64Add(langruntime.CheckedI64Divide(low, divisor), langruntime.CheckedI64Multiply(langruntime.CheckedI64Remainder(high, divisor), multiplier))
	shiftedHigh := langruntime.CheckedI64Divide(high, divisor)
	if rotate {
		shiftedHigh = langruntime.CheckedI64Add(shiftedHigh, langruntime.CheckedI64Multiply(langruntime.CheckedI64Remainder(low, divisor), multiplier))
	}
	return digestWord{high: shiftedHigh, low: shiftedLow}
}
func digestWideSigma(value digestWord, first int, second int, last int, rotateLast bool) digestWord {
	value = copydigestWord(value)
	first = langruntime.CheckedI32(first)
	second = langruntime.CheckedI32(second)
	last = langruntime.CheckedI32(last)
	a := digestWideRight(value, first, true)
	b := digestWideRight(value, second, true)
	c := digestWideRight(value, last, rotateLast)
	pair := digestWideXor(a, b)
	return digestWideXor(pair, c)
}
func digestSha512Hex(input string, short bool) string {
	input = langruntime.CheckedString(input)
	state := []digestWord{}
	initial := 0
	for initial < 8 {
		high := digestSha512InitialHigh[initial]
		low := digestSha512InitialLow[initial]
		if short {
			high = digestSha384InitialHigh[initial]
			low = digestSha384InitialLow[initial]
		}
		langruntime.CheckedAdd(len(state), 1)
		state = append(state, copydigestWord(digestWord{high: high, low: low}))
		initial = langruntime.CheckedAdd(initial, 1)
	}
	bytes := digestPadding(input, true, false)
	offset := 0
	for offset < len(bytes) {
		words := []digestWord{}
		index := 0
		for index < 16 {
			high := int64(0)
			low := int64(0)
			octet := 0
			for octet < 4 {
				high = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(high, int64(256)), bytes[offset].Value)
				offset = langruntime.CheckedAdd(offset, 1)
				octet = langruntime.CheckedAdd(octet, 1)
			}
			octet = langruntime.CheckedIndex(0)
			for octet < 4 {
				low = langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(low, int64(256)), bytes[offset].Value)
				offset = langruntime.CheckedAdd(offset, 1)
				octet = langruntime.CheckedAdd(octet, 1)
			}
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, copydigestWord(digestWord{high: high, low: low}))
			index = langruntime.CheckedAdd(index, 1)
		}
		for index < 80 {
			a := digestWideSigma(words[langruntime.CheckedSubtract(index, 15)], 1, 8, 7, false)
			b := digestWideSigma(words[langruntime.CheckedSubtract(index, 2)], 19, 61, 6, false)
			first := digestWideAdd(words[langruntime.CheckedSubtract(index, 16)], a)
			second := digestWideAdd(words[langruntime.CheckedSubtract(index, 7)], b)
			word := digestWideAdd(first, second)
			langruntime.CheckedAdd(len(words), 1)
			words = append(words, copydigestWord(word))
			index = langruntime.CheckedAdd(index, 1)
		}
		working := []digestWord{}
		copied := 0
		for copied < 8 {
			langruntime.CheckedAdd(len(working), 1)
			working = append(working, copydigestWord(state[copied]))
			copied = langruntime.CheckedAdd(copied, 1)
		}
		round := 0
		for round < 80 {
			a := working[0]
			b := working[1]
			c := working[2]
			d := working[3]
			e := working[4]
			f := working[5]
			g := working[6]
			h := working[7]
			sigmaE := digestWideSigma(e, 14, 18, 41, true)
			chosen := digestWideAnd(e, f)
			opposite := digestWideNot(e)
			unchosen := digestWideAnd(opposite, g)
			choice := digestWideXor(chosen, unchosen)
			constant := digestWord{high: digestSha512KHigh[round], low: digestSha512KLow[round]}
			first := digestWideAdd(h, sigmaE)
			second := digestWideAdd(choice, constant)
			combined := digestWideAdd(first, second)
			t1 := digestWideAdd(combined, words[round])
			sigmaA := digestWideSigma(a, 28, 34, 39, true)
			ab := digestWideAnd(a, b)
			ac := digestWideAnd(a, c)
			bc := digestWideAnd(b, c)
			pair := digestWideXor(ab, ac)
			majority := digestWideXor(pair, bc)
			t2 := digestWideAdd(sigmaA, majority)
			working[7] = copydigestWord(g)
			working[6] = copydigestWord(f)
			working[5] = copydigestWord(e)
			working[4] = copydigestWord(digestWideAdd(d, t1))
			working[3] = copydigestWord(c)
			working[2] = copydigestWord(b)
			working[1] = copydigestWord(a)
			working[0] = copydigestWord(digestWideAdd(t1, t2))
			round = langruntime.CheckedAdd(round, 1)
		}
		merged := 0
		for merged < 8 {
			state[merged] = copydigestWord(digestWideAdd(state[merged], working[merged]))
			merged = langruntime.CheckedAdd(merged, 1)
		}
	}
	output := ""
	index := 0
	count := 8
	if short {
		count = langruntime.CheckedIndex(6)
	}
	for index < count {
		half := 0
		for half < 2 {
			value := state[index].high
			if half == 1 {
				value = state[index].low
			}
			divisor := int64(16777216)
			octet := 0
			for octet < 4 {
				byte := langruntime.CheckedI64Remainder(langruntime.CheckedI64Divide(value, divisor), int64(256))
				output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, int(int32(byte))))
				divisor = langruntime.CheckedI64Divide(divisor, int64(256))
				octet = langruntime.CheckedAdd(octet, 1)
			}
			half = langruntime.CheckedAdd(half, 1)
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return output
}
func digestSha512(input checkruntime.ByteaValue, short bool) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		result := digestSha512Hex(value, short)
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: result}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Sha38441g6(input checkruntime.ByteaValue) checkruntime.ByteaValue {
	return digestSha512(input, true)
}
func Sha512Si49(input checkruntime.ByteaValue) checkruntime.ByteaValue {
	return digestSha512(input, false)
}

const byteaSubstringError = 3452581

func byteaSubstring(input checkruntime.ByteaValue, position checkruntime.Int4Value, length checkruntime.Int4Value, hasLength bool) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			start := langruntime.CheckedI32(position.Value)
			if length.Kind == checkruntime.Int4ValueValue {
				count := langruntime.CheckedI32(length.Value)
				if hasLength && count < 0 {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: checkruntime.MakeSqlError(byteaSubstringError)}
				}
				byteLength := byteaPayloadLength(value)
				first := start
				if first < 1 {
					first = langruntime.CheckedI32(1)
				}
				end := langruntime.CheckedSignedAdd(byteLength, 1)
				if hasLength && start <= langruntime.CheckedSignedSubtract(2147483647, count) {
					end = langruntime.CheckedI32(langruntime.CheckedSignedAdd(start, count))
					if end > langruntime.CheckedSignedAdd(byteLength, 1) {
						end = langruntime.CheckedI32(langruntime.CheckedSignedAdd(byteLength, 1))
					}
				}
				output := ""
				if first > byteLength || end <= first {
					return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
				}
				chars := []rune(value)
				index := 0
				current := 1
				for index < len(chars) && current < end {
					if current >= first {
						output = output + string(langruntime.CheckedChar(chars[index]))
						output = output + string(langruntime.CheckedChar(chars[langruntime.CheckedAdd(index, 1)]))
					}
					index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
					current = langruntime.CheckedI32(langruntime.CheckedSignedAdd(current, 1))
				}
				return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
			}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func Substring2f07(input checkruntime.ByteaValue, position checkruntime.Int4Value) checkruntime.ByteaValue {
	return byteaSubstring(input, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func SubstringB44k(input checkruntime.ByteaValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.ByteaValue {
	return byteaSubstring(input, position, length, true)
}
func SubstrXbdy(input checkruntime.ByteaValue, position checkruntime.Int4Value) checkruntime.ByteaValue {
	return byteaSubstring(input, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func SubstrJkup(input checkruntime.ByteaValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.ByteaValue {
	return byteaSubstring(input, position, length, true)
}
func byteaTrim(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue, trimLeft bool, trimRight bool) checkruntime.ByteaValue {
	if input.Kind == checkruntime.ByteaValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if pattern.Kind == checkruntime.ByteaValueError {
		error := pattern.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) || pattern == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) || pattern == (checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.ByteaValueValue {
		value := langruntime.CheckedString(input.Value)
		if pattern.Kind == checkruntime.ByteaValueValue {
			set := langruntime.CheckedString(pattern.Value)
			chars := []rune(value)
			patternChars := []rune(set)
			first := 0
			last := len(chars)
			for trimLeft && first < last {
				index := 0
				matches := false
				for index < len(patternChars) && matches == false {
					if chars[first] == patternChars[index] && chars[langruntime.CheckedAdd(first, 1)] == patternChars[langruntime.CheckedAdd(index, 1)] {
						matches = true
					}
					index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
				}
				if matches == false {
					break
				}
				first = langruntime.CheckedIndex(langruntime.CheckedAdd(first, 2))
			}
			for trimRight && first < last {
				index := 0
				matches := false
				for index < len(patternChars) && matches == false {
					if chars[langruntime.CheckedSubtract(last, 2)] == patternChars[index] && chars[langruntime.CheckedSubtract(last, 1)] == patternChars[langruntime.CheckedAdd(index, 1)] {
						matches = true
					}
					index = langruntime.CheckedIndex(langruntime.CheckedAdd(index, 2))
				}
				if matches == false {
					break
				}
				last = langruntime.CheckedIndex(langruntime.CheckedSubtract(last, 2))
			}
			output := ""
			index := first
			for index < last {
				output = output + string(langruntime.CheckedChar(chars[index]))
				index = langruntime.CheckedAdd(index, 1)
			}
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
		}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func BtrimRiux(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.ByteaValue {
	return byteaTrim(input, pattern, true, true)
}
func LtrimP5mp(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.ByteaValue {
	return byteaTrim(input, pattern, true, false)
}
func Rtrim33rv(input checkruntime.ByteaValue, pattern checkruntime.ByteaValue) checkruntime.ByteaValue {
	return byteaTrim(input, pattern, false, true)
}
func byteaUtf8Character(output string, character rune) string {
	output = langruntime.CheckedString(output)
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	result := output
	if code < 128 {
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, code))
	} else if code < 2048 {
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(192, langruntime.CheckedSignedDivide(code, 64))))
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(128, langruntime.CheckedSignedRemainder(code, 64))))
	} else if code < 65536 {
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(224, langruntime.CheckedSignedDivide(code, 4096))))
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(128, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(code, 64), 64))))
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(128, langruntime.CheckedSignedRemainder(code, 64))))
	} else {
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(240, langruntime.CheckedSignedDivide(code, 262144))))
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(128, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(code, 4096), 64))))
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(128, langruntime.CheckedSignedRemainder(langruntime.CheckedSignedDivide(code, 64), 64))))
		result = langruntime.CheckedString(checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedAdd(128, langruntime.CheckedSignedRemainder(code, 64))))
	}
	return result
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
func TextVc4r(input checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		end := len(chars)
		for end > 0 && chars[langruntime.CheckedSubtract(end, 1)] == ' ' {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
		output := ""
		index := 0
		for index < end {
			output = output + string(langruntime.CheckedChar(chars[index]))
			index = langruntime.CheckedAdd(index, 1)
		}
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const chrInvalidParameter = 3452619
const chrProgramLimit = 8584704

func Chr23bn(input checkruntime.Int4Value) checkruntime.TextValue {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value < 0 {
			return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(chrInvalidParameter)}
		}
		if value == 0 || value > 1114111 || (value >= 55296 && value <= 57343) {
			return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(chrProgramLimit)}
		}
		character := langruntime.CharacterFromI32(value, '\x00')
		output := ""
		output = output + string(langruntime.CheckedChar(character))
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
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

type integerBits struct {
	high int64
	low  int64
}

func copyintegerBits(value integerBits) integerBits {
	return integerBits{high: value.high, low: value.low}
}
func integerBitsFromValue(value int64) integerBits {
	lower := int(int32(value))
	low := int64(langruntime.CheckedI32(lower))
	if low < int64(0) {
		low = langruntime.CheckedI64Add(low, int64(4294967296))
	}
	high := langruntime.CheckedI64Divide(value, int64(4294967296))
	if value < int64(0) && langruntime.CheckedI64Remainder(value, int64(4294967296)) != int64(0) {
		high = langruntime.CheckedI64Subtract(high, int64(1))
	}
	if high < int64(0) {
		high = langruntime.CheckedI64Add(high, int64(4294967296))
	}
	return integerBits{high: high, low: low}
}
func integerBitsValue(bits integerBits) int64 {
	bits = copyintegerBits(bits)
	high := bits.high
	if high >= int64(2147483648) {
		high = langruntime.CheckedI64Subtract(high, int64(4294967296))
	}
	return langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(high, int64(4294967296)), bits.low)
}
func integerBitsCombine(left int64, right int64, operation int) int64 {
	operation = langruntime.CheckedI32(operation)
	xor := checkruntime.HashXor(left, right)
	if operation == 2 {
		return xor
	}
	both := langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(langruntime.CheckedI64Add(left, right), xor)), int64(2))
	if operation == 0 {
		return both
	}
	return langruntime.CheckedI64Subtract(langruntime.CheckedI64Add(left, right), both)
}
func integerBitwise(left checkruntime.Int8Value, right checkruntime.Int8Value, operation int) checkruntime.Int8Value {
	operation = langruntime.CheckedI32(operation)
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
		first := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			second := right.Value
			a := integerBitsFromValue(first)
			b := integerBitsFromValue(second)
			high := integerBitsCombine(a.high, b.high, operation)
			low := integerBitsCombine(a.low, b.low, operation)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: integerBitsValue(integerBits{high: high, low: low})}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func integerComplement(input checkruntime.Int8Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(int64(-1), value)}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func integerShift(input checkruntime.Int8Value, amount checkruntime.Int4Value, width int, left bool) checkruntime.Int8Value {
	width = langruntime.CheckedI32(width)
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if amount.Kind == checkruntime.Int4ValueError {
		error := amount.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || amount == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || amount == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		if amount.Kind == checkruntime.Int4ValueValue {
			distance := langruntime.CheckedI32(amount.Value)
			bits := integerBitsFromValue(value)
			high := bits.high
			low := bits.low
			remaining := langruntime.CheckedSignedRemainder(distance, width)
			if remaining < 0 {
				remaining = langruntime.CheckedI32(langruntime.CheckedSignedAdd(remaining, width))
			}
			for remaining > 0 {
				if left {
					carry := langruntime.CheckedI64Divide(low, int64(2147483648))
					low = langruntime.CheckedI64Remainder(langruntime.CheckedI64Multiply(low, int64(2)), int64(4294967296))
					high = langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(high, int64(2)), carry)), int64(4294967296))
				} else {
					carry := langruntime.CheckedI64Remainder(high, int64(2))
					low = langruntime.CheckedI64Add(langruntime.CheckedI64Divide(low, int64(2)), langruntime.CheckedI64Multiply(carry, int64(2147483648)))
					sign := int64(0)
					if high >= int64(2147483648) {
						sign = int64(2147483648)
					}
					high = langruntime.CheckedI64Add(langruntime.CheckedI64Divide(high, int64(2)), sign)
				}
				remaining = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(remaining, 1))
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: integerBitsValue(integerBits{high: high, low: low})}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func integerBitsInt4(input checkruntime.Int8Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: int(int32(value))}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func integerBitsInt2(input checkruntime.Int8Value) checkruntime.Int2Value {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		remainder := langruntime.CheckedI64Remainder(value, int64(65536))
		if remainder < int64(0) {
			remainder = langruntime.CheckedI64Add(remainder, int64(65536))
		}
		if remainder >= int64(32768) {
			remainder = langruntime.CheckedI64Subtract(remainder, int64(65536))
		}
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: int(int32(remainder))}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func Int2andEtfs(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	first := Int8Sxtp(left)
	second := Int8Sxtp(right)
	result := integerBitwise(first, second, 0)
	return integerBitsInt2(result)
}
func Int2orIy76(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	first := Int8Sxtp(left)
	second := Int8Sxtp(right)
	result := integerBitwise(first, second, 1)
	return integerBitsInt2(result)
}
func Int2xorT18e(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	first := Int8Sxtp(left)
	second := Int8Sxtp(right)
	result := integerBitwise(first, second, 2)
	return integerBitsInt2(result)
}
func Int2notN5dv(input checkruntime.Int2Value) checkruntime.Int2Value {
	widened := Int8Sxtp(input)
	result := integerComplement(widened)
	return integerBitsInt2(result)
}
func Int2shl0kk0(input checkruntime.Int2Value, amount checkruntime.Int4Value) checkruntime.Int2Value {
	widened := Int8Sxtp(input)
	result := integerShift(widened, amount, 32, true)
	return integerBitsInt2(result)
}
func Int2shrSejt(input checkruntime.Int2Value, amount checkruntime.Int4Value) checkruntime.Int2Value {
	widened := Int8Sxtp(input)
	result := integerShift(widened, amount, 32, false)
	return integerBitsInt2(result)
}
func Int4andJkbd(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	first := Int8Mzac(left)
	second := Int8Mzac(right)
	result := integerBitwise(first, second, 0)
	return integerBitsInt4(result)
}
func Int4orBxn6(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	first := Int8Mzac(left)
	second := Int8Mzac(right)
	result := integerBitwise(first, second, 1)
	return integerBitsInt4(result)
}
func Int4xor6j8h(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	first := Int8Mzac(left)
	second := Int8Mzac(right)
	result := integerBitwise(first, second, 2)
	return integerBitsInt4(result)
}
func Int4notVcqn(input checkruntime.Int4Value) checkruntime.Int4Value {
	widened := Int8Mzac(input)
	result := integerComplement(widened)
	return integerBitsInt4(result)
}
func Int4shl31iu(input checkruntime.Int4Value, amount checkruntime.Int4Value) checkruntime.Int4Value {
	widened := Int8Mzac(input)
	result := integerShift(widened, amount, 32, true)
	return integerBitsInt4(result)
}
func Int4shr3uh0(input checkruntime.Int4Value, amount checkruntime.Int4Value) checkruntime.Int4Value {
	widened := Int8Mzac(input)
	result := integerShift(widened, amount, 32, false)
	return integerBitsInt4(result)
}
func Int8andEa1e(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	first := left
	second := right
	result := integerBitwise(first, second, 0)
	return result
}
func Int8or37oj(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	first := left
	second := right
	result := integerBitwise(first, second, 1)
	return result
}
func Int8xor4v56(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	first := left
	second := right
	result := integerBitwise(first, second, 2)
	return result
}
func Int8not62wp(input checkruntime.Int8Value) checkruntime.Int8Value {
	widened := input
	result := integerComplement(widened)
	return result
}
func Int8shlZi4n(input checkruntime.Int8Value, amount checkruntime.Int4Value) checkruntime.Int8Value {
	widened := input
	result := integerShift(widened, amount, 64, true)
	return result
}
func Int8shrXhle(input checkruntime.Int8Value, amount checkruntime.Int4Value) checkruntime.Int8Value {
	widened := input
	result := integerShift(widened, amount, 64, false)
	return result
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
func integerBaseText(input checkruntime.Int8Value, fullWidth bool, radix int64) checkruntime.TextValue {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		bits := integerBitsFromValue(value)
		high := bits.high
		low := bits.low
		if fullWidth == false {
			high = int64(0)
		}
		alphabet := []rune("0123456789abcdef")
		digits := []rune{}
		if high == int64(0) && low == int64(0) {
			return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: "0"}
		}
		for high != int64(0) || low != int64(0) {
			number := langruntime.CheckedI64Remainder(low, radix)
			index := 0
			for number > int64(0) {
				index = langruntime.CheckedAdd(index, 1)
				number = langruntime.CheckedI64Subtract(number, int64(1))
			}
			langruntime.CheckedAdd(len(digits), 1)
			digits = append(digits, langruntime.CheckedChar(alphabet[index]))
			carry := langruntime.CheckedI64Remainder(high, radix)
			low = langruntime.CheckedI64Divide((langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(carry, int64(4294967296)), low)), radix)
			high = langruntime.CheckedI64Divide(high, radix)
		}
		output := ""
		remaining := len(digits)
		for remaining > 0 {
			remaining = langruntime.CheckedIndex(langruntime.CheckedSubtract(remaining, 1))
			output = output + string(langruntime.CheckedChar(digits[remaining]))
		}
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func ToBinW0oh(input checkruntime.Int8Value) checkruntime.TextValue {
	widened := input
	return integerBaseText(widened, true, int64(2))
}
func ToBinYzqy(input checkruntime.Int4Value) checkruntime.TextValue {
	widened := Int8Mzac(input)
	return integerBaseText(widened, false, int64(2))
}
func ToOct1exr(input checkruntime.Int8Value) checkruntime.TextValue {
	widened := input
	return integerBaseText(widened, true, int64(8))
}
func ToOct7a24(input checkruntime.Int4Value) checkruntime.TextValue {
	widened := Int8Mzac(input)
	return integerBaseText(widened, false, int64(8))
}
func ToHexKz7h(input checkruntime.Int8Value) checkruntime.TextValue {
	widened := input
	return integerBaseText(widened, true, int64(16))
}
func ToHexP0fx(input checkruntime.Int4Value) checkruntime.TextValue {
	widened := Int8Mzac(input)
	return integerBaseText(widened, false, int64(16))
}
func integerHashFold(value int64) int64 {
	lower := int(int32(value))
	low := int64(langruntime.CheckedI32(lower))
	if low < int64(0) {
		low = langruntime.CheckedI64Add(low, int64(4294967296))
	}
	high := langruntime.CheckedI64Divide(value, int64(4294967296))
	if value < int64(0) && langruntime.CheckedI64Remainder(value, int64(4294967296)) != int64(0) {
		high = langruntime.CheckedI64Subtract(high, int64(1))
	}
	if high < int64(0) {
		high = langruntime.CheckedI64Add(high, int64(4294967296))
	}
	if value < int64(0) {
		high = langruntime.CheckedI64Subtract(int64(4294967295), high)
	}
	return checkruntime.HashXor(low, high)
}
func integerHashExtended(input checkruntime.Int8Value, seed checkruntime.Int8Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if seed.Kind == checkruntime.Int8ValueError {
		error := seed.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		if seed.Kind == checkruntime.Int8ValueValue {
			initial := seed.Value
			folded := integerHashFold(value)
			bytes := []checkruntime.HashByte{}
			count := 0
			for count < 4 {
				byte := langruntime.CheckedI64Remainder(folded, int64(256))
				langruntime.CheckedAdd(len(bytes), 1)
				bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: byte}))
				folded = langruntime.CheckedI64Divide(folded, int64(256))
				count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: checkruntime.HashBytes64(bytes, initial)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func integerHash(input checkruntime.Int8Value) checkruntime.Int4Value {
	result := integerHashExtended(input, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(0)})
	if result.Kind == checkruntime.Int8ValueError {
		error := result.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if result == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if result == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if result.Kind == checkruntime.Int8ValueValue {
		value := result.Value
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: int(int32(value))}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Hashint2076p(input checkruntime.Int2Value) checkruntime.Int4Value {
	widened := Int8Sxtp(input)
	return integerHash(widened)
}
func Hashint2extendedU33n(input checkruntime.Int2Value, seed checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Sxtp(input)
	return integerHashExtended(widened, seed)
}
func Hashint4Zr00(input checkruntime.Int4Value) checkruntime.Int4Value {
	widened := Int8Mzac(input)
	return integerHash(widened)
}
func Hashint4extendedXf6v(input checkruntime.Int4Value, seed checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Mzac(input)
	return integerHashExtended(widened, seed)
}
func Hashint83wid(input checkruntime.Int8Value) checkruntime.Int4Value {
	widened := input
	return integerHash(widened)
}
func Hashint8extendedFrvh(input checkruntime.Int8Value, seed checkruntime.Int8Value) checkruntime.Int8Value {
	widened := input
	return integerHashExtended(widened, seed)
}
func Hashbool82il(input checkruntime.BoolValue) checkruntime.Int4Value {
	widened := Int8Mzac(Int4I3jf(input))
	return integerHash(widened)
}
func HashboolextendedHsk8(input checkruntime.BoolValue, seed checkruntime.Int8Value) checkruntime.Int8Value {
	widened := Int8Mzac(Int4I3jf(input))
	return integerHashExtended(widened, seed)
}
func GistTranslateCmptypeCommonAi1r(input checkruntime.Int4Value) checkruntime.Int2Value {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value == 1 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 20}
		}
		if value == 2 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 21}
		}
		if value == 3 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 18}
		}
		if value == 4 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 23}
		}
		if value == 5 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 22}
		}
		if value == 7 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 3}
		}
		if value == 8 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 8}
		}
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: 0}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func PgEncodingMaxLengthAj1r(input checkruntime.Int4Value) checkruntime.Int4Value {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		if value < 0 || value >= 42 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
		}
		if value == 4 || value == 6 || value == 7 || value == 39 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 4}
		}
		if value == 1 || value == 2 || value == 3 || value == 5 || value == 40 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 3}
		}
		if value >= 35 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 2}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}

var integerSizeUnits = []string{"bytes", "kB", "MB", "GB", "TB", "PB"}

func PgSizePretty24qt(input checkruntime.Int8Value) checkruntime.TextValue {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		amount := value
		unit := 0
		if amount <= int64(-10240) || amount >= int64(10240) {
			amount = langruntime.CheckedI64Divide(amount, int64(512))
			unit = langruntime.CheckedIndex(1)
			for unit < 5 && (amount <= int64(-20479) || amount >= int64(20479)) {
				amount = langruntime.CheckedI64Divide(amount, int64(1024))
				unit = langruntime.CheckedAdd(unit, 1)
			}
			if amount < int64(0) {
				amount = langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(amount, int64(1))), int64(2))
			} else {
				amount = langruntime.CheckedI64Divide((langruntime.CheckedI64Add(amount, int64(1))), int64(2))
			}
		}
		output := ""
		if amount < int64(0) {
			output = output + string(langruntime.CheckedChar('-'))
			amount = langruntime.CheckedI64Subtract(int64(0), amount)
		}
		number := int(int32(amount))
		formatted := checkruntime.TextNumber(number, 10)
		output = output + formatted
		output = output + string(langruntime.CheckedChar(' '))
		output = output + integerSizeUnits[unit]
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const integerInvalidFrameSize = 3452583

func integerInRange(value checkruntime.Int8Value, base checkruntime.Int8Value, offset checkruntime.Int8Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	if value.Kind == checkruntime.Int8ValueError {
		error := value.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if base.Kind == checkruntime.Int8ValueError {
		error := base.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if offset.Kind == checkruntime.Int8ValueError {
		error := offset.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if subtract.Kind == checkruntime.BoolValueError {
		error := subtract.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if less.Kind == checkruntime.BoolValueError {
		error := less.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if value == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || base == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || offset == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || subtract == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || less == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if value == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || base == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || offset == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || subtract == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || less == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if value.Kind == checkruntime.Int8ValueValue {
		input := value.Value
		if base.Kind == checkruntime.Int8ValueValue {
			center := base.Value
			if offset.Kind == checkruntime.Int8ValueValue {
				distance := offset.Value
				if subtract.Kind == checkruntime.BoolValueValue {
					sub := subtract.Value
					if less.Kind == checkruntime.BoolValueValue {
						lower := less.Value
						if distance < int64(0) {
							return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: checkruntime.MakeSqlError(integerInvalidFrameSize)}
						}
						if sub && center < langruntime.CheckedI64Add(int64(-9223372036854775808), distance) {
							return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: lower == false}
						}
						if sub == false && center > langruntime.CheckedI64Subtract(int64(9223372036854775807), distance) {
							return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: lower}
						}
						delta := distance
						if sub {
							delta = langruntime.CheckedI64Subtract(int64(0), distance)
						}
						boundary := langruntime.CheckedI64Add(center, delta)
						if lower {
							return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: input <= boundary}
						}
						return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: input >= boundary}
					}
				}
			}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func InRangeL5vd(value checkruntime.Int8Value, base checkruntime.Int8Value, offset checkruntime.Int8Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := value
	baseWide := base
	offsetWide := offset
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func InRangeEl6v(value checkruntime.Int4Value, base checkruntime.Int4Value, offset checkruntime.Int8Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := Int8Mzac(value)
	baseWide := Int8Mzac(base)
	offsetWide := offset
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func InRangeO7dg(value checkruntime.Int4Value, base checkruntime.Int4Value, offset checkruntime.Int4Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := Int8Mzac(value)
	baseWide := Int8Mzac(base)
	offsetWide := Int8Mzac(offset)
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func InRangeMzmm(value checkruntime.Int4Value, base checkruntime.Int4Value, offset checkruntime.Int2Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := Int8Mzac(value)
	baseWide := Int8Mzac(base)
	offsetWide := Int8Sxtp(offset)
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func InRangeC3nd(value checkruntime.Int2Value, base checkruntime.Int2Value, offset checkruntime.Int8Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := Int8Sxtp(value)
	baseWide := Int8Sxtp(base)
	offsetWide := offset
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func InRangeVdmm(value checkruntime.Int2Value, base checkruntime.Int2Value, offset checkruntime.Int4Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := Int8Sxtp(value)
	baseWide := Int8Sxtp(base)
	offsetWide := Int8Mzac(offset)
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func InRangeGcyn(value checkruntime.Int2Value, base checkruntime.Int2Value, offset checkruntime.Int2Value, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	valueWide := Int8Sxtp(value)
	baseWide := Int8Sxtp(base)
	offsetWide := Int8Sxtp(offset)
	return integerInRange(valueWide, baseWide, offsetWide, subtract, less)
}
func integerSupportCompare(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int4Value {
	if left.Kind == checkruntime.Int8ValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.Int8ValueValue {
		a := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			b := right.Value
			if a < b {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
			}
			if a > b {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Btint24cmp3e3r(left checkruntime.Int2Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftValue := Int8Sxtp(left)
	rightValue := Int8Mzac(right)
	return integerSupportCompare(leftValue, rightValue)
}
func Btint28cmpZz4j(left checkruntime.Int2Value, right checkruntime.Int8Value) checkruntime.Int4Value {
	leftValue := Int8Sxtp(left)
	rightValue := right
	return integerSupportCompare(leftValue, rightValue)
}
func Btint2cmp2zqn(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	leftValue := Int41z1k(left)
	rightValue := Int41z1k(right)
	return Int4miDtqk(leftValue, rightValue)
}
func Btint42cmpOgrx(left checkruntime.Int4Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	leftValue := Int8Mzac(left)
	rightValue := Int8Sxtp(right)
	return integerSupportCompare(leftValue, rightValue)
}
func Btint48cmp9ntl(left checkruntime.Int4Value, right checkruntime.Int8Value) checkruntime.Int4Value {
	leftValue := Int8Mzac(left)
	rightValue := right
	return integerSupportCompare(leftValue, rightValue)
}
func Btint4cmpE3r7(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftValue := Int8Mzac(left)
	rightValue := Int8Mzac(right)
	return integerSupportCompare(leftValue, rightValue)
}
func Btint82cmpGl3p(left checkruntime.Int8Value, right checkruntime.Int2Value) checkruntime.Int4Value {
	leftValue := left
	rightValue := Int8Sxtp(right)
	return integerSupportCompare(leftValue, rightValue)
}
func Btint84cmp4vgw(left checkruntime.Int8Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	leftValue := left
	rightValue := Int8Mzac(right)
	return integerSupportCompare(leftValue, rightValue)
}
func Btint8cmpTevi(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int4Value {
	leftValue := left
	rightValue := right
	return integerSupportCompare(leftValue, rightValue)
}
func Int4absZd8f(input checkruntime.Int4Value) checkruntime.Int4Value {
	return Abs5ajw(input)
}
func Int4incF5m2(input checkruntime.Int4Value) checkruntime.Int4Value {
	return Int4plSj3s(input, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1})
}
func Int8incKe95(input checkruntime.Int8Value) checkruntime.Int8Value {
	return Int8pl1v1h(input, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(1)})
}
func Int8decRhae(input checkruntime.Int8Value) checkruntime.Int8Value {
	return Int8miJasl(input, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(1)})
}
func Mod2som(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	return Int8mod2t8f(left, right)
}
func ModWchm(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	return Int4modJ4pe(left, right)
}
func integerBooleanMerge(left checkruntime.BoolValue, right checkruntime.BoolValue, conjunction bool) checkruntime.BoolValue {
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
		a := left.Value
		if right.Kind == checkruntime.BoolValueValue {
			b := right.Value
			if conjunction {
				return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: a && b}
			}
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: a || b}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BoolandStatefuncDxg8(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	return integerBooleanMerge(left, right, true)
}
func BoolorStatefunc1p3g(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.BoolValue {
	return integerBooleanMerge(left, right, false)
}
func Int2larger9kfl(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	if left.Kind == checkruntime.Int2ValueError {
		error := left.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int2ValueError {
		error := right.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if left == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}) || right == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if left == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}) || right == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if left.Kind == checkruntime.Int2ValueValue {
		a := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int2ValueValue {
			b := langruntime.CheckedI32(right.Value)
			if a > b {
				return left
			}
			return right
		}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func Int2smallerNg6s(left checkruntime.Int2Value, right checkruntime.Int2Value) checkruntime.Int2Value {
	if left.Kind == checkruntime.Int2ValueError {
		error := left.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int2ValueError {
		error := right.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if left == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}) || right == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if left == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}) || right == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if left.Kind == checkruntime.Int2ValueValue {
		a := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int2ValueValue {
			b := langruntime.CheckedI32(right.Value)
			if a < b {
				return left
			}
			return right
		}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func Int4largerFm8j(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
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
		a := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			b := langruntime.CheckedI32(right.Value)
			if a > b {
				return left
			}
			return right
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int4smallerIp0x(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
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
		a := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			b := langruntime.CheckedI32(right.Value)
			if a < b {
				return left
			}
			return right
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int8largerUf9y(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
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
		a := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			b := right.Value
			if a > b {
				return left
			}
			return right
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int8smallerWeow(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
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
		a := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			b := right.Value
			if a < b {
				return left
			}
			return right
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func BoolGxv7(input checkruntime.Int4Value) checkruntime.BoolValue {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: value != 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Int4I3jf(input checkruntime.BoolValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.BoolValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.BoolValueValue {
		value := input.Value
		if value {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func BtboolcmpI7aj(left checkruntime.BoolValue, right checkruntime.BoolValue) checkruntime.Int4Value {
	first := Int4I3jf(left)
	second := Int4I3jf(right)
	return Int4miDtqk(first, second)
}
func Int4up8u1c(input checkruntime.Int4Value) checkruntime.Int4Value {
	return input
}
func Int4umShsd(input checkruntime.Int4Value) checkruntime.Int4Value {
	return Int4miDtqk(checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, input)
}
func integerSupportGcd(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
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
		first := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			second := right.Value
			a := first
			b := second
			if a > int64(0) {
				a = langruntime.CheckedI64Subtract(int64(0), a)
			}
			if b > int64(0) {
				b = langruntime.CheckedI64Subtract(int64(0), b)
			}
			if a > b {
				swap := a
				a = b
				b = swap
			}
			if a == int64(-9223372036854775808) {
				if b == int64(0) || b == int64(-9223372036854775808) {
					return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(sqlstateNumericValueOutOfRange)}
				}
				if b == int64(-1) {
					return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(1)}
				}
			}
			for b != int64(0) {
				remainder := langruntime.CheckedI64Remainder(a, b)
				a = b
				b = remainder
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(int64(0), a)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func GcdIh0m(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
	return integerSupportGcd(left, right)
}
func Gcd5cjb(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	first := Int8Mzac(left)
	second := Int8Mzac(right)
	result := integerSupportGcd(first, second)
	return Int45ywh(result)
}
func LcmWnc0(left checkruntime.Int8Value, right checkruntime.Int8Value) checkruntime.Int8Value {
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
		first := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			second := right.Value
			if first == int64(0) || second == int64(0) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(0)}
			}
			divisor := integerSupportGcd(left, right)
			reduced := Int8div8s66(left, divisor)
			product := Int8mul6t1m(reduced, right)
			return Abs36t4(product)
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Lcm90j8(left checkruntime.Int4Value, right checkruntime.Int4Value) checkruntime.Int4Value {
	first := Int8Mzac(left)
	second := Int8Mzac(right)
	result := LcmWnc0(first, second)
	return Int45ywh(result)
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
func numericWorkMagnitude(left numericWork, right numericWork) int {
	left = copynumericWork(left)
	right = copynumericWork(right)
	if left.sign == 0 {
		if right.sign == 0 {
			return 0
		}
		return langruntime.CheckedSignedNegate(1)
	}
	if right.sign == 0 {
		return 1
	}
	if left.weight < right.weight {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.weight > right.weight {
		return 1
	}
	first := []rune(left.digits)
	second := []rune(right.digits)
	index := 0
	for index < len(first) || index < len(second) {
		a := 0
		b := 0
		if index < len(first) {
			a = langruntime.CheckedI32(numericWireDecimalDigit(first[index]))
		}
		if index < len(second) {
			b = langruntime.CheckedI32(numericWireDecimalDigit(second[index]))
		}
		if a < b {
			return langruntime.CheckedSignedNegate(1)
		}
		if a > b {
			return 1
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return 0
}
func numericWorkSum(left numericWork, right numericWork, subtract bool) numericWork {
	left = copynumericWork(left)
	right = copynumericWork(right)
	scale := left.scale
	if right.scale > scale {
		scale = langruntime.CheckedI32(right.scale)
	}
	sign := left.sign
	otherSign := right.sign
	if subtract {
		otherSign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, otherSign))
	}
	adding := sign == otherSign
	swap := false
	if adding == false {
		order := numericWorkMagnitude(copynumericWork(left), copynumericWork(right))
		if order < 0 {
			swap = true
			sign = langruntime.CheckedI32(otherSign)
		}
		if order == 0 {
			sign = langruntime.CheckedI32(0)
		}
	}
	weight := left.weight
	if right.weight > weight {
		weight = langruntime.CheckedI32(right.weight)
	}
	weight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(weight, 1))
	first := []rune(left.digits)
	second := []rune(right.digits)
	aIndex := 0
	bIndex := 0
	aDigits := []numericWireDigit{}
	bDigits := []numericWireDigit{}
	position := weight
	for position >= langruntime.CheckedSignedSubtract(0, scale) {
		a := 0
		b := 0
		if position <= left.weight && aIndex < len(first) {
			a = langruntime.CheckedI32(numericWireDecimalDigit(first[aIndex]))
			aIndex = langruntime.CheckedAdd(aIndex, 1)
		}
		if position <= right.weight && bIndex < len(second) {
			b = langruntime.CheckedI32(numericWireDecimalDigit(second[bIndex]))
			bIndex = langruntime.CheckedAdd(bIndex, 1)
		}
		langruntime.CheckedAdd(len(aDigits), 1)
		aDigits = append(aDigits, copynumericWireDigit(numericWireDigit{value: a}))
		langruntime.CheckedAdd(len(bDigits), 1)
		bDigits = append(bDigits, copynumericWireDigit(numericWireDigit{value: b}))
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	result := []numericWireDigit{}
	index := 0
	for index < len(aDigits) {
		langruntime.CheckedAdd(len(result), 1)
		result = append(result, copynumericWireDigit(numericWireDigit{value: 0}))
		index = langruntime.CheckedAdd(index, 1)
	}
	carry := 0
	for index > 0 {
		index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
		a := aDigits[index].value
		b := bDigits[index].value
		if swap {
			a = langruntime.CheckedI32(bDigits[index].value)
			b = langruntime.CheckedI32(aDigits[index].value)
		}
		digit := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(a, b), carry)
		if adding {
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(digit, 10))
			digit = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(digit, 10))
		} else {
			digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(a, b), carry))
			carry = langruntime.CheckedI32(0)
			if digit < 0 {
				digit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(digit, 10))
				carry = langruntime.CheckedI32(1)
			}
		}
		result[index] = copynumericWireDigit(numericWireDigit{value: digit})
	}
	end := len(result)
	for end > 0 && result[langruntime.CheckedSubtract(end, 1)].value == 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	start := 0
	for start < end && result[start].value == 0 {
		start = langruntime.CheckedAdd(start, 1)
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	digits := ""
	index = langruntime.CheckedIndex(start)
	for index < end {
		digits = digits + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(result[index].value, 48)), '0')))
		index = langruntime.CheckedAdd(index, 1)
	}
	if start == end {
		sign = langruntime.CheckedI32(0)
		weight = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: digits}
}
func numericWorkAdd(left numericWork, right numericWork, subtract bool) checkruntime.NumericValue {
	left = copynumericWork(left)
	right = copynumericWork(right)
	work := numericWorkSum(left, right, subtract)
	if work.weight > 131071 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
}
func numericProductWords(characters []rune) []numericWireDigit {
	characters = langruntime.CheckedChars(characters)
	words := []numericWireDigit{}
	end := len(characters)
	for end > 0 {
		value := 0
		factor := 1
		width := 0
		for end > 0 && width < 4 {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
			value = langruntime.CheckedI32(langruntime.CheckedSignedAdd(value, langruntime.CheckedSignedMultiply(numericWireDecimalDigit(characters[end]), factor)))
			factor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(factor, 10))
			width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 1))
		}
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, copynumericWireDigit(numericWireDigit{value: value}))
	}
	return words
}
func numericWorkProduct(left numericWork, right numericWork) numericWork {
	left = copynumericWork(left)
	right = copynumericWork(right)
	scale := langruntime.CheckedSignedAdd(left.scale, right.scale)
	sign := langruntime.CheckedSignedMultiply(left.sign, right.sign)
	first := []rune(left.digits)
	second := []rune(right.digits)
	aCount := 0
	bCount := 0
	index := 0
	for index < len(first) {
		aCount = langruntime.CheckedI32(langruntime.CheckedSignedAdd(aCount, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	index = langruntime.CheckedIndex(0)
	for index < len(second) {
		bCount = langruntime.CheckedI32(langruntime.CheckedSignedAdd(bCount, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	a := numericProductWords(first)
	b := numericProductWords(second)
	result := []numericWireDigit{}
	index = langruntime.CheckedIndex(0)
	for index < langruntime.CheckedAdd(langruntime.CheckedAdd(len(a), len(b)), 1) {
		langruntime.CheckedAdd(len(result), 1)
		result = append(result, copynumericWireDigit(numericWireDigit{value: 0}))
		index = langruntime.CheckedAdd(index, 1)
	}
	aIndex := 0
	for aIndex < len(a) {
		bIndex := 0
		carry := 0
		for bIndex < len(b) {
			offset := langruntime.CheckedAdd(aIndex, bIndex)
			product := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(a[aIndex].value, b[bIndex].value), result[offset].value), carry)
			result[offset] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(product, 10000)})
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(product, 10000))
			bIndex = langruntime.CheckedAdd(bIndex, 1)
		}
		offset := langruntime.CheckedAdd(aIndex, bIndex)
		for carry > 0 {
			word := langruntime.CheckedSignedAdd(result[offset].value, carry)
			result[offset] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(word, 10000)})
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(word, 10000))
			offset = langruntime.CheckedAdd(offset, 1)
		}
		aIndex = langruntime.CheckedAdd(aIndex, 1)
	}
	end := len(result)
	for end > 0 && result[langruntime.CheckedSubtract(end, 1)].value == 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	coefficient := ""
	count := 0
	for end > 0 {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		word := result[end].value
		place := 1000
		for place > 0 {
			digit := langruntime.CheckedSignedDivide(word, place)
			word = langruntime.CheckedI32(langruntime.CheckedSignedRemainder(word, place))
			if coefficient != "" || digit != 0 {
				coefficient = coefficient + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(digit, 48)), '0')))
				count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
			}
			place = langruntime.CheckedI32(langruntime.CheckedSignedDivide(place, 10))
		}
	}
	weight := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(left.weight, right.weight), count), aCount), bCount), 1)
	characters := []rune(coefficient)
	end = langruntime.CheckedIndex(len(characters))
	for end > 0 && characters[langruntime.CheckedSubtract(end, 1)] == '0' {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	digits := ""
	index = langruntime.CheckedIndex(0)
	for index < end {
		digits = digits + string(langruntime.CheckedChar(characters[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	if sign == 0 {
		weight = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: digits}
}
func numericWorkMultiply(left numericWork, right numericWork) checkruntime.NumericValue {
	left = copynumericWork(left)
	right = copynumericWork(right)
	work := numericWorkProduct(left, right)
	scale := work.scale
	return numericWorkRound(work, scale, 1)
}
func numericArithmetic(left checkruntime.NumericValue, right checkruntime.NumericValue, mode int) checkruntime.NumericValue {
	mode = langruntime.CheckedI32(mode)
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			b := langruntime.CheckedString(right.Value)
			first := numericWorkFromValue(a)
			second := numericWorkFromValue(b)
			if first.valid == false || second.valid == false {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
			}
			if first.special == 3 || second.special == 3 {
				return checkruntime.MakeNumericValue("NaN")
			}
			if first.special != 1 || second.special != 1 {
				leftSign := first.sign
				rightSign := second.sign
				if first.special == 0 {
					leftSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if first.special == 2 {
					leftSign = langruntime.CheckedI32(1)
				}
				if second.special == 0 {
					rightSign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if second.special == 2 {
					rightSign = langruntime.CheckedI32(1)
				}
				if mode == 1 {
					rightSign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, rightSign))
				}
				resultSign := leftSign
				if mode == 2 {
					resultSign = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(leftSign, rightSign))
				} else if first.special == 1 {
					resultSign = langruntime.CheckedI32(rightSign)
				} else if second.special != 1 && leftSign != rightSign {
					resultSign = langruntime.CheckedI32(0)
				}
				if resultSign == 0 {
					return checkruntime.MakeNumericValue("NaN")
				}
				if resultSign < 0 {
					return checkruntime.MakeNumericValue("-Infinity")
				}
				return checkruntime.MakeNumericValue("Infinity")
			}
			if mode == 2 {
				return numericWorkMultiply(first, second)
			}
			return numericWorkAdd(first, second, mode == 1)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericAddO3d7(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericArithmetic(left, right, 0)
}
func NumericSubYs09(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericArithmetic(left, right, 1)
}
func NumericMulBj4l(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericArithmetic(left, right, 2)
}
func NumericInc6dcf(input checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericAddO3d7(input, checkruntime.MakeNumericValue("1"))
}

const numericBucketInvalidArgument = 3452596

func numericBucketOrder(left numericWork, right numericWork) int {
	left = copynumericWork(left)
	right = copynumericWork(right)
	if left.special == 0 {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.special == 2 {
		return 1
	}
	if left.sign < right.sign {
		return langruntime.CheckedSignedNegate(1)
	}
	if left.sign > right.sign {
		return 1
	}
	order := numericWorkMagnitude(copynumericWork(left), right)
	if left.sign < 0 {
		return langruntime.CheckedSignedSubtract(0, order)
	}
	return order
}
func numericBucket(value string, lower string, upper string, count int) checkruntime.Int4Value {
	value = langruntime.CheckedString(value)
	lower = langruntime.CheckedString(lower)
	upper = langruntime.CheckedString(upper)
	count = langruntime.CheckedI32(count)
	operand := numericWorkFromValue(value)
	first := numericWorkFromValue(lower)
	last := numericWorkFromValue(upper)
	if operand.valid == false || first.valid == false || last.valid == false {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if count <= 0 || operand.special == 3 || first.special != 1 || last.special != 1 {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(numericBucketInvalidArgument)}
	}
	direction := numericBucketOrder(copynumericWork(first), copynumericWork(last))
	if direction == 0 {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(numericBucketInvalidArgument)}
	}
	start := numericBucketOrder(copynumericWork(operand), copynumericWork(first))
	end := numericBucketOrder(copynumericWork(operand), copynumericWork(last))
	if (direction < 0 && start < 0) || (direction > 0 && start > 0) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
	}
	if (direction < 0 && end >= 0) || (direction > 0 && end <= 0) {
		if count == 2147483647 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedAdd(count, 1)}
	}
	distance := numericWorkSum(operand, copynumericWork(first), true)
	span := numericWorkSum(last, first, true)
	multiplier := numericWorkFromValue(checkruntime.TextNumber(count, 10))
	scaled := numericWorkProduct(distance, multiplier)
	quotient := numericDivisionWork(scaled, span, 0, false)
	integer := numericIntegerValue(checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(quotient)})
	if integer.Kind == checkruntime.Int8ValueError {
		error := integer.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if integer.Kind == checkruntime.Int8ValueValue {
		number := integer.Value
		if number < int64(0) || number >= int64(2147483647) {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
		}
		bucket := int(int32(number))
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedAdd(bucket, 1)}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func WidthBucketMx75(value checkruntime.NumericValue, lower checkruntime.NumericValue, upper checkruntime.NumericValue, count checkruntime.Int4Value) checkruntime.Int4Value {
	if value.Kind == checkruntime.NumericValueError {
		error := value.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if lower.Kind == checkruntime.NumericValueError {
		error := lower.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if upper.Kind == checkruntime.NumericValueError {
		error := upper.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if count.Kind == checkruntime.Int4ValueError {
		error := count.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if value == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || lower == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || upper == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || count == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if value == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || lower == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || upper == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || count == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if value.Kind == checkruntime.NumericValueValue {
		input := langruntime.CheckedString(value.Value)
		if lower.Kind == checkruntime.NumericValueValue {
			first := langruntime.CheckedString(lower.Value)
			if upper.Kind == checkruntime.NumericValueValue {
				last := langruntime.CheckedString(upper.Value)
				if count.Kind == checkruntime.Int4ValueValue {
					buckets := langruntime.CheckedI32(count.Value)
					return numericBucket(input, first, last, buckets)
				}
			}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func numericCommonWork(work numericWork, scale int) numericWork {
	work = copynumericWork(work)
	scale = langruntime.CheckedI32(scale)
	sign := work.sign
	if sign < 0 {
		sign = langruntime.CheckedI32(1)
	}
	return numericWork{valid: work.valid, special: work.special, sign: sign, weight: work.weight, scale: scale, digits: work.digits}
}
func numericCommon(left checkruntime.NumericValue, right checkruntime.NumericValue, multiple bool) checkruntime.NumericValue {
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		first := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			second := langruntime.CheckedString(right.Value)
			a := numericWorkFromValue(first)
			b := numericWorkFromValue(second)
			if a.valid == false || b.valid == false {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
			}
			if a.special != 1 || b.special != 1 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
			}
			scale := a.scale
			if scale < b.scale {
				scale = langruntime.CheckedI32(b.scale)
			}
			if multiple && (a.sign == 0 || b.sign == 0) {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericCommonWork(numericWorkFromValue("0"), scale))}
			}
			dividend := numericWorkText(numericCommonWork(copynumericWork(a), scale))
			divisor := numericWorkText(numericCommonWork(copynumericWork(b), scale))
			active := b.sign != 0
			for active {
				remainder := numericDivision(checkruntime.MakeNumericValue(dividend), checkruntime.MakeNumericValue(divisor), 2)
				if remainder.Kind == checkruntime.NumericValueError {
					error := remainder.Error
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
				}
				if remainder == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
				}
				dividend = langruntime.CheckedString(langruntime.CheckedString(divisor))
				if remainder.Kind == checkruntime.NumericValueValue {
					value := langruntime.CheckedString(remainder.Value)
					layout := checkruntime.NumericParts(value)
					active = layout.Sign != 0
					divisor = langruntime.CheckedString(value)
				}
			}
			if multiple {
				quotient := numericDivisionWork(a, numericWorkFromValue(dividend), 0, false)
				product := numericWorkMultiply(quotient, b)
				if product.Kind == checkruntime.NumericValueValue {
					value := langruntime.CheckedString(product.Value)
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericCommonWork(numericWorkFromValue(value), scale))}
				}
				return product
			}
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericCommonWork(numericWorkFromValue(dividend), scale))}
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func GcdBke6(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericCommon(left, right, false)
}
func LcmPjls(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericCommon(left, right, true)
}
func numericDivisionScale(left numericWork, right numericWork) int {
	left = copynumericWork(left)
	right = copynumericWork(right)
	firstWeight := 0
	secondWeight := 0
	firstDigit := 0
	secondDigit := 0
	first := []rune(left.digits)
	second := []rune(right.digits)
	if left.sign != 0 {
		firstWeight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(left.weight, 4))
		width := langruntime.CheckedSignedRemainder(left.weight, 4)
		if width < 0 {
			firstWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(firstWeight, 1))
			width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 4))
		}
		width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 1))
		index := 0
		for width > 0 {
			firstDigit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(firstDigit, 10))
			if index < len(first) {
				firstDigit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(firstDigit, numericWireDecimalDigit(first[index])))
			}
			index = langruntime.CheckedAdd(index, 1)
			width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
		}
	}
	if right.sign != 0 {
		secondWeight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(right.weight, 4))
		width := langruntime.CheckedSignedRemainder(right.weight, 4)
		if width < 0 {
			secondWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(secondWeight, 1))
			width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 4))
		}
		width = langruntime.CheckedI32(langruntime.CheckedSignedAdd(width, 1))
		index := 0
		for width > 0 {
			secondDigit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(secondDigit, 10))
			if index < len(second) {
				secondDigit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(secondDigit, numericWireDecimalDigit(second[index])))
			}
			index = langruntime.CheckedAdd(index, 1)
			width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
		}
	}
	quotientWeight := langruntime.CheckedSignedSubtract(firstWeight, secondWeight)
	if firstDigit <= secondDigit {
		quotientWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(quotientWeight, 1))
	}
	scale := langruntime.CheckedSignedSubtract(16, langruntime.CheckedSignedMultiply(quotientWeight, 4))
	if scale < left.scale {
		scale = langruntime.CheckedI32(left.scale)
	}
	if scale < right.scale {
		scale = langruntime.CheckedI32(right.scale)
	}
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	if scale > 1000 {
		scale = langruntime.CheckedI32(1000)
	}
	return scale
}
func numericDivisionWork(left numericWork, right numericWork, scale int, rounding bool) numericWork {
	left = copynumericWork(left)
	right = copynumericWork(right)
	scale = langruntime.CheckedI32(scale)
	first := []rune(left.digits)
	second := []rune(right.digits)
	denominator := []numericWireDigit{}
	remainder := []numericWireDigit{}
	langruntime.CheckedAdd(len(remainder), 1)
	remainder = append(remainder, copynumericWireDigit(numericWireDigit{value: 0}))
	secondExponent := langruntime.CheckedSignedAdd(right.weight, 1)
	index := 0
	for index < len(second) {
		langruntime.CheckedAdd(len(denominator), 1)
		denominator = append(denominator, copynumericWireDigit(numericWireDigit{value: numericWireDecimalDigit(second[index])}))
		langruntime.CheckedAdd(len(remainder), 1)
		remainder = append(remainder, copynumericWireDigit(numericWireDigit{value: 0}))
		secondExponent = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(secondExponent, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	position := langruntime.CheckedSignedSubtract(left.weight, secondExponent)
	boundary := langruntime.CheckedSignedSubtract(0, scale)
	if rounding {
		boundary = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(boundary, 1))
	}
	coefficient := ""
	weight := 0
	sign := 0
	index = langruntime.CheckedIndex(0)
	for position >= boundary && left.sign != 0 {
		cursor := 0
		for langruntime.CheckedAdd(cursor, 1) < len(remainder) {
			remainder[cursor] = copynumericWireDigit(remainder[langruntime.CheckedAdd(cursor, 1)])
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		digit := 0
		if index < len(first) {
			digit = langruntime.CheckedI32(numericWireDecimalDigit(first[index]))
		}
		remainder[cursor] = copynumericWireDigit(numericWireDigit{value: digit})
		index = langruntime.CheckedAdd(index, 1)
		quotient := 0
		subtract := true
		for subtract {
			subtract = remainder[0].value != 0
			if subtract == false {
				order := 0
				cursor = langruntime.CheckedIndex(0)
				for cursor < len(denominator) && order == 0 {
					if remainder[langruntime.CheckedAdd(cursor, 1)].value < denominator[cursor].value {
						order = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
					}
					if remainder[langruntime.CheckedAdd(cursor, 1)].value > denominator[cursor].value {
						order = langruntime.CheckedI32(1)
					}
					cursor = langruntime.CheckedAdd(cursor, 1)
				}
				subtract = order >= 0
			}
			if subtract {
				borrow := 0
				cursor = langruntime.CheckedIndex(len(denominator))
				for cursor > 0 {
					difference := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(remainder[cursor].value, denominator[langruntime.CheckedSubtract(cursor, 1)].value), borrow)
					borrow = langruntime.CheckedI32(0)
					if difference < 0 {
						difference = langruntime.CheckedI32(langruntime.CheckedSignedAdd(difference, 10))
						borrow = langruntime.CheckedI32(1)
					}
					remainder[cursor] = copynumericWireDigit(numericWireDigit{value: difference})
					cursor = langruntime.CheckedIndex(langruntime.CheckedSubtract(cursor, 1))
				}
				remainder[0] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedSubtract(remainder[0].value, borrow)})
				quotient = langruntime.CheckedI32(langruntime.CheckedSignedAdd(quotient, 1))
			}
		}
		if quotient != 0 && sign == 0 {
			sign = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(left.sign, right.sign))
			weight = langruntime.CheckedI32(position)
		}
		if sign != 0 {
			coefficient = coefficient + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(quotient, 48)), '0')))
		}
		nonzero := false
		cursor = langruntime.CheckedIndex(0)
		for cursor < len(remainder) {
			if remainder[cursor].value != 0 {
				nonzero = true
			}
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		if index >= len(first) && nonzero == false {
			position = langruntime.CheckedI32(boundary)
		}
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: coefficient}
}
func numericDivision(left checkruntime.NumericValue, right checkruntime.NumericValue, mode int) checkruntime.NumericValue {
	mode = langruntime.CheckedI32(mode)
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		first := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			second := langruntime.CheckedString(right.Value)
			a := numericWorkFromValue(first)
			b := numericWorkFromValue(second)
			if a.valid == false || b.valid == false {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
			}
			if a.special == 3 || b.special == 3 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
			}
			if b.special == 1 && b.sign == 0 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
			}
			if a.special != 1 {
				if mode == 2 || b.special != 1 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
				}
				sign := b.sign
				if a.special == 0 {
					sign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, sign))
				}
				if sign < 0 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-Infinity"}
				}
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
			}
			if b.special != 1 {
				if mode == 2 {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: first}
				}
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
			}
			if mode == 2 {
				quotient := numericDivisionWork(copynumericWork(a), copynumericWork(b), 0, false)
				product := numericWorkMultiply(quotient, b)
				if product.Kind == checkruntime.NumericValueValue {
					multiplied := langruntime.CheckedString(product.Value)
					return numericWorkAdd(a, numericWorkFromValue(multiplied), true)
				}
				return product
			}
			scale := 0
			rounding := false
			if mode == 0 {
				scale = langruntime.CheckedI32(numericDivisionScale(copynumericWork(a), copynumericWork(b)))
				rounding = true
			}
			quotient := numericDivisionWork(a, b, scale, rounding)
			roundMode := 0
			if rounding {
				roundMode = langruntime.CheckedI32(1)
			}
			return numericWorkRound(quotient, scale, roundMode)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericDivPnzm(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 0)
}
func NumericDivTrunc5o9b(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 1)
}
func DivN5y4(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 1)
}
func NumericMod8ywz(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 2)
}
func Mod4p6l(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return numericDivision(left, right, 2)
}

var numericExpLog10E = float64(0.434294481903252)

func numericExponentialScale(input numericWork) int {
	input = copynumericWork(input)
	value := numericWorkText(copynumericWork(input))
	parsed := langruntime.F64FromText(value, float64(0.0))
	estimate := langruntime.F64Multiply(parsed, numericExpLog10E)
	if estimate < float64(-2000.0) {
		estimate = float64(-2000.0)
	}
	if estimate > float64(2000.0) {
		estimate = float64(2000.0)
	}
	scale := langruntime.CheckedSignedSubtract(16, langruntime.F64ToI32(estimate))
	if scale < input.scale {
		scale = langruntime.CheckedI32(input.scale)
	}
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	if scale > 1000 {
		scale = langruntime.CheckedI32(1000)
	}
	return scale
}
func numericExponentialWork(input numericWork, scale int) numericWork {
	input = copynumericWork(input)
	scale = langruntime.CheckedI32(scale)
	text := numericWorkText(copynumericWork(input))
	estimate := langruntime.F64FromText(text, float64(0.0))
	if langruntime.F64Abs(estimate) >= float64(6000.0) {
		if estimate > float64(0.0) {
			return numericWork{valid: false, special: 1, sign: 0, weight: 0, scale: scale, digits: ""}
		}
		return numericWorkRounded(numericWorkFromValue("0"), scale, 1)
	}
	weight := langruntime.F64ToI32((langruntime.F64Multiply(estimate, numericExpLog10E)))
	divisions := 0
	divisor := 1
	x := input
	for langruntime.F64Abs(estimate) > float64(0.01) {
		divisions = langruntime.CheckedI32(langruntime.CheckedSignedAdd(divisions, 1))
		divisor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(divisor, 2))
		estimate = langruntime.F64Divide(estimate, float64(2.0))
	}
	if divisions > 0 {
		localScale := langruntime.CheckedSignedAdd(x.scale, divisions)
		denominator := numericWorkFromValue(checkruntime.TextNumber(divisor, 10))
		x = copynumericWork(numericWorkRounded(numericDivisionWork(x, denominator, localScale, true), localScale, 1))
	}
	extra := langruntime.F64ToI32((langruntime.F64Multiply(float64(divisions), float64(0.301029995663981))))
	significant := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(1, weight), scale), extra)
	if significant < 0 {
		significant = langruntime.CheckedI32(0)
	}
	significant = langruntime.CheckedI32(langruntime.CheckedSignedAdd(significant, 8))
	localScale := langruntime.CheckedSignedSubtract(significant, 1)
	result := numericWorkSum(numericWorkFromValue("1"), copynumericWork(x), false)
	product := numericWorkProduct(copynumericWork(x), copynumericWork(x))
	term := numericWorkRounded(product, localScale, 1)
	number := 2
	term = copynumericWork(numericWorkRounded(numericDivisionWork(term, numericWorkFromValue("2"), localScale, true), localScale, 1))
	for term.sign != 0 {
		result = copynumericWork(numericWorkSum(result, copynumericWork(term), false))
		term = copynumericWork(numericWorkRounded(numericWorkProduct(term, copynumericWork(x)), localScale, 1))
		number = langruntime.CheckedI32(langruntime.CheckedSignedAdd(number, 1))
		denominator := numericWorkFromValue(checkruntime.TextNumber(number, 10))
		term = copynumericWork(numericWorkRounded(numericDivisionWork(term, denominator, localScale, true), localScale, 1))
	}
	for divisions > 0 {
		squareScale := langruntime.CheckedSignedSubtract(significant, langruntime.CheckedSignedMultiply(numericMathGroupWeight(copynumericWork(result)), 8))
		if squareScale < 0 {
			squareScale = langruntime.CheckedI32(0)
		}
		result = copynumericWork(numericWorkRounded(numericWorkProduct(copynumericWork(result), result), squareScale, 1))
		divisions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(divisions, 1))
	}
	return numericWorkRounded(result, scale, 1)
}
func NumericExpFi9j(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if work.special == 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
		}
		if work.special != 1 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
		}
		scale := numericExponentialScale(copynumericWork(work))
		result := numericExponentialWork(work, scale)
		if result.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
		}
		return numericWorkRound(result, scale, 1)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func ExpAo9b(input checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericExpFi9j(input)
}
func FactorialTah6(input checkruntime.Int8Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		if value < int64(0) || value > int64(32177) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
		}
		limit := int(int32(value))
		words := []numericWireDigit{}
		langruntime.CheckedAdd(len(words), 1)
		words = append(words, copynumericWireDigit(numericWireDigit{value: 1}))
		factor := 2
		for factor <= limit {
			carry := 0
			index := 0
			for index < len(words) {
				product := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(words[index].value, factor), carry)
				words[index] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(product, 10000)})
				carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(product, 10000))
				index = langruntime.CheckedAdd(index, 1)
			}
			for carry > 0 {
				langruntime.CheckedAdd(len(words), 1)
				words = append(words, copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(carry, 10000)}))
				carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(carry, 10000))
			}
			factor = langruntime.CheckedI32(langruntime.CheckedSignedAdd(factor, 1))
		}
		index := len(words)
		output := ""
		for index > 0 {
			index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
			word := words[index].value
			if langruntime.CheckedAdd(index, 1) == len(words) {
				output = output + checkruntime.TextNumber(word, 10)
			} else {
				thousands := langruntime.CheckedSignedDivide(word, 1000)
				hundreds := langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(word, 100)), 10)
				tens := langruntime.CheckedSignedRemainder((langruntime.CheckedSignedDivide(word, 10)), 10)
				ones := langruntime.CheckedSignedRemainder(word, 10)
				output = output + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(thousands, 48)), '0')))
				output = output + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(hundreds, 48)), '0')))
				output = output + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(tens, 48)), '0')))
				output = output + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(ones, 48)), '0')))
			}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: output}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func numericHashDigits(value string) []checkruntime.HashByte {
	value = langruntime.CheckedString(value)
	layout := checkruntime.NumericParts(value)
	characters := []rune(value)
	remainder := langruntime.CheckedSignedRemainder(layout.Weight, 4)
	if remainder < 0 {
		remainder = langruntime.CheckedI32(langruntime.CheckedSignedAdd(remainder, 4))
	}
	position := langruntime.CheckedSignedSubtract(3, remainder)
	group := 0
	index := layout.First
	bytes := []checkruntime.HashByte{}
	for index < layout.End {
		digit := numericWireDecimalDigit(characters[index])
		if digit >= 0 {
			group = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(group, 10), digit))
			position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
			if position == 4 {
				low := langruntime.CheckedSignedRemainder(group, 256)
				high := langruntime.CheckedSignedDivide(group, 256)
				langruntime.CheckedAdd(len(bytes), 1)
				bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(low))}))
				langruntime.CheckedAdd(len(bytes), 1)
				bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(high))}))
				position = langruntime.CheckedI32(0)
				group = langruntime.CheckedI32(0)
			}
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	if position > 0 {
		for position < 4 {
			group = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(group, 10))
			position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
		}
		low := langruntime.CheckedSignedRemainder(group, 256)
		high := langruntime.CheckedSignedDivide(group, 256)
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(low))}))
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(high))}))
	}
	return bytes
}
func HashNumeric0e7w(input checkruntime.NumericValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		layout := checkruntime.NumericParts(value)
		if layout.Valid == false {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
		}
		if layout.Special != 1 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
		if layout.Sign == 0 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedNegate(1)}
		}
		weight := langruntime.CheckedSignedDivide(layout.Weight, 4)
		if langruntime.CheckedSignedRemainder(layout.Weight, 4) < 0 {
			weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
		}
		bytes := numericHashDigits(value)
		hash := checkruntime.HashBytes32(bytes)
		return Int4xor6j8h(checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: hash}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: weight})
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func HashNumericExtendedOglu(input checkruntime.NumericValue, seed checkruntime.Int8Value) checkruntime.Int8Value {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if seed.Kind == checkruntime.Int8ValueError {
		error := seed.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		if seed.Kind == checkruntime.Int8ValueValue {
			salt := seed.Value
			layout := checkruntime.NumericParts(value)
			if layout.Valid == false {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
			}
			if layout.Special != 1 {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: salt}
			}
			if layout.Sign == 0 {
				if salt == int64(-9223372036854775808) {
					return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(9223372036854775807)}
				}
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(salt, int64(1))}
			}
			weight := langruntime.CheckedSignedDivide(layout.Weight, 4)
			if langruntime.CheckedSignedRemainder(layout.Weight, 4) < 0 {
				weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
			}
			wideWeight := int64(langruntime.CheckedI32(weight))
			bytes := numericHashDigits(value)
			hash := checkruntime.HashBytes64(bytes, salt)
			return Int8xor4v56(checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: hash}, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: wideWeight})
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func AbsM5ih(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		special := work.special
		sign := work.sign
		outputScale := work.scale
		if sign < 0 {
			sign = langruntime.CheckedI32(1)
		}
		if special == 0 {
			special = langruntime.CheckedI32(2)
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func MinScaleB8o1(input checkruntime.NumericValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
		}
		if work.special != 1 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: numericWorkMinScale(work)}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func NumericAbs6g5e(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		special := work.special
		sign := work.sign
		outputScale := work.scale
		if sign < 0 {
			sign = langruntime.CheckedI32(1)
		}
		if special == 0 {
			special = langruntime.CheckedI32(2)
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericCmp6h4s(input checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.Int4Value {
	result := numericCompare(input, right)
	return result
}
func NumericLarger4j2h(input checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	result := numericCompare(input, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		if order > 0 {
			return input
		}
		return right
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericSmallerB9i1(input checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	result := numericCompare(input, right)
	if result.Kind == checkruntime.Int4ValueError {
		error := result.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if result == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if result.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(result.Value)
		if order < 0 {
			return input
		}
		return right
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericUminusWcmy(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		special := work.special
		sign := work.sign
		outputScale := work.scale
		sign = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, sign))
		if special == 0 {
			special = langruntime.CheckedI32(2)
		} else if special == 2 {
			special = langruntime.CheckedI32(0)
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericUplus2a0z(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		special := work.special
		sign := work.sign
		outputScale := work.scale
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func ScaleSvql(input checkruntime.NumericValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
		}
		if work.special != 1 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: work.scale}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Sign2rsu(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if work.special == 3 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
		}
		if work.special == 0 || work.sign < 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-1"}
		}
		if work.special == 2 || work.sign > 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "1"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func TrimScale3rbp(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		special := work.special
		sign := work.sign
		outputScale := numericWorkMinScale(copynumericWork(work))
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWork{valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits})}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}

const numericIntegerRangeError = 3452547
const numericIntegerSpecialError = 466560

func numericIntegerValue(input checkruntime.NumericValue) checkruntime.Int8Value {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		text := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(text)
		if work.valid == false {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
		}
		if work.special != 1 {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(numericIntegerSpecialError)}
		}
		if work.sign != 0 && work.weight > 18 {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(numericIntegerRangeError)}
		}
		rounded := numericWorkRound(work, 0, 1)
		if rounded.Kind == checkruntime.NumericValueError {
			error := rounded.Error
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
		}
		if rounded.Kind == checkruntime.NumericValueValue {
			value := langruntime.CheckedString(rounded.Value)
			parts := checkruntime.NumericParts(value)
			if parts.Sign == 0 {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: int64(0)}
			}
			if parts.Weight > 18 {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(numericIntegerRangeError)}
			}
			characters := []rune(value)
			result := int64(0)
			index := parts.First
			position := 0
			for position <= parts.Weight {
				digit := int64(0)
				if index < parts.End {
					digit = int64(langruntime.CheckedI32(numericWireDecimalDigit(characters[index])))
					index = langruntime.CheckedAdd(index, 1)
				}
				if result < int64(-922337203685477580) || (result == int64(-922337203685477580) && digit > int64(8)) {
					return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(numericIntegerRangeError)}
				}
				result = langruntime.CheckedI64Subtract(langruntime.CheckedI64Multiply(result, int64(10)), digit)
				position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
			}
			if parts.Sign < 0 {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: result}
			}
			if result == int64(-9223372036854775808) {
				return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(numericIntegerRangeError)}
			}
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(int64(0), result)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Int2Zpjn(input checkruntime.NumericValue) checkruntime.Int2Value {
	converted := numericIntegerValue(input)
	if converted.Kind == checkruntime.Int8ValueError {
		error := converted.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if converted == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if converted == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if converted.Kind == checkruntime.Int8ValueValue {
		value := converted.Value
		if value < int64(-32768) || value > int64(32767) {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: checkruntime.MakeSqlError(numericIntegerRangeError)}
		}
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: int(int32(value))}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func Int4Z4rh(input checkruntime.NumericValue) checkruntime.Int4Value {
	converted := numericIntegerValue(input)
	if converted.Kind == checkruntime.Int8ValueError {
		error := converted.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if converted == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if converted == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if converted.Kind == checkruntime.Int8ValueValue {
		value := converted.Value
		if value < int64(-2147483648) || value > int64(2147483647) {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(numericIntegerRangeError)}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: int(int32(value))}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Int8Xy54(input checkruntime.NumericValue) checkruntime.Int8Value {
	return numericIntegerValue(input)
}
func NumericItt9(input checkruntime.Int2Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.Int2ValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.Int2ValueValue {
		value := langruntime.CheckedI32(input.Value)
		integer := int64(langruntime.CheckedI32(value))
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(integer)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func NumericNcrk(input checkruntime.Int4Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.Int4ValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.Int4ValueValue {
		value := langruntime.CheckedI32(input.Value)
		integer := int64(langruntime.CheckedI32(value))
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(integer)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func Numeric11bc(input checkruntime.Int8Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.Int8ValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.Int8ValueValue {
		value := input.Value
		integer := value
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(integer)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}

const numericLogInvalidArgument = 3452594

var numericLnTenEstimate = float64(2.302585092994046)

func numericMathGroupWeight(work numericWork) int {
	work = copynumericWork(work)
	group := langruntime.CheckedSignedDivide(work.weight, 4)
	if langruntime.CheckedSignedRemainder(work.weight, 4) < 0 {
		group = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(group, 1))
	}
	return group
}
func numericLogarithmWeight(work numericWork) int {
	work = copynumericWork(work)
	lower := numericWorkFromValue("0.9")
	upper := numericWorkFromValue("1.1")
	if numericWorkMagnitude(copynumericWork(work), lower) >= 0 && numericWorkMagnitude(copynumericWork(work), upper) <= 0 {
		difference := numericWorkSum(work, numericWorkFromValue("1"), true)
		if difference.sign == 0 {
			return 0
		}
		return difference.weight
	}
	groupWeight := numericMathGroupWeight(copynumericWork(work))
	width := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(work.weight, langruntime.CheckedSignedMultiply(groupWeight, 4)), 1)
	exponent := langruntime.CheckedSignedMultiply(groupWeight, 4)
	characters := []rune(work.digits)
	index := 0
	leading := 0
	for width > 0 {
		leading = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(leading, 10))
		if index < len(characters) {
			leading = langruntime.CheckedI32(langruntime.CheckedSignedAdd(leading, numericWireDecimalDigit(characters[index])))
			index = langruntime.CheckedAdd(index, 1)
		}
		width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
	}
	if index < len(characters) {
		width = langruntime.CheckedI32(4)
		exponent = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(exponent, 4))
		for width > 0 {
			leading = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(leading, 10))
			if index < len(characters) {
				leading = langruntime.CheckedI32(langruntime.CheckedSignedAdd(leading, numericWireDecimalDigit(characters[index])))
				index = langruntime.CheckedAdd(index, 1)
			}
			width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
		}
	}
	coefficient := float64(leading)
	decimalWeight := float64(exponent)
	estimate := langruntime.F64Add(langruntime.F64Ln(coefficient), langruntime.F64Multiply(decimalWeight, numericLnTenEstimate))
	return langruntime.F64ToI32(langruntime.F64Log10(langruntime.F64Abs(estimate)))
}
func numericLogarithmWork(input numericWork, scale int) numericWork {
	input = copynumericWork(input)
	scale = langruntime.CheckedI32(scale)
	one := numericWorkFromValue("1")
	lower := numericWorkFromValue("0.9")
	upper := numericWorkFromValue("1.1")
	work := input
	roots := 0
	factor := 2
	for numericWorkMagnitude(copynumericWork(work), copynumericWork(lower)) <= 0 {
		localScale := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(scale, langruntime.CheckedSignedMultiply(numericMathGroupWeight(copynumericWork(work)), 2)), 8)
		work = copynumericWork(numericSquareRootScaled(work, localScale))
		factor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(factor, 2))
		roots = langruntime.CheckedI32(langruntime.CheckedSignedAdd(roots, 1))
	}
	for numericWorkMagnitude(copynumericWork(work), copynumericWork(upper)) >= 0 {
		localScale := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(scale, langruntime.CheckedSignedMultiply(numericMathGroupWeight(copynumericWork(work)), 2)), 8)
		work = copynumericWork(numericSquareRootScaled(work, localScale))
		factor = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(factor, 2))
		roots = langruntime.CheckedI32(langruntime.CheckedSignedAdd(roots, 1))
	}
	extra := langruntime.F64ToI32((langruntime.F64Multiply(float64((langruntime.CheckedSignedAdd(roots, 1))), float64(0.301029995663981))))
	localScale := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(scale, extra), 8)
	numerator := numericWorkSum(copynumericWork(work), copynumericWork(one), true)
	denominator := numericWorkSum(work, one, false)
	quotient := numericDivisionWork(numerator, denominator, localScale, true)
	result := numericWorkRounded(quotient, localScale, 1)
	term := copynumericWork(result)
	product := numericWorkProduct(copynumericWork(result), copynumericWork(result))
	square := numericWorkRounded(product, localScale, 1)
	divisor := 1
	advancing := true
	for advancing {
		divisor = langruntime.CheckedI32(langruntime.CheckedSignedAdd(divisor, 2))
		product := numericWorkProduct(term, copynumericWork(square))
		term = copynumericWork(numericWorkRounded(product, localScale, 1))
		denominator := numericWorkFromValue(checkruntime.TextNumber(divisor, 10))
		quotient := numericDivisionWork(copynumericWork(term), denominator, localScale, true)
		element := numericWorkRounded(quotient, localScale, 1)
		if element.sign == 0 {
			advancing = false
		} else {
			result = copynumericWork(numericWorkSum(result, copynumericWork(element), false))
			if numericMathGroupWeight(element) < langruntime.CheckedSignedSubtract(numericMathGroupWeight(copynumericWork(result)), langruntime.CheckedSignedDivide(langruntime.CheckedSignedMultiply(localScale, 2), 4)) {
				advancing = false
			}
		}
	}
	multiplier := numericWorkFromValue(checkruntime.TextNumber(factor, 10))
	return numericWorkRounded(numericWorkProduct(result, multiplier), scale, 1)
}
func NumericLnOkv6(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if work.special == 0 || (work.special == 1 && work.sign <= 0) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericLogInvalidArgument)}
		}
		if work.special != 1 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
		}
		scale := langruntime.CheckedSignedSubtract(16, numericLogarithmWeight(copynumericWork(work)))
		if scale < work.scale {
			scale = langruntime.CheckedI32(work.scale)
		}
		if scale < 0 {
			scale = langruntime.CheckedI32(0)
		}
		if scale > 1000 {
			scale = langruntime.CheckedI32(1000)
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericLogarithmWork(work, scale))}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func Ln05bs(input checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericLnOkv6(input)
}
func numericBaseLogarithm(base numericWork, input numericWork) checkruntime.NumericValue {
	base = copynumericWork(base)
	input = copynumericWork(input)
	if base.special == 3 || input.special == 3 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
	}
	if base.special == 0 || input.special == 0 || (base.special == 1 && base.sign <= 0) || (input.special == 1 && input.sign <= 0) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericLogInvalidArgument)}
	}
	if base.special == 2 {
		if input.special == 2 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
	}
	if input.special == 2 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
	}
	baseWeight := numericLogarithmWeight(copynumericWork(base))
	inputWeight := numericLogarithmWeight(copynumericWork(input))
	resultWeight := langruntime.CheckedSignedSubtract(inputWeight, baseWeight)
	scale := langruntime.CheckedSignedSubtract(16, resultWeight)
	if scale < base.scale {
		scale = langruntime.CheckedI32(base.scale)
	}
	if scale < input.scale {
		scale = langruntime.CheckedI32(input.scale)
	}
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	if scale > 1000 {
		scale = langruntime.CheckedI32(1000)
	}
	baseScale := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(scale, resultWeight), baseWeight), 8)
	if baseScale < 0 {
		baseScale = langruntime.CheckedI32(0)
	}
	inputScale := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedAdd(scale, resultWeight), inputWeight), 8)
	if inputScale < 0 {
		inputScale = langruntime.CheckedI32(0)
	}
	denominator := numericLogarithmWork(base, baseScale)
	numerator := numericLogarithmWork(input, inputScale)
	if denominator.sign == 0 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(sqlstateDivisionByZero)}
	}
	quotient := numericDivisionWork(numerator, denominator, scale, true)
	return numericWorkRound(quotient, scale, 1)
}
func NumericLog8gwh(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		base := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			input := langruntime.CheckedString(right.Value)
			first := numericWorkFromValue(base)
			second := numericWorkFromValue(input)
			if first.valid == false || second.valid == false {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
			}
			return numericBaseLogarithm(first, second)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func Log94cu(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericLog8gwh(left, right)
}
func LogWnnd(input checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericLog8gwh(checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "10"}, input)
}
func Log10Dgh7(input checkruntime.NumericValue) checkruntime.NumericValue {
	return LogWnnd(input)
}

const numericPowerInvalidArgument = 3452595

func numericPowerSign(work numericWork) int {
	work = copynumericWork(work)
	if work.special == 0 {
		return langruntime.CheckedSignedNegate(1)
	}
	if work.special == 2 {
		return 1
	}
	return work.sign
}
func numericPowerIntegral(work numericWork) bool {
	work = copynumericWork(work)
	if work.special == 3 {
		return false
	}
	if work.special != 1 {
		return true
	}
	return numericWorkMinScale(work) == 0
}
func numericPowerOdd(work numericWork) bool {
	work = copynumericWork(work)
	characters := []rune(work.digits)
	position := work.weight
	index := 0
	for index < len(characters) {
		if position == 0 {
			return langruntime.CheckedSignedRemainder(numericWireDecimalDigit(characters[index]), 2) != 0
		}
		index = langruntime.CheckedAdd(index, 1)
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	return false
}
func numericPowerPositive(work numericWork) numericWork {
	work = copynumericWork(work)
	sign := work.sign
	if sign < 0 {
		sign = langruntime.CheckedI32(1)
	}
	return numericWork{valid: work.valid, special: work.special, sign: sign, weight: work.weight, scale: work.scale, digits: work.digits}
}
func numericPowerDecimalEstimate(work numericWork) float64 {
	work = copynumericWork(work)
	if work.sign == 0 {
		return float64(0.0)
	}
	characters := []rune(work.digits)
	groupWeight := numericMathGroupWeight(copynumericWork(work))
	exponent := langruntime.CheckedSignedMultiply(groupWeight, 4)
	width := langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(work.weight, exponent), 1)
	index := 0
	leading := float64(0.0)
	groups := 0
	advancing := true
	for advancing {
		digit := 0
		for width > 0 {
			digit = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(digit, 10))
			if index < len(characters) {
				digit = langruntime.CheckedI32(langruntime.CheckedSignedAdd(digit, numericWireDecimalDigit(characters[index])))
				index = langruntime.CheckedAdd(index, 1)
			}
			width = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(width, 1))
		}
		leading = langruntime.F64Add(langruntime.F64Multiply(leading, float64(10000.0)), float64(digit))
		groups = langruntime.CheckedI32(langruntime.CheckedSignedAdd(groups, 1))
		if index < len(characters) && groups < 4 {
			width = langruntime.CheckedI32(4)
			exponent = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(exponent, 4))
		} else {
			advancing = false
		}
	}
	return langruntime.F64Add(langruntime.F64Log10(leading), float64(exponent))
}
func numericPowerScale(estimate float64, baseScale int, exponentScale int) int {
	baseScale = langruntime.CheckedI32(baseScale)
	exponentScale = langruntime.CheckedI32(exponentScale)
	scale := langruntime.CheckedSignedSubtract(16, langruntime.F64ToI32(estimate))
	if scale < baseScale {
		scale = langruntime.CheckedI32(baseScale)
	}
	if scale < exponentScale {
		scale = langruntime.CheckedI32(exponentScale)
	}
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	if scale > 1000 {
		scale = langruntime.CheckedI32(1000)
	}
	return scale
}
func numericPowerInteger(base numericWork, exponent int, exponentScale int) checkruntime.NumericValue {
	base = copynumericWork(base)
	exponent = langruntime.CheckedI32(exponent)
	exponentScale = langruntime.CheckedI32(exponentScale)
	estimate := langruntime.F64Multiply(float64(exponent), numericPowerDecimalEstimate(copynumericWork(base)))
	if estimate > float64(131072.0) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	if langruntime.F64Add(estimate, float64(1.0)) < float64(-1000.0) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(numericWorkRounded(numericWorkFromValue("0"), 1000, 1))}
	}
	scale := numericPowerScale(estimate, base.scale, exponentScale)
	if exponent == 0 {
		return numericWorkRound(numericWorkFromValue("1"), scale, 1)
	}
	if exponent == 1 {
		return numericWorkRound(base, scale, 1)
	}
	if exponent == langruntime.CheckedSignedNegate(1) {
		return numericWorkRound(numericDivisionWork(numericWorkFromValue("1"), base, scale, true), scale, 1)
	}
	if exponent == 2 {
		return numericWorkRound(numericWorkProduct(copynumericWork(base), base), scale, 1)
	}
	if base.sign == 0 {
		return numericWorkRound(base, scale, 1)
	}
	significant := langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(1, scale), langruntime.F64ToI32(estimate))
	significant = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedAdd(significant, langruntime.F64ToI32((langruntime.F64Ln(langruntime.F64Abs((float64(exponent))))))), 8))
	negative := exponent < 0
	mask := int64(langruntime.CheckedI32(exponent))
	if negative {
		mask = langruntime.CheckedI64Subtract(int64(0), mask)
	}
	product := copynumericWork(base)
	result := numericWorkFromValue("1")
	if langruntime.CheckedI64Remainder(mask, int64(2)) != int64(0) {
		result = copynumericWork(base)
	}
	mask = langruntime.CheckedI64Divide(mask, int64(2))
	for mask > int64(0) {
		localScale := langruntime.CheckedSignedSubtract(significant, langruntime.CheckedSignedMultiply(numericMathGroupWeight(copynumericWork(product)), 8))
		if localScale > langruntime.CheckedSignedMultiply(product.scale, 2) {
			localScale = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(product.scale, 2))
		}
		if localScale < 0 {
			localScale = langruntime.CheckedI32(0)
		}
		product = copynumericWork(numericWorkRounded(numericWorkProduct(copynumericWork(product), product), localScale, 1))
		if langruntime.CheckedI64Remainder(mask, int64(2)) != int64(0) {
			localScale = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(significant, langruntime.CheckedSignedMultiply((langruntime.CheckedSignedAdd(numericMathGroupWeight(copynumericWork(product)), numericMathGroupWeight(copynumericWork(result)))), 4)))
			if localScale > langruntime.CheckedSignedAdd(product.scale, result.scale) {
				localScale = langruntime.CheckedI32(langruntime.CheckedSignedAdd(product.scale, result.scale))
			}
			if localScale < 0 {
				localScale = langruntime.CheckedI32(0)
			}
			result = copynumericWork(numericWorkRounded(numericWorkProduct(copynumericWork(product), result), localScale, 1))
		}
		if numericMathGroupWeight(copynumericWork(product)) > 32767 || numericMathGroupWeight(copynumericWork(result)) > 32767 {
			if negative == false {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
			}
			result = copynumericWork(numericWorkFromValue("0"))
			negative = false
			mask = int64(0)
		}
		mask = langruntime.CheckedI64Divide(mask, int64(2))
	}
	if negative {
		return numericWorkRound(numericDivisionWork(numericWorkFromValue("1"), result, scale, true), scale, 1)
	}
	return numericWorkRound(result, scale, 1)
}
func numericPowerFractional(base numericWork, exponent numericWork) checkruntime.NumericValue {
	base = copynumericWork(base)
	exponent = copynumericWork(exponent)
	if base.sign == 0 {
		return numericWorkRound(base, 16, 1)
	}
	negative := base.sign < 0 && numericPowerOdd(copynumericWork(exponent))
	positive := numericPowerPositive(base)
	logarithmWeight := numericLogarithmWeight(copynumericWork(positive))
	localScale := langruntime.CheckedSignedSubtract(8, logarithmWeight)
	if localScale < 0 {
		localScale = langruntime.CheckedI32(0)
	}
	preliminaryLogarithm := numericLogarithmWork(copynumericWork(positive), localScale)
	preliminary := numericWorkRounded(numericWorkProduct(preliminaryLogarithm, copynumericWork(exponent)), localScale, 1)
	text := numericWorkText(preliminary)
	estimate := langruntime.F64FromText(text, float64(0.0))
	if langruntime.F64Abs(estimate) > float64(6020.0) {
		if estimate > float64(0.0) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
		}
		return numericWorkRound(numericWorkFromValue("0"), 1000, 1)
	}
	estimate = langruntime.F64Multiply(estimate, numericExpLog10E)
	scale := numericPowerScale(estimate, positive.scale, exponent.scale)
	significant := langruntime.CheckedSignedAdd(scale, langruntime.F64ToI32(estimate))
	if significant < 0 {
		significant = langruntime.CheckedI32(0)
	}
	localScale = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(significant, logarithmWeight), 8))
	if localScale < 0 {
		localScale = langruntime.CheckedI32(0)
	}
	logarithm := numericLogarithmWork(positive, localScale)
	argument := numericWorkRounded(numericWorkProduct(logarithm, exponent), localScale, 1)
	result := numericExponentialWork(argument, scale)
	if result.valid == false {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	sign := result.sign
	if negative && sign != 0 {
		sign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
	}
	signed := numericWork{valid: true, special: 1, sign: sign, weight: result.weight, scale: result.scale, digits: result.digits}
	return numericWorkRound(signed, scale, 1)
}
func numericPowerValues(base numericWork, exponent numericWork) checkruntime.NumericValue {
	base = copynumericWork(base)
	exponent = copynumericWork(exponent)
	one := numericWorkFromValue("1")
	if base.special == 3 {
		if exponent.special == 1 && exponent.sign == 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "1"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
	}
	if exponent.special == 3 {
		if base.special == 1 && base.sign == 1 && numericWorkMagnitude(copynumericWork(base), copynumericWork(one)) == 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "1"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "NaN"}
	}
	baseSign := numericPowerSign(copynumericWork(base))
	exponentSign := numericPowerSign(copynumericWork(exponent))
	if (baseSign == 0 && exponentSign < 0) || (baseSign < 0 && numericPowerIntegral(copynumericWork(exponent)) == false) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericPowerInvalidArgument)}
	}
	if base.special != 1 || exponent.special != 1 {
		if (base.special == 1 && baseSign == 1 && numericWorkMagnitude(copynumericWork(base), copynumericWork(one)) == 0) || exponentSign == 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "1"}
		}
		if baseSign == 0 && exponentSign > 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
		}
		if exponent.special != 1 {
			if base.special == 1 && numericWorkMagnitude(copynumericWork(base), copynumericWork(one)) == 0 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "1"}
			}
			greater := base.special != 1 || numericWorkMagnitude(base, one) > 0
			if greater == (exponentSign > 0) {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
			}
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
		}
		if exponentSign < 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "0"}
		}
		if base.special == 0 && numericPowerOdd(exponent) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-Infinity"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
	}
	if numericPowerIntegral(copynumericWork(exponent)) && (exponent.sign == 0 || exponent.weight <= 9) {
		converted := numericIntegerValue(checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(copynumericWork(exponent))})
		if converted.Kind == checkruntime.Int8ValueValue {
			value := converted.Value
			if value >= int64(-2147483648) && value <= int64(2147483647) {
				return numericPowerInteger(base, int(int32(value)), exponent.scale)
			}
		}
	}
	return numericPowerFractional(base, exponent)
}
func NumericPowerN7g8(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	if left.Kind == checkruntime.NumericValueError {
		error := left.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if right.Kind == checkruntime.NumericValueError {
		error := right.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if left == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || right == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if left.Kind == checkruntime.NumericValueValue {
		base := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.NumericValueValue {
			exponent := langruntime.CheckedString(right.Value)
			first := numericWorkFromValue(base)
			second := numericWorkFromValue(exponent)
			if first.valid == false || second.valid == false {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
			}
			return numericPowerValues(first, second)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func PowerJfdf(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericPowerN7g8(left, right)
}
func Pow8fdt(left checkruntime.NumericValue, right checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericPowerN7g8(left, right)
}
func numericRangeValues(value string, base string, offset string, subtract bool, less bool) checkruntime.BoolValue {
	value = langruntime.CheckedString(value)
	base = langruntime.CheckedString(base)
	offset = langruntime.CheckedString(offset)
	input := checkruntime.NumericParts(value)
	center := checkruntime.NumericParts(base)
	distance := checkruntime.NumericParts(offset)
	if input.Valid == false || center.Valid == false || distance.Valid == false {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if distance.Special == 3 || distance.Special == 0 || distance.Sign < 0 {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: checkruntime.MakeSqlError(integerInvalidFrameSize)}
	}
	if input.Special == 3 {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: center.Special == 3 || less == false}
	}
	if center.Special == 3 {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less}
	}
	if distance.Special == 2 {
		if (subtract && center.Special == 2) || (subtract == false && center.Special == 0) {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: true}
		}
		if subtract {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less == false || input.Special == 0}
		}
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less || input.Special == 2}
	}
	if input.Special == 0 || input.Special == 2 {
		if input.Special == center.Special {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: true}
		}
		if input.Special == 0 {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less}
		}
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less == false}
	}
	if center.Special == 0 || center.Special == 2 {
		if center.Special == 0 {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less == false}
		}
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less}
	}
	mode := 0
	if subtract {
		mode = langruntime.CheckedI32(1)
	}
	boundary := numericArithmetic(checkruntime.MakeNumericValue(base), checkruntime.MakeNumericValue(offset), mode)
	if boundary.Kind == checkruntime.NumericValueError {
		error := boundary.Error
		if error.State == numericSupportRangeError {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: less != subtract}
		}
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	compared := numericCompare(checkruntime.MakeNumericValue(value), boundary)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if less {
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
		}
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func InRangeFhht(value checkruntime.NumericValue, base checkruntime.NumericValue, offset checkruntime.NumericValue, subtract checkruntime.BoolValue, less checkruntime.BoolValue) checkruntime.BoolValue {
	if value.Kind == checkruntime.NumericValueError {
		error := value.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if base.Kind == checkruntime.NumericValueError {
		error := base.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if offset.Kind == checkruntime.NumericValueError {
		error := offset.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if subtract.Kind == checkruntime.BoolValueError {
		error := subtract.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if less.Kind == checkruntime.BoolValueError {
		error := less.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if value == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || base == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || offset == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || subtract == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) || less == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if value == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || base == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || offset == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || subtract == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) || less == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if value.Kind == checkruntime.NumericValueValue {
		input := langruntime.CheckedString(value.Value)
		if base.Kind == checkruntime.NumericValueValue {
			center := langruntime.CheckedString(base.Value)
			if offset.Kind == checkruntime.NumericValueValue {
				distance := langruntime.CheckedString(offset.Value)
				if subtract.Kind == checkruntime.BoolValueValue {
					sub := subtract.Value
					if less.Kind == checkruntime.BoolValueValue {
						lower := less.Value
						return numericRangeValues(input, center, distance, sub, lower)
					}
				}
			}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Ceil8geh(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		return numericWorkRound(work, 0, 2)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func CeilingPr5v(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		return numericWorkRound(work, 0, 2)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func FloorX7mh(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		return numericWorkRound(work, 0, 3)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func RoundMmpo(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		return numericWorkRound(work, 0, 1)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func RoundOtcq(input checkruntime.NumericValue, scale checkruntime.Int4Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if scale.Kind == checkruntime.Int4ValueError {
		error := scale.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if scale.Kind == checkruntime.Int4ValueValue {
			precision := langruntime.CheckedI32(scale.Value)
			return numericWorkRound(work, precision, 1)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func TruncDghz(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		return numericWorkRound(work, 0, 0)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func TruncHay3(input checkruntime.NumericValue, scale checkruntime.Int4Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if scale.Kind == checkruntime.Int4ValueError {
		error := scale.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || scale == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if scale.Kind == checkruntime.Int4ValueValue {
			precision := langruntime.CheckedI32(scale.Value)
			return numericWorkRound(work, precision, 0)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}

type numericWireDigit struct {
	value int
}

func copynumericWireDigit(value numericWireDigit) numericWireDigit {
	return numericWireDigit{value: langruntime.CheckedI32(value.value)}
}
func numericWireDecimalDigit(character rune) int {
	character = langruntime.CheckedChar(character)
	code := int(langruntime.CheckedChar(character))
	if code >= 48 && code <= 57 {
		return langruntime.CheckedSignedSubtract(code, 48)
	}
	return langruntime.CheckedSignedNegate(1)
}
func numericWireScale(input string) int {
	input = langruntime.CheckedString(input)
	chars := []rune(input)
	index := 0
	point := false
	power := false
	fractional := 0
	exponent := 0
	sign := 1
	for index < len(chars) {
		digit := numericWireDecimalDigit(chars[index])
		if digit >= 0 {
			if power {
				exponent = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(exponent, 10), digit))
			} else if point {
				fractional = langruntime.CheckedI32(langruntime.CheckedSignedAdd(fractional, 1))
			}
		} else if chars[index] == '.' {
			point = true
		} else if chars[index] == 'e' || chars[index] == 'E' {
			power = true
		} else if power && chars[index] == '-' {
			sign = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	scale := langruntime.CheckedSignedSubtract(fractional, langruntime.CheckedSignedMultiply(exponent, sign))
	if scale < 0 {
		return 0
	}
	return scale
}
func numericWireWord(output string, word int) string {
	output = langruntime.CheckedString(output)
	word = langruntime.CheckedI32(word)
	unsigned := word
	if word < 0 {
		unsigned = langruntime.CheckedI32(langruntime.CheckedSignedAdd(word, 65536))
	}
	result := checkruntime.ByteaAppendByte(output, langruntime.CheckedSignedDivide(unsigned, 256))
	return checkruntime.ByteaAppendByte(result, langruntime.CheckedSignedRemainder(unsigned, 256))
}
func NumericSend3mnb(input checkruntime.NumericValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		layout := checkruntime.NumericParts(value)
		if layout.Valid == false {
			return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
		}
		sign := 0
		if layout.Special == 0 {
			sign = langruntime.CheckedI32(61440)
		} else if layout.Special == 2 {
			sign = langruntime.CheckedI32(53248)
		} else if layout.Special == 3 {
			sign = langruntime.CheckedI32(49152)
		} else if layout.Sign < 0 {
			sign = langruntime.CheckedI32(16384)
		}
		scale := 0
		if layout.Special == 0 || layout.Special == 2 {
			scale = langruntime.CheckedI32(32)
		}
		weight := 0
		count := 0
		words := []numericWireDigit{}
		if layout.Special == 1 {
			scale = langruntime.CheckedI32(numericWireScale(value))
			if layout.Sign != 0 {
				weight = langruntime.CheckedI32(langruntime.CheckedSignedDivide(layout.Weight, 4))
				remainder := langruntime.CheckedSignedRemainder(layout.Weight, 4)
				if remainder < 0 {
					weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
					remainder = langruntime.CheckedI32(langruntime.CheckedSignedAdd(remainder, 4))
				}
				chars := []rune(value)
				index := layout.First
				position := langruntime.CheckedSignedSubtract(3, remainder)
				group := 0
				for index < layout.End {
					digit := numericWireDecimalDigit(chars[index])
					if digit >= 0 {
						group = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(group, 10), digit))
						position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
						if position == 4 {
							langruntime.CheckedAdd(len(words), 1)
							words = append(words, copynumericWireDigit(numericWireDigit{value: group}))
							count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
							position = langruntime.CheckedI32(0)
							group = langruntime.CheckedI32(0)
						}
					}
					index = langruntime.CheckedAdd(index, 1)
				}
				if position > 0 {
					for position < 4 {
						group = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(group, 10))
						position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
					}
					langruntime.CheckedAdd(len(words), 1)
					words = append(words, copynumericWireDigit(numericWireDigit{value: group}))
					count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
				}
			}
		}
		output := ""
		output = langruntime.CheckedString(numericWireWord(output, count))
		output = langruntime.CheckedString(numericWireWord(output, weight))
		output = langruntime.CheckedString(numericWireWord(output, sign))
		output = langruntime.CheckedString(numericWireWord(output, scale))
		index := 0
		for index < len(words) {
			output = langruntime.CheckedString(numericWireWord(output, words[index].value))
			index = langruntime.CheckedAdd(index, 1)
		}
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func numericSizeBelow(value string, limit string) bool {
	value = langruntime.CheckedString(value)
	limit = langruntime.CheckedString(limit)
	return numericWorkMagnitude(numericWorkFromValue(value), numericWorkFromValue(limit)) < 0
}
func PgSizePrettyAxtn(input checkruntime.NumericValue) checkruntime.TextValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
		}
		amount := numericWorkText(copynumericWork(work))
		unit := 0
		if work.special != 1 {
			unit = langruntime.CheckedIndex(5)
		} else if numericSizeBelow(amount, "10240") == false {
			divided := numericDivision(checkruntime.MakeNumericValue(amount), checkruntime.MakeNumericValue("512"), 1)
			if divided.Kind == checkruntime.NumericValueError {
				error := divided.Error
				return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
			}
			if divided.Kind == checkruntime.NumericValueValue {
				number := langruntime.CheckedString(divided.Value)
				amount = langruntime.CheckedString(number)
			}
			unit = langruntime.CheckedIndex(1)
			for unit < 5 && numericSizeBelow(amount, "20479") == false {
				divided := numericDivision(checkruntime.MakeNumericValue(amount), checkruntime.MakeNumericValue("1024"), 1)
				if divided.Kind == checkruntime.NumericValueError {
					error := divided.Error
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
				}
				if divided.Kind == checkruntime.NumericValueValue {
					number := langruntime.CheckedString(divided.Value)
					amount = langruntime.CheckedString(number)
				}
				unit = langruntime.CheckedAdd(unit, 1)
			}
			layout := checkruntime.NumericParts(amount)
			subtract := 0
			if layout.Sign < 0 {
				subtract = langruntime.CheckedI32(1)
			}
			adjusted := numericArithmetic(checkruntime.MakeNumericValue(amount), checkruntime.MakeNumericValue("1"), subtract)
			rounded := numericDivision(adjusted, checkruntime.MakeNumericValue("2"), 1)
			if rounded.Kind == checkruntime.NumericValueError {
				error := rounded.Error
				return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
			}
			if rounded.Kind == checkruntime.NumericValueValue {
				number := langruntime.CheckedString(rounded.Value)
				amount = langruntime.CheckedString(number)
			}
		}
		amount = amount + string(langruntime.CheckedChar(' '))
		amount = amount + integerSizeUnits[unit]
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: amount}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const numericSqrtInvalidArgument = 3452595

func numericSquareRootScaled(work numericWork, scale int) numericWork {
	work = copynumericWork(work)
	scale = langruntime.CheckedI32(scale)
	weight := langruntime.CheckedSignedDivide(work.weight, 2)
	if langruntime.CheckedSignedRemainder(work.weight, 2) < 0 {
		weight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(weight, 1))
	}
	characters := []rune(work.digits)
	inputIndex := 0
	root := []numericWireDigit{}
	langruntime.CheckedAdd(len(root), 1)
	root = append(root, copynumericWireDigit(numericWireDigit{value: 0}))
	remainder := []numericWireDigit{}
	langruntime.CheckedAdd(len(remainder), 1)
	remainder = append(remainder, copynumericWireDigit(numericWireDigit{value: 0}))
	remainderLength := 1
	coefficient := ""
	position := weight
	for position >= langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(0, scale), 1) && work.sign != 0 {
		pair := 0
		sourcePosition := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(position, 2), 1)
		step := 0
		for step < 2 {
			pair = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(pair, 10))
			if sourcePosition <= work.weight && inputIndex < len(characters) {
				pair = langruntime.CheckedI32(langruntime.CheckedSignedAdd(pair, numericWireDecimalDigit(characters[inputIndex])))
				inputIndex = langruntime.CheckedAdd(inputIndex, 1)
			}
			sourcePosition = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(sourcePosition, 1))
			step = langruntime.CheckedI32(langruntime.CheckedSignedAdd(step, 1))
		}
		carry := pair
		cursor := 0
		for cursor < remainderLength {
			word := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(remainder[cursor].value, 100), carry)
			remainder[cursor] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(word, 10000)})
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(word, 10000))
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		if carry > 0 {
			if remainderLength == len(remainder) {
				langruntime.CheckedAdd(len(remainder), 1)
				remainder = append(remainder, copynumericWireDigit(numericWireDigit{value: carry}))
			} else {
				remainder[remainderLength] = copynumericWireDigit(numericWireDigit{value: carry})
			}
			remainderLength = langruntime.CheckedAdd(remainderLength, 1)
		}
		digit := 9
		searching := true
		for searching {
			candidate := []numericWireDigit{}
			carry = langruntime.CheckedI32(langruntime.CheckedSignedMultiply(digit, digit))
			cursor = langruntime.CheckedIndex(0)
			for cursor < len(root) {
				word := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(root[cursor].value, (langruntime.CheckedSignedMultiply(20, digit))), carry)
				langruntime.CheckedAdd(len(candidate), 1)
				candidate = append(candidate, copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(word, 10000)}))
				carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(word, 10000))
				cursor = langruntime.CheckedAdd(cursor, 1)
			}
			if carry > 0 {
				langruntime.CheckedAdd(len(candidate), 1)
				candidate = append(candidate, copynumericWireDigit(numericWireDigit{value: carry}))
			}
			candidateLength := len(candidate)
			for candidateLength > 1 && candidate[langruntime.CheckedSubtract(candidateLength, 1)].value == 0 {
				candidateLength = langruntime.CheckedIndex(langruntime.CheckedSubtract(candidateLength, 1))
			}
			order := 0
			if remainderLength < candidateLength {
				order = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
			}
			if remainderLength > candidateLength {
				order = langruntime.CheckedI32(1)
			}
			cursor = langruntime.CheckedIndex(candidateLength)
			for order == 0 && cursor > 0 {
				cursor = langruntime.CheckedIndex(langruntime.CheckedSubtract(cursor, 1))
				if remainder[cursor].value < candidate[cursor].value {
					order = langruntime.CheckedI32(langruntime.CheckedSignedNegate(1))
				}
				if remainder[cursor].value > candidate[cursor].value {
					order = langruntime.CheckedI32(1)
				}
			}
			if order >= 0 {
				borrow := 0
				cursor = langruntime.CheckedIndex(0)
				for cursor < remainderLength {
					word := langruntime.CheckedSignedSubtract(remainder[cursor].value, borrow)
					if cursor < candidateLength {
						word = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(word, candidate[cursor].value))
					}
					borrow = langruntime.CheckedI32(0)
					if word < 0 {
						word = langruntime.CheckedI32(langruntime.CheckedSignedAdd(word, 10000))
						borrow = langruntime.CheckedI32(1)
					}
					remainder[cursor] = copynumericWireDigit(numericWireDigit{value: word})
					cursor = langruntime.CheckedAdd(cursor, 1)
				}
				for remainderLength > 1 && remainder[langruntime.CheckedSubtract(remainderLength, 1)].value == 0 {
					remainderLength = langruntime.CheckedIndex(langruntime.CheckedSubtract(remainderLength, 1))
				}
				searching = false
			} else {
				digit = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(digit, 1))
			}
		}
		carry = langruntime.CheckedI32(digit)
		cursor = langruntime.CheckedIndex(0)
		for cursor < len(root) {
			word := langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply(root[cursor].value, 10), carry)
			root[cursor] = copynumericWireDigit(numericWireDigit{value: langruntime.CheckedSignedRemainder(word, 10000)})
			carry = langruntime.CheckedI32(langruntime.CheckedSignedDivide(word, 10000))
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
		if carry > 0 {
			langruntime.CheckedAdd(len(root), 1)
			root = append(root, copynumericWireDigit(numericWireDigit{value: carry}))
		}
		coefficient = coefficient + string(langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(digit, 48)), '0')))
		if inputIndex >= len(characters) && remainderLength == 1 && remainder[0].value == 0 {
			position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(0, scale), 1))
		}
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	sign := 1
	if coefficient == "" {
		sign = langruntime.CheckedI32(0)
		weight = langruntime.CheckedI32(0)
	}
	return numericWorkRounded(numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: coefficient}, scale, 1)
}
func numericSquareRoot(work numericWork) checkruntime.NumericValue {
	work = copynumericWork(work)
	groupWeight := langruntime.CheckedSignedDivide(work.weight, 4)
	if langruntime.CheckedSignedRemainder(work.weight, 4) < 0 {
		groupWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(groupWeight, 1))
	}
	scale := langruntime.CheckedSignedSubtract(15, langruntime.CheckedSignedMultiply(groupWeight, 2))
	if scale < work.scale {
		scale = langruntime.CheckedI32(work.scale)
	}
	if scale < 0 {
		scale = langruntime.CheckedI32(0)
	}
	if scale > 1000 {
		scale = langruntime.CheckedI32(1000)
	}
	rounded := numericSquareRootScaled(work, scale)
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(rounded)}
}
func NumericSqrtT0uy(input checkruntime.NumericValue) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if work.special == 0 || (work.special == 1 && work.sign < 0) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSqrtInvalidArgument)}
		}
		if work.special != 1 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
		}
		return numericSquareRoot(work)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}
func Sqrt2lic(input checkruntime.NumericValue) checkruntime.NumericValue {
	return NumericSqrtT0uy(input)
}
func Numeric879l(input checkruntime.NumericValue, modifier checkruntime.Int4Value) checkruntime.NumericValue {
	if input.Kind == checkruntime.NumericValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if modifier.Kind == checkruntime.Int4ValueError {
		error := modifier.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}) || modifier == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if input == (checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}) || modifier == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if input.Kind == checkruntime.NumericValueValue {
		value := langruntime.CheckedString(input.Value)
		work := numericWorkFromValue(value)
		if work.valid == false {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
		}
		if modifier.Kind == checkruntime.Int4ValueValue {
			typmod := langruntime.CheckedI32(modifier.Value)
			if typmod < 4 || work.special == 3 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: value}
			}
			if work.special != 1 {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
			}
			packed := langruntime.CheckedSignedSubtract(typmod, 4)
			precision := langruntime.CheckedSignedDivide(packed, 65536)
			scale := langruntime.CheckedSignedRemainder(packed, 2048)
			if scale >= 1024 {
				scale = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(scale, 2048))
			}
			rounded := numericWorkRound(work, scale, 1)
			if rounded.Kind == checkruntime.NumericValueValue {
				result := langruntime.CheckedString(rounded.Value)
				layout := checkruntime.NumericParts(result)
				if layout.Sign != 0 && langruntime.CheckedSignedAdd(layout.Weight, 1) > langruntime.CheckedSignedSubtract(precision, scale) {
					return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
				}
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: result}
			}
			return rounded
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}

const numericSupportRangeError = 3452547

type numericWork struct {
	valid   bool
	special int
	sign    int
	weight  int
	scale   int
	digits  string
}

func copynumericWork(value numericWork) numericWork {
	return numericWork{valid: value.valid, special: langruntime.CheckedI32(value.special), sign: langruntime.CheckedI32(value.sign), weight: langruntime.CheckedI32(value.weight), scale: langruntime.CheckedI32(value.scale), digits: langruntime.CheckedString(value.digits)}
}
func numericWorkFromValue(value string) numericWork {
	value = langruntime.CheckedString(value)
	layout := checkruntime.NumericParts(value)
	digits := ""
	scale := 0
	if layout.Valid && layout.Special == 1 {
		scale = langruntime.CheckedI32(numericWireScale(value))
		characters := []rune(value)
		index := layout.First
		for index < layout.End {
			character := characters[index]
			if numericWireDecimalDigit(character) >= 0 {
				digits = digits + string(langruntime.CheckedChar(character))
			}
			index = langruntime.CheckedAdd(index, 1)
		}
	}
	return numericWork{valid: layout.Valid, special: layout.Special, sign: layout.Sign, weight: layout.Weight, scale: scale, digits: digits}
}
func numericWorkZeros(count int) string {
	count = langruntime.CheckedI32(count)
	remaining := count
	block := "0"
	output := ""
	for remaining > 0 {
		if langruntime.CheckedSignedRemainder(remaining, 2) == 1 {
			output = output + block
		}
		remaining = langruntime.CheckedI32(langruntime.CheckedSignedDivide(remaining, 2))
		if remaining > 0 {
			copy := langruntime.CheckedString(block)
			block = block + copy
		}
	}
	return output
}
func numericWorkText(work numericWork) string {
	work = copynumericWork(work)
	if work.special == 0 {
		return "-Infinity"
	}
	if work.special == 2 {
		return "Infinity"
	}
	if work.special == 3 {
		return "NaN"
	}
	digits := []rune(work.digits)
	output := ""
	if work.sign < 0 {
		output = output + string(langruntime.CheckedChar('-'))
	}
	if work.sign == 0 {
		output = output + string(langruntime.CheckedChar('0'))
		if work.scale > 0 {
			output = output + string(langruntime.CheckedChar('.'))
			output = output + numericWorkZeros(work.scale)
		}
		return output
	}
	index := 0
	if work.weight >= 0 {
		length := 0
		for index < len(digits) {
			length = langruntime.CheckedI32(langruntime.CheckedSignedAdd(length, 1))
			index = langruntime.CheckedAdd(index, 1)
		}
		index = langruntime.CheckedIndex(0)
		positions := langruntime.CheckedSignedAdd(work.weight, 1)
		if length <= positions {
			output = output + work.digits
			output = output + numericWorkZeros(langruntime.CheckedSignedSubtract(positions, length))
			index = langruntime.CheckedIndex(len(digits))
		} else {
			for positions > 0 {
				output = output + string(langruntime.CheckedChar(digits[index]))
				index = langruntime.CheckedAdd(index, 1)
				positions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(positions, 1))
			}
		}
	} else {
		output = output + string(langruntime.CheckedChar('0'))
	}
	if work.scale > 0 {
		output = output + string(langruntime.CheckedChar('.'))
		positions := work.scale
		if work.weight < langruntime.CheckedSignedNegate(1) {
			leading := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(0, work.weight), 1)
			if leading > positions {
				leading = langruntime.CheckedI32(positions)
			}
			output = output + numericWorkZeros(leading)
			positions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(positions, leading))
		}
		for positions > 0 && index < len(digits) {
			output = output + string(langruntime.CheckedChar(digits[index]))
			index = langruntime.CheckedAdd(index, 1)
			positions = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(positions, 1))
		}
		output = output + numericWorkZeros(positions)
	}
	return output
}
func numericWorkMinScale(work numericWork) int {
	work = copynumericWork(work)
	if work.sign == 0 {
		return 0
	}
	digits := []rune(work.digits)
	position := work.weight
	index := 0
	for index < len(digits) {
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
		index = langruntime.CheckedAdd(index, 1)
	}
	scale := langruntime.CheckedSignedSubtract(langruntime.CheckedSignedSubtract(0, position), 1)
	if scale < 0 {
		return 0
	}
	return scale
}
func numericWorkRounded(work numericWork, scale int, mode int) numericWork {
	work = copynumericWork(work)
	scale = langruntime.CheckedI32(scale)
	mode = langruntime.CheckedI32(mode)
	original := []rune(work.digits)
	boundary := langruntime.CheckedSignedSubtract(0, scale)
	digits := []rune{}
	position := work.weight
	index := 0
	for index < len(original) && position >= boundary {
		langruntime.CheckedAdd(len(digits), 1)
		digits = append(digits, langruntime.CheckedChar(original[index]))
		index = langruntime.CheckedAdd(index, 1)
		position = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(position, 1))
	}
	increase := false
	if index < len(original) {
		if mode == 1 && position == langruntime.CheckedSignedSubtract(boundary, 1) && numericWireDecimalDigit(original[index]) >= 5 {
			increase = true
		}
		if mode == 2 && work.sign > 0 {
			increase = true
		}
		if mode == 3 && work.sign < 0 {
			increase = true
		}
	}
	weight := work.weight
	leadingCarry := false
	if increase {
		if len(digits) == 0 {
			langruntime.CheckedAdd(len(digits), 1)
			digits = append(digits, langruntime.CheckedChar('1'))
			weight = langruntime.CheckedI32(boundary)
		} else {
			carry := true
			cursor := len(digits)
			symbols := []rune("0123456789")
			for cursor > 0 && carry {
				cursor = langruntime.CheckedIndex(langruntime.CheckedSubtract(cursor, 1))
				if digits[cursor] == '9' {
					digits[cursor] = langruntime.CheckedChar('0')
				} else {
					symbol := 0
					for symbols[symbol] != digits[cursor] {
						symbol = langruntime.CheckedAdd(symbol, 1)
					}
					digits[cursor] = langruntime.CheckedChar(symbols[langruntime.CheckedAdd(symbol, 1)])
					carry = false
				}
			}
			if carry {
				leadingCarry = true
				weight = langruntime.CheckedI32(langruntime.CheckedSignedAdd(weight, 1))
			}
		}
	}
	end := len(digits)
	for end > 0 && digits[langruntime.CheckedSubtract(end, 1)] == '0' {
		end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
	}
	coefficient := ""
	cursor := 0
	if leadingCarry {
		coefficient = coefficient + string(langruntime.CheckedChar('1'))
	} else {
		for cursor < end {
			coefficient = coefficient + string(langruntime.CheckedChar(digits[cursor]))
			cursor = langruntime.CheckedAdd(cursor, 1)
		}
	}
	sign := work.sign
	if end == 0 && leadingCarry == false {
		sign = langruntime.CheckedI32(0)
		weight = langruntime.CheckedI32(0)
	}
	outputScale := scale
	if outputScale < 0 {
		outputScale = langruntime.CheckedI32(0)
	}
	return numericWork{valid: true, special: 1, sign: sign, weight: weight, scale: outputScale, digits: coefficient}
}
func numericWorkRound(work numericWork, requested int, mode int) checkruntime.NumericValue {
	work = copynumericWork(work)
	requested = langruntime.CheckedI32(requested)
	mode = langruntime.CheckedI32(mode)
	if work.valid == false {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if work.special != 1 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(work)}
	}
	scale := requested
	minimum := langruntime.CheckedSignedNegate(131072)
	if mode == 1 {
		minimum = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(minimum, 1))
	}
	if scale < minimum {
		scale = langruntime.CheckedI32(minimum)
	}
	if scale > 16383 {
		scale = langruntime.CheckedI32(16383)
	}
	rounded := numericWorkRounded(work, scale, mode)
	if rounded.weight > 131071 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(numericSupportRangeError)}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: numericWorkText(rounded)}
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

const temporalRangeError = 3452552

func DateBvna(left checkruntime.TimestampValue) checkruntime.DateValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if leftValue == int64(-9223372036854775808) {
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1)}
		}
		if leftValue == int64(9223372036854775807) {
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: 2147483647}
		}
		days := langruntime.CheckedI64Divide(leftValue, int64(86400000000))
		if leftValue < int64(0) && langruntime.CheckedI64Remainder(leftValue, int64(86400000000)) != int64(0) {
			days = langruntime.CheckedI64Subtract(days, int64(1))
		}
		return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: int(int32(days))}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func DateMiF4wh(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			if leftValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || leftValue == 2147483647 || rightValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || rightValue == 2147483647 {
				return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(temporalRangeError)}
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func DateMiiL50u(left checkruntime.DateValue, right checkruntime.Int4Value) checkruntime.DateValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			if leftValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || leftValue == 2147483647 {
				return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: leftValue}
			}
			result := langruntime.CheckedI64Subtract((int64(langruntime.CheckedI32(leftValue))), (int64(langruntime.CheckedI32(rightValue))))
			if result < int64(-2451545) || result >= int64(2145031949) {
				return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: checkruntime.MakeSqlError(temporalRangeError)}
			}
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: int(int32(result))}
		}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func DatePliPxlb(left checkruntime.DateValue, right checkruntime.Int4Value) checkruntime.DateValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			if leftValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || leftValue == 2147483647 {
				return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: leftValue}
			}
			result := langruntime.CheckedI64Add((int64(langruntime.CheckedI32(leftValue))), (int64(langruntime.CheckedI32(rightValue))))
			if result < int64(-2451545) || result >= int64(2145031949) {
				return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: checkruntime.MakeSqlError(temporalRangeError)}
			}
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: int(int32(result))}
		}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func IntegerPlDateFjuj(left checkruntime.Int4Value, right checkruntime.DateValue) checkruntime.DateValue {
	if left.Kind == checkruntime.Int4ValueError {
		error := left.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if left == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if left.Kind == checkruntime.Int4ValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			if rightValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || rightValue == 2147483647 {
				return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: rightValue}
			}
			result := langruntime.CheckedI64Add((int64(langruntime.CheckedI32(rightValue))), (int64(langruntime.CheckedI32(leftValue))))
			if result < int64(-2451545) || result >= int64(2145031949) {
				return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: checkruntime.MakeSqlError(temporalRangeError)}
			}
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: int(int32(result))}
		}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func TimestampSwxj(left checkruntime.DateValue) checkruntime.TimestampValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if leftValue == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
			return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: int64(-9223372036854775808)}
		}
		if leftValue == 2147483647 {
			return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: int64(9223372036854775807)}
		}
		if leftValue >= 106751983 {
			return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: checkruntime.MakeSqlError(temporalRangeError)}
		}
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(leftValue))), int64(86400000000))}
	}
	return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
}
func temporalCompare(left int64, right int64) int {
	if left < right {
		return langruntime.CheckedSignedNegate(1)
	}
	if left > right {
		return 1
	}
	return 0
}
func temporalDateTimestampOrder(date int, timestamp int64) int {
	date = langruntime.CheckedI32(date)
	if date == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
		return temporalCompare(int64(-9223372036854775808), timestamp)
	}
	if date == 2147483647 {
		return temporalCompare(int64(9223372036854775807), timestamp)
	}
	if date >= 106751983 {
		if timestamp == int64(9223372036854775807) {
			return langruntime.CheckedSignedNegate(1)
		}
		return 1
	}
	return temporalCompare(langruntime.CheckedI64Multiply((int64(langruntime.CheckedI32(date))), int64(86400000000)), timestamp)
}
func DateCmpTimestampPpmh(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func DateEqTimestamp6d24(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue) == 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateGeTimestampDx1w(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue) >= 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateGtTimestamp0703(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue) > 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateLeTimestampQ2yz(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue) <= 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateLtTimestampJqrs(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue) < 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func DateNeTimestampM0cz(left checkruntime.DateValue, right checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: temporalDateTimestampOrder(leftValue, rightValue) != 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampCmpDateRsh8(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue))}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TimestampEqDate7q7f(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) == 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampGeDate6d0e(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) >= 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampGtDatePh8t(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) > 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampLeDateSshx(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) <= 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampLtDate8wsq(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) < 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampNeDateBxi2(left checkruntime.TimestampValue, right checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: langruntime.CheckedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) != 0}
		}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}

var temporalExtractKeys = []string{"+infinity", "-infinity", "allballs", "dow", "doy", "epoch", "infinity", "isodow", "isoyear", "j", "jd", "julian", "mm", "now", "today", "tomorrow", "yesterday"}
var temporalExtractCodes = []int{-1, -1, -1, 16, 18, 19, -1, 17, 15, 14, 14, 14, 4, -1, -1, -1, -1}

func temporalExtractCode(value string) int {
	value = langruntime.CheckedString(value)
	unit := temporalUnitCode(value)
	if unit != 0 {
		return unit
	}
	characters := []rune(value)
	key := ""
	index := 0
	for index < len(characters) && index < 10 {
		key = key + string(langruntime.CheckedChar(langruntime.AsciiLowercase(characters[index])))
		index = langruntime.CheckedAdd(index, 1)
	}
	entry := 0
	for entry < len(temporalExtractKeys) {
		if key == temporalExtractKeys[entry] {
			return temporalExtractCodes[entry]
		}
		entry = langruntime.CheckedAdd(entry, 1)
	}
	return 0
}
func temporalJulianFromCalendar(year int, month int, day int) int64 {
	year = langruntime.CheckedI32(year)
	month = langruntime.CheckedI32(month)
	day = langruntime.CheckedI32(day)
	y := int64(langruntime.CheckedI32(year))
	m := int64(langruntime.CheckedI32(month))
	if month > 2 {
		m = langruntime.CheckedI64Add(m, int64(1))
		y = langruntime.CheckedI64Add(y, int64(4800))
	} else {
		m = langruntime.CheckedI64Add(m, int64(13))
		y = langruntime.CheckedI64Add(y, int64(4799))
	}
	century := langruntime.CheckedI64Divide(y, int64(100))
	d := int64(langruntime.CheckedI32(day))
	return langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Subtract(langruntime.CheckedI64Add(langruntime.CheckedI64Subtract(langruntime.CheckedI64Multiply(y, int64(365)), int64(32167)), langruntime.CheckedI64Divide(y, int64(4))), century), langruntime.CheckedI64Divide(century, int64(4))), langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(int64(7834), m), int64(256))), d)
}
func temporalExtractDate(value int, code int) checkruntime.NumericValue {
	value = langruntime.CheckedI32(value)
	code = langruntime.CheckedI32(code)
	if code == 0 || code == langruntime.CheckedSignedNegate(2) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(temporalFieldUnitError)}
	}
	if code == langruntime.CheckedSignedNegate(1) || code < 6 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(temporalFieldUnsupportedError)}
	}
	if value == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) || value == 2147483647 {
		if code == 6 || code == 7 || code == 8 || code == 9 || code == 16 || code == 17 || code == 18 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
		}
		if value < 0 {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-Infinity"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
	}
	date := int64(langruntime.CheckedI32(value))
	if code == 19 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(langruntime.CheckedI64Multiply((langruntime.CheckedI64Add(date, int64(10957))), int64(86400)))}
	}
	julian := langruntime.CheckedI64Add(date, int64(2451545))
	if code == 14 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(julian)}
	}
	calendar := temporalCalendarFromJulian(julian)
	result := int64(0)
	if code == 6 {
		result = int64(langruntime.CheckedI32(calendar.day))
	}
	if code == 8 {
		result = int64(langruntime.CheckedI32(calendar.month))
	}
	if code == 9 {
		result = int64(langruntime.CheckedI32((langruntime.CheckedSignedAdd(langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(calendar.month, 1)), 3), 1))))
	}
	if code == 10 {
		result = int64(langruntime.CheckedI32(calendar.year))
		if result <= int64(0) {
			result = langruntime.CheckedI64Subtract(result, int64(1))
		}
	}
	if code == 11 {
		if calendar.year >= 0 {
			result = int64(langruntime.CheckedI32((langruntime.CheckedSignedDivide(calendar.year, 10))))
		} else {
			result = int64(langruntime.CheckedI32((langruntime.CheckedSignedSubtract(0, (langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(8, (langruntime.CheckedSignedSubtract(calendar.year, 1)))), 10))))))
		}
	}
	if code == 12 {
		if calendar.year > 0 {
			result = int64(langruntime.CheckedI32((langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(calendar.year, 99)), 100))))
		} else {
			result = int64(langruntime.CheckedI32((langruntime.CheckedSignedSubtract(0, (langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(99, (langruntime.CheckedSignedSubtract(calendar.year, 1)))), 100))))))
		}
	}
	if code == 13 {
		if calendar.year > 0 {
			result = int64(langruntime.CheckedI32((langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(calendar.year, 999)), 1000))))
		} else {
			result = int64(langruntime.CheckedI32((langruntime.CheckedSignedSubtract(0, (langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(999, (langruntime.CheckedSignedSubtract(calendar.year, 1)))), 1000))))))
		}
	}
	if code == 7 || code == 15 {
		thursday := langruntime.CheckedI64Subtract(langruntime.CheckedI64Add(julian, int64(3)), langruntime.CheckedI64Remainder(julian, int64(7)))
		iso := temporalCalendarFromJulian(thursday)
		if code == 7 {
			result = langruntime.CheckedI64Add(langruntime.CheckedI64Divide((langruntime.CheckedI64Subtract(thursday, temporalJulianFromCalendar(iso.year, 1, 1))), int64(7)), int64(1))
		} else {
			result = int64(langruntime.CheckedI32(iso.year))
			if result <= int64(0) {
				result = langruntime.CheckedI64Subtract(result, int64(1))
			}
		}
	}
	if code == 16 || code == 17 {
		result = langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(julian, int64(1))), int64(7))
		if code == 17 && result == int64(0) {
			result = int64(7)
		}
	}
	if code == 18 {
		result = langruntime.CheckedI64Add(langruntime.CheckedI64Subtract(julian, temporalJulianFromCalendar(calendar.year, 1, 1)), int64(1))
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(result)}
}
func ExtractQjml(units checkruntime.TextValue, input checkruntime.DateValue) checkruntime.NumericValue {
	if units.Kind == checkruntime.TextValueError {
		error := units.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input.Kind == checkruntime.DateValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if units == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || input == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if units == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || input == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if units.Kind == checkruntime.TextValueValue {
		unit := langruntime.CheckedString(units.Value)
		if input.Kind == checkruntime.DateValueValue {
			value := langruntime.CheckedI32(input.Value)
			return temporalExtractDate(value, temporalExtractCode(unit))
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
}

const temporalFieldUnitError = 3452619
const temporalFieldUnsupportedError = 466560

var temporalUnitKeys = []string{"@", "ago", "c", "cent", "centuries", "century", "d", "day", "days", "dec", "decade", "decades", "decs", "h", "hour", "hours", "hr", "hrs", "m", "microsecon", "mil", "millennia", "millennium", "millisecon", "mils", "min", "mins", "minute", "minutes", "mon", "mons", "month", "months", "ms", "msec", "msecond", "mseconds", "msecs", "qtr", "quarter", "s", "sec", "second", "seconds", "secs", "timezone", "timezone_h", "timezone_m", "us", "usec", "usecond", "useconds", "usecs", "w", "week", "weeks", "y", "year", "years", "yr", "yrs"}
var temporalUnitCodes = []int{-2, -2, 12, 12, 12, 12, 6, 6, 6, 11, 11, 11, 11, 5, 5, 5, 5, 5, 4, 1, 13, 13, 13, 2, 13, 4, 4, 4, 4, 8, 8, 8, 8, 2, 2, 2, 2, 2, 9, 9, 3, 3, 3, 3, 3, -1, -1, -1, 1, 1, 1, 1, 1, 7, 7, 7, 10, 10, 10, 10, 10}

func temporalUnitCode(value string) int {
	value = langruntime.CheckedString(value)
	characters := []rune(value)
	key := ""
	index := 0
	for index < len(characters) && index < 10 {
		key = key + string(langruntime.CheckedChar(langruntime.AsciiLowercase(characters[index])))
		index = langruntime.CheckedAdd(index, 1)
	}
	entry := 0
	for entry < len(temporalUnitKeys) {
		if key == temporalUnitKeys[entry] {
			return temporalUnitCodes[entry]
		}
		entry = langruntime.CheckedAdd(entry, 1)
	}
	return 0
}

type temporalCalendarFields struct {
	year  int
	month int
	day   int
}

func copytemporalCalendarFields(value temporalCalendarFields) temporalCalendarFields {
	return temporalCalendarFields{year: langruntime.CheckedI32(value.year), month: langruntime.CheckedI32(value.month), day: langruntime.CheckedI32(value.day)}
}
func temporalCalendarFromJulian(day int64) temporalCalendarFields {
	julian := langruntime.CheckedI64Add(day, int64(32044))
	quad := langruntime.CheckedI64Divide(julian, int64(146097))
	extra := langruntime.CheckedI64Add(langruntime.CheckedI64Multiply((langruntime.CheckedI64Subtract(julian, langruntime.CheckedI64Multiply(quad, int64(146097)))), int64(4)), int64(3))
	julian = langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(julian, int64(60)), langruntime.CheckedI64Multiply(quad, int64(3))), langruntime.CheckedI64Divide(extra, int64(146097)))
	quad = langruntime.CheckedI64Divide(julian, int64(1461))
	julian = langruntime.CheckedI64Subtract(julian, langruntime.CheckedI64Multiply(quad, int64(1461)))
	year := langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(julian, int64(4)), int64(1461))
	if year != int64(0) {
		julian = langruntime.CheckedI64Add(langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(julian, int64(305))), int64(365)), int64(123))
	} else {
		julian = langruntime.CheckedI64Add(langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(julian, int64(306))), int64(366)), int64(123))
	}
	year = langruntime.CheckedI64Add(year, langruntime.CheckedI64Multiply(quad, int64(4)))
	quad = langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(julian, int64(2141)), int64(65536))
	return temporalCalendarFields{year: int(int32((langruntime.CheckedI64Subtract(year, int64(4800))))), month: int(int32((langruntime.CheckedI64Add(langruntime.CheckedI64Remainder((langruntime.CheckedI64Add(quad, int64(10))), int64(12)), int64(1))))), day: int(int32((langruntime.CheckedI64Subtract(julian, langruntime.CheckedI64Divide(langruntime.CheckedI64Multiply(int64(7834), quad), int64(256))))))}
}
func temporalTruncateTimestamp(value int64, code int) checkruntime.TimestampValue {
	code = langruntime.CheckedI32(code)
	if code <= 0 {
		if code == langruntime.CheckedSignedNegate(1) {
			return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: checkruntime.MakeSqlError(temporalFieldUnsupportedError)}
		}
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: checkruntime.MakeSqlError(temporalFieldUnitError)}
	}
	if value == int64(-9223372036854775808) || value == int64(9223372036854775807) || code == 1 {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: value}
	}
	scale := int64(86400000000)
	if code == 2 {
		scale = int64(1000)
	}
	if code == 3 {
		scale = int64(1000000)
	}
	if code == 4 {
		scale = int64(60000000)
	}
	if code == 5 {
		scale = int64(3600000000)
	}
	if code <= 6 {
		result := langruntime.CheckedI64Multiply((langruntime.CheckedI64Divide(value, scale)), scale)
		if langruntime.CheckedI64Remainder(value, scale) < int64(0) {
			result = langruntime.CheckedI64Subtract(result, scale)
		}
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: result}
	}
	day := langruntime.CheckedI64Divide(value, int64(86400000000))
	if langruntime.CheckedI64Remainder(value, int64(86400000000)) < int64(0) {
		day = langruntime.CheckedI64Subtract(day, int64(1))
	}
	julian := langruntime.CheckedI64Add(day, int64(2451545))
	if code == 7 {
		weekday := langruntime.CheckedI64Remainder(julian, int64(7))
		if weekday < int64(0) {
			weekday = langruntime.CheckedI64Add(weekday, int64(7))
		}
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: langruntime.CheckedI64Multiply((langruntime.CheckedI64Subtract(day, weekday)), int64(86400000000))}
	}
	calendar := temporalCalendarFromJulian(julian)
	year := calendar.year
	month := calendar.month
	if code == 9 {
		month = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(month, 1)), 3)), 3), 1))
	}
	if code >= 10 {
		month = langruntime.CheckedI32(1)
	}
	if code == 11 {
		if year > 0 {
			year = langruntime.CheckedI32(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide(year, 10)), 10))
		} else {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(0, langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(8, (langruntime.CheckedSignedSubtract(year, 1)))), 10)), 10)))
		}
	}
	if code == 12 {
		if year > 0 {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(year, 99)), 100)), 100), 99))
		} else {
			year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(0, langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(99, (langruntime.CheckedSignedSubtract(year, 1)))), 100)), 100)), 1))
		}
	}
	if code == 13 {
		if year > 0 {
			year = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide((langruntime.CheckedSignedAdd(year, 999)), 1000)), 1000), 999))
		} else {
			year = langruntime.CheckedI32(langruntime.CheckedSignedAdd(langruntime.CheckedSignedSubtract(0, langruntime.CheckedSignedMultiply((langruntime.CheckedSignedDivide((langruntime.CheckedSignedSubtract(999, (langruntime.CheckedSignedSubtract(year, 1)))), 1000)), 1000)), 1))
		}
	}
	truncatedJulian := temporalJulianFromCalendar(year, month, 1)
	return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: langruntime.CheckedI64Multiply((langruntime.CheckedI64Subtract(truncatedJulian, int64(2451545))), int64(86400000000))}
}
func DateTrunc3i0u(units checkruntime.TextValue, input checkruntime.TimestampValue) checkruntime.TimestampValue {
	if units.Kind == checkruntime.TextValueError {
		error := units.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if input.Kind == checkruntime.TimestampValueError {
		error := input.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if units == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || input == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
	}
	if units == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || input == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}
	}
	if units.Kind == checkruntime.TextValueValue {
		unit := langruntime.CheckedString(units.Value)
		if input.Kind == checkruntime.TimestampValueValue {
			value := input.Value
			truncated := temporalTruncateTimestamp(value, temporalUnitCode(unit))
			if truncated.Kind == checkruntime.TimestampValueValue {
				result := truncated.Value
				return checkruntime.MakeTimestampValue(result)
			}
			return truncated
		}
	}
	return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
}

const temporalPrecisionError = 3452619

func temporalAdjustPrecision(value int64, precision int) checkruntime.Int8Value {
	precision = langruntime.CheckedI32(precision)
	if value == int64(-9223372036854775808) || value == int64(9223372036854775807) || precision == langruntime.CheckedSignedNegate(1) || precision == 6 {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: value}
	}
	if precision < 0 || precision > 6 {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: checkruntime.MakeSqlError(temporalPrecisionError)}
	}
	scale := int64(1000000)
	index := 0
	for index < precision {
		scale = langruntime.CheckedI64Divide(scale, int64(10))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	offset := langruntime.CheckedI64Divide(scale, int64(2))
	if value < int64(0) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Subtract(int64(0), langruntime.CheckedI64Multiply((langruntime.CheckedI64Divide((langruntime.CheckedI64Add((langruntime.CheckedI64Subtract(int64(0), value)), offset)), scale)), scale))}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: langruntime.CheckedI64Multiply((langruntime.CheckedI64Divide((langruntime.CheckedI64Add(value, offset)), scale)), scale)}
}
func TimestampAkly(left checkruntime.TimestampValue, right checkruntime.Int4Value) checkruntime.TimestampValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			result := temporalAdjustPrecision(leftValue, rightValue)
			if result.Kind == checkruntime.Int8ValueError {
				error := result.Error
				return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
			}
			if result.Kind == checkruntime.Int8ValueValue {
				value := result.Value
				return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: value}
			}
		}
	}
	return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
}
func TimestamptzUwsx(left checkruntime.TimestamptzValue, right checkruntime.Int4Value) checkruntime.TimestamptzValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if right.Kind == checkruntime.Int4ValueError {
		error := right.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int4ValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			result := temporalAdjustPrecision(leftValue, rightValue)
			if result.Kind == checkruntime.Int8ValueError {
				error := result.Error
				return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
			}
			if result.Kind == checkruntime.Int8ValueValue {
				value := result.Value
				return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: value}
			}
		}
	}
	return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
}
func DateCmpU18z(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: temporalCompare(int64(langruntime.CheckedI32(leftValue)), int64(langruntime.CheckedI32(rightValue)))}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func DateLargerXxhy(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.DateValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			if leftValue > rightValue {
				return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: leftValue}
			}
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: rightValue}
		}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func DateSmallerE286(left checkruntime.DateValue, right checkruntime.DateValue) checkruntime.DateValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if right.Kind == checkruntime.DateValueError {
		error := right.Error
		return checkruntime.DateValue{Kind: checkruntime.DateValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.DateValue{Kind: checkruntime.DateValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.DateValueValue {
			rightValue := langruntime.CheckedI32(right.Value)
			if leftValue < rightValue {
				return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: leftValue}
			}
			return checkruntime.DateValue{Kind: checkruntime.DateValueValue, Value: rightValue}
		}
	}
	return checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}
}
func HashdateKnfp(left checkruntime.DateValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		return Hashint4Zr00(checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: leftValue})
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func Hashdateextended863n(left checkruntime.DateValue, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return Hashint4extendedXf6v(checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: leftValue}, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: rightValue})
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func Isfinite2dqo(left checkruntime.DateValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.DateValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.DateValue{Kind: checkruntime.DateValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.DateValueValue {
		leftValue := langruntime.CheckedI32(left.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) && leftValue != 2147483647}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func IsfiniteCdmf(left checkruntime.TimestamptzValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != int64(-9223372036854775808) && leftValue != int64(9223372036854775807)}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func Isfinite4zxx(left checkruntime.TimestampValue) checkruntime.BoolValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: leftValue != int64(-9223372036854775808) && leftValue != int64(9223372036854775807)}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TimestampCmpLpkm(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: temporalCompare(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TimestampHash71nv(left checkruntime.TimestampValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		return Hashint83wid(checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: leftValue})
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TimestampHashExtendedXc4h(left checkruntime.TimestampValue, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return Hashint8extendedFrvh(checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: leftValue}, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: rightValue})
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func TimestampLargerUtuv(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.TimestampValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			if leftValue > rightValue {
				return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: leftValue}
			}
			return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: rightValue}
		}
	}
	return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
}
func TimestampSmaller5aln(left checkruntime.TimestampValue, right checkruntime.TimestampValue) checkruntime.TimestampValue {
	if left.Kind == checkruntime.TimestampValueError {
		error := left.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestampValueError {
		error := right.Error
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueError, Error: error}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
	}
	if left == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) || right == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}
	}
	if left.Kind == checkruntime.TimestampValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestampValueValue {
			rightValue := right.Value
			if leftValue < rightValue {
				return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: leftValue}
			}
			return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueValue, Value: rightValue}
		}
	}
	return checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}
}
func TimestamptzCmpCa0r(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: temporalCompare(leftValue, rightValue)}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TimestamptzHashUsaa(left checkruntime.TimestamptzValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		return Hashint83wid(checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: leftValue})
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TimestamptzHashExtendedVeri(left checkruntime.TimestamptzValue, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			rightValue := right.Value
			return Hashint8extendedFrvh(checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: leftValue}, checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: rightValue})
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func TimestamptzLarger63cv(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.TimestamptzValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			if leftValue > rightValue {
				return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: leftValue}
			}
			return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: rightValue}
		}
	}
	return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
}
func TimestamptzSmallerLbk9(left checkruntime.TimestamptzValue, right checkruntime.TimestamptzValue) checkruntime.TimestamptzValue {
	if left.Kind == checkruntime.TimestamptzValueError {
		error := left.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if right.Kind == checkruntime.TimestamptzValueError {
		error := right.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
	}
	if left == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) || right == (checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}
	}
	if left.Kind == checkruntime.TimestamptzValueValue {
		leftValue := left.Value
		if right.Kind == checkruntime.TimestamptzValueValue {
			rightValue := right.Value
			if leftValue < rightValue {
				return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: leftValue}
			}
			return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: rightValue}
		}
	}
	return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
}
func temporalDecimalParts(whole int64, fraction int64, scale int, negativeZero bool) string {
	scale = langruntime.CheckedI32(scale)
	output := ""
	if negativeZero {
		output = output + string(langruntime.CheckedChar('-'))
	}
	integer := checkruntime.TextSignedNumber(whole)
	output = output + integer
	if scale > 0 {
		output = output + string(langruntime.CheckedChar('.'))
		divisor := int64(1)
		index := 1
		for index < scale {
			divisor = langruntime.CheckedI64Multiply(divisor, int64(10))
			index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
		}
		remaining := fraction
		for divisor > int64(0) {
			digit := langruntime.CheckedI64Divide(remaining, divisor)
			code := int(int32(digit))
			character := langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(code, 48)), '0')
			output = output + string(langruntime.CheckedChar(character))
			remaining = langruntime.CheckedI64Remainder(remaining, divisor)
			divisor = langruntime.CheckedI64Divide(divisor, int64(10))
		}
	}
	return output
}
func temporalScaledNumber(value int64, scale int) checkruntime.NumericValue {
	scale = langruntime.CheckedI32(scale)
	divisor := int64(1)
	index := 0
	for index < scale {
		divisor = langruntime.CheckedI64Multiply(divisor, int64(10))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	whole := langruntime.CheckedI64Divide(value, divisor)
	fraction := langruntime.CheckedI64Remainder(value, divisor)
	if fraction < int64(0) {
		fraction = langruntime.CheckedI64Subtract(int64(0), fraction)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: temporalDecimalParts(whole, fraction, scale, value < int64(0) && whole == int64(0))}
}
func temporalTimestampEpoch(value int64) checkruntime.NumericValue {
	whole := langruntime.CheckedI64Add(langruntime.CheckedI64Divide(value, int64(1000000)), int64(946684800))
	fraction := langruntime.CheckedI64Remainder(value, int64(1000000))
	if fraction < int64(0) {
		whole = langruntime.CheckedI64Subtract(whole, int64(1))
		fraction = langruntime.CheckedI64Add(fraction, int64(1000000))
	}
	if value >= int64(9222425352054775807) {
		fraction = langruntime.CheckedI64Multiply((langruntime.CheckedI64Divide((langruntime.CheckedI64Add(fraction, int64(50))), int64(100))), int64(100))
		if fraction == int64(1000000) {
			whole = langruntime.CheckedI64Add(whole, int64(1))
			fraction = int64(0)
		}
	}
	negative := whole < int64(0)
	if negative && fraction != int64(0) {
		whole = langruntime.CheckedI64Add(whole, int64(1))
		fraction = langruntime.CheckedI64Subtract(int64(1000000), fraction)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: temporalDecimalParts(whole, fraction, 6, negative && whole == int64(0))}
}
func temporalTimestampJulian(julian int64, clock int64) checkruntime.NumericValue {
	weight := 0
	first := clock
	if clock >= int64(100000000) {
		weight = langruntime.CheckedI32(2)
		first = langruntime.CheckedI64Divide(clock, int64(100000000))
	} else if clock >= int64(10000) {
		weight = langruntime.CheckedI32(1)
		first = langruntime.CheckedI64Divide(clock, int64(10000))
	}
	quotientWeight := langruntime.CheckedSignedSubtract(weight, 2)
	if first <= int64(864) {
		quotientWeight = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(quotientWeight, 1))
	}
	scale := langruntime.CheckedSignedSubtract(16, langruntime.CheckedSignedMultiply(quotientWeight, 4))
	denominator := int64(86400000000)
	remainder := clock
	fraction := []rune{}
	index := 0
	for index < scale {
		remainder = langruntime.CheckedI64Multiply(remainder, int64(10))
		digit := int(int32((langruntime.CheckedI64Divide(remainder, denominator))))
		langruntime.CheckedAdd(len(fraction), 1)
		fraction = append(fraction, langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(digit, 48)), '0')))
		remainder = langruntime.CheckedI64Remainder(remainder, denominator)
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	carry := langruntime.CheckedI64Multiply(remainder, int64(2)) >= denominator
	cursor := len(fraction)
	for carry && cursor > 0 {
		cursor = langruntime.CheckedIndex(langruntime.CheckedSubtract(cursor, 1))
		code := int(langruntime.CheckedChar(fraction[cursor]))
		if code == 57 {
			fraction[cursor] = langruntime.CheckedChar('0')
		} else {
			fraction[cursor] = langruntime.CheckedChar(langruntime.CharacterFromI32((langruntime.CheckedSignedAdd(code, 1)), '0'))
			carry = false
		}
	}
	whole := julian
	if carry {
		whole = langruntime.CheckedI64Add(whole, int64(1))
	}
	output := checkruntime.TextSignedNumber(whole)
	output = output + string(langruntime.CheckedChar('.'))
	cursor = langruntime.CheckedIndex(0)
	for cursor < len(fraction) {
		output = output + string(langruntime.CheckedChar(fraction[cursor]))
		cursor = langruntime.CheckedAdd(cursor, 1)
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: output}
}
func temporalExtractTimestamp(value int64, unit string) checkruntime.NumericValue {
	unit = langruntime.CheckedString(unit)
	code := temporalExtractCode(unit)
	if code == 0 || code == langruntime.CheckedSignedNegate(2) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(temporalFieldUnitError)}
	}
	if value == int64(-9223372036854775808) || value == int64(9223372036854775807) {
		if (code >= 1 && code <= 9) || code == 16 || code == 17 || code == 18 || temporalUnitCode(unit) == langruntime.CheckedSignedNegate(1) {
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
		}
		if code >= 10 && code <= 19 {
			if value < int64(0) {
				return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "-Infinity"}
			}
			return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: "Infinity"}
		}
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(temporalFieldUnsupportedError)}
	}
	if code == langruntime.CheckedSignedNegate(1) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: checkruntime.MakeSqlError(temporalFieldUnsupportedError)}
	}
	day := langruntime.CheckedI64Divide(value, int64(86400000000))
	clock := langruntime.CheckedI64Remainder(value, int64(86400000000))
	if clock < int64(0) {
		day = langruntime.CheckedI64Subtract(day, int64(1))
		clock = langruntime.CheckedI64Add(clock, int64(86400000000))
	}
	if code == 1 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(langruntime.CheckedI64Remainder(clock, int64(60000000)))}
	}
	if code == 2 {
		return temporalScaledNumber(langruntime.CheckedI64Remainder(clock, int64(60000000)), 3)
	}
	if code == 3 {
		return temporalScaledNumber(langruntime.CheckedI64Remainder(clock, int64(60000000)), 6)
	}
	if code == 4 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(langruntime.CheckedI64Remainder(langruntime.CheckedI64Divide(clock, int64(60000000)), int64(60)))}
	}
	if code == 5 {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueValue, Value: checkruntime.TextSignedNumber(langruntime.CheckedI64Divide(clock, int64(3600000000)))}
	}
	if code == 14 {
		return temporalTimestampJulian(langruntime.CheckedI64Add(day, int64(2451545)), clock)
	}
	if code == 19 {
		return temporalTimestampEpoch(value)
	}
	return temporalExtractDate(int(int32(day)), code)
}
func ExtractF4l3(units checkruntime.TextValue, input checkruntime.TimestampValue) checkruntime.NumericValue {
	if units.Kind == checkruntime.TextValueError {
		error := units.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if input.Kind == checkruntime.TimestampValueError {
		error := input.Error
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueError, Error: error}
	}
	if units == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || input == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueUnknown}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
	}
	if units == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || input == (checkruntime.TimestampValue{Kind: checkruntime.TimestampValueNull}) {
		return checkruntime.NumericValue{Kind: checkruntime.NumericValueNull}
	}
	if units.Kind == checkruntime.TextValueValue {
		unit := langruntime.CheckedString(units.Value)
		if input.Kind == checkruntime.TimestampValueValue {
			value := input.Value
			return temporalExtractTimestamp(value, unit)
		}
	}
	return checkruntime.NumericValue{Kind: checkruntime.NumericValueUnknown}
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
func Ascii7m47(input checkruntime.TextValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		chars := []rune(value)
		if len(chars) == 0 {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
		code := int(langruntime.CheckedChar(chars[0]))
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: code}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func TextVuvi(input checkruntime.BoolValue) checkruntime.TextValue {
	if input.Kind == checkruntime.BoolValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.BoolValueValue {
		value := input.Value
		if value {
			return checkruntime.MakeTextValue("true")
		}
		return checkruntime.MakeTextValue("false")
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func textCaseValue(input checkruntime.TextValue, mode int) checkruntime.TextValue {
	mode = langruntime.CheckedI32(mode)
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		characters := []rune(value)
		output := ""
		previousAlphanumeric := false
		index := 0
		for index < len(characters) {
			original := characters[index]
			code := int(langruntime.CheckedChar(original))
			uppercase := mode == 1 || (mode == 2 && previousAlphanumeric == false)
			character := langruntime.AsciiLowercase(original)
			if uppercase {
				character = langruntime.CheckedChar(original)
				if code >= 97 && code <= 122 {
					upperCode := langruntime.CheckedSignedSubtract(code, 32)
					character = langruntime.CheckedChar(langruntime.CharacterFromI32(upperCode, original))
				}
			}
			output = output + string(langruntime.CheckedChar(character))
			previousAlphanumeric = (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)
			index = langruntime.CheckedAdd(index, 1)
		}
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func CasefoldBgkh(input checkruntime.TextValue) checkruntime.TextValue {
	return textCaseValue(input, 0)
}
func InitcapFyn6(input checkruntime.TextValue) checkruntime.TextValue {
	return textCaseValue(input, 2)
}
func LowerHcg0(input checkruntime.TextValue) checkruntime.TextValue {
	return textCaseValue(input, 0)
}
func UpperValc(input checkruntime.TextValue) checkruntime.TextValue {
	return textCaseValue(input, 1)
}
func textHashValue(input checkruntime.TextValue, trimSpaces bool) checkruntime.Int4Value {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		hex := textBinaryHex(value, trimSpaces)
		bytes := byteaHashBytes(hex)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: checkruntime.HashBytes32(bytes)}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func textHashExtended(input checkruntime.TextValue, seed checkruntime.Int8Value, trimSpaces bool) checkruntime.Int8Value {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if seed.Kind == checkruntime.Int8ValueError {
		error := seed.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || seed == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		value := langruntime.CheckedString(input.Value)
		if seed.Kind == checkruntime.Int8ValueValue {
			salt := seed.Value
			hex := textBinaryHex(value, trimSpaces)
			bytes := byteaHashBytes(hex)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: checkruntime.HashBytes64(bytes, salt)}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func HashtextCnj7(input checkruntime.TextValue) checkruntime.Int4Value {
	return textHashValue(input, false)
}
func HashbpcharEeeo(input checkruntime.TextValue) checkruntime.Int4Value {
	return textHashValue(input, true)
}
func HashtextextendedDns6(input checkruntime.TextValue, seed checkruntime.Int8Value) checkruntime.Int8Value {
	return textHashExtended(input, seed, false)
}
func HashbpcharextendedCa1t(input checkruntime.TextValue, seed checkruntime.Int8Value) checkruntime.Int8Value {
	return textHashExtended(input, seed, true)
}
func GinCmpTslexeme1b7b(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return textBinaryCompare(left, right, false)
}
func GinCompareJsonbIzgy(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return textBinaryCompare(left, right, false)
}
func BitLengthBpcw(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, false, 2)
}
func CharLengthZjgv(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, true, 0)
}
func CharLengthO1qu(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, false, 0)
}
func CharacterLengthMqtx(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, true, 0)
}
func CharacterLengthB3q2(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, false, 0)
}
func LengthUhru(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, true, 0)
}
func OctetLength12ga(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, false, 1)
}
func OctetLength9hmr(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, false, 1)
}
func Textlen2bvv(value checkruntime.TextValue) checkruntime.Int4Value {
	return textMeasureValue(value, false, 0)
}
func BpcharLargerClri(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.TextValue {
	compared := textBinaryCompare(left, right, true)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if order >= 0 {
			return left
		}
		return right
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func BpcharPatternGeDv6p(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, true)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpcharPatternGtTnmi(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, true)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpcharPatternLe5vh3(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, true)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpcharPatternLt5798(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, true)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func BpcharSmaller0mnx(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.TextValue {
	compared := textBinaryCompare(left, right, true)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if order <= 0 {
			return left
		}
		return right
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func BpcharcmpB8vl(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return textBinaryCompare(left, right, true)
}
func BtbpcharPatternCmpJjb6(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return textBinaryCompare(left, right, true)
}
func BttextPatternCmpJgxm(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return textBinaryCompare(left, right, false)
}
func BttextcmpPuxw(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return textBinaryCompare(left, right, false)
}
func TextLargerSsmm(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.TextValue {
	compared := textBinaryCompare(left, right, false)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if order > 0 {
			return left
		}
		return right
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func TextPatternGeV6bi(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, false)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order >= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextPatternGt99dz(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, false)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order > 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextPatternLeDpvx(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, false)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order <= 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextPatternLtQftf(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.BoolValue {
	compared := textBinaryCompare(left, right, false)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		return checkruntime.BoolValue{Kind: checkruntime.BoolValueValue, Value: order < 0}
	}
	return checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}
}
func TextSmallerT2nd(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.TextValue {
	compared := textBinaryCompare(left, right, false)
	if compared.Kind == checkruntime.Int4ValueError {
		error := compared.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if compared == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if compared.Kind == checkruntime.Int4ValueValue {
		order := langruntime.CheckedI32(compared.Value)
		if order < 0 {
			return left
		}
		return right
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const textBuildLimitError = 8584704

func textBuildOctets(value string) int64 {
	value = langruntime.CheckedString(value)
	characters := []rune(value)
	size := int64(0)
	index := 0
	for index < len(characters) {
		code := int(langruntime.CheckedChar(characters[index]))
		width := int64(1)
		if code >= 128 {
			width = int64(2)
		}
		if code >= 2048 {
			width = int64(3)
		}
		if code >= 65536 {
			width = int64(4)
		}
		size = langruntime.CheckedI64Add(size, width)
		index = langruntime.CheckedAdd(index, 1)
	}
	return size
}
func textPadding(input checkruntime.TextValue, length checkruntime.Int4Value, fill checkruntime.TextValue, right bool) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if fill.Kind == checkruntime.TextValueError {
		error := fill.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || fill == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || fill == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if length.Kind == checkruntime.Int4ValueValue {
			requested := langruntime.CheckedI32(length.Value)
			if fill.Kind == checkruntime.TextValueValue {
				padding := langruntime.CheckedString(fill.Value)
				characters := []rune(text)
				members := []rune(padding)
				count := requested
				if count < 0 {
					count = langruntime.CheckedI32(0)
				}
				end := 0
				kept := 0
				for end < len(characters) && kept < count {
					end = langruntime.CheckedAdd(end, 1)
					kept = langruntime.CheckedI32(langruntime.CheckedSignedAdd(kept, 1))
				}
				if len(members) == 0 {
					count = langruntime.CheckedI32(kept)
				}
				if count >= 268435455 {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textBuildLimitError)}
				}
				paddingCount := langruntime.CheckedSignedSubtract(count, kept)
				output := ""
				index := 0
				if right {
					for index < end {
						output = output + string(langruntime.CheckedChar(characters[index]))
						index = langruntime.CheckedAdd(index, 1)
					}
				}
				index = langruntime.CheckedIndex(0)
				for paddingCount > 0 {
					output = output + string(langruntime.CheckedChar(members[index]))
					index = langruntime.CheckedAdd(index, 1)
					if index == len(members) {
						index = langruntime.CheckedIndex(0)
					}
					paddingCount = langruntime.CheckedI32(langruntime.CheckedSignedSubtract(paddingCount, 1))
				}
				if right == false {
					index = langruntime.CheckedIndex(0)
					for index < end {
						output = output + string(langruntime.CheckedChar(characters[index]))
						index = langruntime.CheckedAdd(index, 1)
					}
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func LpadEzhf(input checkruntime.TextValue, length checkruntime.Int4Value, fill checkruntime.TextValue) checkruntime.TextValue {
	return textPadding(input, length, fill, false)
}
func LpadLqi7(input checkruntime.TextValue, length checkruntime.Int4Value) checkruntime.TextValue {
	return textPadding(input, length, checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: " "}, false)
}
func RpadBw5z(input checkruntime.TextValue, length checkruntime.Int4Value, fill checkruntime.TextValue) checkruntime.TextValue {
	return textPadding(input, length, fill, true)
}
func Rpad53f6(input checkruntime.TextValue, length checkruntime.Int4Value) checkruntime.TextValue {
	return textPadding(input, length, checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: " "}, true)
}
func RepeatF0fb(input checkruntime.TextValue, length checkruntime.Int4Value) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if length.Kind == checkruntime.Int4ValueValue {
			requested := langruntime.CheckedI32(length.Value)
			if requested <= 0 {
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: ""}
			}
			size := textBuildOctets(text)
			if size == int64(0) {
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: ""}
			}
			if langruntime.CheckedI64Multiply(size, int64(langruntime.CheckedI32(requested))) > int64(1073741819) {
				return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textBuildLimitError)}
			}
			count := requested
			block := text
			output := ""
			for count > 0 {
				if langruntime.CheckedSignedRemainder(count, 2) == 1 {
					output = output + block
				}
				count = langruntime.CheckedI32(langruntime.CheckedSignedDivide(count, 2))
				if count > 0 {
					copy := langruntime.CheckedString(block)
					block = block + copy
				}
			}
			return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func TranslateTxpt(input checkruntime.TextValue, from checkruntime.TextValue, to checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if from.Kind == checkruntime.TextValueError {
		error := from.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if to.Kind == checkruntime.TextValueError {
		error := to.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || from == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || to == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || from == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || to == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if from.Kind == checkruntime.TextValueValue {
			source := langruntime.CheckedString(from.Value)
			if to.Kind == checkruntime.TextValueValue {
				target := langruntime.CheckedString(to.Value)
				if textBuildOctets(text) > int64(268435454) {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textBuildLimitError)}
				}
				characters := []rune(text)
				before := []rune(source)
				after := []rune(target)
				output := ""
				index := 0
				for index < len(characters) {
					member := 0
					for member < len(before) && before[member] != characters[index] {
						member = langruntime.CheckedAdd(member, 1)
					}
					if member < len(before) {
						if member < len(after) {
							output = output + string(langruntime.CheckedChar(after[member]))
						}
					} else {
						output = output + string(langruntime.CheckedChar(characters[index]))
					}
					index = langruntime.CheckedAdd(index, 1)
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const textQuoteAllocationError = 56966976

func QuoteLiteralD0rq(input checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if textBuildOctets(text) > int64(536870908) {
			return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textQuoteAllocationError)}
		}
		characters := []rune(text)
		escaped := false
		index := 0
		for index < len(characters) {
			if characters[index] == '\\' {
				escaped = true
			}
			index = langruntime.CheckedAdd(index, 1)
		}
		output := ""
		if escaped {
			output = output + string(langruntime.CheckedChar('E'))
		}
		output = output + string(langruntime.CheckedChar('\''))
		index = langruntime.CheckedIndex(0)
		for index < len(characters) {
			character := characters[index]
			if character == '\'' || character == '\\' {
				output = output + string(langruntime.CheckedChar(character))
			}
			output = output + string(langruntime.CheckedChar(character))
			index = langruntime.CheckedAdd(index, 1)
		}
		output = output + string(langruntime.CheckedChar('\''))
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const textSearchParameterError = 3452619
const textSearchInternalError = 56966976

type textSearchState struct {
	characters []rune
	pattern    []rune
}

func copytextSearchState(value textSearchState) textSearchState {
	return textSearchState{characters: langruntime.CheckedChars(value.characters), pattern: langruntime.CheckedChars(value.pattern)}
}
func textSearchAt(search *textSearchState, from int) bool {
	search = langruntime.CheckedBorrowed(search, copytextSearchState)
	from = langruntime.CheckedIndex(from)
	if len(search.pattern) > langruntime.CheckedSubtract(len(search.characters), from) {
		return false
	}
	index := 0
	for index < len(search.pattern) {
		if search.characters[langruntime.CheckedAdd(from, index)] != search.pattern[index] {
			return false
		}
		index = langruntime.CheckedAdd(index, 1)
	}
	return true
}
func textSearchRange(search *textSearchState, from int, end int) string {
	search = langruntime.CheckedBorrowed(search, copytextSearchState)
	from = langruntime.CheckedIndex(from)
	end = langruntime.CheckedIndex(end)
	output := ""
	index := from
	for index < end {
		output = output + string(langruntime.CheckedChar(search.characters[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	return output
}
func TextcatS76e(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.TextValue {
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		first := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			second := langruntime.CheckedString(right.Value)
			if langruntime.CheckedI64Add(textBuildOctets(first), textBuildOctets(second)) > int64(1073741819) {
				return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textSearchInternalError)}
			}
			output := first
			output = output + second
			return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func StrposEb1n(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		first := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			second := langruntime.CheckedString(right.Value)
			search := textSearchState{characters: []rune(first), pattern: []rune(second)}
			index := 0
			position := 1
			for index <= len(search.characters) {
				if textSearchAt(&search, index) {
					return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: position}
				}
				index = langruntime.CheckedAdd(index, 1)
				position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
			}
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func PositionLq28(left checkruntime.TextValue, right checkruntime.TextValue) checkruntime.Int4Value {
	return StrposEb1n(left, right)
}
func textOverlayValue(input checkruntime.TextValue, replacement checkruntime.TextValue, position checkruntime.Int4Value, length checkruntime.Int4Value, omitted bool) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if replacement.Kind == checkruntime.TextValueError {
		error := replacement.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || replacement == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || replacement == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if replacement.Kind == checkruntime.TextValueValue {
			inserted := langruntime.CheckedString(replacement.Value)
			if position.Kind == checkruntime.Int4ValueValue {
				start := langruntime.CheckedI32(position.Value)
				if length.Kind == checkruntime.Int4ValueValue {
					requested := langruntime.CheckedI32(length.Value)
					count := requested
					if omitted {
						measured := textMeasureValue(checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: langruntime.CheckedString(inserted)}, false, 0)
						if measured.Kind == checkruntime.Int4ValueValue {
							value := langruntime.CheckedI32(measured.Value)
							count = langruntime.CheckedI32(value)
						}
					}
					if start <= 0 {
						return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textSubstringError)}
					}
					end := langruntime.CheckedI64Add(int64(langruntime.CheckedI32(start)), int64(langruntime.CheckedI32(count)))
					if end < int64(-2147483648) || end > int64(2147483647) {
						return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textLengthRangeError)}
					}
					first := textSubstringValue(checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: langruntime.CheckedString(text)}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 1}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: langruntime.CheckedSignedSubtract(start, 1)}, true)
					second := textSubstringValue(checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: text}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: int(int32(end))}, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
					head := TextcatS76e(first, checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: inserted})
					return TextcatS76e(head, second)
				}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func OverlayNiqv(input checkruntime.TextValue, replacement checkruntime.TextValue, position checkruntime.Int4Value) checkruntime.TextValue {
	return textOverlayValue(input, replacement, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, true)
}
func OverlayJu3l(input checkruntime.TextValue, replacement checkruntime.TextValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.TextValue {
	return textOverlayValue(input, replacement, position, length, false)
}
func ReplaceGz9l(input checkruntime.TextValue, from checkruntime.TextValue, to checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if from.Kind == checkruntime.TextValueError {
		error := from.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if to.Kind == checkruntime.TextValueError {
		error := to.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || from == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || to == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || from == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || to == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if from.Kind == checkruntime.TextValueValue {
			pattern := langruntime.CheckedString(from.Value)
			if to.Kind == checkruntime.TextValueValue {
				replacement := langruntime.CheckedString(to.Value)
				if pattern == "" || text == "" {
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: text}
				}
				search := textSearchState{characters: []rune(text), pattern: []rune(pattern)}
				index := 0
				outputSize := textBuildOctets(text)
				difference := langruntime.CheckedI64Subtract(textBuildOctets(replacement), textBuildOctets(pattern))
				for index < len(search.characters) {
					if textSearchAt(&search, index) {
						outputSize = langruntime.CheckedI64Add(outputSize, difference)
						index = langruntime.CheckedAdd(index, len(search.pattern))
					} else {
						index = langruntime.CheckedAdd(index, 1)
					}
				}
				if outputSize > int64(1073741822) {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textBuildLimitError)}
				}
				if outputSize > int64(1073741819) {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textSearchInternalError)}
				}
				output := ""
				index = langruntime.CheckedIndex(0)
				for index < len(search.characters) {
					if textSearchAt(&search, index) {
						output = output + replacement
						index = langruntime.CheckedAdd(index, len(search.pattern))
					} else {
						output = output + string(langruntime.CheckedChar(search.characters[index]))
						index = langruntime.CheckedAdd(index, 1)
					}
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func SplitPartDoxr(input checkruntime.TextValue, separator checkruntime.TextValue, field checkruntime.Int4Value) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if separator.Kind == checkruntime.TextValueError {
		error := separator.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if field.Kind == checkruntime.Int4ValueError {
		error := field.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || separator == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || field == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || separator == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || field == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if separator.Kind == checkruntime.TextValueValue {
			pattern := langruntime.CheckedString(separator.Value)
			if field.Kind == checkruntime.Int4ValueValue {
				requested := langruntime.CheckedI32(field.Value)
				if requested == 0 {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textSearchParameterError)}
				}
				if text == "" {
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: text}
				}
				if pattern == "" {
					if requested == 1 || requested == langruntime.CheckedSignedNegate(1) {
						return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: text}
					}
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: ""}
				}
				search := textSearchState{characters: []rune(text), pattern: []rune(pattern)}
				target := int64(langruntime.CheckedI32(requested))
				index := 0
				if target < int64(0) {
					fields := int64(1)
					for index < len(search.characters) {
						if textSearchAt(&search, index) {
							fields = langruntime.CheckedI64Add(fields, int64(1))
							index = langruntime.CheckedAdd(index, len(search.pattern))
						} else {
							index = langruntime.CheckedAdd(index, 1)
						}
					}
					target = langruntime.CheckedI64Add(langruntime.CheckedI64Add(target, fields), int64(1))
					if target <= int64(0) {
						return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: ""}
					}
				}
				index = langruntime.CheckedIndex(0)
				first := 0
				current := int64(1)
				for index < len(search.characters) {
					if textSearchAt(&search, index) {
						if current == target {
							return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: textSearchRange(&search, first, index)}
						}
						current = langruntime.CheckedI64Add(current, int64(1))
						index = langruntime.CheckedAdd(index, len(search.pattern))
						first = langruntime.CheckedIndex(index)
					} else {
						index = langruntime.CheckedAdd(index, 1)
					}
				}
				if current == target {
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: textSearchRange(&search, first, index)}
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: ""}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}

const textSubstringError = 3452581

func textSubstringValue(input checkruntime.TextValue, position checkruntime.Int4Value, length checkruntime.Int4Value, hasLength bool) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if position.Kind == checkruntime.Int4ValueError {
		error := position.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || position == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if position.Kind == checkruntime.Int4ValueValue {
			start := langruntime.CheckedI32(position.Value)
			if length.Kind == checkruntime.Int4ValueValue {
				count := langruntime.CheckedI32(length.Value)
				if hasLength && count < 0 {
					return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textSubstringError)}
				}
				first := int64(langruntime.CheckedI32(start))
				end := int64(2147483648)
				if hasLength && start <= langruntime.CheckedSignedSubtract(2147483647, count) {
					stop := langruntime.CheckedSignedAdd(start, count)
					end = int64(langruntime.CheckedI32(stop))
				}
				characters := []rune(text)
				output := ""
				index := 0
				current := int64(1)
				for index < len(characters) && current < end {
					if current >= first {
						output = output + string(langruntime.CheckedChar(characters[index]))
					}
					index = langruntime.CheckedAdd(index, 1)
					current = langruntime.CheckedI64Add(current, int64(1))
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func textSideValue(input checkruntime.TextValue, length checkruntime.Int4Value, fromRight bool) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if length.Kind == checkruntime.Int4ValueError {
		error := length.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || length == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if length.Kind == checkruntime.Int4ValueValue {
			count := langruntime.CheckedI32(length.Value)
			characters := []rune(text)
			total := int64(0)
			index := 0
			for index < len(characters) {
				total = langruntime.CheckedI64Add(total, int64(1))
				index = langruntime.CheckedAdd(index, 1)
			}
			requested := int64(langruntime.CheckedI32(count))
			first := int64(0)
			end := total
			if fromRight {
				if count < 0 {
					first = langruntime.CheckedI64Subtract(int64(0), requested)
					if count == langruntime.CheckedSignedSubtract(langruntime.CheckedSignedNegate(2147483647), 1) {
						first = int64(0)
					}
				} else {
					first = langruntime.CheckedI64Subtract(total, requested)
				}
			} else if count < 0 {
				end = langruntime.CheckedI64Add(total, requested)
			} else {
				end = requested
			}
			output := ""
			index = langruntime.CheckedIndex(0)
			current := int64(0)
			for index < len(characters) && current < end {
				if current >= first {
					output = output + string(langruntime.CheckedChar(characters[index]))
				}
				index = langruntime.CheckedAdd(index, 1)
				current = langruntime.CheckedI64Add(current, int64(1))
			}
			return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func SubstringEzt4(input checkruntime.TextValue, position checkruntime.Int4Value) checkruntime.TextValue {
	return textSubstringValue(input, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func SubstringDd1c(input checkruntime.TextValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.TextValue {
	return textSubstringValue(input, position, length, true)
}
func Substr8v03(input checkruntime.TextValue, position checkruntime.Int4Value) checkruntime.TextValue {
	return textSubstringValue(input, position, checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: 0}, false)
}
func SubstrZhiv(input checkruntime.TextValue, position checkruntime.Int4Value, length checkruntime.Int4Value) checkruntime.TextValue {
	return textSubstringValue(input, position, length, true)
}
func Left8f3e(input checkruntime.TextValue, length checkruntime.Int4Value) checkruntime.TextValue {
	return textSideValue(input, length, false)
}
func RightHbgt(input checkruntime.TextValue, length checkruntime.Int4Value) checkruntime.TextValue {
	return textSideValue(input, length, true)
}
func Reverse5pr1(input checkruntime.TextValue) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		characters := []rune(text)
		index := len(characters)
		output := ""
		for index > 0 {
			index = langruntime.CheckedIndex(langruntime.CheckedSubtract(index, 1))
			output = output + string(langruntime.CheckedChar(characters[index]))
		}
		return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func Btrim2rb3(value checkruntime.TextValue) checkruntime.TextValue {
	return textTrimValue(value, checkruntime.MakeTextValue(" "), true, true)
}
func BtrimFwtx(value checkruntime.TextValue, set checkruntime.TextValue) checkruntime.TextValue {
	return textTrimValue(value, set, true, true)
}
func LtrimNnx9(value checkruntime.TextValue) checkruntime.TextValue {
	return textTrimValue(value, checkruntime.MakeTextValue(" "), true, false)
}
func LtrimQ5x0(value checkruntime.TextValue, set checkruntime.TextValue) checkruntime.TextValue {
	return textTrimValue(value, set, true, false)
}
func RtrimT07s(value checkruntime.TextValue) checkruntime.TextValue {
	return textTrimValue(value, checkruntime.MakeTextValue(" "), false, true)
}
func RtrimG9ee(value checkruntime.TextValue, set checkruntime.TextValue) checkruntime.TextValue {
	return textTrimValue(value, set, false, true)
}

const textWidthTruncationError = 3452545
const textWidthAllocationError = 56966976

func textWidthValue(input checkruntime.TextValue, modifier checkruntime.Int4Value, explicit checkruntime.BoolValue, fixed bool) checkruntime.TextValue {
	if input.Kind == checkruntime.TextValueError {
		error := input.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if modifier.Kind == checkruntime.Int4ValueError {
		error := modifier.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if explicit.Kind == checkruntime.BoolValueError {
		error := explicit.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || modifier == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}) || explicit == (checkruntime.BoolValue{Kind: checkruntime.BoolValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if input == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || modifier == (checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}) || explicit == (checkruntime.BoolValue{Kind: checkruntime.BoolValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if input.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(input.Value)
		if modifier.Kind == checkruntime.Int4ValueValue {
			typmod := langruntime.CheckedI32(modifier.Value)
			if explicit.Kind == checkruntime.BoolValueValue {
				isExplicit := explicit.Value
				if typmod < 4 {
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: text}
				}
				width := langruntime.CheckedSignedSubtract(typmod, 4)
				characters := []rune(text)
				count := 0
				index := 0
				for index < len(characters) {
					count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
					index = langruntime.CheckedAdd(index, 1)
				}
				if count == width || (fixed == false && count < width) {
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: text}
				}
				if count < width {
					padding := langruntime.CheckedSignedSubtract(width, count)
					outputSize := langruntime.CheckedI64Add(textBuildOctets(text), int64(langruntime.CheckedI32(padding)))
					if outputSize > int64(1073741819) {
						return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textWidthAllocationError)}
					}
					output := text
					for count < width {
						output = output + string(langruntime.CheckedChar(' '))
						count = langruntime.CheckedI32(langruntime.CheckedSignedAdd(count, 1))
					}
					return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
				}
				output := ""
				position := 0
				index = langruntime.CheckedIndex(0)
				for index < len(characters) {
					if position < width {
						output = output + string(langruntime.CheckedChar(characters[index]))
					} else if isExplicit == false && characters[index] != ' ' {
						return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: checkruntime.MakeSqlError(textWidthTruncationError)}
					}
					position = langruntime.CheckedI32(langruntime.CheckedSignedAdd(position, 1))
					index = langruntime.CheckedAdd(index, 1)
				}
				return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
			}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
}
func Bpchar2uas(input checkruntime.TextValue, modifier checkruntime.Int4Value, explicit checkruntime.BoolValue) checkruntime.TextValue {
	return textWidthValue(input, modifier, explicit, true)
}
func Varchar2rhn(input checkruntime.TextValue, modifier checkruntime.Int4Value, explicit checkruntime.BoolValue) checkruntime.TextValue {
	return textWidthValue(input, modifier, explicit, false)
}

const textLengthRangeError = 3452547

func textBinaryHex(value string, trimSpaces bool) string {
	value = langruntime.CheckedString(value)
	characters := []rune(value)
	end := len(characters)
	if trimSpaces {
		for end > 0 && characters[langruntime.CheckedSubtract(end, 1)] == ' ' {
			end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
		}
	}
	output := ""
	index := 0
	for index < end {
		output = langruntime.CheckedString(byteaUtf8Character(output, characters[index]))
		index = langruntime.CheckedAdd(index, 1)
	}
	return output
}
func textBinaryCompare(left checkruntime.TextValue, right checkruntime.TextValue, trimSpaces bool) checkruntime.Int4Value {
	if left.Kind == checkruntime.TextValueError {
		error := left.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if right.Kind == checkruntime.TextValueError {
		error := right.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if left == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || right == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if left.Kind == checkruntime.TextValueValue {
		a := langruntime.CheckedString(left.Value)
		if right.Kind == checkruntime.TextValueValue {
			b := langruntime.CheckedString(right.Value)
			first := textBinaryHex(a, trimSpaces)
			second := textBinaryHex(b, trimSpaces)
			return byteaCompare(checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: first}, checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: second})
		}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func textMeasureValue(value checkruntime.TextValue, trimSpaces bool, mode int) checkruntime.Int4Value {
	mode = langruntime.CheckedI32(mode)
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
		characters := []rune(text)
		end := len(characters)
		if trimSpaces {
			for end > 0 && characters[langruntime.CheckedSubtract(end, 1)] == ' ' {
				end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
			}
		}
		length := int64(0)
		index := 0
		for index < end {
			width := int64(1)
			if mode != 0 {
				code := int(langruntime.CheckedChar(characters[index]))
				if code >= 128 {
					width = int64(2)
				}
				if code >= 2048 {
					width = int64(3)
				}
				if code >= 65536 {
					width = int64(4)
				}
			}
			length = langruntime.CheckedI64Add(length, width)
			index = langruntime.CheckedAdd(index, 1)
		}
		if mode == 2 {
			length = langruntime.CheckedI64Multiply(length, int64(8))
		}
		if length > int64(2147483647) {
			return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: checkruntime.MakeSqlError(textLengthRangeError)}
		}
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: int(int32(length))}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func textTrimValue(value checkruntime.TextValue, set checkruntime.TextValue, trimLeft bool, trimRight bool) checkruntime.TextValue {
	if value.Kind == checkruntime.TextValueError {
		error := value.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if set.Kind == checkruntime.TextValueError {
		error := set.Error
		return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: error}
	}
	if value == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) || set == (checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
	}
	if value == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) || set == (checkruntime.TextValue{Kind: checkruntime.TextValueNull}) {
		return checkruntime.TextValue{Kind: checkruntime.TextValueNull}
	}
	if value.Kind == checkruntime.TextValueValue {
		text := langruntime.CheckedString(value.Value)
		if set.Kind == checkruntime.TextValueValue {
			trimSet := langruntime.CheckedString(set.Value)
			characters := []rune(text)
			members := []rune(trimSet)
			start := 0
			end := len(characters)
			if trimLeft {
				for start < end {
					member := 0
					matched := false
					for member < len(members) {
						if characters[start] == members[member] {
							matched = true
						}
						member = langruntime.CheckedAdd(member, 1)
					}
					if matched == false {
						break
					}
					start = langruntime.CheckedAdd(start, 1)
				}
			}
			if trimRight {
				for start < end {
					member := 0
					matched := false
					for member < len(members) {
						if characters[langruntime.CheckedSubtract(end, 1)] == members[member] {
							matched = true
						}
						member = langruntime.CheckedAdd(member, 1)
					}
					if matched == false {
						break
					}
					end = langruntime.CheckedIndex(langruntime.CheckedSubtract(end, 1))
				}
			}
			output := ""
			index := start
			for index < end {
				output = output + string(langruntime.CheckedChar(characters[index]))
				index = langruntime.CheckedAdd(index, 1)
			}
			return checkruntime.TextValue{Kind: checkruntime.TextValueValue, Value: output}
		}
	}
	return checkruntime.TextValue{Kind: checkruntime.TextValueUnknown}
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
func uuidByte(value checkruntime.Uuid, index int) int {
	index = langruntime.CheckedI32(index)
	word := checkruntime.UuidWord(value, langruntime.CheckedSignedDivide(index, 2))
	if langruntime.CheckedSignedRemainder(index, 2) == 0 {
		return langruntime.CheckedSignedDivide(word, 256)
	}
	return langruntime.CheckedSignedRemainder(word, 256)
}
func uuidHashBytes(value checkruntime.Uuid) []checkruntime.HashByte {
	bytes := []checkruntime.HashByte{}
	index := 0
	for index < 16 {
		byte := uuidByte(value, index)
		langruntime.CheckedAdd(len(bytes), 1)
		bytes = append(bytes, checkruntime.CopyHashByte(checkruntime.HashByte{Value: int64(langruntime.CheckedI32(byte))}))
		index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
	}
	return bytes
}
func UuidSend32nf(input checkruntime.UuidValue) checkruntime.ByteaValue {
	if input.Kind == checkruntime.UuidValueError {
		error := input.Error
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueError, Error: error}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) {
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueNull}
	}
	if input.Kind == checkruntime.UuidValueValue {
		value := input.Value
		output := ""
		index := 0
		for index < 16 {
			byte := uuidByte(value, index)
			output = langruntime.CheckedString(checkruntime.ByteaAppendByte(output, byte))
			index = langruntime.CheckedI32(langruntime.CheckedSignedAdd(index, 1))
		}
		return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueValue, Value: output}
	}
	return checkruntime.ByteaValue{Kind: checkruntime.ByteaValueUnknown}
}
func UuidHash8nnn(input checkruntime.UuidValue) checkruntime.Int4Value {
	if input.Kind == checkruntime.UuidValueError {
		error := input.Error
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: error}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) {
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueNull}
	}
	if input.Kind == checkruntime.UuidValueValue {
		value := input.Value
		bytes := uuidHashBytes(value)
		hash := checkruntime.HashBytes32(bytes)
		return checkruntime.Int4Value{Kind: checkruntime.Int4ValueValue, Value: hash}
	}
	return checkruntime.Int4Value{Kind: checkruntime.Int4ValueUnknown}
}
func UuidHashExtendedI59z(left checkruntime.UuidValue, right checkruntime.Int8Value) checkruntime.Int8Value {
	if left.Kind == checkruntime.UuidValueError {
		error := left.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if right.Kind == checkruntime.Int8ValueError {
		error := right.Error
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: error}
	}
	if left == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
	}
	if left == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) || right == (checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}) {
		return checkruntime.Int8Value{Kind: checkruntime.Int8ValueNull}
	}
	if left.Kind == checkruntime.UuidValueValue {
		value := left.Value
		if right.Kind == checkruntime.Int8ValueValue {
			seed := right.Value
			bytes := uuidHashBytes(value)
			hash := checkruntime.HashBytes64(bytes, seed)
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueValue, Value: hash}
		}
	}
	return checkruntime.Int8Value{Kind: checkruntime.Int8ValueUnknown}
}
func UuidExtractVersionYdwe(input checkruntime.UuidValue) checkruntime.Int2Value {
	if input.Kind == checkruntime.UuidValueError {
		error := input.Error
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: error}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) {
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
	}
	if input.Kind == checkruntime.UuidValueValue {
		value := input.Value
		if langruntime.CheckedSignedDivide(value.Word4, 16384) != 2 {
			return checkruntime.Int2Value{Kind: checkruntime.Int2ValueNull}
		}
		return checkruntime.Int2Value{Kind: checkruntime.Int2ValueValue, Value: langruntime.CheckedSignedDivide(value.Word3, 4096)}
	}
	return checkruntime.Int2Value{Kind: checkruntime.Int2ValueUnknown}
}
func UuidExtractTimestampP52j(input checkruntime.UuidValue) checkruntime.TimestamptzValue {
	if input.Kind == checkruntime.UuidValueError {
		error := input.Error
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueError, Error: error}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueUnknown}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
	}
	if input == (checkruntime.UuidValue{Kind: checkruntime.UuidValueNull}) {
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}
	}
	if input.Kind == checkruntime.UuidValueValue {
		value := input.Value
		if langruntime.CheckedSignedDivide(value.Word4, 16384) != 2 {
			return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}
		}
		version := langruntime.CheckedSignedDivide(value.Word3, 4096)
		word0 := int64(langruntime.CheckedI32(value.Word0))
		word1 := int64(langruntime.CheckedI32(value.Word1))
		word2 := int64(langruntime.CheckedI32(value.Word2))
		if version == 1 {
			high := langruntime.CheckedSignedRemainder(value.Word3, 4096)
			word3 := int64(langruntime.CheckedI32(high))
			ticks := langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(word3, int64(281474976710656)), langruntime.CheckedI64Multiply(word2, int64(4294967296))), langruntime.CheckedI64Multiply(word0, int64(65536))), word1)
			microseconds := langruntime.CheckedI64Subtract(langruntime.CheckedI64Divide(ticks, int64(10)), int64(13165977600000000))
			return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: microseconds}
		}
		if version == 7 {
			milliseconds := langruntime.CheckedI64Add(langruntime.CheckedI64Add(langruntime.CheckedI64Multiply(word0, int64(4294967296)), langruntime.CheckedI64Multiply(word1, int64(65536))), word2)
			microseconds := langruntime.CheckedI64Subtract(langruntime.CheckedI64Multiply(milliseconds, int64(1000)), int64(946684800000000))
			return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueValue, Value: microseconds}
		}
		return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueNull}
	}
	return checkruntime.TimestamptzValue{Kind: checkruntime.TimestamptzValueUnknown}
}
