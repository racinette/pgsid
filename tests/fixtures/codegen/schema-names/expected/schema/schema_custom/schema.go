package schema_custom

type EventId int64
type Events struct {
	Id EventId `db:"id"`
}
