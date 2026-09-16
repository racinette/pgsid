package billing_extra

type EventId int64
type Events struct {
	Id EventId `db:"id"`
}
