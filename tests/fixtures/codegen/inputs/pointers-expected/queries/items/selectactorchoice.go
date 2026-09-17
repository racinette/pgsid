package items

import (
	"context"
	"encoding/json"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SelectActorChoiceSQL = "SELECT CASE WHEN id > 0 THEN payload -> 'actor' ELSE audit -> 'actor' END AS actor\nFROM items WHERE id = $1;"

type SelectActorChoiceParams struct {
	Id *int32 `db:"id"`
}
type SelectActorChoiceRow struct {
	Actor *json.RawMessage `db:"actor"`
}

func (q *Queries) SelectActorChoice(ctx context.Context, params SelectActorChoiceParams) (SelectActorChoiceRow, error) {
	var row SelectActorChoiceRow
	err := q.db.QueryRow(ctx, SelectActorChoiceSQL, params.Id).Scan(pgsidpgx.ValidatedJSON(&row.Actor, "{\"anyOf\":[{\"$ref\":\"pgsid:///jsonschemas/Event.json#/properties/actor\"},{\"$ref\":\"pgsid:///jsonschemas/Audit.json#/properties/actor\"}]}", "SelectActorChoice", "actor", false))
	return row, err
}
