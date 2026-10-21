import { expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const source = `
#[derive(Clone)]
pub struct ProfileNode {pub identity:String,pub labels:Vec<char>,pub children:Vec<ProfileNode>}
#[derive(Clone)]
pub struct ProfileContext {pub nodes:Vec<ProfileNode>}
#[derive(Clone)]
pub struct ProfilePayload {pub context:ProfileContext}
#[derive(Clone)]
pub enum ProfileValue {Unknown,Value(ProfilePayload)}
pub fn profile_copy(input:ProfileValue)->ProfileValue {input.clone()}
fn profile_edit(input:ProfileContext)->ProfileContext {
 let mut nodes=input.nodes;
 let node=nodes[0].clone();
 let mut labels=node.labels;
 labels.push('😊');
 let mut children=node.children;
 let empty_labels:Vec<char>=Vec::new();
 let empty_children:Vec<ProfileNode>=Vec::new();
 children.push(ProfileNode {identity:"child".to_owned(),labels:empty_labels,children:empty_children});
 nodes[0]=ProfileNode {identity:node.identity,labels,children};
 let saved=nodes[0].clone();
 nodes.push(saved);
 ProfileContext {nodes}
}
pub fn evaluate_check_profile()->bool {
 let labels="zé".chars().collect();
 let mut nodes:Vec<ProfileNode>=Vec::new();
 let children:Vec<ProfileNode>=Vec::new();
 nodes.push(ProfileNode {identity:"stage".to_owned(),labels,children});
 let original=ProfileContext {nodes};
 let saved=original.clone();
 let edited=profile_edit(original.clone());
 if original.nodes.len()!=1 || saved.nodes[0].labels.len()!=2 || original.nodes[0].children.len()!=0 {return false;};
 if edited.nodes.len()!=2 || edited.nodes[0].children.len()!=1 || edited.nodes[1].labels.len()!=3 {return false;};
 let next=profile_edit(edited.clone());
 edited.nodes[0].labels.len()==3 && edited.nodes[0].children.len()==1 && next.nodes[0].children.len()==2 && next.nodes[0].labels.len()==4
}
`

type OwnedProfileNode = { identity: string; labels: string[]; children: OwnedProfileNode[] }

it('copies nested record-vector profiles across public inputs, transfers and explicit clones', async () => {
  const generated = transpileCheckRust(source)
  const context = createContext({ exports: {} })
  runInContext(
    ts.transpileModule(generated.typescript, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  )
  const runtime = context.exports as {
    evaluateCheckProfile(): boolean
    profileCopy(input: unknown): {
      value: { context: { nodes: OwnedProfileNode[] } }
    }
  }
  expect(runtime.evaluateCheckProfile()).toBe(true)
  const input = {
    kind: 'Value',
    value: {
      context: {
        nodes: [
          {
            identity: 'stage',
            labels: ['z', 'é'],
            children: [{ identity: 'child', labels: ['a'], children: [] }],
          },
        ],
      },
    },
  }
  const copied = runtime.profileCopy(input)
  input.value.context.nodes[0]!.labels.push('changed')
  input.value.context.nodes[0]!.identity = 'changed'
  input.value.context.nodes[0]!.children[0]!.identity = 'changed'
  input.value.context.nodes[0]!.children[0]!.labels[0] = 'x'
  expect(copied.value.context.nodes[0]!.identity).toBe('stage')
  expect([...copied.value.context.nodes[0]!.labels]).toEqual(['z', 'é'])
  expect(copied.value.context.nodes[0]!.children[0]!.identity).toBe('child')
  expect([...copied.value.context.nodes[0]!.children[0]!.labels]).toEqual(['a'])
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-owned-record-profiles-'))
  const run = promisify(execFile)
  try {
    await writeFile(join(directory, 'runtime.go'), generated.go)
    await writeFile(join(directory, 'go.mod'), 'module ownedprofiles\n\ngo 1.25\n')
    await writeFile(
      join(directory, 'runtime_test.go'),
      `package generated
import "testing"
func TestProfiles(t *testing.T) {
 if !EvaluateCheckProfile() { t.Fatal("nested clone") }
 input:=ProfileValue{Kind:ProfileValueValue,Value:ProfilePayload{Context:ProfileContext{Nodes:[]ProfileNode{{Identity:"stage",Labels:[]rune{'z','é'},Children:[]ProfileNode{{Identity:"child"}}}}}}}
 copied:=ProfileCopy(input)
 input.Value.Context.Nodes[0].Labels[0]='x'
 input.Value.Context.Nodes[0].Identity="changed"
 input.Value.Context.Nodes[0].Children[0].Identity="changed"
 if copied.Value.Context.Nodes[0].Identity!="stage" || copied.Value.Context.Nodes[0].Labels[0]!='z' || copied.Value.Context.Nodes[0].Children[0].Identity!="child" { t.Fatal("public input alias") }
}`,
    )
    await writeFile(
      join(directory, 'profiles.rs'),
      source + '\n#[test] fn profiles(){assert!(evaluate_check_profile());}\n',
    )
    await run('rustc', [
      '--test',
      join(directory, 'profiles.rs'),
      '-o',
      join(directory, 'profiles'),
    ])
    await run(join(directory, 'profiles'), [])
    await run('go', ['test', './...'], { cwd: directory })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 60_000)
