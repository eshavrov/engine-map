// namespace:
this.emjs = this.emjs || {};
(function () {
    var Container = function () {
        this.version = '1.1.0';
    };
    var p = Container.prototype;
    // содержит основные параметры сцены
    p.main = {};
    p.data = null;


    // Обозреватель
    p.observer = {
        moveX: 0, // текущая координата мыши
        moveY: 0, // текущая координата мыши
        mouse: false // не подключен модуль обработки мыши
    }
    p.iterationCount = 0; // колличество перерисовок сцены (ре-рендер)
    p._drag = false;  // признак перемещения сцены в контейнере

    p.config = function (options) {
        // значения main по умолчанию
        var cfgDefault = {
            tooltipText: "",
            tooltipShow: false,
            width: 100,
            height: 100,
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            twinScaling: true, // спаренный скроллинг сцены (равномерное изменение обцис и ординат)
            // события
            onBeforeRender: null,
            onAfterRender: null,
            timeRender: 0,
            canvasMaskEnabled: false
        }
        this.main = this.merge(cfgDefault, options || {});
        // определение Х координаты на сцене (из мировых в координаты сцены)
        this.main.getX = function (x) {
            if (!isNaN(this.x) && !isNaN(this.scaleX)) {
                return (this.x + x * this.scaleX) << 0;
            } else {
                return 0;
            }
        }
        // определение Y координаты на сцене (из мировых в координаты сцены)
        this.main.getY = function (y) {
            if (!isNaN(this.y) && !isNaN(this.scaleY)) {
                return (this.y + y * this.scaleY) << 0;
            } else {
                return 0;
            }
        }
        /*    this.main.getY = function (y) {
         if (!isNaN(this.y) && !isNaN(this.scaleY)) {
         var _y= (this.y + y * this.scaleY) << 0;
         var yc=800;
         var ycMax=12000/this.scaleY;
         var dy =yc-_y;
         var k=1+dy/ycMax;
         //if (k>4) k=4;
         if (k<1) k=1;




         return yc-dy/k;
         } else {
         return 0;
         }
         }
         */
        // определение Х размера на сцене (из мировых в координаты сцены)
        this.main.getValueX = function (value, no_round) {
            if (!isNaN(this.scaleX)) {
                if (no_round){
                    return (value * this.scaleX);
                }
                return (value * this.scaleX) << 0;
            } else {
                return 0;
            }
        }
        this.main.calcXValue = function (value) {
            if (!isNaN(this.scaleX)) {
                return value / this.scaleX;
            } else {
                return 0;
            }
        }
        // определение Y размера на сцене (из мировых в координаты сцены)
        this.main.getValueY = function (value) {
            if (!isNaN(this.scaleY)) {
                return (value * this.scaleY) << 0;
            } else {
                return 0;
            }
        }
        this.main.getSceneX = function (x) {
            if (!isNaN(this.x) && !isNaN(this.scaleX)) {
                return ((x - this.x) / this.scaleX) << 0;
            } else {
                return 0;
            }
        }
        // определение Y координаты на сцене (из мировых в координаты сцены)
        this.main.getSceneY = function (y) {
            if (!isNaN(this.y) && !isNaN(this.scaleY)) {
                return ((y - this.y)/ this.scaleY) << 0;
            } else {
                return 0;
            }
        }
    };

    p.init = function () {
        this.canvas = this.main.el;
        this.canvas.width = this.main.width;
        this.canvas.height = this.main.height;
        this.canvas.ctx = this.ctx = this.canvas.getContext("2d");
        this.layers = new Array();
        this.sortLayers = new Array();
        if (this.main.canvasMaskEnabled) {
            this.canvasMask = document.createElement('canvas');
            this.canvasMask.id = 'emjs-canvas-mask';
            this.canvasMask.width = this.main.width;
            this.canvasMask.height = this.main.height;
            this.canvasMask.style.cssText = this.canvas.style.cssText
            this.canvasMask.style.display = "inline-block";
            this.canvas.parentNode.insertBefore(this.canvasMask, this.canvas.nextSibling);
            this.canvasMask.ctx = this.ctxMask = this.canvasMask.getContext("2d");
            this.main.elObserver = this.canvasMask;
        } else {
            this.main.elObserver = this.canvas;
        }

    }

    // переписать копирует толко объекты верхнего уровня
    p.merge = function () {
        var obj, name, copy,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length;
        for (; i < length; i++) {
            if ((obj = arguments[i]) != null) {
                for (name in obj) {
                    copy = obj[name];
                    if (target === copy) {
                        continue;
                    }
                    else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }
        return target;
    };


    // -----------------------------------------------------------------------------------------------------------------
    var SceneLayers = {
        Layer: function (name, id) {
            if (typeof(name) === "undefined") {
                this.name = "undefined";  // наименование слоя по умолчанию
            } else {
                this.name = name; // наименование слоя
            }

            if (typeof(id) === "undefined") {
                this.id = 0;
            } else {
                this.id = id;
            }

            this.visible = false;	// Показать слой или скрыть
            this.onBeforeLayerRender = null; // до
            this.onRender = null;
            this.onAfterLayerRender = null; // после
            this.onClearLayerData = null; // после
        }
    }

    SceneLayers.Layer.prototype.getCanvas = function () {
        return this.canvas;
    }

    SceneLayers.Layer.prototype.getName = function () {
        return this.name;
    }

    SceneLayers.Layer.prototype.render = function (ctx, main) {
        if (!this.isVisible()) return;
        if (this.onBeforeLayerRender != null) this.onBeforeLayerRender(ctx, main, 0); // ошибка!
        if (this.onRender != null) this.onRender(ctx, main, 0); // ошибка!
        if (this.onAfterLayerRender != null) this.onAfterLayerRender(ctx, main, 0); // ошибка!
    }

    SceneLayers.Layer.prototype.isVisible = function () {
        return this.visible;
    }

    SceneLayers.Layer.prototype.hide = function () {
        if (this.visible) {
            this.visible = false;
        }
    }

    SceneLayers.Layer.prototype.show = function () {
        if (!this.visible) {
            this.visible = true;
        }
    }
    p.clearLayersData = function () {
        if (this.layers && this.layers.length > 0) {
            for (var i = 0; i < this.layers.length; i++) {
                var layer = this.layers[i];
                if (layer.onClearLayerData != null) {
                    layer.onClearLayerData();
                }
            }
        }
        this.coerceRenderScene();
        this.refreshScene();
    }
    // -----------------------------------------------------------------------------------------------------------------
    p.addLayer = function (name, onRender, visible, id, before, after, clear) {
        var layer = new SceneLayers.Layer(name, id);
        layer.onRender = onRender;
        if (before) {
            layer.onBeforeLayerRender = before;
        }
        if (after) {
            layer.onAfterLayerRender = after;
        }
        if (clear) {
            layer.onClearLayerData = clear;
        }

        if (visible && visible === true) {
            layer.show();
        }
        this.layers.push(layer);
    }

    p.layerVisible = function (name, stat) {
        var bb = false;
        for (var i = this.sortLayers.length; i--;) {
            if (name == this.sortLayers[i]) {
                bb = true;
                if (stat == false)
                    this.sortLayers.slice(i, 1);
                break;
            }
        }
        if (stat && !bb) {
            this.sortLayers.push(name);
        }


        if (this.layers && this.layers.length > 0) {
            for (var i = 0; i < this.layers.length; i++) {
                if (this.layers[i].name == name) {
                    this.layers[i].visible = stat;
                    // Найти привязанную маску этого слоя
                    if (this.maskLayers && this.maskLayers.length > 0) {
                        for (var j = 0; j < this.maskLayers.length; j++) {
                            if (this.maskLayers[j].idRenderScene == this.layers[i].id) {
                                this.maskLayers[j].enable = stat;
                                break; // предположим что не бывает двойных масок
                            }

                        }
                    }
                    break;
                }
            }
        }
        this.coerceRenderScene();
    }
    p.layerAllVisible = function (stat) {
        this.sortLayers = [];

        if (this.layers && this.layers.length > 0) {
            for (var i = 0; i < this.layers.length; i++) {
                this.layers[i].visible = stat;
            }
        }
        this.coerceRenderScene();
    }

    p.layerSeparateVisibility = function (name, stat) {
        this.sortLayers = [];
        if (this.layers && this.layers.length > 0) {
            if (this.maskLayers && this.maskLayers.length > 0) {
                for (var j = 0; j < this.maskLayers.length; j++) {
                    this.maskLayers[j].enable = !stat;
                }
            }
            if (typeof name == 'string') {
                if (stat) {
                    this.sortLayers.push(name);
                } else {
                    for (var i = this.sortLayers.length; i--;) {
                        if (name == this.sortLayers[i]) {
                            this.sortLayers.slice(i, 1);
                        }
                    }

                }
                for (var i = 0; i < this.layers.length; i++) {
                    if (this.layers[i].name == name) {
                        this.layers[i].visible = stat;
                        // Найти привязанную маску этого слоя
                        if (this.maskLayers && this.maskLayers.length > 0) {
                            for (var j = 0; j < this.maskLayers.length; j++) {
                                if (this.maskLayers[j].idRenderScene == this.layers[i].id) {
                                    this.maskLayers[j].enable = stat;
                                    break;
                                }
                            }
                        }

                    } else {
                        this.layers[i].visible = !stat;
                        // Найти привязанную маску этого слоя
                        /* if (engineMap.maskLayers && engineMap.maskLayers.length > 0) {
                         for (var j = 0; j < engineMap.maskLayers.length; j++) {
                         if (engineMap.maskLayers[j].idRenderScene == this.layers[i].id) {
                         engineMap.maskLayers[j].enable = !stat;

                         break;
                         }
                         }
                         }*/
                    }
                }
            } else if (typeof name == 'object' && name.length > 0) {
                for (var k = 0; k < name.length; k++) {
                    this.sortLayers.push(name[k]);
                }

                for (var i = 0; i < this.layers.length; i++) {
                    var _bb = true;
                    for (var k = 0; k < name.length; k++) {
//                        this.sortLayers.push(name[k]);
                        if (this.layers[i].name == name[k]) {
                            this.layers[i].visible = stat;
                            _bb = false;
                            // Найти привязанную маску этого слоя
                            if (this.maskLayers && this.maskLayers.length > 0) {
                                for (var j = 0; j < this.maskLayers.length; j++) {
                                    if (this.maskLayers[j].idRenderScene == this.layers[i].id) {
                                        this.maskLayers[j].enable = stat;
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                    }
                    if (_bb) {
                        this.layers[i].visible = !stat;
                        // Найти привязанную маску этого слоя
                        /* if (engineMap.maskLayers && engineMap.maskLayers.length > 0) {
                         for (var j = 0; j < engineMap.maskLayers.length; j++) {
                         if (engineMap.maskLayers[j].idRenderScene == this.layers[i].id) {
                         engineMap.maskLayers[j].enable = !stat;
                         break;
                         }
                         }
                         }*/
                    }
                }


            }

        }
        this.coerceRenderScene();
    }


    p.needToReRenderScene = function () {
        // Возвращает разрешения на reRender сцены и маски соответственно
        return [true, true];
    }

    p.maskRender = function () {
        return;
    }

    p.drawScene = p.refreshScene = function () {
        var need = this.needToReRenderScene();
        if (!need[0]) {
            if (need[1]) {
                this.maskRender();
            }
            return;
        }
        this.iterationCount++;
        var timeBegin = new Date();
        if (this.main.onBeforeRender != null) this.main.onBeforeRender();
        if (this.canvas && this.canvas.getContext) {
            this.ctx.clearRect(0, 0, this.main.width, this.main.height);
            if (this.layers && this.layers.length > 0) {
                for (var i = 0, iCount = this.layers.length; i < iCount; i++) {
                    this.layers[i].__ = true;
                }

                for (var j = 0, jCount = this.sortLayers.length; j < jCount; j++) {

                    for (var i = 0, iCount = this.layers.length; i < iCount; i++) {
                        if (this.sortLayers[j] == this.layers[i].name && this.layers[i].__ && this.layers[i].visible) {
                            this.layers[i].render(this.ctx, this.main);
                            this.layers[i].__ = false;
                        }
                    }
                }


                for (var i = 0, iCount = this.layers.length; i < iCount; i++) {
                    if (this.layers[i].visible && this.layers[i].__) {
                        this.layers[i].render(this.ctx, this.main);
                        this.layers[i].__ = false;
                    }
                }
            }
        }

        if (this.main.onAfterRender != null) this.main.onAfterRender();
        if (!this.needRender.coerceNotRenderMask) {
            // если нет запрета на маску(при перемещении, например)
            this.maskRender();// перерисовать маску
        }
        this.needRender.coerceNotRenderMask = false;

        var timeEnd = new Date();
        this.main.timeRender = timeEnd.getTime() - timeBegin.getTime()
    }

    p.resizeCanvas = function (width, height) {
        if (this.canvas) {
            this.main.width = width;
            this.main.height = height;
            this.canvas.width = this.main.width;
            this.canvas.height = this.main.height;
            if (this.canvasMask) {
                this.canvasMask.width = this.main.width;
                this.canvasMask.height = this.main.height;
            }

            this.canvas.ctx = this.ctx = this.canvas.getContext("2d");
            if (this.canvasMask) {
                this.canvasMask.ctx = this.ctxMask = this.canvasMask.getContext("2d");
            }
        }
    }
    p.getIterations = function () {
        return this.iterationCount;
    }

    p.showToolTipText = function (text, mouse) {
        this.main.tooltipShow = true;
        this.main.tooltipText = text;
        this.main.tooltipRender = false;
        if (!text) this.main.tooltipShow = false;
        this.moveToolTip(mouse);
    }
    p.showToolTipRender = function (render, data, mouse) {
        this.main.tooltipShow = true;
        this.main.tooltipText = false;
        this.main.tooltipRender = render;
        this.main.tooltipRenderData = data;
        this.moveToolTip(mouse);
    }

    p.hideToolTip = function () {
        if (this.main.tooltipShow === true) {
            this.main.tooltipShow = false;
            this.ctxMask.clearRect(0, 0, this.main.width, this.main.height);
        }

    }

    p.moveToolTip = function (mouse) {
        if (this.main.tooltipShow) {
            this.ctxMask.clearRect(0, 0, this.main.width, this.main.height);
            if (this.ctxMask) {
                if (this.main.tooltipText) {
                    this.ctxMask.tooltip(mouse.x, mouse.y + 24, this.main.tooltipText);
                } else if (this.main.tooltipRender) {
                    this.main.tooltipRender(this.ctxMask, this.main.tooltipRenderData, mouse.x, mouse.y + 24);
                }

            }


        }
    }


// ---------------------------------------------------------------------------------------------------------------------
// Обработчик мыши
// ---------------------------------------------------------------------------------------------------------------------
    p.observer.mouse = true; // Включен модуль обработки мыши
    // внутренние события (расширения)
    p.observer._extMouseMove = null;
    p.observer._extMouseDown = null;
    p.observer._extMouseUp = null;
    p.observer._extMouseWheel = null;
    p.observer._extMouseOut = null;
    p.observer._extMouseOver = null;

//     p._mouseMove = null;
//     p._mouseDown = null;
//     p._mouseUp = null;
//     p._mouseWheel = null;
//     p._mouseOut = null;
//     p._mouseOver = null;
    // Описание мышки
    p.mouse = {
        x: 0, y: 0, lastX: 0, lastY: 0, button: -1, wheel: 0, drag: 0,
        downX: 0, downY: 0 // Координаты позизии мыши в момент нажатия
    }

    p.mouseControls = function (options, target) {
        options = options || {};
        var cursor = options.cursor || "off";

        // События пользователя
        var customMouseMove = options.mouseMove || null;
        var customMouseDown = options.mouseDown || null;
        var customMouseUp = options.mouseUp || null;
        var customMouseWheel = options.mouseWheel || null;
        var customMouseOut = options.mouseOut || null;
        var customMouseOver = options.mouseOver || null;
        // внутренние события (расширения)
        if (!!options._extMouseMove && typeof options._extMouseMove == "function") this.observer._extMouseMove = options._extMouseMove;
        if (!!options._extMouseDown && typeof options._extMouseDown == "function") this.observer._extMouseDown = options._extMouseDown;
        if (!!options._extMouseUp && typeof options._extMouseUp == "function") this.observer._extMouseUp = options._extMouseUp;
        if (!!options._extMouseWheel && typeof options._extMouseWheel == "function") this.observer._extMouseWheel = options._extMouseWheel;
        if (!!options._extMouseOut && typeof options._extMouseOut == "function") this.observer._extMouseOut = options._extMouseOut;
        if (!!options._extMouseOver && typeof options._extMouseOver == "function") this.observer._extMouseOver = options._extMouseOver;
        if (cursor !== "on") {
            if (cursor === "off") {
                target.main.elObserver.style.cursor = 'none';
            }
            else {
                target.main.elObserver.style.cursor = cursor;
            }
        }

        // двигаем мышкой
        this._mouseMove = function (e) {
            e.preventDefault();
            //  M.mouse.x = e.offsetX;
            //  M.mouse.y = e.offsetY;
            if (!e.offsetX) {
                //Mozilla
                target.mouse.x = e.clientX;
                target.mouse.y = e.clientY;
            } else {
                // Chrome
                target.mouse.x = e.offsetX;
                target.mouse.y = e.offsetY;
            }

            target.mouse.wheel = 0;
            if (target.mouse.button != -1) {
                target.mouse.drag = 1;
            }
            if (target.mouse.lastX != target.mouse.x || target.mouse.lastY != target.mouse.y) {
                if (!!target.observer._extMouseMove && typeof target.observer._extMouseMove == "function") target.observer._extMouseMove(target.mouse, e);
                if (!!customMouseMove && typeof customMouseMove == "function") customMouseMove(target.mouse, e);
            }
            target.mouse.lastX = target.mouse.x;
            target.mouse.lastY = target.mouse.y;
        };
        // нажили на мышь
        this._mouseDown = function (e) {
            e.preventDefault();
            target.mouse.button = e.button;
            target.mouse.downX = target.mouse.x;
            target.mouse.downY = target.mouse.y;
            if (!!target.observer._extMouseDown && typeof target.observer._extMouseDown == "function") target.observer._extMouseDown(target.mouse, e);
            if (!!customMouseDown && typeof customMouseDown == "function") customMouseDown(target.mouse, e);
        };
        // отжали мышь

        this._mouseUp = function (e) {
            e.preventDefault();
            target.mouse.drag = 2;
            target.mouse.button = e.button;

            if (!!target.observer._extMouseUp && typeof target.observer._extMouseUp == "function") target.observer._extMouseUp(target.mouse, e);
            if (!!customMouseUp && typeof customMouseUp == "function") customMouseUp(target.mouse, e);
            target.mouse.button = -1;
        };
        // скролл
        this._mouseWheel = function (e) {
            if (false == !!e) e = window.e;
            var direction = ((e.wheelDelta) ? e.wheelDelta / 120 : e.detail / -3) || false;
            target.mouse.wheel = direction;
            if (direction) {
                if (!!target.observer._extMouseWheel && typeof target.observer._extMouseWheel == "function") target.observer._extMouseWheel(target.mouse, e);
                if (!!customMouseWheel && typeof customMouseWheel == "function") customMouseWheel(target.mouse, e);
            }
        };
        // курсор вышел из области элемента
        this._mouseOut = function (e) {
            target.mouse.button = -1; // отключить драг
            target.mouse.drag = 0;
            if (!!target.observer._extMouseOut && typeof target.observer._extMouseOut == "function") target.observer._extMouseOut(target.mouse, e);
            if (!!customMouseOut && typeof customMouseOut == "function") customMouseOut(target.mouse, e);
        };
        // курсор попал в область элемента
        this._mouseOver = function (e) {
            target.mouse.button = -1; // отключить драг
            target.mouse.drag = 0;
            if (!!target.observer._extMouseOver && typeof target.observer._extMouseOver == "function") target.observer._extMouseOver(target.mouse, e);
            if (!!customMouseOver && typeof customMouseOver == "function") customMouseOver(target.mouse, e);
        };
        if (this.main.elObserver.addEventListener) {
            this.main.elObserver.addEventListener("mousemove", this._mouseMove, false);
            this.main.elObserver.addEventListener('mousedown', this._mouseDown, false);
            this.main.elObserver.addEventListener('mouseup', this._mouseUp, true);
            this.main.elObserver.addEventListener("DOMMouseScroll", this._mouseWheel, false);
            this.main.elObserver.onmousewheel = this._mouseWheel;
            this.main.elObserver.onmouseout = this._mouseOut;
            this.main.elObserver.onmouseover = this._mouseOver;
        }
    }

// ---------------------------------------------------------------------------------------------------------------------
// Обработчик внутреннего обозревателя
// ---------------------------------------------------------------------------------------------------------------------
//   M.observer: {
//        move: true,   // авто перемещение
//        autoRendering: true, // авто обновление
//        zoomDeltaX: 2, // коэффициент масштаба
//        zoomDeltaY: 2, // коэффициент масштаба
//        baseScaleX: 1, // база масштаба
//        baseScaleY: 1, // база масштаба
//        zoomLevelX: 0, // Уровень зума относително базы
//        zoomLevelY: 0, // Уровень зума относително базы
//        scalingType: 'twin', // 'twin','x','y'
//        discreteBasisScale: false,
//        scope: false,
//        scopeXLeft: null,
//        scopeXRight: null,
//        scopeYTop: null,
//        scopeYBottom: null,
//        fixScaling: 'none' - none, min, max, custom Фиксация при мастабе
//        minScaleX: null,-- пользовательские ограничения масштаба
//        minScaleY: null,
//        maxScaleX: null,
//        maxScaleY: null
//        ----------
//        minScaleFreeze: - определяет минимальный масштаб между X или Y в зависимости от значения fixScaling
//        dX: - ширина окна обозревателя в мировых координатах
//        dY: - высота окна обозревателя в мировых координатах
//        freezeScaleX,freezeScaleY: - заморозка масштаба (-1,0,1) -1 - нижний порог +1-верхний 0 - не имееет блокировки -2 заблокирован полностью
//    }

    p.observerControls = function (options, target, maskEnabled) {
        // Создаем массив масок
        if (!maskEnabled) {
            this.maskLayers = new Array();
        } else {
            if (!this.maskLayers)
                this.maskLayers = new Array();
        }
        this.iterationMaskCount = 0;
        this.iterationMaskShowCount = 0;

        var optDefault = {
            move: true,   // авто перемещение
            autoRendering: true, // авто обновление
            zoomDeltaX: 2, // коэффициент масштаба
            zoomDeltaY: 2, // коэффициент масштаба
            baseScaleX: 1, // база масштаба
            baseScaleY: 1, // база масштаба
            zoomLevelX: 0, // Уровень зума относително базы
            zoomLevelY: 0, // Уровень зума относително базы
            scalingType: 'twin', // 'twin','x','y'
            discreteBasisScale: false,
            scope: false,
            scopeXLeft: null,
            scopeXRight: null,
            scopeYTop: null,
            scopeYBottom: null,
            fixScaling: 'none', // none, min, max, custom
            minScaleX: null,
            minScaleY: null,
            maxScaleX: null,
            maxScaleY: null
        }
        this.observer = this.merge(optDefault, options || {});
        this.calcObserver();
        this.scopeCalculation(this.main, true);

        if (this.observer.mouse === false) return;
        if (this.observer.move === true) {
            this.observer._extMouseMove = function (mouse, e) {
                if (mouse.button != -1) {   // drag map
                    target.main.x = target.observer.moveX + mouse.x;
                    target.main.y = target.observer.moveY + mouse.y;
                    target.scopeCalculation(target.main, false);
                    target._drag = true;
                    target.needRender.coerceNotRenderMask = true;
                    target.drawScene(); // нужно передать признак
                }
            }
            this.observer._extMouseUp = function (mouse, e) {
                target.observer.moveX = 0;
                target.observer.moveY = 0;
                target._drag = false;
                if (target.mouse.downX != target.mouse.x || target.mouse.downY != target.mouse.y) {
                    target.needRender.coerceMask = true; //принудить к перерисовке маски
                    target.needRender.coerceNotRenderMask = false; // снять запрет на перерисовку маски (если кто то наложил)
                }
                target.drawScene(); // нужно передать признак
            }
            this.observer._extMouseDown = function (mouse, e) {
                target.observer.moveX = target.main.x - mouse.x;
                target.observer.moveY = target.main.y - mouse.y;
            }
            this.observer._extMouseWheel = function (mouse, e) {
                target.zoom({
                    x: mouse.x,
                    y: mouse.y
                }, mouse.wheel);
                target.drawScene(); // нужно передать признак
            }
        }
    }

    p.zoom = function (position, z) {
        var scale_calcX = this.main.scaleX;
        var scale_calcY = this.main.scaleY;
        if (z > 0) {
            if (this.observer.freezeScaleX <= 0 && this.observer.freezeScaleX != -2) {
                this.observer._baseScaleX = this.observer._baseScaleX * this.observer.zoomDeltaX;
                this.observer.freezeScaleX = 0;
                this.observer.zoomLevelX++;
            }
            if (this.observer.freezeScaleY <= 0 && this.observer.freezeScaleY != -2) {
                this.observer._baseScaleY = this.observer._baseScaleY * this.observer.zoomDeltaY;
                this.observer.freezeScaleY = 0;
                this.observer.zoomLevelY++;
            }

        } else {
            if (this.observer.freezeScaleX >= 0 && this.observer.freezeScaleX != -2) {
                this.observer._baseScaleX = this.observer._baseScaleX / this.observer.zoomDeltaX;
                this.observer.freezeScaleX = 0;
                this.observer.zoomLevelX--;
            }
            if (this.observer.freezeScaleY >= 0 && this.observer.freezeScaleY != -2) {
                this.observer._baseScaleY = this.observer._baseScaleY / this.observer.zoomDeltaY;
                this.observer.freezeScaleY = 0;
                this.observer.zoomLevelY--;
            }
        }
        this.main.scaleX = this.observer._baseScaleX;
        this.main.scaleY = this.observer._baseScaleY;
        var last = {
            x: this.main.x,
            y: this.main.y,
            scale_calcX: scale_calcX,
            scale_calcY: scale_calcY,
            mouseX: position.x,
            mouseY: position.y,
            freezeX: this.observer.freezeScaleX,
            freezeY: this.observer.freezeScaleX
        }

        if (this.observer.freezeScaleX == 0)
            this.main.x = position.x - (position.x - this.main.x) / scale_calcX * this.main.scaleX;
        if (this.observer.freezeScaleY == 0)
            this.main.y = position.y - (position.y - this.main.y) / scale_calcY * this.main.scaleY;

        this.scopeCalculation(this.main, true, last);
        //M.drawScene(); // нужно передать признак
    }

    p.scopeCalculation = function (main, scaling, last) {

        var ddX = 0;
        var ddY = 0;

        // Проверка на пользовательские ограничения масштаба
        // Минимальные
        if (this.observer.minScaleX && this.main.scaleX <= this.observer.minScaleX) {
            var tmp = getZoomLevelBase(this.observer.minScaleX, this.observer.baseScaleX, this.observer.zoomDeltaX);
            if (this.observer.discreteBasisScale) {
                this.main.scaleX = tmp.scale;
            } else this.main.scaleX = this.observer.minScaleX;
            this.observer._baseScaleX = tmp.scale;
            this.observer.zoomLevelX = tmp.level;
            this.observer.freezeScaleX = -1;
        }

        if (this.observer.minScaleY && this.main.scaleY <= this.observer.minScaleY) {
            var tmp = getZoomLevelBase(this.observer.minScaleY, this.observer.baseScaleY, this.observer.zoomDeltaY);
            if (this.observer.discreteBasisScale) {
                this.main.scaleY = tmp.scale;
            } else this.main.scaleY = this.observer.minScaleY;
            this.observer._baseScaleY = tmp.scale;
            this.observer.zoomLevelY = tmp.level;
            this.observer.freezeScaleY = -1;
        }
        // Максимальные
        if (this.observer.maxScaleX && this.main.scaleX >= this.observer.maxScaleX) {
            var tmp = getZoomLevelBase(this.observer.maxScaleX, this.observer.baseScaleX, this.observer.zoomDeltaX);
            if (this.observer.discreteBasisScale) {
                this.main.scaleX = tmp.scale;
            } else this.main.scaleX = this.observer.maxScaleX;
            this.observer._baseScaleX = tmp.scale;
            this.observer.zoomLevelX = tmp.level;
            //  if (M.observer.freezeScaleX==-1){M.observer.freezeScaleX=-2;} else
            this.observer.freezeScaleX = 1;
        }
        if (this.observer.maxScaleY && this.main.scaleY >= this.observer.maxScaleY) {
            var tmp = getZoomLevelBase(this.observer.maxScaleY, this.observer.baseScaleY, this.observer.zoomDeltaY);
            if (this.observer.discreteBasisScale) {
                this.main.scaleY = tmp.scale;
            } else this.main.scaleY = this.observer.maxScaleY;
            this.observer._baseScaleY = tmp.scale;
            this.observer.zoomLevelY = tmp.level;
            // if (M.observer.freezeScaleY==-1){M.observer.freezeScaleY=-2;} else
            this.observer.freezeScaleY = 1;
        }

        if (last) { // В случае блокировки пересчитать положение бля нового зума
            if (last.freezeX == 0 && this.observer.freezeScaleX != 0)
                this.main.x = last.mouseX - (last.mouseX - last.x) / last.scale_calcX * this.main.scaleX;
            if (last.freezeY == 0 && this.observer.freezeScaleY != 0)
                this.main.y = last.mouseY - (last.mouseY - last.y) / last.scale_calcY * this.main.scaleY;
        }

        if (this.observer.scope === true) {

            // Определяем фиксацию масштабирования, если заданы границы объекта
            if (scaling) {
                if (this.observer.minScaleFreeze && this.main.scaleY < this.observer.minScaleFreeze) {
                    if (!this.observer.discreteBasisScale) {
                        this.main.scaleY = this.observer.minScaleFreeze;
                        this.main.scaleX = this.main.scaleY;
                    }
                    this.observer.freezeScaleX = -1;
                    this.observer.freezeScaleY = -1;
                }
            }

            if (this.observer.scopeXLeft != null && this.observer.scopeXRight != null) {
                if (main.width > this.observer.dX * main.scaleX) {
                    ddX = ((main.width - this.observer.dX * main.scaleX) / main.scaleX / 2) << 0;
                }
            }

            if (this.observer.scopeYTop != null && this.observer.scopeYBottom != null) {
                if (main.height > this.observer.dY * main.scaleY) {
                    ddY = ((main.height - this.observer.dY * main.scaleY) / main.scaleY / 2) << 0;
                }
            }

            if (this.observer.scopeXLeft != null) {
                var xl = -main.x / main.scaleX;
                if (xl < (this.observer.scopeXLeft - ddX)) {
                    this.main.x = -(this.observer.scopeXLeft - ddX) * main.scaleX;
                }
            }

            if (this.observer.scopeXRight != null) {
                var xr = (main.width - main.x) / main.scaleX;
                if (xr > (this.observer.scopeXRight + ddX)) {
                    this.main.x = -(this.observer.scopeXRight + ddX) * main.scaleX + main.width;
                }
            }

            if (this.observer.scopeYTop != null) {
                var yt = main.y / main.scaleY;
                if (yt > (-this.observer.scopeYTop + ddY)) {
                    this.main.y = (-this.observer.scopeYTop + ddY) * main.scaleY;
                }
            }

            if (this.observer.scopeYBottom != null) {
                var yb = (-main.height + main.y) / main.scaleY;
                if (yb < (-this.observer.scopeYBottom - ddY)) {
                    this.main.y = (-this.observer.scopeYBottom - ddY) * main.scaleY + main.height;
                }
            }

        }
    }

    p.resize = function (width, height) {
        this.resizeCanvas(width, height);
        // изменить размер маскам
        this.maskLayersReSize(width, height);

        this.calcObserver();
        this.scopeCalculation(this.main, true);
    }

    p.setScope = function (xLeft, yTop, xRight, yBottom) {
        this.observer.scopeXLeft = xLeft;
        this.observer.scopeXRight = xRight;
        this.observer.scopeYTop = yTop;
        this.observer.scopeYBottom = yBottom;
        this.main.scaleX = this.observer.baseScaleX;
        this.main.scaleY = this.observer.baseScaleY;

        this.calcObserver();
        this.scopeCalculation(this.main, true);
    }
    p.minScale = function () {
        // console.log('+++');
        this.main.scaleX = this.observer.minScaleFreeze;
        this.main.scaleY = this.observer.minScaleFreeze;
        this.observer._baseScaleX = this.main.scaleX;
        this.observer._baseScaleY = this.main.scaleY;
        var tmp = getZoomLevelBase(this.observer.minScaleX, this.observer.baseScaleX, this.observer.zoomDeltaX);
        this.observer.zoomLevelX = tmp.level;
        this.observer.freezeScaleX = -1;

        var tmp = getZoomLevelBase(this.observer.minScaleY, this.observer.baseScaleY, this.observer.zoomDeltaY);
        this.observer.zoomLevelY = tmp.level;
        this.observer.freezeScaleY = -1;


        this.scopeCalculation(this.main, true);

    }


    p.calcObserver = function () {
        this.observer.dX = 0;
        this.observer.dY = 0;
        this.observer.freezeScaleX = 0; // блокировка zoom X (-1, 0 , 1)
        this.observer.freezeScaleY = 0; // блокировка zoom Y (-1, 0 , 1)


        if (this.observer.scopeXLeft != null && this.observer.scopeXRight != null) {
            if (this.observer.scopeXRight < this.observer.scopeXLeft) {
                var tmp = this.observer.scopeXRight;
                this.observer.scopeXRight = this.observer.scopeXLeft;
                this.observer.scopeXLeft = tmp;
            }
            this.observer.dX = this.observer.scopeXRight - this.observer.scopeXLeft;
        }

        if (this.observer.scopeYTop != null && this.observer.scopeYBottom != null) {
            if (this.observer.scopeYBottom < this.observer.scopeYTop) {
                var tmp = this.observer.scopeYTop;
                this.observer.scopeYTop = this.observer.scopeYBottom;
                this.observer.scopeYBottom = tmp;
            }
            this.observer.dY = this.observer.scopeYBottom - this.observer.scopeYTop;
        }
        this.observer.minScaleScopeX = null;
        this.observer.minScaleScopeY = null;
        if (this.observer.dX != 0) this.observer.minScaleScopeX = this.main.width / this.observer.dX;
        if (this.observer.dY != 0) this.observer.minScaleScopeY = this.main.height / this.observer.dY;
        /*
         if (this.observer.discreteBasisScale === true && this.observer.baseScaleX > 0) {
         var newX = Math.floor(this.observer.minScaleScopeX / this.observer.baseScaleX) * this.observer.baseScaleX;
         var newY = Math.floor(this.observer.minScaleScopeY / this.observer.baseScaleX) * this.observer.baseScaleY;
         if (Math.abs(this.observer.minScaleScopeX - newX) > Math.abs(newX + this.observer.baseScaleX - this.observer.minScaleScopeX)){
         this.observer.minScaleScopeX = newX + this.observer.baseScaleX;
         } else {
         this.observer.minScaleScopeX = newX;
         }
         if (Math.abs(this.observer.minScaleScopeY - newY) > Math.abs(newY + this.observer.baseScaleY - this.observer.minScaleScopeY)){
         this.observer.minScaleScopeY = newY + this.observer.baseScaleY;
         } else {
         this.observer.minScaleScopeY = newY;
         }
         }
         */
        //Определяем блокирующий нижний масштаб
        this.observer.minScaleFreeze = null;
        switch (this.observer.fixScaling) {
            case 'min':
                if (this.observer.minScaleScopeX != null && this.observer.minScaleScopeY != null) {
                    if (this.observer.minScaleScopeX >= this.observer.minScaleScopeY) {
                        this.observer.minScaleFreeze = this.observer.minScaleScopeX;
                    } else {
                        this.observer.minScaleFreeze = this.observer.minScaleScopeY;
                    }
                } else {
                    if (this.observer.minScaleScopeX != null) this.observer.minScaleFreeze = this.observer.minScaleScopeX;
                    if (this.observer.minScaleScopeY != null) this.observer.minScaleFreeze = this.observer.minScaleScopeY;
                }
                break;
            case 'max':
                if (this.observer.minScaleScopeX != null && this.observer.minScaleScopeY != null) {
                    if (this.observer.minScaleScopeX <= this.observer.minScaleScopeY) {
                        this.observer.minScaleFreeze = this.observer.minScaleScopeX;
                    } else {
                        this.observer.minScaleFreeze = this.observer.minScaleScopeY;
                    }
                } else {
                    if (this.observer.minScaleScopeX != null) this.observer.minScaleFreeze = this.observer.minScaleScopeX;
                    if (this.observer.minScaleScopeY != null) this.observer.minScaleFreeze = this.observer.minScaleScopeY;
                }
                break;
            case 'custom':
                break;
            default://none
        }

        // Опеределяем текущее смещение базы мастаба
        /* this.main.scaleX = this.observer.minScaleFreeze;
         this.main.scaleY = this.observer.minScaleFreeze;
         */
        var tmpX = getZoomLevelBase(Math.max(this.observer.minScaleFreeze, this.main.scaleX), this.observer.baseScaleX, this.observer.zoomDeltaX);
        var tmpY = getZoomLevelBase(Math.max(this.observer.minScaleFreeze, this.main.scaleY), this.observer.baseScaleY, this.observer.zoomDeltaY);
/*
        var tmpX = getZoomLevelBase(this.main.scaleX, this.observer.baseScaleX, this.observer.zoomDeltaX);
        var tmpY = getZoomLevelBase(this.main.scaleY, this.observer.baseScaleY, this.observer.zoomDeltaY);
*/
        this.observer._baseScaleX = tmpX.scale;
        this.observer.zoomLevelX = tmpX.level;
        this.observer._baseScaleY = tmpY.scale;
        this.observer.zoomLevelY = tmpY.level;

        if (this.observer.discreteBasisScale === true) {
            // если мастаб дискретен базе, то текущий масштаб равен базе текущего масштаба
            this.main.scaleX = this.observer._baseScaleX;
            this.main.scaleY = this.observer._baseScaleY;
        }

    }


    function log(x, b) {
        return Math.log(x) / Math.log(b);
    }

    p.setMinZoomLevelX = function (level) {
        this.observer.minScaleX = levelZoomToBaseScale(level, this.observer.baseScaleX, this.observer.zoomDeltaX);
    }
    p.setMinZoomLevelY = function (level) {
        this.observer.minScaleY = levelZoomToBaseScale(level, this.observer.baseScaleY, this.observer.zoomDeltaY);
    }
    p.setMinZoomLevel = function (level) {
        this.setMinZoomLevelX(level);
        this.setMinZoomLevelY(level);
    }

    p.setMaxZoomLevelX = function (level) {
        this.observer.maxScaleX = levelZoomToBaseScale(level, this.observer.baseScaleX, this.observer.zoomDeltaX);
    }
    p.setMaxZoomLevelY = function (level) {
        this.observer.maxScaleY = levelZoomToBaseScale(level, this.observer.baseScaleY, this.observer.zoomDeltaY);
    }
    p.setMaxZoomLevel = function (level) {
        this.setMaxZoomLevelX(level);
        this.setMaxZoomLevelY(level);
    }

    function levelZoomToBaseScale(level, base, delta) {
        if (delta <= 0) {
            return 1;
        }
        if (level == 0) {
            return base;
        } else if (level > 0) {
            return Math.pow(delta, level) * base;
        } else {
            return Math.pow(1 / delta, -level) * base;
        }
    }

    p.getBaseScaleX = function (z) {
        return levelZoomToBaseScale(z, this.observer.baseScaleX, this.observer.zoomDeltaX);
    }
    p.getBaseScaleY = function (z) {
        return levelZoomToBaseScale(z, this.observer.baseScaleY, this.observer.zoomDeltaY);
    }

    // определить уровень масштаба и значение масштаба базы, от текущего масштаба
    function getZoomLevelBase(scale, base, delta) {
        var res = {
            level: 0,
            scale: base
        }
        if (base < scale) {
            res.level = (log(scale / base, delta) << 0);
            res.scale = Math.pow(delta, res.level) * base;
        } else if (base > scale) {
            res.level = -((log(scale / base, 1 / delta) << 0));
            res.scale = Math.pow(1 / delta, -res.level) * base;
        }
        return res;
    }

    p.getZLB = function (scale, base, delta) {
        return getZoomLevelBase(scale, base, delta);
    }


// ---------------------------------------------------------------------------------------------------------------------
// Работа с маской
// ---------------------------------------------------------------------------------------------------------------------

    p.MaskImage = {
        ImageData: function (width, height, enabled) {
            this.dx = 4;
            this.dy = 4;
            width = (width / this.dx) << 0;
            height = (height / this.dy) << 0;
            // Размер области вывода
            this.width = width;
            this.height = height;
            p.MaskImage.dx = this.dx;
            p.MaskImage.dy = this.dy;
            this.diagonal = Math.sqrt(width * width + height * height);
            this.lineWidth = 0;
            this.name = 'maskLayerImage';
            if (enabled) {
                this.enable = enabled;
            } else {
                this.enable = false;
            }
            //
            p.data = null;

            p.data = [
                new Int16Array(height * width),
                new Int8Array(height * width)
            ];

            for (var i = 0; i < (height * width); i++) {
                p.data[0][i] = -1; // [index,group]
                p.data[1][i] = -1; // [index,group]
            }
            this.index = -1;
            this.group = -1;
            this.pathArray = [];
            this.idRenderScene = -1;// нет связи с рендором сцены
            this.onRender = null;
            this.lineWidths = [
                [0, 1],
                [0, 1],
                [0, 2],
                [-1, 2],
                [-1, 3],
                [-2, 3],
                [-2, 4],
                [-3, 4]
            ];
            this.compare = {
                v0: function (a, b) {
                    if (a[0] < b[0])
                        return -1;
                    if (a[0] > b[0])
                        return 1;
                    return 0;
                },
                v1: function (a, b) {
                    if (a[1] < b[1])
                        return -1;
                    if (a[1] > b[1])
                        return 1;
                    return 0;
                },
                v2: function (a, b) {
                    if (a[2] < b[2])
                        return -1;
                    if (a[2] > b[2])
                        return 1;
                    return 0;
                }
            };
        }
    }

    p.addMask = function (name, onRender, idRenderScene) {
        var mask = new this.MaskImage.ImageData(this.main.width, this.main.height);
        mask.onRender = onRender;
        if (typeof(idRenderScene) === "undefined") {
            mask.idRenderScene = -1;
        } else {
            mask.idRenderScene = idRenderScene;
        }
        this.maskLayers.push(mask);
    }

    p.maskRender = function () {
        this.iterationMaskCount++;
        if (this.maskLayers && this.maskLayers.length > 0) {
            for (var i = 0; i < this.maskLayers.length; i++) {
                if (this.maskLayers[i].enable) {
                    // если включена маска, то
                    this.maskLayers[i].render(this);
                }
            }
        }
    }
    p.maskLayersReSize = function (width, height) {
        this.resizeCanvas(width, height);
        // именить размер маскам
        if (this.maskLayers && this.maskLayers.length > 0) {
            for (var i = 0; i < this.maskLayers.length; i++) {
                this.maskLayers[i].resize(width, height);
            }
        }
    }

    p.getObjects = function (x, y) {
        x = (x / p.MaskImage.dx) << 0;
        y = (y / p.MaskImage.dy) << 0;
        var tmp = new Array();
        if (this.maskLayers && this.maskLayers.length > 0) {
            for (var i = 0; i < this.maskLayers.length; i++) {
                if (this.maskLayers[i].enable) {
                    // если включена маска, то
                    var _select = this.maskLayers[i].getPixel(x, y, true);
                    if (_select[0] != -1) {
                        tmp.push(_select);
                    }
                }
            }
        }
        return tmp;
    }
    p.getObject = function (x, y) {
        x = (x / p.MaskImage.dx) << 0;
        y = (y / p.MaskImage.dy) << 0;

        if (this.maskLayers && this.maskLayers.length > 0) {
            for (var i = this.maskLayers.length - 1; i >= 0; i--) {
                if (this.maskLayers[i].enable) {
                    // если включена маска, то
                    var _select = this.maskLayers[i].getPixel(x, y, true);
                    if (_select[0] != -1) {
                        return _select;
                    }
                }
            }
        }
        return [-1, -1];
    }

    // Очистка области
    p.MaskImage.ImageData.prototype.clearRect = function () {
        if (p.data[0].length > 0) {
            for (var i = 0, iCount = p.data[0].length; i < iCount; i++) {
                p.data[0][i] = -1;
                p.data[1][i] = -1;
            }
        }
    }
    p.MaskImage.ImageData.prototype.resize = function (width, height) {

        p.data = null;

        p.data = [
            new Int16Array(height * width),
            new Int8Array(height * width)
        ];

        for (var i = 0; i < (height * width); i++) {
            p.data[0][i] = -1; // [index,group]
            p.data[1][i] = -1; // [index,group]
        }
        this.width = width;
        this.height = height;
        this.diagonal = Math.sqrt(width * width + height * height);

    }

    p.MaskImage.ImageData.prototype.putPixel = function (x, y, color, vect, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0

            );


        if (isNaN(color)) {
            color = this.index;
        } else {
            this.index = color;
        }
        if (isNaN(vect)) vect = 1;

        if ((this.lineWidth < 2 || vect == 0) && x < this.width && x >= 0 && y < this.height && y >= 0) {
            p.data[0] [x + y * this.width] = color;
            p.data[1] [x + y * this.width] = this.group;
        } else if (x < this.width && x >= 0 && y < this.height && y >= 0) {
            var index = this.lineWidth;
            if (index > this.lineWidths.length - 1) {
                index = this.lineWidths.length - 1;
            }
            for (var j = this.lineWidths[index][0]; j < this.lineWidths[index][1]; j++) {
                for (var i = this.lineWidths[index][0]; i < this.lineWidths[index][1]; i++) {
                    if (x + i < this.width && x + i >= 0 && y + j < this.height && y + j >= 0) {
                        p.data[0][x + i + (y + j) * this.width] = color;
                        p.data[1][x + i + (y + j) * this.width] = this.group;
                    }
                }
            }
        }
    }
    //


    p.MaskImage.ImageData.prototype.moveToStroke = function (x, y, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0
            );
        this.moveTo(x, y, true);
        this.putPixel(x, y, this.index, undefined, true);
    }
    p.MaskImage.ImageData.prototype.lineToStroke = function (x, y, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0
            );
        this.lineTo(x, y, true);
        var iEnd = this.pathArray.length;
        if (this.pathArray.length > 1) {
            this.drawLine(this.pathArray[iEnd - 1][0], this.pathArray[iEnd - 1][1], x, y, true);
        }
    }
    p.MaskImage.ImageData.prototype.cutLine = function (x1, y1, x2, y2, minimization) {
//         эта функция должна обрезать линию по границам активного окна и возвращать
//         true, если надо рисовать хоть что-то,
//         false - если рисовать ничего не надо, т.е. линия целиком лежит вне окна.
        return true;
    }

    p.MaskImage.ImageData.prototype.hLine = function (x1, x2, y, vect, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x1 = (x1 / this.dx) << 0,
                x2 = 1 + (x2 / this.dx) << 0,
                y = (y / this.dy) << 0
            );

        if (isNaN(vect)) vect = 1;
        if (x1 > x2) {
            var t = x1;
            x1 = x2;
            x2 = t;
        }
        if (y < this.height && y >= 0 && x1 < this.width) {
            if (x1 < 0) x1 = 0;
            if (x2 > this.width) x2 = this.width - 1;
            while (x1 <= x2) this.putPixel(x1++, y, this.index, vect, true);
        }
    }


    p.MaskImage.ImageData.prototype.vLine = function (y1, y2, x, vect, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            y1 = (y1 / this.dy) << 0,
                y2 = 1 + (y2 / this.dy) << 0,
                x = (x / this.dx) << 0
            );
        if (isNaN(vect)) vect = 1;
        if (y1 > y2) {
            var t = y1;
            y1 = y2;
            y2 = t;
        }
        if (x < this.width && x >= 0 && y1 < this.height) {
            if (y1 < 0) y1 = 0;
            if (y2 > this.height) x2 = this.height - 1;
            while (y1 <= y2) this.putPixel(x, y1++, this.index, vect, true);
        }
    }

    p.MaskImage.ImageData.prototype.fillRect = function (x, y, w, h, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0,
                w = 1 + (w / this.dx) << 0,
                h = 1 + (h / this.dy) << 0
            );

        if (x < 0 && x + w < 0 || x >= this.width) return;
        if (y < 0 && y + h < 0 || y >= this.height) return;
        if (x + w > this.width)
            w = this.width - x;
        if (y + h > this.height)
            h = this.height - y;

        if (w >= 0 && h >= 0) {
            for (var i = 0; i < h; i++) {
                this.hLine(x, x + w - 1, y + i, undefined, true);
            }
        }
    }

    p.MaskImage.ImageData.prototype.strokeRect = function (x, y, w, h, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0,
                w = 1 + (w / this.dx) << 0,
                h = 1 + (h / this.dy) << 0
            );

        if (x < 0 && x + w < 0 || x >= this.width) return;
        if (y < 0 && y + h < 0 || y >= this.height) return;
        if (x + w > this.width)
            w = this.width - x;
        if (y + h > this.height)
            h = this.height - y;

        if (w >= 0 && h >= 0) {
            this.hLine(x, x + w - 1, y, undefined, true);
            this.hLine(x, x + w - 1, y + h - 1, undefined, true);
            this.vLine(y, y + h - 1, x, undefined, true);
            this.vLine(y, y + h - 1, x + w - 1, undefined, true);
        }
    }

    p.MaskImage.ImageData.prototype.drawLine = function (x1, y1, x2, y2, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x1 = (x1 / this.dx) << 0,
                y1 = (y1 / this.dy) << 0,
                x2 = 1 + (x2 / this.dx) << 0,
                y2 = 1 + (y2 / this.dy) << 0
            );

        if (y1 == y2) {
            this.hLine(x1, x2, y1, undefined, true);
        } else if (x1 == x2) {
            this.vLine(y1, y2, x1, undefined, true);
        } else if (this.cutLine(x1, y1, x2, y2)) {
            var Z = 0;
            var kx, ky, max_dev, step_small;
            // выбираем направление рисования
            if (Math.abs(x1 - x2) >= Math.abs(y1 - y2)) {     // по горизонтали
                // всегда рисуем слева направо
                if (x1 > x2) {
                    var t = x1;
                    x1 = x2;
                    x2 = t;
                    t = y1;
                    y1 = y2;
                    y2 = t;
                }
                // коэффициенты прямой
                kx = Math.abs(y2 - y1);
                ky = x2 - x1;
                // начинаем рисовать
                step_small = (y1 > y2) ? -1 : 1;
                max_dev = ky >> 1;
                while (x1 <= x2) {
                    this.putPixel(x1, y1, this.index, undefined, true);

                    x1++;
                    if (x1 > this.width - 1) {
                        break;
                    }
                    Z += kx;
                    if (Z > max_dev) {
                        y1 += step_small;
                        Z -= ky;
                    }
                }
            } else {                          // по вертикали
                // всегда рисуем сверху вниз
                if (y1 > y2) {
                    var t = x1;
                    x1 = x2;
                    x2 = t;
                    t = y1;
                    y1 = y2;
                    y2 = t;
                }
                // коэффициенты прямой
                kx = y2 - y1;
                ky = Math.abs(x2 - x1);
                // начинаем рисовать
                step_small = (x1 > x2) ? -1 : 1;
                max_dev = kx >> 1;
                while (y1 <= y2) {
                    this.putPixel(x1, y1, this.index, undefined, true);
                    y1++;
                    if (y1 > this.height - 1) {
                        break;
                    }
                    Z += ky;
                    if (Z > max_dev) {
                        x1 += step_small;
                        Z -= kx;
                    }
                }
            }
        }
    }


    p.MaskImage.ImageData.prototype.drawCircle = function (x, y, r, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0,
                r = 1 + (r / this.dx) << 0

            );
        var z0 = 0, x0 = 0, y0 = r;
        while (x0 <= y0) {
            this.putPixel(x - x0, y - y0, undefined, undefined, true);
            this.putPixel(x - x0, y + y0, undefined, undefined, true);
            this.putPixel(x + x0, y - y0, undefined, undefined, true);
            this.putPixel(x + x0, y + y0, undefined, undefined, true);
            this.putPixel(x - y0, y - x0, undefined, undefined, true);
            this.putPixel(x - y0, y + x0, undefined, undefined, true);
            this.putPixel(x + y0, y - x0, undefined, undefined, true);
            this.putPixel(x + y0, y + x0, undefined, undefined, true);
            if (z0 > 0) {
                y0--;
                z0 -= y0;
                z0 -= y0;
            }
            x0++;
            z0 += x0;
            z0 += x0;
        }
    }

    p.MaskImage.ImageData.prototype.fillCircle = function (x, y, r, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0,
                r = 1 + (r / this.dx) << 0

            );
        var z0 = 0, x0 = 0, y0 = r;
        if ((x + r >= 0 && x - r < this.width) && (y + r >= 0 && y - r < this.height)) {
            if (r > this.diagonal) {
                this.fillRect(0, 0, this.width - 1, this.height - 1, minimization);
                return;
            }
            while (x0 <= y0) {
                if (x > 0) {
                    if (y > 0) {
                        this.vLine(y - y0, y, x - x0, undefined, true);
                        this.vLine(y - x0, y, x - y0, undefined, true);
                    }
                    if (y < this.height) {
                        this.vLine(y + 1, y + y0, x - x0, undefined, true);
                        this.vLine(y + 1, y + x0, x - y0, undefined, true);
                    }
                }
                if (x < this.width) {
                    if (y > 0) {
                        this.vLine(y - y0, y, x + x0, undefined, true);
                        this.vLine(y - x0, y, x + y0, undefined, true);
                    }

                    if (y < this.height) {
                        this.vLine(y + 1, y + y0, x + x0, undefined, true);
                        this.vLine(y + 1, y + x0, x + y0, undefined, true);
                    }
                }
                if (z0 > 0) {
                    y0--;
                    z0 -= y0;
                    z0 -= y0;
                }
                x0++;
                z0 += x0;
                z0 += x0;
            }
        }
    }

    p.MaskImage.ImageData.prototype.moveTo = function (x, y, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0
            );
        this.pathArray.length = 0;
        this.pathArray.push([x << 0, y << 0]);
    }

    p.MaskImage.ImageData.prototype.cleanPath = function () {
        this.pathArray.length = 0;
    }

    p.MaskImage.ImageData.prototype.beginPath = function () {
        // this.pathArray.length = 0;
    }
    p.MaskImage.ImageData.prototype.measureText = function (text) {
        // this.pathArray.length = 0;
        return {width: text.length * 8 / this.dx};
    }

    p.MaskImage.ImageData.prototype.lineTo = function (x, y, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0

            );
        this.pathArray.push([x << 0, y << 0]);
    }

    p.MaskImage.ImageData.prototype.bezierCurveTo = function (x1, y1, x2, y2, x3, y3, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x1 = (x1 / this.dx) << 0,
                y1 = (y1 / this.dy) << 0,
                x2 = (x2 / this.dx) << 0,
                y2 = (y2 / this.dy) << 0,
                x3 = (x3 / this.dx) << 0,
                y3 = (y3 / this.dy) << 0
            );
        this.pathArray.push([((x1 + x2) / 2) << 0, ((y1 + y2) / 2) << 0]);
        this.pathArray.push([((x2 + x3) / 2) << 0, ((y2 + y3) / 2) << 0]);
        this.pathArray.push([x3 << 0, y3 << 0]);

    }


    p.MaskImage.ImageData.prototype.stroke = function () {
        if (this.pathArray.length > 1) {
            for (var i = 0; i < this.pathArray.length - 1; i++) {
                this.drawLine(this.pathArray[i][0], this.pathArray[i][1], this.pathArray[i + 1][0], this.pathArray[i + 1][1], true);
            }
        }
    }

    p.MaskImage.ImageData.prototype.fill = function () {
        if (this.pathArray.length > 1) {

            if (this.pathArray.length > 1) {
                var my = this.pathArray[0][1] << 0;
                for (var i = 0; i < this.pathArray.length; i++) {
                    //  this.pathArray[i][0] = this.pathArray[i][0]<<0;
                    //  this.pathArray[i][1] = this.pathArray[i][1]<<0;
                    if (my < this.pathArray[i][1]) {
                        my = this.pathArray[i][1]
                    }
                }

                for (var i = 0; i < this.pathArray.length; i++) {
                    if (this.pathArray[i][1] == my) {
                        break;
                    } else {
                        var tmp = this.pathArray.shift();
                        this.pathArray.push(tmp);
                    }
                }
            }


            var pAE = [],
                pGET = [],
                pAET = []; // AET
            function getAET(sl, target) {
                // 1. Удаляю ребра из AET
                if (pAET && pAET.length > 0) {
                    for (var i = 0; i < pAET.length; i++) {
                        if (pAET[i][0] === sl) {
                            pAET.splice(i, 1);
                            i--;
                        }
                    }
                }
                // 2. изменяю x координаты в AET
                if (pAET && pAET.length > 0) {
                    for (var i = 0; i < pAET.length; i++) {
                        pAET[i][1] += pAET[i][2];
                    }
                }
                // 3. добавляю ребра в AET (из GET в AET)
                if (pGET && pGET.length > 0) {
                    do {
                        if (pGET[0][0] === sl) {
                            var line = pGET.shift();
                            pAET.push([line[1], line[2], line[3]]);
                        } else {
                            break;
                        }
                    } while (pGET.length > 0);
                }
                // 4. сортирую AET
                pAET.sort(target.compare.v1);
            }

            if (this.pathArray && this.pathArray.length > 1) {
                var ymin = 0,
                    ymax = 0,
                    xval = 0;
                for (var i = 0; i < this.pathArray.length; i++) {
                    var _f = i,
                        _t = 0;
                    if (i < this.pathArray.length - 1) {
                        _t = i + 1;
                    } else {
                        _t = 0;
                    }
                    var m = null;
                    if (this.pathArray[_f][1] > this.pathArray[_t][1]) {
                        ymin = this.pathArray[_t][1];
                        xval = this.pathArray[_t][0];
                        ymax = this.pathArray[_f][1];
                    } else if (this.pathArray[_f][1] < this.pathArray[_t][1]) {
                        ymin = this.pathArray[_f][1];
                        xval = this.pathArray[_f][0];
                        ymax = this.pathArray[_t][1];
                    } else {
                        ymin = this.pathArray[_f][1];
                        ymax = this.pathArray[_t][1];
                        if (this.pathArray[_f][0] < this.pathArray[_t][0]) { //??? нужно проверить
                            xval = this.pathArray[_f][0];
                        } else {
                            xval = this.pathArray[_t][0];
                        }
                    }
                    if (this.pathArray[_f][1] != this.pathArray[_t][1]) {
                        m = (this.pathArray[_f][0] - this.pathArray[_t][0]) / (this.pathArray[_f][1] - this.pathArray[_t][1]);
                    }
                    pAE.push([ymin, ymax, xval, m]);
                }
            }
            if (pAE && pAE.length > 0) {
                pGET.push([pAE[0][0], pAE[0][1], pAE[0][2], pAE[0][3]]);
                if (pAE.length > 1) {
                    for (var i = 1; i < pAE.length; i++) {
                        if (pAE[i][3] != null) {
                            pGET.push([pAE[i][0], pAE[i][1], pAE[i][2], pAE[i][3]]);
                        }
                    }
                }
            }
            pGET.sort(this.compare.v2);
            pGET.sort(this.compare.v1);
            pGET.sort(this.compare.v0);
            if (pGET && pGET.length > 0) {
                for (var sl = pGET[0][0], slCount = pGET[pGET.length - 1][1] + 1; sl < slCount; sl++) {
                    getAET(sl, this);
                    if (pAET && pAET.length > 0 && pAET.length % 2 === 0) {
                        for (var i = 0; i < pAET.length / 2; i++) {
                            this.hLine(pAET[i * 2][1], pAET[i * 2 + 1][1], sl, 0, true); // result
                        }
                    }
                }
            }
        }
    }


    p.MaskImage.ImageData.prototype.getPixel = function (x, y, minimization) {
        !0 === minimization || (minimization = !1);
        !1 === minimization && (
            x = (x / this.dx) << 0,
                y = (y / this.dy) << 0

            );

        if (x < this.width && x >= 0 && y < this.height && y >= 0) {
            return [p.data[0][x + y * this.width], p.data[1][x + y * this.width]];
        } else {
            return [-1, -1];
        }
    }

    p.MaskImage.ImageData.prototype.render = function (target) {
        if (this.onRender != null) this.onRender(this, target.main);
    }

    p.getMaskIterations = function () {
        return this.iterationMaskCount;
    }
    p.getMaskShowIterations = function () {
        return this.iterationMaskShowCount;
    }

    p.showMaskToScene = function (ctx) {
        this.iterationMaskShowCount++;

        if (this.maskLayers && this.maskLayers.length > 0) {
            for (var j = 0; j < this.main.height; j++) {
                for (var i = 0; i < this.main.width; i++) {
                    if (this.getObject(i, j)[0] != -1) {
                        if (this.getObject(i, j)[1] == 13) {
                            ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        } else {
                            ctx.fillStyle = 'rgba(155,55,15,0.1)';
                        }
                        ctx.fillRect(i, j, 1, 1);
                    }
                }
            }
        }

        ctx.fillStyle = 'rgba(110,110,110,0.8)';
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(790, 92, 300, 122);
        ctx.strokeRect(790, 92, 300, 122);
        ctx.fillStyle = '#fff';
        ctx.fillText('DEBUG WINDOW MASK', 810, 120);
        ctx.fillStyle = '#000';
        ctx.fillText('mask render: ' + this.getMaskIterations(), 810, 140);
        ctx.fillText('show mask: ' + this.getMaskShowIterations(), 810, 160);

    }

// ---------------------------------------------------------------------------------------------------------------------
// проверки на перерисовку сцены
// ---------------------------------------------------------------------------------------------------------------------
    p.needRender = {
        coerceRender: false,
        coerceMask: false,
        coerceNotRenderMask: false,
        drag: false,
        lastObserver: {
            x: 0,
            y: 0,
            scaleX: 0,
            scaleY: 0
        }
    }

    p.needToReRenderScene = function () {
        var res = false;
        if (this.needRender.coerceRender === true) {
            res = true
        } else
        // Проверка на изменения позиции обозревателя
        if (this.needRender.lastObserver.x != this.main.x || this.needRender.lastObserver.y != this.main.y ||
            this.needRender.lastObserver.scaleX != this.main.scaleX || this.needRender.lastObserver.scaleY != this.main.scaleY) {
            res = true;
        }
        var resMask = res;
        if (this.needRender.coerceMask === true) {
            resMask = true;
        }

        // Запоминаем предыдущие значения
        this.needRender.lastObserver.x = this.main.x;
        this.needRender.lastObserver.y = this.main.y;
        this.needRender.lastObserver.scaleX = this.main.scaleX;
        this.needRender.lastObserver.scaleY = this.main.scaleY;
        this.needRender.coerceRender = false;
        this.needRender.coerceMask = false;
        //M.needRender.coerceNotRenderMask = false; //не скидываемый (нужно придумать более удобный подход
        this.needRender.drag = this._drag;

        return [res, resMask];
    }

    p.coerceRenderScene = function () {
        this.needRender.coerceRender = true;
    }

    p.toString = function () {
        return "[emjs.Container]";
    };

    emjs.Container = Container;
}());


(function () {
    var resourceCache = {};
    var readyCallbacks = [];

    // Load an image url or an array of image urls
    function load(urlOrArr) {
        if (urlOrArr instanceof Array) {
            urlOrArr.forEach(function (url) {
                _load(url);
            });
        }
        else {
            _load(urlOrArr);
        }
    }

    function _load(url) {
        if (resourceCache[url]) {
            return resourceCache[url];
        } else {
            var img = new Image();
            img.onload = function () {
                resourceCache[url] = img;
                if (isReady()) {
                    readyCallbacks.forEach(function (func) {
                        func();
                    });
                }
            };
            resourceCache[url] = false;
            img.src = url;
        }
    }

    function get(url) {
        return resourceCache[url];
    }

    function isReady() {
        var ready = true;
        for (var k in resourceCache) {
            if (resourceCache.hasOwnProperty(k) && !resourceCache[k]) {
                ready = false;
            }
        }
        return ready;
    }

    function onReady(func) {
        readyCallbacks.push(func);
    }

    function draw(ctx, url, img_x, img_y, img_width, img_height, x, y, width, height) {
        var img = resources.get(url);
        //  console.log('Sprite draw ',url, img_x, img_y, img_width, img_height, x, y, width, height);
        if (img) {
            //console.log('Sprite draw YES');
            ctx.drawImage(img,
                img_x, img_y,
                img_width, img_height,
                x, y,
                width, height);
        } else {
            // console.log('Sprite draw NO. Loading...');
            _load(url);
        }
    }

    function preLoad(urls) {
        for (var i in urls) {
            var url = urls[i];
            var img = resources.get(url);
            if (!img) {
                _load(url);
            }
        }
    }

    window.resources = {
        load: load,
        get: get,
        onReady: onReady,
        isReady: isReady,
        preLoad: preLoad
    };

    window.spriteImage = {
        draw: draw
    };
})();


function OpenDetailObject() {
    var that = this;
    this.list = {};
    this.add = function (group, fn, track, settings) {
        var track = track || 0;
        var tooltip = false;
        if (settings) {
            if (settings.hasOwnProperty("tooltip")) {
                tooltip = settings.tooltip;

            }
        }

        that.list[track + '_' + group] = {
            fn: fn,
            track: track || 0,
            id: group,
            tooltip: tooltip
        };
    }
    this.set = function (group, _index, _group, track) {
        var o;
        var track = track || 0;
        group = track + '_' + group;
        if (that.list.hasOwnProperty(group) && that.list[group].track == track) {
            o = that.list[group];
            o.fn(_index, _group);
        }
    }

}


(function () {
    "use strict";
    if (!HTMLCanvasElement) return;
    var CRC2DP = CanvasRenderingContext2D.prototype;
    var _fillText,
        __slice = [].slice;
    _fillText = CRC2DP.fillText;

    function forEachCollection(collection, callBack) {
        var i = 0, // Array and string iteration
            iMax = 0, // Collection length storage for loop initialisation
            key = '', // Object iteration
            collectionType = '';

        // Verify that callBack is a function
        if (typeof callBack !== "function") {
            throw new TypeError("forEach: callBack should be function, " + typeof callBack + " given.");
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
                        collectionType + " given.");
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
                    "Continuity error in forEach, this should not be possible.");
                break;
        }

        return null;
    }


    CRC2DP.fillText2 = function () {
        var args, offset, previousLetter, str, x, y,
            _this = this;

        str = arguments[0], x = arguments[1], y = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
        if (this.letterSpacing == null || this.letterSpacing === 0) {
            return _fillText.apply(this, arguments);
        }
        offset = 0;
        previousLetter = false;
        return forEachCollection(str, function (letter) {
            _fillText.apply(_this, [letter, x + offset /*+ _this.letterSpacing*/, y].concat(args));
            offset += _this.measureText(letter).width + _this.letterSpacing;
            return previousLetter = letter;
        });
    };
    // Ext Tooltip
    CRC2DP.boxShadow = function (x, y, w, h) {
        var c = this;
        c.save();
        c.fillStyle = 'rgba(255,255,255,1)';
        c.strokeStyle = 'rgba(50,50,50,1)';
        c.lineWidth = 2;
        c.shadowColor = 'rgba(0,0,0,.3)';
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

    CRC2DP.tooltip = function (x, y, text, w, h) {
        var c = this, ww;
        ww = c.canvas.clientWidth;
        c.save();
        c.fillStyle = 'rgba(255,255,255,1)';
        c.font = 12 + 'px sans-serif';
        w = w || c.measureText(text).width;
        if (x + w > ww - 16) x = ww - w - 16;
        c.boxShadow(x, y, w + 16, h || 22);
        c.fillStyle = 'rgba(0,0,0,1)';
        c.textAlign = 'start';
        c.textBaseline = 'middle';
        c.font = 12 + 'px sans-serif';
        c.fillText(text, 8 + x << 0, 11 + y << 0);
        c.restore();
    };

    // Effects
    CRC2DP.setShadow = function (color, blur, offsetX, offsetY) {
        var c = this;
        c.shadowColor = color;
        c.shadowBlur = blur;
        c.shadowOffsetX = offsetX;
        c.shadowOffsetY = offsetY;
    };
    CRC2DP.clearShadow = function () {
        var c = this;
        c.shadowColor = 'rgba(0, 0, 0, 0)';
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
    CRC2DP.roundedRect = function (x, y, w, h, rx, ry) {
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
    }

    /*!
     \brief Прямоугольник со скругленными углами (расширенный)
     \param x,y Координаты левого верхнего угла
     \param w,h Значения ширины и высоты. Использовать только положительные значения.
     \param rTopLeft, rTopRight, rBottomRight, rBottomLeft радиусы каждого угла по часовой начиная с левого верхнего угла

     Данная функция рисует прямоугольник со скругленными углами
     */
    CRC2DP.roundedRectExt = function (x, y, w, h, rTopLeft, rTopRight, rBottomRight, rBottomLeft) {
        var c = this,
            rTopLeft = rTopLeft || 0,
            rTopRight = rTopRight || 0,
            rBottomLeft = rBottomLeft || 0,
            rBottomRight = rBottomRight || 0;
        c.moveTo(x + rTopLeft, y);
        c.lineTo(x + w - rTopRight, y);
        0 != rTopRight && c.quadraticCurveTo(x + w, y, x + w, y + rTopRight);
        c.lineTo(x + w, y + h - rBottomRight);
        0 != rBottomRight && c.quadraticCurveTo(x + w, y + h, x + w - rBottomRight, y + h);
        c.lineTo(x + rBottomLeft, y + h);
        0 != rBottomLeft && c.quadraticCurveTo(x, y + h, x, y + h - rBottomLeft);
        c.lineTo(x, y + rTopLeft);
        0 != rTopLeft && c.quadraticCurveTo(x, y, x + rTopLeft, y);
    }

    /*!
     \brief Соеденительная линия
     \param fromX,fromY Координаты начала
     \param toX,toY Координаты конца.
     \param span Смещение центра сноски. Отступ от начала до центра сноски. При отрицательных значениях отступ от конца.
     \param angle Угол наклона сноски
     \param fromRadius,toRadius радиусы скругления сноски, соответственно.
     */
    CRC2DP.connectionLine = function (fromX, fromY, toX, toY, span, angle, fromRadius, toRadius, spanToCenter) {
        var c = this,
            fixeEnd = false,
            angle = angle || 1.361356816555577,
            fromRadius = fromRadius || 4,
            toRadius = toRadius || fromRadius,
            minHeight = fromRadius + toRadius,
            ca = Math.cos(angle),
            sa = Math.sin(angle),
            h = Math.abs(fromY - toY),
            ss = h * ca / 2,
            aa = sa - ca * (1 - ca),
            x1;

        if (span !== 0 && !span) {
            span = false;
        } else if (typeof span == "number") {
            fixeEnd = span < 0;
            span = Math.abs(span);
        } else {
            //start
            fixeEnd = span == 'end';
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
            fromRadius = (h * fromRadius / minHeight) << 0;
            toRadius = (h * toRadius / minHeight) << 0;
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
                    c.arc(x1 - ss - fromRadius * aa, fromY - fromRadius, fromRadius, Math.PI / 2, Math.PI / 2 - angle, 1);
                }
                else {
                    c.arc(x1 - ss - fromRadius * aa, fromY + fromRadius, fromRadius, -Math.PI / 2, -(Math.PI / 2 - angle), 0);
                }
            }
            if (toRadius == 0) {
                c.lineTo(x1 + ss, toY);
            } else {
                if (invertY == 1) {

                    c.arc(x1 + ss + toRadius * aa, toY + toRadius, toRadius, -Math.PI / 2 - angle, -Math.PI / 2, 0);
                } else {
                    c.arc(x1 + ss + toRadius * aa, toY - toRadius, toRadius, Math.PI / 2 + angle, Math.PI / 2, 1);
                }
            }
        }
        c.lineTo(toX, toY);
    }


    CRC2DP.hexagon = function (x, y, rx, ry) {
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
    }
    CRC2DP.hexagon2 = function (x, y, rx, ry, ry2, k) {
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
    }

    CRC2DP.parallelogram2 = function (x, y, rx, ry, ry2, k) {
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

    }


    CRC2DP.drawSvg = function (x, y, scale, name, item) {
        var ctx = this;

        scale = scale / 2;

        if (!svgModel.hasOwnProperty(name)) return;
        ctx.closePath();
        ctx.beginPath();
        var _x = x, _y = y;

        /**/
        if (item.hasOwnProperty("__transform")) {
            _x = 0;
            _y = 0;
            item._x = item._x || 0;
            item._y = item._y || 0;
            ctx.save();
            ctx.translate(x + item._x * scale, y + item._y * scale);
            var mtx = [1, 0, 0, 1, 0, 0];// = [1, 0, 0, 1, x + item._x * scale, y + item._y * scale];


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
                            _mtx = __matrix(transform.values[0], transform.values[1], transform.values[2], transform.values[3], transform.values[4] * scale, transform.values[5] * scale);
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
                        var angle = parseInt(transform.values[0], 10), __x, __y;
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


        if (item.hasOwnProperty('_stroke-width') && item['_stroke-width'] != '' && item['_stroke-width'] != 'null') {
//        ctx.lineWidth = main.getValueX(parseInt(item['_stroke-width'], 10));
            ctx.lineWidth = parseInt(item['_stroke-width'], 10);

        }
        if (item.hasOwnProperty('_stroke') && item._stroke != '' && item['_stroke'] != 'null' && item['_stroke'] != 'none') {
            ctx.strokeStyle = valideColor(item._stroke);
        }

        if (item.hasOwnProperty('_fill') && item._fill != '' && item._fill !== 'null' && item._fill !== 'none') {
            ctx.fillStyle = valideColor(item._fill);
        }
        if (!item.hasOwnProperty('_stroke') && !item.hasOwnProperty('_fill')) {
            ctx.fillStyle = 'rgba(0,0,0,1)';
        }

        svgModel[name](ctx, _x, _y, scale, item, item.hasOwnProperty("__transform"));


        /*if (item._d) {
         if (!item.hasOwnProperty('__path')) {
         item.__path = getCalcPath(
         _validationSVGPathD(item._d)
         );
         }
         getPath(ctx, main.getX(0), main.getY(0), main.scaleX, item.__path);
         }*/


        if (item.hasOwnProperty('_fill-opacity') && item['_fill-opacity'] && item['_fill-opacity'] != 'null') {
            //   ctx.globalAlpha = parseFloat(item['_fill-opacity']);
        }


        if (item.hasOwnProperty('_fill') && item._fill != '' && item._fill !== 'null' && item._fill !== 'none') {
            if (item.hasOwnProperty('_fill-rule')) {
                ctx.fill('evenodd');
            } else {
                ctx.fill(item["_fill-rule"]);
            }
        }
        // ctx.globalAlpha = 1;

        if (item.hasOwnProperty('_stroke-opacity') && item['_stroke-opacity'] && item['_stroke'] != 'null') {
            ctx.globalAlpha = item['_stroke-opacity'];
        }

        if (item.hasOwnProperty('_stroke') && item._stroke != '' && item['_stroke'] != 'null' && item['_stroke'] != 'none') {
            ctx.stroke();
        }
        if (!item.hasOwnProperty('_stroke') && !item.hasOwnProperty('_fill')) {
            //    ctx.fillStyle = 'black';
            if (item.hasOwnProperty('_fill-rule')) {
                ctx.fill('evenodd');
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


    }


})();


/** --- SVG ----------------------------------------------------------------- */
/*!
 \brief object SVG
 \param path строка описывающая траекторию/контур фигуры
 */
function SvgJsonStructure(json, opt) {
    var that = this;
    this.root = {};
    this.load = function (svgJson, options) {
        var o = options;
        if (!o.verified) {
            this.root = _validationSVG(svgJson);
        } else {
            this.root = Object.assign({}, svgJson);
        }
        return this.root;
    }

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
    var i, char, left, right, count,
        resultPath = '',
        cleanPath = path.replace(/[0-9]*\.[0-9]*/g, function (x) {
            return (+x).toFixed(2)
        });
    cleanPath = cleanPath.replace(/\s{2,}/g, ' ');
    function isNumber(code) {
        return code >= 45 && code <= 57
    }

    for (i = 0, count = cleanPath.length; i < count; i++) {
        char = cleanPath.charCodeAt(i);
        if (char == 32 && i > 0 && i < cleanPath.length - 1) {
            left = cleanPath.charCodeAt(i - 1);
            right = cleanPath.charCodeAt(i + 1);
            if (isNumber(left) && isNumber(right)) {
                resultPath += ',';
            } else if (isNumber(left) && !isNumber(right)) {
                resultPath += '';
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
    var result = {}, p, typeObj, src;
    typeObj = toString.call(object);
    if (typeObj == '[object Object]') {
        src = object;
    } else if (typeObj == '[object Array]') {
        src = object;
        result = new Array();
    } else {
        src = object;
    }
    for (p in src) {
        if (src.hasOwnProperty(p)) {


            typeObj = toString.call(src[p]);
            if (typeObj == '[object Object]' || typeObj == '[object Array]') {
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
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }

    var res = [],
        sep = ' ',
        values, events;
    value = replaceAll(value, ',', ' ').replace(/\s+/g, " ");
    events = value.split(")");
    for (var i = events.length; i--;) {
        events[i] = events[i].replace(/^\s*/, '').replace(/\s*$/, '');
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
