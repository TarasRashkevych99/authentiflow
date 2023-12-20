# AuthentiFlow

Fully authenticated web chat application

## Mutual Authentication

The application uses mutual authentication to ensure that the server and client are who they say they are. The main assumption is that all the certificates used in the communication between the server and the clients have been signed and distributed in a sicure way through the PKI.
In reality, all the certificates are self-signed and generated on the machine hosting the server. The certificates are then distributed manually to the clients and are imported in their browsers as trusted certificates.

### Certificate and Key Generation

By analyzing the available options provided by the OpenSSL library it has been decided to prefer elliptic curve cryptography over RSA. The main reason is that the former is more secure nowadays then the latter and it is also more efficient in terms of data storage. The particular ellipic curve that has been used is the secp384r1 curve, which is one with a high security level according to NIST.
The following is the command used to generate the keys for the CA, the server and the clients:

```sh
openssl ecparam -genkey -name secp384r1 -out <key_name>.key
```

Once the CA key has been generated, the CA self-signed certificate can be generated as well by running the following command:

```sh
openssl req -x509 -new -sha512 -nodes -config ca.conf -days 3650 -key ca.key -out ca_crt.pem
```

where ca.conf is the configuration file for the CA certificate. The following is the content of the configuration file:

```sh
basicConstraints = CA:TRUE
keyUsage = cRLSign, keyCertSign
[req]
distinguished_name = req_distinguished_name
prompt = yes
[req_distinguished_name]
C   = <Country>
L   = <Location>
CN  = <Common Name>
```

At this point, once we have the CA private key and its self-signed certificate, we can generate the server and client certificates.
In order to generate the server certificate, it is necessary to create a certificate signing request (CSR) and then sign it with the CA private key and the following is the command used to generate it:

```sh
openssl req -new -sha512 -nodes -config server.conf -key server_key.pem -out server_cert_req.csr
```

where server.conf is the configuration file for the server certificate. The following is the content of the configuration file:

```sh
default_md = sha512
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
[req]
distinguished_name = req_distinguished_name
req_extensions = req_ext
prompt = yes
[req_distinguished_name]
C   = <Country>
L   = <Location>
O   = <Organization>
OU  = <Organizational Unit>
CN  = <Common Name>
[req_ext]
subjectAltName = @alt_names
[alt_names]
DNS.1 = <DNS domain name>
DNS.2 = <DNS subdomain name>
```

Once the CSR has been generated, it can be signed by the CA private key by running the following command:

```sh
openssl x509 -req -sha512 -days 365 -in server_cert_req.csr -CA ca_crt.pem -CAkey ca.key -out server_crt.pem
```

In order to generate the clients' certificates, as it was done with the server, it is necessary at first to generate a client CSR. The main difference between the two procedures resides in the fact that the generation of the clients' CSR doesn't require an additional configuration file due to the fact the client entity is much simpler and, in our abstraction, all the meaningful information stored in the their certificates can be specified under the -subj flag. The clients' CSR can be generated with the following command:

```sh
openssl req -new -sha512 -nodes -subj "/CN=<client_CN>" -key <client_name>_key.pem -out <client_name>_cert_req.csr
```

As with the server, starting from the clients' CSR it is possible to generate the respective certificates with the following command:

```sh
openssl x509 -req -sha512 -days 365 -in <client_name>_cert_req.csr -CA ca_crt.pem -CAkey ca.key -out <client_name>_crt.pem
```

In order to export the certificates of each client in a way that allows the browser to share them with the server during the mutual authentication process, the following command is used:

```sh
openssl pkcs12 -export -legacy -in <client_name>_crt.pem -inkey <client_name>_key.pem -out <client_name>.p12
```

To conclude, the export generates a PKCS12 file, a well-known file format used to store private keys and associated certificates. The -legacy flag is an option that ensures compatibility with legacy implementations, making it suitable for its execution on Macintosh.

## End-to-End Encryption

To guarantee that all the exchanged data between the clients is confidential and integral, both the clients belonging to the same room are required to possess a symmetric AES-GCM key to encrypt the messages and a public ECDSA key pair to sign and verify the message signature.
The mode of operation and the length of the symmetric key have been chosen based on security considerations regarding other modes of operation and key lengths. The type of the public key pair has also been chosen based on its high security level compared to its RSA alternatives and the particular type of the curve (i.e. P-384) has been chosen based on NIST recommendations and browser compatibility (some other types are not allowed anymore). To encrypt the messages the symmetric key has to be shared between the two clients and this is done by providing both clients with another public key pair, which in this case is a RSA-OAEP key pair, that is used to encrypt the symmetric key during the handshake phase, which is the initial part of the entire interaction. The choice to use this particular type of public key encryption to preserve the confidentiality of the symmetric key derives from the fact that it is the only one available in the Web Crypto API library. However, the choice of the length of the key has been decided with high attention (i.e. 4096 bits) together with the particular type of RSA provided by the library that is known to be more resistant to padding attacks.

The AES-GCM key is generated by the client that has initialized the communication in the following way:

```javascript
const key = await window.crypto.subtle.generateKey(
    {
        name: 'AES-GCM',
        length: 256,
    },
    true,
    ['encrypt', 'decrypt']
);
```

After the key generation, it is possible to use it to encrypt a textual message in the following way:

```javascript
const enc = new TextEncoder();
const iv = window.crypto.getRandomValues(new Uint8Array(12));

const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(message)
);

const encryptedMessage = new Uint8Array(encryptedBuffer);
```

After that, the encrypted message can be decrypted on the other client, once it has been received together with the initialization vector used in the encryption, with the following commands:

```javascript
const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedMessage
);

const dec = new TextDecoder();
const decryptedMessage = dec.decode(decryptedBuffer);
```

The integrity of the messages (including the one with which is shared the symmetric key) is supported by computing and verifying their signature by using an ECDSA key pair, generated by each client in the following way:

```javascript
const keyPair = await window.crypto.subtle.generateKey(
    {
        name: 'ECDSA',
        namedCurve: 'P-384',
    },
    true,
    ['sign', 'verify']
);
```

The ECSDA private key is used to sign the messages in the sender's browser, in the following way:

```javascript
const signature = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-384' },
    this.keyPairSign.privateKey,
    encryptedExportedKeyBuffer
);
```

While the signature obtained can be verified on the receiver’s browser by using the sender’s public key previously shared during the handshake.

```javascript
const isVerified = await window.crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-384' },
    this.peerPublicKeySign,
    signature,
    data
);
```

To exchange the symmetric key, useful to encrypt the chat messages, in a confidential way from the initiator client to the other one, it is encrypted by using PKC before its sharing. The RSA-OAEP keys used to do that are generated in this way:

```javascript
const keyPair = await window.crypto.subtle.generateKey(
    {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
);
```

The symmetric key encryption and decryption are performed respectively in the following way.

```javascript
const exportedKeyBuffer = await this.exportSymmetricKey();
const encryptedExportedKeyBuffer = await window.crypto.subtle.encrypt(
    {
        name: 'RSA-OAEP',
    },
    this.peerPublicKeyEnc,
    exportedKeyBuffer
);
```

```javascript
const exportedKeyBuffer = await window.crypto.subtle.decrypt(
    {
        name: 'RSA-OAEP',
    },
    this.keyPairEnc.privateKey,
    encryptedExportedKeyBuffer
);
```
