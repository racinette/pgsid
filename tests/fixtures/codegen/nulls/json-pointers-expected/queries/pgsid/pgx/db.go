package pgsidpgx

import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"reflect"
)

type nullableTarget interface {
	SQLTarget() any
	SetSQLValid(bool)
}
type nullableValue interface {
	SQLValue() any
	SQLValid() bool
	SQLUnderlying() any
}
type nullTarget struct{ value nullableTarget }
type scanTargets struct{ targets []any }

func Nullable(target nullableTarget) any {
	return nullTarget{value: target}
}
func ScanTargets(targets ...any) pgx.RowScanner {
	return scanTargets{targets: targets}
}
func (s scanTargets) ScanRow(rows pgx.Rows) error {
	if conn := rows.Conn(); conn != nil {
		RegisterNulls(conn.TypeMap())
	}
	destinations := make([]any, len(s.targets))
	pointers := make([]reflect.Value, len(s.targets))
	fields := rows.FieldDescriptions()
	isJSON := func(i int) bool {
		oid := fields[i].DataTypeOID
		if oid == pgtype.JSONOID || oid == pgtype.JSONBOID {
			return true
		}
		if conn := rows.Conn(); conn != nil {
			if typ, ok := conn.TypeMap().TypeForOID(oid); ok {
				_, json := typ.Codec.(*nullableJSONCodec)
				return json
			}
		}
		return false
	}
	for i, target := range s.targets {
		if _, ok := target.(interface{ Scan(any) error }); ok {
			destinations[i] = target
			continue
		}
		if nullable, ok := target.(nullTarget); ok {
			if isJSON(i) {
				destinations[i] = jsonScanTarget{nullable: nullable.value}
				continue
			}
			pointer := reflect.New(reflect.TypeOf(nullable.value.SQLTarget()))
			pointers[i] = pointer
			destinations[i] = pointer.Interface()
		} else {
			if isJSON(i) {
				destinations[i] = jsonScanTarget{target: target}
			} else {
				destinations[i] = target
			}
		}
	}
	if err := rows.Scan(destinations...); err != nil {
		return err
	}
	for i, target := range s.targets {
		if nullable, ok := target.(nullTarget); ok {
			if !pointers[i].IsValid() {
				continue
			}
			pointer := pointers[i].Elem()
			if pointer.IsNil() {
				nullable.value.SetSQLValid(false)
			} else {
				reflect.ValueOf(nullable.value.SQLTarget()).Elem().Set(pointer.Elem())
				nullable.value.SetSQLValid(true)
			}
		}
	}
	return nil
}
func Value(value nullableValue) any {
	if !value.SQLValid() {
		return nil
	}
	v := value.SQLValue()
	rv := reflect.ValueOf(v)
	if !rv.IsValid() || ((rv.Kind() == reflect.Ptr || rv.Kind() == reflect.Slice || rv.Kind() == reflect.Map || rv.Kind() == reflect.Interface) && rv.IsNil()) {
		return invalidNullValue{}
	}
	return v
}

type invalidNullValue struct{}

func (invalidNullValue) Value() (driver.Value, error) {
	return nil, fmt.Errorf("a valid SQL value cannot be nil")
}
func JSONValue(value nullableValue) any {
	return jsonValue{value: value}
}

type jsonValue struct{ value nullableValue }

func (v jsonValue) Value() (driver.Value, error) {
	if !v.value.SQLValid() {
		return nil, nil
	}
	return json.Marshal(v.value.SQLValue())
}
func Prepare(db DBTX) {
	if conn, ok := db.(interface{ TypeMap() *pgtype.Map }); ok {
		RegisterNulls(conn.TypeMap())
		return
	}
	if tx, ok := db.(interface{ Conn() *pgx.Conn }); ok {
		RegisterNulls(tx.Conn().TypeMap())
	}
}
func RegisterNulls(m *pgtype.Map) {
	typ, _ := m.TypeForOID(pgtype.JSONOID)
	if _, ok := typ.Codec.(*nullableJSONCodec); ok {
		return
	}
	m.TryWrapScanPlanFuncs = append([]pgtype.TryWrapScanPlanFunc{tryNullScan}, m.TryWrapScanPlanFuncs...)
	m.TryWrapEncodePlanFuncs = append([]pgtype.TryWrapEncodePlanFunc{tryNullEncode}, m.TryWrapEncodePlanFuncs...)
	for _, oid := range []uint32{pgtype.JSONOID, pgtype.JSONBOID} {
		typ, _ := m.TypeForOID(oid)
		m.RegisterType(&pgtype.Type{OID: typ.OID, Name: typ.Name, Codec: &nullableJSONCodec{Codec: typ.Codec}})
	}
}

type nullScanPlan struct{ next pgtype.ScanPlan }

func (p *nullScanPlan) SetNext(next pgtype.ScanPlan) {
	p.next = next
}
func (p *nullScanPlan) Scan(src []byte, target any) error {
	n := target.(nullableTarget)
	if src == nil {
		n.SetSQLValid(false)
		return nil
	}
	if err := p.next.Scan(src, n.SQLTarget()); err != nil {
		return err
	}
	n.SetSQLValid(true)
	return nil
}
func tryNullScan(target any) (pgtype.WrappedScanPlanNextSetter, any, bool) {
	n, ok := target.(nullableTarget)
	if !ok {
		return nil, nil, false
	}
	return &nullScanPlan{}, n.SQLTarget(), true
}

type nullEncodePlan struct{ next pgtype.EncodePlan }

func (p *nullEncodePlan) SetNext(next pgtype.EncodePlan) {
	p.next = next
}
func (p *nullEncodePlan) Encode(value any, buf []byte) ([]byte, error) {
	n := value.(nullableValue)
	if !n.SQLValid() {
		return nil, nil
	}
	if _, invalid := Value(n).(invalidNullValue); invalid {
		return nil, fmt.Errorf("a valid SQL value cannot be nil")
	}
	return p.next.Encode(n.SQLUnderlying(), buf)
}
func tryNullEncode(value any) (pgtype.WrappedEncodePlanNextSetter, any, bool) {
	n, ok := value.(nullableValue)
	if !ok {
		return nil, nil, false
	}
	return &nullEncodePlan{}, n.SQLUnderlying(), true
}

type nullableJSONCodec struct{ pgtype.Codec }

func (c *nullableJSONCodec) PlanScan(m *pgtype.Map, oid uint32, format int16, target any) pgtype.ScanPlan {
	if _, ok := target.(nullableTarget); ok {
		return &jsonNullScanPlan{codec: c.Codec, m: m, oid: oid, format: format}
	}
	return c.Codec.PlanScan(m, oid, format, target)
}
func (c *nullableJSONCodec) PlanEncode(m *pgtype.Map, oid uint32, format int16, value any) pgtype.EncodePlan {
	if _, ok := value.(nullableValue); ok {
		return &jsonEncodePlan{codec: c.Codec, m: m, oid: oid, format: format}
	}
	return c.Codec.PlanEncode(m, oid, format, value)
}

type jsonEncodePlan struct {
	codec  pgtype.Codec
	m      *pgtype.Map
	oid    uint32
	format int16
}

func (p *jsonEncodePlan) Encode(value any, buf []byte) ([]byte, error) {
	n := value.(nullableValue)
	if !n.SQLValid() {
		return nil, nil
	}
	raw, err := json.Marshal(n.SQLUnderlying())
	if err != nil {
		return nil, err
	}
	v := json.RawMessage(raw)
	return p.codec.PlanEncode(p.m, p.oid, p.format, v).Encode(v, buf)
}

type jsonScanTarget struct {
	target   any
	nullable nullableTarget
}

func (s jsonScanTarget) Scan(value any) error {
	if value == nil {
		if s.nullable == nil {
			return fmt.Errorf("cannot scan SQL NULL into a nonnullable JSON field")
		}
		s.nullable.SetSQLValid(false)
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("cannot decode JSON from %T", value)
	}
	target := s.target
	if s.nullable != nil {
		target = s.nullable.SQLTarget()
	}
	next := reflect.New(reflect.TypeOf(target).Elem())
	if err := json.Unmarshal(data, next.Interface()); err != nil {
		return err
	}
	reflect.ValueOf(target).Elem().Set(next.Elem())
	if s.nullable != nil {
		s.nullable.SetSQLValid(true)
	}
	return nil
}

type jsonNullScanPlan struct {
	codec  pgtype.Codec
	m      *pgtype.Map
	oid    uint32
	format int16
}

func (p *jsonNullScanPlan) Scan(src []byte, target any) error {
	if src == nil {
		return jsonScanTarget{nullable: target.(nullableTarget)}.Scan(nil)
	}
	value, err := p.codec.DecodeDatabaseSQLValue(p.m, p.oid, p.format, src)
	if err != nil {
		return err
	}
	return jsonScanTarget{nullable: target.(nullableTarget)}.Scan(value)
}
func RegisterTypes(ctx context.Context, conn *pgx.Conn) error {
	RegisterNulls(conn.TypeMap())
	var names []string
	err := conn.QueryRow(ctx, "WITH requested AS (\n  SELECT to_regtype(name)::oid AS oid FROM unnest($1::text[]) AS name\n)\nSELECT ARRAY(\n  SELECT n.nspname || '.' || t.typname\n  FROM pg_catalog.pg_type AS t\n  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace\n  WHERE t.oid IN (SELECT oid FROM requested)\n     OR t.oid IN (\n       SELECT base.typarray FROM pg_catalog.pg_type AS base\n       JOIN requested ON requested.oid = base.oid\n     )\n  ORDER BY n.nspname, t.typname\n)", []string{"\"public\".\"profile\"", "\"public\".\"state\"", "\"public\".\"user_id\""}).Scan(&names)
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
