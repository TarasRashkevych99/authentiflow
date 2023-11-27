//@ts-nocheck
import { Elysia } from "elysia";
import fs from "fs";

const app = new Elysia({
  serve: {
    tls: {
      key: fs.readFileSync("cert/key.pem"),
      cert: fs.readFileSync("cert/cert.pem"),
      ca: fs.readFileSync("cert/ca.pem"),
    },
    websocket: {
      idleTimeout: 30,
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
  `🦊 Elysia is running at ${app.server?.hostame}:${app.server?.port}`
);
