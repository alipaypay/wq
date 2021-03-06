/*! iScroll v5.2.0 ~ (c) 2008-2016 Matteo Spinelli ~ http://cubiq.org/license */
(function (window, document, Math, utils) {
	function IScroll(el, options) {
		this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
		this.scroller = this.wrapper.children[0];
		this.scrollerStyle = this.scroller.style;		// cache style for better performance

		this.options = {

// INSERT POINT: OPTIONS
			disablePointer: !utils.hasPointer,
			disableTouch: utils.hasPointer || !utils.hasTouch,
			disableMouse: utils.hasPointer || utils.hasTouch,
			startX: 0,
			startY: 0,
			scrollY: true,
			directionLockThreshold: 5,
			momentum: true,

			bounce: true,
			bounceTime: 600,
			bounceEasing: '',

			preventDefault: true,
			preventDefaultException: {tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/},

			HWCompositing: true,
			useTransition: true,
			useTransform: true,
			bindToWrapper: typeof window.onmousedown === "undefined"
		};

		for (var i in options) {
			this.options[i] = options[i];
		}

		// Normalize options
		this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';

		this.options.useTransition = utils.hasTransition && this.options.useTransition;
		this.options.useTransform = utils.hasTransform && this.options.useTransform;

		this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
		this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;

		// If you want eventPassthrough I have to lock one of the axes
		this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
		this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

		// With eventPassthrough we also need lockDirection mechanism
		this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
		this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;

		this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

		this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;

		if (this.options.tap === true) {
			this.options.tap = 'tap';
		}

// INSERT POINT: NORMALIZATION

		// Some defaults
		this.x = 0;
		this.y = 0;
		this.directionX = 0;
		this.directionY = 0;
		this._events = {};

// INSERT POINT: DEFAULTS

		this._init();
		this.refresh();

		this.scrollTo(this.options.startX, this.options.startY);
		this.enable();
	}

	IScroll.prototype = {
		version: '5.2.0',

		_init: function () {
			this._initEvents();

			if (this.options.refresh) {
				this._pullRefreshInit();
			}

			if (this.options.picker) {
				this._pickerInit();
			}
// INSERT POINT: _init

		},

		destroy: function () {
			this._initEvents(true);
			clearTimeout(this.resizeTimeout);
			this.resizeTimeout = null;
			this._execEvent('destroy');
		},

		_transitionEnd: function (e) {
			if (e.target != this.scroller || !this.isInTransition) {
				return;
			}

			this._transitionTime();
			if (!this.resetPosition(this.options.bounceTime)) {
				this.isInTransition = false;
				this._execEvent('scrollEnd');
			}
		},

		_start: function (e) {
			// React to left mouse button only
			if (utils.eventType[e.type] != 1) {
				// for button property
				// http://unixpapa.com/js/mouse.html
				var button;
				if (!e.which) {
					/* IE case */
					button = (e.button < 2) ? 0 :
						((e.button == 4) ? 1 : 2);
				} else {
					/* All others */
					button = e.button;
				}
				if (button !== 0) {
					return;
				}
			}

			if (!this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated)) {
				return;
			}

			if (this.options.preventDefault && !utils.isBadAndroid && !utils.preventDefaultException(e.target, this.options.preventDefaultException)) {
				e.preventDefault();
			}

			var point = e.touches ? e.touches[0] : e,
				pos;

			this.initiated = utils.eventType[e.type];
			this.moved = false;
			this.distX = 0;
			this.distY = 0;
			this.directionX = 0;
			this.directionY = 0;
			this.directionLocked = 0;

			this.startTime = utils.getTime();

			if (this.options.useTransition && this.isInTransition) {
				this._transitionTime();
				this.isInTransition = false;
				pos = this.getComputedPosition();
				this._translate(Math.round(pos.x), Math.round(pos.y));
				this._execEvent('scrollEnd');
			} else if (!this.options.useTransition && this.isAnimating) {
				this.isAnimating = false;
				this._execEvent('scrollEnd');
			}

			this.startX = this.x;
			this.startY = this.y;
			this.absStartX = this.x;
			this.absStartY = this.y;
			this.pointX = point.pageX;
			this.pointY = point.pageY;

			this._execEvent('beforeScrollStart');
		},

		_move: function (e) {
			if (!this.enabled || utils.eventType[e.type] !== this.initiated) {
				return;
			}

			if (this.options.preventDefault) {	// increases performance on Android? TODO: check!
				e.preventDefault();
			}

			var point = e.touches ? e.touches[0] : e,
				deltaX = point.pageX - this.pointX,
				deltaY = point.pageY - this.pointY,
				timestamp = utils.getTime(),
				newX, newY,
				absDistX, absDistY;

			this.pointX = point.pageX;
			this.pointY = point.pageY;

			this.distX += deltaX;
			this.distY += deltaY;
			absDistX = Math.abs(this.distX);
			absDistY = Math.abs(this.distY);

			// We need to move at least 10 pixels for the scrolling to initiate
			if (timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10)) {
				return;
			}

			// If you are scrolling in one direction lock the other
			if (!this.directionLocked && !this.options.freeScroll) {
				if (absDistX > absDistY + this.options.directionLockThreshold) {
					this.directionLocked = 'h';		// lock horizontally
				} else if (absDistY >= absDistX + this.options.directionLockThreshold) {
					this.directionLocked = 'v';		// lock vertically
				} else {
					this.directionLocked = 'n';		// no lock
				}
			}

			if (this.directionLocked == 'h') {
				if (this.options.eventPassthrough == 'vertical') {
					e.preventDefault();
				} else if (this.options.eventPassthrough == 'horizontal') {
					this.initiated = false;
					return;
				}

				deltaY = 0;
			} else if (this.directionLocked == 'v') {
				if (this.options.eventPassthrough == 'horizontal') {
					e.preventDefault();
				} else if (this.options.eventPassthrough == 'vertical') {
					this.initiated = false;
					return;
				}

				deltaX = 0;
			}

			deltaX = this.hasHorizontalScroll ? deltaX : 0;
			deltaY = this.hasVerticalScroll ? deltaY : 0;

			newX = this.x + deltaX;
			newY = this.y + deltaY;

			// Slow down if outside of the boundaries
			if (newX > 0 || newX < this.maxScrollX) {
				newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
			}
			if (newY > 0 || newY < this.maxScrollY) {
				newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
			}

			this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
			this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

			if (!this.moved) {
				this._execEvent('scrollStart');
			}

			this.moved = true;

			this._translate(newX, newY);

			this._pullAction();

			/* REPLACE START: _move */

			if (timestamp - this.startTime > 300) {
				this.startTime = timestamp;
				this.startX = this.x;
				this.startY = this.y;
			}
			if (this.options.probeType > 1) {
				this._execEvent('scroll')
			}
			/* REPLACE END: _move */

		},

		_end: function (e) {
			if (!this.enabled || utils.eventType[e.type] !== this.initiated) {
				return;
			}

			if (this.options.preventDefault && !utils.preventDefaultException(e.target, this.options.preventDefaultException)) {
				e.preventDefault();
			}

			var point = e.changedTouches ? e.changedTouches[0] : e,
				momentumX,
				momentumY,
				duration = utils.getTime() - this.startTime,
				newX = Math.round(this.x),
				newY = Math.round(this.y),
				distanceX = Math.abs(newX - this.startX),
				distanceY = Math.abs(newY - this.startY),
				time = 0,
				easing = '';

			this.isInTransition = 0;
			this.initiated = 0;
			this.endTime = utils.getTime();

			// reset if we are outside of the boundaries
			if (this.resetPosition(this.options.bounceTime)) {
				return;
			}

			this.scrollTo(newX, newY);	// ensures that the last position is rounded

			// we scrolled less than 10 pixels
			if (!this.moved) {
				if (this.options.tap) {
					utils.tap(e, this.options.tap);
				}

				if (this.options.click) {
					utils.click(e);
				}

				this._execEvent('scrollCancel');
				return;
			}

			if (this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100) {
				this._execEvent('flick');
				return;
			}

			// start momentum animation if needed
			if (this.options.momentum && duration < 300) {
				momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) : {
						destination: newX,
						duration: 0
					};
				momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options.deceleration, this.options.picker, this.options.snapDis) : {
						destination: newY,
						duration: 0
					};
				newX = momentumX.destination;
				newY = momentumY.destination;
				time = Math.max(momentumX.duration, momentumY.duration);
				this.isInTransition = 1;
			}

// INSERT POINT: _end

			if (newX != this.x || newY != this.y) {
				// change easing function when scroller goes out of the boundaries
				if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
					easing = utils.ease.quadratic;
				}

				this.scrollTo(newX, newY, time, easing);
				return;
			}

			this._execEvent('scrollEnd');
		},

		_resize: function () {
			var that = this;

			clearTimeout(this.resizeTimeout);

			this.resizeTimeout = setTimeout(function () {
				that.refresh();
			}, this.options.resizePolling);
		},

		resetPosition: function (time) {
			var x = this.x,
				y = this.y;

			time = time || 0;

			if (!this.hasHorizontalScroll || this.x > 0) {
				x = 0;
			} else if (this.x < this.maxScrollX) {
				x = this.maxScrollX;
			}

			if (this.options.refresh) {
				if (this.y > this.limitFloorY) {
					if (this.pullDownRatio > 1 && !this.pullUpRefreshing) {
						y = this.pullDownBoxHeight;
						this._refreshCallBack();
					} else {
						y = this.limitFloorY;
						this._clearProgressAnimation(2, this.options.bounceTime);
					}
				} else if (this.y < this.maxScrollY && !this.disablePullUpLoad) {
					if (this.pullUpRatio > 1 && !this.pullDownRefreshing) {
						y = this.maxScrollY - this.pullUpBoxHeight;
						this._refreshCallBack();
					} else {
						y = this.maxScrollY;
						this._clearProgressAnimation(1, this.options.bounceTime);
					}
				} else if (this.y < this.maxScrollY && this.disablePullUpLoad) {
					y = this.maxScrollY;
				}

				if (x == this.x && y == this.y) {
					return false;
				}
			} else {
				if (!this.hasHorizontalScroll || this.x > 0) {
					x = 0;
				} else if (this.x < this.maxScrollX) {
					x = this.maxScrollX;
				}

				if (!this.hasVerticalScroll || this.y > 0) {
					y = 0;
				} else if (this.y < this.maxScrollY) {
					y = this.maxScrollY;
				}
				if (x == this.x && y == this.y) {
					return false;
				}
			}
			this.scrollTo(x, y, time, this.options.bounceEasing);

			return true;
		},

		disable: function () {
			this.enabled = false;
		},

		enable: function () {
			this.enabled = true;
		},

		refresh: function (bounceEase, disablePullUpRefresh) {
			var rf = this.wrapper.offsetHeight;		// Force reflow
			this.scroller.style.minHeight = this.wrapper.clientHeight + 'px';

			this.wrapperWidth = this.wrapper.clientWidth;
			this.wrapperHeight = this.wrapper.clientHeight;

			/* REPLACE START: refresh */

			this.scrollerWidth = this.scroller.offsetWidth;
			this.scrollerHeight = this.scroller.offsetHeight;

			this.maxScrollX = this.wrapperWidth - this.scrollerWidth;
			this.maxScrollY = this.wrapperHeight - this.scrollerHeight;

			/* REPLACE END: refresh */

			this.hasHorizontalScroll = this.options.scrollX && this.maxScrollX <= 0;
			this.hasVerticalScroll = this.options.scrollY && this.maxScrollY <= 0;

			if (!this.hasHorizontalScroll) {
				this.maxScrollX = 0;
				this.scrollerWidth = this.wrapperWidth;
			}

			if (!this.hasVerticalScroll) {
				this.maxScrollY = 0;
				this.scrollerHeight = this.wrapperHeight;
			}

			this.endTime = 0;
			this.directionX = 0;
			this.directionY = 0;

			this.wrapperOffset = utils.offset(this.wrapper);

			this._execEvent('refresh');
			if (this.options.refresh && bounceEase) {
				this.pullDownRatio = 0;
				this.pullUpRatio = 0;
				this.pullRefreshType = '';
				this.pullDownRefreshing = false;
				this.pullUpRefreshing = false;
				this.pullDownTipBox.innerText = this.options.tips.PULLDOWN1;
				this.pullUpTipBox.innerText = this.options.tips.PULLUP1;
				this._clearProgressAnimation();
			}
			if (this.options.refresh) {
				if (disablePullUpRefresh === true) {
					//禁用下拉
					this.disablePullUp(true);
				} else if (disablePullUpRefresh === false) {
					//开启下拉
					this.disablePullUp(false);
				} else {
					//不更新下拉下拉状态，只改变滑动数据
					this.disablePullUp();
				}
			}

			if (bounceEase) {
				this.resetPosition(this.options.bounceTime);
			} else {
				this.resetPosition();
			}

// INSERT POINT: _refresh

		},

		on: function (type, fn) {
			if (!this._events[type]) {
				this._events[type] = [];
			}

			this._events[type].push(fn);
		},

		off: function (type, fn) {
			if (!this._events[type]) {
				return;
			}

			var index = this._events[type].indexOf(fn);

			if (index > -1) {
				this._events[type].splice(index, 1);
			}
		},

		_execEvent: function (type) {
			if (!this._events[type]) {
				return;
			}

			var i = 0,
				l = this._events[type].length;

			if (!l) {
				return;
			}

			for (; i < l; i++) {
				this._events[type][i].apply(this, [].slice.call(arguments, 1));
			}
		},

		scrollBy: function (x, y, time, easing) {
			x = this.x + x;
			y = this.y + y;
			time = time || 0;

			this.scrollTo(x, y, time, easing);
		},

		scrollTo: function (x, y, time, easing) {
			easing = easing || utils.ease.circular;

			this.isInTransition = this.options.useTransition && time > 0;
			var transitionType = this.options.useTransition && easing.style;
			if (!time || transitionType) {
				if (transitionType) {
					this._transitionTimingFunction(easing.style);
					this._transitionTime(time);
				}
				this._translate(x, y);
			} else {
				this._animate(x, y, time, easing.fn);
			}
		},

		scrollToElement: function (el, time, offsetX, offsetY, easing) {
			el = el.nodeType ? el : this.scroller.querySelector(el);

			if (!el) {
				return;
			}

			var pos = utils.offset(el);

			pos.left -= this.wrapperOffset.left;
			pos.top -= this.wrapperOffset.top;

			// if offsetX/Y are true we center the element to the screen
			if (offsetX === true) {
				offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2);
			}
			if (offsetY === true) {
				offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2);
			}

			pos.left -= offsetX || 0;
			pos.top -= offsetY || 0;

			pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
			pos.top = pos.top > 0 ? 0 : pos.top < this.maxScrollY ? this.maxScrollY : pos.top;

			time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x - pos.left), Math.abs(this.y - pos.top)) : time;

			this.scrollTo(pos.left, pos.top, time, easing);
		},

		_transitionTime: function (time) {
			time = time || 0;

			var durationProp = utils.style.transitionDuration;
			this.scrollerStyle[durationProp] = time + 'ms';

			if (!time && utils.isBadAndroid) {
				this.scrollerStyle[durationProp] = '0.0001ms';
				// remove 0.0001ms
				var self = this;
				rAF(function () {
					if (self.scrollerStyle[durationProp] === '0.0001ms') {
						self.scrollerStyle[durationProp] = '0s';
					}
				});
			}

// INSERT POINT: _transitionTime

		},

		_transitionTimingFunction: function (easing) {
			this.scrollerStyle[utils.style.transitionTimingFunction] = easing;

// INSERT POINT: _transitionTimingFunction

		},

		_translate: function (x, y) {
			if (this.options.useTransform) {

				/* REPLACE START: _translate */

				this.scrollerStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;

				/* REPLACE END: _translate */

			} else {
				x = Math.round(x);
				y = Math.round(y);
				this.scrollerStyle.left = x + 'px';
				this.scrollerStyle.top = y + 'px';
			}

			this.x = x;
			this.y = y;

// INSERT POINT: _translate

		},

		_initEvents: function (remove) {
			var eventType = remove ? utils.removeEvent : utils.addEvent,
				target = this.options.bindToWrapper ? this.wrapper : window;

			eventType(window, 'orientationchange', this);
			eventType(window, 'resize', this);

			if (this.options.click) {
				eventType(this.wrapper, 'click', this, true);
			}

			if (!this.options.disableMouse) {
				eventType(this.wrapper, 'mousedown', this);
				eventType(target, 'mousemove', this);
				eventType(target, 'mousecancel', this);
				eventType(target, 'mouseup', this);
			}

			if (utils.hasPointer && !this.options.disablePointer) {
				eventType(this.wrapper, utils.prefixPointerEvent('pointerdown'), this);
				eventType(target, utils.prefixPointerEvent('pointermove'), this);
				eventType(target, utils.prefixPointerEvent('pointercancel'), this);
				eventType(target, utils.prefixPointerEvent('pointerup'), this);
			}

			if (utils.hasTouch && !this.options.disableTouch) {
				eventType(this.wrapper, 'touchstart', this);
				eventType(target, 'touchmove', this);
				eventType(target, 'touchcancel', this);
				eventType(target, 'touchend', this);
			}

			eventType(this.scroller, 'transitionend', this);
			eventType(this.scroller, 'webkitTransitionEnd', this);
			eventType(this.scroller, 'oTransitionEnd', this);
			eventType(this.scroller, 'MSTransitionEnd', this);
		},

		getComputedPosition: function () {
			var matrix = window.getComputedStyle(this.scroller, null),
				x, y;

			if (this.options.useTransform) {
				matrix = matrix[utils.style.transform].split(')')[0].split(', ');
				x = +(matrix[12] || matrix[4]);
				y = +(matrix[13] || matrix[5]);
			} else {
				x = +matrix.left.replace(/[^-\d.]/g, '');
				y = +matrix.top.replace(/[^-\d.]/g, '');
			}

			return {x: x, y: y};
		},
		_animate: function (destX, destY, duration, easingFn) {
			var that = this,
				startX = this.x,
				startY = this.y,
				startTime = utils.getTime(),
				destTime = startTime + duration;

			function step() {
				var now = utils.getTime(),
					newX, newY,
					easing;

				if (now >= destTime) {
					that.isAnimating = false;
					that._translate(destX, destY);

					if (!that.resetPosition(that.options.bounceTime)) {
						that._execEvent('scrollEnd');
					}

					return;
				}

				now = ( now - startTime ) / duration;
				easing = easingFn(now);
				newX = ( destX - startX ) * easing + startX;
				newY = ( destY - startY ) * easing + startY;
				that._translate(newX, newY);

				if (that.isAnimating) {
					rAF(step);
				}
			}

			this.isAnimating = true;
			step();
		},
		handleEvent: function (e) {
			switch (e.type) {
				case 'touchstart':
				case 'pointerdown':
				case 'MSPointerDown':
				case 'mousedown':
					this._start(e);
					break;
				case 'touchmove':
				case 'pointermove':
				case 'MSPointerMove':
				case 'mousemove':
					this._move(e);
					break;
				case 'touchend':
				case 'pointerup':
				case 'MSPointerUp':
				case 'mouseup':
				case 'touchcancel':
				case 'pointercancel':
				case 'MSPointerCancel':
				case 'mousecancel':
					this._end(e);
					break;
				case 'orientationchange':
				case 'resize':
					this._resize();
					break;
				case 'transitionend':
				case 'webkitTransitionEnd':
				case 'oTransitionEnd':
				case 'MSTransitionEnd':
					this._transitionEnd(e);
					break;
				case 'click':
					if (this.enabled && !e._constructed) {
						e.preventDefault();
						e.stopPropagation();
					}
					break;
			}
		}
	};
	IScroll.utils = utils;

	if (typeof module != 'undefined' && module.exports) {
		module.exports = IScroll;
	} else if (typeof define == 'function' && define.amd) {
		define(function () {
			return IScroll;
		});
	} else {
		window.IScroll = IScroll;
	}


	/*this plus by wq 2017.4.10*/

	IScroll.prototype._pullRefreshInit = function () {
		var pullUpBox,
			pullDownBox,
			div = document.createElement('div');

		div.innerHTML = '<div class="pull-up"><div class="wrap"><canvas height="100" width="100"></canvas><div class="tips"></div></div></div>';
		pullUpBox = div.children[0];
		div.innerHTML = '<div class="pull-down"><div class="wrap"><canvas height="100" width="100"></canvas><div class="tips"></div></div></div>';
		pullDownBox = div.children[0];

		div = null;

		if (!this.wrapper.querySelector('.pull-down')) {
			this.scroller.insertBefore(pullDownBox, this.scroller.children[0]);
		}
		if (!this.wrapper.querySelector('.pull-up')) {
			this.scroller.appendChild(pullUpBox);
		}

		this.limitFloorY = 0;
		this.pullDownTipBox = pullDownBox.querySelector('.tips');
		this.pullUpTipBox = pullUpBox.querySelector('.tips');
		this.pullDownBoxHeight = pullDownBox.offsetHeight;
		this.pullUpBoxHeight = pullUpBox.offsetHeight;
		this.pullDownCanvas = pullDownBox.querySelector('canvas');
		this.pullUpCanvas = pullUpBox.querySelector('canvas');
		this.pullDownTipBox.innerHTML = this.options.tips.PULLDOWN1;
		this.pullUpTipBox.innerHTML = this.options.tips.PULLUP1;
		this.scroller.style.minHeight = this.wrapper.clientHeight + 'px';

	}
	//拉动动作
	IScroll.prototype._pullAction = function () {
		if (!this.options.refresh) return;
		if (this.y > this.limitFloorY && !this.pullUpRefreshing && !this.pullDownRefreshing) {
			if (this.y - this.limitFloorY < this.options.animateBeginOffset) return;
			this.pullRefreshType = 'pulldown';
			this.pullDownRatio = (this.y - this.limitFloorY - this.options.animateBeginOffset) / this.options.animateSpeed;
			this._pullRefreshAnimate();
		} else if (this.y < this.maxScrollY && !this.pullDownRefreshing && !this.pullUpRefreshing && !this.disablePullUpLoad) {
			if (this.maxScrollY - this.y < this.options.animateBeginOffset) return;
			this.pullRefreshType = 'pullup';
			this.pullUpRatio = (this.maxScrollY - this.y - this.options.animateBeginOffset) / this.options.animateSpeed;
			this._pullRefreshAnimate();
		}
	}
	//拉动回调
	IScroll.prototype._refreshCallBack = function () {
		if (this.pullUpRefreshing || this.pullDownRefreshing) return;
		if (this.pullRefreshType === 'pulldown') {
			this._startTurnRound(1);
			this.pullDownRefreshing = true;
			this.pullDownTipBox.innerText = this.options.tips.PULLDOWN3;
			this._execEvent('pullDownRefresh');
		} else if (this.pullRefreshType === 'pullup') {
			this._startTurnRound(2);
			this.pullUpRefreshing = true;
			this.pullUpTipBox.innerText = this.options.tips.PULLUP3;
			this._execEvent('pullUpRefresh');
		}
	}

	//拉动动画
	IScroll.prototype._pullRefreshAnimate = function () {
		var _this = this;
		if (this.pullRefreshType === 'pulldown' && !this.pullDownRefreshing && !this.pullUpRefreshing) {
			rAF(function () {
				_this._progressAnimation(parseInt(_this.pullDownRatio * 100), 1);
			})
			if (this.pullDownRatio > 1) {
				this.pullDownTipBox.innerText = this.options.tips.PULLDOWN2;
			} else {
				this.pullDownTipBox.innerText = this.options.tips.PULLDOWN1;
			}
		} else if (this.pullRefreshType === 'pullup' && !this.pullDownRefreshing && !this.pullUpRefreshing) {
			rAF(function () {
				_this._progressAnimation(parseInt(_this.pullUpRatio * 100), 2);
			})
			if (this.pullUpRatio > 1) {
				this.pullUpTipBox.innerText = this.options.tips.PULLUP2;
			} else {
				this.pullUpTipBox.innerText = this.options.tips.PULLUP1;
			}
		}

	}
	IScroll.prototype._progressAnimation = function (rate, direction) {
		if (this.pullUpRefreshing || this.pullDownRefreshing) return;
		var canvas, p = (Math.PI * 2) / 360, context;
		if (direction === 1) {
			canvas = this.pullDownCanvas
		} else {
			canvas = this.pullUpCanvas
		}
		rate = rate >= 100 ? 100 : rate <= 0 ? 0 : rate;
		if (canvas.getContext) {
			context = canvas.getContext("2d");
			context.beginPath();
			context.clearRect(0, 0, 100, 100);
			context.strokeStyle = this.options.borderColor;
			context.lineWidth = 12;
			context.arc(50, 50, 43, -80 * p, (3.4 * rate - 80) * p, false);
			context.stroke();
		}
		this.lastPullRate = rate;
	}
	IScroll.prototype._startTurnRound = function (direction) {
		if (this.pullUpRefreshing || this.pullDownRefreshing) return;
		if (direction === 2) {
			this.wrapper.querySelector('.pull-up canvas').classList.add('circle-ani');
		} else if (direction === 1) {
			this.wrapper.querySelector('.pull-down canvas').classList.add('circle-ani');
		}
	}
	IScroll.prototype._endTurnRound = function (direction) {
		if (this.pullUpRefreshing || this.pullDownRefreshing) return;
		if (direction === 2) {
			this._progressAnimation(0, 2);
			this.wrapper.querySelector('.pull-up canvas').classList.remove('circle-ani');
		} else if (direction === 1) {
			this._progressAnimation(0, 1);
			this.wrapper.querySelector('.pull-down canvas').classList.remove('circle-ani');
		}

	}
	IScroll.prototype._clearProgressAnimation = function (direction, time) {
		if (this.pullUpRefreshing || this.pullDownRefreshing) return;
		var _this = this;
		setTimeout(function () {
			_this._endTurnRound(1);
			_this._endTurnRound(2);
		}, 50);
	}

	IScroll.prototype.triggerPullDown = function () {
		this.pullDownRatio = 10;
		this.pullRefreshType = 'pulldown';
		this._progressAnimation(100, 1);
		this.y = 1;
		this.resetPosition(this.options.bounceTime);
	}
	/**
	 * 禁止和开启上拉加载,并计算动画元素放置位置
	 * @param bl {boolean} 是否禁用上拉加载
	 */
	IScroll.prototype.disablePullUp = function (bl) {
		var contentHeight, pullUpBoxStyle;
		if (typeof bl === "boolean") {
			this.disablePullUpLoad = bl
		} else {
			bl = this.disablePullUpLoad;
		}

		pullUpBoxStyle = this.wrapper.querySelector('.pull-up').style;

		if (bl) {
			contentHeight = this.scroller.children[1].offsetHeight;
			if (contentHeight <= this.scrollerHeight - this.pullUpBoxHeight) {
				pullUpBoxStyle.bottom = this.scrollerHeight - contentHeight - this.pullDownBoxHeight + 'px';
			} else if (contentHeight > this.scrollerHeight - this.pullUpBoxHeight &&
				contentHeight < this.scrollerHeight + this.pullUpBoxHeight) {
				this.maxScrollY -= (contentHeight + this.pullUpBoxHeight - this.scrollerHeight);
				pullUpBoxStyle.bottom = -(contentHeight + this.pullUpBoxHeight - this.scrollerHeight) + 'px';
			} else {
				pullUpBoxStyle.bottom = -this.pullUpBoxHeight + 'px';
			}
			this.pullUpTipBox.innerHTML = this.options.tips.PULLUPEND;
		} else {
			pullUpBoxStyle.bottom = -this.pullUpBoxHeight + 'px';
		}
	}
	/**
	 * 下拉刷新结束时调用：更新数据并开启上拉加载
	 * @param disablePullUpRefresh {boolean} 默认false 不禁用上拉加载
	 */
	IScroll.prototype.pullDownOver = function (disablePullUpRefresh) {
		this.refresh(true, disablePullUpRefresh || false);
	}
	/**
	 * 上拉加载结束时调用：更新数据并是否禁用上拉加载
	 * @param disablePullUpRefresh {boolean} 是否禁用上拉加载
	 */
	IScroll.prototype.pullUpOver = function (disablePullUpRefresh) {
		this.refresh(true, disablePullUpRefresh || false);
	}

	IScroll.prototype._pickerInit = function () {
		if (!this.options.picker) return;
		this.options.render.call(this);
		this.options.snapDis = this.wrapper.querySelector('li').offsetHeight;
		this.options.startY = -(this.index || 0) * this.options.snapDis;
	}

	IScroll.prototype.pickerRerender = function () {
		if (!this.options.picker) return;
		this._pickerInit();
		this.refresh()
	}

	if (typeof module != 'undefined' && module.exports) {
		module.exports = IScroll;
	} else {
		window.IScroll = IScroll;
	}

})(window, document, Math, utils);



