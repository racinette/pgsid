package events

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"

	admin "example.com/pgsid-fixture/generated/go/queries/admin/events"
	support "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx"
	public "example.com/pgsid-fixture/generated/go/schema/public"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresExecutor(t *testing.T) {
	dsn := os.Getenv("PGSID_GO_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("PGSID_GO_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	if err := support.RegisterTypes(ctx, conn); err != nil {
		t.Fatal(err)
	}
	_, err = conn.Exec(ctx, `TRUNCATE public.events, billing.events CASCADE;
 INSERT INTO public.events(id,payload,state,states,metadata) VALUES (7,'{"actor":{"id":42},"flags":["active"],"score":1.5}','ready',ARRAY['ready','done']::public.event_state[],ROW('api',5)::public.event_metadata);
 INSERT INTO billing.events(id,source_id,state,metadata) VALUES (9,7,'pending',ROW(7)::billing.event_metadata);`)
	if err != nil {
		t.Fatal(err)
	}
	queries, id := New(conn), int64(7)
	row, err := queries.GetEvent(ctx, GetEventParams{Id: &id})
	if err != nil || row.Payload.Actor.Id != 42 || row.Actor == nil || row.Actor.Id != 42 || row.State != public.EventStateReady || row.JoinedAccountId != nil {
		t.Fatalf("got %#v, %v", row, err)
	}
	states, err := queries.GetEventStates(ctx, GetEventStatesParams{Id: &id})
	if err != nil || len(states.States) != 2 || states.States[0] != public.EventStateReady || states.States[1] != public.EventStateDone {
		t.Fatalf("array got %#v, %v", states, err)
	}

	billingID := int64(9)
	billingRow, err := admin.New(conn).GetEvent(ctx, admin.GetEventParams{Id: &billingID})
	if err != nil || billingRow.Metadata == nil || billingRow.Metadata.Event == nil || *billingRow.Metadata.Event != 7 {
		t.Fatalf("composite got %#v, %v", billingRow, err)
	}
	missing := int64(999)
	if _, err := queries.GetEvent(ctx, GetEventParams{Id: &missing}); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("got %v", err)
	}
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	config.AfterConnect = support.RegisterTypes
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := New(pool).GetEvent(ctx, GetEventParams{Id: &id}); err != nil {
		t.Fatal(err)
	}
	tx, err := conn.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	note := "transaction"
	if err := New(tx).RenameEvent(ctx, RenameEventParams{Id: &id, Note: &note}); err != nil {
		t.Fatal(err)
	}
	rows, err := New(tx).ListEvents(ctx)
	if err != nil || len(rows) != 1 || rows[0].Note == nil || *rows[0].Note != note {
		t.Fatalf("got %#v, %v", rows, err)
	}
	if err := tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	rows, err = queries.ListEvents(ctx)
	if err != nil || len(rows) != 1 || rows[0].Note != nil {
		t.Fatalf("rollback got %#v, %v", rows, err)
	}
	params := UpdateEventParams{Id: &id, Note: &note}
	if err := json.Unmarshal([]byte(`{"actor":{"id":43},"flags":[],"score":2.5}`), &params.Payload); err != nil {
		t.Fatal(err)
	}
	updated, err := queries.UpdateEvent(ctx, params)
	if err != nil || updated.Payload.Actor.Id != 43 || updated.Score == nil || *updated.Score != "2.5" {
		t.Fatalf("got %#v, %v", updated, err)
	}
	state := public.EventStateReady
	affected, err := queries.DeleteFinishedEvents(ctx, DeleteFinishedEventsParams{State: &state})
	if err != nil || affected != 1 {
		t.Fatalf("got %d, %v", affected, err)
	}
	rows, err = queries.ListEvents(ctx)
	if err != nil || rows == nil || len(rows) != 0 {
		t.Fatalf("got %#v, %v", rows, err)
	}
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	if _, err := queries.ListEvents(canceled); !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled got %v", err)
	}
}
