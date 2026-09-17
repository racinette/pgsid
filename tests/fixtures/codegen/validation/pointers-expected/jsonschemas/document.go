package jsonschemas

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type Document struct {
	Id    int64        `json:"id"`
	Name  string       `json:"name"`
	Flags []string     `json:"flags"`
	Node  DocumentNode `json:"node"`
	Mode  string       `json:"mode"`
	Extra *string      `json:"extra,omitempty"`
	Count *int64       `json:"count,omitempty"`
}
type DocumentNode struct {
	Id   int64         `json:"id"`
	Next *DocumentNode `json:"next,omitempty"`
}

func ValidateDocument(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Document.json#")
}
func ValidateDocumentJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Document.json#")
}
