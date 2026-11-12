package events

import (
	"context"
	jsonschemas "example.com/pgsid-fixture/generated/go/jsonschemas"
	pgsid "example.com/pgsid-fixture/generated/go/pgsid"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const UpdateEventSQL = "UPDATE public.events\nSET payload = $1, note = $2\nWHERE id = $3\nRETURNING id, payload, payload ->> 'score' AS score, note;"

type UpdateEventParams struct {
	Payload pgsid.JSON[jsonschemas.EventPayload] `db:"payload"`
	Note    *string                              `db:"note"`
	Id      *int64                               `db:"id"`
}
type UpdateEventRow struct {
	Id      public.EventId                       `db:"id"`
	Payload pgsid.JSON[jsonschemas.EventPayload] `db:"payload"`
	Score   *string                              `db:"score"`
	Note    *string                              `db:"note"`
}

func (q *Queries) UpdateEvent(ctx context.Context, params UpdateEventParams) (UpdateEventRow, error) {
	var row UpdateEventRow
	err := q.db.QueryRow(ctx, UpdateEventSQL, params.Payload, params.Note, params.Id).Scan(&row.Id, &row.Payload, &row.Score, &row.Note)
	return row, err
}
