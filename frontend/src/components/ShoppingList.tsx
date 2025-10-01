import React, {
  useState,
  useEffect,
  useRef,
  FormEvent,
  CSSProperties,
} from "react";
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

  // connected flag
  const [connected, setConnected] = useState<boolean>(false);

  const [Items, setAllItems] = useState<shoppingItems[]>([]);
  const [lists, setLists] = useState<string[]>([]);

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setConnected(true);
      socket.emit("load");
    }

    function onDisconnect() {
      setConnected(false);
    }

    function changeData() {
      socket.emit("load");
    }

    function receiveData(value: {
      items: shoppingItems[];
      lists: Array<string>;
    }) {
      console.log("retrieved data",value)
      setAllItems(value.items);
      setLists(value.lists);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("get_data", receiveData);
    socket.on("change_data", changeData);

    return () => {
      socket.disconnect();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("get_data", receiveData);
      socket.off("change_data", changeData);
    };
  }, []);

  // socket.Emit "load" to refresh data
  function changeData() {
    socket.emit("load");
  }

  // Drag & Drop reorder
  const reorder = (
    iterable: Iterable<shoppingItems>,
    startIndex: number,
    endIndex: number,
    list: string
  ) => {
    const result = Array.from(iterable);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    let sort = removed.sort;
    if (startIndex > endIndex) {
      sort = result[endIndex].sort - 1;
    } else {
      sort = result[endIndex].sort + 1;
    }

    socket.emit("sortItem", {
      id: removed.id,
      sort,
      name: removed.name,
      list,
      array: result,
    });

    return result;
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    if (
      result.destination.droppableId === "Purchased" &&
      result.source.droppableId === "Purchased"
    ) {
      return; // don't reorder purchased
    }

    if (result.destination.droppableId === "Purchased") {
      const [removed] = Array.from(Items).splice(result.source.index, 1);
      socket.emit("check", removed.id);
      return;
    }

    let startIndex =
      result.source.droppableId === "Purchased"
        ? Items.findIndex(
            (p) =>
              p.id ===
              [...Items]
                .sort((a, b) => a.name.localeCompare(b.name))
                .splice(result.source.index, 1)[0].id
          )
        : result.source.index;

    const items = reorder(
      Items,
      startIndex,
      result.destination.index,
      result.destination.droppableId
    );
    setAllItems(items);
  };

  const getItemStyle = (
    isDragging: boolean,
    draggableStyle?: DraggingStyle | NotDraggingStyle
  ) => {
    const drag = isDragging ? "bg-white ring-1 rounded-md" : "bg-white";
    return `${drag} p-1`;
  };

  const getListStyle = (isDraggingOver: boolean) => {
    const background = isDraggingOver ? "bg-blue-50" : "bg-stone-100";
    return `${background} p-4`;
  };

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputRef.current && user) {
      const name = event.currentTarget.productName.value.trim();
      const list = event.currentTarget.list.value.trim();

      socket.emit("addItem", { person: user.id, name, list });
      inputRef.current.value = "";
    }
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
            {/* set options based upon lists array */}
          {lists.map((list, index) => (
              <option key={index} value={list}>
                {list}
              </option>
            ))}
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
                className={getListStyle(snapshot.isDraggingOver)}
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
                          className={getItemStyle(
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

        <Droppable droppableId="Uncategorized">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={getListStyle(snapshot.isDraggingOver)}
            >
              <div className="text-xl font-bold py-4 text-blue-900">
                Uncategorized
              </div>
              {[...Items]
                // filter out items with no list
                .filter((item) => lists.includes(item.list) === false && !item.picked)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item, index) => (
                  <Draggable
                    key={`Uncategorized-${item.id}`}
                    draggableId={`Uncategorized-${item.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <Item item={item} lists={lists}/>
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Droppable droppableId="Purchased">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={getListStyle(snapshot.isDraggingOver)}
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
                        className={getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <Item item={item} lists={lists}/>
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
