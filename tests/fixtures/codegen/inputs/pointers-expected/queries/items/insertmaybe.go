package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertMaybeSQL = "INSERT INTO items (payload, maybe) VALUES ('{\"actor\":1}', $1);"

type InsertMaybeParams struct {
	Payload *jsonschemas.Maybe `db:"payload"`
}

func (q *Queries) InsertMaybe(ctx context.Context, params InsertMaybeParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Maybe.json#", "InsertMaybe", "payload", true)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertMaybeSQL, jsonInput1)
	return err
}
