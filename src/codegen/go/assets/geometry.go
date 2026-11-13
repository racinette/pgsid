package pgsid

import (
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

// The geometric types hold float8 coordinates, which every pair of floats is, so their fields are
// their values; the server rejects a shape its input refuses, such as a line with A and B zero.

type Point struct{ X, Y float64 }
type Line struct{ A, B, C float64 }
type Lseg struct{ Start, End Point }
type Box struct{ High, Low Point }
type Path struct {
	Closed bool
	Points []Point
}
type Polygon struct{ Points []Point }
type Circle struct {
	Center Point
	Radius float64
}

func (p Point) vec() pgtype.Vec2  { return pgtype.Vec2{X: p.X, Y: p.Y} }
func pointOf(v pgtype.Vec2) Point { return Point{X: v.X, Y: v.Y} }
func vecs(points []Point) []pgtype.Vec2 {
	result := make([]pgtype.Vec2, len(points))
	for index, point := range points {
		result[index] = point.vec()
	}
	return result
}
func pointsOf(vecs []pgtype.Vec2) []Point {
	result := make([]Point, len(vecs))
	for index, vec := range vecs {
		result[index] = pointOf(vec)
	}
	return result
}
func geometryNull(name string) error { return fmt.Errorf("cannot scan NULL into pgsid.%s", name) }

func (p *Point) ScanPoint(v pgtype.Point) error {
	if !v.Valid {
		return geometryNull("Point")
	}
	*p = pointOf(v.P)
	return nil
}
func (p Point) PointValue() (pgtype.Point, error) {
	return pgtype.Point{P: p.vec(), Valid: true}, nil
}
func (l *Line) ScanLine(v pgtype.Line) error {
	if !v.Valid {
		return geometryNull("Line")
	}
	*l = Line{A: v.A, B: v.B, C: v.C}
	return nil
}
func (l Line) LineValue() (pgtype.Line, error) {
	return pgtype.Line{A: l.A, B: l.B, C: l.C, Valid: true}, nil
}
func (l *Lseg) ScanLseg(v pgtype.Lseg) error {
	if !v.Valid {
		return geometryNull("Lseg")
	}
	*l = Lseg{Start: pointOf(v.P[0]), End: pointOf(v.P[1])}
	return nil
}
func (l Lseg) LsegValue() (pgtype.Lseg, error) {
	return pgtype.Lseg{P: [2]pgtype.Vec2{l.Start.vec(), l.End.vec()}, Valid: true}, nil
}
func (b *Box) ScanBox(v pgtype.Box) error {
	if !v.Valid {
		return geometryNull("Box")
	}
	*b = Box{High: pointOf(v.P[0]), Low: pointOf(v.P[1])}
	return nil
}
func (b Box) BoxValue() (pgtype.Box, error) {
	return pgtype.Box{P: [2]pgtype.Vec2{b.High.vec(), b.Low.vec()}, Valid: true}, nil
}
func (p *Path) ScanPath(v pgtype.Path) error {
	if !v.Valid {
		return geometryNull("Path")
	}
	*p = Path{Closed: v.Closed, Points: pointsOf(v.P)}
	return nil
}
func (p Path) PathValue() (pgtype.Path, error) {
	return pgtype.Path{P: vecs(p.Points), Closed: p.Closed, Valid: true}, nil
}
func (p *Polygon) ScanPolygon(v pgtype.Polygon) error {
	if !v.Valid {
		return geometryNull("Polygon")
	}
	*p = Polygon{Points: pointsOf(v.P)}
	return nil
}
func (p Polygon) PolygonValue() (pgtype.Polygon, error) {
	return pgtype.Polygon{P: vecs(p.Points), Valid: true}, nil
}
func (c *Circle) ScanCircle(v pgtype.Circle) error {
	if !v.Valid {
		return geometryNull("Circle")
	}
	*c = Circle{Center: pointOf(v.P), Radius: v.R}
	return nil
}
func (c Circle) CircleValue() (pgtype.Circle, error) {
	return pgtype.Circle{P: c.Center.vec(), R: c.Radius, Valid: true}, nil
}

// The simple protocol has no parameter type to plan by, so pgx sends these values as their text.
func (p Point) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.PointCodec{}, pgtype.PointOID, p)
}
func (l Line) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.LineCodec{}, pgtype.LineOID, l)
}
func (l Lseg) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.LsegCodec{}, pgtype.LsegOID, l)
}
func (b Box) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.BoxCodec{}, pgtype.BoxOID, b)
}
func (p Path) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.PathCodec{}, pgtype.PathOID, p)
}
func (p Polygon) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.PolygonCodec{}, pgtype.PolygonOID, p)
}
func (c Circle) TextValue() (pgtype.Text, error) {
	return geometryText(&pgtype.CircleCodec{}, pgtype.CircleOID, c)
}
func geometryText(codec pgtype.Codec, oid uint32, value any) (pgtype.Text, error) {
	text, err := codec.PlanEncode(nil, oid, pgtype.TextFormatCode, value).Encode(value, nil)
	if err != nil {
		return pgtype.Text{}, err
	}
	return pgtype.Text{String: string(text), Valid: true}, nil
}
