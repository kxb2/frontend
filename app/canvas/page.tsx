import Header from '@/app/components/Header';
import Canvas from '@/app/canvas/_components/canvas';
import Toolbar from '@/app/canvas/_components/toolbar';

export default function CanvasPage() {
  return (
    <div>
      <Header />
      <main className="p-4">
        <p className="mb-4 text-sm text-gray-600">캔버스 창</p>
        <Canvas />
        <Toolbar />
      </main>
    </div>
  );
}