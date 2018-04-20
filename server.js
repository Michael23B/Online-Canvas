//Setup server with express
var express = require('express');
var app = express();
var server = app.listen(3000);

var socket = require('socket.io');
var io = socket(server);

app.use(express.static('public'));

console.log("Listening on port 3000. Please port forward if you wish to connect over the internet.")

io.sockets.on('connection', function(socket) {
    console.log('New connection: ' + socket.id);

    //On 'mouse' message, broadcast data to everyone but the sender
    socket.on('mouse', function(data) {
        socket.broadcast.emit('mouse', data);
    })
});