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

const getRoomId = (phrase) => {
    const roomHash = crypto.createHash('sha256');
    roomHash.update(phrase);
    return roomHash.digest('hex');
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

const clientFootprints = new Map();
webSocket.on('connection', (socket) => {
    console.log(`Client with socket id ${socket.id} connected \n`);

    socket.on('joinRoom', (phrase) => {
        //create a room when 2 clients are searching for it

        const roomId = getRoomId(phrase);

        console.log(
            `${socket.id} wants to join a room with phrase ${phrase} (roomId: ${roomId}) \n`
        );

        if (!clientFootprints.has(roomId)) {
            //if the client is proposing for the first time a room, create the proposal
            clientFootprints.set(roomId, {
                initiatorSocketId: socket.id,
                numberOfClients: 1,
            });
        } else {
            //if another client is trying to enter in already proposed room, create it and make the clients join into

            const clientFootprint = clientFootprints.get(roomId);

            if (clientFootprint.numberOfClients >= 2) {
                console.log(
                    `Room with phrase ${phrase} (roomId: ${roomId}) is already full \n`
                );
                return;
            }

            console.log(
                `${socket.id} and ${clientFootprint.initiatorSocketId} can join the room with phrase ${phrase} (roomId: ${roomId}) \n`
            );

            clientFootprint.numberOfClients++;
            const roomName = `room_${roomId}`;

            socket.join(roomName);
            webSocket.sockets.sockets
                .get(clientFootprint.initiatorSocketId)
                .join(roomName);

            webSocket.to(roomName).emit('roomCreation');
        }
    });

    socket.on('cancelJoin', (phrase) => {
        //if a client decided to change in room-phrase while waiting for another client to join, the proposed room is deleted
        const roomId = getRoomId(phrase);
        const clientFootprint = clientFootprints.get(roomId);

        if (clientFootprint.initiatorSocketId === socket.id) {
            clientFootprints.delete(roomId);
            console.log(`Deleted room proposed by ${socket.id} \n`);
        }
    });

    socket.on('messageSent', (phrase, msg) => {
        //send a message to the other clients in the room of the sender
        const roomId = getRoomId(phrase);
        socket.to(`room_${roomId}`).emit('messageReceived', msg);
    });

    socket.on('roomLeft', (phrase) => {
        //when a client leaves a room, the other client is notified
        const roomId = getRoomId(phrase);
        const clientFootprint = clientFootprints.get(roomId);

        if (clientFootprint.numberOfClients >= 2) {
            clientFootprint.numberOfClients--;
            socket.to(`room_${roomId}`).emit('roomLeft');
            console.log(
                `${socket.id} left the room with phrase ${phrase} (roomId: ${roomId}) \n`
            );
        } else {
            clientFootprints.delete(roomId);
            console.log(`Deleted room proposed with phrase ${phrase} \n`);
        }
    });

    socket.on('disconnect', (phrase) => {
        //when a client disconnects, the other client is notified
        console.log(`${socket.id} disconnected \n`);
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

module.exports = app;
