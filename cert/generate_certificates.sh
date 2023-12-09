#!/bin/bash

folder_name="keys"
server_folder_name="server"
alice_folder_name="alice"
bob_folder_name="bob"

# Check if the folder already exists
if [ ! -d "$folder_name" ]; then
    mkdir "$folder_name"
    echo "Folder created."

    if [ ! -d "$folder_name/$server_folder_name" ]; then
        mkdir "$folder_name/$server_folder_name"
        echo "Server folder created."
    else
        echo "Server folder already exists."
    fi

    if [ ! -d "$folder_name/$alice_folder_name" ]; then
        mkdir "$folder_name/$alice_folder_name"
        echo "Alice folder created."
    else
        echo "Alice folder already exists."
    fi

    if [ ! -d "$folder_name/$bob_folder_name" ]; then
        mkdir "$folder_name/$bob_folder_name"
        echo "Bob folder created."
    else
        echo "Bob folder already exists."
    fi
else
    echo "Folder already exists."
fi

openssl ecparam -genkey -name secp384r1 -out $folder_name/ca.key
openssl req -x509 -new -sha512 -nodes -config conf/ca.conf -days 3650 -key $folder_name/ca.key -out $folder_name/ca_crt.pem

openssl ecparam -genkey -name secp384r1 -out $folder_name/$server_folder_name/server_key.pem
openssl req -new -sha512 -nodes -config conf/host.conf -key $folder_name/$server_folder_name/server_key.pem -out $folder_name/$server_folder_name/server_cert_req.csr
openssl x509 -req -sha512 -days 365 -in $folder_name/$server_folder_name/server_cert_req.csr -CA $folder_name/ca_crt.pem -CAkey $folder_name/ca.key -CAcreateserial -out $folder_name/$server_folder_name/server_crt.pem -extfile conf/host_ext.conf


openssl ecparam -genkey -name secp384r1 -out $folder_name/$alice_folder_name/alice_key.pem
openssl req -new -sha512 -nodes -subj "/CN=Alice" -key $folder_name/$alice_folder_name/alice_key.pem -out $folder_name/$alice_folder_name/alice_cert_req.csr
openssl x509 -req -sha512 -days 365 -in $folder_name/$alice_folder_name/alice_cert_req.csr -CA $folder_name/ca_crt.pem -CAkey $folder_name/ca.key -CAcreateserial -out $folder_name/$alice_folder_name/alice_crt.pem
openssl pkcs12 -export -legacy -in $folder_name/$alice_folder_name/alice_crt.pem -inkey $folder_name/$alice_folder_name/alice_key.pem -out $folder_name/$alice_folder_name/alice.p12


echo "Certificates generated successfully."
