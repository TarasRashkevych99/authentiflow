# AuthentiFlow

Fully authenticated web chat application

## Mutual Authentication

The application uses mutual authentication to ensure that the server and client are who they say they are. The main assumption is that all the certificates used in the communication between the server and the clients have been signed and distributed in a sicure way through the PKI.
In reality, all the certificates are self-signed and generated on the machine hosting the server. The certificates are then distributed manually to the clients and are imported in their browsers as trusted certificates.

### Certificate and Key Generation

By analyzing the available options provided by the OpenSSL library it has been decided to prefer elliptic curve cryptography over RSA. The main reason is that the former is more secure nowadays then the latter and it is also more efficient in terms of data storage. The particular ellipic curve that has been used is the secp521r1 curve, which is one with a high security level according to NIST. Other curves suggested by NIST like secp384r1 and secp256r1 were discarded due to their lower security level, even if they are more efficient in terms of performance.
The following is the command used to generate the keys for the CA, the server and the clients:

```
openssl ecparam -genkey -name secp521r1 -out <key_name>.key
```

Once the CA key has been generated, the CA self-signed certificate can be generated as well by running the following command:

```
openssl req -x509 -new -sha512 -nodes -config ca.conf -days 3650 -key ca.key -out ca_crt.pem
```

where ca.conf is the configuration file for the CA certificate. The following is the content of the configuration file:

```
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

```
openssl req -new -sha512 -nodes -config server.conf -key server_key.pem -out server_cert_req.csr
```

where server.conf is the configuration file for the server certificate. The following is the content of the configuration file:

```
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

```
openssl x509 -req -sha512 -days 365 -in server_cert_req.csr -CA ca_crt.pem -CAkey ca.key -out server_crt.pem -extfile host_ext.conf
```
