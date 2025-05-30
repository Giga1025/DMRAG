import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-black mb-6">
            AI Dungeon Master
          </h1>
          <p className="text-xl text-black mb-12 max-w-2xl mx-auto">
            Embark on epic adventures with your AI-powered Dungeon Master. 
            Create characters, explore worlds, and experience D&D like never before.
          </p>
          
          <div className="flex gap-6 justify-center">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center text-black">
            <div className="text-4xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold mb-2">Dynamic Adventures</h3>
            <p className="text-black">AI-generated quests and storylines that adapt to your choices</p>
          </div>
          <div className="text-center text-black">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-semibold mb-2">Character Creation</h3>
            <p className="text-black">Build unique characters with detailed backstories and abilities</p>
          </div>
          <div className="text-center text-black">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">Immersive Worlds</h3>
            <p className="text-black">Explore rich, detailed worlds crafted by artificial intelligence</p>
          </div>
        </div>
      </div>
    </div>
  )
}
