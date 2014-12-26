module.exports = function(grunt) {
  "use strict";

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    ts: {
      options: {

      },
      tstooltip: {
        src: ["tstooltip.ts"]
      },
      worker: {
        src: ["worker.ts"]
      }
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
  //
  // // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Default task(s).
  grunt.registerTask('default', ["ts:tstooltip", "ts:worker"]);
};
