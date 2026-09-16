package jsonschemas

type Document struct {
	RequiredValue    string                  `json:"requiredValue"`
	RequiredNullable *string                 `json:"requiredNullable"`
	OptionalValue    *string                 `json:"optionalValue,omitempty"`
	OptionalNullable *float64                `json:"optionalNullable,omitempty"`
	Nested           DocumentNested          `json:"nested"`
	Values           []*string               `json:"values"`
	Members          []*DocumentMembersItem  `json:"members,omitempty"`
	Lookup           *DocumentLookup         `json:"lookup,omitempty"`
	Node             *DocumentNode           `json:"node,omitempty"`
	OptionalArray    []int64                 `json:"optionalArray,omitempty"`
	OptionalObject   *DocumentOptionalObject `json:"optionalObject,omitempty"`
}
type DocumentNested struct {
	Enabled *bool   `json:"enabled,omitempty"`
	Note    *string `json:"note,omitempty"`
}
type DocumentMembersItem struct {
	Id      *int64                     `json:"id,omitempty"`
	Profile DocumentMembersItemProfile `json:"profile"`
}
type DocumentMembersItemProfile struct {
	Label *string `json:"label,omitempty"`
}
type DocumentLookup map[string]DocumentLookupValue
type DocumentLookupValue struct {
	Enabled *bool `json:"enabled,omitempty"`
}
type DocumentNode struct {
	Id   *int64        `json:"id,omitempty"`
	Next *DocumentNode `json:"next,omitempty"`
}
type DocumentOptionalObject map[string]string
