var socket = io.connect();
var colour = 150;

function setup() {
  createCanvas(800, 600);
  background(20);
  //Setup ip input
    input = createInput();
    input.position(5, 30);

    textSize(18);
    fill(230, 230, 230);
    text("Enter host IP address", input.x, input.y - 5);

    button = createButton('Connect to port');
    button.position(input.x + input.width, input.y);
    button.mousePressed(function() {
        socket = io.connect(input.value());
    });

    //Setup drawing
    strokeWeight(4);
}

function draw() {
  colour = constrain(colour, 0, 255);
  DrawPallete();

  if (mouseIsPressed) {
      DrawDot();
      SendMouseInfo();
      colour -= 5;
  }
  else {
    colour += 5;
  }
}

//Canvas
function DrawDot(x = mouseX, y = mouseY, dotColour = colour) {
    stroke(dotColour, dotColour, dotColour, 50);
    fill(dotColour);
    ellipse(x, y , 25, 25);
}

function DrawPallete() {
    //Draw current colour
    fill(colour);
    stroke(colour, colour, colour, 50);
    ellipse(20,height - 20, 25,25);
}

//Disable mobile default controls
function touchStarted() {
}

function touchMoved() {
    return false;
}

//Networking
//Send
function SendMouseInfo() {
    var data = {
        x: mouseX,
        y: mouseY,
        col: colour
    }

    socket.emit('mouse', data);
}

//Receive
socket.on('mouse', function(data) {
    DrawDot(data.x, data.y, data.col);
})