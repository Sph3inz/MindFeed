import { Home, Library, Gift, MessageSquare, Smartphone, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'

const Sidebar = () => {
  return (
    <div className="w-16 border-r border-black/5 flex flex-col items-center py-4 gap-6">
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-purple-600 text-sm">M</span>
        </div>
      </div>
      
      <nav className="flex flex-col gap-4">
        <Link to="/" className="p-2 rounded-lg hover:bg-white/10">
          <Home className="w-5 h-5 text-gray-700" />
        </Link>
        <Link to="/library" className="p-2 rounded-lg hover:bg-white/10">
          <Library className="w-5 h-5 text-gray-700" />
        </Link>
        <Link to="/discover" className="p-2 rounded-lg hover:bg-white/10">
          <Gift className="w-5 h-5 text-gray-700" />
        </Link>
        <Link to="/chat" className="p-2 rounded-lg hover:bg-white/10">
          <MessageSquare className="w-5 h-5 text-gray-700" />
        </Link>
        <Link to="/mobile" className="p-2 rounded-lg hover:bg-white/10">
          <Smartphone className="w-5 h-5 text-gray-700" />
        </Link>
      </nav>

      <div className="mt-auto">
        <button className="p-2 rounded-lg hover:bg-white/10">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  )
}

export default Sidebar