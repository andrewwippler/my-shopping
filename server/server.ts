import { Item, PrismaClient } from '@prisma/client';
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

    // get lists from STORES env variable
    // or default lists
    let lists: Array<string> = []
    if (process.env.STORES) {
      lists = process.env.STORES.split(",").map(item => item.trim());
    } else {
      lists = ["S-Market", "Lidl", "Prisma/Other"]
    }

    io.sockets.emit("get_data", { items, lists });
  })

  socket.on("addItem", async (itemToAdd: Item) => {
    const sort = await prisma.item.aggregate({
      _count: {
        id: true,
      },
    })

    await prisma.item.upsert({
      where: {
        name: `${itemToAdd.name}`,
      },
      create: {
        person: itemToAdd.person,
        name: itemToAdd.name,
        sort: sort._count.id,
        picked: false,
        list: itemToAdd.list,
      },
      update: {
        person: itemToAdd.person,
        picked: false,
        list: itemToAdd.list,
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
    prisma.item.update({
      where: {
        id: itemToSort.id,
      },
      data: {
        sort: itemToSort.sort,
        list: itemToSort.list,
        picked: false,
      },
    }).then(() => {

      //check data
      console.log(`updating: id: ${itemToSort.id}, ${itemToSort.name}, sort: ${itemToSort.sort}`)
      prisma.item.findMany({orderBy: {sort: 'asc'}}).then(records => {
        records.map(async (record, index) => {
          // now we need to make the changes here.
          // console.log("record id", record.id, record.sort == index, " ... array:", itemToSort.array[index].id)
          if (record.id != itemToSort.array[index].id) {
            console.log("fixing: ", record.name)
            await prisma.item.update({
              where: {
                id: record.id,
              },
              data: {
                sort: index,
              },
            })
          }
        })
      }).then(() => {
        io.sockets.emit("change_data");
      })
    })


  })


  socket.on("undo", async () => {

    const skip = await prisma.skip.findFirst({
      where: {
        id: 1
      }
    });

    const item = await prisma.item.findMany({
      skip: skip.count,
      take: 1,
      orderBy: {
        updatedAt: "desc"
      }
    })
    await prisma.item.update({
      where: {
        id: `${ item[0].id }`,
      },
      data: {
        picked: !item[0].picked,
      },
    })

    await prisma.skip.upsert({
      where: {
        id: 1,
      },
      create: {
        last_skipped: item[0].name,
        count: 1
      },
      update: {
        last_skipped: item[0].name,
        count: skip.count + 1
      },
    })
    console.log(`undo: ${item[0].id}, ${item[0].name}`)
    io.sockets.emit("change_data");
  });

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

    await prisma.skip.upsert({
      where: {
        id: 1,
      },
      create: {
        last_skipped: '',
        count: 0
      },
      update: {
        last_skipped: '',
        count: 0
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
