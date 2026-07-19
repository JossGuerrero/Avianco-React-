import { PlaneIcon } from './PlaneIcon';

export function FlyingPlaneDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      <div className="absolute right-[8%] top-[20%] opacity-[0.12] animate-fly-slow">
        <PlaneIcon size="lg" className="rotate-12 text-primary-light" />
      </div>
      <div className="absolute bottom-[25%] left-[5%] opacity-[0.08] animate-fly-slow-reverse [animation-delay:8s]">
        <PlaneIcon size="md" className="-rotate-6 text-white" />
      </div>
    </div>
  );
}
