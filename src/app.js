const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

let app = express();

// if (process.env.HTTPS === 'true') {
const options = {
    key: fs.readFileSync(path.join(__dirname, '../cert/keys/host.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../cert/keys/host_crt.pem')),
    requestCert: true,
    rejectUnauthorized: false,
    ca: [fs.readFileSync(path.join(__dirname, '../cert/keys/ca_crt.pem'))],
};

app = https.createServer(options, app);
// }

const port = 3000 || process.env.PORT;

app.start = () => {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
};

module.exports = app;
