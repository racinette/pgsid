package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/queries/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/queries/pgsid"
	pgsidpgx "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
)

const SetItemSQL = "UPDATE public.items SET user_id = $1, state = $2, payload = $3, numbers = $4, metadata = $5 WHERE id = $6;"

type SetItemParams struct {
	UserId   pgsid.Null[any]                  `db:"user_id"`
	State    pgsid.Null[any]                  `db:"state"`
	Payload  pgsid.Null[jsonschemas.Document] `db:"payload"`
	Numbers  pgsid.Null[[]pgsid.Null[int64]]  `db:"numbers"`
	Metadata pgsid.Null[any]                  `db:"metadata"`
	Id       pgsid.Null[int64]                `db:"id"`
}

func (q *Queries) SetItem(ctx context.Context, params SetItemParams) error {
	_, err := q.db.Exec(ctx, SetItemSQL, pgsidpgx.Value(params.UserId), pgsidpgx.Value(params.State), pgsidpgx.JSONValue(params.Payload), pgsidpgx.Value(params.Numbers), pgsidpgx.Value(params.Metadata), pgsidpgx.Value(params.Id))
	return err
}
