#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
NOCOLOR='\033[0m'

create_file() {
    local filename="$1"
    local openssl_cmd="$2"
    overwrite="y"

    if [ -e "$folder_name/$filename" ]; then
        echo "File ${RED} '$filename' ${NOCOLOR} already exists. Do you want to overwrite it? (y/n) "
        if ! read -n 1 -r -s -t 60 overwrite; then
            echo "Timeout. File creation aborted."
            exit 0
        fi
    fi
    if [[ $overwrite =~ ^[Yy]$ ]]; then
        echo "${GREEN}Creating '$filename'.${NOCOLOR}"
        eval $openssl_cmd
    else
        echo "${GREEN} Using '$filename' existing.${NOCOLOR}"
    fi
}

folder_name="keys"

# Check if the folder already exists
if [ ! -d "$folder_name" ]; then
    mkdir "$folder_name"
    echo "${GREEN}Folder created.${NOCOLOR}"
else
    echo "${GREEN}Folder already exists.${NOCOLOR}"
fi

filenames=("ca.key" "ca_crt.pem" "host.pem" "host.csr" "host_crt.pem") #in the order: CA key, CA certificate, server key, server csr, server certificate

openssl_cmds=("openssl ecparam -genkey -name secp384r1 -out $folder_name/${filenames[0]}" \
    "openssl req -x509 -new -sha512 -nodes -key $folder_name/${filenames[0]} -days 3650 -out $folder_name/${filenames[1]} -config conf/ca.conf" \
    "openssl ecparam -genkey -name secp384r1 -out $folder_name/${filenames[2]}" \
    "openssl req -new -sha512 -nodes -key $folder_name/${filenames[2]} -out $folder_name/${filenames[3]} -config conf/host.conf" \
    "openssl x509 -req -sha512 -days 365 -in $folder_name/${filenames[3]} -CA $folder_name/${filenames[1]} -CAkey $folder_name/${filenames[0]} -CAcreateserial -out $folder_name/${filenames[4]} -extfile conf/host_ext.conf")

for i in {0..4}
do
  create_file "${filenames[i]}" "${openssl_cmds[i]}"
done    

echo "Certificates generated successfully."