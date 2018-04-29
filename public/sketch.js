var socket = io;

//keep track of our colour
var r = 150, g = 150, b = 150, drawSize; //TODO: add an alpha for colour
//predefine constants
var BLACK, WHITE, RED, GREEN, BLUE, DISPLAYRED, DISPLAYGREEN, DISPLAYBLUE, DEFAULTSIZE, PLAYERLISTPOS;
//image array
var images = [];
//word array
var words = [];
//names array
var names = [];
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
    newWordCounter: 0,
    currentPlayerId: 0,
    players: [],
    //playerPos array maps the position of the player at the same index in Game.players
    playerPos: [],
    gameActive: false,
    startTime: 0,
    roundLength: 120,
    timeLeft: 0,
    hintCount: 0,
    //Functions
    guess: function (word) {
        return words.findIndex(x => x === word) === this.currentWordIndex;
    },
    guessReply: function(result, data) {
        if (result) {
            let score = Game.calcScore();
            socket.emit('guessReply', { guess: data.guess, player: data.player, result: result, score: score });
            Game.endRound();
        }
        else {
            socket.emit('guessReply', { guess: data.guess, player: data.player, result: result });
        }
    },
    beginRound: function (drawer, data) {
        if (drawer) {
            Game.gameInput.hide();
            Game.newWordCounter = 2;
            Game.newWordbtn.html("New word (" + Game.newWordCounter + ')');
            Game.newWord();
        }
        else {
            Game.gameInput.show();
            Game.currentWord = "";
            Game.newWordbtn.hide();
        }

        //Setup game variables (all players)
        Game.startTime = millis();
        Game.timeLeft = Game.roundLength;
        Game.gamebtn.hide();
        Game.gameActive = true;
        Game.currentPlayerId = data.currentPlayerId;
        Game.gameInput.value('');
        Game.players = data.players;
        Game.hintCount = 0;

        Game.drawPlayers();
    },
    endRound: function() {
        Game.currentPlayerId = null; //This round if finished, don't accept any more guesses
        Game.currentWordIndex = null;
        Game.currentWord = "";
        Game.hint = "";
        Game.newWordbtn.hide();
        DrawWord(" ");  //Clear the previous word
        socket.emit('nextPlayer');
    },
    drawPlayers: function() {
        //Draw players tags
        for (let i = 0; i < Game.players.length; ++i) {
            (function (i) {
                //Current drawer name is blue
                let textCol = Game.players[i].id === Game.currentPlayerId ? DISPLAYBLUE : WHITE;
                //Order positions with player 1 at the top
                let playerPosOrder = (Game.players.length - 1) - i;
                //Set player positions (used for drawing their guesses and names)
                Game.playerPos[i] = createVector(PLAYERLISTPOS.x, PLAYERLISTPOS.y - (playerPosOrder * 50));
                //TODO: score after name
                DrawWord(Game.players[i].name + ' (' + Game.players[i].score + ')',
                    Game.playerPos[i].x,
                    Game.playerPos[i].y,
                    textCol,
                    createVector(82.5, 35),
                    25);
            }).call(this, i);
        }
    },
    getHint: function() {
        Game.hint = "";

        for (let i = 0; i < Game.currentWord.length; ++i) {
            Game.hint += "_ ";
        }
    },
    improveHint: function(amount = 1) {
        //Hint is "_ " repeated so every second letter (' ') we don't want to replace
        let charIndex;

        //for amount of chars, replace an underscore with a letter from the word
        for (let i = 0; i < amount; ++i) {
            if (Game.hint.search("_") !== -1) {
                //We know we have an '_' so loop until we find one to replace
                do {
                    charIndex = Math.round(random(0, Game.currentWord.length - 1));
                }
                while(Game.hint[charIndex * 2] !== "_");

                //Replace the _ with a character from the word
                let newHint = Game.hint.substring(0, charIndex * 2)
                    + Game.currentWord[charIndex]
                    + Game.hint.substring((charIndex * 2) + 1, Game.hint.length);

                Game.hint = newHint;
            }
        }
    },
    newWord: function() {
        let wordIndex = Math.round(random(0, words.length - 1));
        DrawWord(wordIndex);

        //Setup game variables (drawer only)
        Game.currentWordIndex = wordIndex;
        Game.currentWord = words[wordIndex];
        Game.hintCount = 0;
        Game.getHint();

        if (Game.newWordCounter > 0) Game.newWordbtn.show();
        else Game.newWordbtn.hide();

        //Send the other players a hint
        socket.emit('hint', Game.hint);
    },
    calcScore: function() {
        let score = 0;

        //Score gained based on time left
        if (Game.timeLeft > 90) score += 3;
        else if (Game.timeLeft > 60) score += 2;
        else score += 1;
        //Score gained based on word length
        if (Game.currentWord.length > 9) score += 5;
        else if (Game.currentWord.length > 6) score += 3;
        else if (Game.currentWord.length > 3) score += 1;
        else score -= 1;
        //Minimum 1 score
        if (score < 1) score = 1;

        return score;
    },
    reset: function() {
        Game.startTime = 0;
        Game.timeLeft = 0;
        Game.gamebtn.show();
        Game.gameActive = false;
        Game.currentPlayerId = undefined;
        Game.gameInput.value('');
        Game.gameInput.hide();
        Game.players = undefined;
        Game.gameInput.hide();
        Game.currentWord = "";
        Game.newWordbtn.hide();
    },
    //UI
    gamebtn: undefined,
    newWordbtn: undefined,
    gameInput: undefined
};

function preload() {
    let imgCount = 10;  //number of images in 'img/' to load
    for (let i = 0; i < imgCount; ++i) {
        images[i] = loadImage('/img/' + i + '.png');
    }

//TODO: Use drop to let clients upload custom images. https://p5js.org/reference/#/p5.Element/drop
    words = loadStrings('data/words.txt');
    names = loadStrings('data/names.txt');
}

function setup() {
  let canvas = createCanvas(1280, 768);
  canvas.id('drawingCanvasOfHell');
  canvas.parent("drawingcanvasgoeshere")
  background(20);

  //Setup ip input
    let ipInput = createInput(getURL());
    ipInput.position(5, 30);
    ipInput.value();
    ipInput.size(175);

    textSize(18);
    fill(230, 230, 230);
    text("Enter host IP address", ipInput.x, ipInput.y - 5);

    let ipbtn = createButton('Connect to port');
    ipbtn.position(ipInput.x + ipInput.width + 5, ipInput.y);
    ipbtn.mousePressed(function() {
        socket = io.connect(ipInput.value().toString());

        ipInput.hide();
        ipbtn.hide();

        SocketSetup();
    });


    //Setup name input
    let nameInput = createInput("👌");
    nameInput.position(5, 130);
    nameInput.value();
    nameInput.size(20,20);
    nameInput.style('font-size', '20px');
    nameInput.attribute('disabled', '');

    textSize(18);
    fill(230, 230, 230);
    text("Slide your name below", nameInput.x, nameInput.y - 6);

    let namebtn = createButton('👍');
    namebtn.position(nameInput.x + nameInput.width + 5, nameInput.y - 2);
    namebtn.style('font-size', '18px');
    namebtn.size(50, 30);
    namebtn.mousePressed(function() {
        socket.emit('name', nameInput.value());

        nameInput.hide();
        namebtn.hide();
        nameSlider.hide();
    });

    let nameSlider = createSlider(0, 59, 26);
    nameSlider.position(nameInput.x - 10, nameInput.y + 30);
    nameSlider.style('width', '175px');

    let inputElem = new p5.Element(nameSlider.elt);

    inputElem.elt.oninput = function() {
        nameInput.value(names[nameSlider.value()]);
    };

    //Setup clear button
    let clearbtn = createButton('!!!');
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

    //Setup new word button
    Game.newWordbtn = createButton('New word (2)');
    Game.newWordbtn.position(width - 115, height - 60);
    Game.newWordbtn.size(110);
    Game.newWordbtn.mousePressed(function() {
        if (Game.newWordCounter > 0) {
            Game.newWordCounter--;
            Game.newWord();
            Game.newWordbtn.html("New word (" + Game.newWordCounter + ')');
        }
    });
    Game.newWordbtn.hide();

    //Setup game input
    Game.gameInput = createInput();
    Game.gameInput.position(width - 150, height - 60);
    Game.gameInput.size(130);
    Game.gameInput.input(function() {
        let guess = Game.gameInput.value();
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
    PLAYERLISTPOS = createVector(width - 250, height - 100);

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

function DrawWord(wordOrIndex, posX = width / 2, posY = 5, colour = WHITE, rectSize = createVector(275, 30), fontSize = 18) {
    textSize(fontSize);
    if (typeof wordOrIndex === "number") {
        var word = words[wordOrIndex];
        DrawRect(posX - rectSize.x / 2, posY + 5, color(20,20,20), createVector(rectSize.x, rectSize.y));
        fill(WHITE);
        textAlign(CENTER);
        text(word, posX, 5);
    }
    else {
        DrawRect(posX - rectSize.x / 2, posY, color(20,20,20), createVector(rectSize.x, rectSize.y));
        fill(colour);
        textAlign(CENTER);
        text(wordOrIndex, posX, posY + 5);
    }
}

//UI
function DrawPalette() {
    textSize(18);
    //Background for text display
    DrawRect(width - 110, 0, color(20,20,20), createVector(110, 140));

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
    if (Game.gameActive) {
        if (Game.currentWord) DrawWord(Game.currentWord);
        if (Game.timeLeft >= 0) DrawWord(Game.timeLeft.toString(), width - 50, 110, WHITE, createVector(50, 30));
        if (Game.players) Game.drawPlayers();
    }
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
    if (Game.timeLeft > 0) {
        var timePassed = Math.round((millis() - Game.startTime) / 1000);
        Game.timeLeft = Game.roundLength - timePassed;

        if (Game.currentPlayerId !== socket.id) return;

        //Game over
        if (Game.timeLeft <= 0) {
            Game.endRound();
            return;
        }

        //When the tab is not active, the draw loop doesn't happen (at least consistently)
        //so we can't rely on this timer being perfectly accurate

        //Provide hints based on word length
        //Since this is a monstrosity switch if thing basically what it does is
        //how many hints have you given? -> based on that if the timer is past a certain threshold and
        //you have a certain word length send a hint and increment hintCount
        switch (Game.hintCount) {
            case 0:
                if (Game.timeLeft <= 100 && Game.currentWord.length > 9) {
                    ImproveAndSendHint();
                }
                else if (Game.timeLeft <= 90  && Game.currentWord.length > 5) {
                    ImproveAndSendHint();
                }
                else if (Game.timeLeft <= 60  && Game.currentWord.length > 2) {
                    ImproveAndSendHint();
                }
                break;
            case 1:
                if (Game.timeLeft <= 75 && Game.currentWord.length > 9) {
                    ImproveAndSendHint(2);
                }
                else if (Game.timeLeft <= 60  && Game.currentWord.length > 5) {
                    ImproveAndSendHint();
                }
                else if (Game.timeLeft <= 15  && Game.currentWord.length > 2) {
                    ImproveAndSendHint();
                }
                break;
            case 2:
                if (Game.timeLeft <= 50 && Game.currentWord.length > 9) {
                    ImproveAndSendHint();
                }
                else if (Game.timeLeft <= 30  && Game.currentWord.length > 5) {
                    ImproveAndSendHint();
                }
                break;
            case 3:
                if (Game.timeLeft <= 25 && Game.currentWord.length > 9) {
                    ImproveAndSendHint(2);
                }
                break;
        }
    }
}

function ImproveAndSendHint(amount = 1) {
    Game.improveHint(amount);
    socket.emit('hint', Game.hint);
    Game.hintCount++;
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
    //Get the canvas and create a png from its data
    let canvas = document.getElementById("drawingCanvasOfHell");
    let img = canvas.toDataURL("image/png");

    var data = {
        img: img,
        to: from
    };

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
    socket.on('mouse', function (data) {
        DrawDot(data.x, data.y, color(data.r, data.g, data.b), createVector(data.sizeX, data.sizeY));
    });

    socket.on('requestCanvas', function (data) {
        loading = true;
        SendCanvas(data.from);
    });

    socket.on('sendCanvas', function (data) {
        //Create and image from the data
        let img = new Image();
        img.src = data.img;
        //Get the canvas and context
        let canvas = document.getElementById("drawingCanvasOfHell");
        let ctx = canvas.getContext('2d');
        //When the image finishes loading, display it on the canvas
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
            img.style.display = 'none';
        };

        socket.emit('loading', false);
    });

    socket.on('loading', function (data) {
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

    socket.on('clearCanvas', function () {
        ClearCanvas();
    });

    socket.on('image', function (data) {
        DrawImage(data.imgIndex, data.posX, data.posY, createVector(data.imgSizeX, data.imgSizeY));
    });

    socket.on('guess', function (data) {
        //if the game hasn't started or you aren't the current player, return
        if (Game.currentPlayerId !== socket.id || Game.gameActive === false) return;

        let playerGuessPos = Game.playerPos[Game.players.findIndex(x => x.id === data.player)];

        if (Game.guess(data.guess)) {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYGREEN, createVector(180, 30));
            DrawImage(1, width - 30, playerGuessPos.y, createVector(30, 30));

            Game.guessReply(true, data);
        }
        else {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYRED, createVector(180, 30));
            DrawImage(3, width - 30, playerGuessPos.y, createVector(30, 30));

            Game.guessReply(false, data);
        }
    });

    socket.on('guessReply', function (data) {
        let playerGuessPos = Game.playerPos[Game.players.findIndex(x => x.id === data.player)];

        if (data.result) {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYGREEN, createVector(180, 30));
            DrawImage(1, width - 30, playerGuessPos.y, createVector(30, 30));
        }
        else {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYRED, createVector(180, 30));
            DrawImage(3, width - 30, playerGuessPos.y, createVector(30, 30));
        }
    });

    socket.on('startGame', function (data) {
        Game.beginRound(data.currentPlayerId === socket.id, data)
    });

    socket.on('hint', function (data) {
        Game.currentWord = data;
    });

    socket.on('winGame', function (data) {
        for (let i = 0; i < 100; ++i) {
            DrawImage(1, random(0, width), random(0, height), random(5, 120));
        }

        DrawWord(data.winnerName + " is the winner! (" + data.score + " points)",
            width / 2, height / 2,
            DISPLAYGREEN,
            createVector(800, 55), 40);

        //TODO: play a winning sound here for everyone

        Game.reset();
    });
}
//TODO: add alpha and rotation
//TODO: print the last guess made by each user in the draw loop so it cant be drawn over
//TODO: add a rectangle that covers all drawing in the players/guessing area. size needs to match players in the game