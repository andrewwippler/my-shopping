import useUser from "@/lib/useUser";
import React, { useState, useEffect, useRef } from "react";
import SocketIOClient from "socket.io-client";
import { User } from '@/pages/api/user'
interface IMsg {
  user: string | undefined;
  msg: string;
}

export default function ShoppingList() {
  const { user } = useUser({
    redirectTo: '/login',
  })
  const inputRef = useRef(null);

  // connected flag
  const [connected, setConnected] = useState<boolean>(false);

  // init chat and message
  const [chat, setChat] = useState<IMsg[]>([]);
  const [msg, setMsg] = useState<string>("");

  useEffect((): any => {
    // connect to socket server
    const socket = SocketIOClient.connect(process.env.NEXT_PUBLIC_WS_URL, {
      path: "/api/socketio",
    });

    // log socket connection
    socket.on("connect", () => {
      console.log("SOCKET CONNECTED!", socket.id);
      setConnected(true);
    });

    // update chat on new message dispatched
    socket.on("message", (message: IMsg) => {
      chat.push(message);
      setChat([...chat]);
    });

    // socket disconnet onUnmount if exists
    if (socket) return () => socket.disconnect();
  }, []);

  const sendMessage = async (string: string) => {

      // build message obj
      const message: IMsg = {
        user: user?.uid,
        msg: string,
      };

      // dispatch message to other users
      const resp = await fetch("/api/item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      // reset field if OK
      if (resp.ok) setMsg("");


  };

  return (
    <div>

      <input type="text" ></input><button onClick={() => sendMessage("dude")}>Click me</button>

    </div>
  );
};
// get items first
// const { data, error } = useSWR('/api/posts', fetcher)
// if (error) return <div>An error occured.</div>
// if (!data) return <div>Loading ...</div>

// return (
//   <ul>
//     {data.posts.map(post => (
//       <li key={post.id}>{post.title}</li>
//     ))}
//   </ul>
//  )
