package schema_e695b0e68dae

import schema_123billing2 "example.com/pgsid-schema-names/generated/schema/123billing"

type EventId int64
type Link struct {
	Id *schema_123billing2.EventId `db:"id"`
}
type Events struct {
	Id EventId `db:"id"`
}
