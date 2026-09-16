package events

import (
	"context"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const DeleteFinishedEventsSQL = "DELETE FROM public.events\nWHERE state = $1;"

type DeleteFinishedEventsParams struct {
	State *public.EventState `db:"state"`
}

func (q *Queries) DeleteFinishedEvents(ctx context.Context, params DeleteFinishedEventsParams) (int64, error) {
	tag, err := q.db.Exec(ctx, DeleteFinishedEventsSQL, params.State)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
