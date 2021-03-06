var gulp = require('gulp');
var sass = require('gulp-sass');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var serve = require('gulp-serve');
var livereload = require('gulp-livereload');
var autoprefixer = require('gulp-autoprefixer');
var shell = require('gulp-shell');


gulp.task('default', ['html', 'scss', 'js', 'libs']);

gulp.task('html', function() {
  gulp.src('html/**/*.html')
    .pipe(gulp.dest('public'))
    .pipe(livereload());
});
 
gulp.task('scss', function () {
  gulp.src('scss/app.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest('public'))
    .pipe(livereload());
});

gulp.task('js', function () {
	gulp.src('js/app.js')
		.pipe(babel({
			presets: ['es2015']
		}))
    .pipe(uglify({
      compress: {
        "drop_debugger": false
      }
    }))
		.pipe(gulp.dest('public'))
    .pipe(livereload());
});

gulp.task('libs', function() {
  return gulp.src('js/lib/**/*.js')
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('public'));
});

gulp.task('deploy', shell.task('git checkout master && firebase deploy && git checkout -') );

gulp.task('serve', serve({
  root: ['public']
}));

gulp.task('watch', ['default', 'serve'], function () {
  livereload.listen();
  gulp.watch('html/**/*.html', ['html']);
  gulp.watch('scss/**/*.scss', ['scss']);
  gulp.watch('js/app.js', ['js']);
});