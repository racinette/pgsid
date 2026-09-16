package events

import (
	"context"
	billing "example.com/pgsid-fixture/generated/go/schema/billing"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const GetBillingEventSQL = "SELECT id, source_id, state FROM billing.events WHERE id = $1;"

type GetBillingEventParams struct {
	Id *int64 `db:"id"`
}
type GetBillingEventRow struct {
	Id       billing.EventId    `db:"id"`
	SourceId public.EventId     `db:"source_id"`
	State    billing.EventState `db:"state"`
}

func (q *Queries) GetBillingEvent(ctx context.Context, params GetBillingEventParams) (GetBillingEventRow, error) {
	var row GetBillingEventRow
	err := q.db.QueryRow(ctx, GetBillingEventSQL, params.Id).Scan(&row.Id, &row.SourceId, &row.State)
	return row, err
}
