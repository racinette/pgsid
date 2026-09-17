package items

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const MultipleSchemasSQL = "INSERT INTO items (payload, audit) VALUES ($1, $1);"

type MultipleSchemasParams struct {
	Payload any `db:"payload"`
}

func (q *Queries) MultipleSchemas(ctx context.Context, params MultipleSchemasParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "{\"allOf\":[{\"$ref\":\"pgsid:///jsonschemas/Event.json#\"},{\"$ref\":\"pgsid:///jsonschemas/Audit.json#\"}]}", "MultipleSchemas", "payload", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, MultipleSchemasSQL, jsonInput1)
	return err
}
