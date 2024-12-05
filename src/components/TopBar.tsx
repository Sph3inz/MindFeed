import { Search, History, Maximize2, X } from 'lucide-react'

const TopBar = () => {
  return (
    <div className="h-14 border-b bg-white px-4 flex items-center justify-between">
      <div className="flex-1 max-w-2xl flex items-center px-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          className="w-full px-3 py-1 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-slate-100 rounded-lg">
          <History className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-sm text-gray-600">Chat history</span>
        <button className="p-2 hover:bg-slate-100 rounded-lg">
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  )
}

export default TopBar