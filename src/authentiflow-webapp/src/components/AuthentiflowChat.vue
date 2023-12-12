<template>
  <!-- <div id="app">
    <h1>Authentiflow</h1>
    <input type="text" ref="roomId" />
    <button @click="handleJoin">Join Room</button>
  </div> -->
  <v-sheet width="300" class="mx-auto">
    <v-form fast-fail @submit.prevent>
      <v-text-field
        v-model="firstName"
        label="First name"
        :rules="firstNameRules"
      ></v-text-field>

      <v-text-field
        v-model="lastName"
        label="Last name"
        :rules="lastNameRules"
      ></v-text-field>

      <v-btn type="submit" block class="mt-2">Submit</v-btn>
    </v-form>
  </v-sheet>
</template>

<script>
import io from 'socket.io-client'

export default {
  data() {},
  mounted() {
    this.socket = io('wss://localhost:3000')
  },
  methods: {
    handleJoin() {
      const roomId = this.$refs.roomId.value
      console.log(roomId)
      this.socket.emit('joinMsg', roomId)
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
</script>
