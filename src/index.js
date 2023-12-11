require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const io = require('socket.io');

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

webSocket.on('connection', (socket) => {
    console.log('Connected');

    socket.on('joinMsg', (roomId) => {
        console.log('A user wants to join in room ' + roomId);
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

module.exports = app;
