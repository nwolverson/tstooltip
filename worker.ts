/// <reference path='typings/lib.webworker.d.ts' />
/// <reference path='typings/typescriptServices.d.ts' />
importScripts('lib/typescriptServices.js');

module TsChecker {
    var scriptName = 'script.ts';

    class Snapshot implements ts.ScriptSnapshotShim {

        getText(start: number, end: number): string {
          return this.body.substr(start, end);
        }
        getLength(): number { return this.body.length; }
        getLineStartPositions(): string{
            return JSON.stringify( TypeScript.LineMap1.fromString(this.body));
        }
        getChangeRange(oldSnapshot: ts.ScriptSnapshotShim): string {
          return null;
        }

        constructor(public name : string, public body : string) {

        }
    }

    class TestShimHost implements ts.LanguageServiceShimHost {
        files : { [ fileName : string ] : { file: Snapshot; ver: number} } = {}

        log(s: string) {
            console.log(s);
        }
        getCompilationSettings(): string {
            return JSON.stringify(ts.getDefaultCompilerOptions());
        }
        getScriptFileNames() : string {
          var names : string[] = [];
          for (var name in this.files) {
            if (this.files.hasOwnProperty(name)) {
              names.push(name);
            }
          }
          return JSON.stringify(names);
        }
        getScriptVersion(fileName: string): string {
            var ver = this.files[fileName].ver;
            return ver.toString();
        }
        getScriptIsOpen(fileName: string): boolean {
            return true;
        }
        getScriptSnapshot(fileName: string): ts.ScriptSnapshotShim {
            return this.files[fileName].file;
        }
        getLocalizedDiagnosticMessages(): string {
            return JSON.stringify({});
        }
        getCancellationToken(): ts.CancellationToken {
            return { isCancellationRequested : () => false };
        }
        getCurrentDirectory(): string {
            return "";
        }
        getDefaultLibFilename(): string {
            return "lib";
        }

        addFile(fileName : string, body: string) {
          var snap = new Snapshot(fileName, body);
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
        private host = new TestShimHost()
        private languageService : ts.LanguageService

        init(callback: () => void) {
            var xhr = new XMLHttpRequest();
            xhr.onload = ev => {
                var response = xhr.responseText;
                this.files["lib.d.ts"] = response;
                this.host.addFile("lib.d.ts", this.files["lib.d.ts"]);

                callback();
            };
            xhr.open("GET", "typings/lib.d.ts");
            xhr.send();
        }

        initHost(input: string) {
          this.host.addFile(scriptName, input);
          if (!this.languageService){
            var f = new TypeScript.Services.TypeScriptServicesFactory();
            this.languageService = f.createLanguageServiceShim(this.host).languageService;
          }
        }

        checkExpression(s: string) {
          var input = "var expr = (" + s + ");";
          this.initHost(input);

          var output = this.languageService.getEmitOutput(scriptName);
          if (output.emitOutputStatus != 0) {
              var diag = this.languageService.getSemanticDiagnostics(scriptName);
              var result = diag.map((x) => x.messageText).join("\n");
              return { error: true, output: result, type: null };
          } else {
              if (output.outputFiles.length != 1) {
                  throw "Should be 1 output file";
              }
              var ti = this.languageService.getTypeAtPosition(scriptName, input.indexOf("expr"));
              var type = ti.memberName.toString();
              return { error : false, output: output.outputFiles[0].text, type: type };
          }
        }

        checkStatements(s: string)
        {
          this.initHost(s);

          var output = this.languageService.getEmitOutput(scriptName);
          if (output.emitOutputStatus != 0) {

          } else {
            var classifications = this.languageService.getSyntacticClassifications(scriptName,
              new TypeScript.TextSpan(0,s.length));
            var idSpans = classifications.filter(c => c.classificationType === ts.ClassificationTypeNames.text)
              .map(c => c.textSpan);
            var typed = idSpans.map(span => {
              var type = this.languageService.getTypeAtPosition(scriptName, span.start());
              if (!type) {
                return undefined;
              } else {
                return {
                  pos: {start: type.textSpan.start(), end: type.textSpan.end() }, // was span
                  type: { fullSymbolName: type.fullSymbolName, kind: type.kind, memberName : type.memberName.toString() }
                };
              }
            });
            return typed.filter(x => x !== undefined);
          }
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
