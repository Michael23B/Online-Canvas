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

console.log("Listening on port 3000. Please port forward if you wish to connect over the internet.\n")

io.sockets.on('connection', function(socket) {
    //On connect, add the current connection to client list
    connectedUsers.push(socket.id);

    //Log user array and connections length
    console.log("New user connected!\nUsers connected: " + Object.keys(io.sockets.connected).length);
    console.log("Users:");
    console.log(connectedUsers);
    console.log('');

    //Request canvas for the new client
    if (connectedUsers.length > 1) {
        socket.to(connectedUsers[0]).emit('requestCanvas', { from: socket.id });
        console.log("Request from " + socket.id + ". To " + connectedUsers[0]);
        io.emit('loading', true);
    }
    else {
        io.emit('loading', false);
    }

    //On user disconnect, remove them from the client list
    socket.on('disconnect', function () {
        connectedUsers.splice(connectedUsers.indexOf(socket.id), 1);
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
        socket.to(data.to).emit('sendCanvas', data.canvas);
        console.log("sendCanvas to:" + data.to);
    });

    socket.on('requestCanvas', function(data) {
        console.log("Got a request over here");
        if (connectedUsers.length > 1) {
            socket.to(connectedUsers[0]).emit('requestCanvas', { from: data.from });
            console.log("Canvas request from " + data.from + ". To " + connectedUsers[0]);
        }
        else {
            io.emit('loading', false);
        }
    });

    socket.on('loading', function(data) {
        io.emit('loading', data);
    });

    //Drawing game functions

    //On 'startGame' -> everyone
    socket.on('startGame', function() {
        gamePlayers = connectedUsers;
        //playerId = gamePlayers.findIndex(x => x === socket.id);
        playerId = socket.id;
        var data = {
            players: gamePlayers,
            currentPlayerId: playerId
        };

        io.emit('startGame', data);
    });

    //On 'guess' -> player who is currently drawing
    socket.on('guess', function(data) {
        socket.to(gamePlayers[gamePlayers.findIndex(x => x === playerId)]).emit('guess', data);
    });

    //On 'guessReply' -> everyone but sender
    socket.on('guessReply', function(data) {
        socket.broadcast.emit('guessReply', data);
    });

    //On 'nextPlayer' -> everyone
    socket.on('nextPlayer', function() {

        var currPlayerIndex = gamePlayers.findIndex(x => x === socket.id);
        currPlayerIndex++;
        currPlayerIndex %= gamePlayers.length;
        playerId = gamePlayers[currPlayerIndex];

        var data = {
            currentPlayerId: playerId
        };
        io.emit('startGame', data);
    });
});

//TODO: change loading bool into an int that increases and decreases so if more than one client joins, the loading isn't stopped early.
//TODO: add a timeout/disconnect event to the loading so that if someone drops while loading it doesn't break all clients