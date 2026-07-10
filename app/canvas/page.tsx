import Canvas from '@/app/canvas/_components/canvas';
import Toolbar from '@/app/canvas/_components/toolbar';

export default function CanvasPage() {
  return (
    <main className="flex-1 min-h-0">
      <Canvas />
      <Toolbar />
    </main>
  );
}
