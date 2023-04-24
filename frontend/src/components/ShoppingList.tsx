import useUser from "@/lib/useUser";
import React, { useState, useEffect, useRef, FormEvent, CSSProperties } from "react";
import { socket } from '@/lib/socket';
import { User } from '@/pages/api/user'
import { selectUpdateUI, setUpdateUI } from "@/reducers/ui";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { shoppingItems } from "@/types/ShoppingItem";
import Item from "./Item";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle } from '@hello-pangea/dnd';

export default function ShoppingList() {
  const { user } = useUser({
    redirectTo: '/login',
  })
  const inputRef = useRef(null);
  const dispatch = useAppDispatch();
  const updateUI = useAppSelector(selectUpdateUI);

  // connected flag
  const [connected, setConnected] = useState<boolean>(false);

  const [activeItems, setActiveItems] = useState<shoppingItems[]>([]);
  const [deactiveItems, setDeactiveItems] = useState<shoppingItems[]>([]);

  useEffect(() => {
    socket.connect()

    function onConnect() {
      setConnected(true);
      socket.emit('load')
    }

    function onDisconnect() {
      setConnected(false);
    }

    function changeData() {
      socket.emit('load')
    }

    function receiveData(value: Array<shoppingItems[]>) {
      // false/deactive items are first
      setDeactiveItems(value[0])
      setActiveItems(value[1])
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('get_data', receiveData);
    socket.on('change_data', changeData);

    return () => {
      socket.disconnect();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('get_data', receiveData);
      socket.off('change_data', changeData);
    };
  }, []);

// a little function to help us with reordering the result
const reorder = (list: Iterable<shoppingItems>, startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  let sort = removed.sort

  // find the previous sort item and add or subtract 1 from it
  if (startIndex > endIndex) {
    // if start indx > end index, subtract from sort
    sort = Array.from(list)[endIndex].sort - 1
  } else {
   // if end index > start index, add to sort
  sort = Array.from(list)[endIndex].sort + 1
}

  socket.emit('sortItem', {id: removed.id, sort, name: removed.name})

  return result;
};

  const onDragEnd = (result: any) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = reorder(
      activeItems,
      result.source.index,
      result.destination.index
    );

    setActiveItems(items);
  }

  const getItemStyle = (isDragging: boolean, draggableStyle: CSSProperties | undefined) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: "none",
    padding: 16,
    margin: `0 0 8px 0`,

    // change background colour if dragging
    background: isDragging ? "lightgreen" : "white",

    // styles we need to apply on draggables

    ...draggableStyle
  });

  const getListStyle = (isDraggingOver: boolean) => ({
    background: isDraggingOver ? "lightblue" : "lightgrey",
    padding: 8,
  });

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = event.currentTarget.productName.value.trim();

    // update product name
    socket.emit('addItem', {eser: user?.uid, name})
  };

  return (
    <div>
      <form className="w-fill mb-6 flex" onSubmit={handleAdd}>
                <input
                  id="productName"
                  name="productName"
                  type="productName"
                  autoComplete="productName"
                  required
                  className="pl-1.5 py-1.5 ring-1 grow"
                  placeholder="New..."

                  />

          <button type="submit" className=' px-4 py-2 ring-1 font-semibold text-sm bg-green-300 hover:bg-green-500 text-white shadow-sm inline-flex' >
          <CheckCircleIcon className="h-4 w-4 mr-2" />Add Product</button>

        </form>
      <div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="activeItems">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}
            >
        {activeItems.map((item, index) => (
          <Draggable key={`activeItems-${index}-${item.sort}`} draggableId={`activeItems-${index}`} index={index}>
            {(provided, snapshot) => (
              // @ts-ignore
              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
            >
        <Item active item={item} />
                </div>
              )}
              </Draggable>
        ))}
          {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      </div>
    <div>
        {deactiveItems.map((item, index) => (

       <Item key={`deactiveItems-${index}-${item.sort}`} item={item} />
     ))}
   </div>
      <button className="w-full mt-8 rounded-md bg-sky-200 p-2" onClick={() => socket.emit('load')}>Force Reset</button>
    </div>
  );
};
