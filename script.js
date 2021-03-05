paper.install(window);
$(function(){

	// This demo depends on the canvas element
	if(!('getContext' in document.createElement('canvas'))){
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	// The URL of the web server
	var url = 'http://nworms.jboeijenga.nl:3000';
	var doc = $(document)
	var instructions = $('#instructions');
	var color = RandomColor();
	paper.setup($('canvas')[0]);
	var points = 5;
	var length = 15;
	var tool = new Tool();
	
	// Generate an unique ID
	var id = Math.round($.now()*Math.random());

	var clients = [];
	var worms = [];
	
	var socket = io.connect(url);
	var myPath = createWorm(color);
	
	instructions.delay(1500).fadeOut();
	
	socket.on('moving', function (data) {
		data.path = data.path[1];
		if(! (data.id in clients) && data.id != id){
			// a new user has come online. create a worm for them
			worms[data.id] = createWorm(data.color);
		}

		worms[data.id].segments = data.path.segments;
		paper.view.draw();
		
		// Saving the current client state
		clients[data.id] = data;
		clients[data.id].updated = $.now();
	});


	// Remove inactive clients after 10 seconds of inactivity
	setInterval(function(){
		for(var ident in clients){
			if($.now() - clients[ident].updated > 10000){
				// Last update was more than 10 seconds ago. 
				// This user has probably closed the page
				delete clients[ident];
				worms[ident].remove();
				delete worms[ident];
			}
		}
	},10000);
	
	function createWorm(color,id){
		var path = new paper.Path({
			strokeColor: color,
			strokeWidth: 20,
			strokeCap: 'round'
		});
		
		var start = new paper.Point(Math.random()*100,Math.random()*100);
		for (var i = 0; i < points; i++) {
			path.add(new paper.Point(i * length + start.x, 0 + start.y));
		}
		
		return path;
	}
	
	function RandomColor() {
		colors = ['#5C4B51', '#8CBEB2', '#F3B562', '#F06060']
		return colors[Math.floor(Math.random()*colors.length)];
	}
	

    var lastEmit = $.now();
	paper.tool.onMouseMove = function(event) {
		myPath.firstSegment.point = event.point;
		for (var i = 0; i < points - 1; i++) {
			var segment = myPath.segments[i];
			var nextSegment = segment.next;
			var vector = new paper.Point(segment.point.x - nextSegment.point.x,segment.point.y - nextSegment.point.y);
			vector.length = length;
			nextSegment.point = new paper.Point(segment.point.x - vector.x,segment.point.y - vector.y);
		}
		myPath.smooth();
		
		if($.now() - lastEmit > 5){
			socket.emit('mousemove',{
				'color'	: color,
				'path'	: myPath,
				'id': id
			});
			lastEmit = $.now();
		}
	}

	paper.tool.onMouseUp = function(event) {
		var newColor = myPath.strokeColor;
    while(newColor === myPath.strokeColor){
      newColor = RandomColor();
    }
    myPath.strokeColor = newColor;
	}

});