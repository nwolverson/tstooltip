import * as ts from 'typescript';

var scriptName = 'script.ts';

class CheckerCompilerHost implements ts.CompilerHost {
  files: { [fileName: string]: string } = {}

  getSourceFile(filename: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
    var text = this.files[filename];
    if (!text) return null;
    return ts.createSourceFile(filename, text, languageVersion);
  }
  getDefaultLibFileName = (options: ts.CompilerOptions) => 'lib.d.ts';
  getDirectories = (path: string) => [];

  writeFile(filename: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void {
  }
  getCurrentDirectory = () => "";
  getCanonicalFileName = (fileName: string) => fileName;
  useCaseSensitiveFileNames = () => true;
  getNewLine = () => "\n";
  fileExists = (fileName: string) => !!this.files[fileName];
  readFile = (fileName: string) => this.files[fileName];

  addFile(fileName: string, body: string) {
    this.files[fileName] = body;
  }
}

const findNode = (n: ts.Node, f: (testNode: ts.Node) => Boolean) => {
  let result : ts.Node;
  function findNode(nn: ts.Node) {
    if (result) {
      return;
    }
    if (f(nn)) {
      result = nn;
      return;
    }
    ts.forEachChild(nn, findNode);
  }
  findNode(n);
  return result;
}

export class Checker {
  files: { [fileName: string]: string; } = {}
  private compilerHost = new CheckerCompilerHost();

  init(callback: () => void) {
    var xhr = new XMLHttpRequest();
    xhr.onload = ev => {
      var response = xhr.responseText;
      this.files["lib.d.ts"] = response;
      this.compilerHost.addFile("lib.d.ts", this.files["lib.d.ts"]);

      callback();
    };
    xhr.open("GET", "lib.d.ts");
    xhr.send();
  }

  initHost(input: string) {
    this.compilerHost.addFile(scriptName, input);
  }

  compilerOptions(): ts.CompilerOptions {
    var settings = ts.getDefaultCompilerOptions();
    settings.diagnostics = true;
    settings.skipLibCheck = true;
    return settings;
  }

  checkExpression(s: string) {
    var input = "var expr = (" + s + ");";
    this.initHost(input);

    var program = ts.createProgram([scriptName], this.compilerOptions(), this.compilerHost);
    var typeChecker = program.getTypeChecker();

    var sf = program.getSourceFile(scriptName);
    var diagnostics = [].concat(
      program.getGlobalDiagnostics(),
      program.getSyntacticDiagnostics(sf),
      program.getSemanticDiagnostics(sf)
    );

    if (diagnostics.length > 0) {
      var result = diagnostics.map(d => d.messageText).join("\n");
      return { error: true, output: result, type: null };
    } else {
      console.log(typeChecker.getSymbolsInScope(sf, ts.SymbolFlags.Variable)[0]);
      const node = findNode(sf, (n: ts.Node) => n.kind === ts.SyntaxKind.VariableDeclaration);
      return {
        error: false,
        type: typeChecker.typeToString(typeChecker.getTypeAtLocation(node))
      };
    }
  }

  checkStatements(s: string) {
    this.initHost(s);

    var program = ts.createProgram([scriptName], this.compilerOptions(), this.compilerHost);
    var typeChecker = program.getTypeChecker();

    var sf = program.getSourceFile(scriptName);
    var diagnostics = program.getSemanticDiagnostics(sf);
    // typeChecker.getDiagnostics(sf);

    var nodes: ts.Node[] = [];
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
          fullSymbolName: n.getText(),
          kind: type.flags,
          memberName: typeChecker.typeToString(type)
        }
      };
    });

    return typed;
  }
}

var checker = new Checker();
checker.init(() => {
  postMessage("ready");
});

onmessage = args => {
  var data = args.data, result;
  if (data.sort === 'expr') {
    result = checker.checkExpression(data.text);
  } else {
    result = checker.checkStatements(data.text)
  }
  postMessage({ res: result, id: data.id, sort: data.sort });
};
