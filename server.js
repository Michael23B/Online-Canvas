//Setup server with express
var express = require('express');
var app = express();
var server = app.listen(3000);

var socket = require('socket.io');
var io = socket(server);
var connectedUsers = [];

app.use(express.static('public'));

console.log("Listening on port 3000. Please port forward if you wish to connect over the internet.")

io.sockets.on('connection', function(socket) {
    //On connect, add the current connection to client list
    connectedUsers.push(socket.id);

    //Log user array and connections length
    console.log(connectedUsers);
    console.log(Object.keys(io.sockets.connected).length);

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

    //On 'sendCanvas', send the canvas to the new client
    socket.on('sendCanvas', function(data) {
        socket.to(data.to).emit('sendCanvas', data.canvas);
        console.log("sendCanvas to:" + data.to);
    });

    socket.on('requestCanvas', function(data) {
        console.log("Got a request over here");
        if (connectedUsers.length > 1) {
            socket.to(connectedUsers[0]).emit('requestCanvas', { from: data.from });
            console.log("Request from " + data.from + ". To " + connectedUsers[0]);
        }
        else {
            io.emit('loading', false);
        }
    });

    socket.on('loading', function(data) {
        io.emit('loading', data);
    });
});

//TODO: change loading bool into an int that increases and decreases so if more than one client joins, the loading isn't stopped early.
//TODO: add a timeout/disconnect event to the loading so that if someone drops while loading it doesnt break all clients