import { PrismaClient } from '@prisma/client';
require('dotenv').config();
import express from 'express';
import { Server } from 'socket.io';
import { _ } from 'lodash';

const port = process.env.PORT || 3001;
const origin = process.env.ORIGIN || "http://localhost:3000";
const app = express()
const prisma = new PrismaClient()
app.use(express.json())


const server = app.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}`),
)

const io = new Server(server, {
    cors: {
        origin: origin,
        methods: ["GET", "POST"]
  },
  path: "/socket/socketio",

});


io.on("connection", socket => {
    console.log(`New client connected ${socket.id}`)

  //   socket.on("message", async (message) => {

  //   console.log(message) // receive from client
  //   io.sockets.emit("boo",message) // send to client
  // })

  socket.on("load", async () => {
    const items = await prisma.item.findMany({
      // Returns all user fields
      orderBy: {
        sort: 'asc',
      }
    })

    const lists = [
      "S-Market",
      "Lidl",
      "Prisma/Other",
    ]

    io.sockets.emit("get_data", { items, lists });
  })

  socket.on("addItem", async (itemToAdd) => {
    await prisma.item.create({
      data: {
        person: itemToAdd.user,
        name: itemToAdd.name,
        sort: 0,
        picked: false,
        list: "S-Market",
      },
    })
      io.sockets.emit("change_data");
    })

  socket.on("editItem", async (itemToEdit) => {
    await prisma.item.update({
      where: {
        id: itemToEdit.id,
      },
      data: {
        name: itemToEdit.name,
        list: itemToEdit.list,
      },
    })
    console.log(`updating: id ${itemToEdit.id}, ${itemToEdit.name},  list: ${itemToEdit.list},`)
    io.sockets.emit("change_data");
  })

  socket.on("sortItem", async (itemToSort) => {
    // sorted items will always be in a real list
    await prisma.item.update({
      where: {
        id: itemToSort.id,
      },
      data: {
        sort: itemToSort.sort,
        list: itemToSort.list,
        picked: false,
      },
    })
    console.log(`updating: id: ${itemToSort.id}, ${itemToSort.name}, sort: ${itemToSort.sort}`)
    io.sockets.emit("change_data");
  })

  socket.on("check", async (id) => {
    const item = await prisma.item.findUnique({
      where: {
        id: `${ id }`,
      },
    })
    await prisma.item.update({
      where: {
        id: `${ id }`,
      },
      data: {
        picked: !item.picked,
      },
    })
    console.log(`checking: ${item.id}, ${item.name}`)
    io.sockets.emit("change_data");
  });

  socket.on("delete", async (id) => {
    await prisma.item.delete({
      where: {
        id,
      },
    })
    console.log(`deleting: ${id}`)
    io.sockets.emit("change_data");
  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
  })
})

