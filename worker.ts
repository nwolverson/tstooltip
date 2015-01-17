/// <reference path='typings/lib.webworker.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
importScripts('lib/typescriptServices.js');

module TsChecker {
    var scriptName = 'script.ts';

    class CheckerCompilerHost implements ts.CompilerHost {
      files : { [ fileName : string ] : { file: ts.IScriptSnapshot; ver: number} } = {}

      getSourceFile(filename: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
        var f = this.files[filename];
        if (!f) return null;
	var text = f.file.getText(0, f.file.getLength());
        var sourceFile = ts.createSourceFile(filename, text, ts.ScriptTarget.ES5, f.ver.toString(), true);
        return sourceFile;
      }
      getDefaultLibFilename = (options: ts.CompilerOptions) => "lib";

      writeFile(filename: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void {
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
        private compilerHost = new CheckerCompilerHost();

        init(callback: () => void) {
            var xhr = new XMLHttpRequest();
            xhr.onload = ev => {
                var response = xhr.responseText;
                this.files["lib.d.ts"] = response;
                this.compilerHost.addFile("lib.d.ts", this.files["lib.d.ts"]);

                callback();
            };
            xhr.open("GET", "typings/lib.d.ts");
            xhr.send();
        }

        initHost(input: string) {
          this.compilerHost.addFile(scriptName, input);
        }

        compilerOptions() : ts.CompilerOptions {
          var settings = ts.getDefaultCompilerOptions();
          settings.diagnostics = true;
          return settings;
        }

        checkExpression(s: string) {
          var input = "var expr = (" + s + ");";
          this.initHost(input);

          var program = ts.createProgram([scriptName], this.compilerOptions(), this.compilerHost);
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

          var program = ts.createProgram([scriptName], this.compilerOptions(), this.compilerHost);
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
