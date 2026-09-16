package jsonschemas

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
