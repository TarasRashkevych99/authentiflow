#!/bin/bash

folder_name="keys"
server_folder_name="server"
alice_folder_name="alice"
bob_folder_name="bob"

if [ -d "$folder_name" ]; then
    read -p "Folder already exists. Do you want to override it? (y/n): " answer
    if [ "$answer" == "y" ]; then
        rm -rf "$folder_name"
        mkdir "$folder_name"
        mkdir "$folder_name/$server_folder_name"
        mkdir "$folder_name/$alice_folder_name"
        mkdir "$folder_name/$bob_folder_name"
    else
        echo "Terminating script."
        exit 1
    fi
else
    mkdir "$folder_name"
    mkdir "$folder_name/$server_folder_name"
    mkdir "$folder_name/$alice_folder_name"
    mkdir "$folder_name/$bob_folder_name"
fi

cleanup() {
    echo "An error occurred. Cleaning up..."
    rm -rf "$folder_name"
    exit 1
}

trap cleanup ERR

# Generate CA certificate
openssl ecparam -genkey -name secp384r1 -out $folder_name/ca.key
openssl req -x509 -new -sha512 -nodes -config conf/ca.conf -days 3650 -key $folder_name/ca.key -out $folder_name/ca_crt.pem

# Generate server certificate
openssl ecparam -genkey -name secp384r1 -out $folder_name/$server_folder_name/server_key.pem
openssl req -new -sha512 -nodes -config conf/server.conf -key $folder_name/$server_folder_name/server_key.pem -out $folder_name/$server_folder_name/server_cert_req.csr
openssl x509 -req -sha512 -days 365 -in $folder_name/$server_folder_name/server_cert_req.csr -CA $folder_name/ca_crt.pem -CAkey $folder_name/ca.key -out $folder_name/$server_folder_name/server_crt.pem

# Generate client certificates
openssl ecparam -genkey -name secp384r1 -out $folder_name/$alice_folder_name/alice_key.pem
openssl req -new -sha512 -nodes -subj "/CN=Alice" -key $folder_name/$alice_folder_name/alice_key.pem -out $folder_name/$alice_folder_name/alice_cert_req.csr
openssl x509 -req -sha512 -days 365 -in $folder_name/$alice_folder_name/alice_cert_req.csr -CA $folder_name/ca_crt.pem -CAkey $folder_name/ca.key -out $folder_name/$alice_folder_name/alice_crt.pem
openssl pkcs12 -export -legacy -in $folder_name/$alice_folder_name/alice_crt.pem -inkey $folder_name/$alice_folder_name/alice_key.pem -out $folder_name/$alice_folder_name/alice.p12

openssl ecparam -genkey -name secp384r1 -out $folder_name/$bob_folder_name/bob_key.pem
openssl req -new -sha512 -nodes -subj "/CN=Bob" -key $folder_name/$bob_folder_name/bob_key.pem -out $folder_name/$bob_folder_name/bob_cert_req.csr
openssl x509 -req -sha512 -days 365 -in $folder_name/$bob_folder_name/bob_cert_req.csr -CA $folder_name/ca_crt.pem -CAkey $folder_name/ca.key -out $folder_name/$bob_folder_name/bob_crt.pem
openssl pkcs12 -export -legacy -in $folder_name/$bob_folder_name/bob_crt.pem -inkey $folder_name/$bob_folder_name/bob_key.pem -out $folder_name/$bob_folder_name/bob.p12


echo "Certificates generated successfully."
