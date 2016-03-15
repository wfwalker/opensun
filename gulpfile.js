var gulp = require('gulp');
var oghliner = require('oghliner');
var eslint = require('gulp-eslint');
var nodemon = require('gulp-nodemon');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('default', ['offline']);

gulp.task('compress', function(){
  return gulp.src([
    'app/js/lib/jquery.js',
    'app/js/lib/date.js',
    'app/js/lib/l10n.js',
    'app/js/lib/ol.js',
    'app/js/lib/sun-angle-utils.js',
    'app/js/shotclock-draw.js',
    'app/js/app.js',
  ])
    .pipe(sourcemaps.init())
    .pipe(concat('compressed.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('app/js'));
});

gulp.task('build', ['compress'], function(callback) {
  return gulp.src('app/**').pipe(gulp.dest('dist'));
});

gulp.task('offline', ['build'], function() {
  return oghliner.offline({
    rootDir: 'dist/',
    fileGlobs: [
      'css/*.css',
      'css/lib/*.css',
      'js/lib/pathseg.js',
      'js/compressed.js',
      'img/*.{png,jpg,gif}',
      'img/icons/*.{png,jpg,gif}',
      'index\.html',
      'l10n-data\.ini',
      'favicon\.ico',
      'w3c-manifest\.json',
    ],
  });
});

gulp.task('lint', function() {
  return gulp.src(['app/js/{app,shotclock-draw,tests}.js']).pipe(eslint({
    'rules':{
        'quotes': [1, 'single'],
        'semi': [1, 'always'],
        'comma-dangle': [1, 'always-multiline'],
        'quote-props': [1, 'as-needed']
    }
  })).pipe(eslint.format());
});

gulp.task('deploy', function() {
  return oghliner.deploy({
    rootDir: 'dist',
  });
});

gulp.task('serve', ['offline'], function() {
  nodemon({
    script: 'server.js'
  });
});
