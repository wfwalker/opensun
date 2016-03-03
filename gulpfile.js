var gulp = require('gulp');
var connect = require('gulp-connect');
var oghliner = require('oghliner');
var eslint = require('gulp-eslint');

gulp.task('default', ['offline']);

gulp.task('build', function(callback) {
  return gulp.src('app/**').pipe(gulp.dest('dist'));
});

gulp.task('offline', ['build'], function() {
  return oghliner.offline({
    rootDir: 'dist/',
    fileGlobs: [
      '{css,img,js}/*.{js,css,png,jpg,gif}',
      '{css,js}/lib/*.{js,css}',
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

gulp.task('serve', ['offline'], function () {
  connect.server({
    root: 'dist',
    port: 8081,
  });
});

