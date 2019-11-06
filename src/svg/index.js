/** --- SVG ----------------------------------------------------------------- */
/*!
 \brief object SVG
 \param path строка описывающая траекторию/контур фигуры
 */
function SvgJsonStructure(json, opt) {
  var that = this;
  this.root = {};
  this.load = function(svgJson, options) {
    var o = options;
    if (!o.verified) {
      this.root = _validationSVG(svgJson);
    } else {
      this.root = Object.assign({}, svgJson);
    }
    return this.root;
  };

  if (json) {
    this.load(json, opt);
  }
}

/*!
 \brief Проверка/изменение параметра "d" элемента <path>
 \param path строка описывающая траекторию/контур фигуры
 */
//function valideSVGPath(path) {
function _validationSVGPathD(path) {
  var i,
    char,
    left,
    right,
    count,
    resultPath = "",
    cleanPath = path.replace(/[0-9]*\.[0-9]*/g, function(x) {
      return (+x).toFixed(2);
    });
  cleanPath = cleanPath.replace(/\s{2,}/g, " ");
  function isNumber(code) {
    return code >= 45 && code <= 57;
  }

  for (i = 0, count = cleanPath.length; i < count; i++) {
    char = cleanPath.charCodeAt(i);
    if (char == 32 && i > 0 && i < cleanPath.length - 1) {
      left = cleanPath.charCodeAt(i - 1);
      right = cleanPath.charCodeAt(i + 1);
      if (isNumber(left) && isNumber(right)) {
        resultPath += ",";
      } else if (isNumber(left) && !isNumber(right)) {
        resultPath += "";
      }
    } else {
      resultPath += cleanPath[i];
    }
  }
  return resultPath;
}

/*!
 \brief Проверка/изменение параметра "d" элемента <path>
 \param path строка описывающая траекторию/контур фигуры
 */
// Пробежаться по всем атрибутам и заменить числовые на number
function _validationSVG(object) {
  var result = {},
    p,
    typeObj,
    src;
  typeObj = toString.call(object);
  if (typeObj == "[object Object]") {
    src = object;
  } else if (typeObj == "[object Array]") {
    src = object;
    result = new Array();
  } else {
    src = object;
  }
  for (p in src) {
    if (src.hasOwnProperty(p)) {
      typeObj = toString.call(src[p]);
      if (typeObj == "[object Object]" || typeObj == "[object Array]") {
        switch (p) {
          case "svg":
          case "g":
          case "text":
          case "line":
          case "path":
          case "circle":
          case "ellipse":
          case "rect":
          case "tspan":
          case "polyline":
          case "polygon":
            // объект или массив, то проверять вглубь
            result[p] = _validationSVG(src[p]);
            break;

          default:
            if ("" + parseInt(p, 10) == p) {
              result[p] = _validationSVG(src[p]);
            } else {
              // console.log("o ignore", p, src[p]);
            }
        }
      } else {
        // Примитив
        switch (p) {
          case "_x":
          case "_y":
          case "_x1":
          case "_y1":
          case "_x2":
          case "_y2":
          case "_cx":
          case "_cy":
          case "_r":
          case "_rx":
          case "_ry":
          case "_font-size":
          case "_stroke-width":
          case "_width":
          case "_height":
            result[p] = parseInt(src[p], 10);
            break;
          case "_transform":
            result[p] = src[p];
            result["__transform"] = parseTransform(src[p]);
            break;
          case "_d":
          case "_title":
          case "__text":
          case "_fill":
          case "_stroke":
          case "_fill-rule":
          case "_opacity":
          case "_stroke-linecap": //round ?
          case "_stroke-linejoin": //round ?
          case "_overflow": //visible ?
          case "_id":
          case "_offset": //?
          case "_stroke-miterlimit": //10 ?
          case "_font-family":
          case "_font-weight": //bold
          case "_letter-spacing":
          case "_points":
            result[p] = src[p];
            break;
          default:
          // console.log("p ignore", p, src[p]);
        }
      }
    }
  }
  return result;
}

function parseTransform(value) {
  function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  }

  function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
  }

  var res = [],
    sep = " ",
    values,
    events;
  value = replaceAll(value, ",", " ").replace(/\s+/g, " ");
  events = value.split(")");
  for (var i = events.length; i--; ) {
    events[i] = events[i].replace(/^\s*/, "").replace(/\s*$/, "");
    var chank = events[i].split("(");

    if (chank.length > 1) {
      values = chank[1].split(sep);
      res.push({
        name: chank[0],
        values: values
      });
    }
  }
  return res;
}

function angleBetween(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
