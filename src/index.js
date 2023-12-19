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
const socketIdToCN = {};

webSocket.on('connection', (socket) => {
    console.log(`Client with socket id ${socket.id} connected \n`);
    const clientCert = socket.request.connection.getPeerCertificate();

    if (clientCert && Object.keys(clientCert).length > 0) {
        const commonName = clientCert.subject.CN;
        socketIdToCN[socket.id] = commonName;
        console.log(`Mapped socket.id ${socket.id} to CN ${commonName}`);
    } else {
        socketIdToCN[socket.id] = 'Unknown';
    }

    socket.on('joinRoom', (phrase) => {
        //create a room when 2 clients are searching for it

        const roomId = getRoomId(phrase);

        console.log(
            `${socket.id} wants to join a room with phrase ${phrase} (roomId: ${roomId}) \n`
        );

        if (!clientFootprints.has(roomId)) {
            //if the client is proposing for the first time a room, create the proposal
            clientFootprints.set(roomId, {
                initiatorSocketId: socket.id, //the client proposing the room
                joiningSocketId: null, //the second client joining into the room, at the moment unknown
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

            clientFootprint.joiningSocketId = socket.id;
            clientFootprint.numberOfClients++;

            const roomName = `room_${roomId}`;

            //Join the clients in the room and let them aware about this
            socket.join(roomName);
            webSocket.sockets.sockets
                .get(clientFootprint.initiatorSocketId)
                .join(roomName);

            webSocket.sockets.sockets
                .get(clientFootprint.joiningSocketId)
                .join(roomName);

            webSocket
                .to(clientFootprint.initiatorSocketId)
                .emit(
                    'roomCreation',
                    true,
                    socketIdToCN[clientFootprint.joiningSocketId]
                ); //in emit is sent isInitiator, CN of other client
            webSocket
                .to(clientFootprint.joiningSocketId)
                .emit(
                    'roomCreation',
                    false,
                    socketIdToCN[clientFootprint.initiatorSocketId]
                );
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

    socket.on('publicKeysSent', (phrase, exportedPublicKeys) => {
        //share the public key to the other clients in the room
        const roomId = getRoomId(phrase);
        socket
            .to(`room_${roomId}`)
            .emit('publicKeysReceived', exportedPublicKeys);
    });

    socket.on('secretSent', (phrase, secret) => {
        //share the key to the other clients in the room
        const roomId = getRoomId(phrase);
        //console.log(secret);
        socket.to(`room_${roomId}`).emit('secretReceived', secret);
    });

    socket.on('handshakeFinished', (phrase) => {
        //notify the other clients in the room that the handshake is finished
        const roomId = getRoomId(phrase);
        socket.to(`room_${roomId}`).emit('handshakeFinished');
    });

    socket.on('messageSent', (phrase, msg, iv) => {
        //send a message to the other clients in the room of the sender
        console.log(`Message receveid from ${socket.id} is ${msg} \n`);
        const roomId = getRoomId(phrase);
        socket.to(`room_${roomId}`).emit('messageReceived', msg, iv);
    });

    socket.on('roomLeft', (phrase) => {
        //when a client leaves a room, the other client is notified
        const roomId = getRoomId(phrase);
        const clientFootprint = clientFootprints.get(roomId);
        socket.leave(`room_${roomId}`);

        if (clientFootprint.numberOfClients >= 2) {
            if (socket.id == clientFootprint.initiatorSocketId) {
                //if the initializator was leaving, make the other client the new initializator aka leader
                clientFootprint.initiatorSocketId =
                    clientFootprint.joiningSocketId;
                clientFootprint.joiningSocketId = null;
            }
            if (socket.id == clientFootprint.joiningSocketId) {
                clientFootprint.joiningSocketId = null;
            }

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
        delete socketIdToCN[socket.id];
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

module.exports = app;
