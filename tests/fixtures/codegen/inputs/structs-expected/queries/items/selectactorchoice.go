package items

import (
	"context"
	"encoding/json"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SelectActorChoiceSQL = "SELECT CASE WHEN id > 0 THEN payload -> 'actor' ELSE audit -> 'actor' END AS actor\nFROM items WHERE id = $1;"

type SelectActorChoiceParams struct {
	Id pgsid.Null[int32] `db:"id"`
}
type SelectActorChoiceRow struct {
	Actor pgsid.Null[json.RawMessage] `db:"actor"`
}

func (q *Queries) SelectActorChoice(ctx context.Context, params SelectActorChoiceParams) (SelectActorChoiceRow, error) {
	var row SelectActorChoiceRow
	err := q.db.QueryRow(ctx, SelectActorChoiceSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Actor, "{\"anyOf\":[{\"$ref\":\"pgsid:///jsonschemas/Event.json#/properties/actor\"},{\"$ref\":\"pgsid:///jsonschemas/Audit.json#/properties/actor\"}]}", "SelectActorChoice", "actor", true)))
	return row, err
}
