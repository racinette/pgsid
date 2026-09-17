package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertJSONNullSQL = "INSERT INTO items (payload, literal) VALUES ('{\"actor\":1}', $1);"

type InsertJSONNullParams struct {
	Payload jsonschemas.Maybe `db:"payload"`
}

func (q *Queries) InsertJSONNull(ctx context.Context, params InsertJSONNullParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Maybe.json#", "InsertJSONNull", "payload", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertJSONNullSQL, jsonInput1)
	return err
}
