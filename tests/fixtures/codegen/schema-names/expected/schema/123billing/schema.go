package schema_123billing

type EventId int64
type Events struct {
	Id EventId `db:"id"`
}
