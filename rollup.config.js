import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';

export default {
  entry: `dist/${process.env.bundle}/${process.env.bundle}.js`,
  dest: `dist/${process.env.bundle}.js`,
  moduleName: process.env.bundle,
  format: 'iife',

  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),
    builtins(),

    commonjs({
      // non-CommonJS modules will be ignored, but you can also
      // specifically include/exclude files
      include: 'node_modules/**',  // Default: undefined

      // search for files other than .js files (must already
      // be transpiled by a previous plugin!)
      extensions: [ '.js' ],  // Default: [ '.js' ]

      // if true then uses of `global` won't be dealt with by this plugin
      ignoreGlobal: false,  // Default: false

      // if false then skip sourceMap generation for CommonJS modules
      sourceMap: false,  // Default: true

      namedExports: {
          'node_modules/typescript/lib/typescript.js': ['createSourceFile', 'getDefaultCompilerOptions', 'createProgram', 'forEachChild', 'SyntaxKind']
      }
    })
  ]
};