// Command go-prune keeps, of a set of Go packages, the top-level declarations reachable from the
// named roots, so a generated package can carry the part of the CHECK evaluator it calls.
//
// Usage: go-prune -in DIR -out DIR -module PATH ROOT...
//
// Each directory beneath -in is a package imported as PATH/<directory>. A root is
// <directory>.<Name>. A declaration is reached when a reached declaration names it; a reached type
// keeps all its methods, which interfaces may call. A constant group using iota is kept whole.
package main

import (
	"flag"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type key struct{ pkg, name string }

type unit struct {
	pkg   string
	file  *ast.File
	decl  ast.Decl
	spec  ast.Spec // for a declaration of several specs, the one this unit is
	names []string
}

func main() {
	in := flag.String("in", "", "directory of packages")
	out := flag.String("out", "", "output directory")
	module := flag.String("module", "", "import path of -in")
	flag.Parse()
	if err := run(*in, *out, *module, flag.Args()); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(in, out, module string, roots []string) error {
	fset := token.NewFileSet()
	entries, err := os.ReadDir(in)
	if err != nil {
		return err
	}
	files := map[string][]*ast.File{}
	names := map[string][]string{}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dir := filepath.Join(in, entry.Name())
		sources, err := filepath.Glob(filepath.Join(dir, "*.go"))
		if err != nil {
			return err
		}
		for _, source := range sources {
			file, err := parser.ParseFile(fset, source, nil, parser.ParseComments|parser.SkipObjectResolution)
			if err != nil {
				return err
			}
			files[entry.Name()] = append(files[entry.Name()], file)
			names[entry.Name()] = append(names[entry.Name()], filepath.Base(source))
		}
	}
	// Every top-level name, by package, and the methods of each type.
	declared := map[key][]*unit{}
	methods := map[key][]*unit{}
	var units []*unit
	for pkg, list := range files {
		for _, file := range list {
			for _, decl := range file.Decls {
				switch decl := decl.(type) {
				case *ast.FuncDecl:
					item := &unit{pkg: pkg, file: file, decl: decl}
					units = append(units, item)
					if decl.Recv != nil {
						methods[key{pkg, receiverName(decl.Recv.List[0].Type)}] = append(methods[key{pkg, receiverName(decl.Recv.List[0].Type)}], item)
						continue
					}
					item.names = []string{decl.Name.Name}
					declared[key{pkg, decl.Name.Name}] = append(declared[key{pkg, decl.Name.Name}], item)
				case *ast.GenDecl:
					if decl.Tok == token.IMPORT {
						continue
					}
					// A constant group counting with iota is one unit: its values depend on position.
					if decl.Tok == token.CONST && usesIota(decl) {
						item := &unit{pkg: pkg, file: file, decl: decl}
						for _, spec := range decl.Specs {
							for _, name := range spec.(*ast.ValueSpec).Names {
								item.names = append(item.names, name.Name)
							}
						}
						units = append(units, item)
						for _, name := range item.names {
							declared[key{pkg, name}] = append(declared[key{pkg, name}], item)
						}
						continue
					}
					for _, spec := range decl.Specs {
						item := &unit{pkg: pkg, file: file, decl: decl, spec: spec}
						switch spec := spec.(type) {
						case *ast.TypeSpec:
							item.names = []string{spec.Name.Name}
						case *ast.ValueSpec:
							for _, name := range spec.Names {
								item.names = append(item.names, name.Name)
							}
						}
						units = append(units, item)
						for _, name := range item.names {
							declared[key{pkg, name}] = append(declared[key{pkg, name}], item)
						}
					}
				}
			}
		}
	}
	kept := map[*unit]bool{}
	var queue []*unit
	mark := func(target key) {
		for _, item := range declared[target] {
			if !kept[item] {
				kept[item] = true
				queue = append(queue, item)
			}
		}
		for _, item := range methods[target] {
			if !kept[item] {
				kept[item] = true
				queue = append(queue, item)
			}
		}
	}
	for _, root := range roots {
		pkg, name, ok := strings.Cut(root, ".")
		if !ok || len(declared[key{pkg, name}]) == 0 {
			return fmt.Errorf("unknown root %s", root)
		}
		mark(key{pkg, name})
	}
	for len(queue) > 0 {
		item := queue[0]
		queue = queue[1:]
		imports := importNames(item.file, module)
		var node ast.Node = item.decl
		if item.spec != nil {
			node = item.spec
		}
		ast.Inspect(node, func(node ast.Node) bool {
			switch node := node.(type) {
			case *ast.SelectorExpr:
				if ident, ok := node.X.(*ast.Ident); ok {
					if pkg, ok := imports[ident.Name]; ok {
						mark(key{pkg, node.Sel.Name})
						return false
					}
				}
			case *ast.Ident:
				mark(key{item.pkg, node.Name})
			}
			return true
		})
	}
	for pkg, list := range files {
		for index, file := range list {
			var decls []ast.Decl
			for _, decl := range file.Decls {
				switch decl := decl.(type) {
				case *ast.FuncDecl:
					if keptDecl(units, decl, kept) {
						decls = append(decls, decl)
					}
				case *ast.GenDecl:
					if decl.Tok == token.IMPORT {
						decls = append(decls, decl)
						continue
					}
					var specs []ast.Spec
					whole := false
					for _, item := range units {
						if item.decl == decl && kept[item] {
							if item.spec == nil {
								whole = true
							} else {
								specs = append(specs, item.spec)
							}
						}
					}
					if whole {
						decls = append(decls, decl)
					} else if len(specs) > 0 {
						if len(specs) < len(decl.Specs) && decl.Lparen == token.NoPos && len(specs) > 1 {
							decl.Lparen = decl.Pos()
						}
						decl.Specs = specs
						decls = append(decls, decl)
					}
				}
			}
			file.Decls = decls
			removeUnusedImports(file)
			keepComments(file)
			var source strings.Builder
			if err := format.Node(&source, fset, file); err != nil {
				return err
			}
			if !hasDeclarations(file) {
				continue
			}
			target := filepath.Join(out, pkg, names[pkg][index])
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			if err := os.WriteFile(target, []byte(source.String()), 0o644); err != nil {
				return err
			}
		}
	}
	return nil
}

func receiverName(expr ast.Expr) string {
	switch expr := expr.(type) {
	case *ast.StarExpr:
		return receiverName(expr.X)
	case *ast.IndexExpr:
		return receiverName(expr.X)
	case *ast.IndexListExpr:
		return receiverName(expr.X)
	case *ast.Ident:
		return expr.Name
	}
	return ""
}

func usesIota(decl *ast.GenDecl) bool {
	found := false
	ast.Inspect(decl, func(node ast.Node) bool {
		if ident, ok := node.(*ast.Ident); ok && ident.Name == "iota" {
			found = true
		}
		return !found
	})
	return found
}

// The packages of -in a file imports, by the name it uses for them.
func importNames(file *ast.File, module string) map[string]string {
	names := map[string]string{}
	for _, spec := range file.Imports {
		value, _ := strconv.Unquote(spec.Path.Value)
		if !strings.HasPrefix(value, module+"/") {
			continue
		}
		pkg := strings.TrimPrefix(value, module+"/")
		name := path.Base(value)
		if spec.Name != nil {
			name = spec.Name.Name
		}
		names[name] = pkg
	}
	return names
}

func keptDecl(units []*unit, decl ast.Decl, kept map[*unit]bool) bool {
	for _, item := range units {
		if item.decl == decl && kept[item] {
			return true
		}
	}
	return false
}

func hasDeclarations(file *ast.File) bool {
	for _, decl := range file.Decls {
		if gen, ok := decl.(*ast.GenDecl); ok && gen.Tok == token.IMPORT {
			continue
		}
		return true
	}
	return false
}

func removeUnusedImports(file *ast.File) {
	used := map[string]bool{}
	ast.Inspect(file, func(node ast.Node) bool {
		if selector, ok := node.(*ast.SelectorExpr); ok {
			if ident, ok := selector.X.(*ast.Ident); ok {
				used[ident.Name] = true
			}
		}
		return true
	})
	var imports []*ast.ImportSpec
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.IMPORT {
			continue
		}
		var specs []ast.Spec
		for _, spec := range gen.Specs {
			spec := spec.(*ast.ImportSpec)
			value, _ := strconv.Unquote(spec.Path.Value)
			name := path.Base(value)
			if spec.Name != nil {
				name = spec.Name.Name
			}
			if used[name] || name == "_" {
				specs = append(specs, spec)
				imports = append(imports, spec)
			}
		}
		gen.Specs = specs
	}
	var decls []ast.Decl
	for _, decl := range file.Decls {
		if gen, ok := decl.(*ast.GenDecl); ok && gen.Tok == token.IMPORT && len(gen.Specs) == 0 {
			continue
		}
		decls = append(decls, decl)
	}
	file.Decls = decls
	file.Imports = imports
}

// The notices before the package clause stay, as do the comments within kept declarations.
func keepComments(file *ast.File) {
	var comments []*ast.CommentGroup
	for _, group := range file.Comments {
		if group.End() < file.Package {
			comments = append(comments, group)
			continue
		}
		for _, decl := range file.Decls {
			start := decl.Pos()
			if gen, ok := decl.(*ast.GenDecl); ok && gen.Doc != nil {
				start = gen.Doc.Pos()
			}
			if fn, ok := decl.(*ast.FuncDecl); ok && fn.Doc != nil {
				start = fn.Doc.Pos()
			}
			if group.Pos() >= start && group.End() <= decl.End() {
				comments = append(comments, group)
				break
			}
		}
	}
	sort.Slice(comments, func(i, j int) bool { return comments[i].Pos() < comments[j].Pos() })
	file.Comments = comments
}
