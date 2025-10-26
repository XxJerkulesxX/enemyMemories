import { useState } from 'react';

// VB.NET Runtime Simulation - Models the compilation and execution pipeline

// ========== MEMORY STRUCTURES ==========
class StackFrame {
  constructor(methodName) {
    this.methodName = methodName;
    this.locals = new Map();
    this.parameters = new Map();
  }
  
  addLocal(name, type, value) {
    this.locals.set(name, { type, value, address: `0x${Math.random().toString(16).slice(2, 10)}` });
  }
  
  addParameter(name, type, value) {
    this.parameters.set(name, { type, value, address: `0x${Math.random().toString(16).slice(2, 10)}` });
  }
}

class ManagedHeap {
  constructor() {
    this.objects = new Map();
    this.nextId = 1;
  }
  
  allocate(type, value) {
    const id = this.nextId++;
    const address = `0x${(0x10000000 + id * 16).toString(16)}`;
    this.objects.set(id, {
      id,
      type,
      value,
      address,
      generation: 0,
      marked: false
    });
    return { id, address };
  }
  
  get(id) {
    return this.objects.get(id);
  }
}

// ========== VB SOURCE FILE ==========
class VBSourceFile {
  constructor(filename, content) {
    this.filename = filename;
    this.content = content;
    this.tokens = [];
  }
  
  tokenize() {
    this.tokens = this.content.split(/\s+/).filter(t => t.length > 0);
    return this.tokens;
  }
}

// ========== VB COMPILER ==========
class VBCompiler {
  constructor(version = '8.0.412') {
    this.version = version;
    this.name = 'vbc (Visual Basic Compiler)';
  }
  
  compile(sourceFile) {
    console.log(`[VBC ${this.version}] Compiling ${sourceFile.filename}...`);
    
    sourceFile.tokenize();
    const il = this.generateIL(sourceFile);
    const metadata = this.generateMetadata(sourceFile);
    
    return new CompiledAssembly(sourceFile.filename.replace('.vb', '.dll'), il, metadata);
  }
  
  generateIL(sourceFile) {
    return [
      { opcode: 'ldstr', operand: '"Hello from VB.NET!"', description: 'Load string constant' },
      { opcode: 'call', operand: 'System.Console::WriteLine', description: 'Call Console.WriteLine' },
      { opcode: 'ldstr', operand: '"Press any key..."', description: 'Load string constant' },
      { opcode: 'call', operand: 'System.Console::WriteLine', description: 'Call Console.WriteLine' },
      { opcode: 'call', operand: 'System.Console::ReadKey', description: 'Call Console.ReadKey' },
      { opcode: 'pop', operand: null, description: 'Pop return value' },
      { opcode: 'ret', operand: null, description: 'Return from method' }
    ];
  }
  
  generateMetadata(sourceFile) {
    return {
      assembly: 'VbPlayground',
      version: '1.0.0.0',
      types: [
        {
          name: 'Program',
          namespace: 'VbPlayground',
          methods: [
            {
              name: 'Main',
              returnType: 'System.Void',
              parameters: [{ name: 'args', type: 'System.String[]' }],
              isEntryPoint: true
            }
          ]
        }
      ]
    };
  }
}

// ========== COMPILED ASSEMBLY ==========
class CompiledAssembly {
  constructor(name, il, metadata) {
    this.name = name;
    this.il = il;
    this.metadata = metadata;
    this.nativeCode = null;
  }
}

// ========== CLR (Common Language Runtime) ==========
class CLR {
  constructor(version = '8.0.412') {
    this.version = version;
    this.name = 'CoreCLR';
    this.stack = [];
    this.heap = new ManagedHeap();
    this.jitCache = new Map();
    this.gcEnabled = true;
  }
  
  loadAssembly(assembly) {
    console.log(`[CLR ${this.version}] Loading assembly: ${assembly.name}`);
    console.log(`[CLR] Verifying IL and metadata...`);
    
    const entryPoint = assembly.metadata.types
      .flatMap(t => t.methods)
      .find(m => m.isEntryPoint);
    
    if (!entryPoint) {
      throw new Error('No entry point found');
    }
    
    return entryPoint;
  }
  
  jitCompile(methodName, il) {
    console.log(`[JIT] Compiling ${methodName} to native code...`);
    
    if (this.jitCache.has(methodName)) {
      console.log(`[JIT] Using cached native code for ${methodName}`);
      return this.jitCache.get(methodName);
    }
    
    const nativeCode = il.map((inst, idx) => ({
      address: `0x${(0x00400000 + idx * 8).toString(16)}`,
      instruction: this.ilToNative(inst),
      source: inst
    }));
    
    this.jitCache.set(methodName, nativeCode);
    
    return nativeCode;
  }
  
  ilToNative(ilInst) {
    const mappings = {
      'ldstr': 'mov rax, [string_address]',
      'call': 'call [method_address]',
      'pop': 'add rsp, 8',
      'ret': 'ret'
    };
    return mappings[ilInst.opcode] || 'nop';
  }
  
  execute(assembly) {
    const logs = [];
    
    const entryPoint = this.loadAssembly(assembly);
    logs.push({ stage: 'Load', message: `Entry point: ${entryPoint.name}` });
    
    const nativeCode = this.jitCompile(entryPoint.name, assembly.il);
    logs.push({ stage: 'JIT', message: `Compiled ${assembly.il.length} IL instructions to native code` });
    
    const mainFrame = new StackFrame('Main');
    mainFrame.addParameter('args', 'System.String[]', []);
    this.stack.push(mainFrame);
    logs.push({ stage: 'Execute', message: `Created stack frame for Main` });
    
    assembly.il.forEach((inst, idx) => {
      const native = nativeCode[idx];
      logs.push({
        stage: 'Execute',
        message: `[${native.address}] ${inst.opcode} ${inst.operand || ''} → ${native.instruction}`
      });
      
      if (inst.opcode === 'ldstr') {
        const { id, address } = this.heap.allocate('System.String', inst.operand);
        logs.push({
          stage: 'Heap',
          message: `Allocated string at ${address}: ${inst.operand}`
        });
      }
    });
    
    this.stack.pop();
    logs.push({ stage: 'Execute', message: `Returned from Main, stack frame destroyed` });
    
    return logs;
  }
}

// ========== .NET SDK & RUNTIME ==========
class DotNetSDK {
  constructor() {
    this.version = '8.0.412';
    this.runtimeVersion = '8.0.12';
  }
  
  newConsoleApp(language, name) {
    if (language !== 'VB') {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    console.log(`[dotnet] Creating new VB console application: ${name}`);
    
    const project = new VBConsoleProject(name);
    return project;
  }
}

// ========== VB CONSOLE PROJECT ==========
class VBConsoleProject {
  constructor(name) {
    this.name = name;
    this.files = this.createDefaultFiles();
  }
  
  createDefaultFiles() {
    const programVb = new VBSourceFile('Program.vb', `
Imports System

Module Program
    Sub Main(args As String())
        Console.WriteLine("Hello from VB.NET!")
        Console.WriteLine("Press any key...")
        Console.ReadKey()
    End Sub
End Module
    `.trim());
    
    const vbproj = {
      name: `${this.name}.vbproj`,
      content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <RootNamespace>${this.name}</RootNamespace>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
</Project>`
    };
    
    return {
      'Program.vb': programVb,
      [`${this.name}.vbproj`]: vbproj
    };
  }
  
  getEntryPoint() {
    return this.files['Program.vb'];
  }
}

// ========== REACT COMPONENT ==========
export default function VBNetSimulator() {
  const [logs, setLogs] = useState([]);
  const [stage, setStage] = useState('idle');
  const [stackFrames, setStackFrames] = useState([]);
  const [heapObjects, setHeapObjects] = useState([]);
  
  const runSimulation = () => {
    setLogs([]);
    setStage('init');
    const allLogs = [];
    
    allLogs.push({ stage: 'CLI', message: '$ dotnet new console -lang VB -n VbPlayground' });
    const sdk = new DotNetSDK();
    const project = sdk.newConsoleApp('VB', 'VbPlayground');
    allLogs.push({ stage: 'CLI', message: `✓ Created project: ${project.name}` });
    allLogs.push({ stage: 'CLI', message: `✓ Created file: Program.vb` });
    allLogs.push({ stage: 'CLI', message: `✓ Created file: ${project.name}.vbproj` });
    
    const sourceFile = project.getEntryPoint();
    allLogs.push({ stage: 'Source', message: '=== Program.vb ===' });
    allLogs.push({ stage: 'Source', message: sourceFile.content });
    
    setStage('compile');
    const compiler = new VBCompiler('8.0.412');
    const assembly = compiler.compile(sourceFile);
    allLogs.push({ stage: 'Compile', message: `✓ Compiled to IL` });
    allLogs.push({ stage: 'Compile', message: `✓ Generated metadata` });
    allLogs.push({ stage: 'Compile', message: `✓ Created assembly: ${assembly.name}` });
    
    allLogs.push({ stage: 'IL', message: '=== Intermediate Language (IL) ===' });
    assembly.il.forEach((inst, idx) => {
      allLogs.push({ 
        stage: 'IL', 
        message: `IL_${idx.toString(16).padStart(4, '0')}: ${inst.opcode} ${inst.operand || ''}`
      });
    });
    
    setStage('execute');
    const clr = new CLR('8.0.412');
    const execLogs = clr.execute(assembly);
    allLogs.push(...execLogs);
    
    setStackFrames([{ method: 'Main', locals: ['args: String[]'] }]);
    setHeapObjects(Array.from(clr.heap.objects.values()));
    
    allLogs.push({ stage: 'Complete', message: '✓ Program executed successfully' });
    
    setLogs(allLogs);
    setStage('complete');
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <span className="text-blue-400">⚡</span>
            VB.NET Runtime Simulator
          </h1>
          <p className="text-gray-400">
            Simulating: dotnet new console -lang VB -n VbPlayground
          </p>
          <p className="text-sm text-gray-500 mt-1">
            SDK Version: 8.0.412 | Runtime: CoreCLR 8.0.12
          </p>
        </div>
        
        <button
          onClick={runSimulation}
          className="mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
        >
          ▶ Run Simulation
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-green-400">💻</span>
              Pipeline Stage
            </h3>
            <div className="space-y-2 text-sm">
              <div className={`p-2 rounded ${stage === 'init' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                1. Project Creation
              </div>
              <div className={`p-2 rounded ${stage === 'compile' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                2. VB Compilation → IL
              </div>
              <div className={`p-2 rounded ${stage === 'execute' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                3. CLR JIT → Native
              </div>
              <div className={`p-2 rounded ${stage === 'complete' ? 'bg-green-600' : 'bg-gray-700'}`}>
                4. Execution
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-purple-400">📚</span>
              Call Stack
            </h3>
            <div className="space-y-2 text-sm">
              {stackFrames.length === 0 ? (
                <div className="text-gray-500 italic">Empty</div>
              ) : (
                stackFrames.map((frame, idx) => (
                  <div key={idx} className="p-2 bg-gray-700 rounded">
                    <div className="font-mono text-purple-300">{frame.method}()</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {frame.locals.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-orange-400">🗄️</span>
              Managed Heap
            </h3>
            <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {heapObjects.length === 0 ? (
                <div className="text-gray-500 italic">Empty</div>
              ) : (
                heapObjects.map((obj) => (
                  <div key={obj.id} className="p-2 bg-gray-700 rounded text-xs">
                    <div className="font-mono text-orange-300">{obj.address}</div>
                    <div className="text-gray-400">{obj.type}</div>
                    <div className="text-gray-300 truncate">{obj.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="text-yellow-400">📝</span>
            Execution Log
          </h3>
          <div className="bg-black rounded p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Run Simulation" to start...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className={`
                    ${log.stage === 'CLI' ? 'text-cyan-400' : ''}
                    ${log.stage === 'Source' ? 'text-green-400' : ''}
                    ${log.stage === 'Compile' ? 'text-yellow-400' : ''}
                    ${log.stage === 'IL' ? 'text-purple-400' : ''}
                    ${log.stage === 'Load' ? 'text-blue-400' : ''}
                    ${log.stage === 'JIT' ? 'text-orange-400' : ''}
                    ${log.stage === 'Execute' ? 'text-pink-400' : ''}
                    ${log.stage === 'Heap' ? 'text-red-400' : ''}
                    ${log.stage === 'Complete' ? 'text-green-500' : ''}
                    min-w-[80px] font-semibold
                  `}>
                    [{log.stage}]
                  </span>
                  <span className="text-gray-300 whitespace-pre-wrap">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="font-semibold mb-4 text-center">VB.NET Compilation & Execution Pipeline</h3>
          <div className="flex flex-col items-center space-y-4 text-sm">
            <div className="w-full max-w-md p-3 bg-green-600 rounded text-center font-mono">
              Program.vb (VB Source Code)
            </div>
            <div className="text-gray-400">↓</div>
            <div className="w-full max-w-md p-3 bg-yellow-600 rounded text-center font-mono">
              vbc (VB Compiler)
            </div>
            <div className="text-gray-400">↓</div>
            <div className="w-full max-w-md p-3 bg-purple-600 rounded text-center font-mono">
              IL (Intermediate Language) + Metadata
            </div>
            <div className="text-gray-400">↓</div>
            <div className="w-full max-w-md p-3 bg-blue-600 rounded text-center font-mono">
              CLR (Common Language Runtime)
            </div>
            <div className="text-gray-400">↓</div>
            <div className="w-full max-w-md p-3 bg-orange-600 rounded text-center font-mono">
              JIT Compiler (IL → Native x64/ARM)
            </div>
            <div className="text-gray-400">↓</div>
            <div className="w-full max-w-md p-3 bg-red-600 rounded text-center font-mono">
              Native Machine Code (Execution)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}