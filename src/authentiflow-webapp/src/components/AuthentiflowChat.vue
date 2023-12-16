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
          <v-list-item :title="item.message">
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
    isPhraseTextFieldDisabled: false, //if false, disable the textfield where insert room phrase
    isAfterSendingMessage: false, //if true, show the "send" button
    isPhraseValid: false,
    phrase: '', //room phrase
    message: '', //message to send
    messages: [] //list of messages exchanges
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
    this.socket.on('roomCreation', (room) => {
      //the server created a room for your room phrase, and inserted the socket into it
      this.searchingRoom = false
    })
    this.socket.on('messageReceived', (msg) => {
      //receive message sent by the other client
      this.messages.push({ sender: 'Other', message: msg })
    })
  },
  methods: {
    joinRoom() {
      //open or join a room given a room phrase
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
    },
    leaveRoom() {
      //leave a room (TODO add leave room at backend)
      this.searchingRoom = true
      this.isPhraseTextFieldDisabled = false
      this.loading = false
      this.isCancelButtonDisabled = true
      this.message = ''
      this.messages = []
    },
    sendMessage() {
      //send a message to other client in room
      this.messages.push({ sender: 'Me', message: this.message })
      this.socket.emit('messageSent', this.message)
      this.isAfterSendingMessage = true
      this.message = ''
    }
  },
  beforeUnmount() {
    //TODO fix
    if (this.socket) {
      // this.socket.emit('cancelJoinMsg', roomPhrase)
      this.socket.disconnect()
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
  position: fixed;
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(to right, #7dd3fc, #818cf8);
}
.v-list-item__content {
  padding-bottom: 1.3rem;
}
</style>
