package events

import "context"

const RenameEventSQL = "UPDATE public.events SET note = $1 WHERE id = $2;"

type RenameEventParams struct {
	Note *string `db:"note"`
	Id   *int64  `db:"id"`
}

func (q *Queries) RenameEvent(ctx context.Context, params RenameEventParams) error {
	_, err := q.db.Exec(ctx, RenameEventSQL, params.Note, params.Id)
	return err
}
