package jsonschemas

import (
	pgsid "example.com/pgsid-validation/generated/pgsid"
	validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"
	json "encoding/json"
)

type Document struct {
	Id    int64                   `json:"id"`
	Name  string                  `json:"name"`
	Flags []string                `json:"flags"`
	Node  DocumentNode            `json:"node"`
	Mode  string                  `json:"mode"`
	Extra pgsid.Undefined[string] `json:"extra,omitzero"`
	Count pgsid.Undefined[int64]  `json:"count,omitzero"`
}

func (value *Document) UnmarshalJSON(data []byte) error {
	type decoded Document
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = Document(next)
	return nil
}

type DocumentNode struct {
	Id   int64                          `json:"id"`
	Next pgsid.Undefined[*DocumentNode] `json:"next,omitzero"`
}

func (value *DocumentNode) UnmarshalJSON(data []byte) error {
	type decoded DocumentNode
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentNode(next)
	return nil
}
func ValidateDocument(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Document.json#")
}
func ValidateDocumentJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Document.json#")
}
