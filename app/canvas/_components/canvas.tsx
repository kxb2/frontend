import CanvasSwitcher from '@/app/canvas/_components/canvasSwitcher';

export default function Canvas() {
  return (
    <div
      className="relative w-full h-full bg-background"
      style={{
        backgroundImage: 'linear-gradient(to right, #38393c 1px, transparent 1px), linear-gradient(to bottom, #38393c 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }}
    >
      <CanvasSwitcher />
    </div>
  );
}
