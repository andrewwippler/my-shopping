import { Prisma, PrismaClient } from '@prisma/client'
require('dotenv').config()
import express from 'express'
import { Server } from 'socket.io';

const port = process.env.PORT || 3001;
const app = express()

app.use(express.json())


const server = app.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}`),
)

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
  },
  path: "/socket/socketio",
      // cors: {
      //   origin: "http://localhost:3000"
      // },
});


io.on("connection", socket => {
    console.log(`New client connected ${socket.id}`)

    socket.on("message", async (message) => {

      console.log(message) // receive from client
      io.sockets.emit("boo",message) // send to client
  })

    socket.on("initial_data", async () => {
        // const items = await Item.find({});

        // const checkedItems = items.filter(item => item.isChecked);
        // const notCheckedItems = items.filter(item => !item.isChecked);

        // io.sockets.emit("get_data", [...notCheckedItems, ...checkedItems]);
    })

    socket.on("addItem", async (itemToAdd) => {
        // await Item.create(itemToAdd);
        io.sockets.emit("change_data");
    })

    socket.on("check", async (itemToUpdate) => {
        // const item = await Item.findById(itemToUpdate._id);
        // item.isChecked = !itemToUpdate.isChecked;
        // await item.save();
        io.sockets.emit("change_data");
    });

    socket.on("editNotes", async (newNotes) => {
        console.log(newNotes);
        // const item = await Item.findById(newNotes._id);
        // console.log("item", item);
        // item.notes = newNotes.notes
        // await item.save();
        io.sockets.emit("change_data");
    })

    socket.on("delete", async (id) => {
        // await Item.deleteOne({ _id: id});
        io.sockets.emit("change_data");
    })

    socket.on("disconnect", () => {
        console.log("user disconnected");
    })
})

