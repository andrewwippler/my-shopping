import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { socket } from "@/lib/socket";
import { shoppingItems } from "@/types/ShoppingItem";
import Item from "./Item";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DraggingStyle,
  NotDraggingStyle,
} from "@hello-pangea/dnd";

export default function ShoppingList() {
  const { data: session } = useSession();
  const user = session?.user;

  const inputRef = useRef<HTMLInputElement>(null);

  const [connected, setConnected] = useState<boolean>(false);
  const [Items, setAllItems] = useState<shoppingItems[]>([]);
  const [lists, setLists] = useState<string[]>([]);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      socket.emit("load");
    };

    const onDisconnect = () => setConnected(false);

    const receiveData = (value: { items: shoppingItems[]; lists: string[] }) => {
      setAllItems(value.items);
      setLists(value.lists);
    };

    const changeDataHandler = () => socket.emit("load");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("get_data", receiveData);
    socket.on("change_data", changeDataHandler);

    return () => {
      socket.disconnect();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("get_data", receiveData);
      socket.off("change_data", changeDataHandler);
    };
  }, []);

  // Force refresh
  const changeData = () => socket.emit("load");

  // Reorder function for a single list
  const reorderList = (
    listItems: shoppingItems[],
    startIndex: number,
    endIndex: number
  ) => {
    const result = Array.from(listItems);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  // Build a global ordered array from per-list arrays (preserves picked items separately)
  const buildGlobalFromLists = (listsOrder: string[], perListMap: Record<string, shoppingItems[]>) => {
    const unpickedOrdered: shoppingItems[] = [];
    listsOrder.forEach(l => {
      const arr = perListMap[l] ?? [];
      unpickedOrdered.push(...arr);
    });
    const picked = Items.filter(i => i.picked);
    return [...unpickedOrdered, ...picked];
  };

  // Drag end handler
  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    // Moving to Purchased
    if (result.destination.droppableId === "Purchased") {
      const item = Items.find(
        (i) =>
          `item-${i.id}` === result.draggableId ||
          `Purchased-${i.id}` === result.draggableId
      );
      if (item) {
        socket.emit("check", item.id);
        setAllItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, picked: true } : i))
        );
      }
      return;
    }

    // Prevent reordering Purchased
    if (
      result.source.droppableId === "Purchased" &&
      result.destination.droppableId === "Purchased"
    ) {
      return;
    }

    const sourceList = result.source.droppableId;
    const destList = result.destination.droppableId;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    // Per-list arrays of unpicked items (reflect current UI order)
    const perListMap: Record<string, shoppingItems[]> = {};
    lists.forEach((l) => {
      perListMap[l] = Items.filter((it) => it.list === l && !it.picked);
    });

    // Find moved item from source list
    const sourceItems = perListMap[sourceList] ?? [];
    const movedItem = sourceItems[sourceIndex];
    if (!movedItem) return;

    if (sourceList === destList) {
      // simple reorder inside same list
      const newList = reorderList(sourceItems, sourceIndex, destIndex);
      perListMap[sourceList] = newList;
      const newGlobal = buildGlobalFromLists(lists, perListMap);
      setAllItems(newGlobal);
      socket.emit("sortItem", { movedId: movedItem.id, list: destList, array: newGlobal });
      return;
    }

    // move between lists
    const destItems = perListMap[destList] ?? [];
    const newSource = Array.from(sourceItems);
    newSource.splice(sourceIndex, 1);
    const movedUpdated = { ...movedItem, list: destList };
    const newDest = Array.from(destItems);
    newDest.splice(destIndex, 0, movedUpdated);

    perListMap[sourceList] = newSource;
    perListMap[destList] = newDest;

    const newGlobal = buildGlobalFromLists(lists, perListMap);
    setAllItems(newGlobal);

    // send full ordered array and movedId so server updates only that item's list
    socket.emit("sortItem", { movedId: movedItem.id, list: destList, array: newGlobal });
  };

  // Styles
  const getItemStyle = (
    isDragging: boolean,
    draggableStyle?: DraggingStyle | NotDraggingStyle
  ) => ({
    background: "white",
    borderRadius: isDragging ? "0.375rem" : "0",
    padding: "0.25rem",
    marginBottom: "0.25rem",
    ...draggableStyle,
  });

  const getListStyle = (isDraggingOver: boolean) => ({
    background: isDraggingOver ? "#DBEAFE" : "#F3F4F6",
    padding: "1rem",
    borderRadius: "0.375rem",
    marginBottom: "1rem",
  });

  // Add new item
  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputRef.current || !user) return;

    const name = event.currentTarget.productName.value.trim();
    const list = event.currentTarget.list.value.trim();

    if (!name || !list) return;

    socket.emit("addItem", { person: user.email, name, list });
    inputRef.current.value = "";
  };

  return (
    <div>
      <form
        className="grid grid-cols-5 w-full mb-6 ring-1"
        onSubmit={handleAdd}
      >
        <input
          id="productName"
          name="productName"
          type="text"
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
            {lists.length ? (
              lists.map((list, index) => (
                <option key={index} value={list}>
                  {list}
                </option>
              ))
            ) : (
              <option disabled>No lists available</option>
            )}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 ring-1 font-semibold text-sm bg-green-300 hover:bg-green-500 text-white shadow-sm inline-flex"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          Add
        </button>
      </form>

      <button
        className="w-full my-8 rounded-md bg-yellow-100 p-2"
        onClick={() => socket.emit("undo")}
      >
        Undo Last
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        {lists.map((list) => (
          <Droppable key={list} droppableId={list}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}
              >
                <div className="text-xl font-bold py-4 text-blue-900">
                  {list}
                </div>
                {Items.filter((item) => item.list === list && !item.picked).map(
                  (item, index) => (
                    <Draggable
                      key={`item-${item.id}`}
                      draggableId={`item-${item.id}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                        >
                          <Item active item={item} lists={lists} />
                        </div>
                      )}
                    </Draggable>
                  )
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}

        <Droppable droppableId="Purchased">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}
            >
              <div className="text-xl font-bold py-4 text-blue-900">
                Purchased
              </div>
              {[...Items]
                .filter((item) => item.picked)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item, index) => (
                  <Draggable
                    key={`Purchased-${item.id}`}
                    draggableId={`Purchased-${item.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <Item item={item} lists={lists} />
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        className="w-full mt-8 rounded-md bg-blue-200 p-2"
        onClick={changeData}
      >
        Force Reset
      </button>
    </div>
  );
}
