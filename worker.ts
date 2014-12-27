/// <reference path='typings/lib.webworker.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
importScripts('lib/typescriptServices.js');

module TsChecker {
    var scriptName = 'script.ts';

    class TestHost implements ts.LanguageServiceHost {
        files : { [ fileName : string ] : { file: ts.IScriptSnapshot; ver: number} } = {}

        log(s: string) {
            console.log(s);
        }
        trace(s:string) {
          console.info(s);
        }
        error(s: string) {
          console.error(s);
        }
        getCompilationSettings(): ts.CompilerOptions {
            var opts = ts.getDefaultCompilerOptions();
            //opts.declaration = true;
            opts.diagnostics = true;
            return opts;
        }
        getScriptFileNames() : string[] {
          var names : string[] = [];
          for (var name in this.files) {
            if (this.files.hasOwnProperty(name)) {
              names.push(name);
            }
          }
          return names;
        }
        getScriptVersion(fileName: string): string {
            var ver = this.files[fileName].ver;
            return ver.toString();
        }
        getScriptIsOpen(fileName: string): boolean {
            return true;
        }
        getScriptSnapshot(fileName: string): ts.IScriptSnapshot {
            return this.files[fileName].file;
        }
        getLocalizedDiagnosticMessages(): string {
            return JSON.stringify({});
        }
        getCancellationToken() {
            return { isCancellationRequested : () => false };
        }
        getCurrentDirectory(): string {
            return "";
        }
        getDefaultLibFilename(): string {
            return "lib";
        }

        addFile(fileName : string, body: string) {
          var snap = ts.ScriptSnapshot.fromString(body);
          snap.getChangeRange = _ => undefined;
          var existing = this.files[fileName];
          if (existing){
            this.files[fileName].ver++;
            this.files[fileName].file = snap
          } else {
            this.files[fileName] = {ver: 1, file: snap};
          }
        }
    }

    class TestCompilerHost implements ts.CompilerHost {
      files : { [ fileName : string ] : { file: ts.IScriptSnapshot; ver: number} } = {}

      getSourceFile(filename: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
        var f = this.files[filename];
        if (!f) return null;
        var sourceFile = ts.createLanguageServiceSourceFile(filename, f.file, ts.ScriptTarget.ES5, f.ver.toString(), true, false);
        return sourceFile;
      }
      getDefaultLibFilename = (options: ts.CompilerOptions) => "lib";
      /*getCancellationToken?(): CancellationToken {
        return { isCancellationRequested : () => false };
      }*/
      writeFile(filename: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void {
          debugger;
      }
      getCurrentDirectory = () => "";
      getCanonicalFileName = (fileName: string) => fileName;
      useCaseSensitiveFileNames = () => true;
      getNewLine = () => "\n";


      addFile(fileName : string, body: string) {
        var snap = ts.ScriptSnapshot.fromString(body);
        snap.getChangeRange = _ => undefined;
        var existing = this.files[fileName];
        if (existing){
          this.files[fileName].ver++;
          this.files[fileName].file = snap
          } else {
            this.files[fileName] = {ver: 1, file: snap};
          }
        }
    }

    export class Checker {
        files : { [ fileName : string ] : string; } = {}
        private host = new TestHost();
        private compilerHost = new TestCompilerHost();
        private languageService = ts.createLanguageService(this.host, ts.createDocumentRegistry());

        init(callback: () => void) {
            var xhr = new XMLHttpRequest();
            xhr.onload = ev => {
                var response = xhr.responseText;
                this.files["lib.d.ts"] = response;
                this.host.addFile("lib.d.ts", this.files["lib.d.ts"]);
                this.compilerHost.addFile("lib.d.ts", this.files["lib.d.ts"]);

                callback();
            };
            xhr.open("GET", "typings/lib.d.ts");
            xhr.send();
        }

        initHost(input: string) {
          this.host.addFile(scriptName, input);
          this.compilerHost.addFile(scriptName, input);
        }

        checkExpression(s: string) {
          var input = "var expr = (" + s + ");";
          this.initHost(input);

          var program = ts.createProgram([scriptName], this.host.getCompilationSettings(), this.compilerHost);
          var typeChecker = program.getTypeChecker(true);

          var sf = program.getSourceFile(scriptName);
          var diagnostics = typeChecker.getDiagnostics(sf);

          if (diagnostics.length > 0) {
            var result = diagnostics.map(d => d.messageText).join("\n");
            return { error: true, output: result, type: null };
          } else {
            var type = typeChecker.getTypeAtLocation(sf.getNamedDeclarations()[0]);
            return {
              error: false,
              type: typeChecker.typeToString(type)
            };
          }
        }

        checkStatements(s: string)
        {
          this.initHost(s);

          var program = ts.createProgram([scriptName], this.host.getCompilationSettings(), this.compilerHost);
          var typeChecker = program.getTypeChecker(true);

          var sf = program.getSourceFile(scriptName);
          var diagnostics = typeChecker.getDiagnostics(sf);

          var nodes = [];
          function allNodes(n) {
            ts.forEachChild(n, n => { nodes.push(n); allNodes(n); return false; })
          };
          allNodes(sf);
          var idNodes = nodes.filter(n => n.kind === ts.SyntaxKind.Identifier);

          var typed = idNodes.map(n => {
              var type = typeChecker.getTypeAtLocation(n);
              return {
                pos: { start: n.pos, length: n.end - n.pos },
                type: {
                    fullSymbolName: n.text,
                    kind: type.flags,
                    memberName: typeChecker.typeToString(type)
                  }
              };
          });

          return typed;
          //var classifications = this.languageService.getSyntacticClassifications(scriptName, { start: 0, length: s.length});
          //var idSpans = classifications.filter(c => c.classificationType === ts.ClassificationTypeNames.text).map(c => c.textSpan);
          //var info = this.languageService.getQuickInfoAtPosition(scriptName, span.start);
          //var def = this.languageService.getDefinitionAtPosition(scriptName, span.start)[0];
        }
    }
}

var checker = new TsChecker.Checker();
checker.init(() => {
  self.postMessage("ready");
});

self.onmessage = args => {
  var data = args.data, result;
  if (data.sort === 'expr') {
    result = checker.checkExpression(data.text);
  } else {
    result = checker.checkStatements(data.text)
  }
  self.postMessage({ res: result, id: data.id, sort: data.sort });
};
