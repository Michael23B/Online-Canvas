//Setup server with express
var express = require('express');
var app = express();
var server = app.listen(3000);

var socket = require('socket.io');
var io = socket(server);

app.use(express.static('public'));

var connectedUsers = [];
var gamePlayers = [];
var playerId = 0;
var scoreGoal = 10;

console.log("Listening on port 3000. Please port forward if you wish to connect over the internet.\n")

io.sockets.on('connection', function(socket) {
    //On connect, add the current connection to client list
    connectedUsers.push({id: socket.id, name: "👌", score: 0});

    //Log user array and connections length
    console.log("New user connected!\nUsers connected: " + Object.keys(io.sockets.connected).length);
    console.log("Users:");
    console.log(connectedUsers);
    console.log('');

    //Request canvas for the new client
    //TEMPORARY DISABLE BECAUSE ITS MEGA SLOW
    if (connectedUsers.length > 1) {
        socket.to(connectedUsers[0].id).emit('requestCanvas', { from: socket.id });
        io.emit('loading', true);
    }
    else {
        io.emit('loading', false);
    }

    //On user disconnect, remove them from the client list
    socket.on('disconnect', function () {
        connectedUsers.splice(connectedUsers.findIndex(x => x.id === socket.id), 1);

        //if the disconnected player is in the gamePlayers
        let playerInGame = gamePlayers.findIndex(x => x.id === socket.id);
        if (playerInGame !== -1) {
            gamePlayers.splice(playerInGame, 1);

            //if the current player (drawer) disconnected go to the next player
            if (socket.id === playerId) {
                nextPlayer();
            }
        }

        console.log("User disconnected!");
        console.log("Users:");
        console.log(connectedUsers);
        console.log('');
    });

    //On 'name', change players name
    socket.on('name', function(data) {
        connectedUsers[connectedUsers.findIndex(x => x.id === socket.id)].name = data;

        let userInGameIndex = gamePlayers.findIndex(x => x.id === socket.id);
        if (userInGameIndex !== -1) gamePlayers[userInGameIndex].name = data;
    });

    //On 'mouse' message, broadcast data to everyone but the sender
    socket.on('mouse', function(data) {
        socket.broadcast.emit('mouse', data);
    });

    //On 'image' -> everyone but sender
    socket.on('image', function(data) {
        socket.broadcast.emit('image', data);
    });

    //On 'clearCanvas' -> everyone but sender
    socket.on('clearCanvas', function() {
        socket.broadcast.emit('clearCanvas');
    });

    //On 'sendCanvas', send the canvas to the new client
    socket.on('sendCanvas', function(data) {
        socket.to(data.to).emit('sendCanvas', data);
    });

    socket.on('loading', function(data) {
        io.emit('loading', data);
    });

    //Drawing game functions

    //TODO: store words.txt on server instead of locally and send the word/index to the currently drawing player
    //On 'startGame' -> everyone
    socket.on('startGame', function() {
        if (gamePlayers.length > 0) return;//if joining game wait until next round

        gamePlayers = connectedUsers.slice(0);

        playerId = socket.id;
        //playerId = gamePlayers.findIndex(x => x === socket.id);
        let data = {
            players: gamePlayers,
            currentPlayerId: playerId
        };

        io.emit('startGame', data);
    });

    //On 'guess' -> player who is currently drawing
    socket.on('guess', function(data) {
        socket.to(gamePlayers[gamePlayers.findIndex(x => x.id === playerId)].id).emit('guess', data);
    });

    //On 'guessReply' -> everyone but sender
    socket.on('guessReply', function(data) {
        //Correct guess, assign points
        if (data.result) {
            connectedUsers[connectedUsers.findIndex(x => x.id === data.player)].score += data.score;
            //Half score goes to the drawer
            connectedUsers[connectedUsers.findIndex(x => x.id === playerId)].score += Math.round(data.score / 2);
        }

        socket.broadcast.emit('guessReply', data);
    });

    //On 'hint' -> everyone but sender
    socket.on('hint', function(data) {
        socket.broadcast.emit('hint', data);
    });

    //On 'nextPlayer' -> everyone
    socket.on('nextPlayer', function() {
        nextPlayer();
    });

    function nextPlayer() {
        if (gamePlayers.length === 0) return;

        if (checkForWinner()) return;

        gamePlayers = connectedUsers.slice(0);
        let currPlayerIndex = gamePlayers.findIndex(x => x.id === socket.id);
        currPlayerIndex++;
        currPlayerIndex %= gamePlayers.length;
        playerId = gamePlayers[currPlayerIndex].id;

        let data = {
            players: gamePlayers,
            currentPlayerId: playerId
        };

        io.emit('startGame', data);
    }

    function checkForWinner() {
        let winners = [];

        //Check for any players with a score higher than the goal
        for (let i = 0; i < connectedUsers.length;  ++i) {
            if (connectedUsers[i].score > scoreGoal) {
                winners.push(connectedUsers[i]);
            }
        }

        if (winners.length > 0) {
            //Since the guesser and the drawer gain score at the same time, they could both reach the goal at the same time
            if (winners.length > 1) {
                //Sort highest to lowest score
                winners.sort(function(x,y) { return x.score < y.score });

                //Highest score wins but if they are the same guesser should win
                if (winners[0].score === winners[1].score) {
                    //Equal score, if [0] is drawer, remove them otherwise [1] is the drawer
                    if (winners[0].id === playerId) winners.splice(0,1);
                }
            }

            let data = {
                winnerName: winners[0].name,
                score: winners[0].score
            };

            winGame(data);
            return true;
        }

        return false;
    }

    function winGame(data) {
        io.emit('winGame', data);

        //Reset scores
        for (let i = 0; i < connectedUsers.length;  ++i) {
            connectedUsers[i].score = 0;
        }
        gamePlayers = [];
        playerId = 0;
    }
});
