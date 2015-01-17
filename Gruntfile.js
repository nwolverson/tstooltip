/// <vs BeforeBuild='default' />
module.exports = function (grunt) {
    "use strict";

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        ts: {
            options: { 
                compiler: 'node_modules/typescript/bin/tsc',
            },
            tooltip: {
                src: 'tstooltip.ts'
            },
            worker: {
                src: 'worker.ts'
            }
        },
        
        watch: {
            ts: {
                files: ["*.ts"],
                tasks: ['ts:tooltip', 'ts:worker']
            }
        },

        clean: {
            js: ["tstooltip.js*", "worker.js*", "*.map"]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-ts')

    grunt.registerTask('default', ["ts"]);
};
