var gulp = require('gulp');
var connect = require('gulp-connect');
var oghliner = require('oghliner');

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

gulp.task('serve', ['offline'], function () {
  connect.server({
    root: 'dist',
  });
});

