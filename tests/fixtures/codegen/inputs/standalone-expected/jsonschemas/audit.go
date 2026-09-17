package jsonschemas

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type Audit struct {
	Actor int64  `json:"actor"`
	Label string `json:"label"`
	Next  *Audit `json:"next,omitempty"`
}

func ValidateAudit(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Audit.json#")
}
func ValidateAuditJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Audit.json#")
}
