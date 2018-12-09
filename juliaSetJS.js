var canvas;
function setup(){
	canvas = createCanvas(windowWidth,windowHeight);
}

function draw(){
	background(255);

	/*for(var j = 0;j<windowHeight;j++){
		for(var i = 0;i<windowWidth;i++){
			y = map(j,0,windowHeight,+2,-2);
			x = map(i,0,windowWidth,-2,+2);
			var count = 0;
			while(count<maxIterations){
				count++;
				if(complexSquare(x,y)>4)break;
			}
			if(count<maxIterations){
				stroke(125);
				point(i,j);
			}
		}
	}*/
}

// function complexSquare(var r , var i){
// 	var r2 = Math.pow(r,2);
// 	var i2 = Math.pow(i,2);
// 	return r2+i2;
// }