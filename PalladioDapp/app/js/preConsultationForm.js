
function inject() {
	
	var originalOpenWndFnKey = "originalOpenFunction";

			var originalWindowOpenFn 	= window.open,
				  originalCreateElementFn = document.createElement,
				  originalAppendChildFn = HTMLElement.prototype.appendChild;
			    originalCreateEventFn 	= document.createEvent,
				  windowsWithNames = {};
			var timeSinceCreateAElement = 0;
			var lastCreatedAElement = null;
			var fullScreenOpenTime;
			var winWidth = window.innerWidth;
			var winHeight = window.innerHeight;
			var parentRef = window.parent;
			var parentOrigin = (window.location != window.parent.location) ? document.referrer: document.location;

			Object.defineProperty(window, 'BetterJsPop', {
				value: undefined,
				writable: false
			});

			window[originalOpenWndFnKey] = window.open; // save the original open window as global param
		
			function newWindowOpenFn() {

				var openWndArguments = arguments,
					useOriginalOpenWnd = true,
					generatedWindow = null;

				function blockedWndNotification(openWndArguments) {
					parentRef.postMessage({ type: "blockedWindow", args: JSON.stringify(openWndArguments) }, parentOrigin);
				}

				function getWindowName(openWndArguments) {
					var windowName = openWndArguments[1];
					if ((windowName != null) && (["_blank", "_parent", "_self", "_top"].indexOf(windowName) < 0)) {
						return windowName;
					}

					return null;
				}

				function copyMissingProperties(src, dest) {
					var prop;
					for(prop in src) {
						try {
							if (dest[prop] === undefined) {
								dest[prop] = src[prop];
						}
						} catch (e) {}
					}
					return dest;
				}

				function isParentWindow() {
					try {
					  return !!(parent.Window && capturingElement instanceof parent.Window);
					} catch (e) {
					  return false;
					}
				}
			  
				  function isOverlayish(el) {
					var style = el && el.style;
			  
					if (style && /fixed|absolute/.test(style.position) && el.offsetWidth >= winWidth * 0.6 && el.offsetHeight >= winHeight * 0.75) {
					  return true;
					}
			  
					return false;
				  }

				  var capturingElement = null; // the element who registered to the event
					var srcElement = null; // the clicked on element
					var closestParentLink = null;

					if (window.event != null) {
						capturingElement = window.event.currentTarget;
						srcElement = window.event.srcElement;
					}

					if (srcElement != null && srcElement instanceof HTMLElement) {
						closestParentLink = srcElement.closest('a');

						if (closestParentLink && closestParentLink.href) {
							openWndArguments[3] = closestParentLink.href;
						}
					}

					//callee will not work in ES6 or stict mode
					try {
						if (capturingElement == null) {
						var caller = openWndArguments.callee;
						while (caller.arguments != null && caller.arguments.callee.caller != null) {
							caller = caller.arguments.callee.caller;
						}
						if (caller.arguments != null && caller.arguments.length > 0 && caller.arguments[0].currentTarget != null) {
							capturingElement = caller.arguments[0].currentTarget;
						}
						}
					} catch (e) {}



				/////////////////////////////////////////////////////////////////////////////////
				// Blocked if a click on background element occurred (<body> or document)
				/////////////////////////////////////////////////////////////////////////////////
				if (capturingElement == null) {
					window.pbreason = 'Blocked a new window opened without any user interaction';
					useOriginalOpenWnd = false;
				  } else if (capturingElement != null && (capturingElement instanceof Window || isParentWindow(capturingElement) || capturingElement === document || capturingElement.URL != null && capturingElement.body != null || capturingElement.nodeName != null && (capturingElement.nodeName.toLowerCase() == "body" || capturingElement.nodeName.toLowerCase() == "document"))) {
					window.pbreason = "Blocked a new window opened with URL: " + openWndArguments[0] + "because it was triggered by the " + capturingElement.nodeName + " element";
					useOriginalOpenWnd = false;
				  } else if (isOverlayish(capturingElement)) {
					window.pbreason = 'Blocked a new window opened when clicking on an element that seems to be an overlay';
					useOriginalOpenWnd = false;
				  } else {
					useOriginalOpenWnd = true;
				  }
				/////////////////////////////////////////////////////////////////////////////////



				/////////////////////////////////////////////////////////////////////////////////
				// Block if a full screen was just initiated while opening this url.
				/////////////////////////////////////////////////////////////////////////////////
				var fullScreenElement = document.webkitFullscreenElement || document.mozFullscreenElement || document.fullscreenElement;
				if (new Date().getTime() - fullScreenOpenTime < 1000 || isNaN(fullScreenOpenTime) && isDocumentInFullScreenMode()) {

				window.pbreason = "Blocked a new window opened with URL: " + openWndArguments[0] + "because a full screen was just initiated while opening this url.";

				/* JRA REMOVED
				if (window[script_params.fullScreenFnKey]) {
				window.clearTimeout(window[script_params.fullScreenFnKey]);
				}
				*/

				if (document.exitFullscreen) {
					document.exitFullscreen();
				} else if (document.mozCancelFullScreen) {
					document.mozCancelFullScreen();
				} else if (document.webkitCancelFullScreen) {
					document.webkitCancelFullScreen();
				}

				useOriginalOpenWnd = false;
				}
				/////////////////////////////////////////////////////////////////////////////////
		
				if (useOriginalOpenWnd == true) {
					generatedWindow = originalWindowOpenFn.apply(this, openWndArguments);
					// save the window by name, for latter use.
					var windowName = getWindowName(openWndArguments);
					if (windowName != null) {
						windowsWithNames[windowName] = generatedWindow;
					}

					// 2nd line of defence: allow window to open but monitor carefully...

					/////////////////////////////////////////////////////////////////////////////////
					// Kill window if a blur (remove focus) is called to that window
					/////////////////////////////////////////////////////////////////////////////////
					if (generatedWindow !== window) {
						var openTime = new Date().getTime();
						var originalWndBlurFn = generatedWindow.blur;
						generatedWindow.blur = () => {
						  if (new Date().getTime() - openTime < 1000 /* one second */) {
							  window.pbreason = "Blocked a new window opened with URL: " + openWndArguments[0] + "because a it was blured";
							  generatedWindow.close();
							  blockedWndNotification(openWndArguments);
							} else {
								originalWndBlurFn();
						  }
						};
					  }
					  /////////////////////////////////////////////////////////////////////////////////
					} else { // (useOriginalOpenWnd == false)

						var location = {
							href: openWndArguments[0]
						};
						location.replace = function(url) {
							location.href = url;
						};

						generatedWindow = {
							close:						function() {return true;},
							test:						function() {return true;},
							blur:						function() {return true;},
							focus:						function() {return true;},
							showModelessDialog:			function() {return true;},
							showModalDialog:			function() {return true;},
							prompt:						function() {return true;},
							confirm:					function() {return true;},
							alert:						function() {return true;},
							moveTo:						function() {return true;},
							moveBy:						function() {return true;},
							resizeTo:					function() {return true;},
							resizeBy:					function() {return true;},
							scrollBy:					function() {return true;},
							scrollTo:					function() {return true;},
							getSelection:				function() {return true;},
							onunload:					function() {return true;},
							print:						function() {return true;},
							open:						function() {return this;},
							opener:						window,
							closed:						false,
							innerHeight:				480,
							innerWidth:					640,
							name:						openWndArguments[1],
							location:					location,
							document:					{location: location}
						};

					copyMissingProperties(window, generatedWindow);

					generatedWindow.window = generatedWindow;

					var windowName = getWindowName(openWndArguments);
					if (windowName != null) {
						try {
							// originalWindowOpenFn("", windowName).close();
							windowsWithNames[windowName].close();
						} catch (err) {
						}
					}

					var fnGetUrl = function () {
						var url;
						if (!(generatedWindow.location instanceof Object)) {
						  url = generatedWindow.location;
						} else if (!(generatedWindow.document.location instanceof Object)) {
						  url = generatedWindow.document.location;
						} else if (location.href != null) {
						  url = location.href;
						} else {
						  url = openWndArguments[0];
						}
						openWndArguments[0] = url;
				
						blockedWndNotification(openWndArguments);
					  };

					  if (top == self) {
						setTimeout(fnGetUrl, 100);
					  } else {
						fnGetUrl();
					  }
				}

				return generatedWindow;
			}


			/////////////////////////////////////////////////////////////////////////////////
			// Replace the window open method with Poper Blocker's
			/////////////////////////////////////////////////////////////////////////////////
			window.open = function() {
				try {
					return newWindowOpenFn.apply(this, arguments);
				} catch(err) {
					return null;
				}
			};
			/////////////////////////////////////////////////////////////////////////////////



			//////////////////////////////////////////////////////////////////////////////////////////////////////…