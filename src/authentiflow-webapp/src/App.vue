<template>
  <v-app>
    <v-main>
      <AuthentiflowChat/>
    </v-main>
  </v-app>
</template>

<script>
import AuthentiflowChat from './components/AuthentiflowChat.vue'
export default {
  name: 'App',

  components: {
    AuthentiflowChat,
  },

  data: () => ({
    //
  }),
}
</script>
