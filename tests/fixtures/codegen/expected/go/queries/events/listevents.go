package events

import (
	"context"
	jsonschemas "example.com/pgsid-fixture/generated/go/jsonschemas"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const ListEventsSQL = "WITH selected AS (SELECT id, payload, note FROM public.events)\nSELECT id, payload, note FROM selected ORDER BY id;"

type ListEventsParams struct {
}
type ListEventsRow struct {
	Id      public.EventId           `db:"id"`
	Payload jsonschemas.EventPayload `db:"payload"`
	Note    *string                  `db:"note"`
}

func (q *Queries) ListEvents(ctx context.Context) ([]ListEventsRow, error) {
	rows, err := q.db.Query(ctx, ListEventsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ListEventsRow, 0)
	for rows.Next() {
		var row ListEventsRow
		if err := rows.Scan(&row.Id, &row.Payload, &row.Note); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
