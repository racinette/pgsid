package events

import (
	"context"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const GetEventTypesSQL = "SELECT id, default_id, state, states, ARRAY[1, NULL]::int4[] AS numbers\nFROM public.events WHERE id = $1;"

type GetEventTypesParams struct {
	Id *int64 `db:"id"`
}
type GetEventTypesRow struct {
	Id        public.EventId         `db:"id"`
	DefaultId *public.DefaultEventId `db:"default_id"`
	State     public.EventState      `db:"state"`
	States    []public.EventState    `db:"states"`
	Numbers   []int32                `db:"numbers"`
}

func (q *Queries) GetEventTypes(ctx context.Context, params GetEventTypesParams) (GetEventTypesRow, error) {
	var row GetEventTypesRow
	err := q.db.QueryRow(ctx, GetEventTypesSQL, params.Id).Scan(&row.Id, &row.DefaultId, &row.State, &row.States, &row.Numbers)
	return row, err
}
