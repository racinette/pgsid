package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertArraySQL = "INSERT INTO items (payload, numbers) VALUES ('{\"actor\":1}', $1);"

type InsertArrayParams struct {
	Payload pgsid.Null[jsonschemas.Numbers] `db:"payload"`
}

func (q *Queries) InsertArray(ctx context.Context, params InsertArrayParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(pgsidpgx.JSONValue(params.Payload), "pgsid:///jsonschemas/Numbers.json#", "InsertArray", "payload", true)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertArraySQL, jsonInput1)
	return err
}
