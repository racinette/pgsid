package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertUncheckedSQL = "INSERT INTO items (payload, unchecked) VALUES ('{\"actor\":1}', $1);"

type InsertUncheckedParams struct {
	Payload pgsid.Null[jsonschemas.Event] `db:"payload"`
}

func (q *Queries) InsertUnchecked(ctx context.Context, params InsertUncheckedParams) error {
	_, err := q.db.Exec(ctx, InsertUncheckedSQL, pgsidpgx.JSONValue(params.Payload))
	return err
}
