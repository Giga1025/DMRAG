import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-100 mb-6">
            DMRAG
          </h1>
          <h2 className="text-2xl font-medium text-gray-300 mb-6">
            Dungeon Master Retrieval Augmented Generation
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Embark on epic adventures with your AI-powered Dungeon Master. 
            Create characters, explore worlds, and experience D&D like never before.
          </p>
          
          <div className="flex gap-6 justify-center">
            <Link
              href="/login"
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-3 px-8 rounded-lg transition duration-200 border border-gray-600"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold py-3 px-8 rounded-lg transition duration-200 border border-gray-500"
            >
              Sign Up
            </Link>
          </div>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center text-gray-300">
            <div className="text-4xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Dynamic Adventures</h3>
            <p className="text-gray-400">AI-generated quests and storylines that adapt to your choices</p>
          </div>
          <div className="text-center text-gray-300">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Character Creation</h3>
            <p className="text-gray-400">Build unique characters with detailed backstories and abilities</p>
          </div>
          <div className="text-center text-gray-300">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Immersive Worlds</h3>
            <p className="text-gray-400">Explore rich, detailed worlds crafted by artificial intelligence</p>
          </div>
        </div>
      </div>
    </div>
  )
}
