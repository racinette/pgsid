package jsonschemas

import (
	validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"
	json "encoding/json"
)

type Numbers []int64

func (value *Numbers) UnmarshalJSON(data []byte) error {
	type decoded Numbers
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = Numbers(next)
	return nil
}
func ValidateNumbers(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Numbers.json#")
}
func ValidateNumbersJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Numbers.json#")
}
