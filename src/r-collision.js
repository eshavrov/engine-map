// ѕроверки на колизии
var rectCollision = {
  list: [],
  listBoundRect: [], // пр€моугольники
  listBoundSegment: [], // отрезки
  listBoundCircle: [], // окружности
  clearRect: function() {
    this.list = null;
    this.list = [];
    this.listBoundRect = [];
    this.listBoundSegment = [];
    this.listBoundCircle = [];
  },
  addRect: function(i, x, y, w, h) {
    this.list.push({
      i: i,
      visibled: true,
      rect: { x: x << 0, y: y << 0, w: w << 0, h: h << 0 }
    });
  },
  addBoundRect: function(x, y, w, h) {
    this.listBoundRect.push({
      rect: { x: x << 0, y: y << 0, w: w << 0, h: h << 0 }
    });
  },
  addBoundSegment: function(x1, y1, x2, y2) {
    this.listBoundSegment.push({
      segment: { x1: x1 << 0, y1: y1 << 0, x2: x2 << 0, y2: y2 << 0 }
    });
  },
  addBoundCircle: function(x, y, r) {
    this.listBoundCircle.push({
      circle: { x: x << 0, y: y << 0, r: r << 0 }
    });
  },
  startAlgoHide: function(sort) {
    // —амый тупой алгоритм :)
    // сортируем по x координате, далее провер€ем слева на право на пересечени€
    function compareX(a, b) {
      if (a.rect.x < b.rect.x) return -1;
      if (a.rect.x > b.rect.x) return 1;
      return 0;
    }

    if (sort && sort == 1) {
      this.list.sort(compareX);
    }
    var good = [];

    if (this.list.length > 0) {
      for (var i = 0; i < this.list.length; i++) {
        var _tmp = true;
        // проверка на ограничени€
        // пересечени€ с пр€моугольниками
        if (_tmp === true && this.listBoundRect.length > 0) {
          for (var kk = 0; kk < this.listBoundRect.length; kk++) {
            _tmp = !this.intersectsRectRect(
              this.listBoundRect[kk].rect,
              this.list[i].rect
            );
            if (_tmp == false) {
              break;
            }
          }
        }
        // пересечени€ с отрезками
        if (_tmp === true && this.listBoundSegment.length > 0) {
          for (var kk = 0; kk < this.listBoundSegment.length; kk++) {
            _tmp = !this.intersectsSegmentRect(
              this.listBoundSegment[kk].segment,
              this.list[i].rect
            );
            if (_tmp == false) {
              break;
            }
          }
        }
        // пересечени€ с окружност€ми
        if (_tmp === true && this.listBoundCircle.length > 0) {
          for (var kk = 0; kk < this.listBoundCircle.length; kk++) {
            _tmp = !this.intersectsCircleRect(
              this.listBoundCircle[kk].circle,
              this.list[i].rect
            );
            if (_tmp == false) {
              break;
            }
          }
        }
        // проверка на пересечени€ с уже отобранными
        if (_tmp === true && good.length > 0) {
          for (var kk = 0; kk < good.length; kk++) {
            _tmp = !this.intersectsRectRect(
              this.list[good[kk]].rect,
              this.list[i].rect
            );
            if (_tmp == false) {
              break;
            }
          }
        }
        if (_tmp === true) {
          good.push(i); // добовл€ем в список хороших
        }
        this.list[i].visibled = _tmp;
      }
    }
  },
  intersectsRectRect: function(rectA, rectB) {
    return (
      rectA.x < rectB.x + rectB.w &&
      rectA.x + rectA.w > rectB.x &&
      rectA.y < rectB.y + rectB.h &&
      rectA.y + rectA.h > rectB.y
    );
  },

  intersectsCircleSegment: function(circle, segment) {
    // проверка на пересечение окружности и отрезка
    var v1 = segment.x1 - segment.x2,
      v2 = segment.y1 - segment.y2,
      s = segment.x1 * segment.y2 - segment.x2 * segment.y1,
      k1 = -2 * circle.x,
      k2 = -2 * circle.y,
      f = circle.x * circle.x + circle.y * circle.y - circle.r * circle.r,
      a = v1 * v1 + v2 * v2,
      b = v1 * v1 * k1 + 2 * s * v2 + v1 * k2 * v2,
      c = f * v1 * v1 + s * s + v1 * k2 * s,
      D = b * b - 4 * a * c;
    if (D <= 0) {
      return false;
    }
    return true;
    /*
			 if(D < 0) {
			 return 0;   // не пересекаетс€
			 }else if(D < 0.001) {
			 return 1; //  осание (одна точка)
			 }
			 return 2;    // ƒве точки пересечени€
			 */
  },
  intersectsCircleRect: function(circle, rect) {
    // ѕроверка на пересечение окружности и пр€моугольника
    var _tmp = this.intersectsPointRect(circle, rect);
    return (
      _tmp ||
      this.intersectsCircleSegment(circle, {
        x1: rect.x,
        y1: rect.y,
        x2: rect.x + rect.w,
        y2: rect.y
      }) ||
      this.intersectsCircleSegment(circle, {
        x1: rect.x + rect.w,
        y1: rect.y,
        x2: rect.x + rect.w,
        y2: rect.y + rect.h
      }) ||
      this.intersectsCircleSegment(circle, {
        x1: rect.x,
        y1: rect.y + rect.h,
        x2: rect.x + rect.w,
        y2: rect.y + rect.h
      }) ||
      this.intersectsCircleSegment(circle, {
        x1: rect.x,
        y1: rect.y,
        x2: rect.x,
        y2: rect.y + rect.h
      })
    );
  },
  intersectsSegmentRect: function(segment, rect) {
    // ѕроверка на пересечение отрезка и пр€моугольника
    return (
      this.intersectsSegmentSegment(segment, {
        x1: rect.x,
        y1: rect.y,
        x2: rect.x + rect.w,
        y2: rect.y
      }) ||
      this.intersectsSegmentSegment(segment, {
        x1: rect.x + rect.w,
        y1: rect.y,
        x2: rect.x + rect.w,
        y2: rect.y + rect.h
      }) ||
      this.intersectsSegmentSegment(segment, {
        x1: rect.x,
        y1: rect.y + rect.h,
        x2: rect.x + rect.w,
        y2: rect.y + rect.h
      }) ||
      this.intersectsSegmentSegment(segment, {
        x1: rect.x,
        y1: rect.y,
        x2: rect.x,
        y2: rect.y + rect.h
      })
    );
  },
  intersectsPointRect: function(point, rect) {
    // ѕроверка на нахождение точки в пр€моугольнике
    return (
      point.x >= rect.x &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h &&
      point.x <= rect.x + rect.w
    );
  },
  intersectsSegmentSegment: function(segment1, segment2) {
    // ѕроверка на пересечение двух отрезков

    // ƒелаем быструю проверку на пересечение абцис интервалов обоих отрезков
    if (Math.max(segment1.x1, segment1.x2) < Math.min(segment2.x1, segment2.x2))
      return false;
    // ’ј
    if (segment1.x1 - segment1.x2 == 0) {
      segment1.x2 += 0.00001;
    }
    if (segment2.x1 - segment2.x2 == 0) {
      segment2.x2 += 0.00001;
    }
    // если было деление на ноль (линии вертикальные)

    var a1 = 0,
      a2 = 0; //? не факт тесты
    if (segment1.x1 - segment1.x2 != 0) {
      a1 = (segment1.y1 - segment1.y2) / (segment1.x1 - segment1.x2);
    }
    if (segment2.x1 - segment2.x2 != 0) {
      a2 = (segment2.y1 - segment2.y2) / (segment2.x1 - segment2.x2);
    }

    // если тангенсы угла налона равны, то линии паралельные
    if (a1 == a2) {
      return false;
    }
    var b1 = segment1.y1 - a1 * segment1.x1,
      b2 = segment2.y1 - a2 * segment2.x1;

    // у верен что делени€ на ноль не будет (выход реализован выше)
    var xa = (b2 - b1) / (a1 - a2); // координата по x
    //ya = a1 * xa + b1; // координата по y (не нужна дл€ проверки)
    if (
      xa <
        Math.max(
          Math.min(segment1.x1, segment1.x2),
          Math.min(segment2.x1, segment2.x2)
        ) ||
      xa >
        Math.min(
          Math.max(segment1.x1, segment1.x2),
          Math.max(segment2.x1, segment2.x2)
        )
    ) {
      return false;
    }
    return true;
  }
};
