var socket = io.connect();
var colour = 150;

function setup() {
  createCanvas(800, 600);
  background(20);
  //Setup ip input
    input = createInput();
    input.position(0, 0);

    button = createButton('submit');
    button.position(input.x + input.width, input.y);
    button.mousePressed(function() {
        socket = io.connect(input.value());
    });

  noStroke();
}

function draw() {
  colour = constrain(colour, 0, 255);

  if (mouseIsPressed) {
      DrawDot();
      SendMouseInfo();
      colour -= 10;
  }
  else {
    colour += 10;
  }
}

//Canvas
function DrawDot(x = mouseX, y = mouseY, dotColour = colour) {
    fill(dotColour);
    ellipse(x, y , 50, 50);
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