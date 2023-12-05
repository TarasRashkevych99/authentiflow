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

io.on('connection', (socket) => {
    console.log('A user connected');

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
