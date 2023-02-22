let preprocessor = "scss";

const { series, parallel, src, dest, watch } = require("gulp");
const babel = require("gulp-babel");
const terser = require("gulp-terser-js");
const concat = require("gulp-concat");
const browserSync = require("browser-sync").create();
const scss = require("gulp-sass")(require("sass"));
const autoprefixer = require("gulp-autoprefixer");
const cleancss = require("gulp-clean-css");
const imagemin = require("gulp-imagemin");
const newer = require("gulp-newer");
const del = require("del");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const ttf2woff = require("gulp-ttf2woff");
const ttf2woff2 = require("gulp-ttf2woff2");

const currentPage = "";

function browsersync() {
  browserSync.init({
    server: { baseDir: "src/" },
    //browser: ["firefox"],
    notify: false,
    online: true,
    port: 5000,
  });
}

function fonts() {
  src("./src/fonts/src/*.ttf").pipe(ttf2woff()).pipe(dest("./src/fonts/dest/"));
  src("./src/fonts/src/*.ttf").pipe(dest("./src/fonts/dest/"));
  return src("./src/fonts/src/*.ttf")
    .pipe(ttf2woff2())
    .pipe(dest("./src/fonts/dest/"));
}

// param dir must be view like this: {dir: "profile/"}. It's relative path from your javascript directory
function scriptsProcessing({ dir = `${currentPage}` }) {
  const baseDir = `src/js/${dir}`;

  return (
    src([`${baseDir}*.js`, `!src/js/${dir}*.min.js`])
      //
      // .pipe(sourcemaps.init())
      .pipe(concat("all.min.js"))
      .pipe(
        babel({
          presets: ["@babel/env"],
        })
      )
      .pipe(
        terser({
          mangle: {
            toplevel: true,
          },
        })
      )
      .on("error", function (error) {
        this.emit("end");
      })
      // .pipe(sourcemaps.write())
      // .pipe(rename({suffix: '.min'}))
      .pipe(dest(`src/js/` + `${dir}`))
      .pipe(browserSync.stream())
  );
}

// param dir must be view like this: {dir: "profile/"}. It's relative path from your css preprocessor directory
function styles({ dir = `${currentPage}` }) {
  return (
    src(`src/${preprocessor}/` + `${dir}` + `main.${preprocessor}`)
      // .pipe( (preprocessor == 'sass' || preprocessor == 'scss')  &&  eval(preprocessor)({outputStyle: 'compressed'}) || eval(preprocessor)() )
      .pipe(eval(preprocessor).sync())
      .pipe(concat("all.min.css"))
      .pipe(
        autoprefixer({ overrideBrowserslist: ["last 10 versions"], grid: true })
      )
      .pipe(
        cleancss({
          level: { 1: { specialComments: 0 } } /* , format: 'beautify' */,
        })
      )
      .pipe(dest(`src/css/${dir}`))
      .pipe(browserSync.stream())
  );
}

function images() {
  return src("src/images/src/**/*") // Берём все изображения из папки источника
    .pipe(newer("src/images/dest/")) // Проверяем, было ли изменено (сжато) изображение ранее
    .pipe(imagemin()) // Сжимаем и оптимизируем изображеня
    .pipe(dest("src/images/dest/")); // Выгружаем оптимизированные изображения в папку назначения
}

function buildcopy() {
  return src(
    [
      "src/css/**/*.min.css",
      "src/js/**/*.min.js",
      "src/images/dest/**/*",
      "src/middleware/**/*",
      "src/**/*.html",
      "src/fonts/dest/*.woff",
      "src/fonts/dest/*.woff2",
      "src/fonts/dest/*.ttf",
      "!src/**/.keep",
    ],
    { base: "src" }
  ) // Параметр "base" сохраняет структуру проекта при копировании
    .pipe(dest("dist")); // Выгружаем в папку с финальной сборкой
}

function startwatch() {
  watch(["src/**/*.js", "!src/**/*.min.js"], scriptsProcessing);
  watch(`src/${preprocessor}/**/*`, styles); // 'src/**/' + preprocessor + '/**/*'
  watch("src/**/*.html").on("change", browserSync.reload);
  watch("src/images/src/**/*", images);
}

exports.browsersync = browsersync;
exports.fonts = fonts;
exports.scripts = scriptsProcessing;
exports.styles = styles;
exports.build = series(styles, scriptsProcessing, images, buildcopy);
exports.default = series(
  images,
  parallel(styles, scriptsProcessing, browsersync, startwatch)
);
