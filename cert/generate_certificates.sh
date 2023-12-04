#!/bin/bash

folder_name="keys"

# Check if the folder already exists
if [ ! -d "$folder_name" ]; then
    mkdir "$folder_name"
    echo "Folder created."
else
    echo "Folder already exists."
fi

openssl ecparam -genkey -name secp384r1 -out $folder_name/ca.key
openssl req -x509 -new -sha512 -nodes -key $folder_name/ca.key -days 3650 -out $folder_name/ca_crt.pem -config conf/ca.conf
openssl ecparam -genkey -name secp384r1 -out $folder_name/host.pem
openssl req -new -sha512 -nodes -key $folder_name/host.pem -out $folder_name/host.csr -config conf/host.conf
openssl x509 -req -sha512 -days 365 -in $folder_name/host.csr -CA $folder_name/ca_crt.pem -CAkey $folder_name/ca.key -CAcreateserial -out $folder_name/host_crt.pem -extfile conf/host_ext.conf

echo "Certificates generated successfully."
