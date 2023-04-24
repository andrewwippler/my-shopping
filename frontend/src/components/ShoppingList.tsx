import useUser from "@/lib/useUser";
import React, { useState, useEffect, useRef } from "react";
import { socket } from '@/lib/socket';
import { User } from '@/pages/api/user'
import { selectUpdateUI, setUpdateUI } from "@/reducers/ui";
import { useAppDispatch, useAppSelector } from "@/hooks";
interface IMsg {
  user: string | undefined;
  msg: string;
}

export default function ShoppingList() {
  const { user } = useUser({
    redirectTo: '/login',
  })
  const inputRef = useRef(null);
  const dispatch = useAppDispatch();
  const updateUI = useAppSelector(selectUpdateUI);

  // connected flag
  const [connected, setConnected] = useState<boolean>(false);

  // init chat and message
  const [chat, setChat] = useState<IMsg[]>([]);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onMessage(value) {
      console.log(value)
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('boo', onMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('boo', onMessage);
    };
  }, []);

  const sendMessage = async (string: string) => {

      // build message obj
      const message: IMsg = {
        user: user?.uid,
        msg: string,
      };

    socket.emit('message', message)

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
