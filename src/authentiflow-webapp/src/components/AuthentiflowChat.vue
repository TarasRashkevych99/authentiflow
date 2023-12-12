<template>
  <v-sheet width="300" class="mx-auto">
    <h1>Authentiflow</h1>
    <br />
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
    <div :hidden="findRoomDiv">
      <h2>Here will appear the chat</h2>

      <v-btn height="48" variant="plain" @click="leaveRoom" block> Leave the room </v-btn>
    </div>
  </v-sheet>
</template>

<script>
import io from 'socket.io-client'

export default {
  data: () => ({
    loading: false,
    cancelButton: false,
    joinButton: false,
    roomTextfield: true,
    findRoomDiv: true
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
    this.socket.on('confirmJoin', (data) => {
      this.findRoomDiv = false
    })
  },
  methods: {
    handleJoin() {
      const roomPhrase = this.$refs.roomPhrase.value
      console.log(roomPhrase)
      this.socket.emit('joinMsg', roomPhrase)
      this.roomTextfield = false
      this.loading = true
    },
    cancelJoin() {
      const roomPhrase = this.$refs.roomPhrase.value
      this.socket.emit('cancelJoinMsg', roomPhrase)
      this.roomTextfield = true
      this.loading = false
      this.cancelButton = false
    },
    leaveRoom() {
      this.findRoomDiv = true
      this.roomTextfield = true
      this.loading = false
      this.cancelButton = false
    }
  },
  beforeUnmount() {
    //to fix
    if (this.socket) {
      this.socket.emit('cancelJoinMsg', roomPhrase)
      this.socket.disconnect()
    }
  }
}
</script>
