let socket = io;

//keep track of our colour
let r = 150, g = 150, b = 150, prevColour;
//drawing variables
let drawSize, prevMousePos;
//predefine constants
let BLACK, WHITE, RED, GREEN, BLUE, DISPLAYRED, DISPLAYGREEN, DISPLAYBLUE, DEFAULTSIZE, PLAYERLISTPOS;
//image array
let images = [];
//names array
let names = [];
//is a client joining?
let loading = true;
//currently pressed keys
let keys = [];
//shift key down
let shiftDown = false;
//a key down
let eraserActive = false;
//has won a game
let tintUnlocked = false;
//word guessing game object
let Game = {
    //Variables
    currentWordIndex: 0,
    currentWord: "",
    words: [],
    hint: "",
    newWordCounter: 0,
    currentPlayerId: 0,
    players: [],
    //playerPos array maps the position of the player at the same index in Game.players
    playerPos: [],
    gameActive: false,
    startTime: 0,
    roundLength: 90,
    timeLeft: 0,
    hintCount: 0,
    winSong: undefined,
    correctSound: undefined,
    volume: 1,
    //Functions
    guess: function (word) {
        return word === this.currentWord;
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
        this.words = [];
        if (drawer) {
            this.gameInput.hide();
            this.newWordCounter = 2;
            this.newWordbtn.html("New word (" + this.newWordCounter + ')');

            this.words.push(data.word1);
            this.words.push(data.word2);
            this.words.push(data.word3);

            this.currentWordIndex = -1;
            this.newWord();
        }
        else {
            this.gameInput.show();
            this.currentWord = "";
            this.newWordbtn.hide();
        }

        //Setup game variables (all players)
        this.startTime = millis();
        this.timeLeft = this.roundLength;
        this.gamebtn.hide();
        this.gameActive = true;
        this.currentPlayerId = data.currentPlayerId;
        this.gameInput.value('');
        this.players = data.players;
        this.hintCount = 0;

        this.drawPlayers();
    },
    endRound: function() {
        this.currentPlayerId = null; //This round if finished, don't accept any more guesses
        this.currentWordIndex = null;
        this.currentWord = "";
        this.hint = "";
        this.newWordbtn.hide();
        this.words = [];
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
            if (Game.currentWord[i] === ' ') Game.hint += "  "; //two spaces
            else Game.hint += "_ ";
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
        //Setup game variables (drawer only)
        this.currentWordIndex++;
        this.currentWord = this.words[this.currentWordIndex];
        this.hintCount = 0;
        this.getHint();

        if (Game.newWordCounter > 0) Game.newWordbtn.show();
        else Game.newWordbtn.hide();

        //Send the other players a hint
        socket.emit('hint', Game.hint);
    },
    calcScore: function() {
        let score = 0;

        //Score gained based on time left
        if (Game.timeLeft > 75) score += 3;
        else if (Game.timeLeft > 45) score += 2;
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
    let imgCount = 20;  //number of images in 'img/' to load
    for (let i = 0; i < imgCount; ++i) {
        images[i] = loadImage('/img/' + i + '.png');
    }

    names = loadStrings('data/names.txt');
}

function setup() {
  //We can load these asynchronously
  Game.winSong = loadSound('sound/winSong.mp3');
  Game.correctSound = loadSound('sound/correct.mp3');

  //Create canvas
  let canvas = createCanvas(1280, 768);
  canvas.id('drawingCanvasOfHell');
  canvas.parent("drawingcanvasgoeshere");
  //TODO: the dropping is inconsistent. Sometimes it takes two drops before an image is drawn.
  //Alternative might be to get the src of the img element and draw/send that every time a button is pressed
  /*
  canvas.drop(function(file) {
      if (file.type !== "image") return;
      let img = createImg(file.data).hide();
      image(img,width/2,height/2);
      //some emit with the img file
  });
  */
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
        if (!socket.emit) {
            fill(230, 100, 100, 100);
            text("Connect first!", 12.5, 85);
            return;
        }
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

    //Setup mute button
    let mutebtn = createButton("🔊 :>");
    mutebtn.position(width - 240, height - 30);
    mutebtn.size(75);
    mutebtn.mousePressed(function() {
        if (Game.volume) {
            Game.volume = 0;
            Game.winSong.setVolume(Game.volume);
            Game.correctSound.setVolume(Game.volume);
            mutebtn.html("🔊 :<");
        }
        else {
            Game.volume = 1;
            Game.winSong.setVolume(Game.volume);
            Game.correctSound.setVolume(Game.volume);
            mutebtn.html("🔊 :>");
        }
    });


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
    prevMousePos = createVector(null, null);
}

function draw() {
  if (loading) return;

  CheckTimer();
  CheckInput();
  DrawPalette();

  if (mouseIsPressed) {
      DrawLine();
      SendMouseInfo();
      //Brighten colour while painting
      ApproachColour(WHITE, random(0, 0.5));
      prevMousePos = createVector(mouseX, mouseY);
  }
  else {
      prevMousePos = createVector(null, null);
      ApproachColour(BLACK, random(0, 2), true);
  }
}

//Canvas
//Drawing
function DrawDot(x = mouseX, y = mouseY, dotColour = color(r,g,b), dotSize = drawSize) {
    noStroke();
    fill(dotColour);
    ellipse(x, y , dotSize.x, dotSize.y);
}

function DrawLine(x = mouseX, y = mouseY, prevX = prevMousePos.x, prevY = prevMousePos.y, dotColour = color(r,g,b), lineWeight = drawSize.x) {
    if (!prevX) prevX = x;
    if (!prevY) prevY = y;

    stroke(dotColour);
    strokeWeight(lineWeight);
    line(x, y, prevX, prevY);
}

function DrawRect(x = mouseX, y = mouseY, dotColour = color(r,g,b), rectSize = drawSize) {
    noStroke();
    fill(dotColour);
    rect(x, y , rectSize.x, rectSize.y);
}

function DrawImage(imageIndex, x = mouseX, y = mouseY, imageSize = drawSize, imageTint = WHITE) {
    //double draw size for images
    tint(imageTint);
    image(images[imageIndex], x, y, imageSize.x * 2, imageSize.y * 2);
}

function DrawWord(wordOrIndex, posX = width / 2, posY = 5, colour = WHITE, rectSize = createVector(275, 30), fontSize = 18) {
    textSize(fontSize);
    if (typeof wordOrIndex === "number") {
        let word = Game.words[wordOrIndex];
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
    DrawRect(width - 110, 0, color(20,20,20), createVector(110, 130));

    //Draw current size info
    noStroke();
    textAlign(RIGHT, RIGHT);
    fill(WHITE);
    let drawSizeDisplay = 'Size: ' + Math.round(drawSize.x); //for now we just use one size for both width and height
    text(drawSizeDisplay, width - 5, 10);

    //Draw current colour info
    fill(DISPLAYRED);
    text(Math.round(r), width - 70, 35);
    fill(DISPLAYGREEN);
    text(Math.round(g), width - 37.5, 35);
    fill(DISPLAYBLUE);
    text(Math.round(b), width - 5, 35);

    //Draw current colour
    DrawDot(width - 45, 75, color(r,g,b), createVector(30,30));

    //Draw current game word
    if (Game.gameActive) {
        if (Game.currentWord) DrawWord(Game.currentWord);
        if (Game.timeLeft >= 0) DrawWord(Game.timeLeft.toString(), width - 50, 100, WHITE, createVector(50, 30));
        if (Game.players) Game.drawPlayers();
    }
}

//Controls
//Approach colour by amount each frame
function ApproachColour(colour, amount = random(0, 4), darken = false) {
    if (eraserActive) {
        r = 20;
        g = 20;
        b = 20;
        return;
    }

    let newR = colour.levels[0];
    let newG = colour.levels[1];
    let newB = colour.levels[2];

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
        let timePassed = Math.round((millis() - Game.startTime) / 1000);
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
                if (Game.timeLeft <= 75 && Game.currentWord.length > 9) {
                    ImproveAndSendHint();
                }
                else if (Game.timeLeft <= 60  && Game.currentWord.length > 6) {
                    ImproveAndSendHint();
                }
                else if (Game.timeLeft <= 45  && Game.currentWord.length > 3) {
                    ImproveAndSendHint();
                }
                break;
            case 1:
                if (Game.timeLeft <= 50 && Game.currentWord.length > 9) {
                    ImproveAndSendHint(2);
                }
                else if (Game.timeLeft <= 30  && Game.currentWord.length > 6) {
                    ImproveAndSendHint();
                }
                break;
            case 2:
                if (Game.timeLeft <= 25 && Game.currentWord.length > 9) {
                    ImproveAndSendHint();
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
    shiftDown = keys.includes(16);

    let eraserActiveState = keys.includes(65);
    if (eraserActive !== eraserActiveState) {
        //If we are switching into eraser active -> remember the colour we were using
        if (eraserActive === false) prevColour = color(r,g,b);
        //Once we are out of eraser mode -> switch back to the previous colour
        else {
            r = prevColour.levels[0];
            g = prevColour.levels[1];
            b = prevColour.levels[2];
        }
        eraserActive = eraserActiveState;
    }

    for (let i = 0; i < keys.length; ++i) {
        DoWork(keys[i]);
    }
}

function DoWork(key) {
    //image keys
    if (key >= 48 && key <= 57) {
        //Reduce by 48 to get 0 - 9. If shift is down, we want index 10 - 19 instead
        let index = shiftDown ? Number(key - 38) : Number(key - 48);
        PlaceImageByIndex(index);
        return;
    }
    //control drawing keys
    switch (key) {
        case 81://q
            ApproachColour(RED);
            break;
        case 87://w
            ApproachColour(GREEN);
            break;
        case 69://e
            ApproachColour(BLUE);
            break;
        case 68://d
            ControlSize();
            break;
        case 83://s
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
    if (tintUnlocked) {
        DrawImage(i, mouseX, mouseY, drawSize, color(r,g,b));
        SendImage(i, r, g, b);
    }
    else {
        DrawImage(i);
        SendImage(i);
    }
}

//keep track of all keys being held down
function keyPressed() {
    if (!keys.includes(keyCode)) keys.push(keyCode);
}

function keyReleased(e) {
    let keyIndex = keys.findIndex(x => x === e.keyCode);
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
    let data = {
        x: mouseX,
        y: mouseY,
        prevX: prevMousePos.x,
        prevY: prevMousePos.y,
        r: r,
        g: g,
        b: b,
        sizeX: drawSize.x
        //sizeY: drawSize.y
    };

    socket.emit('mouse', data);
}

function SendImage(index, tintR = 255, tintG = 255, tintB = 255) {
    let data = {
        imgIndex: index,
        posX: mouseX,
        posY: mouseY,
        imgSizeX: drawSize.x,
        imgSizeY: drawSize.y
    };

    if (tintR !== 255 || tintG !== 255 || tintB !== 255) {
        data.tintR = tintR;
        data.tintG = tintG;
        data.tintB = tintB;
    }

    socket.emit('image', data);
}

//When a new client joins, host will send his canvas pixel information
function SendCanvas(from) {
    //Get the canvas and create a png from its data
    let canvas = document.getElementById("drawingCanvasOfHell");
    let img = canvas.toDataURL("image/png");

    let data = {
        img: img,
        to: from
    };

    socket.emit('sendCanvas', data);
}

//Guessing game
function SendGuess(guess) {
    let data = {
        guess: guess,
        player: socket.id
    };

    socket.emit('guess', data);
}

function SocketSetup() {
    //Receive
    socket.on('mouse', function (data) {
        DrawLine(data.x, data.y,data.prevX, data.prevY, color(data.r, data.g, data.b), data.sizeX);
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
        if (data.hasOwnProperty("tintR")) {
            DrawImage(data.imgIndex, data.posX, data.posY, createVector(data.imgSizeX, data.imgSizeY),
                color(data.tintR, data.tintG, data.tintB));
            return;
        }
        DrawImage(data.imgIndex, data.posX, data.posY, createVector(data.imgSizeX, data.imgSizeY));
    });

    socket.on('guess', function (data) {
        //if the game hasn't started or you aren't the current player, return
        if (Game.currentPlayerId !== socket.id || Game.gameActive === false) return;

        let playerGuessPos = Game.playerPos[Game.players.findIndex(x => x.id === data.player)];

        if (Game.guess(data.guess)) {
            DrawWord(data.guess, width - 100, playerGuessPos.y, DISPLAYGREEN, createVector(180, 30));
            DrawImage(1, width - 30, playerGuessPos.y, createVector(30, 30));
            Game.correctSound.play();

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
            Game.correctSound.play();
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
        DrawImage(0,width / 2, height / 2, createVector(400,400), color(215,255,215,45));
        for (let i = 0; i < 100; ++i) {
            DrawImage(1, random(0, width), random(0, height),
                createVector(random(15, 100),random(15, 100)),
                color(255,255,255,random(10,255)));
        }

        DrawWord(data.winnerName + " is the winner! (" + data.score + " points)",
            width / 2, height / 2,
            DISPLAYGREEN,
            createVector(800, 55), 40);

        Game.winSong.play();

        if (socket.id === data.winnerId) {
            tintUnlocked = true;
            DrawWord("Tinted emotes unlocked!",width / 2, (height / 2) + 50,
                DISPLAYGREEN,
                createVector(800, 55), 25);
        }

        Game.reset();
    });
}
//TODO: print the last guess made by each user in the draw loop so it cant be drawn over
//TODO: add a rectangle that covers all drawing in the players/guessing area. size needs to match players in the game
//TODO: if you start a game solo or everyone but you disconnects, cancel the game
//TODO: don't draw when you click a button
//TODO: add an offline mode. Just disable all the socket methods.
//TODO: make variables private when done testing
//TODO: when a player joins and the host is drawing, the player gets sent the canvas which includes the current word.