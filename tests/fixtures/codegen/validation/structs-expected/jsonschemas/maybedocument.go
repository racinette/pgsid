package jsonschemas

import (
	pgsid "example.com/pgsid-validation/generated/pgsid"
	validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"
	json "encoding/json"
)

type MaybeDocument pgsid.Null[MaybeDocumentValue]

func (value MaybeDocument) MarshalJSON() ([]byte, error) {
	return pgsid.Null[MaybeDocumentValue](value).MarshalJSON()
}
func (value *MaybeDocument) UnmarshalJSON(data []byte) error {
	return (*pgsid.Null[MaybeDocumentValue])(value).UnmarshalJSON(data)
}

type MaybeDocumentValue struct {
	Value pgsid.Undefined[int64] `json:"value,omitzero"`
}

func (value *MaybeDocumentValue) UnmarshalJSON(data []byte) error {
	type decoded MaybeDocumentValue
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = MaybeDocumentValue(next)
	return nil
}
func ValidateMaybeDocument(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/MaybeDocument.json#")
}
func ValidateMaybeDocumentJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/MaybeDocument.json#")
}
