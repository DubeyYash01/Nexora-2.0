import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: "auto" | "half" | "full";
}

export function BottomSheet({ isOpen, onClose, title, children, height = "auto" }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setDragY(0);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const heightClass = height === "full" ? "max-h-[90vh]" : height === "half" ? "h-[50vh]" : "max-h-[90vh]";

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStart.current) return;
    const delta = e.targetTouches[0].clientY - dragStart.current;
    if (delta > 0) setDragY(delta);
  };

  const handleTouchEnd = () => {
    if (dragY > 80) onClose();
    else setDragY(0);
    dragStart.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end lg:hidden">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div
        className={`relative w-full ${heightClass} overflow-hidden flex flex-col`}
        style={{
          background: "#12121A",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid #2A2A3E",
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? "transform 0.3s ease-out" : "none",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <div
          className="flex-shrink-0 flex flex-col items-center pt-3 pb-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full mb-3" style={{ background: "#2A2A3E" }} />
          {title && (
            <div className="w-full flex items-center justify-between px-4 pb-3" style={{ borderBottom: "1px solid #2A2A3E" }}>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: "#6A6A8A" }} />
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
