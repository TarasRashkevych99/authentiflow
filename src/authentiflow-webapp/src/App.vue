<template>
  <v-app>
    <v-main>
      <AuthentiflowChat />
    </v-main>
  </v-app>
</template>

<script>
import AuthentiflowChat from './components/AuthentiflowChat.vue'
export default {
  name: 'App',
  components: {
    AuthentiflowChat
  }
}
</script>

<style scoped>
.v-application {
  background-color: rgb(15, 23, 42);
}
</style>
