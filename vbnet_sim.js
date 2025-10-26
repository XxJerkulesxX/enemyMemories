/**
 * VB.NET Console App — Conceptual Simulator in JavaScript
 * --------------------------------------------------------
 * What this models (at teaching level, not byte-accurate):
 *  - Project scaffold (Program.vb + .vbproj)
 *  - vbc compile -> IL (+ type metadata)
 *  - CLR loads assembly, JITs IL, executes entrypoint (Sub Main)
 *  - Stack vs Heap at a glance (value vs reference types)
 *  - Runtimes: ".NET", "Mono", ".NET Framework"
 *
 * How to run:  node vbnet_sim.js
 * Adjust the SAMPLE_VB_PROGRAM string to "edit" your VB Program.vb.
 */

/* ----------------------------- Utilities ----------------------------- */
const now = () => new Date().toISOString();
const hr = (label='') => console.log(`\n—${'—'.repeat(26)} ${label} ${'—'.repeat(26)}—\n`);

function table(obj, title) {
  console.log(title ?? '');
  console.table(obj);
}

/* ------------------------- “Dotnet CLI” shell ------------------------- */
class DotnetCLI {
  constructor({version}) { this.version = version; }
  versionCmd() { return this.version; }

  newConsole({lang='VB', name='VbPlayground'}) {
    // Minimal conceptual scaffold
    return {
      dir: name,
      files: {
        'Program.vb': SAMPLE_VB_PROGRAM.trimStart(),
        'VbPlayground.vbproj': SAMPLE_VBPROJ.trimStart(),
      }
    };
  }
}

/* ----------------------------- VB Source ----------------------------- */
const SAMPLE_VBPROJ = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <RootNamespace>VbPlayground</RootNamespace>
    <TargetFramework>net8.0</TargetFramework>
    <OptionStrict>On</OptionStrict>
  </PropertyGroup>
</Project>
`;

const SAMPLE_VB_PROGRAM = `
Imports System

Module Program
    ' Entry point: where execution starts
    Sub Main(args As String())
        ' Value type (Integer) — conceptually stack-allocated
        Dim x As Integer = 42

        ' Reference type (String) — reference on stack, object on heap
        Dim s As String = "Hello, VB from a JS simulator!"

        Console.WriteLine("x = " & x.ToString())
        Console.WriteLine(s)

        ' Show a tiny “Hello, World!” too
        Console.WriteLine("Hello, World!")

        ' Simulate return
    End Sub
End Module
`;

/* ----------------------------- Compiler ------------------------------ */
/**
 * “vbc” compiler — very tiny parser that extracts:
 *  - Module name
 *  - Sub Main body (only Console.WriteLine & simple Dim assignments)
 * Emits a toy IL (array of {op, arg}) plus type metadata.
 */
class VBCompiler {
  compile(sourceText) {
    const moduleName = /Module\s+([A-Za-z_]\w*)/i.exec(sourceText)?.[1] ?? 'Program';
    const hasMain = /Sub\s+Main\s*\(\s*args\s+As\s+String\(\)\s*\)/i.test(sourceText);

    if (!hasMain) throw new Error("No 'Sub Main(args As String())' found.");

    // Extract lines between Sub Main ... End Sub
    const mainBodyMatch = /Sub\s+Main\s*\(\s*args\s+As\s+String\(\)\s*\)([\s\S]*?)End\s+Sub/i.exec(sourceText);
    const body = mainBodyMatch ? mainBodyMatch[1] : '';
    const lines = body.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    // Super-tiny “compiler” → IL
    const il = [];
    const locals = []; // {name, type, storage:'stack|heap', defaultValue}
    for (const line of lines) {
      // Dim x As Integer = 42
      let m1 = /^Dim\s+([A-Za-z_]\w*)\s+As\s+Integer\s*=\s*([0-9]+)\s*$/i.exec(line);
      if (m1) {
        const [, name, num] = m1;
        locals.push({name, type:'System.Int32', storage:'stack', defaultValue: Number(num)});
        il.push({op:'declare_loc', arg:{name, type:'System.Int32'}});
        il.push({op:'ldc_i4', arg:Number(num)});
        il.push({op:'stloc', arg:name});
        continue;
      }

      // Dim s As String = "..."
      let m2 = /^Dim\s+([A-Za-z_]\w*)\s+As\s+String\s*=\s*"([\s\S]*?)"\s*$/i.exec(line);
      if (m2) {
        const [, name, str] = m2;
        locals.push({name, type:'System.String', storage:'heap', defaultValue: str});
        il.push({op:'declare_loc', arg:{name, type:'System.String'}});
        il.push({op:'ldstr', arg:str});
        il.push({op:'stloc', arg:name});
        continue;
      }

      // Console.WriteLine("...")  OR  Console.WriteLine(something)
      let m3 = /^Console\.WriteLine\(([\s\S]*?)\)\s*$/i.exec(line);
      if (m3) {
        let argExpr = m3[1].trim();

        // "foo"
        if (/^".*"$/.test(argExpr)) {
          il.push({op:'ldstr', arg: argExpr.slice(1, -1)});
          il.push({op:'call', arg:'System.Console::WriteLine(String)'});
          continue;
        }

        // x.ToString() — we’ll just convert local to string
        let mToString = /^([A-Za-z_]\w*)\.ToString\(\)\s*$/i.exec(argExpr);
        if (mToString) {
          const loc = mToString[1];
          il.push({op:'ldloc', arg:loc});
          il.push({op:'box_any', arg:loc}); // unify to string later
          il.push({op:'call', arg:'System.Console::WriteLine(Object)'});
          continue;
        }

        // s  or  "x = " & x.ToString()
        // naive handle: split on & and concatenate
        if (argExpr.includes('&')) {
          // tokenize by &
          const parts = argExpr.split('&').map(s=>s.trim());
          il.push({op:'ldstr', arg:''});
          for (let p of parts) {
            if (/^".*"$/.test(p)) {
              il.push({op:'concat_str', arg:p.slice(1,-1)});
            } else if (/^[A-Za-z_]\w*\.ToString\(\)$/.test(p)) {
              const v = p.replace(/\.ToString\(\)$/,'');
              il.push({op:'ldloc', arg:v});
              il.push({op:'box_any', arg:v});
              il.push({op:'concat_obj'});
            } else if (/^[A-Za-z_]\w*$/.test(p)) {
              il.push({op:'ldloc', arg:p});
              il.push({op:'concat_obj'});
            } else {
              // fallback
              il.push({op:'concat_str', arg:`[UNPARSED:${p}]`});
            }
          }
          il.push({op:'call', arg:'System.Console::WriteLine(String)'});
          continue;
        }

        // bare local
        if (/^[A-Za-z_]\w*$/.test(argExpr)) {
          il.push({op:'ldloc', arg:argExpr});
          il.push({op:'call', arg:'System.Console::WriteLine(Object)'});
          continue;
        }

        // fallback: treat as string literal
        il.push({op:'ldstr', arg:`[UNPARSED:${argExpr}]`});
        il.push({op:'call', arg:'System.Console::WriteLine(String)'});
        continue;
      }

      // comment lines or blank: ignore
      if (line.startsWith("'")) continue;
      if (!line) continue;

      // not recognized line — no-op marker in IL
      il.push({op:'nop', arg: line});
    }

    il.push({op:'ret'});
    const metadata = {
      module: moduleName,
      entryPoint: `${moduleName}.Main`,
      locals
    };

    return new ILModule(il, metadata);
  }
}

/* ----------------------------- IL Module ----------------------------- */
class ILModule {
  constructor(il, metadata) {
    this.il = il;
    this.metadata = metadata;
  }
}

/* -------------------------- CLR / Runtimes --------------------------- */
class Runtime {
  constructor(name, version) {
    this.name = name; // ".NET" | "Mono" | ".NET Framework"
    this.version = version;
    this.heap = new ManagedHeap();
    this.console = new RuntimeConsole();
  }
  load(ilm) { return new Assembly(ilm, this); }
}

class Assembly {
  constructor(ilModule, runtime) {
    this.ilModule = ilModule;
    this.runtime = runtime;
  }
  runEntryPoint(argv=[]) {
    const jit = new JIT(this.runtime);
    const native = jit.compile(this.ilModule); // returns a JS function
    return native(argv);
  }
}

class RuntimeConsole {
  WriteLine(arg) {
    // approx Console.WriteLine
    console.log(String(arg ?? ''));
  }
}

class ManagedHeap {
  constructor() {
    this.objects = new Map(); // id -> obj
    this.nextId = 1;
  }
  allocString(str) {
    const id = this.nextId++;
    this.objects.set(id, {type:'System.String', value:String(str)});
    return {ref:id, type:'System.String'};
  }
  get(id) { return this.objects.get(id); }
}

/* -------------------------------- JIT -------------------------------- */
class JIT {
  constructor(runtime) { this.runtime = runtime; }

  compile(ilModule) {
    const {il, metadata} = ilModule;
    const runtime = this.runtime;

    // Return a function that interprets the IL (JIT-as-interpreter for teaching)
    return function nativeMain(argv) {
      hr(`CLR JIT → native (${runtime.name} ${runtime.version})`);
      table({Module: metadata.module, EntryPoint: metadata.entryPoint}, 'Metadata');
      table(metadata.locals, 'Locals (declared)');

      const stack = []; // eval stack
      const locals = Object.create(null); // name -> value
      const heap = runtime.heap;
      const out = runtime.console;

      // Initialize locals with default (to show stack/heap idea)
      for (const l of metadata.locals) {
        if (l.type === 'System.Int32') locals[l.name] = l.defaultValue ?? 0; // value type → number
        else if (l.type === 'System.String') {
          const obj = heap.allocString(l.defaultValue ?? '');
          locals[l.name] = obj; // reference to heap object
        } else {
          locals[l.name] = null;
        }
      }

      // Execute IL
      for (let ip=0; ip<il.length; ip++) {
        const instr = il[ip];
        switch (instr.op) {
          case 'nop': /* ignore */ break;
          case 'declare_loc': /* already handled */ break;
          case 'ldc_i4': stack.push(Number(instr.arg)); break;
          case 'ldstr': stack.push(heap.allocString(instr.arg)); break;
          case 'stloc': {
            const v = stack.pop();
            locals[instr.arg] = v;
            break;
          }
          case 'ldloc': {
            stack.push(locals[instr.arg]);
            break;
          }
          case 'box_any': {
            // If value type (number), box into string for concatenation convenience
            const v = stack.pop();
            if (typeof v === 'number') {
              stack.push(heap.allocString(String(v)));
            } else if (v && typeof v === 'object' && v.ref) {
              // assume already a reference (e.g., string), keep as is
              stack.push(v);
            } else {
              stack.push(heap.allocString(String(v)));
            }
            break;
          }
          case 'concat_str': {
            const acc = stack.pop(); // string ref
            const add = instr.arg;
            const accObj = heap.get(acc.ref);
            accObj.value = (accObj.value ?? '') + add;
            stack.push(acc); // push back
            break;
          }
          case 'concat_obj': {
            const acc = stack.pop(); // string ref (accumulator)
            const obj = stack.pop(); // could be value or heap ref
            let s;
            if (typeof obj === 'number') s = String(obj);
            else if (obj && obj.ref) s = String(heap.get(obj.ref).value);
            else s = String(obj);
            const accObj = heap.get(acc.ref);
            accObj.value = (accObj.value ?? '') + s;
            stack.push(acc);
            break;
          }
          case 'call': {
            const sig = instr.arg;
            if (sig === 'System.Console::WriteLine(String)') {
              const strRef = stack.pop();
              const text = heap.get(strRef.ref)?.value ?? '';
              out.WriteLine(text);
            } else if (sig === 'System.Console::WriteLine(Object)') {
              const obj = stack.pop();
              let text;
              if (typeof obj === 'number') text = String(obj);
              else if (obj && obj.ref) text = String(heap.get(obj.ref).value);
              else text = String(obj);
              out.WriteLine(text);
            } else {
              out.WriteLine(`[call] Unhandled method: ${sig}`);
            }
            break;
          }
          case 'ret':
            hr('Program exited');
            // Print a mini memory snapshot so you can see stack vs heap
            const heapDump = {};
            for (const [id, obj] of runtime.heap.objects.entries()) {
              heapDump[`#${id}`] = {...obj};
            }
            table(locals, 'Locals (final)');
            table(heapDump, 'Heap (strings)');
            return 0;

          default:
            console.warn(`Unknown IL op: ${instr.op}`, instr);
        }
      }
      return 0;
    };
  }
}

/* ----------------------------- Simulation ---------------------------- */
function simulateVBConsoleApp() {
  hr('dotnet — SDK check');
  const cli = new DotnetCLI({version: '8.0.412'}); // your version
  console.log(`$ dotnet --version\n${cli.versionCmd()}`);

  hr('dotnet new console -lang VB -n VbPlayground');
  const proj = cli.newConsole({lang:'VB', name:'VbPlayground'});
  console.log(`Created directory: ${proj.dir}`);
  console.log('Files:');
  console.log('- Program.vb');
  console.log('- VbPlayground.vbproj');

  hr('vbc — compile VB → IL + metadata');
  const vbc = new VBCompiler();
  const ilModule = vbc.compile(proj.files['Program.vb']);
  table(ilModule.metadata, 'Metadata');
  console.log('IL (toy):');
  console.dir(ilModule.il, {depth:null});

  // Try with multiple runtimes (conceptual)
  const runtimes = [
    new Runtime('.NET', '8.x CLR'),
    new Runtime('Mono', '6.x'),
    new Runtime('.NET Framework', '4.8 CLR')
  ];

  for (const rt of runtimes) {
    hr(`Load & Run on ${rt.name} (${rt.version})`);
    const asm = rt.load(ilModule);
    asm.runEntryPoint([]);
  }
}

/* --------------------------------- Run -------------------------------- */
hr('VB.NET Console App Simulation');
console.log(`Started at ${now()}`);
simulateVBConsoleApp();
console.log(`Finished at ${now()}`);
