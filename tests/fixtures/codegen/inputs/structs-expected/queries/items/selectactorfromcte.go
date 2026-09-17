package items

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SelectActorFromCteSQL = "WITH source AS (SELECT payload FROM items WHERE id = $1),\nprojected AS (SELECT payload -> 'actor' AS actor FROM source)\nSELECT actor FROM projected;"

type SelectActorFromCteParams struct {
	Id pgsid.Null[int32] `db:"id"`
}
type SelectActorFromCteRow struct {
	Actor pgsid.Null[int64] `db:"actor"`
}

func (q *Queries) SelectActorFromCte(ctx context.Context, params SelectActorFromCteParams) (SelectActorFromCteRow, error) {
	var row SelectActorFromCteRow
	err := q.db.QueryRow(ctx, SelectActorFromCteSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Actor, "pgsid:///jsonschemas/Event.json#/properties/actor", "SelectActorFromCte", "actor", true)))
	return row, err
}
