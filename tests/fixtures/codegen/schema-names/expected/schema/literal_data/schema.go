package literal_data

type EventId int64
type Events struct {
	Id EventId `db:"id"`
}
