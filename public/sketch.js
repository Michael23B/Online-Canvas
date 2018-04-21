var socket = io.connect("localhost:3000");
SocketSetup();
//keep track of our colour
var r = 150, g = 150, b = 150;
//predefine colours
var BLACK, WHITE, RED, GREEN, BLUE;
//palette objects (vector2 position with colour)
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
        socket.disconnect(true);
        socket = io.connect(input.value().toString());

        SocketSetup();

        //socket.emit('requestCanvas');
    });

    //Setup drawing
    strokeWeight(4);

    //Setup colours
    BLACK = color(0, 0, 0);
    WHITE = color(255, 255, 255);
    RED = color(255, 40, 40);
    GREEN = color(40, 255, 40);
    BLUE = color(40, 40, 255);

    //Setup palettes
    P1 = createVector(90,height - 20);
    P1.colour = RED;
    P2 = createVector(125,height - 20);
    P2.colour = GREEN;
    P3 = createVector(160,height - 20);
    P3.colour = BLUE;
    P4 = createVector(195,height - 20);
    P4.colour = WHITE;
}

function draw() {
  DrawPalette();
  CheckPalettes();

  if (mouseIsPressed) {
      DrawDot();
      if (socket) SendMouseInfo();
  }
}
var img;
function keyPressed(e) {
    if (e.key === "w") {
        socket.emit('requestCanvas', { from: socket.id });
        console.log("request sent");
    }
    if (e.key === "e") {
        background(img);
    }
    if (e.key === "d") {
        var s = get();
        translate(30,30);
        background(s);
    }
    if (e.key === "s") {
        img = get();
    }
}

//Canvas
function DrawDot(x = mouseX, y = mouseY, dotColour = color(r,g,b)) {
    noStroke();
    fill(dotColour);
    ellipse(x, y , 25, 25);
}

function DrawPalette() {
    //Draw current colour
    DrawDot(20,height - 20);
    //Palette divider
    stroke(color(255, 255, 255));
    line(55, height - 5, 55, height - 35);
    //Draw palette
    DrawDot(P1.x, P1.y, P1.colour);
    DrawDot(P2.x, P2.y, P2.colour);
    DrawDot(P3.x, P3.y, P3.colour);
    DrawDot(P4.x, P4.y, P4.colour);
}

//Approach colour by amount each frame
function ApproachColour(colour, amount = random(0, 2)) {
    var newR = colour._array[0] * 255;
    var newG = colour._array[1] * 255;
    var newB = colour._array[2] * 255;

    r < newR ? r+= amount : r-= amount;
    g < newG ? g+= amount : g-= amount;
    b < newB ? b+= amount : b-= amount;

    r = constrain(r, 0, 255);
    g = constrain(g, 0, 255);
    b = constrain(b, 0, 255);
}

function CheckPalettes() {
    //If mouse is ove a palette, select that colour otherwise fade the colour closer to white or black
    if (dist(P1.x, P1.y, mouseX, mouseY) < 20) { ApproachColour(P1.colour); }
    else if (dist(P2.x, P2.y, mouseX, mouseY) < 20) { ApproachColour(P2.colour); }
    else if (dist(P3.x, P3.y, mouseX, mouseY) < 20) { ApproachColour(P3.colour); }
    else if (dist(P4.x, P4.y, mouseX, mouseY) < 20) { ApproachColour(P4.colour); }
    else {
        if (mouseIsPressed) ApproachColour(WHITE);
        else ApproachColour(BLACK);
    }
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
    };

    socket.emit('mouse', data);
}

//When a new client joins, host will send his canvas pixel information
function SendCanvas(from) {
    //Default get() returns all pixels on the canvas as a pixel[]
    //Client requesting canvas is stored in requestCanvas data
    var canvasInfo = get();
    var data = {
        canvas: canvasInfo,
        to: from
    }
    console.log("SENDING THE CANVAS -------------------------");
    socket.emit('sendCanvas', data);
}

function SocketSetup() {
    //Receive
    socket.on('mouse', function(data) {
        DrawDot(data.x, data.y, color(data.r, data.g, data.b));
    });

    socket.on('requestCanvas', function(data) {
        console.log("received a request from " + data.from);
        SendCanvas(data.from);
    });

    socket.on('sendCanvas', function(data) {
        console.log("ok we got sent a canvas here. Canvas type = " + typeof(data.canvas));
        console.log(data.canvas);
        //image(data.canvas, 0,0);
        background(data.canvas);
        console.log("finished applying new canvas.");
    });
}