require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const clientAuthMiddleware = () => (req, res, next) => {
    if (!req.client.authorized) {
        return res
            .status(401)
            .send('Invalid client certificate authentication.');
    }
    return next();
};

let app = express();

app.use('/', express.static('public/dist'));
// app.use(clientAuthMiddleware());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const options = {
    key: fs.readFileSync(
        path.join(__dirname, '../cert/keys/server/server_key.pem')
    ),
    cert: fs.readFileSync(
        path.join(__dirname, '../cert/keys/server/server_crt.pem')
    ),
    requestCert: true,
    rejectUnauthorized: true,
    ca: [fs.readFileSync(path.join(__dirname, '../cert/keys/ca_crt.pem'))],
};

// app = https.createServer(options, app);

const port = 3000 || process.env.PORT;

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

module.exports = app;
