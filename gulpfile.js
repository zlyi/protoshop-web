// The Great Gulp
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var LOCAL_PORT = 9999;
var SOURCE_ROOT = './app';
var BUILD_ROOT = './dist/app';

/**
 * =====================================
 *                 Launch Local Servers
 * =====================================
 */

var express = require('express');
var tinylr = require('tiny-lr');
var connectlr = require('connect-livereload');
var open = require('open');
var path = require('path');

var LIVERELOAD_PORT = 35729;

function createServers(root, port, lrport) {

  // App Server
  var app = express();
  console.log(path.resolve(root));
  app.use(connectlr());
  app.use(express.static(path.resolve(root)));
  app.listen(port, function () {
    $.util.log('Listening on', port, SOURCE_ROOT);
  });

  // Livereload Server
  var lr = tinylr();
  lr.listen(lrport, function () {
    $.util.log('LR Listening on', lrport);
  });

  // Notify livereload of changes detected
  var onchange = function (evt) {
    $.util.log($.util.colors.cyan(evt.path), 'changed');
    lr.changed({
      body: {
        files: [evt.path]
      }
    })
  };

  return {
    lr: lr,
    app: app,
    onchange: onchange
  };
}

gulp.task('server:dev', ['html2js'], function () {
  var servers = createServers(SOURCE_ROOT, LOCAL_PORT, LIVERELOAD_PORT);
  gulp.watch(['./app/**/*', '!./app/node_modules/**/*'], servers.onchange);
  open('http://localhost:9999');
});

gulp.task('server:home', function () {
  var servers = createServers('.', LOCAL_PORT, LIVERELOAD_PORT);
  gulp.watch(['./app/**/*', './home/**/*', '!./app/node_modules/**/*'], servers.onchange);
  open('http://localhost:9999/home');
});

gulp.task('server:dist', function () {
  var servers = createServers('./dist', LOCAL_PORT, LIVERELOAD_PORT);
  gulp.watch(['./dist' + '/**.*'], servers.onchange);
  open('http://localhost:9999/home');
});

/**
 * =====================================
 *                              Linting
 * =====================================
 */

gulp.task('lint', function () {
  return gulp.src([
    SOURCE_ROOT + '/scripts/**/*.js',
    '!' + SOURCE_ROOT + '/scripts/libs/**/*.js'
  ])
  .pipe($.jshint('.jshintrc'))
  .pipe($.jshint.reporter('jshint-stylish'))
  .pipe($.size());
});

/**
 * =====================================
 *                             Building
 * =====================================
 */

gulp.task('usemin', ['html2js'], function () {

  // WebApp
  gulp.src('app/*.html')
  .pipe($.usemin({
    css: [$.autoprefixer(), $.minifyCss(), $.rev()],
    js: [$.ngmin(), $.uglify(), $.rev()],
    html: [$.minifyHtml({empty: true})]
  }))
  .pipe(gulp.dest(BUILD_ROOT));

  // Homepage
  gulp.src('home/*.html')
  .pipe($.usemin({
    css: [$.autoprefixer(), $.minifyCss(), $.rev()],
    js: [$.ngmin(), $.uglify(), $.rev()],
    html: [$.minifyHtml({empty: true})]
  }))
  .pipe(gulp.dest('dist/home'));
});

var BUILD_STAMP = '<!--BUILDSTAMP-->';

gulp.task('html2js', function () {
  return gulp.src(SOURCE_ROOT + "/partials/*.html")
  .pipe($.replace(BUILD_STAMP, 'Build:' + new Date().toISOString().replace(/-|T.*/g, '')))
  .pipe($.ngHtml2js({
    moduleName: "toHELL",
    prefix: "partials/"
  }))
  .pipe($.concat('partials.js'))
  .pipe(gulp.dest(BUILD_ROOT + "/scripts/"));
});

gulp.task('imagemin', function () {
  var imgSrc = SOURCE_ROOT + '/images/*.*';
  var imgDst = BUILD_ROOT + '/images';

  gulp.src(imgSrc)
  .pipe($.changed(imgDst))
  .pipe($.imagemin())
  .pipe(gulp.dest(imgDst));
});

gulp.task('copy', function () {

  // WebApp
  gulp.src([
    '!' + SOURCE_ROOT + '/*.html',
    SOURCE_ROOT + '/*.*',
    SOURCE_ROOT + '/scripts/assets/*.*',
    SOURCE_ROOT + '/fonts/**/*'
  ], { base: SOURCE_ROOT })
  .pipe(gulp.dest(BUILD_ROOT));

  // Homepage
  gulp.src(['app/fonts/**/*'])
  .pipe(gulp.dest('dist/home/fonts'));
  gulp.src(['app/images/*'])
  .pipe(gulp.dest('dist/home/images/'));
});

gulp.task('clean', function () {
  return gulp.src([BUILD_ROOT], {read: false})
  .pipe($.clean());
});

gulp.task('build', ['usemin', 'imagemin', 'copy']);

/**
 * =====================================
 *                         Distribution
 * =====================================
 */

function sh(commands) {
  var exec = require('child_process').exec;
  var sys = require('sys');
  for (var i = 0, l = arguments.length; i < l; i++) {
    exec(arguments[i], function (error, stdout, stderr) {
      if (error != null) {
        sys.print('exec error: ' + error);
      } else {
        sys.print(stdout);
        sys.print(stderr);
      }
    });
  }
}

function distribution(tar) {
  var targets = {
    io: 'ProtoShop@protoshop.io:/var/www/ProtoShop/html/',
    ctqa: 'weiwuxu@10.2.254.48:/var/www/ProtoShop/html/',
    debug: 'weiwuxu@10.2.254.48:/var/www/Debug/html/'
  };
  var rsyncParams = ' -avz -e ssh --delete --exclude=.git* --exclude=*.scss --exclude=node_modules';
  var command = 'rsync ./dist/ ' + targets[tar] + rsyncParams;

  sh(command);
}

gulp.task('dist:io', function () {
  distribution('io');
});

gulp.task('dist:ctqa', function () {
  distribution('ctqa');
});

gulp.task('dist', function () {
  distribution('debug');
});

gulp.task('dist:all', ['dist', 'dist:ctqa', 'dist:io']);

/**
 * =====================================
 *                        General Tasks
 * =====================================
 */

gulp.task('server', ['server:dev']);

gulp.task('default', $.taskListing);
