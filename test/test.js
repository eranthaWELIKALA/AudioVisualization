var assert = require('assert');
describe('Testing', function() {
  describe('#Checking indexP5.js', function() {

	it('Toggle Player', function() {
		var isToggle = tooglePlay(true);
		assert.equal(isToggle, false);
	});


	it('Change Pattern', function() {
		var changing = changePattern("Pattern1");
		assert.equal(changing, 1);
	});
	it('Change Pattern', function() {
		var changing = changePattern("Pattern2");
		assert.equal(changing, 2);
	});
	it('Change Pattern', function() {
		var changing = changePattern("Pattern3");
		assert.equal(changing, 3);
	});
	it('Change Pattern', function() {
		var changing = changePattern("Pattern4");
		assert.equal(changing, 4);
	});
	it('Change Pattern', function() {
		var changing = changePattern("Pattern5");
		assert.equal(changing, 5);
	});


	it('UP ARROW', function() {
		var key = keyPressed('UP_ARROW');
		assert.equal(key, "Up key pressed");
	});
	it('DOWN ARROW', function() {
		var key = keyPressed('DOWN_ARROW');
		assert.equal(key, "Down key pressed");
	});


	it('Draw Pattern 03', function() {
		var pat = draw(3);
		assert.equal(pat, "pattern3 is called");
	});
	it('Draw Pattern 04', function() {
		var pat = draw(4);
		assert.equal(pat, "pattern4 is called");
	});
	it('Draw Pattern 05', function() {
		var pat = draw(5);
		assert.equal(pat, "pattern5 is called");
	});

  });
});

function tooglePlay(sta){
    if(sta){
        /*song.pause();
        playButton.html('Play');*/
        colorChange = false;
    }
    else{
        /*song.play();
        playButton.html('Pause');*/
        colorChange = true;
    }
	return colorChange;
}


function changePattern(valu) {
    if (valu=='Pattern1'){
        pattern = 1;
    }
    else if (valu=='Pattern2'){
        pattern =2;
    }
    else if (valu=='Pattern3'){
        pattern =3;
    }
    else if (valu=='Pattern4'){
        pattern =4;
    }
    else{
        pattern =5;
    }
    return pattern;
}

function keyPressed(keyCode) {
	var str ;
    if (keyCode === 'UP_ARROW') {
        str ='Up key pressed';
    } else if (keyCode === 'DOWN_ARROW') {
        str ='Down key pressed';
    }
    return str;
}

