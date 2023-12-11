<template>
  <div id="app">
    <h1>Authentiflow</h1>
    <input type="text" ref="roomId" />
    <button @click="handleJoin">Join Room</button>
  </div>
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
  beforeDestroy() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
</script>
