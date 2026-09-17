package items

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SelectActorSQL = "SELECT payload -> 'actor' AS actor FROM items WHERE id = $1;"

type SelectActorParams struct {
	Id pgsid.Null[int32] `db:"id"`
}
type SelectActorRow struct {
	Actor pgsid.Null[int64] `db:"actor"`
}

func (q *Queries) SelectActor(ctx context.Context, params SelectActorParams) (SelectActorRow, error) {
	var row SelectActorRow
	err := q.db.QueryRow(ctx, SelectActorSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Actor, "pgsid:///jsonschemas/Event.json#/properties/actor", "SelectActor", "actor", true)))
	return row, err
}
