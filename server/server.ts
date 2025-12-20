require('dotenv').config();
import express from 'express';
import { Server } from 'socket.io';

const port = process.env.PORT || 3001;
const origin = process.env.ORIGIN || "http://localhost:3000";
const app = express()

import { PrismaPg } from '@prisma/adapter-pg'
import { Item, PrismaClient } from './generated/prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })
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

    const nextSort = sort._count?.id ?? 0;
    // NOTE: upsert requires `name` to be a UNIQUE field in your Prisma schema.
    await prisma.item.upsert({
       where: {
         name: `${itemToAdd.name}`,
       },
       create: {
         person: itemToAdd.person,
         name: itemToAdd.name,
        sort: nextSort,
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
    try {
      if (!itemToSort || !Array.isArray(itemToSort.array)) return;

      const movedId = itemToSort.movedId ? String(itemToSort.movedId) : (itemToSort.id ? String(itemToSort.id) : null);
      const moveList = itemToSort.list ? String(itemToSort.list) : null;

      // fetch current DB rows for provided ids to preserve each item's current list (unless moved)
      const ids = itemToSort.array.map((it: any) => String(it.id));
      const dbItems = await prisma.item.findMany({ where: { id: { in: ids } } });
      const dbMap: Record<string, any> = {};
      dbItems.forEach(d => { dbMap[String(d.id)] = d; });

      // assign contiguous sort values per list (so only items within same list get reindexed)
      const counters: Record<string, number> = {};
      const updates = itemToSort.array.map((it: any) => {
        const idStr = String(it.id);
        // decide which list this item should belong to
        const targetList = (moveList && movedId && idStr === movedId)
          ? moveList
          : (dbMap[idStr]?.list ?? String(it.list ?? moveList ?? ""));

        const sortIndex = counters[targetList] ?? 0;
        counters[targetList] = sortIndex + 1;

        // Preserve picked state — do NOT overwrite picked here
        const data: any = { sort: sortIndex };
        // only change list for the single moved item
        if (moveList && movedId && idStr === movedId) data.list = moveList;

        return prisma.item.update({
          where: { id: idStr },
          data,
        });
      });

      await prisma.$transaction(updates);

      console.log(`reordered (movedId=${movedId})`);
      io.sockets.emit("change_data");
    } catch (err) {
      console.error("sortItem error:", err);
    }
  })


  socket.on("undo", async () => {

    const skip = await prisma.skip.findFirst({ where: { id: 1 } });
    const skipCount = skip?.count ?? 0;

    const items = await prisma.item.findMany({
      skip: skipCount,
      take: 1,
      orderBy: { updatedAt: "desc" },
    });
    if (!items || items.length === 0) return;
    const target = items[0];

    await prisma.item.update({
      where: { id: target.id },
      data: { picked: !target.picked },
    });

    await prisma.skip.upsert({
      where: { id: 1 },
      create: { id: 1, last_skipped: target.name, count: 1 },
      update: { last_skipped: target.name, count: skipCount + 1 },
    });
    console.log(`undo: ${target.id}, ${target.name}`)
    io.sockets.emit("change_data");
  });

  socket.on("check", async (id) => {
    const idStr = String(id);
    const item = await prisma.item.findUnique({ where: { id: idStr } });
    if (!item) return;
    await prisma.item.update({
      where: { id: idStr },
      data: { picked: !item.picked },
    });

    await prisma.skip.upsert({
      where: {
        id: 1,
      },
      create: {
        id: 1,
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
    const idStr = String(id);
    await prisma.item.delete({
      where: {
        id: idStr,
      },
    })
    console.log(`deleting: ${idStr}`)
    io.sockets.emit("change_data");
  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
  })
})
