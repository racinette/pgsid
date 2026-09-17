package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	public "example.com/pgsid-nulls/generated/schema/public"
)

const SetItemSQL = "UPDATE public.items SET user_id = $1, state = $2, payload = $3, numbers = $4, metadata = $5 WHERE id = $6;"

type SetItemParams struct {
	UserId   *public.UserId        `db:"user_id"`
	State    *public.State         `db:"state"`
	Payload  *jsonschemas.Document `db:"payload"`
	Numbers  []int64               `db:"numbers"`
	Metadata *public.Profile       `db:"metadata"`
	Id       *int64                `db:"id"`
}

func (q *Queries) SetItem(ctx context.Context, params SetItemParams) error {
	_, err := q.db.Exec(ctx, SetItemSQL, params.UserId, params.State, params.Payload, params.Numbers, params.Metadata, params.Id)
	return err
}
