package jsonschemas

import (
	pgsid "example.com/pgsid-validation/generated/pgsid"
	validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"
	json "encoding/json"
)

type Maybe pgsid.Null[MaybeValue]

func (value Maybe) MarshalJSON() ([]byte, error) {
	return pgsid.Null[MaybeValue](value).MarshalJSON()
}
func (value *Maybe) UnmarshalJSON(data []byte) error {
	return (*pgsid.Null[MaybeValue])(value).UnmarshalJSON(data)
}

type MaybeValue struct {
	Actor pgsid.Undefined[int64] `json:"actor,omitzero"`
}

func (value *MaybeValue) UnmarshalJSON(data []byte) error {
	type decoded MaybeValue
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = MaybeValue(next)
	return nil
}
func ValidateMaybe(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Maybe.json#")
}
func ValidateMaybeJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Maybe.json#")
}
