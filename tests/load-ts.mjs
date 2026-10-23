import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Compile the actual route/module and inject only its external I/O boundaries.
export function loadTs(path, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name), Request, Response, URL, AbortSignal, Buffer, process, console, crypto, setTimeout, ...globals }, { filename: path });
  return module.exports;
}
