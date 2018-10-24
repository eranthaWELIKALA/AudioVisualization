var canvas;
var number=1;
var val = 0.5;

var song,color;
var colorChange = true;
var play = true;

/*function preload(){
	song = loadSound("test.mp3");
}*/



//initialize the page
function setup() {
	canvas = createCanvas(200,200);
	canvas.position(200,200);

	//playing sound in preload method
	//song.play();

	//loading sound in callback method
	song = loadSound('test.mp3',doneLoading);
	
	song.setVolume(val);
}

function doneLoading(){

	//playing sound in callback method
	song.play();
}

//calls infinitely
function draw(){
	if(colorChange)color = random(255);
	background(color);
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
  	if(val!=1)val = val+0.1;
    song.setVolume(val);
  } else if (keyCode === DOWN_ARROW) {
    if(val!=0)val = val-0.1;
    song.setVolume(val);
  }
}

function mousePressed(){
	if(play){
		song.pause();
  		colorChange = false;
	}
	else{
		song.play();
  		colorChange = true;
	}
	play = !play;
}

