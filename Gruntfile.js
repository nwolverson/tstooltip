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

    watch: {
      ts: {
        files: ["*.ts"],
        tasks: ['ts:tstooltip', 'ts:worker']
      }
    },

    clean: {
      js: ["tstooltip.js*", "worker.js*"]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-exec');

  grunt.registerTask('default', ["exec:tsc", "exec:tooltip", "exec:worker"]);
  grunt.registerTask('cleaner', ["clean", "exec:tsc_clean"])
};
