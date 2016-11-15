'use strict'

const path = require('path')

const babel = require('gulp-babel')
const buffer = require('gulp-buffer')
const browserify = require('browserify')
const concat = require('gulp-concat')
const connect = require('gulp-connect')
const eslint = require('gulp-eslint')
const extend = require('util')._extend
const gulp = require('gulp-help')(require('gulp'), {})
const ifElse = require('gulp-if-else')
const livereload = require('gulp-livereload')
const notify = require('gulp-notify')
const sass = require('gulp-sass')
const source = require('vinyl-source-stream')
const sourcemaps = require('gulp-sourcemaps')
const size = require('gulp-size')

const NODE_PATH = process.env.NODE_PATH ? process.env.NODE_PATH : './node_modules'

let isWatching = false

gulp.task('sass', 'Process select3 styling', (done) => {
    return gulp.src('./test/test.scss')
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sass({includePaths: NODE_PATH}))
    .on('error', notify.onError('Error: <%= error.message %>'))
    .pipe(concat('styles.css'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.join(__dirname, 'test', 'public')))
    .pipe(size(extend({title: 'sass'}, {showTotal: true, showFiles: true})))
    .pipe(ifElse(isWatching, livereload))
})


gulp.task('js', 'Process select3 javascript', (done) => {
    return browserify({entries: './src/select3.js', debug: true}).bundle()
    .pipe(source('select3.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.join(__dirname, 'test', 'public')))
    .pipe(size(extend({title: 'js'}, {showTotal: true, showFiles: true})))
    .pipe(ifElse(isWatching, livereload))
})


gulp.task('js-test', 'Process test vendor javascript', (done) => {
    return browserify({entries: './test/test.js', debug: false}).bundle()
    .pipe(source('test.js'))
    .pipe(buffer())
    .pipe(gulp.dest(path.join(__dirname, 'test', 'public')))
    .pipe(size(extend({title: 'js'}, {showTotal: true, showFiles: true})))
    .pipe(ifElse(isWatching, livereload))
})


gulp.task('watch', 'Development mode.', () => {
    // Set isWatching flag for task reload conditions.
    isWatching = true
    // Start livereload server.
    livereload({start: true})
    // Serves test directory at `http://localhost:8999` for livereload.
    connect.server({port: 8999, root: path.join(__dirname, 'test', 'public')})
    gulp.watch([
        path.join(__dirname, 'src', 'select3.js'),
    ], ['js'])
    gulp.watch([
        path.join(__dirname, 'test', 'test.js'),
    ], ['js-test'])
    gulp.watch([
        path.join(__dirname, 'sass', '*.scss'),
        path.join(__dirname, 'test', 'test.scss'),
    ], ['sass'])
})
