var socket = io.connect();

//keep track of our colour
var r = 150, g = 150, b = 150;
//palette positions
var P1, P2, P3, P4;

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

    //Setup palettes
    P1 = createVector(90,height - 20);
    P1.colour = color(255, 40, 40);
    P2 = createVector(125,height - 20);
    P2.colour = color(40, 255, 40);
    P3 = createVector(160,height - 20);
    P3.colour = color(40, 40, 255);
    P4 = createVector(195,height - 20);
    P4.colour = color(255, 255, 255);
}

function draw() {
  DrawPalette();
  CheckPalettes();

  if (mouseIsPressed) {
      DrawDot();
      SendMouseInfo();
      FadeColour(random(0, 2));
  }
  else {
      FadeColour(random(-2, 0));
  }
}

//Canvas
function DrawDot(x = mouseX, y = mouseY, dotColour = color(r,g,b)) {
    stroke(dotColour);
    fill(dotColour);
    ellipse(x, y , 25, 25);
}

function DrawPalette() {
    //Draw current colour
    DrawDot(20,height - 20);
    //palette divider
    stroke(color(255, 255, 255));
    line(55, height - 5, 55, height - 35);
    //Draw palette
    DrawDot(P1.x, P1.y, P1.colour);
    DrawDot(P2.x, P2.y, P2.colour);
    DrawDot(P3.x, P3.y, P3.colour);
    DrawDot(P4.x, P4.y, P4.colour);
}

function FadeColour(amount) {
    r += amount;
    g += amount;
    b += amount;

    r = constrain(r, 0, 255);
    g = constrain(g, 0, 255);
    b = constrain(b, 0, 255);
}

function GetNewColour(colour) {
    r = colour._array[0] * 255;
    g = colour._array[1] * 255;
    b = colour._array[2] * 255;
}

function CheckPalettes() {
    if (dist(P1.x, P1.y, mouseX, mouseY) < 20) { GetNewColour(P1.colour); }
    if (dist(P2.x, P2.y, mouseX, mouseY) < 20) { GetNewColour(P2.colour); }
    if (dist(P3.x, P3.y, mouseX, mouseY) < 20) { GetNewColour(P3.colour); }
    if (dist(P4.x, P4.y, mouseX, mouseY) < 20) { GetNewColour(P4.colour); }
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
        r: r,
        g: g,
        b: b
    }

    socket.emit('mouse', data);
}

//Receive
socket.on('mouse', function(data) {
    DrawDot(data.x, data.y, color(data.r, data.g, data.b));
})