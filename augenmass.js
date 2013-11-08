/* -*- JavaScript -*- */
/*
TODO:
  - check the canvas grid mapping (it covers the pixels with offset 0.5)
  - fix loupe for chrome when it is close to the border.
  - draw current line in separate canvas to simplify redraw.
  - show a cross-hair while moving cursor. Right mouse button allows to
    rotate that cross-hair (stays where it was, and rotation of the X-axis)
    Double-click right: back to straight
  - two modes: draw, select
  - select: left click selects a line (endpoints and center). Shows
    a little square.
  - clicking a square allows to drag it (endpoints: coordinates, center whole
    line)
 */

var white_background_style = 'rgba(255, 255, 255, 0.4)';
var text_font_pixels = 18;

function euklid_distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function Line(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.updatePos = function(x2, y2) {
	this.x2 = x2;
	this.y2 = y2;
    }

    this.distanceToCenter = function(x, y) {
	var centerX = (this.x2 + this.x1)/2;
	var centerY = (this.y2 + this.y1)/2;
	return euklid_distance(centerX, centerY, x, y);
    }

    // Draw a T end-piece at position x, y
    this.draw_t = function(ctx, x, y, remote_x, remote_y) {
	var Tlen = 15
	var len = euklid_distance(x, y, remote_x, remote_y);
	if (len < 1) return;
	var dx = remote_x - x;
	var dy = remote_y - y;
	ctx.moveTo(x - Tlen * dy/len, y + Tlen * dx/len);
	ctx.lineTo(x + Tlen * dy/len, y - Tlen * dx/len);
    }

    // Drawing the line, but with a t-anchor only on the start-side
    // and 1-2 pixels shorter, so that we don't cover anything in the
    // target crosshair.
    this.draw_editline = function(ctx, length_factor) {
	var len = this.length();
	var print_text = (length_factor * len).toPrecision(4);
	var text_len = ctx.measureText(print_text).width + 2 * text_font_pixels;

	// We want to draw the line a little bit shorter, so that the
	// open crosshair cursor has 'free sight'
	var dx = this.x2 - this.x1;
	var dy = this.y2 - this.y1;
	if (len > 2) {
	    dx = dx * (len - 2)/len;
	    dy = dy * (len - 2)/len;
	}

	// White background for t-line
	ctx.beginPath();
	ctx.strokeStyle = white_background_style;
	ctx.lineWidth = 10;
	ctx.lineCap = 'round';
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);
	ctx.stroke();

	// White background for actual line
	ctx.beginPath();
	ctx.lineCap = 'butt';  // Flat to not bleed into crosshair.
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x1 + dx, this.y1 + dy);
	ctx.stroke();

	// t-line and line.
	ctx.beginPath();
	ctx.strokeStyle = '#00F';
	ctx.lineWidth = 1;
	ctx.lineCap = 'butt';
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x1 + dx, this.y1 + dy);
	ctx.stroke();

	if (len >= 2) {
	    // White background for text. We're using a short line, so that we
	    // have a nicely rounded box with our line-cap.
	    var text_dx = -text_len/2;
	    var text_dy = -(text_font_pixels + 10)/2;
	    if (len > 0) {
		text_dx = -dx * text_len/(2 * len);
		text_dy = -dy * (text_font_pixels + 10)/(2 * len);
	    }
	    ctx.beginPath();
	    ctx.strokeStyle = white_background_style;
	    ctx.lineWidth = text_font_pixels + 10;
	    ctx.lineCap = 'round';
	    // We added the text_font_pixels above, so remove them here: the
	    // rounding of the stroke will cover that.
	    var background_text_len = text_len/2 - text_font_pixels;
	    ctx.moveTo(this.x1 + text_dx - background_text_len,
		       this.y1 + text_dy);
	    ctx.lineTo(this.x1 + text_dx + background_text_len,
		       this.y1 + text_dy);
	    ctx.stroke();
	    
	    ctx.beginPath();
	    ctx.fillStyle = '#000';
	    ctx.textBaseline = 'middle';
	    ctx.textAlign = 'center';
	    ctx.fillText(print_text, this.x1 + text_dx, this.y1 + text_dy);
	    ctx.stroke();
	}
    }

    this.draw = function(ctx, length_factor, highlight) {
	var len = this.length();
	var print_text = (length_factor * len).toPrecision(4);

	ctx.beginPath();
	// Some white background.
	if (highlight) {
	    ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
	} else {
	    ctx.strokeStyle = white_background_style;
	}
	ctx.lineWidth = 10;
	ctx.lineCap = 'round';
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x2, this.y2);
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);	
	this.draw_t(ctx, this.x2, this.y2, this.x1, this.y1);	
	ctx.stroke();

	// Background behind text. We're using a short line, so that we
	// have a nicely rounded box with our line-cap.
	ctx.beginPath();
	var text_len = ctx.measureText(print_text).width;
	ctx.lineWidth = text_font_pixels + 10;
	ctx.moveTo((this.x1 + this.x2)/2 - text_len/2 - 10,
		   (this.y1 + this.y2)/2 - text_font_pixels/2);
	ctx.lineTo((this.x1 + this.x2)/2 + text_len/2 + 10,
		   (this.y1 + this.y2)/2 - text_font_pixels/2);
	ctx.stroke();

	ctx.beginPath();
	// actual line
	if (highlight) {
	    ctx.strokeStyle = 'rgba(0, 0, 255, 1.0)';
	} else {
	    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
	}
	ctx.lineWidth = 1;
	ctx.moveTo(this.x1, this.y1);
	ctx.lineTo(this.x2, this.y2);
	this.draw_t(ctx, this.x1, this.y1, this.x2, this.y2);	
	this.draw_t(ctx, this.x2, this.y2, this.x1, this.y1);	
	ctx.stroke();

	// .. and text.
	ctx.beginPath();
	ctx.fillStyle = '#000';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillText(print_text, (this.x1 + this.x2)/2,
		     (this.y1 + this.y2)/2 - text_font_pixels/2);
	ctx.stroke();
    }

    this.length = function() {
	return euklid_distance(this.x1, this.y1, this.x2, this.y2);
    }
}

var measure_canvas;
var measure_ctx;
var loupe_canvas;
var loupe_ctx;
var print_factor;
var lines;
var current_line;
var start_line_time;
var backgroundImage;  // if loaded.

// We show different help levels. Once the user managed
// all of them, we're silent.
HelpLevelEnum = {
    HELP_FILE_LOADING:  0,
    HELP_START_LINE:    1,
    HELP_FINISH_LINE:   2,
    HELP_SET_LEN:       3,
    HELP_YOU_ARE_EXPERT_NOW: 4
};

var last_help_level = -1;
function updateHelpLevel(requested_level) {
    if (requested_level < last_help_level)
	return;
    last_help_level = requested_level;
    var help_text = undefined;
    switch (requested_level) {
    case HelpLevelEnum.HELP_FILE_LOADING:
	help_text = "(Only your browser reads the image. It is not uploaded anywhere.)"
	break;
    case HelpLevelEnum.HELP_START_LINE:
	help_text = "Click somewhere to start a line.";
	break;
    case HelpLevelEnum.HELP_FINISH_LINE:
	help_text = "A second click finishes the line. Or Cancel with 'Esc'.";
	break;
    case HelpLevelEnum.HELP_SET_LEN:
	help_text = "Double click on length to set relative size.";
	break;
    case HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW:
	help_text = "Congratulations - you are an expert now!";
	break;
    }
    if (help_text != undefined) {
	var helptext_span = document.getElementById('helptext');
	while (helptext_span.firstChild) {
	    helptext_span.removeChild(helptext.firstChild);
	}
	helptext_span.appendChild(document.createTextNode(help_text));

	if (requested_level == HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW) {
	    helptext_span.style.transition = "opacity 10s";
	    helptext_span.style.opacity = 0;
	}
    }
}

function addLine(line) {
    lines[lines.length] = line;
}

function clearDirtyRegion() {
    // TODO: actually record the dirty region.
    measure_ctx.clearRect(0, 0,
			      measure_canvas.width, measure_canvas.height);
}

function drawAll() {
    clearDirtyRegion();
    for (i=0; i < lines.length; ++i) {
	lines[i].draw(measure_ctx, print_factor, false);
    }
    if (current_line != undefined) {
	current_line.draw_editline(measure_ctx, print_factor);
    }
}

function showLoupe(x, y) {
    if (backgroundImage === undefined || loupe_ctx === undefined)
	return;
    var frame_x = x - scrollLeft();
    var frame_y = y - scrollTop();
    if (frame_x < 1.5 * loupe_canvas.width
	&& frame_y < 1.1 * loupe_canvas.height) {
	loupe_canvas.style.left = (2 * loupe_canvas.width) + "px";
    } else if (frame_x > 1.7 * loupe_canvas.width
	       || frame_y > 1.2 * loupe_canvas.height) {
	// Little hysteresis on transitioning back
	loupe_canvas.style.left = "10px";
    }
    var loupe_factor = 5;
    var sw = loupe_ctx.canvas.width;
    loupe_ctx.drawImage(backgroundImage,
			x - sw/(2*loupe_factor),
			y - sw/(2*loupe_factor), sw, sw,
			0, 0, loupe_factor * sw, loupe_factor * sw);
    loupe_ctx.beginPath();
    loupe_ctx.moveTo(0, sw/2);
    loupe_ctx.lineTo(sw, sw/2);
    loupe_ctx.moveTo(sw/2, 0);
    loupe_ctx.lineTo(sw/2, sw);
    loupe_ctx.stroke();
}

function moveOp(x, y) {
    showLoupe(x, y);
    if (current_line == undefined)
	return;
    current_line.updatePos(x, y);
    drawAll();
}

function clickOp(x, y) {
    var now = new Date().getTime();
    if (current_line == undefined) {
	current_line = new Line(x, y, x, y);
	start_line_time = now;
	updateHelpLevel(HelpLevelEnum.HELP_FINISH_LINE);
    } else {
	current_line.updatePos(x, y);
	// Make sure that this was not a double-click event.
	// (are there better ways ?)
	if (current_line.length() > 50
	    || (current_line.length() > 0 && (now - start_line_time) > 500)) {
	    addLine(current_line);
	    updateHelpLevel(HelpLevelEnum.HELP_SET_LEN);
	}

	current_line = undefined;
    }
    drawAll();
}

function doubleClickOp(x, y) {
    var smallest_distance = undefined;
    var selected_line = undefined;
    for (i = 0; i < lines.length; ++i) {
	var this_distance = lines[i].distanceToCenter(x, y);
	if (smallest_distance == undefined || this_distance < smallest_distance) {
	    smallest_distance = this_distance;
	    selected_line = lines[i];
	}
    }

    if (selected_line && smallest_distance < 50) {
	selected_line.draw(measure_ctx, print_factor, true);
	var orig_len_txt = (print_factor * selected_line.length()).toPrecision(4);
	var new_value_txt = prompt("Length of selected line ?", orig_len_txt);
	if (orig_len_txt != new_value_txt) {
	    var new_value = parseFloat(new_value_txt);
	    if (new_value && new_value > 0) {
		print_factor = new_value / selected_line.length();
	    }
	}
	updateHelpLevel(HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW);
	drawAll();
    }
}

function OnKeyEvent(e) {
    if (e.keyCode == 27 && current_line != undefined) {
	current_line = undefined;
	drawAll();
    }
}

function scrollTop() {
    return document.body.scrollTop + document.documentElement.scrollTop;
}

function scrollLeft() {
    return document.body.scrollLeft + document.documentElement.scrollLeft;
}

function extract_event_pos(e, callback) {
    var x;
    var y;
    if (e.pageX != undefined && e.pageY != undefined) {
	x = e.pageX;
	y = e.pageY;
    }
    else {
	x = e.clientX + scrollLeft();
	y = e.clientY + scrollY();
    }
    x -= measure_canvas.offsetLeft;
    y -= measure_canvas.offsetTop;

    callback(x, y);
}

function init_measure_canvas(width, height) {
    measure_canvas.width = width;
    measure_canvas.height = height;
    measure_ctx.font = 'bold ' + text_font_pixels + 'px Sans Serif';

    print_factor = 1;
    lines = new Array();
    current_line = undefined;
    start_line_time = 0;
}

function measure_init() {
    updateHelpLevel(HelpLevelEnum.HELP_FILE_LOADING);
    measure_canvas = document.getElementById('measure');
    measure_ctx = measure_canvas.getContext('2d');

    loupe_canvas = document.getElementById('loupe');
    loupe_ctx = loupe_canvas.getContext('2d');

    init_measure_canvas(100, 100);

    measure_canvas.addEventListener("click", function(e) {
	extract_event_pos(e, clickOp);
    });
    measure_canvas.addEventListener("mousemove", function(e) {
	extract_event_pos(e, moveOp);
    });
    measure_canvas.addEventListener("dblclick", function(e) {
	extract_event_pos(e, doubleClickOp);
    });
    document.addEventListener("keydown", OnKeyEvent);

    var chooser = document.getElementById("file-chooser");
    chooser.addEventListener("change", function(e) {
	change_background(chooser);
    });
}

function change_background(chooser) {
    if (chooser.value == "" || !chooser.files[0].type.match(/image.*/))
	return;

    var img_reader = new FileReader();
    img_reader.readAsDataURL(chooser.files[0]);
    img_reader.onload = function(e) {
	var new_img = new Image();
	// Image loading in the background canvas. Once we have the image, we
	// can size the canvases to a proper size.
	var background_canvas = document.getElementById('background-img');
	new_img.onload = function() {
	    var bg_context = background_canvas.getContext('2d');
	    background_canvas.width = new_img.width;
	    background_canvas.height = new_img.height;
	    bg_context.drawImage(new_img, 0, 0);
	    
	    init_measure_canvas(new_img.width, new_img.height);

	    updateHelpLevel(HelpLevelEnum.HELP_START_LINE);
	    backgroundImage = new_img;
	}
	new_img.src = e.target.result;
    }
}
