(function() {
  "use strict";
  if (!HTMLCanvasElement) return;
  var CRC2DP = CanvasRenderingContext2D.prototype;
  var _fillText,
    __slice = [].slice;
  _fillText = CRC2DP.fillText;

  function forEachCollection(collection, callBack) {
    var i = 0, // Array and string iteration
      iMax = 0, // Collection length storage for loop initialisation
      key = "", // Object iteration
      collectionType = "";

    // Verify that callBack is a function
    if (typeof callBack !== "function") {
      throw new TypeError(
        "forEach: callBack should be function, " + typeof callBack + " given."
      );
    }

    // Find out whether collection is array, string or object
    switch (Object.prototype.toString.call(collection)) {
      case "[object Array]":
        collectionType = "array";
        break;

      case "[object Object]":
        collectionType = "object";
        break;

      case "[object String]":
        collectionType = "string";
        break;

      default:
        collectionType = Object.prototype.toString.call(collection);
        throw new TypeError(
          "forEach: collection should be array, object or string, " +
            collectionType +
            " given."
        );
    }

    switch (collectionType) {
      case "array":
        for (i = 0, iMax = collection.length; i < iMax; i += 1) {
          callBack(collection[i], i);
        }

        break;

      case "string":
        for (i = 0, iMax = collection.length; i < iMax; i += 1) {
          callBack(collection.charAt(i), i);
        }

        break;

      case "object":
        for (key in collection) {
          // Omit prototype chain properties and methods
          if (collection.hasOwnProperty(key)) {
            callBack(collection[key], key);
          }
        }

        break;

      default:
        throw new Error(
          "Continuity error in forEach, this should not be possible."
        );
        break;
    }

    return null;
  }

  CRC2DP.fillText2 = function() {
    var args,
      offset,
      previousLetter,
      str,
      x,
      y,
      _this = this;

    (str = arguments[0]),
      (x = arguments[1]),
      (y = arguments[2]),
      (args = 4 <= arguments.length ? __slice.call(arguments, 3) : []);
    if (this.letterSpacing == null || this.letterSpacing === 0) {
      return _fillText.apply(this, arguments);
    }
    offset = 0;
    previousLetter = false;
    return forEachCollection(str, function(letter) {
      _fillText.apply(
        _this,
        [letter, x + offset /*+ _this.letterSpacing*/, y].concat(args)
      );
      offset += _this.measureText(letter).width + _this.letterSpacing;
      return (previousLetter = letter);
    });
  };
  // Ext Tooltip
  CRC2DP.boxShadow = function(x, y, w, h) {
    var c = this;
    c.save();
    c.fillStyle = "rgba(255,255,255,1)";
    c.strokeStyle = "rgba(50,50,50,1)";
    c.lineWidth = 2;
    c.shadowColor = "rgba(0,0,0,.3)";
    c.shadowBlur = 2;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
    c.beginPath();
    c.rect(x << 0, y << 0, w, h);
    c.closePath();
    c.stroke();
    c.fill();
    c.restore();
  };

  CRC2DP.tooltip = function(x, y, text, w, h) {
    var c = this,
      ww;
    ww = c.canvas.clientWidth;
    c.save();
    c.fillStyle = "rgba(255,255,255,1)";
    c.font = 12 + "px sans-serif";
    w = w || c.measureText(text).width;
    if (x + w > ww - 16) x = ww - w - 16;
    c.boxShadow(x, y, w + 16, h || 22);
    c.fillStyle = "rgba(0,0,0,1)";
    c.textAlign = "start";
    c.textBaseline = "middle";
    c.font = 12 + "px sans-serif";
    c.fillText(text, (8 + x) << 0, (11 + y) << 0);
    c.restore();
  };

  // Effects
  CRC2DP.setShadow = function(color, blur, offsetX, offsetY) {
    var c = this;
    c.shadowColor = color;
    c.shadowBlur = blur;
    c.shadowOffsetX = offsetX;
    c.shadowOffsetY = offsetY;
  };
  CRC2DP.clearShadow = function() {
    var c = this;
    c.shadowColor = "rgba(0, 0, 0, 0)";
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
  };

  // Geometry ========================================================================================================
  /*!
     \brief Прямоугольник со скругленными углами
     \param x,y Координаты левого верхнего угла
     \param w,h Значения ширины и высоты. Использовать только положительные значения.
     \param rx,ry Радиусы скругления по осям x, y

     Данная функция используется для имитации svg объекта

     \code
     <?xml version="1.0"?>
     <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
     <rect x="10" y="10" width="100" height="100" rx="15" ry="15"/>
     </svg>
     \endcode
     */
  CRC2DP.roundedRect = function(x, y, w, h, rx, ry) {
    var c = this,
      rx = rx || 4,
      ry = ry || rx;
    c.moveTo(x + rx, y);
    c.lineTo(x + w - rx, y);
    c.quadraticCurveTo(x + w, y, x + w, y + ry);
    c.lineTo(x + w, y + h - ry);
    c.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
    c.lineTo(x + rx, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - ry);
    c.lineTo(x, y + ry);
    c.quadraticCurveTo(x, y, x + rx, y);
  };

  /*!
     \brief Прямоугольник со скругленными углами (расширенный)
     \param x,y Координаты левого верхнего угла
     \param w,h Значения ширины и высоты. Использовать только положительные значения.
     \param rTopLeft, rTopRight, rBottomRight, rBottomLeft радиусы каждого угла по часовой начиная с левого верхнего угла

     Данная функция рисует прямоугольник со скругленными углами
     */
  CRC2DP.roundedRectExt = function(
    x,
    y,
    w,
    h,
    rTopLeft,
    rTopRight,
    rBottomRight,
    rBottomLeft
  ) {
    var c = this,
      rTopLeft = rTopLeft || 0,
      rTopRight = rTopRight || 0,
      rBottomLeft = rBottomLeft || 0,
      rBottomRight = rBottomRight || 0;
    c.moveTo(x + rTopLeft, y);
    c.lineTo(x + w - rTopRight, y);
    0 != rTopRight && c.quadraticCurveTo(x + w, y, x + w, y + rTopRight);
    c.lineTo(x + w, y + h - rBottomRight);
    0 != rBottomRight &&
      c.quadraticCurveTo(x + w, y + h, x + w - rBottomRight, y + h);
    c.lineTo(x + rBottomLeft, y + h);
    0 != rBottomLeft && c.quadraticCurveTo(x, y + h, x, y + h - rBottomLeft);
    c.lineTo(x, y + rTopLeft);
    0 != rTopLeft && c.quadraticCurveTo(x, y, x + rTopLeft, y);
  };

  /*!
     \brief Соеденительная линия
     \param fromX,fromY Координаты начала
     \param toX,toY Координаты конца.
     \param span Смещение центра сноски. Отступ от начала до центра сноски. При отрицательных значениях отступ от конца.
     \param angle Угол наклона сноски
     \param fromRadius,toRadius радиусы скругления сноски, соответственно.
     */
  CRC2DP.connectionLine = function(
    fromX,
    fromY,
    toX,
    toY,
    span,
    angle,
    fromRadius,
    toRadius,
    spanToCenter
  ) {
    var c = this,
      fixeEnd = false,
      angle = angle || 1.361356816555577,
      fromRadius = fromRadius || 4,
      toRadius = toRadius || fromRadius,
      minHeight = fromRadius + toRadius,
      ca = Math.cos(angle),
      sa = Math.sin(angle),
      h = Math.abs(fromY - toY),
      ss = (h * ca) / 2,
      aa = sa - ca * (1 - ca),
      x1;

    if (span !== 0 && !span) {
      span = false;
    } else if (typeof span == "number") {
      fixeEnd = span < 0;
      span = Math.abs(span);
    } else {
      //start
      fixeEnd = span == "end";
      span = ss;
    }

    if (fromX > toX) {
      toX = arguments[0];
      toY = arguments[1];
      fromX = arguments[2];
      fromY = arguments[3];
      fixeEnd = !fixeEnd;
    }
    if (h < minHeight) {
      fromRadius = ((h * fromRadius) / minHeight) << 0;
      toRadius = ((h * toRadius) / minHeight) << 0;
    }

    c.moveTo(fromX, fromY);
    var invertY = fromY > toY ? 1 : -1;
    if (Math.abs(fromY - toY) > ss && Math.abs(fromX - toX) > ss) {
      if (span !== false) {
        if (fixeEnd) {
          x1 = toX - span - (spanToCenter ? 0 : ss);
        } else {
          x1 = fromX + span + (spanToCenter ? 0 : ss);
        }
      } else {
        x1 = (fromX + toX) / 2;
      }
      if (fromRadius == 0) {
        c.lineTo(x1 - ss, fromY);
      } else {
        if (invertY == 1) {
          c.arc(
            x1 - ss - fromRadius * aa,
            fromY - fromRadius,
            fromRadius,
            Math.PI / 2,
            Math.PI / 2 - angle,
            1
          );
        } else {
          c.arc(
            x1 - ss - fromRadius * aa,
            fromY + fromRadius,
            fromRadius,
            -Math.PI / 2,
            -(Math.PI / 2 - angle),
            0
          );
        }
      }
      if (toRadius == 0) {
        c.lineTo(x1 + ss, toY);
      } else {
        if (invertY == 1) {
          c.arc(
            x1 + ss + toRadius * aa,
            toY + toRadius,
            toRadius,
            -Math.PI / 2 - angle,
            -Math.PI / 2,
            0
          );
        } else {
          c.arc(
            x1 + ss + toRadius * aa,
            toY - toRadius,
            toRadius,
            Math.PI / 2 + angle,
            Math.PI / 2,
            1
          );
        }
      }
    }
    c.lineTo(toX, toY);
  };

  CRC2DP.hexagon = function(x, y, rx, ry) {
    var ctx = this;
    var k = ry / rx,
      PI3 = Math.PI / 3;
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + Math.cos(PI3) * rx, y - Math.sin(PI3) * rx * k);
    ctx.lineTo(x + Math.cos(2 * PI3) * rx, y - Math.sin(2 * PI3) * rx * k);
    ctx.lineTo(x - rx, y);
    ctx.lineTo(x + Math.cos(4 * PI3) * rx, y - Math.sin(4 * PI3) * rx * k);
    ctx.lineTo(x + Math.cos(5 * PI3) * rx, y - Math.sin(5 * PI3) * rx * k);
    ctx.lineTo(x + rx, y);
  };
  CRC2DP.hexagon2 = function(x, y, rx, ry, ry2, k) {
    var ctx = this;
    var ry2 = ry2 || ry;

    var _x = ry * k;
    var _x2 = ry2 * k;
    ctx.moveTo(x + rx - _x, y - ry);
    ctx.lineTo(x + rx, y);
    ctx.lineTo(x + rx - _x2, y + ry2);
    ctx.lineTo(x - rx + _x2, y + ry2);
    ctx.lineTo(x - rx, y);
    ctx.lineTo(x - rx + _x, y - ry);
    ctx.lineTo(x + rx - _x, y - ry);
  };

  CRC2DP.parallelogram2 = function(x, y, rx, ry, ry2, k) {
    var ctx = this;
    var ry2 = ry2 || ry;

    var _x = ry * k;
    var _x2 = ry2 * k;
    ctx.moveTo(x + rx + _x, y - ry);
    //  ctx.lineTo(x+rx,y);
    ctx.lineTo(x + rx - _x2, y + ry2);
    ctx.lineTo(x - rx - _x2, y + ry2);
    ctx.lineTo(x - rx + _x, y - ry);
    ctx.lineTo(x + rx + _x, y - ry);
  };

  CRC2DP.drawSvg = function(x, y, scale, name, item) {
    var ctx = this;

    scale = scale / 2;

    if (!svgModel.hasOwnProperty(name)) return;
    ctx.closePath();
    ctx.beginPath();
    var _x = x,
      _y = y;

    /**/
    if (item.hasOwnProperty("__transform")) {
      _x = 0;
      _y = 0;
      item._x = item._x || 0;
      item._y = item._y || 0;
      ctx.save();
      ctx.translate(x + item._x * scale, y + item._y * scale);
      var mtx = [1, 0, 0, 1, 0, 0]; // = [1, 0, 0, 1, x + item._x * scale, y + item._y * scale];

      for (var i = 0; i < item.__transform.length; i++) {
        var transform = item.__transform[i];
        var _mtx = false;
        switch (transform.name) {
          case "matrix":
            //                        _mtx =  [transform.values[0], transform.values[1], transform.values[2], transform.values[3], transform.values[4], transform.values[5]];

            // matrix (<a> <b> <c> <d> <e> <f>) , которая задает преобразование в виде матрицы
            // преобразования шести значений. матрица (a, b, c, d, e, f) эквивалентна применению
            // матрицы преобразования [abcde f] .
            if (transform.values.length > 5) {
              _mtx = __matrix(
                transform.values[0],
                transform.values[1],
                transform.values[2],
                transform.values[3],
                transform.values[4] * scale,
                transform.values[5] * scale
              );
            }
            break;
          case "translate":
            // translate (<tx> [<ty>]) , который задает перевод по tx и ty . Если <ty> не предоставляется,
            // считается, что оно равно нулю
            var __x, __y;
            if (transform.values.length > 0) {
              __x = parseInt(transform.values[0]);
            }
            if (transform.values.length > 1) {
              __y = parseInt(transform.values[1]);
            }
            _mtx = __translate(__x * scale, __y * scale);

            break;
          case "scale":
            // scale (<sx> [<sy>]) , который определяет масштабную операцию sx и sy.
            // Если <sy> не предоставляется, предполагается, что он равен <sx>
            var __x, __y;
            if (transform.values.length > 0) {
              __x = parseInt(transform.values[0]);
            }
            if (transform.values.length > 1) {
              __y = parseInt(transform.values[1]);
            }
            _mtx = __scale(__x * scale, __y * scale);

            break;
          case "rotate":
            // rotate (<rotate-angle> [<cx> <cy>]) который определяет вращение на градусы <rotate-angle>
            // относительно данной точки.
            // Если необязательные параметры <cx> и <cy> не поставляются, поворот будет происходить из
            // текущей системы координат пользователя. Операция соответствует
            // матрице [cos (a) sin (a) -sin (a) cos (a) 0 0] .
            // Если заданы дополнительные параметры <cx> и <cy> , поворот вокруг точки ( cx , cy ).
            // Операция представляет собой эквивалент следующей спецификации:
            // translate (<cx>, <cy>) rotate (<rotate-angle>) translate (- <cx>, - <cy>) .
            var angle = parseInt(transform.values[0], 10),
              __x,
              __y;
            if (transform.values.length > 1) {
              __x = parseInt(transform.values[1]);
            }
            if (transform.values.length > 2) {
              __y = parseInt(transform.values[2]);
            }
            _mtx = __rotate(angle, __x * scale, __y * scale);
            break;
          case "skewX":
            // skewX (<skew-angle>)) , косое преобразование вдоль оси x
            break;
          case "skewY":
            // skewY (<skew-angle>)) , косое преобразование вдоль оси y
            break;
          default:
            //console.error("неизвестная трансформация", transform)
            continue;
        }
        if (_mtx) {
          ctx.transform(_mtx[0], _mtx[1], _mtx[2], _mtx[3], _mtx[4], _mtx[5]);
          _mtx = false;
        }
      }
    }

    /**/

    if (
      item.hasOwnProperty("_stroke-width") &&
      item["_stroke-width"] != "" &&
      item["_stroke-width"] != "null"
    ) {
      //        ctx.lineWidth = main.getValueX(parseInt(item['_stroke-width'], 10));
      ctx.lineWidth = parseInt(item["_stroke-width"], 10);
    }
    if (
      item.hasOwnProperty("_stroke") &&
      item._stroke != "" &&
      item["_stroke"] != "null" &&
      item["_stroke"] != "none"
    ) {
      ctx.strokeStyle = valideColor(item._stroke);
    }

    if (
      item.hasOwnProperty("_fill") &&
      item._fill != "" &&
      item._fill !== "null" &&
      item._fill !== "none"
    ) {
      ctx.fillStyle = valideColor(item._fill);
    }
    if (!item.hasOwnProperty("_stroke") && !item.hasOwnProperty("_fill")) {
      ctx.fillStyle = "rgba(0,0,0,1)";
    }

    svgModel[name](
      ctx,
      _x,
      _y,
      scale,
      item,
      item.hasOwnProperty("__transform")
    );

    /*if (item._d) {
         if (!item.hasOwnProperty('__path')) {
         item.__path = getCalcPath(
         _validationSVGPathD(item._d)
         );
         }
         getPath(ctx, main.getX(0), main.getY(0), main.scaleX, item.__path);
         }*/

    if (
      item.hasOwnProperty("_fill-opacity") &&
      item["_fill-opacity"] &&
      item["_fill-opacity"] != "null"
    ) {
      //   ctx.globalAlpha = parseFloat(item['_fill-opacity']);
    }

    if (
      item.hasOwnProperty("_fill") &&
      item._fill != "" &&
      item._fill !== "null" &&
      item._fill !== "none"
    ) {
      if (item.hasOwnProperty("_fill-rule")) {
        ctx.fill("evenodd");
      } else {
        ctx.fill(item["_fill-rule"]);
      }
    }
    // ctx.globalAlpha = 1;

    if (
      item.hasOwnProperty("_stroke-opacity") &&
      item["_stroke-opacity"] &&
      item["_stroke"] != "null"
    ) {
      ctx.globalAlpha = item["_stroke-opacity"];
    }

    if (
      item.hasOwnProperty("_stroke") &&
      item._stroke != "" &&
      item["_stroke"] != "null" &&
      item["_stroke"] != "none"
    ) {
      ctx.stroke();
    }
    if (!item.hasOwnProperty("_stroke") && !item.hasOwnProperty("_fill")) {
      //    ctx.fillStyle = 'black';
      if (item.hasOwnProperty("_fill-rule")) {
        ctx.fill("evenodd");
      } else {
        ctx.fill(item["_fill-rule"]);
      }
      /*ctx.strokeStyle = "red";
             ctx.stroke();*/
    }
    //  ctx.globalAlpha = 1;

    ctx.closePath();

    if (item.hasOwnProperty("__transform")) {
      ctx.restore();
    }
  };
})();
