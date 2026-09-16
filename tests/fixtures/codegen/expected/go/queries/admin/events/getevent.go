package events

import (
	"context"
	billing "example.com/pgsid-fixture/generated/go/schema/billing"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const GetEventSQL = "SELECT id, source_id, state, metadata FROM billing.events WHERE id = $1;"

type GetEventParams struct {
	Id *int64 `db:"id"`
}
type GetEventRow struct {
	Id       billing.EventId        `db:"id"`
	SourceId public.EventId         `db:"source_id"`
	State    billing.EventState     `db:"state"`
	Metadata *billing.EventMetadata `db:"metadata"`
}

func (q *Queries) GetEvent(ctx context.Context, params GetEventParams) (GetEventRow, error) {
	var row GetEventRow
	err := q.db.QueryRow(ctx, GetEventSQL, params.Id).Scan(&row.Id, &row.SourceId, &row.State, &row.Metadata)
	return row, err
}
