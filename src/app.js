const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
// const addMiddlewares = require("./middlewares/middlewares");
// const addRoutes = require("./routes/routes");

let app = express();
// addMiddlewares(app);
// addRoutes(app);

//used for test wss... in console : const socket = io('wss://localhost:3000'); socket.emit('message', 'Ciao')
app.get('/', (req, res) => {
    let response = `
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js" integrity="sha384-mZLF4UVrpi/QTWPA7BjNPEnkIfRFn4ZEO3Qt/HFklTJBj/gBOV8G3HcKn4NfQblz" crossorigin="anonymous"></script>
    `;
    res.status(200).send(response);
});

// if (process.env.HTTPS === 'true') {
const options = {
    key: fs.readFileSync(path.join(__dirname, '../cert/host.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../cert/hostcrt.pem')),
    //requestCert: true,
    //rejectUnauthorized: false,
    ca: [fs.readFileSync(path.join(__dirname, '../cert/cacrt.pem'))],
};

app = https.createServer(options, app);
const io = require('socket.io')(app, {
    cors: { origin: '*' },
});
// }

const port = 3000 || process.env.PORT;

let users_connected = [];
io.on('connection', (socket) => {
    n_users = io.engine.clientsCount;
    id_last_client = socket.id;
    users_connected.push(id_last_client);

    switch (n_users) {
        case 1:
            //io.to(id_last_client).emit
            console.log(
                id_last_client +
                    ': You are the first and only client, you need to generate a key for a currently unknown one'
            );
            break;
        case 2:
            console.log(
                id_last_client +
                    ': You are the second client, you need to receive a key from ' +
                    users_connected[0]
            );
            break;
        default:
            console.log(
                id_last_client + ': Sorry, there are already two users'
            );
            break;
    }

    socket.on('disconnect', () => {
        id_disconnected_client = socket.id;

        var index = users_connected.indexOf(id_disconnected_client);

        if (index !== -1) {
            users_connected.splice(index, 1);

            if (index > 1) {
                //only the first 2 user in the array are involved
                console.log(
                    'A client not involved in the chat just disconnected'
                );
            } else {
                if (users_connected.length > 1) {
                    //so, it's still possible establish immediately a communiction
                    console.log(
                        users_connected[0] +
                            ': must to generate a key to use with ' +
                            users_connected[1]
                    );
                    console.log(
                        users_connected[1] +
                            ': must to wait a key from ' +
                            users_connected[0]
                    );
                } else {
                    console.log(
                        users_connected[0] +
                            ': You are the first and only client, you need to generate a key for a currently unknown one'
                    );
                }
            }
        }
    });

    socket.on('message', (message) => {
        console.log(message);
    });
});

app.start = () => {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
};

module.exports = app;
