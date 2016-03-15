var gulp = require('gulp');
var oghliner = require('oghliner');
var eslint = require('gulp-eslint');
var nodemon = require('gulp-nodemon');

gulp.task('default', ['offline']);

gulp.task('build', function(callback) {
  return gulp.src('app/**').pipe(gulp.dest('dist'));
});

gulp.task('offline', ['build'], function() {
  return oghliner.offline({
    rootDir: 'dist/',
    fileGlobs: [
      'css/*.css',
      'css/lib/*.css',
      'js/app.js',
      'js/shotclock-draw.js',
      'js/lib/*.js',
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
