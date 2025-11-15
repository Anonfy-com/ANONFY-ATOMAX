import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Sencilla Web de Hosting</h1>
        <p className="text-xl text-slate-400 mb-8">Bienvenido a tu aplicación React</p>
        <button
          onClick={() => setCount(count + 1)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          Contador: {count}
        </button>
      </div>
    </div>
  )
}

export default App
