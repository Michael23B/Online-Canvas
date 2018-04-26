var socket = io;
//var socket = io.connect("localhost:3000");
//SocketSetup();

//keep track of our colour
var r = 150, g = 150, b = 150, drawSize; //TODO: add an alpha for colour
//predefine constants
var BLACK, WHITE, RED, GREEN, BLUE, DISPLAYRED, DISPLAYGREEN, DISPLAYBLUE, DEFAULTSIZE, PLAYERLISTPOS;
//image array
var images = [];
//word array
var words = [];
//is a client joining?
var loading = true;
//currently pressed keys
var keys = [];
//word guessing game object
var Game = {
    //Variables
    currentWordIndex: 0,
    currentWord: "",
    hint: "",
    currentPlayerId: 0,
    players: [],
    //playerPos array maps the position of the player at the same index in Game.players
    playerPos: [],
    gameActive: false,
    //Functions
    guess: function (word) {
        return words.findIndex(x => x === word) === this.currentWordIndex;
    },
    guessReply: function(result, data) {
        if (result) {
            //TODO: give the player points
            Game.currentPlayerId = null; //This round if finished, don't accept any more guesses
            Game.currentWordIndex = null;
            Game.currentWord = "";
            Game.hint = "";
            DrawWord(" ");  //Clear the previous word
            socket.emit('guessReply', { guess: data.guess, player: data.player, result: result });
            socket.emit('nextPlayer');
        }
        else {
            socket.emit('guessReply', { guess: data.guess, player: data.player, result: result });
        }
    },
    beginRound: function (drawer, data) {
        if (drawer) {
            //Get a random word and draw it
            var wordIndex = Math.round(random(0, words.length - 1));
            DrawWord(wordIndex);

            //Setup game variables (drawer only)
            Game.currentWordIndex = wordIndex;
            Game.currentWord = words[wordIndex];
            Game.gameInput.hide();
            Game.getHint();

            //Send the other players a hint
            socket.emit('hint', Game.hint);
        }
        else {
            Game.gameInput.show();
            Game.currentWord = "";
        }

        //Setup game variables (all players)
        Game.gamebtn.hide();
        Game.gameActive = true;
        Game.currentPlayerId = data.currentPlayerId;
        Game.gameInput.value('');
        Game.players = data.players;

        //Draw players tags
        for (var i = 0; i < Game.players.length; ++i) {
            (function (i) {
                //Current drawer name is blue
                var textCol = Game.players[i] === data.currentPlayerId ? DISPLAYBLUE : WHITE;
                //Order positions with player 1 at the top
                var playerPosOrder = (Game.players.length - 1) - i;
                //Set player positions (used for drawing their guesses and names)
                Game.playerPos[i] = createVector(PLAYERLISTPOS.x, PLAYERLISTPOS.y - (playerPosOrder * 50));

                DrawWord('P' + (i+1) + ':', Game.playerPos[i].x, Game.playerPos[i].y, textCol, 40);
            }).call(this, i);
        }
    },
    getHint: function() {
        Game.hint = "";

        for (var i = 0; i < Game.currentWord.length; ++i) {
            Game.hint += "_ ";
        }
    },
    improveHint: function() {
        //Hint is "_ " repeated so every second letter (' ') we don't want to replace
        var charIndex;

        if (Game.hint.search("_") !== -1) {
            //We know we have an '_' so loop until we find one to replace
            do {
                charIndex = Math.round(random(0, Game.currentWord.length - 1));
            }
            while(Game.hint[charIndex * 2] !== "_");

            //Replace the _ with a character from the word
            var newHint = Game.hint.substring(0, charIndex * 2)
                + Game.currentWord[charIndex]
                + Game.hint.substring((charIndex * 2) + 1, Game.hint.length);

            Game.hint = newHint;
        }
    },
    //UI
    gamebtn: undefined,
    gameInput: undefined
};
//timer
var timer = 1, countDown = 0;

function preload() {
    var imgCount = 10;  //number of images in 'img/' to load
    for (var i = 0; i < imgCount; ++i) {
        images[i] = loadImage('/img/' + i + '.png');
    }

//TODO: Use drop to let clients upload custom images. https://p5js.org/reference/#/p5.Element/drop
    words = loadStrings('words.txt');
}

function setup() {
  createCanvas(1200, 800);
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
        socket = io.connect(input.value().toString());

        input.hide();
        button.hide();

        SocketSetup();
    });

    //Setup clear button
    clearbtn = createButton('!!!');
    clearbtn.position(width - 80, height - 30);
    clearbtn.size(75);
    clearbtn.mousePressed(function() {
        ClearCanvas();
        socket.emit('clearCanvas');
    });

    //Setup game button
    Game.gamebtn = createButton(':)');
    Game.gamebtn.position(width - 160, height - 30);
    Game.gamebtn.size(75);
    Game.gamebtn.mousePressed(function() {
        socket.emit('startGame');
        Game.gamebtn.hide();
        Game.gameInput.hide();
    });

    //Setup game input
    Game.gameInput = createInput();
    Game.gameInput.position(width - 150, height - 60);
    Game.gameInput.size(130);
    Game.gameInput.input(function() {
        var guess = Game.gameInput.value();
        if (guess.length > 20) return;  //stop user from typing long words
        SendGuess(guess);
    });
    Game.gameInput.hide();

    //Setup drawing
    strokeWeight(4);
    imageMode(CENTER);

    //Setup constants
    BLACK = color(0, 0, 0);
    WHITE = color(255, 255, 255);
    RED = color(255, 0, 0);
    GREEN = color(0, 255, 0);
    BLUE = color(0, 0, 255);
    DISPLAYRED = color(255, 40, 40);
    DISPLAYGREEN = color(40, 255, 40);
    DISPLAYBLUE = color(40, 40, 255);
    DEFAULTSIZE = createVector(25,25);
    PLAYERLISTPOS = createVector(width - 200, height - 100);

    //Setup helpers
    drawSize = createVector(DEFAULTSIZE.x,DEFAULTSIZE.y);
}

function draw() {
  if (loading) return;

  CheckTimer();
  CheckInput();
  DrawPalette();

  if (mouseIsPressed) {
      DrawDot();
      SendMouseInfo();
      //Brighten colour while painting
      ApproachColour(WHITE, random(0, 0.5));
  }
  else ApproachColour(BLACK, random(0, 2), true);
}

//Canvas
//Drawing
function DrawDot(x = mouseX, y = mouseY, dotColour = color(r,g,b), dotSize = drawSize) {
    //TODO: Separate draw dot from manual input and draw dot for UI, then add all manual to an array to send to other clients when they join
    noStroke();
    fill(dotColour);
    ellipse(x, y , dotSize.x, dotSize.y);
}

function DrawRect(x = mouseX, y = mouseY, dotColour = color(r,g,b), rectSize = drawSize) {
    noStroke();
    fill(dotColour);
    rect(x, y , rectSize.x, rectSize.y);
}

function DrawImage(imageIndex, x = mouseX, y = mouseY, imageSize = drawSize) {
    //double draw size for images
    image(images[imageIndex], x, y, imageSize.x * 2, imageSize.y * 2);
}

function DrawWord(wordOrIndex, posX = width / 2, posY = 5, colour = WHITE, rectSizeX = 225) {
    if (typeof wordOrIndex === "number") {
        var word = words[wordOrIndex];
        DrawRect(posX - rectSizeX / 2, posY + 5, color(20,20,20), createVector(rectSizeX,30));
        fill(WHITE);
        textAlign(CENTER);
        text(word, posX, 5);
    }
    else {
        DrawRect(posX - rectSizeX / 2, posY, color(20,20,20), createVector(rectSizeX,25));
        fill(colour);
        textAlign(CENTER);
        text(wordOrIndex, posX, posY + 5);
    }
}

//UI
function DrawPalette() {
    //Background for text display
    DrawRect(width - 110, 0, color(20,20,20), createVector(110, 110));

    //Draw current size info
    noStroke();
    textAlign(RIGHT, RIGHT);
    fill(WHITE);
    //var drawSizeDisplay = 'Size = (' + Math.round(drawSize.x) + ', ' + Math.round(drawSize.y) + ')'; //x,y size
    var drawSizeDisplay = 'Size: ' + Math.round(drawSize.x); //for now we just use one size for both width and height
    text(drawSizeDisplay, width - 5, 10);

    //Draw current colour info
    fill(DISPLAYRED);
    text(Math.round(r), width - 70, 35);
    fill(DISPLAYGREEN);
    text(Math.round(g), width - 37.5, 35);
    fill(DISPLAYBLUE);
    text(Math.round(b), width - 5, 35);

    //Draw current colour
    DrawDot(width - 45, 80, color(r,g,b), createVector(30,30));

    //Draw current game word
    if (Game.currentWord) DrawWord(Game.currentWord);
}

//Controls
//Approach colour by amount each frame
function ApproachColour(colour, amount = random(0, 4), darken = false) {
    var newR = colour._array[0] * 255;
    var newG = colour._array[1] * 255;
    var newB = colour._array[2] * 255;

    if (darken) {
        //Approach a specific colour
        r < newR ? r+= amount : r-= amount;
        g < newG ? g+= amount : g-= amount;
        b < newB ? b+= amount : b-= amount;
    }
    else {
        //Increase colour only
        if (r < newR) r+= amount;
        if (g < newG) g+= amount;
        if (b < newB) b+= amount;
    }

    r = constrain(r, 0, 255);
    g = constrain(g, 0, 255);
    b = constrain(b, 0, 255);
}

function CheckTimer() {
    if (countDown !== 0) {
        if (timer % 60 === 0) {
            timer = 1;
            countDown--;
            if (countDown === 0) {
                if (Game.currentPlayerId !== socket.id) return;
                Game.improveHint();
                socket.emit('hint', Game.hint);
                console.log(Game.hint);
            }
        }
        else {
            timer++;
        }
    }
}

function CheckInput() {
    for (var i = 0; i < keys.length; ++i) {
        DoWork(keys[i]);
    }
}

function DoWork(key) {
    //image keys
    if (!key || key === " ") return;
    if (key >= 0 && key <= 9) {
        PlaceImageByIndex(Number(key));
        return;
    }
    //control drawing keys
    switch (key) {
        case 'q':
            ApproachColour(RED);
            break;
        case 'w':
            ApproachColour(GREEN);
            break;
        case 'e':
            ApproachColour(BLUE);
            break;
        case 'd':
            ControlSize();
            break;
        case 's':
            ControlSize(-0.5);
            break;
        default:
            break;
    }
}

function ControlSize(amountX = 0.5, amountY = amountX) {
    drawSize.x += amountX;
    drawSize.y += amountY;

    drawSize.x = constrain(drawSize.x, 1, 125);
    drawSize.y = constrain(drawSize.y, 1, 125);
}

function PlaceImageByIndex(i) {
    DrawImage(i);
    SendImage(i);
}

//keep track of all keys being held down
function keyPressed() {
    //ignore tab, backspace, enter and space
    if (keyCode === 9 || keyCode === 8 || keyCode === 13 || keyCode === 32) return;
    keys.push(key.toLowerCase());
}

function keyReleased(e) {
    var keyIndex = keys.findIndex(x => x === e.key.toLowerCase());
    if (keyIndex !== -1) keys.splice(keyIndex, 1);
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

function SendImage(index) {
    var data = {
        imgIndex: index,
        posX: mouseX,
        posY: mouseY,
        imgSizeX: drawSize.x,
        imgSizeY: drawSize.y
    };

    socket.emit('image', data);
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

//Guessing game
function SendGuess(guess) {
    var data = {
        guess: guess,
        player: socket.id
    };

    socket.emit('guess', data);
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

    //TODO: replace this function its way too slow
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

    socket.on('clearCanvas', function() {
        ClearCanvas();
    });

    socket.on('image', function(data) {
        DrawImage(data.imgIndex, data.posX, data.posY, createVector(data.imgSizeX, data.imgSizeY));
    });

    socket.on('guess', function(data) {
        //if the game hasn't started or you aren't the current player, return
        if (Game.currentPlayerId !== socket.id || Game.gameActive === false) return;

        var playerGuessPos = Game.playerPos[Game.players.indexOf(data.player)];

        if (Game.guess(data.guess)) {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYGREEN, 150);
            DrawImage(1, width - 30, playerGuessPos.y, createVector(30,30));

            Game.guessReply(true, data);
        }
        else {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYRED, 150);
            DrawImage(3, width - 30, playerGuessPos.y, createVector(30,30));

            Game.guessReply(false, data);
        }
    });

    socket.on('guessReply', function(data) {
        var playerGuessPos = Game.playerPos[Game.players.indexOf(data.player)];

        if (data.result) {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYGREEN, 150);
            DrawImage(1, width - 30, playerGuessPos.y, createVector(30,30));
        }
        else {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYRED, 150);
            DrawImage(3, width - 30, playerGuessPos.y, createVector(30,30));
        }
    });

    socket.on('startGame', function(data) {
        Game.beginRound(data.currentPlayerId === socket.id, data)
    });

    socket.on('hint', function(data) {
        Game.currentWord = data;
    })
}

//TODO: add button for requesting a new word in case its a bad word. Limit it to 2 new words or something
//TODO: make the input button un-hide if a player fails to connect so they can retry connecting
//TODO: add a timer for drawing