package items

import (
	"context"
	"encoding/json"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
	pgsidpgx "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
	public "example.com/pgsid-nulls/generated/schema/public"
)

const SetItemSQL = "UPDATE public.items SET user_id = $1, state = $2, payload = $3, numbers = $4, metadata = $5 WHERE id = $6;"

type SetItemParams struct {
	UserId   pgsid.Null[public.UserId]       `db:"user_id"`
	State    pgsid.Null[public.State]        `db:"state"`
	Payload  pgsid.Null[json.RawMessage]     `db:"payload"`
	Numbers  pgsid.Null[[]pgsid.Null[int64]] `db:"numbers"`
	Metadata pgsid.Null[public.Profile]      `db:"metadata"`
	Id       pgsid.Null[int64]               `db:"id"`
}

func (q *Queries) SetItem(ctx context.Context, params SetItemParams) error {
	_, err := q.db.Exec(ctx, SetItemSQL, pgsidpgx.Value(params.UserId), pgsidpgx.Value(params.State), pgsidpgx.JSONValue(params.Payload), pgsidpgx.Value(params.Numbers), pgsidpgx.Value(params.Metadata), pgsidpgx.Value(params.Id))
	return err
}
