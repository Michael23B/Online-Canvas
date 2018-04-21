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
        //socket.emit('sendCanvas', { canvas: data.canvas, to: data.to });
        socket.to(data.to).emit('sendCanvas', { canvas: data.canvas });
        console.log("sendCanvas to:" + data.to);
    });

    socket.on('requestCanvas', function(data) {
        console.log("Got a request over here");
        if (connectedUsers.length > 1) {
            //socket.emit('requestCanvas', { from: data.from, to:connectedUsers[0] });
            socket.to(connectedUsers[0]).emit('requestCanvas', { from: data.from });
            console.log("Request from " + data.from + ". To " + connectedUsers[0]);
        }
    });
});