module.exports = function(grunt) {
  "use strict";

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    exec: {
      tsc_clean: {
        cmd: 'jake clean',
        cwd: 'Typescript'
      },
      tsc: {
        cmd: 'jake local',
        cwd: 'Typescript'
      },
      tooltip: 'node TypeScript/built/local/tsc.js tstooltip.ts',
      worker: 'node TypeScript/built/local/tsc.js worker.ts'
    },

    copy: {
        dts: {
            src: 'TypeScript/built/local/typescriptServices.d.ts', 
            dest: 'typings/typescriptServices.d.ts'
        },
        services: {
            src: 'TypeScript/built/local/typescriptServices.js', 
            dest: 'lib/typescriptServices.js'
        },
        tsc: {
            src: 'TypeScript/built/local/tsc.js', 
            dest: 'lib/tsc.js'
        }
    },

    watch: {
      ts: {
        files: ["*.ts"],
        tasks: ['ts:tstooltip', 'ts:worker']
      }
    },

    clean: {
      js: ["tstooltip.js*", "worker.js*", "typings/typescriptServices.d.ts"]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('default', ["exec:tsc", "copy", "exec:tooltip", "exec:worker"]);
  grunt.registerTask('cleaner', ["clean", "exec:tsc_clean"])
};
