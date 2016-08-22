// **************************************************************************************
//
// The VisualSaaS SVG based user interface system.
//
// Use the following pattern to immediately invoke a function expression, thus utilising
// the function's execution context to create "privacy".
//		(function(){ /* code */ }());
// The key point is to keep the parser from interpreting the function as a function
// declaration, and instead it's being interpreted as an anonymous function expression.
// Using the brackets to group the expression changes the parsing, and the function is
// immediately invoked by the following brackets.
//
// The following controls are provided by the VS UI
//	vs.window						Create a window to hold the UI controls
//		vs.menu						Menu and drop-down options across top of window
//			vs.form					Form control that holds field level controls
//				vs.frame			Frame to hold title bar, status bar and controls
//				vs.button			Button on a form
//				vs.selectionList	Selection list with optional scroll bar
//				vs.textArea			Multi-line text area that is read only
//				vs.textBox			Single line text box that is read/write
//			vs.grid					Grid control that holds various controls
//				vs.frame			Frame to hold title bar, status bar and controls
//				vs.slider			Slider control for user with grids or stand-alone
//
// Author: Basil Fisk (c)2014 Breato Ltd
// Credit: Kevin Lindsey for his example at
//			http://www.kevlindev.com/gui/utilities/viewbox/ViewBox.js
//
// **************************************************************************************

(function() {
	var vs = {
		version: '1.0.0',				// Version of VS UI controls
		browser: undefined,				// Browser that the app is being used through
		innerWidth: 0,					// Width of SVG window
		innerHeight: 0,					// Height of SVG window
		windowNodeName: 'uiWindow',		// ID of group to which UI components are added, if not explicitly set
		supportsCharGeom: true,			// Does SVG viewer supports getting geometries of individual characters?
		style: {},						// Style definitions
		defnForms: {},					// Form definitions
		defnGrids: {},					// Grid definitions
		currentFrame: {},				// Reference to current frame
		keys: {},						// Key definitions
		iconPosition: {},				// Position of last desktop icon

		// Common declarations used across the UI controls
		svgNS: 'http://www.w3.org/2000/svg',
		xlinkNS: 'http://www.w3.org/1999/xlink',
		namespaceNS: 'http://www.w3.org/XML/1998/namespace',

		// Location of data server
		dataServer: 'http://localhost:1337/',

		//--------------------------------------------------------------------------------------
		// Key definitions
		//--------------------------------------------------------------------------------------
		assignKeys: function() {
			vs.keys.arrow = {};
			vs.keys.arrow.left = 37;
			vs.keys.arrow.up = 38;
			vs.keys.arrow.right = 39;
			vs.keys.arrow.down = 40;
			vs.keys.backspace = 8;
			vs.keys.delkey = 46;
			vs.keys.end = 35;
			vs.keys.enter = 13;
			vs.keys.home = 36;
			vs.keys.lowercase = {};
			vs.keys.lowercase.min = 97;
			vs.keys.lowercase.max = 122;
			vs.keys.number = {};
			vs.keys.number.min = 48;
			vs.keys.number.max = 57;
			vs.keys.space = 32;
			vs.keys.uppercase = {};
			vs.keys.uppercase.min = 65;
			vs.keys.uppercase.max = 90;
		},

		//--------------------------------------------------------------------------------------
		// Read a file from the server, as a SYNCHRONOUS process
		//
		// Argument 1 : Name of file to be loaded
		// Argument 2 : Callback function is data retrieved successfully
		//
		// Return the JSON object, or null if nothing returned
		//--------------------------------------------------------------------------------------
		ajaxSynchJSON: function(url, cb) {
			var xmlhttp;

			// Initiate the request for data from the server
			xmlhttp = new XMLHttpRequest();

			// Create handler for response document
			xmlhttp.onreadystatechange = function() {
			    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
					if(xmlhttp.responseText) {
						cb(JSON.parse(xmlhttp.responseText));
					}
					// No root element in the JSON document.  Return undefined
					else {
						vs.message("No data in JSON object");
						return;
					}
			    }
			};

			// Send request
			xmlhttp.open("GET", vs.dataServer + url, true);
			xmlhttp.send();
		},

		// --------------------------------------------------------------------------------------
		// Return the current mouse position (coordinates) within the parent window
		//
		// Argument 1 : Event object
		// Argument 2 : Node of the parent window
		// --------------------------------------------------------------------------------------
		calcCoord: function(evt,ctmNode) {
			var svgPoint,matrix;

			// Create a point object to keep track of mouse position during dragging session
			svgPoint = document.documentElement.createSVGPoint();

			// Coordinates of mouse from top-left of SVG rendering area
			svgPoint.x = evt.clientX;
			svgPoint.y = evt.clientY;

			// If getScreenCTM is supported
			if(document.documentElement.getScreenCTM) {
				// If parent node provided, read node's current transformation matrix
				// If not, use current node recognised by event handler
				if(ctmNode) { matrix = ctmNode.getScreenCTM(); }
				else        { matrix = evt.target.getScreenCTM(); }
				svgPoint = svgPoint.matrixTransform(matrix.inverse());
			}
			// If getScreenCTM is not supported
			else {
				// If parent node provided, read node's current transformation matrix
				// If not, use current node recognised by event handler
				if(ctmNode) { matrix = getTransformToRootElement(ctmNode); }
				else        { matrix = getTransformToRootElement(evt.target); }
				svgPoint = svgPoint.matrixTransform(matrix.inverse().multiply(this.m));
			}
			// Return mouse position coordinates within parent
			return svgPoint;
		},

		// --------------------------------------------------------------------------------------
		// Find index of string in a list
		//
		// Argument 1 : String to be found
		// Argument 2 : List to be searched
		//
		// Return the index of the string in the list, or 0 (1st element) if no match
		// --------------------------------------------------------------------------------------
		indexInList: function(str,list) {
			var idx = 0;
			for(var i=0; i<list.length; i++) {
				if(list[i] == str) { idx = i; }
			}
			return idx;
		},

		// --------------------------------------------------------------------------------------
		// Display a pretty alert message
		// --------------------------------------------------------------------------------------
// TODO This should be displayed in a styled message box
		message: function(msg) {
			alert('PRETTY: '+msg);
		},

		// --------------------------------------------------------------------------------------
		// Display a status icon on the screen
		//
		// Argument 1 : Current status (started/running/finished)
		// --------------------------------------------------------------------------------------
		showStatus: function(status) {
			var rect = vs.testParent('statusRect'),
				word = vs.testParent('statusText');

			// Don't display status if either element is undefined
			if(rect === undefined || word === undefined) return;

			// Display the status message
			switch(status) {
				case 'started':
					rect.setAttributeNS(null,"style",vs.style.fmStatusRectShow);
					word.setAttributeNS(null,"style",vs.style.fmStatusTextShow);
					break;
				case 'running':
					rect.setAttributeNS(null,"style",vs.style.fmStatusRectRunning);
					word.setAttributeNS(null,"style",vs.style.fmStatusTextRunning);
					break;
				case 'finished':
					rect.setAttributeNS(null,"style",vs.style.fmStatusRectHide);
					word.setAttributeNS(null,"style",vs.style.fmStatusTextHide);
					break;
				default: break;
			}
		},

		// --------------------------------------------------------------------------------------
		// Test whether SVG viewer supports getting geometries of individual characters
		// Defines whether viewer can support geometry calculations on individual characters,
		// such as .getCharAtPosition(SVGPoint)
		//
		// Sets vs.supportsCharGeom to true or false
		// --------------------------------------------------------------------------------------
		supportedChars: function() {
			var node,grp,text;

			// Create a dummy string to test if getStartPosition is available
/*			node = vs.testParent(vs.windowNodeName);
			grp = document.createElementNS(vs.svgNS,"g");
			node.appendChild(grp);
			text = document.createElementNS(vs.svgNS,"text");
			text.setAttributeNS(null,"x",99);
			text.nodeValue = "dummy";
			grp.appendChild(text);
			vs.supportsCharGeom = true;
			try {
				dummy = text.getStartPositionOfChar(0).x;
			}
			catch(er) {
				vs.supportsCharGeom = false;
			}
*/
// TODO Forced to true until this function is fixed
vs.supportsCharGeom = true;
		},

		// --------------------------------------------------------------------------------------
		// Test if the parent group exists
		//
		// Return node if the parent exists, otherwise undefined
		// --------------------------------------------------------------------------------------
		testParent: function(id) {
			var parent = document.getElementById(id);
			if(parent) return parent;
			else return;
		},

		// --------------------------------------------------------------------------------------
		// Validates that a string contains only valid characters
		//	- alpha-lower		a-z characters only
		//	- alpha-mixed		a-z and A-Z characters only
		//	- alpha-numeric		a-z, A-Z and 0-9 characters only
		//	- alpha-upper		A-Z characters only
		//	- email				Email address with 2 or 3 character TLD
		//	- float				Floating point numbers (no check on commas or number of DPs)
		//	- integer			Integer numbers (no check on commas)
		//	- phone-uk			UK phone pattern: 09999 999999 or 09999 999 999
		//	- phone-us			US phone pattern: (999) 999-9999 or (999)999-9999
		//	- postcode-uk		UK post code: aa99 9aa or aa99
		//	- postcode-us		US zip code in 5 digit or zip+4 format: 99999 or 99999-9999
		//	- regex:pattern		Validate string using regex 'pattern'
		//
		// Argument 1 : Type of validation to be performed
		// Argument 2 : String to be tested for validity
		//
		// Returns true if test passed, otherwise false.
		// --------------------------------------------------------------------------------------
		validateString: function(type,string) {
			var regexp,
				result = false,
				typearr = type.split(':');

			switch(typearr[0]) {
				case 'alpha-lower':
					regexp = /[^a-z]/;
					result = regexp.test(string);
					result = (result == true) ? false : true;
			        break;
				case 'alpha-mixed':
					regexp = /[^a-zA-Z]/;
					result = regexp.test(string);
					result = (result == true) ? false : true;
			        break;
				case 'alpha-numeric':
					regexp = /[^a-zA-Z0-9]/;
					result = regexp.test(string);
					result = (result == true) ? false : true;
			        break;
				case 'alpha-upper':
					regexp = /[^A-Z]/;
					result = regexp.test(string);
					result = (result == true) ? false : true;
			        break;
				case 'email':
					regexp = /(^[a-z]([a-z_\.]*)@([a-z_\.]*)([.][a-z]{3})$)|(^[a-z]([a-z_\.]*)@([a-z_\.]*)(\.[a-z]{3})(\.[a-z]{2})*$)/i;
					result = regexp.test(string);
			        break;
				case 'float':
					regexp = /(^-?\d\d*\.\d*$)|(^-?\d\d*$)|(^-?\.\d\d*$)/;
					result = regexp.test(string);
			        break;
				case 'integer':
					regexp = /(^-?\d\d*$)/;
					result = regexp.test(string);
			        break;
				case 'phone-uk':
					regexp = /^0\(\d{4}\)\s?\d{3}\s?\d{3}$/;
					result = regexp.test(string);
			        break;
				case 'phone-us':
					regexp = /^\([1-9]\d{2}\)\s?\d{3}\-\d{4}$/;
					result = regexp.test(string);
			        break;
				case 'postcode-uk':
					regexp = /^([a-z]{1})([a-z]{2})\s?(\d{1})(\d{2})$|^([a-z]{1})([a-z]{2})$/;
					result = regexp.test(string);
			        break;
				case 'postcode-us':
					regexp = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
					result = regexp.test(string);
			        break;
				case 'regex':
					regexp = /typearr[1]/;
					result = regexp.test(string);
			        break;
				default:
					vs.message("Unrecognized type of validation: " + type);
			        break;
			}
			return result;
		},

		// --------------------------------------------------------------------------------------
		// Determine which browser is being used
		//
		// Return a string with the browser name or null if the browser is not supported
		// --------------------------------------------------------------------------------------
		whichBrowser: function() {
			var browser = "";
			if(window.navigator) {
				if(window.navigator.appName.match(/Netscape/gi)) {
					browser = "Mozilla";
				}
				else if(window.navigator.appName.match(/Opera/gi)) {
					browser = "Opera";
				}
			}
			return browser;
		}
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Button on a form
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.button = function(args) {
		var that = {
			id: args.id,							// ID of the button
			parent: args.formId,					// ID of the form owning the button
			x: args.x,								// Top left corner of the button
			y: args.y,								// Top left corner of the button
			width: args.width,						// Width of the button
			height: args.height,					// Height of the button
			buttonType: args.buttonType,			// Type of button (rect/ellipse)
			cornerType: args.cornerType,			// Corner style (square/round) only applies to 'rect'
			buttonText: args.buttonText,			// Text to be shown on button
			buttonSymbolId: args.buttonSymbolId,	// Symbol to be shown on button
			postProcess: args.postProcess,			// Function to be run when button is clicked

			// Initialise internal variables
			buttonTextElement: null,				// Reference to the button text
			buttonSymbolInstance: null,				// Reference to the button symbol
			deActivateRect: null,					// Reference to a rectangle that can be used to deactivate the button
			activated: true,						// Property indicating if button is activated or not
		};

		// Only 'rect' and 'ellipse' supported
		if(that.buttonType != "rect" && that.buttonType != "ellipse") {
			vs.message("Button type '"+that.buttonType+"' is not valid");
		}

		// Only 'square' and 'round' supported
		if(that.cornerType != "square" && that.cornerType != "round") {
			vs.message("Button type '"+that.cornerType+"' is not valid");
		}

		// Form to which the button will be added
		that.bnParent = vs.testParent(that.parent);
		if(!that.bnParent) {
			vs.message("Could not reference parent node of '"+that.id+"'");
			return;
		}

		that.bnNode = document.createElementNS(vs.svgNS,"g");
		that.bnNode.setAttributeNS(null,"id",that.id);
		that.bnParent.appendChild(that.bnNode);

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// Activate the button if it is currently deactivated
		// --------------------------------------------------------------------------------------
		that.activate = function() {
			that.deActivateRect.setAttributeNS(null,"display","none");
			that.activated = true;
		};

		// --------------------------------------------------------------------------------------
		// Create a button
		// --------------------------------------------------------------------------------------
		that.createButton = function() {
			var buttonRect;

			// Create shadow effect above and to left of button
			that.upperLeftShadow = that.createShape(-1 * vs.style.bnShadowOffset,0);
			that.upperLeftShadow.setAttributeNS(null,"style",vs.style.bnShadeLightStyles);
			that.bnNode.appendChild(that.upperLeftShadow);

			// Create shadow effect below and to right of button
			that.lowerRightShadow = that.createShape(vs.style.bnShadowOffset,0);
			that.lowerRightShadow.setAttributeNS(null,"style",vs.style.bnShadeDarkStyles);
			that.bnNode.appendChild(that.lowerRightShadow);

			// Create the button rectangle
			buttonRect = that.createShape(0,0);
			buttonRect.setAttributeNS(null,"style",vs.style.bnButtonStyles);
			buttonRect.setAttributeNS(null,"cursor","pointer");

			// Add event listeners to the rectangle, processed by that.handleEvent
			buttonRect.addEventListener("click",this,false);
			that.bnNode.appendChild(buttonRect);

			// Create the button text
			that.createButtonText();

			// Add the symbol, if specified
			if(that.buttonSymbolId != undefined) {
				that.buttonSymbolInstance = document.createElementNS(vs.svgNS,"use");
				that.buttonSymbolInstance.setAttributeNS(null,"x",(that.x + that.width / 2));
				that.buttonSymbolInstance.setAttributeNS(null,"y",(that.y + that.height / 2));
				that.buttonSymbolInstance.setAttributeNS(vs.xlinkNS,"href","#"+that.buttonSymbolId);
				that.buttonSymbolInstance.setAttributeNS(null,"pointer-events","none");
				that.bnNode.appendChild(that.buttonSymbolInstance);
			}

			// Create a shape to deactivate the button
			if(that.buttonType == "rect") {
				that.deActivateRect = document.createElementNS(vs.svgNS,"rect");
				that.deActivateRect.setAttributeNS(null,"x",that.x - vs.style.bnShadowOffset);
				that.deActivateRect.setAttributeNS(null,"y",that.y - vs.style.bnShadowOffset);
				that.deActivateRect.setAttributeNS(null,"width",that.width + vs.style.bnShadowOffset * 2);
				that.deActivateRect.setAttributeNS(null,"height",that.height + vs.style.bnShadowOffset * 2);
				// Add rounding to the corners
				if(that.cornerType == "round") {
					that.deActivateRect.setAttributeNS(null,"rx",vs.style.bnButtonCorner);
					that.deActivateRect.setAttributeNS(null,"ry",vs.style.bnButtonCorner);
				}
			}
			else {
				that.deActivateRect = document.createElementNS(vs.svgNS,"ellipse");
				that.deActivateRect.setAttributeNS(null,"cx",that.x + that.width * 0.5);
				that.deActivateRect.setAttributeNS(null,"cy",that.y + that.height * 0.5);
				that.deActivateRect.setAttributeNS(null,"rx",that.width * 0.5 + vs.style.bnShadowOffset);
				that.deActivateRect.setAttributeNS(null,"ry",that.height * 0.5 + vs.style.bnShadowOffset);
			}
			that.deActivateRect.setAttributeNS(null,"fill","white");
			that.deActivateRect.setAttributeNS(null,"fill-opacity","0.5");
			that.deActivateRect.setAttributeNS(null,"stroke","none");
			that.deActivateRect.setAttributeNS(null,"display","none");
			that.deActivateRect.setAttributeNS(null,"cursor","default");
			that.bnNode.appendChild(that.deActivateRect);
		};

		// --------------------------------------------------------------------------------------
		// Create the button text element
		// --------------------------------------------------------------------------------------
		that.createButtonText = function() {
			var buttonTexts,dy,initX,initY,tspan,textNode;

			if(that.buttonText != undefined) {
				// Split the text, if it a multiline button
				buttonTexts = String(that.buttonText).split("\n");

				// Determine the y-offset and y-positioning
				dy = vs.style.bnTextSize * 1.25;
				initX = (that.width / 2) - 2;
				initY = (that.height - dy * buttonTexts.length) / 3 + vs.style.bnTextSize + 2;

				// Create text element
				that.buttonTextElement = document.createElementNS(vs.svgNS,"text");
				that.buttonTextElement.setAttributeNS(null,"x",that.x + initX);
				that.buttonTextElement.setAttributeNS(null,"y",that.y + initY);
				that.buttonTextElement.setAttributeNS(null,"style",vs.style.bnTextStyles);
				that.buttonTextElement.setAttributeNS(null,"pointer-events","none");
				that.buttonTextElement.setAttributeNS(null,"text-anchor","middle");
				that.buttonTextElement.setAttributeNS(vs.namespaceNS,"space","preserve");
				for(var j=0; j<buttonTexts.length; j++) {
					tspan = document.createElementNS(vs.svgNS,"tspan");
					tspan.setAttributeNS(null,"x",that.x + initX);
					tspan.setAttributeNS(null,"dy",(j == 0) ? 0 : dy);
					textNode = document.createTextNode(buttonTexts[j]);
					tspan.appendChild(textNode);
					that.buttonTextElement.appendChild(tspan);
				}
				that.bnNode.appendChild(that.buttonTextElement);
			}
		};

		// --------------------------------------------------------------------------------------
		// Create the basic shape that make up the button
		//
		// Argument 1 : Button style (rect or ellipse)
		//
		// Return the shape element
		// --------------------------------------------------------------------------------------
		that.createShape = function(offset) {
			var shape;
			if(that.buttonType == "rect") {
				shape = document.createElementNS(vs.svgNS,"rect");
				shape.setAttributeNS(null,"x",that.x + offset);
				shape.setAttributeNS(null,"y",that.y + offset);
				shape.setAttributeNS(null,"width",that.width);
				shape.setAttributeNS(null,"height",that.height);
				if(that.cornerType == "round") {
					shape.setAttributeNS(null,"rx",vs.style.bnButtonCorner);
					shape.setAttributeNS(null,"ry",vs.style.bnButtonCorner);
				}
				if(offset != 0) {
					shape.setAttributeNS(null,"points",that.x+","+(that.y+that.height)+" "+that.x+","+that.y+" "+(that.x+that.width)+","+that.y);
				}
			}
			else {
				shape = document.createElementNS(vs.svgNS,"ellipse");
				shape.setAttributeNS(null,"cx",that.x + that.width * 0.5 + offset);
				shape.setAttributeNS(null,"cy",that.y + that.height * 0.5 + offset);
				shape.setAttributeNS(null,"rx",that.width * 0.5);
				shape.setAttributeNS(null,"ry",that.height * 0.5);
			}
			return shape;
		};

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// Deactivate the button by graying it out
		// --------------------------------------------------------------------------------------
		that.deactivate = function() {
			that.deActivateRect.setAttributeNS(null,"display","inherit");
			that.bnNode.appendChild(that.deActivateRect);
			that.activated = false;
		};

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// Return text of the button
		// --------------------------------------------------------------------------------------
		that.getValue = function() {
			return that.buttonText;
		};

		// --------------------------------------------------------------------------------------
		// Run function triggered by addEventListener on button click
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			var result;

			// Only handles click events
			if(evt.type == "click") {
				// OK button clicked, so run the post-process function
				if(that.id.match(/OK/)) {
					result = that.runPostProcess({ postProcess: that.postProcess });

					// If result returned, an error occurred so display result and don't close form
					if(result !== undefined) {
						vs.message(result);
					}
					// If no result, function was successful so form can be closed
					else {
						vs.frame.close();
					}
				}
				// Cancel button clicked, so close the form
				else if(that.id.match(/Cancel/)) {
					vs.frame.close();
				}
				// Unrecognised button clicked
				else {
					vs.message(" The Button ID must contain the keyword 'OK' or 'Cancel'");
				}
			}
		};

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// Hide the button if currently visible
		// --------------------------------------------------------------------------------------
		that.hideButton = function() {
			that.bnNode.setAttributeNS(null,"display","none");
		};

		// --------------------------------------------------------------------------------------
		// Initiate the post-processing
		//
		// Return the message returned by the function
		// --------------------------------------------------------------------------------------
		that.runPostProcess = function(args) {
			var	postProcess = args.postProcess,
				fields = new Array,
				data = {},
				fn, result = undefined;

			// Show the 'running' message
			vs.showStatus("started");

			// Read data from fields on form and update data array
			data = vs.form.getValues(that.parent);

			// Find and run function
			fn = window[postProcess];
			if(typeof fn === 'function') {
				for(var key in data) {
				    fields.push(key+':'+data[key]);
				}
				result = fn.apply(null,fields);
			}
			else {
				vs.message("Function '"+postProcess+"' is not a valid function");
			}

			// Hide the 'running' message and return the response message
			vs.showStatus("finished");
			return result;
		};

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// Set button text
		//
		// Argument 1 : Text to be used
		// --------------------------------------------------------------------------------------
		that.setValue = function(value) {
			that.buttonText = value;
			// Remove previous buttonTextElement
			if(that.buttonTextElement) {
				that.bnNode.removeChild(that.buttonTextElement);
			}
			// Add new button text
			that.createButtonText();
		};

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// Show the button if it is currently hidden
		// --------------------------------------------------------------------------------------
		that.showButton = function() {
			that.bnNode.setAttributeNS(null,"display","inherit");
		};

		// --------------------------------------------------------------------------------------
		// NOT REFERENCED IN THIS SCRIPT
		// ?????????
		// --------------------------------------------------------------------------------------
		that.togglePressed = function(type) {
			if(type == "pressed") {
				that.upperLeftShadow.setAttributeNS(null,"style",vs.style.bnShadeDarkStyles);
				that.lowerRightShadow.setAttributeNS(null,"style",vs.style.bnShadeLightStyles);
			}
			if(type == "released") {
				that.lowerRightShadow.setAttributeNS(null,"style",vs.style.bnShadeDarkStyles);
				that.upperLeftShadow.setAttributeNS(null,"style",vs.style.bnShadeLightStyles);
			}
		};

		// --------------------------------------------------------------------------------------
		// Create the button
		// --------------------------------------------------------------------------------------
		that.createButton();
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Form control that holds field level controls
	// The form is structured as follows:
	//	- Form's root node is vs.windowNodeName
	//	- Frame containing title bar, status bar and form controls attached to root node
	//	- Frame contains logic for closing/moving/maximising and minimising the form
	//	- Selection lists, text boxes and text areas attached to frame
	//	- Buttons attached to frame
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.form = function(args) {
		var that = {
			id: args.id										// ID of the form
		};

		// Read the form definition
		that.x = vs.defnForms[that.id].x;					// Top left corner of form
		that.y = vs.defnForms[that.id].y;					// Top left corner of form
		that.formTitle = vs.defnForms[that.id].name;		// Name of form shown in title bar
		that.iconTitle = vs.defnForms[that.id].icon;		// Short name of form shown in minimised icon
		that.statusText = vs.defnForms[that.id].msg;		// Text to be shown in status bar

		// --------------------------------------------------------------------------------------
		// Instantiate the form
		// --------------------------------------------------------------------------------------
		that.createForm = function(formId) {
			var width,screen,maxField,maxLabel,topLeftX,topLeftY,incY,
				form = {},
				button = {},
				field = {};

			// Assign arrays to hold field data
			field.id = new Array();
			field.title = new Array();
			field.width = new Array();
			field.length = new Array();
			field.type = new Array();
			field.check = new Array();
			field.value = new Array();

			// Read fields from form definition object into arrays
			for(var key in vs.defnForms[that.id].fields) {
				field.id.push(vs.defnForms[that.id].fields[key].id);
				field.title.push(vs.defnForms[that.id].fields[key].name);
				field.width.push(vs.defnForms[that.id].fields[key].scrollWidth);
				field.length.push(vs.defnForms[that.id].fields[key].viewWidth);
				field.type.push(vs.defnForms[that.id].fields[key].type);
				field.check.push(vs.defnForms[that.id].fields[key].validation);
				field.value.push(vs.defnForms[that.id].fields[key].defaultValue);

				// Save default value as data value
				vs.defnForms[that.id].fields[key].data = vs.defnForms[that.id].fields[key].defaultValue;
			}

			// Calculate form width, based on size of largest field, but capped at %age of screen size
			// This assumes fields are laid out sequentially down the y-axis
			screen = document.documentElement.getAttribute("viewBox").split(" ");
			maxField = 0;
			for(var i=0; i<field.length.length; i++) {
				width = field.length[i];
				width += (field.type[i] == "list") ? vs.style.slBoxHeight : 0;
				maxField = Math.max(maxField,width);
			}

			// Calculate width of longest label
			maxLabel = 0;
			for(var i=0; i<field.title.length; i++) {
				maxLabel = Math.max(maxLabel,field.title[i].length);
			}
			maxLabel *= vs.style.tbLabelCharWidth;
			form.width = Math.min((maxLabel+maxField+(2*vs.style.fmFieldOffsetX)),(vs.style.fmMaxFormWidth*screen[2]));

			// Calculate position of top left field on form
			topLeftX = vs.style.fmFieldOffsetX + maxLabel;
			topLeftY = vs.style.cnTitleBarHeight + vs.style.fmFieldOffsetY;
			incY = vs.style.tbBoxHeight + vs.style.fmFieldSpacingY;

			// Calculate form height, based on number of fields, but capped at %age of screen size
			form.height = topLeftY + ((1 + field.length.length) * incY) + vs.style.fmButtonHeight + vs.style.fmButtonSpacing + vs.style.cnStatusBarHeight;

			// Create a frame to hold the title bar, status bar and form controls
			vs.frame({
				id: that.id,
				x: that.x,
				y: that.y,
				width: form.width,
				height: form.height,
				moveable: true,
				titleBarVisible: true,
				statusBarVisible: true,
				titleText: that.formTitle,
				iconText: that.iconTitle,
				statusText: that.statusText,
				closeButton: true,
				minimizeButton: true,
				maximizeButton: false,
				linkButton: false
			});

			// Create fields on the form
			for(var i=0; i<field.length.length; i++) {
				// Text box fields
				if(field.type[i] == "text") {
					vs.textBox({
						id: field.id[i],
						formId: that.id,
						x: topLeftX,
						y: topLeftY+(i*incY),
						boxWidth: field.length[i],
						maxChars: field.check[i][0],
						allowedChars: field.check[i][1],
						defaultVal: field.value[i],
						label: field.title[i],
						labelWidth: maxLabel
					});
				}
				// Selection lists
				else if(field.type[i] == "list") {
					var list = new Array;
					for(var n=0; n<field.check[i].length; n++) {
						list.push(field.check[i][n]);
					}
					vs.selectionList({
						id: field.id[i],
						formId: that.id,
						x: topLeftX,
						y: topLeftY+(i*incY),
						width: (field.length[i]+vs.style.slBoxHeight),
						elementsArray: list,
						noItems: vs.style.fmVisibleListItems,
						preSelect: vs.indexInList(field.value[i],field.check[i]),
						label: field.title[i],
						labelWidth: maxLabel
					});
				}
				else {
					vs.message("Field type "+field.type[i]+" not supported");
				}
			}

			// Action buttons at bottom of form
			button.name = ["OK","Cancel"];
			button.width = vs.style.fmButtonWidth;
			button.height = vs.style.fmButtonHeight;
			button.spacing = vs.style.fmButtonSpacing;
			button.x = (form.width - (button.width * button.name.length) - (button.spacing * (button.name.length - 1))) / 2;
			button.shift = button.width + button.spacing;
			button.y = form.height - button.height - button.spacing - vs.style.cnStatusBarHeight;

			for(var i=0; i<button.name.length; i++) {
				vs.button({
					id: that.id+"."+button.name[i],
					formId: that.id,
					x: (button.x+(i*button.shift)),
					y: button.y,
					width: button.width,
					height: button.height,
					buttonType: "rect",
					cornerType: "round",
					buttonText: button.name[i],
					buttonSymbolId: undefined,
					postProcess: vs.defnForms[that.id].postProcess
				});
			}
		};

		// --------------------------------------------------------------------------------------
		// Create the form
		// --------------------------------------------------------------------------------------
		that.createForm(that.id);
	};

	// --------------------------------------------------------------------------------------
	// Return data as an object
	// --------------------------------------------------------------------------------------
	vs.form.getValues = function(formId) {
		var fields = {};
		for(var key in vs.defnForms[formId].fields) {
			fields[key] = vs.defnForms[formId].fields[key].data;
		}
		return fields;
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Frame to hold the title bar, status bar and form/grid controls
	// The frame is structured as follows:
	//	- Frame is attached to root node
	//	- Frame contains title bar, status bar and form/grid controls
	//	- Frame contains logic for closing/moving/maximising and minimising the form/grid
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.frame = function(args) {
		var that = {
			id: args.id,								// ID of frame
			x: args.x,									// Top left corner of frame (ie. form)
			y: args.y,									// Top left corner of frame
			width: args.width,							// Width of frame
			height: args.height,						// Height for frame
			moveable: args.moveable,					// Is frame moveable (true/false)
			titleBarVisible: args.titleBarVisible,		// Is title bar visible (true/false)
			statusBarVisible: args.statusBarVisible,	// Is status bar visible (true/false)
			titleText: args.titleText,					// Name of the form
			iconText: args.iconText,					// Name shown in minimised icon
			statusText: args.statusText,				// Text to be displayed in the status bar
			closeButton: args.closeButton,				// Is close button visible (true/false)
			minimizeButton: args.minimizeButton,		// Is minimise button visible (true/false)
			maximizeButton: args.maximizeButton,		// Is maximise button visible (true/false)
			linkButton: args.linkButton,				// Is link button visible (true/false)

			// Local variables
			parentX1: 0,					// Position of top left of parent window (desktop)
			parentY1: 0,					// Position of top left of parent window (desktop)
			parentX2: 0,					// Position of bottom right of parent window (desktop)
			parentY2: 0,					// Position of bottom right of parent window (desktop)
			frameGroup: null,				// Group holding title/status bars & background
			statusTextNode: null,			// References text child node of status bar
			titleTextNode: null,			// References text child node of title bar
			dragging: false,				// If 'true', frame is currently being dragged
			minimized: false,				// If 'true', frame is minimised
			cursor: {}						// Current position of cursor
		};

		// Position of right most button on title bar
		that.buttonPosition = that.width - vs.style.cnTitleBarRightMargin;

		// --------------------------------------------------------------------------------------
		// Create a button on the title bar
		//
		// Argument 1 : Parent node
		// Argument 2 : Button type (minimize,maximize,close,link)
		// --------------------------------------------------------------------------------------
		that.addTitleBarButton = function(parent,type) {
			var btn = document.createElementNS(vs.svgNS,"use");
			btn.setAttributeNS(null,"id",that.id+".titlebar."+type);
			btn.setAttributeNS(null,"x",that.buttonPosition);
			btn.setAttributeNS(null,"y",vs.style.cnTitleBarHeight * 0.5);
			btn.setAttributeNS(vs.xlinkNS,"href","#titlebar."+type);

			// Change cursor to pointer over title bar, indicating it can be moved
			btn.setAttributeNS(null,"cursor","pointer");
			btn.addEventListener("click",that,false);
			parent.appendChild(btn);

			// Adjust position of next button
			that.buttonPosition -= vs.style.cnTitleBarButtonSpacing;
		};

		// --------------------------------------------------------------------------------------
		// Create a new frame
		// Optionally with a title bar and status bar
		// Optionally display min/max/close buttons on the title bar
		// --------------------------------------------------------------------------------------
		that.createFrame = function() {
			var node,bgHeight,bgY,rect,txt,grp,nodes,
				icon = {};

			// Check node does not already exist, which will happen if someone tries to open
			// the same dialog twice from a grid
			node = document.getElementById(that.id);
			if(node) return;

			// Create the frame group, move it to the correct position and attach it to window node
			// This group will hold the title bar, status bar, background and the content group
			// Set width and height attributes so children can work out size of window to fit in
			that.frameGroup = document.createElementNS(vs.svgNS,"g");
			that.frameGroup.setAttributeNS(null,"id",that.id);
			that.frameGroup.setAttributeNS(null,"width",that.width);
			that.frameGroup.setAttributeNS(null,"height",that.height);
			that.frameGroup.setAttributeNS(null,"transform","translate("+that.x+","+that.y+")");
			vs.windowNode.appendChild(that.frameGroup);

			// Calculate height and y-offset of background
			bgHeight = that.height;
			bgY = 0;

			// Create a title bar
			if(that.titleBarVisible) {
				// Add title bar elements to a group and then to frame group
				grp = document.createElementNS(vs.svgNS,"g");
				grp.setAttributeNS(null,"id","titleBar");
				that.frameGroup.appendChild(grp);

				// Start with rectangle and border (x and y are 0)
				rect = document.createElementNS(vs.svgNS,"rect");
				rect.setAttributeNS(null,"id",that.id+".titlebar.rect");
				rect.setAttributeNS(null,"width",that.width);
				rect.setAttributeNS(null,"height",vs.style.cnTitleBarHeight + vs.style.cnCorner);
				rect.setAttributeNS(null,"rx",vs.style.cnCorner);
				rect.setAttributeNS(null,"ry",vs.style.cnCorner);
				rect.setAttributeNS(null,"style",vs.style.cnTitleBar);

				// Change cursor to a pointer over title bar
				rect.setAttributeNS(null,"cursor","pointer");

				// Register events for moving frame and click to minimise
				rect.addEventListener("click",this,false);
				rect.addEventListener("mousedown",this,false);
				grp.appendChild(rect);

				// Add text element to hold title of frame
				txt = document.createElementNS(vs.svgNS,"text");
				txt.setAttributeNS(null,"x",vs.style.cnTitleBarLeftMargin);
				txt.setAttributeNS(null,"y",vs.style.cnTitleBarHeight - vs.style.cnTitleBarBottomMargin);
				txt.setAttributeNS(null,"style",vs.style.cnTitleText);
				txt.setAttributeNS(null,"pointer-events","none");
				that.titleText = (that.titleText.length > 0) ? that.titleText : " ";	// Text must not be empty
				that.titleTextNode = document.createTextNode(that.titleText);
				txt.appendChild(that.titleTextNode);
				grp.appendChild(txt);

				// Create buttons on title bar
				if(that.closeButton)    { that.addTitleBarButton(grp,'close'); }
				if(that.maximizeButton) { that.addTitleBarButton(grp,'maximize'); }
				if(that.minimizeButton) { that.addTitleBarButton(grp,'minimize'); }
				if(that.linkButton)     { that.addTitleBarButton(grp,'link'); }

				// If a minimize button is created, create a desktop icon so form can be maximized again
				if(that.minimizeButton) {
					// Group with click event to control visibility
					grp = document.createElementNS(vs.svgNS,"g");
					grp.setAttributeNS(null,"id",that.id+".icon");
					grp.setAttributeNS(null,"cursor","pointer");
					grp.addEventListener("click",this,false);
					grp.setAttributeNS(null,"visibility","hidden");
					vs.windowNode.appendChild(grp);

					// Create an icon to maximize a minimized frame
					rect = document.createElementNS(vs.svgNS,"rect");
					icon = that.minimizePosition();
					rect.setAttributeNS(null,"x",icon.x);
					rect.setAttributeNS(null,"y",icon.y);
					rect.setAttributeNS(null,"rx",vs.style.cnMinIconCorner);
					rect.setAttributeNS(null,"ry",vs.style.cnMinIconCorner);
					rect.setAttributeNS(null,"width",vs.style.cnMinIconWidth);
					rect.setAttributeNS(null,"height",vs.style.cnMinIconHeight);
					rect.setAttributeNS(null,"style",vs.style.cnMinIconBar);
					grp.appendChild(rect);

					// Text node with name of frame
					node = document.createElementNS(vs.svgNS,"text");
					node.setAttributeNS(null,"x",icon.x + vs.style.cnMinIconLeftMargin);
					node.setAttributeNS(null,"y",icon.y + vs.style.cnMinIconBottomMargin);
					node.setAttributeNS(null,"style",vs.style.cnMinIconText);
					txt = document.createTextNode(that.iconText);
					node.appendChild(txt);
					grp.appendChild(node);
				}

				// Adjust height and y-offset of background
				bgHeight -= vs.style.cnTitleBarHeight;
				bgY += vs.style.cnTitleBarHeight;
			}
			// Create a status bar
			if(that.statusBarVisible) {
				// Add status bar elements to a group and then to frame group
				grp = document.createElementNS(vs.svgNS,"g");
				grp.setAttributeNS(null,"id","statusBar");
				that.frameGroup.appendChild(grp);

				// Start with rectangle and border (x is 0)
				rect = document.createElementNS(vs.svgNS,"rect");
				rect.setAttributeNS(null,"y",that.height - vs.style.cnStatusBarHeight - vs.style.cnCorner);
				rect.setAttributeNS(null,"width",that.width);
				rect.setAttributeNS(null,"height",vs.style.cnStatusBarHeight + vs.style.cnCorner);
				rect.setAttributeNS(null,"rx",vs.style.cnCorner);
				rect.setAttributeNS(null,"ry",vs.style.cnCorner);
				rect.setAttributeNS(null,"style",vs.style.cnStatusBar);
				grp.appendChild(rect);

				// Add text element to hold status message
				txt = document.createElementNS(vs.svgNS,"text");
				txt.setAttributeNS(null,"x",vs.style.cnStatusBarLeftMargin);
				txt.setAttributeNS(null,"y",that.height - vs.style.cnStatusBarBottomMargin);
				txt.setAttributeNS(null,"style",vs.style.cnStatusText);
				txt.setAttributeNS(null,"pointer-events","none");
				that.statusText = (that.statusText.length > 0) ? that.statusText : " ";		// Text must not be empty
				that.statusTextNode = document.createTextNode(that.statusText);
				txt.appendChild(that.statusTextNode);
				grp.appendChild(txt);

				// Adjust height of background
				bgHeight -= vs.style.cnStatusBarHeight;
			}

			// Create background frame
			rect = document.createElementNS(vs.svgNS,"rect");
			rect.setAttributeNS(null,"x",0);
			rect.setAttributeNS(null,"y",bgY);
			rect.setAttributeNS(null,"width",that.width);
			rect.setAttributeNS(null,"height",bgHeight);
			rect.setAttributeNS(null,"style",vs.style.cnBackground);
			that.frameGroup.appendChild(rect);

			// Read the size of the main window
			nodes = vs.windowNode.childNodes;
			for(var i=0; i<nodes.length; i++) {
				if(nodes[i].id == "window") {
					that.parentX1 = parseInt((nodes[i].getAttribute("x")) ? nodes[i].getAttribute("x") : 0);
					that.parentY1 = parseInt((nodes[i].getAttribute("y")) ? nodes[i].getAttribute("y") : 0);
					that.parentX2 = parseInt((nodes[i].getAttribute("width")) ? nodes[i].getAttribute("width") : 0);
					that.parentX2 = that.parentX2 - that.parentX1;
					that.parentY2 = parseInt((nodes[i].getAttribute("height")) ? nodes[i].getAttribute("height") : 0);
					that.parentY2 = that.parentY2 - that.parentY1;
				}
			}

			// Save the frame details for processing by 'close'
// TODO This doesn't work correctly for multiple open forms
			vs.currentFrame.parent = vs.windowNode;
			vs.currentFrame.group = that.frameGroup;
		};

		// --------------------------------------------------------------------------------------
		// Drag a frame to a new position
		//
		// Argument 1 : X and Y coordinates of current cursor position
		// --------------------------------------------------------------------------------------
		that.dragStart = function(coords) {
			var tbHeight;

			// Calculate amount to move from last recorded position to current cursor position
			that.x += coords.x - that.cursor.x;
			that.y += coords.y - that.cursor.y;

			// Check that boundaries of parent frame in x-axis are not exceeded
			that.x = Math.max(that.x,that.parentX1);
			that.x = Math.min(that.x,that.parentX2 - that.width);

			// Check that boundaries of parent frame in y-axis are not exceeded
			// Adjust height if title bar is to be displayed
			tbHeight = (that.titleBarVisible) ? vs.style.cnTitleBarHeight : 0;
			that.y = Math.max(that.y,that.parentY1);
			that.y = Math.min(that.y,that.parentY2 - (that.height - tbHeight));

			// Move frame, then save cursor position
			that.frameGroup.setAttributeNS(null,"transform","translate("+that.x+","+that.y+")");
			that.cursor = coords;
		};

		// --------------------------------------------------------------------------------------
		// Stop dragging the frame
		// --------------------------------------------------------------------------------------
		that.dragStop = function() {
			// Cancel event listeners for any mouse movement
			document.documentElement.removeEventListener("mousemove",this,false);
			document.documentElement.removeEventListener("mouseup",this,false);

			// Change cursor to pointer
			var node = document.getElementById(that.id+".titlebar.rect");
			node.setAttributeNS(null,"cursor","pointer");

			// Set 'dragging' status flag
			that.dragging = false;
		};

		// --------------------------------------------------------------------------------------
		// Run function triggered by addEventListener on click and mouse move
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			// Which element was this event from?
			var id = evt.currentTarget.getAttributeNS(null,"id");

			// Clicks
			if(evt.type == "click") {
				// Close, maximize or minimize the frame
				if(id == that.id+".titlebar.close") { vs.frame.close(); }
				else if(id == that.id+".titlebar.maximize") { that.maximize(); }
				else if(id == that.id+".titlebar.minimize") { that.minimize(); }
				else if(id == that.id+".titlebar.link") { that.linkItems(); }

				// Single click to bring frame to front, double click to minimize frame
				else if(id == that.id+".titlebar.rect") {
					if(evt.detail == 2) { that.minimize(); }
					else { vs.windowNode.appendChild(that.frameGroup); }
				}

				// Click on icon to maximize the frame
				else if(id == that.id+".icon") { that.maximize(); }
			}

			// Start dragging frame, if it is flagged as moveable
			if(evt.type == "mousedown") {
				if(id == that.id+".titlebar.rect" && that.moveable) {
					// Bring frame to the front
					vs.windowNode.appendChild(that.frameGroup);

					// Read the X and Y coordinates of the cursor
					that.cursor = vs.calcCoord(evt,vs.windowNode);

					// Set up event listeners for any mouse movement
					document.documentElement.addEventListener("mousemove",this,false);
					document.documentElement.addEventListener("mouseup",this,false);

					// Change cursor to signal movement
					var node = document.getElementById(that.id+".titlebar.rect");
					node.setAttributeNS(null,"cursor","move");

					// Set 'dragging' status flag
					that.dragging = true;
				}
			}

			// Frame is being dragged
			if(evt.type == "mousemove") {
				if(that.dragging) {
					var coords = vs.calcCoord(evt,vs.windowNode);
					that.dragStart(coords);
				}
			}

			// Stop dragging frame when mouse button lifted
			if(evt.type == "mouseup") {
				if(that.dragging) { that.dragStop(); }
			}
		};

		// --------------------------------------------------------------------------------------
		// Link items selected in different frames
// TODO Linking needs testing
		// --------------------------------------------------------------------------------------
		that.linkItems = function() {
			var nodes,srcNodes,tgtNodes,
				allNodes = new Array();

			// ?????????
			for(var grid in userDesktop.Grids) {
				nodes = userDesktop.Grids[grid].getSelectedNodes();
				allNodes.push(nodes);
			}

			// ?????????
			if(allNodes.length == 2) {
				srcNodes = allNodes[0].sort();
				tgtNodes = allNodes[1].sort();
				if(srcNodes.length == 0 || tgtNodes.length == 0) {
					vs.message("At least 1 source and 1 target node must be selected");
				}
				else {
					vs.message("Source ["+srcNodes+"] Target ["+tgtNodes+"]");
				}
			}
			else {
				vs.message("Error: 2 grids must be open for a successful link");
			}
		};

		// --------------------------------------------------------------------------------------
		// Maximize the frame
		// --------------------------------------------------------------------------------------
		that.maximize = function() {
			// Show frame group
			that.frameGroup.setAttributeNS(null,"display","inherit");

			// Hide desktop icon
			var grp = document.getElementById(that.id+".icon");
			grp.setAttributeNS(null,"visibility","hidden");

			// Set status flag and trigger post processing
			that.minimized = false;
		};

		// --------------------------------------------------------------------------------------
		// Minimize the frame
		// --------------------------------------------------------------------------------------
		that.minimize = function() {
			// Hide frame group
			that.frameGroup.setAttributeNS(null,"display","none");

			// Make desktop icon visible
			var grp = document.getElementById(that.id+".icon");
			grp.setAttributeNS(null,"visibility","visible");

			// Set status flag and trigger post processing
			that.minimized = true;
		};

		// --------------------------------------------------------------------------------------
		// Calculate the position of a new desktop icon so it doesn't overlap another icon
		// --------------------------------------------------------------------------------------
// TODO This needs to be more sophisticated
		that.minimizePosition = function() {
			// Initialise if undefined
			if(vs.iconPosition.x === undefined) {
				vs.iconPosition.x = vs.style.cnMinIconX;
				vs.iconPosition.y = vs.style.cnMinIconY;
			}
			// Increment the position down the Y-axis
			else {
				vs.iconPosition.y += vs.style.cnMinIconOffset;
			}
			return vs.iconPosition;
		};

		// --------------------------------------------------------------------------------------
		// Create the frame
		// --------------------------------------------------------------------------------------
		that.createFrame();
	};

	// --------------------------------------------------------------------------------------
	// Remove the frame and all child elements
	// --------------------------------------------------------------------------------------
	vs.frame.close = function() {
		vs.currentFrame.parent.removeChild(vs.currentFrame.group);
	};

	// --------------------------------------------------------------------------------------
	// Change the status bar text
	// --------------------------------------------------------------------------------------
// TODO Changing the status bar text needs testing
	vs.frame.setStatusText = function(statusText) {
		if(this.statusBarVisible) {
			this.statusText = (statusText.length > 0) ? statusText : " ";
			this.statusTextNode.nodeValue = this.statusText;
		}
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Grid control that holds various controls
	// The grid is structured as follows:
	//	- Grids's root node is vs.windowNodeName
	//	- Frame containing title bar, status bar and form controls attached to root node
	//	- Frame contains logic for closing/moving/maximising and minimising the form
	//	- Grid column heading and data rows are attached to frame
	//	- X and Y sliders are attached to frame
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.grid = function(args) {
		var that = {
			id: args.id,									// ID of the grid
		};
		var sliderWidth,
			screen = new Array();

		// Read the grid definition
		that.x = parseInt(vs.defnGrids[that.id].x);			// Top left corner of form
		that.y = parseInt(vs.defnGrids[that.id].y);			// Top left corner of form
		that.rows = parseInt(vs.defnGrids[that.id].rows);	// Number of rows to be displayed in the grid
		that.gridTitle = vs.defnGrids[that.id].name;		// Name of grid shown in title bar
		that.iconTitle = vs.defnGrids[that.id].icon;		// Short name of grid shown in minimised icon
		that.statusText = vs.defnGrids[that.id].msg;		// Text to be shown in status bar
		that.gridX = 0;										// Top left corner of grid relative to ???????????????????????????????
		that.gridY = vs.style.cnTitleBarHeight + vs.style.gdCellHeight;

		// Initialise variable to hold position values for use by scrolling function
		vs.grid.viewbox = {};

		// Calculate width of sliders
		sliderWidth = vs.style.sdSymbolSize + (2 * vs.style.sdBorderSpacing);

		// Calculate grid width and height
		that.gridWidth = sliderWidth;
		for(var key in vs.defnGrids[that.id].fields) {
			that.gridWidth += parseInt(vs.defnGrids[that.id].fields[key].viewWidth);
		}
		screen = document.documentElement.getAttribute("viewBox").split(" ");
		that.gridWidth = Math.min(that.gridWidth,(0.9 * (screen[2] - that.x)));

		// Calculate grid height
		that.gridHeight = parseInt(that.rows) * vs.style.gdCellHeight;

		// Calculate form width, but restrict to 90% of available width
		that.formWidth = that.gridWidth;

		// Calculate form height
		that.formHeight = vs.style.cnTitleBarHeight + that.gridHeight + sliderWidth + vs.style.cnStatusBarHeight;

		// --------------------------------------------------------------------------------------
		// Create grid
		// --------------------------------------------------------------------------------------
		that.createGrid = function() {
			var title,group,rect,text,textContent,
				offset = 0;

			// Create an element to hold title so view box can be used for scrolling
			title = document.createElementNS(vs.svgNS,"svg");
			title.setAttributeNS(null,"id",that.id+".title");
			title.setAttributeNS(null,"x",that.gridX);
			title.setAttributeNS(null,"y",that.gridY - vs.style.gdCellHeight);
			title.setAttributeNS(null,"width",that.formWidth);
			title.setAttributeNS(null,"height",vs.style.gdCellHeight);
			title.setAttributeNS(null,"viewBox","0 0 "+that.formWidth+" "+vs.style.gdCellHeight);
			that.gridNode.appendChild(title);

			// Create a column group then loop through each column and attach to group
			group = document.createElementNS(vs.svgNS,"g");
			for(var key in vs.defnGrids[that.id].fields) {
				// Create background rect for cell
				rect = document.createElementNS(vs.svgNS,"rect");
				rect.setAttributeNS(null,"id","title."+key);
				rect.setAttributeNS(null,"x",offset);
				rect.setAttributeNS(null,"y",0);
				rect.setAttributeNS(null,"width",vs.defnGrids[that.id].fields[key].viewWidth);
				rect.setAttributeNS(null,"height",vs.style.gdCellHeight);
				rect.setAttributeNS(null,"style",vs.style.gdTitleBoxStyle);
//				rect.setAttributeNS(null,"pointer-events","fill");
//				rect.addEventListener("click",this,false);
				group.appendChild(rect);

				// Create text element
				text = document.createElementNS(vs.svgNS,"text");
				text.setAttributeNS(null,"x",offset + vs.style.gdCellTextPadding);
				text.setAttributeNS(null,"y",0.7 * vs.style.gdCellHeight);
				text.setAttributeNS(null,"style",vs.style.gdTitleTextStyle);
//				text.setAttributeNS(null,"pointer-events","none");

				// Add text to element
				textContent = document.createTextNode(vs.defnGrids[that.id].fields[key].name);
				text.appendChild(textContent);
				group.appendChild(text);

				// Calculate the offset of next column
				offset += vs.defnGrids[that.id].fields[key].viewWidth;
			}
			title.appendChild(group);

			// Create an SVG element to hold grid so view box can be used for scrolling
			that.view = document.createElementNS(vs.svgNS,"svg");
			that.view.setAttributeNS(null,"id",that.id+".data");
			that.view.setAttributeNS(null,"x",that.gridX);
			that.view.setAttributeNS(null,"y",that.gridY);
			that.view.setAttributeNS(null,"width",that.gridWidth);
			that.view.setAttributeNS(null,"height",that.gridHeight);
			that.view.setAttributeNS(null,"viewBox","0 0 "+that.gridWidth+" "+that.gridHeight);
			that.gridNode.appendChild(that.view);

			// Border for column titles
			rect = document.createElementNS(vs.svgNS,"rect");
			rect.setAttributeNS(null,"x",that.gridX);
			rect.setAttributeNS(null,"y",that.gridY - vs.style.gdCellHeight);
			rect.setAttributeNS(null,"width",that.formWidth);
			rect.setAttributeNS(null,"height",vs.style.gdCellHeight);
			rect.setAttributeNS(null,"style",vs.style.gdGridBorderStyle);
			that.gridNode.appendChild(rect);

			// Border for grid area
			rect = document.createElementNS(vs.svgNS,"rect");
			rect.setAttributeNS(null,"x",that.gridX);
			rect.setAttributeNS(null,"y",that.gridY);
			rect.setAttributeNS(null,"width",that.formWidth);
			rect.setAttributeNS(null,"height",that.rows * vs.style.gdCellHeight);
			rect.setAttributeNS(null,"style",vs.style.gdGridBorderStyle);
			that.gridNode.appendChild(rect);

			// Save position values for use by scrolling function
			vs.grid.viewbox[that.id] = {};
			vs.grid.viewbox[that.id].x = that.gridX;
			vs.grid.viewbox[that.id].y = that.gridY;
			vs.grid.viewbox[that.id].width = that.gridWidth;
			vs.grid.viewbox[that.id].height = that.gridHeight;
		};

		// --------------------------------------------------------------------------------------
		// Create group holding each row of grid
		// --------------------------------------------------------------------------------------
		that.addGridData = function () {
			var	rows,cols,rect,text,textContent,offset;

			// Create parent group for grid data
			rows = document.createElementNS(vs.svgNS,"g");
			that.view.appendChild(rows);

			// Create group holding each column of row
// TODO Replace vs.data with proper data structure
			for(var n=0; n<vs.data.length; n++) {
				offset = 0;
				cols = document.createElementNS(vs.svgNS,"g");
				cols.setAttributeNS(null,"id",that.id+".row."+n);

// TODO Replace vs.data with proper data structure
				var i = 0;
				// Loop through each column in the row
				for(var key in vs.defnGrids[that.id].fields) {
					// Create background rect for cell
					rect = document.createElementNS(vs.svgNS,"rect");
					rect.setAttributeNS(null,"id",that.id+".cell."+n+"."+key);
					rect.setAttributeNS(null,"x",offset);
					rect.setAttributeNS(null,"y",n * vs.style.gdCellHeight);
					rect.setAttributeNS(null,"width",vs.defnGrids[that.id].fields[key].viewWidth);
					rect.setAttributeNS(null,"height",vs.style.gdCellHeight);
					rect.setAttributeNS(null,"style",vs.style.gdCellBoxStyle);
//					rect.setAttributeNS(null,"pointer-events","fill");
//					rect.addEventListener("click",this,false);
					cols.appendChild(rect);

					// Create text element
					text = document.createElementNS(vs.svgNS,"text");
					text.setAttributeNS(null,"x",offset + vs.style.gdCellTextPadding);
					text.setAttributeNS(null,"y",(n * vs.style.gdCellHeight) + (0.7 * vs.style.gdCellHeight));
					text.setAttributeNS(null,"style",vs.style.gdCellTextStyle);
//					text.setAttributeNS(null,"pointer-events","none");

					// Add text to element
// TODO Replace vs.data with proper data structure
					textContent = document.createTextNode(vs.data[n][i]);
					text.appendChild(textContent);
					cols.appendChild(text);

					// Calculate the offset of next column
					offset += vs.defnGrids[that.id].fields[key].viewWidth;
					i++;
				}

				// Add event listeners to each row group
//				cols.addEventListener("click",this,false);
//				cols.addEventListener("mouseover",this,false);

				// Add the columns to the row group
				rows.appendChild(cols);
			}
		};

		// --------------------------------------------------------------------------------------
		// Add sliders to the bottom and right side of the grid
		// --------------------------------------------------------------------------------------
		that.addSliders = function() {
			var xMax,yMax,
				gridWidth = 0;

			// Convert total number of columns in grid into pixels
			for(var key in vs.defnGrids[that.id].fields) {
				gridWidth += vs.defnGrids[that.id].fields[key].viewWidth;
			}

			// Maximum scrollable length, allowing that the grid will never be empty
			xMax = 1 + Math.max(0,(gridWidth - that.formWidth));
// TODO Replace vs.data with proper data structure
			yMax = 1 + Math.max(0,(vs.data.length - that.rows));

			// Create the sliders
			vs.slider({
				id: that.id+"SliderX",
				parent: that.gridNode,
				x: that.gridX,
				y: that.gridY + that.gridHeight,
				length: that.gridWidth,
				direction: "horizontal",
				min: 1,
				max: xMax,
				start: 1,
				feedback: true,
				border: true,
				postProcess: "vs.grid.scrollGrid"
			});

			vs.slider({
				id: that.id+"SliderY",
				parent: that.gridNode,
				x: that.gridX + that.gridWidth,
				y: that.gridY,
				length: that.gridHeight,
				direction: "vertical",
				min: 1,
				max: yMax,
				start: 1,
				feedback: true,
				border: true,
				postProcess: "vs.grid.scrollGrid"
			});
		};

		// --------------------------------------------------------------------------------------
		// Create the grid, a group holding each row of grid, then add sliders
		// --------------------------------------------------------------------------------------
		// Create a frame to hold the title bar, status bar and form controls
		vs.frame({
			id: that.id,
			x: that.x,
			y: that.y,
			width: that.formWidth,
			height: that.formHeight,
			moveable: true,
			titleBarVisible: true,
			statusBarVisible: true,
			titleText: that.gridTitle,
			iconText: that.iconTitle,
			statusText: that.statusText,
			closeButton: true,
			minimizeButton: true,
			maximizeButton: false,
			linkButton: false
		});

		// Group to which the grid will be added
		that.gridParent = vs.testParent(that.id);
		if(!that.gridParent) {
			vs.message("Grid could not reference parent node '"+that.id+"'");
			return;
		}

		// Create a grid parent group
		that.gridNode = document.createElementNS(vs.svgNS,"g");
		that.gridNode.setAttributeNS(null,"id","grid");
		that.gridParent.appendChild(that.gridNode);

		// Create the grid, a group holding each row of grid, then add sliders
		that.createGrid();
		that.addGridData();
		that.addSliders();
	};

	// --------------------------------------------------------------------------------------
	// Responds to callbacks from X and Y sliders, and scrolls grid in viewport
	//
	// Argument 1 : Mouse action that instigated the scroll (move/release)
	// Argument 2 : Node ID of the grid
	// Argument 3 : Direction to scroll (vertical/horizontal)
	// Argument 4 : Position of slider handle (relative to start and end of slider)
	// --------------------------------------------------------------------------------------
	vs.grid.scrollGrid = function(action,grid,direction,slider) {
		var gridId = grid.parentNode.id,
			data = document.getElementById(gridId+".data"),
			head = document.getElementById(gridId+".title"),
			position = Math.round(slider),
			x = vs.grid.viewbox[gridId].x,
			y = vs.grid.viewbox[gridId].y,
			w = vs.grid.viewbox[gridId].width,
			h = vs.grid.viewbox[gridId].height;

		// Scroll on the X-axis
		if(direction == 'horizontal') {
			vs.grid.viewbox[gridId].x = position;
			data.setAttributeNS(null,"viewBox",x+" "+y+" "+w+" "+h);
			head.setAttributeNS(null,"viewBox",x+" "+0+" "+w+" "+vs.style.gdCellHeight);
		}
		// Scroll on the Y-axis
		else {
			vs.grid.viewbox[gridId].y = vs.style.gdCellHeight * (position - 1);
			data.setAttributeNS(null,"viewBox",x+" "+y+" "+w+" "+h);
		}
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Load application definitions and styles
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.loadData = function () {
		var that = {};

		// Read the application definition file from the server
		that.definitionsLoad = function() {
			vs.ajaxSynchJSON(vs.source.definitions, that.definitionsSave);
		}

		// Save the definitions
		that.definitionsSave = function(json) {
			vs.definitions = json;
			// Create the form definitions
			vs.defnForms = that.formDefinitions(json);

			// Create the grid definitions
			vs.defnGrids = that.gridDefinitions(json);

			that.stylesLoad();
		}

		// Initialise the style object and load the style definitions from the server
		that.stylesLoad = function() {
			vs.ajaxSynchJSON(vs.source.stylesheet, that.stylesSave);
		}

		// Save the styles
		that.stylesSave = function(json) {
			vs.styles = json;
			vs.window.initialise();
		}

		// --------------------------------------------------------------------------------------
		// Build the structure for all forms and the associated fields from the application
		// data read from the server
		//
		// Argument 1 : Object holding element definitions
		//
		// Return the form stucture in an object
		// --------------------------------------------------------------------------------------
		that.formDefinitions = function(elements) {
			var id,type,values,chars,regex,
				forms = {};

			// Loop through the menus
			for(var n=0; n<elements.e.length; n++) {
				// Loop through each form within a menu
				for(var i=0; i<elements.e[n].options.length; i++) {
					id = elements.e[n].options[i]['id'];
					type = elements.e[n].options[i]['type'];

					//Add the form definition
					if(type == 'form') {
						forms[id] = {};
						forms[id].x = elements.e[n].options[i]['x'];
						forms[id].y = elements.e[n].options[i]['y'];
						forms[id].name = elements.e[n].options[i]['name'];
						forms[id].icon = elements.e[n].options[i]['icon'];
						forms[id].msg = elements.e[n].options[i]['statusMsg'];
						forms[id].postProcess = elements.e[n].options[i]['postProcess'];

						// Add the field definitions to the form
						forms[id].fields = {};
						for(var f=0; f<elements.e[n].options[i].field.length; f++) {
							fld = elements.e[n].options[i].field[f]['id'];
							forms[id].fields[fld] = {};
							forms[id].fields[fld].id = fld;
							forms[id].fields[fld].name = elements.e[n].options[i].field[f]['name'];
							forms[id].fields[fld].viewWidth = parseInt(elements.e[n].options[i].field[f]['viewWidth']);
							forms[id].fields[fld].scrollWidth = parseInt(elements.e[n].options[i].field[f]['scrollWidth']);
							forms[id].fields[fld].defaultValue = elements.e[n].options[i].field[f]['default'];
							type = elements.e[n].options[i].field[f]['type'];
							forms[id].fields[fld].type = type;

							// If list, then save list ID to the validation field
							if(type == "list") {
								// Assumes named variable is a global so it can be accessed by window[]
								values = window[elements.e[n].options[i].field[f]['listId']];
// TODO Lists must be set up, if not, issue warning
								forms[id].fields[fld].validation = values;
							}
							// If text box, then save list ID to the validation field
							else if(type == "text") {
								chars = parseInt(elements.e[n].options[i].field[f]['chars']);
								regex = elements.e[n].options[i].field[f]['validation'];
								forms[id].fields[fld].validation = [chars,regex];
							}
							// Unknown type
							else { vs.message("Unknown validation type ["+ft+"]"); }
						}
					}
				}
			}
			return forms;
		};

		// --------------------------------------------------------------------------------------
		// Build the structure for all grids and the associated fields from the application
		// data read from the server
		//
		// Argument 1 : Object holding element definitions
		//
		// Return the grid stucture in an object
		// --------------------------------------------------------------------------------------
		that.gridDefinitions = function(elements) {
			var id,type,
				grids = {};

			// Loop through the menus
			for(var n=0; n<elements.e.length; n++) {
				// Loop through each grid within a menu
				for(var i=0; i<elements.e[n].options.length; i++) {
					id = elements.e[n].options[i]['id'];
					type = elements.e[n].options[i]['type'];

					//Add the grid definition
					if(type == 'grid') {
						grids[id] = {};
						grids[id].x = elements.e[n].options[i]['x'];
						grids[id].y = elements.e[n].options[i]['y'];
						grids[id].name = elements.e[n].options[i]['name'];
						grids[id].icon = elements.e[n].options[i]['icon'];
						grids[id].rows = elements.e[n].options[i]['rows'];
						grids[id].msg = elements.e[n].options[i]['statusMsg'];

						// Add the field definitions to the grid
						grids[id].fields = {};
						for(var f=0; f<elements.e[n].options[i].field.length; f++) {
							fld = elements.e[n].options[i].field[f]['id'];
							grids[id].fields[fld] = {};
							grids[id].fields[fld].id = fld;
							grids[id].fields[fld].name = elements.e[n].options[i].field[f]['name'];
							grids[id].fields[fld].viewWidth = parseInt(elements.e[n].options[i].field[f]['viewWidth']);
							grids[id].fields[fld].scrollWidth = parseInt(elements.e[n].options[i].field[f]['scrollWidth']);
							grids[id].fields[fld].defaultValue = elements.e[n].options[i].field[f]['default'];
							grids[id].fields[fld].type = elements.e[n].options[i].field[f]['type'];
						}
					}
				}
			}
			return grids;
		};

		// Start by loading the application definitions
		that.definitionsLoad();
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Menu and drop-down options across the top of the window
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.menu = function(elements) {
		var that = {};

		// --------------------------------------------------------------------------------------
		// Build the menu
		//	- There is a horizontal set of menu shown at all times: {menu ID}.menu
		//	- Each menu has a list that groups the options: {menu ID}.list
		//	- Each option is named: {menu ID}.{option ID}
		//	- Moving the mouse over the menu will show the list of options
		//	- Moving the mouse off the menu or open list will hide the list of options
		// --------------------------------------------------------------------------------------
		that.createMenu = function() {
			var menubar,menu,rect,txt,words,list,option;

			// Create a menu group to hold the menu text and options and attach it to window node
			menubar = document.createElementNS(vs.svgNS,"g");
			menubar.setAttributeNS(null,"id","menubar");
			vs.windowNode.appendChild(menubar);

			// Create menu bar
			for(var i=0; i<that.menus.length; i++) {
				// Create a menu group to hold the menu text and options
				menu = document.createElementNS(vs.svgNS,"g");
				menu.setAttributeNS(null,"id",that.menus[i][0]+".menu");
				menubar.appendChild(menu);

				// Create background rect for menu title
				rect = document.createElementNS(vs.svgNS,"rect");
				rect.setAttributeNS(null,"x",vs.style.muMenuRectOffsetX + (i * vs.style.muMenuRectWidth));
				rect.setAttributeNS(null,"y",vs.style.muMenuRectOffsetY);
				rect.setAttributeNS(null,"width",vs.style.muMenuRectWidth);
				rect.setAttributeNS(null,"height",vs.style.muMenuRectHeight);
				rect.setAttributeNS(null,"style",vs.style.muMenuRectStyle);
				rect.setAttributeNS(null,"pointer-events","fill");
				rect.addEventListener("mouseover",that,false);
				rect.addEventListener("mouseout",that,false);
				menu.appendChild(rect);

				// Create text element for menu title
				txt = document.createElementNS(vs.svgNS,"text");
				txt.setAttributeNS(null,"x",vs.style.muMenuRectOffsetX + vs.style.muMenuTextOffsetX + (i * vs.style.muMenuRectWidth));
				txt.setAttributeNS(null,"y",vs.style.muMenuRectOffsetY + vs.style.muMenuTextOffsetY);
				txt.setAttributeNS(null,"style",vs.style.muMenuTextStyle);
				txt.setAttributeNS(null,"pointer-events","fill");
				txt.addEventListener("mouseover",that,false);
				txt.addEventListener("mouseout",that,false);

				// Add text to element for menu title
				words = document.createTextNode(that.menus[i][0]);
				txt.appendChild(words);
				menu.appendChild(txt);

				// Create a list group for the options that can be shown/hidden under the menu
				list = document.createElementNS(vs.svgNS,"g");
				list.setAttributeNS(null,"id",that.menus[i][0]+".list");
				list.setAttributeNS(null,"visibility","hidden");
				menu.appendChild(list);

				for(var n=0; n<that.menus[i][1].length; n++) {
					// Create an option group to hold the option rect and text
					option = document.createElementNS(vs.svgNS,"g");
					option.setAttributeNS(null,"id",that.menus[i][0]+'.'+that.menus[i][1][n][1]+'.'+that.menus[i][1][n][2]);
					list.appendChild(option);

					// Create background rect
					rect = document.createElementNS(vs.svgNS,"rect");
					rect.setAttributeNS(null,"x",vs.style.muMenuRectOffsetX + (i * vs.style.muMenuRectWidth) + vs.style.muOptionRectOffsetX);
					rect.setAttributeNS(null,"y",vs.style.muMenuRectOffsetY + vs.style.muMenuRectHeight + (n * vs.style.muOptionRectHeight));
					rect.setAttributeNS(null,"width",vs.style.muOptionRectWidth);
					rect.setAttributeNS(null,"height",vs.style.muOptionRectHeight);
					rect.setAttributeNS(null,"style",vs.style.muOptionRectStyle);
					rect.setAttributeNS(null,"pointer-events","fill");
					rect.addEventListener("click",that,false);
					rect.addEventListener("mouseover",that,false);
					rect.addEventListener("mouseout",that,false);
					option.appendChild(rect);

					// Create text element
					txt = document.createElementNS(vs.svgNS,"text");
					txt.setAttributeNS(null,"x",vs.style.muMenuRectOffsetX + (i * vs.style.muMenuRectWidth) + vs.style.muOptionRectOffsetX + vs.style.muOptionTextOffsetX);
					txt.setAttributeNS(null,"y",vs.style.muMenuRectOffsetY + vs.style.muMenuRectHeight + (n * vs.style.muOptionRectHeight) + vs.style.muOptionTextOffsetY);
					txt.setAttributeNS(null,"style",vs.style.muOptionTextStyle);
					txt.setAttributeNS(null,"pointer-events","fill");
					txt.addEventListener("click",that,false);
					txt.addEventListener("mouseover",that,false);
					txt.addEventListener("mouseout",that,false);

					// Add text to element
					words = document.createTextNode(that.menus[i][1][n][0]);
					txt.appendChild(words);
					option.appendChild(txt);
				}
			}
		};

		// --------------------------------------------------------------------------------------
		// Run functions triggered by addEventListener on click and mouse move
		//	- Menus are referenced by: {menu ID}.menu
		//	- Lists are referenced by: {menu ID}.list
		//	- Options are referenced by: {menu ID}.{option ID}.{type}
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			var node,
				id = evt.currentTarget.parentNode.id,
				parts = id.split('.'),
				menu = parts[0],
				controlId = parts[1],
				controlType = parts[2];

			// Open the form or grid associated with the option when the option is clicked
			if(evt.type == "click") {
				if(controlType == 'form') {
					vs.form({ id: controlId });
				}
				else if(controlType == 'grid') {
					vs.grid({ id: controlId });
				}
				else {
					vs.message("Unknown control : "+controlType);
				}
			}

			// Show the group holding the list of options when the cursor moves over a menu
			if(evt.type == "mouseover") {
				node = document.getElementById(menu+".list");
				node.setAttributeNS(null,"visibility","visible");
			}

			// Hide the group holding the list of options when the cursor moves away from a menu
			if(evt.type == "mouseout") {
				node = document.getElementById(menu+".list");
				node.setAttributeNS(null,"visibility","hidden");
			}
		};

		// --------------------------------------------------------------------------------------
		// Build the structure for all menus from the application data read from the server
		// Includes the options for each menu
		//
		// Argument 1 : Object holding element definitions
		//
		// Return the menu stucture in an array
		// --------------------------------------------------------------------------------------
		that.menuDefinitions = function(elements) {
			var menu,option,name,call,type,
				menus = new Array();

			// Loop through all menu/options elements to build menu structure
			for(var n=0; n<elements.e.length; n++) {
				menu = elements.e[n].menu;
				option = new Array();
				for(var i=0; i<elements.e[n].options.length; i++) {
					name = elements.e[n].options[i]['menu'];
					call = elements.e[n].options[i]['id'];
					type = elements.e[n].options[i]['type'];
					option.push([name,call,type]);
				}
				menus.push([menu,option]);
			}
			return menus;
		};

		// --------------------------------------------------------------------------------------
		// Create the menu definitions and build the menus
		// --------------------------------------------------------------------------------------
		that.menus = that.menuDefinitions(elements);
		that.createMenu();
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Selection list with optional scroll bar
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.selectionList = function(args) {
		var that = {
			id: args.id,						// ID of the field
			parent: args.formId,				// Parent form of the selection list
			x: args.x,							// Upper left corner of selection list in viewBox coordinates
			y: args.y,							// Upper left corner of selection list in viewBox coordinates
			width: args.width,					// Width of selectionList in viewBox coordinates
			elementsArray: args.elementsArray,	// Array containing text elements of selectionList
			noItems: args.noItems,				// Number of elements for unfolded selectionList (number, integer)
			activeSelection: args.preSelect,	// Holds currently selected index value
			curLowerIndex: args.preSelect,		// Value is adapted if the user moves scrollbar
			label: args.label,					// Label for the list
			labelWidth: args.labelWidth,		// Width of the label

			// Status variables
			isListOpen: false,					// Status folded=false, open=true - previously been sLselectionVisible
			scrollStep: 0,						// Y-value to go for one element
			scrollerHeight: 0,					// Height of dragable scroller bar
			scrollBar: undefined,				// Reference to the scrollbar rectangle
			scrollCumulus: 0,					// If value is less then a scrollstep we need to accumulate scroll values
			panY: false							// Stores the y value of event
		};

		// Form to which the selection list will be added
		that.slParent = vs.testParent(that.parent);
		if(!that.slParent) {
			vs.message("Selection list '"+that.id+"' could not reference parent node '"+that.parent+"'");
			return;
		}

		// Create a node to hold the selection list
		that.slNode = document.createElementNS(vs.svgNS,"g");
		that.slNode.setAttributeNS(null,"id",that.id+".list");
		that.slParent.appendChild(that.slNode);

		// Initialise internal variables
		that.triangleFourth = Math.round(vs.style.slBoxHeight / 4);												// ?????????
		that.textPaddingVertical = vs.style.slBoxHeight - (vs.style.slBoxHeight - vs.style.slTextSize) * 0.7;	// Relative to the top of the cell
		that.scrollerMinHeight = vs.style.slBoxHeight * 0.5;													// Minimal height of scroller rect

		// --------------------------------------------------------------------------------------
		// Create the selection list
		// --------------------------------------------------------------------------------------
		that.createSelectionList = function() {
			var node,selnText,myTrianglePath;

			// Rectangular background with click event to show/hide the option list
			node = document.createElementNS(vs.svgNS,"rect");
			node.setAttributeNS(null,"id",that.id+".field");
			node.setAttributeNS(null,"x",that.x);
			node.setAttributeNS(null,"y",that.y);
			node.setAttributeNS(null,"width",that.width);
			node.setAttributeNS(null,"height",vs.style.slBoxHeight);
			node.setAttributeNS(null,"style",vs.style.slBoxStyles);
			node.addEventListener("click", this, false);
			that.slNode.appendChild(node);

			// Default value in selection box
			that.selectedText = document.createElementNS(vs.svgNS,"text");
			that.selectedText.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding);
			that.selectedText.setAttributeNS(null,"y",that.y + that.textPaddingVertical);
			that.selectedText.setAttributeNS(null,"style",vs.style.slBoxTextStyles);
			that.selectedText.setAttributeNS(null,"pointer-events","none");
			selnText = document.createTextNode(that.elementsArray[that.activeSelection]);
			that.selectedText.appendChild(selnText);
			that.slNode.appendChild(that.selectedText);

			// Save default value as data value
			vs.defnForms[that.parent].fields[that.id].data = that.elementsArray[that.activeSelection];

			// Small rectangle to the right holding the arrow icon with click event to show/hide the option list
			node = document.createElementNS(vs.svgNS,"rect");
			node.setAttributeNS(null,"id",that.id+".pulldown");
			node.setAttributeNS(null,"x",that.x + that.width - vs.style.slBoxHeight);
			node.setAttributeNS(null,"y",that.y);
			node.setAttributeNS(null,"width",vs.style.slBoxHeight);
			node.setAttributeNS(null,"height",vs.style.slBoxHeight);
			node.setAttributeNS(null,"style",vs.style.slBoxSmallRectStyles);
			node.addEventListener("click", this, false);
			that.slNode.appendChild(node);

			// Arrow icon to fold/unfold selection list
			node = document.createElementNS(vs.svgNS,"path");
			node.setAttributeNS(null,"id",that.id+".triangle");
			myTrianglePath = "M"+(that.x + that.width - 3 * that.triangleFourth)+" "+(that.y + that.triangleFourth)+" L"+(that.x + that.width - that.triangleFourth)+" "+(that.y + that.triangleFourth)+" L"+(that.x + that.width - 2 * that.triangleFourth)+" "+(that.y + 3 * that.triangleFourth)+" Z";
			node.setAttributeNS(null,"d",myTrianglePath);
			node.setAttributeNS(null,"style",vs.style.slBoxTriangleStyles);
			node.setAttributeNS(null,"pointer-events","none");
			that.slNode.appendChild(node);
		};

		// --------------------------------------------------------------------------------------
		// Build a dropdown list for the field referenced in that.dynamicTextGroup
		//
		// This is done on the fly rather than when the selection list is built so that it is
		// displayed above any other fields below it
		// --------------------------------------------------------------------------------------
		that.createOptionDropdown = function() {
			var noElements,noInList,selnHeight,yOffset,selnText,node;

			// Create group to hold list and attach to root node so it appears above other fields
			if(!that.dynamicTextGroup) {
				that.dynamicTextGroup = document.createElementNS(vs.svgNS,"g");
				that.dynamicTextGroup.setAttributeNS(null,"id",that.id+".dropdown");
				that.slParent.appendChild(that.dynamicTextGroup);
			}

			// Find number of elements in list and set number of items to be shown to lower of
			// number of elements or max number for a list
			noElements = that.elementsArray.length;
			noInList = (noElements > that.noItems) ? that.noItems : noElements;
			selnHeight = vs.style.slBoxHeight * noInList;

			// Hold index for current selection to unroll list at new offset
			that.curLowerIndex = ((noElements - that.activeSelection) >= noInList) ? that.activeSelection : noElements - noInList;
			yOffset = that.y + vs.style.slBoxHeight;

			// Rectangle to hold selection list, hidden to begin with
			node = document.createElementNS(vs.svgNS,"rect");
			node.setAttributeNS(null,"x",that.x);
			node.setAttributeNS(null,"y",that.y + vs.style.slBoxHeight);
			node.setAttributeNS(null,"width",that.width - vs.style.slBoxHeight);
			node.setAttributeNS(null,"height",0);
			node.setAttributeNS(null,"fill","none");
			node.setAttributeNS(null,"style",vs.style.slBoxStyles);
			node.setAttributeNS(null,"display","none");
			that.dynamicTextGroup.appendChild(node);

			// For each option to be shown in the list
			for(var i=0; i<noInList; i++) {
				// Add rectangles to capture events
				node = document.createElementNS(vs.svgNS,"rect");
				node.setAttributeNS(null,"id",that.id + ".dropdown.rect." + (i + that.curLowerIndex));
				node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding / 2);
				node.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight * i);
				node.setAttributeNS(null,"width",that.width - vs.style.slBoxHeight - vs.style.slBoxTextPadding);
				node.setAttributeNS(null,"height",vs.style.slBoxHeight);
				node.setAttributeNS(null,"style",vs.style.slBoxStyles);

				// Add event-handlers
				node.addEventListener("mouseover", this, false);
				node.addEventListener("mouseout", this, false);
				node.addEventListener("click", this, false);
				that.dynamicTextGroup.appendChild(node);

				// Add text-elements
				node = document.createElementNS(vs.svgNS,"text");
				node.setAttributeNS(null,"id",that.id + ".dropdown.text." + (i + that.curLowerIndex));
				node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding);
				node.setAttributeNS(null,"y",yOffset + that.textPaddingVertical + vs.style.slBoxHeight * i);
				node.setAttributeNS(null,"pointer-events","none");
				node.setAttributeNS(null,"style",vs.style.slBoxTextStyles);
				selnText = document.createTextNode(that.elementsArray[that.curLowerIndex + i]);
				node.appendChild(selnText);
				that.dynamicTextGroup.appendChild(node);
			}

			// Create the scroll bar beside the list of options
			if(that.noItems < noElements) {
				// Calculate scroll step based on number of option in list and number of options displayed
				that.scrollerHeight = (that.noItems / noElements) * (selnHeight - 2 * vs.style.slBoxHeight);
				if(that.scrollerHeight < that.scrollerMinHeight) {
					that.scrollerHeight = that.scrollerMinHeight;
				}
				that.scrollStep = (selnHeight - 2 * vs.style.slBoxHeight - that.scrollerHeight) / (noElements - that.noItems);

				// Add scroll bar
				that.scrollBar = document.createElementNS(vs.svgNS,"rect");
				that.scrollBar.setAttributeNS(null,"id",that.id+".scrollbar.rect");
				that.scrollBar.setAttributeNS(null,"x",that.x + that.width - vs.style.slBoxHeight);
				that.scrollBar.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight);
				that.scrollBar.setAttributeNS(null,"width",vs.style.slBoxHeight);
				that.scrollBar.setAttributeNS(null,"height",selnHeight - vs.style.slBoxHeight * 2);
				that.scrollBar.setAttributeNS(null,"style",vs.style.slBoxScrollBarStyles);
				that.scrollBar.addEventListener("mousedown", this, false);
				that.dynamicTextGroup.appendChild(that.scrollBar);

				// Upper rectangle
				var node = document.createElementNS(vs.svgNS,"rect");
				node.setAttributeNS(null,"id",that.id+".scroll.upper.rect");
				node.setAttributeNS(null,"x",that.x + that.width - vs.style.slBoxHeight);
				node.setAttributeNS(null,"y",yOffset);
				node.setAttributeNS(null,"width",vs.style.slBoxHeight);
				node.setAttributeNS(null,"height",vs.style.slBoxHeight);
				node.setAttributeNS(null,"style",vs.style.slBoxSmallRectStyles);
				node.addEventListener("mousedown", this, false);
				node.addEventListener("mouseup", this, false);
				that.dynamicTextGroup.appendChild(node);

				// Upper triangle
				var node = document.createElementNS(vs.svgNS,"path");
				var myPath = "M"+(that.x + that.width - 3 * that.triangleFourth)+" "+(yOffset + 3 * that.triangleFourth)+" L"+(that.x + that.width - that.triangleFourth)+" "+(yOffset + 3 * that.triangleFourth)+" L"+(that.x + that.width - 2 * that.triangleFourth)+" "+(yOffset + that.triangleFourth)+" Z";
				node.setAttributeNS(null,"d",myPath);
				node.setAttributeNS(null,"style",vs.style.slBoxTriangleStyles);
				node.setAttributeNS(null,"pointer-events","none");
				that.dynamicTextGroup.appendChild(node);

				// Lower rectangle
				var node = document.createElementNS(vs.svgNS,"rect");
				node.setAttributeNS(null,"id",that.id+".scroll.lower.rect");
				node.setAttributeNS(null,"x",that.x + that.width - vs.style.slBoxHeight);
				node.setAttributeNS(null,"y",yOffset - vs.style.slBoxHeight + selnHeight);
				node.setAttributeNS(null,"width",vs.style.slBoxHeight);
				node.setAttributeNS(null,"height",vs.style.slBoxHeight);
				node.setAttributeNS(null,"style",vs.style.slBoxSmallRectStyles);
				node.addEventListener("mousedown", this, false);
				node.addEventListener("mouseup", this, false);
				that.dynamicTextGroup.appendChild(node);

				// Lower triangle
				var node = document.createElementNS(vs.svgNS,"path");
				var myPath = "M"+(that.x + that.width - 3 * that.triangleFourth)+" "+(yOffset - vs.style.slBoxHeight + selnHeight + that.triangleFourth)+" L"+(that.x + that.width - that.triangleFourth)+" "+(yOffset - vs.style.slBoxHeight + selnHeight + that.triangleFourth)+" L"+(that.x + that.width - 2 * that.triangleFourth)+" "+(yOffset - vs.style.slBoxHeight + selnHeight + 3 * that.triangleFourth)+" Z";
				node.setAttributeNS(null,"d",myPath);
				node.setAttributeNS(null,"style",vs.style.slBoxTriangleStyles);
				node.setAttributeNS(null,"pointer-events","none");
				that.dynamicTextGroup.appendChild(node);

				// ScrollerRect
				var node = document.createElementNS(vs.svgNS,"rect");
				node.setAttributeNS(null,"id",that.id+".scroll.slider");
				node.setAttributeNS(null,"x",that.x + that.width - vs.style.slBoxHeight);
				node.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight + that.scrollStep * that.curLowerIndex);
				node.setAttributeNS(null,"width",vs.style.slBoxHeight);
				node.setAttributeNS(null,"height",that.scrollerHeight);
				node.setAttributeNS(null,"style",vs.style.slBoxSmallRectStyles);
				node.setAttributeNS(null,"pointer-events","none");
				that.dynamicTextGroup.appendChild(node);
			}
			// Add event handler to root element to close selectionList if one clicks outside
// TODO These event handlers DNW
			document.documentElement.addEventListener("click",this,false);											// DNW !!!!!!!!!!!!!!!!!!!!!!
			document.documentElement.addEventListener("keypress",this,false);										// DNW !!!!!!!!!!!!!!!!!!!!!!
		};

		// --------------------------------------------------------------------------------------
		// Run functions triggered by addEventListener on click and mouse move
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			var node = evt.currentTarget,
				callerId = node.getAttributeNS(null,"id"),
				myRegExp = new RegExp(that.id);

			// Stop if ID is undefined (unrecognised node)
			if(!callerId) return;

			// Click events
			if(evt.type == "click") {
				if(myRegExp.test(callerId)) {
					// Clicking on the field or icon will show/hide the option list
					if(callerId.match(/.pulldown|.field/)) {
						if(that.isListOpen == false) that.listShow();
						else that.listHide();
					}
					// Select the option, copy it to field and hide the list
					if(callerId.match(/.dropdown.rect/)) {
						that.selectAndClose(evt);
					}
				}
			}

			// Mouse over events
			if(evt.type == "mouseover") {
				if(myRegExp.test(callerId)) {
					// Highlight the option under the mouse
					if(callerId.match(/.dropdown.rect/)) {
						node.setAttributeNS(null,"style",vs.style.slBoxHighlightStyles);
					}
				}
			}

			// Mouse out events
			if(evt.type == "mouseout") {
				if(myRegExp.test(callerId)) {
					// Un-highlight the option as the mouse leaves
					if(callerId.match(/.dropdown.rect./)) {
						node.setAttributeNS(null,"style",vs.style.slBoxStyles);
					}
					// Click on scroll bar slider
					if(callerId.match(/.scrollbar.rect/)) {
						that.scrollBarMove(evt);
					}
				}
			}

			// Mouse down events
			if(evt.type == "mousedown") {
				if(myRegExp.test(callerId)) {
					// Click on top/bottom scroll bar icons
					if(callerId.match(/.scroll.upper.rect|.scroll.lower.rect/)) {
						scrollDir = (callerId.match(/UpperRect/)) ? 'up' : 'down';
						that.scrollList({
							direction: scrollDir,
							number: 1,
							move: true
						});
					}
					// Click on scroll bar slider
					if(callerId.match(/.scrollbar.rect/)) {
						document.documentElement.addEventListener("mousemove",this,false);
						document.documentElement.addEventListener("mouseup",this,false);
						that.scrollBarMove(evt);
					}
				}

			}
		};

		// --------------------------------------------------------------------------------------
		// Hide the selection list
		// The test is to prevent multiple clicks from throwing errors
		// --------------------------------------------------------------------------------------
		that.listHide = function() {
			if(that.dynamicTextGroup) {
				that.slParent.removeChild(that.dynamicTextGroup);
				that.dynamicTextGroup = undefined;
				that.scrollBar = undefined;
				that.isListOpen = false;
			}
		};

		// --------------------------------------------------------------------------------------
		// Show the selection list
		// The test is to prevent multiple clicks from throwing errors
		// --------------------------------------------------------------------------------------
		that.listShow = function() {
			if(!that.dynamicTextGroup) {
				that.createOptionDropdown();
				that.slParent.appendChild(that.dynamicTextGroup);
				that.isListOpen = true;
			}
		};

		// --------------------------------------------------------------------------------------
		// Hide the list and update field with selected value
		// --------------------------------------------------------------------------------------
		that.selectAndClose = function(evt) {
			var parts = evt.target.getAttributeNS(null,"id").split(".");
			that.listHide();
			that.activeSelection = parseInt(parts[parts.length - 1]);
			that.curLowerIndex = that.activeSelection;
			that.selectedText.firstChild.nodeValue = that.elementsArray[that.activeSelection];

			// Save new value
			vs.defnForms[that.parent].fields[that.id].data = that.elementsArray[that.activeSelection];
		};

		// --------------------------------------------------------------------------------------
		// Update the scroll list depending on mouse events
		//
		// Arguments:
		//	direction:	Direction to scroll (up/down)
		//	number:		Number of elements to be scrolled
		//	move:		Should the scroll bar slider be moved (true/false)
		// --------------------------------------------------------------------------------------
		that.scrollList = function(args) {
			var scrollDir = args.direction,
				scrollNr = args.number,
				scrollBool = args.move,
				nrSelections = that.elementsArray.length,
				scroller = document.getElementById(that.id+".scroll.slider"),
				yOffset = that.y + vs.style.slBoxHeight,
				selnText,node;

			// If number of elements to be scrolled is less than number of items shown, then do 				?????????????
			if(scrollNr < that.noItems) {
				// Scroll up list if not at 1st element
				if((that.curLowerIndex > 0) && (scrollDir == "up")) {
					// Restrict number of elements to be scrolled so 1st element is first
					scrollNr = (scrollNr > that.curLowerIndex) ? that.curLowerIndex : scrollNr;

					// Decrement current index by numer to be scrolled
					that.curLowerIndex = that.curLowerIndex - scrollNr;

					// Move scroll slider
					if(scrollBool == true) {
						scroller.setAttributeNS(null,"y",parseFloat(scroller.getAttributeNS(null,"y"))+ that.scrollStep * -1);
					}

					// Add upper rect element
					for(var i=0; i<scrollNr; i++) {
						node = document.createElementNS(vs.svgNS,"rect");
						node.setAttributeNS(null,"id",that.id + ".dropdown.rect." + (i + that.curLowerIndex));
						node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding / 2);
						node.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight * i);
						node.setAttributeNS(null,"width",that.width - vs.style.slBoxHeight - vs.style.slBoxTextPadding);
						node.setAttributeNS(null,"height",vs.style.slBoxHeight);
						node.setAttributeNS(null,"style",vs.style.slBoxStyles);

						// Add event-handlers
						node.addEventListener("mouseover", this, false);
						node.addEventListener("mouseout", this, false);
						node.addEventListener("click", this, false);
						that.dynamicTextGroup.appendChild(node);

						// Add text-nodes
						node = document.createElementNS(vs.svgNS,"text");
						node.setAttributeNS(null,"id",that.id + ".dropdown.text." + (i + that.curLowerIndex));
						node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding);
						node.setAttributeNS(null,"y",yOffset + that.textPaddingVertical + vs.style.slBoxHeight * i);
						node.setAttributeNS(null,"pointer-events","none");
						node.setAttributeNS(null,"style",vs.style.slBoxTextStyles);
						selnText = document.createTextNode(that.elementsArray[that.curLowerIndex + i]);
						node.appendChild(selnText);
						that.dynamicTextGroup.appendChild(node);
					}

					// Move middle elements
					for(var j=i;j<that.noItems;j++) {
						node = document.getElementById(that.id + ".dropdown.text." + (j + that.curLowerIndex));
						node.setAttributeNS(null,"y",parseFloat(node.getAttributeNS(null,"y")) + (vs.style.slBoxHeight * scrollNr));
						node = document.getElementById(that.id + ".dropdown.rect." + (j + that.curLowerIndex));
						node.setAttributeNS(null,"y",parseFloat(node.getAttributeNS(null,"y")) + (vs.style.slBoxHeight * scrollNr));
					}

					// Remove lower elements
					for(var k=j;k<(j+scrollNr);k++) {
						node = document.getElementById(that.id + ".dropdown.text." + (k + that.curLowerIndex));
						that.dynamicTextGroup.removeChild(node);
						node = document.getElementById(that.id +".dropdown.rect." + (k + that.curLowerIndex));
						that.dynamicTextGroup.removeChild(node);
					}
				}
				// Scroll down list
				else if ((that.curLowerIndex < nrSelections - that.noItems) && (scrollDir == "down")) {
					// Move scroll slider
					if(scrollBool == true) {
						scroller.setAttributeNS(null,"y",parseFloat(scroller.getAttributeNS(null,"y")) + that.scrollStep);
					}

					// Remove most upper element
					for(var i=0;i<scrollNr;i++) {
						node = document.getElementById(that.id + ".dropdown.text." + (that.curLowerIndex + i));
						that.dynamicTextGroup.removeChild(node);
						node = document.getElementById(that.id + ".dropdown.rect." + (that.curLowerIndex + i));
						that.dynamicTextGroup.removeChild(node);
					}

					// Move middle elements
					for(var j=i;j<that.noItems;j++) {
						node = document.getElementById(that.id + ".dropdown.text." + (j + that.curLowerIndex));
						node.setAttributeNS(null,"y",parseFloat(node.getAttributeNS(null,"y")) - (vs.style.slBoxHeight * scrollNr));
						node = document.getElementById(that.id + ".dropdown.rect." + (j + that.curLowerIndex));
						node.setAttributeNS(null,"y",parseFloat(node.getAttributeNS(null,"y")) - (vs.style.slBoxHeight * scrollNr));
					}

					// Add most lower element
					for(var k=j;k<(j+scrollNr);k++) {
						node = document.createElementNS(vs.svgNS,"rect");
						node.setAttribute("id",that.id + ".dropdown.rect." + (k + that.curLowerIndex));
						node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding / 2);
						node.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight * (k - scrollNr));
						node.setAttributeNS(null,"width",that.width - vs.style.slBoxHeight - vs.style.slBoxTextPadding);
						node.setAttributeNS(null,"height",vs.style.slBoxHeight);
						node.setAttributeNS(null,"style",vs.style.slBoxStyles);

						// Add event-handlers
						node.addEventListener("mouseover", this, false);
						node.addEventListener("mouseout", this, false);
						node.addEventListener("click", this, false);
						that.dynamicTextGroup.appendChild(node);

						// Add text-nodes
						node = document.createElementNS(vs.svgNS,"text");
						node.setAttributeNS(null,"id",that.id + ".dropdown.text." + (k + that.curLowerIndex));
						node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding);
						node.setAttributeNS(null,"y",yOffset + that.textPaddingVertical + vs.style.slBoxHeight * (k - scrollNr));
						node.setAttributeNS(null,"pointer-events","none");
						node.setAttributeNS(null,"style",vs.style.slBoxTextStyles);
						selnText = document.createTextNode(that.elementsArray[that.curLowerIndex + k]);
						node.appendChild(selnText);
						that.dynamicTextGroup.appendChild(node);
					}

					// Increment current index
					that.curLowerIndex = that.curLowerIndex + scrollNr;
				}
			}
			// If number of elements to be scrolled is more than number of items shown, then do 				?????????????
			else {
				// Remove lower elements
				for(var i=0; i<that.noItems; i++) {
					node = document.getElementById(that.id + ".dropdown.text." + (i + that.curLowerIndex));
					that.dynamicTextGroup.removeChild(node);
					node = document.getElementById(that.id + ".dropdown.rect." + (i + that.curLowerIndex));
					that.dynamicTextGroup.removeChild(node);
				}

				// Restrict lower index so a full list is shown when at bottom of list
				that.curLowerIndex = (scrollDir == "down") ? that.curLowerIndex + scrollNr : that.curLowerIndex - scrollNr;

				// Display last options in list
				for(var i=0; i<that.noItems; i++) {
					node = document.createElementNS(vs.svgNS,"rect");
					node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding / 2);
					node.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight * i);
					node.setAttributeNS(null,"width",that.width - vs.style.slBoxHeight - vs.style.slBoxTextPadding);
					node.setAttributeNS(null,"height",vs.style.slBoxHeight);
					node.setAttributeNS(null,"style",vs.style.slBoxStyles);
					node.setAttributeNS(null,"id",that.id + ".dropdown.rect." + (i + that.curLowerIndex));

					// Add event-handlers
					node.addEventListener("mouseover", this, false);
					node.addEventListener("mouseout", this, false);
					node.addEventListener("click", this, false);
					that.dynamicTextGroup.appendChild(node);

					// Add text-nodes
					node = document.createElementNS(vs.svgNS,"text");
					node.setAttributeNS(null,"id",that.id + ".dropdown.text." + (i + that.curLowerIndex));
					node.setAttributeNS(null,"x",that.x + vs.style.slBoxTextPadding);
					node.setAttributeNS(null,"y",yOffset + that.textPaddingVertical + vs.style.slBoxHeight * i);
					node.setAttributeNS(null,"pointer-events","none");
					node.setAttributeNS(null,"style",vs.style.slBoxTextStyles);
					selnText = document.createTextNode(that.elementsArray[that.curLowerIndex + i]);
					node.appendChild(selnText);
					that.dynamicTextGroup.appendChild(node);
				}
			}
		};

		// --------------------------------------------------------------------------------------
		// Control movement of the cursor in the scroll bar
		// --------------------------------------------------------------------------------------
// TODO Document this function
		that.scrollBarMove = function(evt) {
			var scroller = document.getElementById(that.id+".scroll.slider"),
				scrollerHeight = parseFloat(scroller.getAttributeNS(null,"height")),
				scrollerMinY = parseFloat(that.scrollBar.getAttributeNS(null,"y")),
				scrollerMaxY = parseFloat(that.scrollBar.getAttributeNS(null,"y")) + parseFloat(that.scrollBar.getAttributeNS(null,"height")) - scrollerHeight,
				yOffset = that.y + vs.style.slBoxHeight,
				coordPoint,oldY,newY,panDiffY,scrollDir,scrollNr,panNewEvtY;

			// Mouse down on scroll bar will move to an element in the list matching the relative
			// position of the click within the scroll bar
			if(evt.type == "mousedown") {
				that.panStatus = true;
				scroller.setAttributeNS(null,"style",vs.style.slBoxTriangleStyles);
				coordPoint = vs.calcCoord(evt,that.scrollBar);
				that.panY = coordPoint.y;
				oldY = parseFloat(scroller.getAttributeNS(null,"y"));
				newY = that.panY - parseFloat(scroller.getAttributeNS(null,"height")) / 2;
				if(newY < scrollerMinY) {
					newY = scrollerMinY;
					// Maybe recalculate that.panY ??
				}
				if(newY > scrollerMaxY) {
					newY = scrollerMaxY;
				}
				panDiffY = newY - oldY;
				scrollDir = "down";
				that.scrollCumulus = 0;
				if(Math.abs(panDiffY) > that.scrollStep) {
					scrollNr = Math.abs(Math.round(panDiffY / that.scrollStep));
					if(panDiffY > 0) {
						that.scrollCumulus = panDiffY - that.scrollStep * scrollNr;
					}
					else {
						that.scrollCumulus = panDiffY + that.scrollStep * scrollNr;
						scrollDir = "up";
					}
					newY = oldY + panDiffY;
					scroller.setAttributeNS(null,"y",newY);
					that.scrollList({
						direction: scrollDir,
						number: scrollNr,
						move: false
					});
				}
			}
			else if(evt.type == "mouseup" || evt.type == "mouseout") {
				if(that.panStatus == true) {
					newY = parseFloat(scroller.getAttributeNS(null,"y"));
					scroller.setAttributeNS(null,"style",vs.style.slBoxSmallRectStyles);
					scroller.setAttributeNS(null,"y",yOffset + vs.style.slBoxHeight + that.scrollStep * that.curLowerIndex);
				}
				that.panStatus = false;
			}
			// ????????
			else if(evt.type == "mousemove") {
				if(that.panStatus == true) {
					coordPoint = vs.calcCoord(evt,that.scrollBar);
					panNewEvtY = coordPoint.y;
					panDiffY = panNewEvtY - that.panY;
					oldY = parseFloat(scroller.getAttributeNS(null,"y"));
					newY = oldY + panDiffY;
					if(newY < scrollerMinY) {
						newY = scrollerMinY;
					}
					if(newY > scrollerMaxY) {
						newY = scrollerMaxY;
					}
					panDiffY = newY - oldY;
					if((panDiffY < 0 && panNewEvtY <= (scrollerMaxY+scrollerHeight)) || (panDiffY > 0 && panNewEvtY >= scrollerMinY)) {
						that.scrollCumulus += panDiffY;
						scrollDir = "down";
						scrollNr = 0;
						if(Math.abs(that.scrollCumulus) >= that.scrollStep) {
							scrollNr = Math.abs(Math.round(that.scrollCumulus / that.scrollStep));
							if(that.scrollCumulus > 0) {
								that.scrollCumulus = that.scrollCumulus - that.scrollStep * scrollNr;
							}
							else {
								that.scrollCumulus = that.scrollCumulus + that.scrollStep * scrollNr;
								scrollDir = "up";
							}
							that.scrollList({
								direction: scrollDir,
								number: scrollNr,
								move: false
							});
						}
						else {
							if(Math.abs(that.scrollCumulus) > that.scrollStep) {
								scrollNr = 1;
								if(panDiffY < 0) {
									scrollDir = "up";
									that.scrollCumulus = that.scrollCumulus + that.scrollStep;
								}
								else {
									that.scrollCumulus = that.scrollCumulus - that.scrollStep;
								}
								panDiffY = that.scrollCumulus;
								that.scrollList({
									direction: scrollDir,
									number: scrollNr,
									move: false
								});
							}
							else {
								if(newY == scrollerMinY && that.curLowerIndex != 0) {
									that.scrollList({
										direction: 'up',
										number: 1,
										move: false
									});
								}
								else if(newY == scrollerMaxY && that.curLowerIndex != (that.elementsArray.length - that.noItems)) {
									that.scrollList({
										direction: 'down',
										number: 1,
										move: false
									});
								}
							}
						}
						newY = oldY + panDiffY;
						scroller.setAttributeNS(null,"y",newY);
						that.panY = panNewEvtY;
					}
				}
			}
		};

		// --------------------------------------------------------------------------------------
		// Create the selection list and add a label if required
		// --------------------------------------------------------------------------------------
		that.createSelectionList();
		if(that.label) {
			vs.textArea({
				id:that.id+".label",
				formId:that.parent,
				x:(that.x-that.labelWidth),
				y:(that.y+vs.style.tbTextSize),
				text:that.label});
		}
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Slider control for user with grids or stand-alone
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.slider = function(args) {
		var that = {
			id: args.id, 							// ID of slider
			slParent: args.parent,					// ID of parent node
			x: args.x,								// X-coordinate of start of slider
			y: args.y,								// Y-coordinate of start of slider
			length: args.length,					// Length of the slider (pixels)
			border: args.border,					// Should border be displayed around slider (true/false)
			direction: args.direction,				// Orientation of slider (horizontal/vertical)
			min: args.min,							// Value at start of slider
			max: args.max,							// Value at end of slider
			value: args.start,						// Initial value of slider
			feedback: args.feedback,				// Should slider give immediate feedback (true/false)
			postProcess: args.postProcess			// Function to call when mouse used on slider
		};

		// Initialise internal variables
		that.pointerStatus = 0;						// 1=Mouse moving, 2=Mouse released
		that.sliderLength = that.length - ((that.border) ? (2 * vs.style.sdBorderSpacing) : 0);

		// --------------------------------------------------------------------------------------
		// Instantiate the slider
		// --------------------------------------------------------------------------------------
		that.createSlider = function() {
			var group,x,transform,rect,line;

			// Create a group to hold the slider elements
			group = document.createElementNS(vs.svgNS,"g");
			if(that.direction == "vertical") {
				x = that.x + vs.style.sdSymbolSize + (2 * vs.style.sdBorderSpacing);
				transform = "translate("+x+","+that.y+") rotate(90)";
			}
			else {
				transform = "translate("+that.x+","+that.y+")";
			}
			group.setAttributeNS(null,"transform",transform);
			that.slParent.appendChild(group);

			// Draw slider area that picks up mouse clicks
			rect = document.createElementNS(vs.svgNS,"rect");
			rect.setAttributeNS(null,"x",0);
			rect.setAttributeNS(null,"y",0);
			rect.setAttributeNS(null,"width",that.length);
			rect.setAttributeNS(null,"height",vs.style.sdSymbolSize + (2 * vs.style.sdBorderSpacing));
			rect.setAttributeNS(null,"style",vs.style.sdAreaStyle);

			// Show border around the slider
			if(!that.border) {
				rect.setAttributeNS(null,"stroke-opacity","0");
				rect.setAttributeNS(null,"fill-opacity","0");
			}
			rect.addEventListener("mousedown",this,false);
			group.appendChild(rect);

			// Draw slider line along which the slider symbol will run
			that.start = {};
			that.start.x = (that.border) ? vs.style.sdBorderSpacing : 0;
			that.start.y = vs.style.sdBorderSpacing + (vs.style.sdSymbolSize / 2);
			line = document.createElementNS(vs.svgNS,"line");
			line.setAttributeNS(null,"x1",that.start.x);
			line.setAttributeNS(null,"y1",that.start.y);
			line.setAttributeNS(null,"x2",that.start.x + that.sliderLength);
			line.setAttributeNS(null,"y2",that.start.y);
			line.setAttributeNS(null,"style",vs.style.sdLineStyle);
			line.setAttributeNS(null,"pointer-events","none");
			group.appendChild(line);

			// Draw the slider symbol
			that.sliderBar = document.createElementNS(vs.svgNS,"rect");
			that.sliderBar.setAttributeNS(null,"x",that.start.x);
			that.sliderBar.setAttributeNS(null,"y",vs.style.sdBorderSpacing);
			that.sliderBar.setAttributeNS(null,"width",vs.style.sdSymbolSize);
			that.sliderBar.setAttributeNS(null,"height",vs.style.sdSymbolSize);
			that.sliderBar.setAttributeNS(null,"style",vs.style.sdSymbolStyle);
			that.sliderBar.setAttributeNS(null,"transform","translate(0,0)");
			that.sliderBar.setAttributeNS(null,"pointer-events","none");
			group.appendChild(that.sliderBar);
		};

		// --------------------------------------------------------------------------------------
		// Mouse and keyboard event handler functions
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			if(evt.type == "click") {
				that.moveSlider(evt);
			}
//			if(evt.type == "mousedown" || (evt.type == "mousemove" && this.pointerStatus == 1)) {
			if(evt.type == "mousedown" || evt.type == "mousemove") {
				that.pointerStatus = 1;
				// Add event listeners to top level in case mouse moved outside of slider area
				document.documentElement.addEventListener("mousemove",this,false);
				document.documentElement.addEventListener("mouseup",this,false);
				that.moveSlider(evt);
			}
//			if(evt.type == "mouseup" && (evt.detail == 1 || evt.detail == 0)) {
			if(evt.type == "mouseup") {
				document.documentElement.removeEventListener("mousemove",this,false);
				document.documentElement.removeEventListener("mouseup",this,false);
				that.pointerStatus = 2;
				that.sliderPostProcess();
				that.pointerStatus = 0;
			}
		};

		// --------------------------------------------------------------------------------------
		// Move the slider bar along the slider line
		// --------------------------------------------------------------------------------------
		that.moveSlider = function(evt) {
			var pointer,pointerX,lower,upper,lng,pct,newX;

			// Read X-coordinate of pointer in slider area (rectangle)
			pointer = vs.calcCoord(evt,this.sliderArea);
			pointerX = parseInt(pointer.x);

			// Upper and lower limits of slider line
			lower = 0;
			upper = that.sliderLength;

			// Determine position of pointer within slider line, rather than slider area
			pointerX = pointerX - ((that.border) ? vs.style.sdBorderSpacing : 0)
			pointerX = Math.max(lower,pointerX);
			pointerX = Math.min(upper,pointerX);

			// Calc length and relative position of pointer on slider line (0 - 1)
			lng = upper - lower;
			pct = (pointerX - lower) / lng;

			// Shift slider symbol along line (make sure symble does not overrun end of line)
			newX = Math.min((pct * lng),(lng - vs.style.sdSymbolSize));
			that.sliderBar.setAttributeNS(null,"x",that.start.x + newX);

			// Reset the current value
			that.value = that.min + (pct * (that.max - that.min));

			// Post-processing
			that.sliderPostProcess();
		};

		// --------------------------------------------------------------------------------------
		// Initiate the post-processing
		// --------------------------------------------------------------------------------------
		that.sliderPostProcess = function() {
// TODO Use that.postProcess instead of hard-coded vs.grid.scrollGrid
// result = that.postProcess.apply(null,"change",direction,that.value);
			var direction;

			// Mouse moving and feedback requested
			if(that.pointerStatus == 1 && that.feedback) {
				// Find direction of scrolling
				direction = that.id.match(/SliderY/) ? 'vertical' : 'horizontal';

				// Scroll the grid
				result = vs.grid.scrollGrid("move",that.slParent,direction,that.value);
			}

			// Mouse released
			if(this.pointerStatus == 2) {
				// 									????????????????????????????????????????????????????????????????????????????????????????????
				if(typeof(that.postProcess) == "function") {
					that.postProcess.call("release",that.id,that.value);
				}
				if(typeof(that.postProcess) == "object") {
					that.postProcess.getSliderVal("release",that.id,that.value);
				}
			}
		};

		// --------------------------------------------------------------------------------------
		// Create the slider
		// --------------------------------------------------------------------------------------
		that.createSlider();
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Multi-line text area that is read only
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.textArea = function(args) {
		var that = {
			id: args.id,
			parent: args.formId,
			x: args.x,
			y: args.y,
			textVal: args.text.toString()
		};

		// Form to which the text area will be added
		that.taParent = vs.testParent(that.parent);
		if(!that.taParent) {
			vs.message("Text area '"+that.id+"' could not reference parent node '"+that.parent+"'");
			return;
		}

		// --------------------------------------------------------------------------------------
		// Instantiate the text area
		// --------------------------------------------------------------------------------------
		that.createTextArea = function() {
			var area,lines,text,offset,line,rect;

			// Create a parent group and add event listeners
			area = document.createElementNS(vs.svgNS,"g");
			area.setAttributeNS(null,"id","textArea");
			area.addEventListener("mouseover",this,false);
			area.addEventListener("mouseout",this,false);
			area.setAttributeNS(null,"cursor","pointer");
			that.taParent.appendChild(area);

			// Create 1 element per line of text (delimited by '\n')
			lines = that.textVal.split("\n");
			offset = vs.style.taTextSize + vs.style.taLineSpacing;
			for(var i=0; i<lines.length; i++) {
				text = document.createElementNS(vs.svgNS,"text");
				text.setAttributeNS(null,"id",that.id+"."+i);
				text.setAttributeNS(null,"x",that.x);
				text.setAttributeNS(null,"y",that.y + i * offset);
				text.setAttributeNS(null,"style",vs.style.taTextStyles);

				// Add text to element
				line = document.createTextNode(lines[i]);
				text.appendChild(line);
				area.appendChild(text);
			}

			// Create selection rectangle
			rect = document.createElementNS(vs.svgNS,"rect");
			rect.setAttributeNS(null,"x",that.x);
			rect.setAttributeNS(null,"y",that.y + vs.style.taTextSize + (lines.length * offset));
			rect.setAttributeNS(null,"width",vs.style.taTextSize * that.textVal.length * 0.7);
			rect.setAttributeNS(null,"height",vs.style.taTextSize);
			rect.setAttributeNS(null,"fill","white");
			rect.setAttributeNS(null,"fill-opacity",0);
			area.appendChild(rect);
		};

		// --------------------------------------------------------------------------------------
		// Run functions triggered by addEventListener on click and mouse move
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			// Which element was this event from?
			var id = evt.currentTarget.getAttributeNS(null,"id");

			// Stop if ID is undefined (unrecognised node)
			if(!id) return;

			if(evt.type == "mouseover") {
				// Show tool tips should be in here
			}
			if(evt.type == "mouseout") {
				// Clear tool tip should be in here
			}
		};

		// --------------------------------------------------------------------------------------
		// Create the text area box
		// --------------------------------------------------------------------------------------
		that.createTextArea();
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Single line text box that is read/write
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.textBox = function(args) {
		var that = {
			id: args.id,									// ID of the field
			parent: args.formId,							// ID of the form
			x: args.x,										// Top left corner of field
			y: args.y,										// Top left corner of field
			boxWidth: args.boxWidth,						// Width of field
			defaultVal: args.defaultVal.toString(),			// Default value to be displayed
			maxChars: args.maxChars,						// Maximum number of characters allowed
			allowedChars: args.allowedChars,				// Validation of entered string (RegEx)
			label: args.label,								// Text in field label
			labelWidth: args.labelWidth,					// Width of field label

			// Initialise internal variables
			textboxText: null,								// Reference to text element
			textboxContent: null,							// Reference to content of text element (first child)
			textboxCursor: null,							// Reference to cursor
			textboxStatus: 'empty',							// ..................................................???????????????????????????????
			cursorPosition: 0,								// Position in whole string
			textOffset: 0									// Offset on the left if text string is larger than box
		};

		// Group to which the text box will be added
		that.tbParent = vs.testParent(that.parent);
		if(!that.tbParent) {
			vs.message("Text box '"+that.id+"' could not reference parent node '"+that.parent+"'");
			return;
		}

		// Trim text if longer than max length
		that.textVal = (that.defaultVal.length <= that.maxChars) ? that.defaultVal : that.defaultVal.substr(0,(that.maxChars - 1));

		// --------------------------------------------------------------------------------------
		// Instantiate the text box
		// --------------------------------------------------------------------------------------
		that.createTextBox = function() {
			var padVertical,parent,rect,svg;

			// Relative to the top of the cell
			padVertical = vs.style.tbBoxHeight - (vs.style.tbBoxHeight - vs.style.tbTextSize) * 0.7;

			// Create a text box parent group
			parent = document.createElementNS(vs.svgNS,"g");
			parent.setAttributeNS(null,"id","textBox");
			that.tbParent.appendChild(parent);

			// Create background rect
			rect = document.createElementNS(vs.svgNS,"rect");
			rect.setAttributeNS(null,"x",that.x);
			rect.setAttributeNS(null,"y",that.y);
			rect.setAttributeNS(null,"width",that.boxWidth);
			rect.setAttributeNS(null,"height",vs.style.tbBoxHeight);
			rect.setAttributeNS(null,"pointer-events","fill");
			rect.setAttributeNS(null,"style",vs.style.tbTextBoxStyle);
			parent.appendChild(rect);

			// Create an SVG element to hold the text as view box can be set
			// A nested svg object that does clipping
			svg = document.createElementNS(vs.svgNS,"svg");
			svg.setAttributeNS(null,"x",that.x + vs.style.tbTextSize / 4);
			svg.setAttributeNS(null,"y",that.y + vs.style.tbBoxHeight * 0.02);
			svg.setAttributeNS(null,"width",that.boxWidth - (vs.style.tbTextSize / 2));
			svg.setAttributeNS(null,"height",vs.style.tbBoxHeight * 0.96);
			svg.setAttributeNS(null,"viewBox",(that.x + vs.style.tbTextSize / 4)+" "+(that.y + vs.style.tbBoxHeight * 0.02)+" "+(that.boxWidth - vs.style.tbTextSize / 2)+" "+(vs.style.tbBoxHeight * 0.96) );
			parent.appendChild(svg);

			// Create group to hold text and cursor
			that.textboxGroup = document.createElementNS(vs.svgNS,"g");
			svg.appendChild(that.textboxGroup);

			// Create a text element
			that.textboxText = document.createElementNS(vs.svgNS,"text");
			that.textboxText.setAttributeNS(null,"x",that.x + vs.style.tbBoxTextPadding);
			that.textboxText.setAttributeNS(null,"y",that.y + padVertical);
			that.textboxText.setAttributeNS(null,"style",vs.style.tbTextStyles);
			that.textboxText.setAttributeNS(null,"id",that.id+".text");
			if(vs.browser != "Opera") {
				that.textboxText.setAttributeNS(null,"pointer-events","none");
			}
			that.textboxText.setAttributeNS("http://www.w3.org/XML/1998/namespace","space","preserve");

			// Set the cursor position and add text to element
			that.cursorPosition = that.textVal.length - 1;
			that.textboxContent = document.createTextNode(that.textVal);
			that.textboxText.appendChild(that.textboxContent);
			that.textboxGroup.appendChild(that.textboxText);

			// Create cursor element
			that.textboxCursor = document.createElementNS(vs.svgNS,"line");
			that.textboxCursor.setAttributeNS(null,"x1",that.x);
			that.textboxCursor.setAttributeNS(null,"y1",(that.y + vs.style.tbBoxHeight * 0.15));
			that.textboxCursor.setAttributeNS(null,"x2",that.x);
			that.textboxCursor.setAttributeNS(null,"y2",(that.y + vs.style.tbBoxHeight * 0.85));
			that.textboxCursor.setAttributeNS(null,"style",vs.style.tbCursorStyle);
			that.textboxCursor.setAttributeNS(null,"id",that.id+"Cursor");
			that.textboxCursor.setAttributeNS(null,"visibility","hidden");
			that.textboxGroup.appendChild(that.textboxCursor);

			// Add event listeners to text box group
			parent.addEventListener("mousedown",this,false);
			parent.addEventListener("mousemove",this,false);
			parent.addEventListener("mouseup",this,false);
			parent.setAttributeNS(null,"cursor","text");
		};

		// --------------------------------------------------------------------------------------
		// Determine cursor position of mouse event
		// --------------------------------------------------------------------------------------
		that.calcCursorPosFromMouseEvt = function(evt) {
			var coords,point;

			// Determine cursor position of mouse event
			coords = vs.calcCoord(evt,that.textboxText);

			// Create an SVG Point object and set to current cursor position
			point = document.documentElement.createSVGPoint();
			point.x = coords.x;
			point.y = coords.y;

			// Set new cursor position providing there is content in the text box
			if(that.textboxContent.length > 0) {
				if(vs.supportsCharGeom) {
					// Viewer supports geometry calculations on individual characters
					// For regular SVG viewers that support .getCharNumAtPosition
					that.cursorPosition = that.textboxText.getCharNumAtPosition(point);
					if (that.cursorPosition > that.textVal.length - 1) {
						that.cursorPosition = that.textVal.length - 1;
					}
					// In this case the user did not correctly touch the text element
					if (that.cursorPosition == -1) {
						// First check if we can fix the position by moving the y-coordinate
						point.y = (that.textboxText.getBBox().y + vs.style.tbTextSize * 0.5);
						that.cursorPosition = that.textboxText.getCharNumAtPosition(point);

						// Check if cursor is to the right of the end of the text
						if (that.cursorPosition == -1) {
							if (point.x > (that.textboxText.getBBox().x + that.textboxText.getBBox().width)) {
								that.cursorPosition = that.textVal.length - 1;
							}
						}
					}
				}
				else {
					// Viewer does not support geometry calculations on individual characters
					// Workaround for firefox 1.5/2.0 and other viewers not supporting .getCharNumAtPosition
					var bbox = that.textboxText.getBBox();
					var diffLeft = Math.abs(point.x - bbox.x);
					var diffRight = Math.abs(point.x - (bbox.x + bbox.width));
					if (diffLeft < diffRight) {
						that.cursorPosition = -1;
					}
					else {
						that.cursorPosition = that.textVal.length - 1;
					}
				}
			}
			// Text box is empty
			else {
				that.cursorPosition = -1;
			}
		};

		// --------------------------------------------------------------------------------------
		// Run functions triggered by addEventListener on click and mouse move
		// --------------------------------------------------------------------------------------
		that.handleEvent = function(evt) {
			var type = evt.currentTarget.nodeName,
				cursorX;

			// Mouse down events
			if(evt.type == "mousedown") {
				// When user mousedowns outside text box, behave like user pressed Enter key
				if((type == "svg" || type == "svg:svg") && that.textboxStatus == 'full') {
					// This is run when focus moves away from the text box
					that.loseFocus();
				}
				else {
					// Prepare text box with first mousedown and reposition cursor with each mousedown
					if(type == "g" || type == "svg:g") {
						that.calcCursorPosFromMouseEvt(evt);

						// Set event listeners, only done on first mousedown in text box
						if(that.textboxStatus == 'empty') {
							document.documentElement.addEventListener("keypress",this,false);
							document.documentElement.addEventListener("mousedown",this,false);
							document.documentElement.addEventListener("mouseup",this,false);
							document.documentElement.addEventListener("mousemove",this,false);

							// Set text box status and cursor visibility
							that.textboxStatus = 'partial';
							that.textboxCursor.setAttributeNS(null,"visibility","visible");
						}
						else {
							evt.stopPropagation();
						}
						that.setCursorPos();
					}
					// This mousedown should be received from background rectangle (received via document element)
					else {
						that.textboxStatus = 'full';
					}
				}
			}

			// Mouse move events
			if(evt.type == "mousemove") {
				// ?????? and if if viewer supports geometry calculations on individual characters
				if(that.textboxStatus == 'full' && vs.supportsCharGeom) {
					that.calcCursorPosFromMouseEvt(evt);
					that.setCursorPos();
					cursorX = parseInt(that.textboxCursor.getAttributeNS(null,"x1"));

					// If cursor runs out on the right, scroll to the right
					if((cursorX + that.transX) > (that.x + that.boxWidth - vs.style.tbTextSize / 3)) {
						that.textOffset = (that.x + that.boxWidth - vs.style.tbTextSize / 3) - cursorX;
						that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
					}

					// If cursor runs out on the left, scroll to the left
					if((cursorX + that.transX) < (that.x + vs.style.tbTextSize / 3)) {
						that.textOffset += (that.x + vs.style.tbTextSize / 3) - (cursorX + that.transX);
						if (that.textOffset * -1 < (that.boxWidth - vs.style.tbTextSize)) {
							that.textOffset = 0;
						}
						that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
					}
				}
			}

			// Key press events
			if(evt.type == "keypress") {
				// Capture the key code
				var charCode = (evt.keyCode) ? evt.keyCode : evt.charCode;
				that.keyCode = parseInt(charCode);

				// Entering a text field, so track if the text is changed
				that.changed = false;

				// Process the action keys
				that.handleActionKeys();

				// Process text characters, rather than action keys
				if(that.keyCode > 31 && that.keyCode != 127 && that.keyCode < 65535 && evt.charCode && evt.charCode < 65535) {
					that.handleTextKeys();
				}

				// Suppress unwanted browser shortcuts. e.g. in Opera or Mozilla
				evt.preventDefault();
			}
		};

		// --------------------------------------------------------------------------------------
		// Process the action keys
		// --------------------------------------------------------------------------------------
		that.handleActionKeys = function() {
			var tempText,cursorX,bbox;

			// Backspace key
			if(that.keyCode == vs.keys.backspace) {
				// Only do it if there is text and cursor is not at start position
				if(that.textVal.length > 0 && that.cursorPosition > -2) {
					if(that.cursorPosition == that.textVal.length - 1) {
						// Cursor is at the end of textVal
						that.textVal = that.textVal.substring(0,that.textVal.length-1);
					}
					else {
						// Cursor is in between
						that.textVal = that.textVal.substring(0,(that.cursorPosition)) + that.textVal.substring((that.cursorPosition + 1),(that.textVal.length));
					}
					// Decrease cursor position
					if(that.cursorPosition > -1) {
						that.cursorPosition--;
					}
					that.textboxContent.nodeValue = that.textVal;
					that.setCursorPos();
					if(that.cursorPosition > 0) {
						// Retransform text element when cursor is at the left side of the box
						if(vs.supportsCharGeom) {
							// Viewer supports geometry calculations on individual characters
							cursorX = that.textboxText.getStartPositionOfChar(that.cursorPosition).x;
						}
						else {
							// Viewer does not support geometry calculations on individual characters
							bbox = that.textboxText.getBBox();
							cursorX = bbox.x + bbox.width;
						}
						if((cursorX + that.transX) < (that.x + vs.style.tbTextSize / 3)) {
							that.textOffset += (that.x + vs.style.tbTextSize / 3) - (cursorX + that.transX);
							if(that.textOffset * -1 < (that.boxWidth - vs.style.tbTextSize)) {
								that.textOffset = 0;
							}
							that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
						}
					}
					// Flag field as changed
					that.changed = true;
				}
			}
			// Enter key
			else if(that.keyCode == vs.keys.enter) {
// TODO This should move to next field
				that.loseFocus();
			}
			// End key: Move to end of string
			else if(that.keyCode == vs.keys.end) {
				that.cursorPosition = that.textVal.length - 1;
				that.setCursorPos();
				// If text string is too long
				cursorX = parseInt(that.textboxCursor.getAttributeNS(null,"x1"));
				if((cursorX + that.transX) > (that.x + that.boxWidth - vs.style.tbTextSize / 3)) {
					that.textOffset = (that.x + that.boxWidth - vs.style.tbTextSize / 3) - cursorX;
					that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
				}
			}
			// Home key: Move to start of string
			else if(that.keyCode == vs.keys.home) {
				that.cursorPosition = -1;
				that.textboxText.setAttributeNS(null,"x",(that.x + vs.style.tbTextSize / 3));
				that.textboxGroup.setAttributeNS(null,"transform","translate(0,0)");
				that.textOffset = 0;
				that.setCursorPos();
			}
			// Left key: Move left 1 character or nothing if at start of string
			else if(that.keyCode == vs.keys.arrow.left) {
				if(that.cursorPosition > -1) {
					that.cursorPosition--;
					that.setCursorPos();
					cursorX = parseInt(that.textboxCursor.getAttributeNS(null,"x1"));
					if((cursorX + that.transX) < (that.x + vs.style.tbTextSize / 3)) {
						that.textOffset += (that.x + vs.style.tbTextSize / 3) - (cursorX + that.transX);
						if(that.textOffset * -1 < (that.boxWidth - vs.style.tbTextSize)) {
							that.textOffset = 0;
						}
						that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
					}
				}
			}
			// Right key: Move right 1 character or nothing if at end of string
			else if(that.keyCode == vs.keys.arrow.right) {
				if(that.cursorPosition < that.textVal.length - 1) {
					that.cursorPosition++;
					that.setCursorPos();
					cursorX = parseInt(that.textboxCursor.getAttributeNS(null,"x1"));
					if((cursorX + that.transX) > (that.x + that.boxWidth - vs.style.tbTextSize / 3)) {
						that.textOffset = (that.x + that.boxWidth - vs.style.tbTextSize / 3) - cursorX;
						that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
					}
				}
			}
			// Delete key: Delete character immediately to right or nothing if at end of string
			else if(that.keyCode == vs.keys.delkey) {
				if((that.textVal.length > 0) && (that.cursorPosition < (that.textVal.length))) {
					tempText = null;
					if(that.cursorPosition < (that.textVal.length - 1)) {
						// Delete the next character, if cursor is not at the end of the textstring
						tempText = that.textVal.substring(0,(that.cursorPosition + 1)) + that.textVal.substring((that.cursorPosition + 2),(that.textVal.length));
						// Flag field as changed
						that.changed = true;
					}
					if(that.changed) {
						if(tempText != null) {
							that.textVal = tempText;
							that.textboxContent.nodeValue = that.textVal;
							that.setCursorPos();
						}
					}
				}
			}
		};

		// --------------------------------------------------------------------------------------
		// Process text characters, rather than action keys
		// --------------------------------------------------------------------------------------
		that.handleTextKeys = function() {
			var keychar = String.fromCharCode(that.keyCode),
				tempstr = that.textVal,
				result,cursorX;

			// If there is space left in the string, append or insert the new character
			if(that.textVal.length < that.maxChars) {
				// We are at end of string, so append new character
				if(that.cursorPosition == that.textVal.length -1) {
					tempstr += keychar;
				}
				// In the string, so insert new character at current cursor position
				else {
					tempstr = that.textVal.substring(0,(that.cursorPosition + 1)) + keychar + that.textVal.substring((that.cursorPosition + 1),(that.textVal.length));
				}

				// Validate the modified string
				result = vs.validateString('alpha-mixed',tempstr);
				if(result == true) {
					// Update the string on the node
					that.textVal = tempstr;
					that.textboxContent.nodeValue = that.textVal;

					// Flag field as changed
					that.changed = true;

					// Increment the cursor position
					that.cursorPosition++;

					// Update cursor position in the field
					that.setCursorPos();
					cursorX = parseInt(that.textboxCursor.getAttributeNS(null,"x1"));
					if((cursorX + that.transX) > (that.x + that.boxWidth - vs.style.tbTextSize / 3)) {
						that.textOffset = (that.x + that.boxWidth - vs.style.tbTextSize / 3) - (cursorX + that.transX) + that.transX;
						that.textboxGroup.setAttributeNS(null,"transform","translate("+that.transX+",0)");
					}
				}
				// Raise an alert that the string validation failed
				else {
					vs.message('An invalid character has been entered');
				}
			}
			// Raise an alert that the max string length has been reached
			else {
				vs.message('The maximum string length has been reached');
			}
		};

		// --------------------------------------------------------------------------------------
		// This is run when focus moves away from the text box
		//	- When user mousedowns outside text box, behave like user pressed Enter key
		//	- Enter key pressed
		// Hide cursor and trigger field post-processing
		// --------------------------------------------------------------------------------------
		that.loseFocus = function() {
			// Set text box status to 'unintialized'
			that.textboxStatus = 'empty';

			// Remove event listeners from text box
			document.documentElement.removeEventListener("keypress",this,false);
			document.documentElement.removeEventListener("mousedown",this,false);
			document.documentElement.removeEventListener("mousemove",this,false);
			document.documentElement.removeEventListener("mouseup",this,false);

			// Hide cursor
			that.textboxCursor.setAttributeNS(null,"visibility","hidden");

			// Save changed value if text changed
			if(that.changed) {
				vs.defnForms[that.parent].fields[that.id].data = that.textVal;
			}
		};

		// --------------------------------------------------------------------------------------
		// Move the cursor based on:
		//	- An action key changing that.cursorPosition
		//	- Mouse movement
		// --------------------------------------------------------------------------------------
		that.setCursorPos = function() {
			var cursorPos,bbox;

			// Cursor is not at start of text box
			if(that.cursorPosition > -1) {
				if(vs.supportsCharGeom) {
					// Viewer supports geometry calculations on individual characters
					if(that.textVal.length > 0) {
						cursorPos = that.textboxText.getEndPositionOfChar(that.cursorPosition).x;
					}
					else {
						cursorPos = (that.x + vs.style.tbTextSize / 3);
					}
					that.textboxCursor.setAttributeNS(null,"x1",cursorPos);
					that.textboxCursor.setAttributeNS(null,"x2",cursorPos);
				}
				else {
					// Viewer does not support geometry calculations on individual characters
					// For MozillaSVG 1.5 or other SVG viewers not implementing .getEndPositionOfChar
					bbox = that.textboxText.getBBox();
					that.textboxCursor.setAttributeNS(null,"x1",(bbox.x + bbox.width + vs.style.tbTextSize / 3));
					that.textboxCursor.setAttributeNS(null,"x2",(bbox.x + bbox.width + vs.style.tbTextSize / 3));
				}
			}
			// Cursor is at start of text box
			else {
				// Ensure start of string is at left of text box
				that.textboxText.setAttributeNS(null,"x",(that.x + vs.style.tbTextSize / 3));
				that.textboxGroup.setAttributeNS(null,"transform","translate(0,0)");
				that.textOffset = 0;
				if(vs.supportsCharGeom) {
					// Viewer supports geometry calculations on individual characters
					if(that.textboxContent.length > 0) {
						cursorPos = that.textboxText.getStartPositionOfChar(0).x;
					}
					else {
						cursorPos = that.x + vs.style.tbTextSize / 3;
					}
				}
				else {
					// Viewer does not support geometry calculations on individual characters
					cursorPos = that.x + vs.style.tbTextSize / 3;
				}
				that.textboxCursor.setAttributeNS(null,"x1",cursorPos);
				that.textboxCursor.setAttributeNS(null,"x2",cursorPos);
			}
		};

// TODO Are these get and set functions used?
/*		// --------------------------------------------------------------------------------------
		// Return current value of text box
		// --------------------------------------------------------------------------------------
		that.getValue = function() {
			return that.textVal;
		};

		// --------------------------------------------------------------------------------------
		// Set current value of text box
		// Argument 1 : Text to be used
		// Argument 2 : Trigger the post-processing? (true/false)
		// --------------------------------------------------------------------------------------
		that.setValue = function(value,postProcess) {
			that.textVal = value.toString();
			that.textboxContent.nodeValue=that.textVal;

			// Set cursor to beginning
			that.cursorPosition = -1;
			that.setCursorPos();

			// Trigger the post-processing
			if(postProcess) {
				that.textboxStatus = 'newvalue'; //5 means is set by setValue
				that.runPostProcess();
			}
		};
*/

		// --------------------------------------------------------------------------------------
		// Create the text box and add a label if required
		// --------------------------------------------------------------------------------------
		that.createTextBox();
		if(that.label) {
			vs.textArea({
				id:that.id+".label",
				formId:that.parent,
				x:(that.x-that.labelWidth),
				y:(that.y+vs.style.tbTextSize),
				text:that.label});
		}
	};



	// **************************************************************************************
	// **************************************************************************************
	//
	// Create a window to hold the UI controls
	//
	// **************************************************************************************
	// **************************************************************************************
	vs.window = function(args) {
		var that = {};

		// Save the URLs for the source data
		vs.source = {};
		vs.source.definitions = args.definitions;
		vs.source.stylesheet = args.stylesheet;

		// Read the data argument
// TODO Replace vs.data with proper data structure
		vs.data = args.data;

		//--------------------------------------------------------------------------------------
		// Handle the window resize event
		//--------------------------------------------------------------------------------------
// TODO  Is the window resize event used?
/*		that.handleEvent = function(evt) {
			if(evt.type == "SVGResize" || evt.type == "resize" || evt.type == "SVGScroll" || evt.type == "SVGZoom") {
				that.setWindowSize();
			}
		};
*/
		// Start by loading the application definitions and styles
		vs.loadData();
	};

	// --------------------------------------------------------------------------------------
	// Add the window control symbols on the title bar
	// --------------------------------------------------------------------------------------
	vs.window.addSymbols = function() {
		var symbols = ["titlebar.close","titlebar.maximize","titlebar.minimize","titlebar.link"],
			defs,id,nodes,exists,
			ids = new Array();

		// Create a 'defs' and attach to the SVG element
		defs = document.createElementNS(vs.svgNS,"defs");
		document.documentElement.appendChild(defs);
		nodes = document.getElementsByTagName("defs");
		defs = nodes[0];

		// Read list of symbols created by the user
		nodes = document.getElementsByTagName("symbol");
		for(var n=0; n<nodes.length; n++) {
			id = nodes[n].getAttributeNS(null,"id");
			ids.push(id);
		}

		// Create symbol if it is required by application, but has not been created by user
		for(var n=0; n<symbols.length; n++) {
			exists = false;
			for(var i=0; i<ids.length; i++) {
				if(symbols[n] == ids[i]) exists = true;
			}
			if(!exists) {
				vs.window.addSymbol(defs,symbols[n]);
			}
		}
	};

	// --------------------------------------------------------------------------------------
	// Add standard symbol definitions on the title bar to the 'defs' element
	//
	// Argument 1 : Reference of the <defs> element
	// Argument 2 : ID of symbol to be created
	// --------------------------------------------------------------------------------------
	vs.window.addSymbol = function(defs,id) {
		var symbol,shape;

		// Create the symbol element
		symbol = document.createElementNS(vs.svgNS,"symbol");
		symbol.setAttributeNS(null,"id",id);
		symbol.setAttributeNS(null,"overflow","visible");
		defs.appendChild(symbol);

		// Create the symbol
		if(id == "titlebar.close") {
			// Square that holds the cross with a boundary and fill to pick up click events
			shape = document.createElementNS(vs.svgNS,"rect");
			shape.setAttributeNS(null,"x",vs.style.syCloseRectX);
			shape.setAttributeNS(null,"y",vs.style.syCloseRectY);
			shape.setAttributeNS(null,"width",vs.style.syCloseRectWidth);
			shape.setAttributeNS(null,"height",vs.style.syCloseRectHeight);
			shape.setAttributeNS(null,"style",vs.style.syCloseRectStyle);
			shape.setAttributeNS(null,"pointer-events","fill");
			symbol.appendChild(shape);

			// Forward slash of cross
			shape = document.createElementNS(vs.svgNS,"line");
			shape.setAttributeNS(null,"x1",vs.style.syCloseFwdLineX1);
			shape.setAttributeNS(null,"x2",vs.style.syCloseFwdLineX2);
			shape.setAttributeNS(null,"y1",vs.style.syCloseFwdLineY1);
			shape.setAttributeNS(null,"y2",vs.style.syCloseFwdLineY2);
			shape.setAttributeNS(null,"style",vs.style.syCloseLineStyle);
			shape.setAttributeNS(null,"pointer-events","none");
			symbol.appendChild(shape);

			// Backward slash of cross
			shape = document.createElementNS(vs.svgNS,"line");
			shape.setAttributeNS(null,"x1",vs.style.syCloseBackLineX1);
			shape.setAttributeNS(null,"x2",vs.style.syCloseBackLineX2);
			shape.setAttributeNS(null,"y1",vs.style.syCloseBackLineY1);
			shape.setAttributeNS(null,"y2",vs.style.syCloseBackLineY2);
			shape.setAttributeNS(null,"style",vs.style.syCloseLineStyle);
			shape.setAttributeNS(null,"pointer-events","none");
			symbol.appendChild(shape);
		}
		else if(id == "titlebar.maximize") {
			// Square with a boundary and fill to pick up click events
			shape = document.createElementNS(vs.svgNS,"rect");
			shape.setAttributeNS(null,"x",vs.style.syMaxRectX);
			shape.setAttributeNS(null,"y",vs.style.syMaxRectY);
			shape.setAttributeNS(null,"width",vs.style.syMaxRectWidth);
			shape.setAttributeNS(null,"height",vs.style.syMaxRectHeight);
			shape.setAttributeNS(null,"style",vs.style.syMaxRectStyle);
			shape.setAttributeNS(null,"pointer-events","fill");
			symbol.appendChild(shape);

			// Heavy line at top of square
			shape = document.createElementNS(vs.svgNS,"line");
			shape.setAttributeNS(null,"x1",vs.style.syMaxLineX1);
			shape.setAttributeNS(null,"x2",vs.style.syMaxLineX2);
			shape.setAttributeNS(null,"y1",vs.style.syMaxLineY1);
			shape.setAttributeNS(null,"y2",vs.style.syMaxLineY2);
			shape.setAttributeNS(null,"style",vs.style.syMaxLineStyle);
			shape.setAttributeNS(null,"pointer-events","none");
			symbol.appendChild(shape);
		}
		else if(id == "titlebar.minimize") {
			// Square with no boundary and fill to pick up click events
			shape = document.createElementNS(vs.svgNS,"rect");
			shape.setAttributeNS(null,"x",vs.style.syMinRectX);
			shape.setAttributeNS(null,"y",vs.style.syMinRectY);
			shape.setAttributeNS(null,"width",vs.style.syMinRectWidth);
			shape.setAttributeNS(null,"height",vs.style.syMinRectHeight);
			shape.setAttributeNS(null,"style",vs.style.syMinRectStyle);
			shape.setAttributeNS(null,"pointer-events","fill");
			symbol.appendChild(shape);

			// Heavy line at bottom of square
			shape = document.createElementNS(vs.svgNS,"line");
			shape.setAttributeNS(null,"x1",vs.style.syMinLineX1);
			shape.setAttributeNS(null,"x2",vs.style.syMinLineX2);
			shape.setAttributeNS(null,"y1",vs.style.syMinLineY1);
			shape.setAttributeNS(null,"y2",vs.style.syMinLineY2);
			shape.setAttributeNS(null,"style",vs.style.syMinLineStyle);
			shape.setAttributeNS(null,"pointer-events","none");
			symbol.appendChild(shape);
		}
		else if(id == "titlebar.link") {
			// Left circle with boundary and fill to pick up click events
			shape = document.createElementNS(vs.svgNS,"circle");
			shape.setAttributeNS(null,"cx",vs.style.syLinkCircle1X);
			shape.setAttributeNS(null,"cy",vs.style.syLinkCircle1Y);
			shape.setAttributeNS(null,"r",vs.style.syLinkCircleRadius);
			shape.setAttributeNS(null,"style",vs.style.syLinkCircleStyle);
			shape.setAttributeNS(null,"pointer-events","fill");
			symbol.appendChild(shape);

			// Right circle with boundary and fill to pick up click events
			shape = document.createElementNS(vs.svgNS,"circle");
			shape.setAttributeNS(null,"cx",vs.style.syLinkCircle2X);
			shape.setAttributeNS(null,"cy",vs.style.syLinkCircle2Y);
			shape.setAttributeNS(null,"r",vs.style.syLinkCircleRadius);
			shape.setAttributeNS(null,"style",vs.style.syLinkCircleStyle);
			shape.setAttributeNS(null,"pointer-events","fill");
			symbol.appendChild(shape);
		}
		else {
			vs.message("Symbol ["+id+"] not recognised");
		}
	};

	// --------------------------------------------------------------------------------------
	// Add the window definition to a root node in the DOM (document.documentElement) under
	// which the menus, options, forms all controls for the application will be held
	// --------------------------------------------------------------------------------------
	vs.window.addWindow = function() {
		var grp,elem,txt;

		// Create the window and attach to the SVG element
		grp = document.createElementNS(vs.svgNS,"g");
		grp.setAttributeNS(null,"id",vs.windowNodeName);
		document.documentElement.appendChild(grp);

		// Rectangle that holds the background
		elem = document.createElementNS(vs.svgNS,"rect");
		elem.setAttributeNS(null,"id","window");
		elem.setAttributeNS(null,"x",vs.style.fmBackRectX);
		elem.setAttributeNS(null,"y",vs.style.fmBackRectY);
		elem.setAttributeNS(null,"width",vs.innerWidth);
		elem.setAttributeNS(null,"height",vs.innerHeight);
		elem.setAttributeNS(null,"style",vs.style.fmBackRectStyle);
		grp.appendChild(elem);

		// Rectangle that holds the status icon
		elem = document.createElementNS(vs.svgNS,"rect");
		elem.setAttributeNS(null,"id","statusRect");
		elem.setAttributeNS(null,"x",vs.style.fmStatusRectX);
		elem.setAttributeNS(null,"y",vs.style.fmStatusRectY);
		elem.setAttributeNS(null,"width",vs.style.fmStatusRectWidth);
		elem.setAttributeNS(null,"height",vs.style.fmStatusRectHeight);
		elem.setAttributeNS(null,"style",vs.style.fmStatusRectHide);
		grp.appendChild(elem);

		// Text in the status icon
		elem = document.createElementNS(vs.svgNS,"text");
		elem.setAttributeNS(null,"id","statusText");
		elem.setAttributeNS(null,"x",vs.style.fmStatusTextX);
		elem.setAttributeNS(null,"y",vs.style.fmStatusTextY);
		elem.setAttributeNS(null,"style",vs.style.fmStatusTextHide);

		// Add text to element
		txt = document.createTextNode("Please Wait...");
		elem.appendChild(txt);
		grp.appendChild(elem);
	};

	// --------------------------------------------------------------------------------------
	// Load styles used by the UI controls in the application from file and saves them
	// in vs.style for access by all functions
	// --------------------------------------------------------------------------------------
	vs.window.initialise = function() {
		// --------------------------------------------------------------------------------------
		// Build the application
		//  - Check the browser capabilities
		//	- Build a frame to hold all controls
		//	- Load menu and option definitions from server
		//	- Load form definitions from server
		// --------------------------------------------------------------------------------------

		// Check whether the browser is supported
		vs.browser = vs.whichBrowser();
		if(!vs.browser) {
			alert("This browser is not supported");
			return;
		}

		// Add a resize event for the browser window
		try {
			// Opera and Firefox
			window.addEventListener("resize",this,false);
		}
		catch(er) {
			alert("Can't add a resize event for this browser");
		}

		// Set the window size
		vs.window.setWindowSize();

		// Test whether SVG viewer supports getting geometries of individual characters
		vs.supportedChars();

		// Set up key mappings
		vs.assignKeys();

		// Load style data
		vs.window.stylesData();

		// Add a window to hold all controls for the application and add symbol definitions
		vs.window.addWindow();
		vs.window.addSymbols();

		// Element to which the menu will be added
		vs.windowNode = vs.testParent(vs.windowNodeName);
		if(!vs.windowNode) {
			vs.message("Window could not reference parent node of menu: "+vs.windowNodeName);
			return;
		}

		// Create the menu definitions and display the menu with options
		vs.menu(vs.definitions);
	};

	// --------------------------------------------------------------------------------------
	// Set width and height of SVG window either explicitly on start-up, when requested
	// under programme control, or in response to resize events
	// --------------------------------------------------------------------------------------
	vs.window.setWindowSize = function() {
		var viewPort;

		if(window.innerWidth) {
			viewPort = document.documentElement.getAttributeNS(null,"viewBox");
			viewPort = viewPort.split(" ");
			vs.innerWidth = parseInt(viewPort[2]);
			vs.innerHeight = parseInt(viewPort[3]);
		}
		else {
			vs.message("Can't set the window size for this browser");
		}
	};

	// --------------------------------------------------------------------------------------
	// Load styles used by the UI controls in the application from file and saves them
	// in vs.style for access by all functions
	// --------------------------------------------------------------------------------------
	vs.window.stylesData = function() {
		var style = {
			styleObj: {}
		};

		// Walk through the style object and capture values in the leaf nodes
		style.treewalk = function(obj) {
			var value;
			for(var name in obj) {
				value = obj[name];
				// If node is an object, recursively walk through it
				if(value !== null && typeof value === 'object') {
					style.treewalk(value);
				}
				// Check if node value is defined
				if(typeof value !== 'undefined'){
					// Test for integer or floating point number, everything else treated as text string
					if(vs.validateString('integer',value)) { value = parseInt(value); }
					else if(vs.validateString('float',value)) { value = parseFloat(value); }
					else {}
					// Add style element to object
					style.styleObj[name] = value;
				}
			}
		};

		// Load the style data
		style.treewalk(vs.styles);

		// Make the styles accessible
		vs.style = style.styleObj;
	};



	// **************************************************************************************
	// SET-UP COMPLETE Expose the anonymous function as 'vs'
	// **************************************************************************************
	this.vs = vs;

}());
