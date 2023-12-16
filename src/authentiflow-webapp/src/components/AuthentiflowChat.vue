<template>
  <v-container align="center" justify="center">
    <v-card class="chat-body rounded-xl">
      <v-card-title class="chat-title">Authentiflow</v-card-title>
      <br />
      <!-- Search room subcomponent -->
      <v-card-text :hidden="!findRoomDiv">
        <v-text-field
          v-model="phrase"
          class="chat-text-field"
          color="primary"
          base-color="primary"
          :disabled="!roomTextfield"
          label="Room Phrase"
          variant="outlined"
          ref="roomPhrase"
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
          @click="handleJoin"
        >
          Join Room
        </v-btn>

        <v-btn :hidden="!cancelButton" height="48" variant="plain" @click="cancelJoin" block>
          Search for another room
        </v-btn>
      </v-card-actions>

      <!-- Chat subcomponent -->
      <div :hidden="findRoomDiv">
        <h2>Chat</h2>

        <v-virtual-scroll :items="messages" height="400">
          <template v-slot:default="{ item }"> {{ item }} </template>
        </v-virtual-scroll>
        <br />
        <v-text-field
          :append-icon="'mdi-send'"
          @click:append="sendMsg"
          variant="filled"
          :rules="chatMsgRules"
          label="Message"
          type="text"
          ref="chatMsg"
        ></v-text-field>
        <v-btn height="48" variant="plain" @click="leaveRoom" block> Leave the room </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script>
import io from 'socket.io-client'

export default {
  data: () => ({
    loading: false, //if true, show spinning icon in choose-room subcomponent
    cancelButton: false, //if true, show "search for another room" button
    joinButton: false, //if false, disable the "join room" button
    roomTextfield: true, //if false, disable the textfield where insert room phrase
    findRoomDiv: true, //switch between room-phrase and chat subcomponents
    isPhraseValid: false,
    phrase: '', //room phrase
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
    }
  },
  watch: {
    loading(val) {
      if (!val) return

      setTimeout(() => (this.cancelButton = true), 3000)
    }
  },
  mounted() {
    this.socket = io('wss://localhost:3000')
    this.socket.on('confirmJoin', (room) => {
      //the server created a room for your room phrase, and inserted the socket into it
      this.findRoomDiv = false
      console.log(room)
    })
    this.socket.on('receiveMsg', (msg) => {
      //receive message sent by the other client
      this.messages.push(`OTHER: ${msg}`)
    })
  },
  methods: {
    handleJoin() {
      //open or join a room given a room phrase
      const roomPhrase = this.$refs.roomPhrase.value
      console.log(roomPhrase)
      this.socket.emit('joinMsg', roomPhrase)
      this.roomTextfield = false
      this.loading = true
    },
    cancelJoin() {
      //choose another room phrase while waiting for another user
      const roomPhrase = this.$refs.roomPhrase.value
      this.socket.emit('cancelJoinMsg', roomPhrase)
      this.roomTextfield = true
      this.loading = false
      this.cancelButton = false
    },
    leaveRoom() {
      //leave a room (TODO add leave room at backend)
      this.findRoomDiv = true
      this.roomTextfield = true
      this.loading = false
      this.cancelButton = false
      this.$refs.chatMsg.value = '' //to fix
      this.messages = []
    },
    sendMsg() {
      //send a message to other client in room
      const chatMsg = this.$refs.chatMsg.value
      this.$refs.chatMsg.value = ''
      this.messages.push(`YOU: ${chatMsg}`)
      this.socket.emit('sendMsg', chatMsg)
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
  margin-top: 15%;
  width: 35%;
  background-color: rgb(30 41 59);
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
.chat-text-field input {
  background-color: white;

  color: green !important;
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
</style>
