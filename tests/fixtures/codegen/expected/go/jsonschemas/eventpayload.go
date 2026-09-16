package jsonschemas

type EventPayload struct {
	Actor EventPayloadActor `json:"actor"`
	Flags []string          `json:"flags"`
	Score *float64          `json:"score,omitempty"`
	Next  *EventPayload     `json:"next,omitempty"`
}
type EventPayloadActor struct {
	Id          int64   `json:"id"`
	DisplayName *string `json:"displayName,omitempty"`
}
