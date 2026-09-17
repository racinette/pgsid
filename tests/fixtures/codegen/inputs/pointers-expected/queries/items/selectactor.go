package items

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SelectActorSQL = "SELECT payload -> 'actor' AS actor FROM items WHERE id = $1;"

type SelectActorParams struct {
	Id *int32 `db:"id"`
}
type SelectActorRow struct {
	Actor *int64 `db:"actor"`
}

func (q *Queries) SelectActor(ctx context.Context, params SelectActorParams) (SelectActorRow, error) {
	var row SelectActorRow
	err := q.db.QueryRow(ctx, SelectActorSQL, params.Id).Scan(pgsidpgx.ValidatedJSON(&row.Actor, "pgsid:///jsonschemas/Event.json#/properties/actor", "SelectActor", "actor", false))
	return row, err
}
