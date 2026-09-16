package events

import (
	"context"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const GetEventStatesSQL = "SELECT states FROM public.events WHERE id = $1;"

type GetEventStatesParams struct {
	Id *int64 `db:"id"`
}
type GetEventStatesRow struct {
	States []public.EventState `db:"states"`
}

func (q *Queries) GetEventStates(ctx context.Context, params GetEventStatesParams) (GetEventStatesRow, error) {
	var row GetEventStatesRow
	err := q.db.QueryRow(ctx, GetEventStatesSQL, params.Id).Scan(&row.States)
	return row, err
}
