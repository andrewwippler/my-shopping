import { socket } from "@/lib/socket"
import { shoppingItems } from "@/types/ShoppingItem"
import { CheckCircleIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline"
import { FormEvent, useState } from "react"
import { CheckIcon } from "@heroicons/react/20/solid";

export default function Item({
  item,
  active = false,
}: {
    item: shoppingItems
    active?: boolean
}) {
  let classInclude = 'line-through'
  const [editTag, setEditTag] = useState(false)


  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newname = event.currentTarget.productName.value.trim();
    const list = event.currentTarget.list.value.trim();
    // update product name
    socket.emit('editItem', {id: item.id, name: newname, list})
    setEditTag(false)
  };

  const handleDelete = () => {

    socket.emit('delete', item.id)
    setEditTag(false)
  };


  if (active || editTag) classInclude = ''

  return (<>
    <div className={`${classInclude} flex items-center my-2 text-l text-blue-900`}>
      {editTag ?
        <div className="flex-inline w-full">
          <form className="flex w-full mb-6 ring-1" onSubmit={handleSave}>
                <input
                  id="productName"
                  name="productName"
                  type="productName"
                  autoComplete="productName"
                  required
                  className="pl-1.5 py-1.5 grow"
                  placeholder="productName"
                  defaultValue={item.name}
                  />
        <div className="inset-y-0 right-0 flex items-center">
          <select
            id="list"
            name="list"
            className="h-full border-0 bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          >
            <option>S-Market</option>
            <option>Lidl</option>
            <option>Prisma/Other</option>
          </select>
        </div>
          <button type="submit" className=' px-4 py-2 ring-1 font-semibold text-sm bg-green-300 hover:bg-green-500 text-white shadow-sm inline-flex' >
          <CheckCircleIcon className="h-4 w-4 mr-2" />Update Product</button>
        </form>
          <button onClick={() => handleDelete()} className='px-4 py-2 mt-2 font-semibold text-sm bg-red-300 hover:bg-red-500 text-white w-full shadow-sm inline-flex items-center'>
          <TrashIcon className="h-4 w-4" />Delete this Item</button>
        </div>

      :
        <>
        <button onClick={() => socket.emit('check', item.id)} className='px-4 py-2 mr-2 font-semibold text-sm bg-blue-300 hover:bg-blue-500 text-white shadow-sm inline-flex items-center'>
        <CheckIcon className="h-4 w-4" /></button>
        <span className='grow'>{item.name}</span> {/* , {item.list}, {String(item.picked)} */}
        <button onClick={() => setEditTag(true)} className='px-4  py-2 font-semibold text-sm bg-green-300 hover:bg-green-500 text-white rounded-full shadow-sm inline-flex items-center' >
        <PencilSquareIcon className="h-4 w-4" /></button>

        </>
          }
      </div>
  </>)
}
