package pgsidpgx

import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func RegisterTypes(ctx context.Context, conn *pgx.Conn) error {
	var names []string
	err := conn.QueryRow(ctx, "WITH requested AS (\n  SELECT to_regtype(name)::oid AS oid FROM unnest($1::text[]) AS name\n)\nSELECT ARRAY(\n  SELECT n.nspname || '.' || t.typname\n  FROM pg_catalog.pg_type AS t\n  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace\n  WHERE t.oid IN (SELECT oid FROM requested)\n     OR t.oid IN (\n       SELECT base.typarray FROM pg_catalog.pg_type AS base\n       JOIN requested ON requested.oid = base.oid\n     )\n  ORDER BY n.nspname, t.typname\n)", []string{"\"!!!\".\"event_id\"", "\"123billing\".\"event_id\"", "\"Billing\".\"event_id\"", "\"__proto__\".\"event_id\"", "\"_hidden\".\"event_id\"", "\"a/b\".\"event_id\"", "\"billing\".\"event_id\"", "\"billing-extra\".\"event_id\"", "\"billing.extra\".\"event_id\"", "\"billing_extra\".\"event_id\"", "\"café\".\"event_id\"", "\"café\".\"event_id\"", "\"con\".\"event_id\"", "\"public\".\"event_id\"", "\"schema_123billing\".\"event_id\"", "\"schema_custom\".\"event_id\"", "\"schema_e695b0e68dae\".\"event_id\"", "\"trailing.\".\"event_id\"", "\"type\".\"event_id\"", "\"with space\".\"event_id\"", "\"提供\".\"event_id\"", "\"数据\".\"event_id\"", "\"数据\".\"link\""}).Scan(&names)
	if err != nil {
		return err
	}
	types, err := conn.LoadTypes(ctx, names)
	if err != nil {
		return err
	}
	conn.TypeMap().RegisterTypes(types)
	return nil
}

type DBTX interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
