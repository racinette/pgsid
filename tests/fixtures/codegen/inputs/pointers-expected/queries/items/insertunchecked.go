package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
)

const InsertUncheckedSQL = "INSERT INTO items (payload, unchecked) VALUES ('{\"actor\":1}', $1);"

type InsertUncheckedParams struct {
	Payload *jsonschemas.Event `db:"payload"`
}

func (q *Queries) InsertUnchecked(ctx context.Context, params InsertUncheckedParams) error {
	_, err := q.db.Exec(ctx, InsertUncheckedSQL, params.Payload)
	return err
}
