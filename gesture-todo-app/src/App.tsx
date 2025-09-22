/** @format */

import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Gesture Todo App
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Control your todos with hand gestures
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-center text-gray-500 dark:text-gray-400">
              Project initialized successfully! 🎉
            </p>
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-2">
              Ready for implementation of Todo and Gesture features
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
