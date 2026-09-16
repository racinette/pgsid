package jsonschemas

type MaybeDocument *MaybeDocumentValue
type MaybeDocumentValue struct {
	Value *int64 `json:"value,omitempty"`
}
