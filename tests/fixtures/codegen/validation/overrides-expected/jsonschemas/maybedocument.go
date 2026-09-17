package jsonschemas

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type MaybeDocument *MaybeDocumentValue
type MaybeDocumentValue struct {
	Value *int64 `json:"value,omitempty"`
}

func ValidateMaybeDocument(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/MaybeDocument.json#")
}
func ValidateMaybeDocumentJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/MaybeDocument.json#")
}
