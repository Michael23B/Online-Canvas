var socket = io;

//var socket = io.connect("localhost:3000");
//SocketSetup();

//keep track of our colour
var r = 150, g = 150, b = 150, drawSize;
//predefine constants
var BLACK, WHITE, RED, GREEN, BLUE, DEFAULTSIZE;
//palette objects (vector2 position with colour)
var P1, P2, P3, P4;
//controller objects
var sizeControlUp, sizeControlDown;
//image array
var images = [];

var loading = true;

function preload() {
    images.push(loadImage('/img/krappa.png'));
    images.push(loadImage('/img/omegalul.png'));
    images.push(loadImage('/img/seemsgood.png'));
}

function setup() {
  createCanvas(800, 600);
  background(20);
  //Setup ip input
    input = createInput(getURL());
    input.position(5, 30);
    input.value();
    input.size(175);

    textSize(18);
    fill(230, 230, 230);
    text("Enter host IP address", input.x, input.y - 5);

    button = createButton('Connect to port');
    button.position(input.x + input.width, input.y);
    button.mousePressed(function() {
        //socket.disconnect(true);
        socket = io.connect(input.value().toString());

        input.hide();
        button.hide();

        SocketSetup();
    });

    //Setup clear button
    clearbtn = createButton('!!!');
    clearbtn.position(width - 75, 60);
    clearbtn.size(60);
    clearbtn.mousePressed(function() {
        ClearCanvas();
    });


    //Setup drawing
    strokeWeight(4);
    imageMode(CENTER);

    //Setup constants
    BLACK = color(0, 0, 0);
    WHITE = color(255, 255, 255);
    RED = color(255, 40, 40);
    GREEN = color(40, 255, 40);
    BLUE = color(40, 40, 255);
    DEFAULTSIZE = createVector(25,25);

    //Setup palettes
    P1 = createVector(90,height - 20);
    P1.colour = RED;
    P2 = createVector(125,height - 20);
    P2.colour = GREEN;
    P3 = createVector(160,height - 20);
    P3.colour = BLUE;
    P4 = createVector(195,height - 20);
    P4.colour = WHITE;

    //Setup controllers
    sizeControlUp = createVector(250,height - 25);
    sizeControlDown = createVector(295,height - 20);

    //Setup helpers
    drawSize = createVector(DEFAULTSIZE.x,DEFAULTSIZE.y);
}

function draw() {
  if (loading) return;

  DrawPalette();
  CheckPalettes();

  if (mouseIsPressed) {
      DrawDot();
      SendMouseInfo();
  }
  CheckKeys();
}

//Canvas
function DrawDot(x = mouseX, y = mouseY, dotColour = color(r,g,b), dotSize = drawSize) {
    noStroke();
    fill(dotColour);
    ellipse(x, y , dotSize.x, dotSize.y);
}

function DrawRect(x = mouseX, y = mouseY, dotColour = color(r,g,b), rectSize = drawSize) {
    noStroke();
    fill(dotColour);
    rect(x, y , rectSize.x, rectSize.y);
}

function DrawPalette() {
    //Background for text display
    DrawRect(width - 100, 0, WHITE, createVector(100, 90));

    //Draw current size info
    noStroke();
    textAlign(RIGHT, RIGHT);
    fill(BLACK);
    //var drawSizeDisplay = 'Size = (' + Math.round(drawSize.x) + ', ' + Math.round(drawSize.y) + ')'; //x,y size
    var drawSizeDisplay = 'Size: ' + Math.round(drawSize.x); //for now we just use one size for both width and height
    text(drawSizeDisplay, width - 5, 10);

    //Draw current colour info
    fill(RED);
    text(Math.round(r), width - 5, 35);
    fill(GREEN);
    text(Math.round(g), width - 37.5, 35);
    fill(BLUE);
    text(Math.round(b), width - 70, 35);

    //Draw current rotation info

    //Draw current colour
    DrawDot(20,height - 20);

    //Palette divider
    stroke(WHITE);
    line(55, height - 5, 55, height - 35);

    //Draw palette
    DrawDot(P1.x, P1.y, P1.colour, DEFAULTSIZE);
    DrawDot(P2.x, P2.y, P2.colour, DEFAULTSIZE);
    DrawDot(P3.x, P3.y, P3.colour, DEFAULTSIZE);
    DrawDot(P4.x, P4.y, P4.colour, DEFAULTSIZE);

    //Controller divider
    stroke(WHITE);
    line(225, height - 5, 225, height - 35);

    //Draw controllers
    DrawRect(sizeControlUp.x - 12, sizeControlUp.y + 2, WHITE, createVector(30,5));
    DrawRect(sizeControlUp.x, sizeControlUp.y - 10, WHITE, createVector(5,30));
    DrawRect(sizeControlDown.x - 12, sizeControlDown.y - 2, WHITE, createVector(30,5));
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

function ControlSize(amountX = 0.1, amountY = amountX) {
    drawSize.x += amountX;
    drawSize.y += amountY;

    drawSize.x = constrain(drawSize.x, 0.5, 100);
    drawSize.y = constrain(drawSize.y, 0.5, 100);
}

function CheckPalettes() {
    //If mouse is ove a palette, select that colour
    if (dist(P1.x, P1.y, mouseX, mouseY) < 20) { ApproachColour(P1.colour); }
    else if (dist(P2.x, P2.y, mouseX, mouseY) < 20) { ApproachColour(P2.colour); }
    else if (dist(P3.x, P3.y, mouseX, mouseY) < 20) { ApproachColour(P3.colour); }
    else if (dist(P4.x, P4.y, mouseX, mouseY) < 20) { ApproachColour(P4.colour); }
    //Size controllers
    else if (dist(sizeControlUp.x, sizeControlUp.y, mouseX, mouseY) < 20) { ControlSize(); }
    else if (dist(sizeControlDown.x, sizeControlDown.y, mouseX, mouseY) < 20) { ControlSize(-0.1); }
    //fade the colour closer to white or black
    else {
        if (mouseIsPressed) ApproachColour(WHITE);
        else ApproachColour(BLACK);
    }
}

function CheckKeys() {
//http://keycode.info/
    if (keyIsDown(49)) {
        image(images[0], mouseX, mouseY, drawSize.x, drawSize.y);
    }
    else  if (keyIsDown(50)) {
        image(images[1], mouseX, mouseY, drawSize.x, drawSize.y);
    }
    else if (keyIsDown(51)) {
        image(images[2], mouseX, mouseY, drawSize.x, drawSize.y);
    }
}

function ClearCanvas() {
    background(20);
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
        b: b,
        sizeX: drawSize.x,
        sizeY: drawSize.y
    };

    socket.emit('mouse', data);
}

//When a new client joins, host will send his canvas pixel information
function SendCanvas(from) {
    loadPixels();
    var canvasInfo = pixels;

    var data = {
        canvas: canvasInfo,
        to: from
    };
    console.log("Sending canvas");
    socket.emit('sendCanvas', data);
}

function SocketSetup() {
    //Receive
    socket.on('mouse', function(data) {
        DrawDot(data.x, data.y, color(data.r, data.g, data.b), createVector(data.sizeX,data.sizeY));
    });

    socket.on('requestCanvas', function(data) {
        console.log("received a request from " + data.from);

        loading = true;
        SendCanvas(data.from);
    });

    socket.on('sendCanvas', function(data) {
        loadPixels();
        //this is omega slow
        for (var i = 0; i < pixels.length; ++i) {
            pixels[i] = data[i];
        }
        updatePixels();
        console.log("Finished applying new canvas.");
        socket.emit('loading', false);
    });

    socket.on('loading', function(data) {
       loading = data;
        textAlign(LEFT, TOP);
       if (data) {
           fill(GREEN);
           noStroke();
           rect(5, 60, 150, 25, 7.5, 7.5, 7.5, 7.5);
           fill(WHITE);
           text("Player loading...", 12.5, 63.5);
       }
       else {
           fill(GREEN);
           noStroke();
           rect(5, 60, 150, 25, 7.5, 7.5, 7.5, 7.5);
           fill(WHITE);
           text("Player joined!", 12.5, 63.5);
       }
    });
}

//TODO: send events to other clients for CheckKeys() and ClearCanvas()
//TODO: make the input button un-hide if a player fails to connect so they can retry connecting