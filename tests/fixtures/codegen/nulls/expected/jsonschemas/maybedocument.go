package jsonschemas

import (
	pgsid "example.com/pgsid-nulls/generated/pgsid"
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
