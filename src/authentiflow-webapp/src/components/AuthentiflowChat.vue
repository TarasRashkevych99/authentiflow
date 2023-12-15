<template>
  <v-sheet width="300" class="mx-auto">
    <h1>Authentiflow</h1>
    <br />

    <!-- Search room subcomponent -->
    <div :hidden="!findRoomDiv">
      <v-text-field
        :disabled="!roomTextfield"
        label="Room Phrase"
        :rules="RoomPhraseRules"
        ref="roomPhrase"
      ></v-text-field>

      <v-btn
        :loading="loading"
        :disabled="!joinButton"
        class="flex-grow-1"
        height="48"
        variant="tonal"
        @click="handleJoin"
        block
      >
        Join Room
      </v-btn>

      <v-btn :hidden="!cancelButton" height="48" variant="plain" @click="cancelJoin" block>
        Search for another room
      </v-btn>
    </div>

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
  </v-sheet>
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
    messages: [] //list of messages exchanges
  }),
  computed: {
    RoomPhraseRules() {
      return [
        (value) => {
          if (value?.length > 10) {
            this.joinButton = true
            return true
          }
          this.joinButton = false
          return 'The Room Phrase must be at least 10 characters.'
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
      this.socket.emit('cancelJoinMsg', roomPhrase)
      this.socket.disconnect()
    }
  }
}
</script>
