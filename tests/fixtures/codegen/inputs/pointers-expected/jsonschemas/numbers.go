package jsonschemas

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type Numbers []int64

func ValidateNumbers(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Numbers.json#")
}
func ValidateNumbersJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Numbers.json#")
}
