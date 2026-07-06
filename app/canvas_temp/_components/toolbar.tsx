export default function Toolbar() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-gray-500 text-white rounded-lg px-4 py-3">
      <button className="px-3 py-1.5 bg-gray-400 rounded">옵션</button>
      <button className="px-3 py-1.5 bg-gray-400 rounded">옵션</button>
      <button className="px-3 py-1.5 bg-gray-400 rounded">옵션</button>
      <button className="px-3 py-1.5 bg-gray-400 rounded">옵션</button>
    </div>
  );
}