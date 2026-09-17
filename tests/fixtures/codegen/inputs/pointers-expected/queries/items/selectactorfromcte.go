package items

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SelectActorFromCteSQL = "WITH source AS (SELECT payload FROM items WHERE id = $1),\nprojected AS (SELECT payload -> 'actor' AS actor FROM source)\nSELECT actor FROM projected;"

type SelectActorFromCteParams struct {
	Id *int32 `db:"id"`
}
type SelectActorFromCteRow struct {
	Actor *int64 `db:"actor"`
}

func (q *Queries) SelectActorFromCte(ctx context.Context, params SelectActorFromCteParams) (SelectActorFromCteRow, error) {
	var row SelectActorFromCteRow
	err := q.db.QueryRow(ctx, SelectActorFromCteSQL, params.Id).Scan(pgsidpgx.ValidatedJSON(&row.Actor, "pgsid:///jsonschemas/Event.json#/properties/actor", "SelectActorFromCte", "actor", false))
	return row, err
}
