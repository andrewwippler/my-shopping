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

  const dispatch = useAppDispatch();
  const updateUI = useAppSelector(selectUpdateUI);
  const inputRef = useRef<HTMLInputElement>(null);

  // connected flag
  const [connected, setConnected] = useState<boolean>(false);

  const [Items, setAllItems] = useState<shoppingItems[]>([]);
  const [lists, setLists] = useState<string[]>([]);

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

    function receiveData(value: { items: shoppingItems[], lists: Array<string> }) {
      // console.log("retrieved data",value)
      setAllItems(value.items)
      setLists(value.lists)
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
  const reorder = (iterable: Iterable<shoppingItems>, startIndex: number, endIndex: number, list: string) => {

    const result = Array.from(iterable);
    const [removed] = result.splice(startIndex, 1); // removes object at startIndex
    result.splice(endIndex, 0, removed); // inserts item at endIndex
    let sort = removed.sort

    // find the previous sort item and add or subtract 1 from it
    if (startIndex > endIndex) {
      // if start indx > end index, subtract from sort
      sort = Array.from(iterable)[endIndex].sort - 1
    } else {
    // if end index > start index, add to sort
    sort = Array.from(iterable)[endIndex].sort + 1
    }

    socket.emit('sortItem', {id: removed.id, sort, name: removed.name, list, array: result})

    return result;
  };

  const onDragEnd = (result: any) => {

    console.log("result",result)
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    // do not sort purchased
    if (result.destination.droppableId == "Purchased" && result.source.droppableId == "Purchased") {
      return;
    }

    // emit checked and return if dropping in purchased
    if (result.destination.droppableId == "Purchased") {
      const [removed] = Array.from(Items).splice(result.source.index, 1);
      socket.emit('check', removed.id);
      return;
    }

    // fix alphabetical array
    let startIndex
    if (result.source.droppableId == "Purchased") {
      const realItem = [...Items].sort((a, b) => a.name.localeCompare(b.name)).splice(result.source.index, 1)
      console.log("real",realItem)
      startIndex = Items.findIndex(p => p.id == realItem[0].id)
    } else {
      startIndex = result.source.index
    }

    const items = reorder(
      Items,
      startIndex,
      result.destination.index,
      result.destination.droppableId
    );

    setAllItems(items);
  }

  const getItemStyle = (isDragging: boolean, draggableStyle: CSSProperties | undefined) => {
    // some basic styles to make the items look a bit nicer
    let drag = isDragging ? "bg-white ring-1 rounded-md" : "bg-white"

    let value = `${drag} p-1`
    // change background colour if dragging
    return value
  };

  const getListStyle = (isDraggingOver: boolean) => {
    let background = isDraggingOver ? "bg-blue-50" : "bg-stone-100"
    let style = `${background} p-4`
    return style
  };

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputRef.current) {
      const name = event.currentTarget.productName.value.trim();
      const list = event.currentTarget.list.value.trim();
      // update product name
      socket.emit('addItem', { user: user?.uid, name, list })
      inputRef.current.value = ''
    }
  };

  return (
    <div>
      <form className="grid grid-cols-5 w-full mb-6 ring-1" onSubmit={handleAdd}>
                <input
                  id="productName"
                  name="productName"
                  type="productName"
                  autoComplete="productName"
                  required
                  className="pl-1.5 py-1.5 col-span-2"
                  placeholder="New..."
                  ref={inputRef}
                  />
        <div className="col-span-2 inset-y-0 right-0 flex items-center">
          <select
            id="list"
            name="list"
            className="h-full border-0 bg-transparent py-0 pl-2 text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          >
            <option>S-Market</option>
            <option>Lidl</option>
            <option>Prisma/Other</option>
          </select>
        </div>
          <button type="submit" className=' px-4 py-2 ring-1 font-semibold text-sm bg-green-300 hover:bg-green-500 text-white shadow-sm inline-flex' >
          <CheckCircleIcon className="h-4 w-4 mr-2" />Add </button>

      </form>
      <button className="w-full my-8 rounded-md bg-yellow-100 p-2" onClick={() => socket.emit('undo')}>Undo Last</button>
      <DragDropContext onDragEnd={onDragEnd}>
        {lists && lists.map((list,listIndex) => (
          <Droppable key={listIndex} droppableId={`${list}`}>
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={getListStyle(snapshot.isDraggingOver)}>
            <div className="text-xl font-bold py-4 text-blue-900">{list}</div>
              {Items.map((item, index) => (
                (!item.picked && item.list == list) &&
                <Draggable key={`${list}-${index}-${item.sort}`} draggableId={`${list}-${index}`} index={index}>
                  {(provided, snapshot) => (
                    // @ts-ignore
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}>
                        <Item active item={item} />
                    </div>
                  )}
                </Draggable>
              ))}
          {provided.placeholder}
            </div>
          )}
          </Droppable>

        ))}

          <Droppable droppableId="Purchased">
          {(provided, snapshot) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className={getListStyle(snapshot.isDraggingOver)}>
            <div className="text-xl font-bold py-4 text-blue-900">Purchased</div>
              {Items && [...Items].sort((a, b) => a.name.localeCompare(b.name)).map((item,index) => (
                item.picked &&
                <Draggable key={`Purchased-${item.id}-${item.sort}`} draggableId={`Purchased-${index}`} index={index}>
                  {(provided, snapshot) => (
                    // @ts-ignore
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}>
                      <Item item={item} />
                    </div>
                  )}
                </Draggable>
              ))}
          {provided.placeholder}
            </div>
          )}
          </Droppable>

      </DragDropContext>
      <button className="w-full mt-8 rounded-md bg-blue-200 p-2" onClick={() => socket.emit('load')}>Force Reset</button>
    </div>
  );
};
