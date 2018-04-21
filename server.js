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
    console.log(connectedUsers);

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
        socket.emit('sendCanvas', { to: data.to });
        console.log("sendCanvas to:" + data.to);
    });

    socket.on('requestCanvas', function() {
        if (connectedUsers > 1) {
            socket.emit('requestCanvas', { from: socket.id, to:connectedUsers[0] });
            console.log(socket.id);
        }
    });
});