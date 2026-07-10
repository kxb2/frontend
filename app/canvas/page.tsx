import Canvas from '@/app/canvas/_components/canvas';
import Toolbar from '@/app/canvas/_components/toolbar';

export default function CanvasPage() {
  return (
    <main className="flex-1 min-h-0 flex flex-col p-4">
      <p className="mb-4 text-sm text-gray-600 shrink-0">캔버스 창</p>
      <div className="flex-1 min-h-0">
        <Canvas />
      </div>
      <Toolbar />
    </main>
  );
}