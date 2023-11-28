//@ts-nocheck
import { Elysia } from "elysia";

const app = new Elysia({
  serve: {
    tls: {
      key: Bun.file("cert/host.pem"),
      cert: Bun.file("cert/hostcrt.pem"),
      ca: [Bun.file("cert/cacrt.pem")],
    },
    websocket: {
      idleTimeout: 30000,
    },
  },
})
  .ws("/ws", {
    message(ws, message) {
      ws.send(message);
    },
  })
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
