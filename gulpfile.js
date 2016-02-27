var gulp = require('gulp');
var connect = require('gulp-connect');

gulp.task('default', ['generate-service-worker']);

gulp.task('generate-service-worker', function(callback) {
  var path = require('path');
  var swPrecache = require('sw-precache');
  var rootDir = './';

  swPrecache.write(path.join(rootDir, 'service-worker.js'), {
    staticFileGlobs: [
      rootDir + '{css,img,js}/*.{js,css,png,jpg,gif}',
      rootDir + '{css,js}/lib/*.{js,css}',
      rootDir + 'index\.html',
      rootDir + 'l10n-data\.ini',
      rootDir + 'favicon\.ico',
      rootDir + 'w3c-manifest\.json',
    ],
    stripPrefix: rootDir
  }, callback);
});

gulp.task('serve', ['generate-service-worker'], function () {
  connect.server({
    root: '.',
  });
});

