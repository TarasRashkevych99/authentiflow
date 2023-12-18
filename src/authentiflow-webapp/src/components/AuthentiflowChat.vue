<template>
  <v-container align="center" justify="center">
    <v-card v-if="searchingRoom" class="chat-body chat-body-searching rounded-lg">
      <v-card-title class="chat-title">Authentiflow</v-card-title>
      <br />
      <!-- Search room subcomponent -->
      <v-card-text>
        <v-text-field
          v-model="phrase"
          color="primary"
          base-color="primary"
          :disabled="isPhraseTextFieldDisabled"
          label="Room Phrase"
          variant="outlined"
          autofocus="true"
          @keyup.enter="joinRoom"
          :rules="phraseRule"
        ></v-text-field>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn
          :loading="loading"
          :disabled="!isPhraseValid"
          height="3rem"
          width="50%"
          variant="tonal"
          color="primary"
          @click="joinRoom"
        >
          Join Room
        </v-btn>
        <v-btn
          :disabled="isCancelButtonDisabled"
          height="3rem"
          width="50%"
          variant="tonal"
          color="primary"
          @click="cancelJoin"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
    <!-- Chat subcomponent -->
    <v-card v-else class="chat-body chat-body-messaging rounded-lg">
      <v-card-title class="chat-title">Secure Chat</v-card-title>
      <br />
      <v-virtual-scroll :items="messages" height="400">
        <template v-slot:default="{ item }">
          <v-list-item :title="item.message" :class="{ 'chat-end-message': item?.end }">
            <template v-slot:prepend>
              <v-avatar
                :color="item.sender !== 'Me' ? '#7dd3fc' : '#818cf8'"
                class="text-white"
                size="40"
              >
                {{ item.sender[0] }}
              </v-avatar>
            </template>
          </v-list-item>
        </template>
      </v-virtual-scroll>
      <br />
      <v-card-text>
        <v-text-field
          :disabled="isMessageFieldDisabled"
          v-model="message"
          color="primary"
          base-color="primary"
          width="80%"
          :rules="messageRule"
          variant="outlined"
          autofocus="true"
          @keyup.enter="sendMessage"
          label="Message"
          type="text"
        ></v-text-field>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn
          :disabled="isSendButtonDisabled"
          height="3rem"
          width="50%"
          variant="tonal"
          color="primary"
          @click="sendMessage"
        >
          Send
        </v-btn>
        <v-btn height="3rem" width="50%" variant="tonal" color="primary" @click="leaveRoom">
          Leave room
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
import io from 'socket.io-client'

export default {
  data: () => ({
    loading: false, //if true, show spinning icon in choose-room subcomponent
    searchingRoom: true, //if true, show choose-room subcomponent
    isCancelButtonDisabled: true, //if true, show "search for another room" button
    isSendButtonDisabled: false, //if false, disable the "send" button
    isMessageFieldDisabled: false, //the field where a message is written
    isPhraseTextFieldDisabled: false, //if false, disable the textfield where insert room phrase
    isAfterSendingMessage: false, //if true, show the "send" button
    isPhraseValid: false,
    peerCN: '',
    phrase: '', //room phrase
    message: '', //message to send
    messages: [], //list of messages exchanges
    key: null, //symmetric key to use in the chat
    isKeyValid: false //so, its not expired
  }),
  computed: {
    phraseRule() {
      return [
        (value) => {
          if (value && value.length > 0) {
            this.isPhraseValid = true
            return true
          }
          this.isPhraseValid = false
          return 'The passphrase is required'
        }
      ]
    },
    messageRule() {
      return [
        (value) => {
          if (this.isAfterSendingMessage) {
            this.isAfterSendingMessage = false
            this.isSendButtonDisabled = true
            return true
          }
          if (value && value.length > 0) {
            this.isSendButtonDisabled = false
            return true
          }
          this.isSendButtonDisabled = true
          return 'The message is required'
        }
      ]
    }
  },
  mounted() {
    this.socket = io('wss://localhost:3000')
    window.addEventListener('beforeunload', this.handler)

    this.socket.on('roomCreation', async (isInitiator, CN) => {
      //the server created a room for your room phrase, and inserted the socket into it
      this.peerCN = CN

      if (isInitiator) {
        //to the initiator is given the job of creating a key
        await this.generateAndShareKey()
      }

      this.messages.push({
        sender: this.peerCN,
        message: this.peerCN + ' joined the room',
        end: true
      })
      this.searchingRoom = false
      this.isSendButtonDisabled = false
      this.isMessageFieldDisabled = false
    })

    this.socket.on('roomLeft', () => {
      //the other client left the room
      this.messages.push({
        sender: this.peerCN,
        message: this.peerCN + ' left the room',
        end: true
      })
      this.isSendButtonDisabled = true
      this.isMessageFieldDisabled = true
    })

    this.socket.on('messageReceived', async (encryptedMessage, iv) => {
      //decrypt and show the message received
      this.messages.push({
        sender: this.peerCN,
        message: await this.decryptMessage(encryptedMessage, iv, this.key)
      })
    })

    this.socket.on('keyReceived', async (rawKey) => {
      //retrieve and store the key received, it's useful only for the non-chat-initiator
      this.key = await this.importKey(rawKey)
      this.messages.push({
        sender: this.peerCN,
        message: 'This communication is protected by a key shared by the other party',
        end: true
      })
      this.isKeyValid = true
    })
  },
  methods: {
    joinRoom() {
      //open or join a room given a room phrase
      if (this.phrase.length < 10 || !this.phrase.includes(' ')) {
        if (
          !window.confirm(
            'The phrase you inserted seems week because short or represented by a single word. Are you sure you want proceed?'
          )
        )
          return
      }
      this.isCancelButtonDisabled = false
      this.isPhraseTextFieldDisabled = true
      this.loading = true
      this.socket.emit('joinRoom', this.phrase)
    },
    cancelJoin() {
      //choose another room phrase while waiting for another user
      this.socket.emit('cancelJoin', this.phrase)
      this.isCancelButtonDisabled = true
      this.isPhraseTextFieldDisabled = false
      this.loading = false
      this.phrase = ''
    },
    leaveRoom() {
      //leave a room through the proposed button
      this.key = null
      this.isKeyValid = null
      this.searchingRoom = true
      this.isCancelButtonDisabled = true
      this.isPhraseTextFieldDisabled = false
      this.loading = false
      this.message = ''
      this.messages = []
      this.socket.emit('roomLeft', this.phrase)
      this.phrase = ''
    },
    async sendMessage() {
      //send a message to other client in room
      this.messages.push({ sender: 'Me', message: this.message })

      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const encryptedMessage = await this.encryptMessage(this.message, iv, this.key)
      this.socket.emit('messageSent', this.phrase, encryptedMessage, iv)

      this.isAfterSendingMessage = true
      this.message = ''
    },
    async generateAndShareKey() {
      //it generate a key through generateKey() and it shares it to the other peer, the function is called only by the chat initiator
      this.key = await this.generateKey()
      const exportedKeyBuffer = new Uint8Array(
        //in order to be shared, the key must to be exported
        await window.crypto.subtle.exportKey('raw', this.key)
      )

      this.socket.emit('keySent', this.phrase, exportedKeyBuffer)
      this.isKeyValid = true
      this.messages.push({
        sender: this.peerCN,
        message: 'This communication is protected by a key generated and shared by you',
        end: true
      })
    },
    async generateKey() {
      //called by the generateAndShareKey() function in order to generate a key
      try {
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256
          },
          true,
          ['encrypt', 'decrypt']
        )
        console.log('generatedKey')
        return key
      } catch (error) {
        console.error('Error generating or exporting key:', error)
      }
    },
    async importKey(rawKey) {
      //the non-initiator party uses it in order to import a shared key
      try {
        const key = await window.crypto.subtle.importKey('raw', rawKey, 'AES-GCM', true, [
          'encrypt',
          'decrypt'
        ])
        console.log('importedKey')
        return key
      } catch (error) {
        console.error('ImportKey error:', error)
      }
    },
    async encryptMessage(message, iv, key) {
      //used by both the parties before sending a message
      try {
        const enc = new TextEncoder()

        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          enc.encode(message)
        )

        const encryptedMessage = new Uint8Array(encryptedBuffer)
        //console.log('Encrypted Message:', encryptedMessage)

        return encryptedMessage
      } catch (error) {
        console.error('Encryption error:', error)
      }
    },
    async decryptMessage(encryptedMessage, iv, key) {
      //used by both the parties before showing a message
      try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encryptedMessage
        )
        const dec = new TextDecoder()
        const decryptedMessage = dec.decode(decryptedBuffer)
        //console.log('Decrypted Message:', decryptedMessage)

        return decryptedMessage
      } catch (error) {
        console.error('Encryption/Decryption error:', error)
      }
    }
  }
}
</script>

<style scoped>
.chat-body {
  width: 35%;
  background-color: rgb(30 41 59);
}
.chat-body-searching {
  margin-top: 15%;
}
.chat-body-messaging {
  margin-top: 5%;
}
.chat-title {
  margin-top: 0.5rem;
  font-size: 2rem;
  font-weight: bold;
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(to right, #7dd3fc, #818cf8);
  /* background-image: linear-gradient(to right, #656fce, #8a59bb); */
  /* background-image: linear-gradient(to right, #818cf8, #c084fc); */
}
.chat-end-message {
  font-style: italic;
}
</style>

<style>
.v-field__input {
  background: -webkit-linear-gradient(#7dd3fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.v-label.v-field-label {
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(to right, #7dd3fc, #818cf8);
}
/* .v-virtual-scroll__item {
  background: -webkit-linear-gradient(#7dd3fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
} */
.v-list-item-title {
  position: absolute;
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(to right, #7dd3fc, #818cf8);
}
.v-list-item__content {
  padding-bottom: 1.3rem;
}
</style>
