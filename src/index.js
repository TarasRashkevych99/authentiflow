require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const io = require('socket.io');
const crypto = require('crypto');

const clientAuthMiddleware = () => (req, res, next) => {
    if (!req.client.authorized) {
        return res
            .status(401)
            .send('Invalid client certificate authentication.');
    }
    return next();
};

let app = express();

app.use(express.static('src/authentiflow-webapp/dist'));
// app.use(clientAuthMiddleware());

const options = {
    key: fs.readFileSync(
        path.join(__dirname, '../cert/keys/server/server_key.pem')
    ),
    cert: fs.readFileSync(
        path.join(__dirname, '../cert/keys/server/server_crt.pem')
    ),
    requestCert: true,
    rejectUnauthorized: false,
    ca: [fs.readFileSync(path.join(__dirname, '../cert/keys/ca_crt.pem'))],
};

app = https.createServer(options, app);
const webSocket = io(app);

const port = 3000 || process.env.PORT;

var roomPhraseToUser = {};
webSocket.on('connection', (socket) => {
    console.log(`${socket.id} connected \n`);

    socket.on('joinMsg', (roomPhrase) => {
        //create a room when 2 clients are searching for it

        if (roomPhrase.length <= 10) return;

        const roomHash = crypto.createHash('sha256');
        roomHash.update(roomPhrase);
        const roomDigest = roomHash.digest('hex');
        console.log(
            `${socket.id} wants to join in room with phrase ${roomPhrase} (digest: ${roomDigest}) \n`
        );

        if (!roomPhraseToUser[roomDigest]) {
            //if the client is proposing for the first time a room, create the proposal
            roomPhraseToUser[roomDigest] = socket.id;
        } else {
            //if another client is trying to enter in already proposed room, create it and make the clients join into
            console.log(
                `${socket.id} and ${roomPhraseToUser[roomDigest]} can join in room with phrase ${roomPhrase} (digest: ${roomDigest}) \n`
            );

            const room = 'room_' + roomDigest;

            socket.join(room);
            webSocket.sockets.sockets
                .get(roomPhraseToUser[roomDigest])
                .join(room);

            webSocket.to(room).emit('confirmJoin', room);
            delete roomPhraseToUser[roomDigest];
        }
    });

    socket.on('cancelJoinMsg', (roomPhrase) => {
        //if a client decided to change in room-phrase while waiting for another client to join, the proposed room is deleted
        const roomHash = crypto.createHash('sha256');
        roomHash.update(roomPhrase);
        const roomDigest = roomHash.digest('hex');

        if (roomPhraseToUser[roomDigest] == socket.id) {
            delete roomPhraseToUser[roomDigest];
            console.log(`Deleted room proposed by ${socket.id} \n`);
        }
    });

    socket.on('sendMsg', (msg) => {
        //send a message to the other clients in the room of the sender
        const joinedRooms = Array.from(socket.rooms);

        socket.to(joinedRooms).emit('receiveMsg', msg);
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

module.exports = app;
