import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from "@/types/next";

export default (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (req.method === "POST") {
    // get message
    const message = req.body;
    console.log("message",message)

    // dispatch to channel "message"
    res?.socket?.server?.io?.emit("message", message);
    // handle save to DB

    // return message
    res.status(201).json(message);
  }
};

// ///
// socket.on("initial_data", async () => {
//   const items = await Item.find({});

//   const checkedItems = items.filter(item => item.isChecked);
//   const notCheckedItems = items.filter(item => !item.isChecked);

//   io.sockets.emit("get_data", [...notCheckedItems, ...checkedItems]);
// })

// socket.on("addItem", async (itemToAdd) => {
//   await Item.create(itemToAdd);
//   io.sockets.emit("change_data");
// })

// socket.on("check", async (itemToUpdate) => {
//   const item = await Item.findById(itemToUpdate._id);
//   item.isChecked = !itemToUpdate.isChecked;
//   await item.save();
//   io.sockets.emit("change_data");
// });

// socket.on("editNotes", async (newNotes) => {
//   console.log(newNotes);
//   const item = await Item.findById(newNotes._id);
//   console.log("item", item);
//   item.notes = newNotes.notes
//   await item.save();
//   io.sockets.emit("change_data");
// })

// socket.on("delete", async (id) => {
//   await Item.deleteOne({ _id: id});
//   io.sockets.emit("change_data");
// })

// socket.on("disconnect", () => {
//   console.log("user disconnected");
// })
