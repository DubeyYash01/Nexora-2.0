import { useRef } from "react";

export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
) {
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > minSwipeDistance) onSwipeLeft?.();
    if (distance < -minSwipeDistance) onSwipeRight?.();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
