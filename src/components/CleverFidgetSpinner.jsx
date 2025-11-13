import { useEffect, useState } from "react";

export const CleverFidgetSpinner = () => {
  const [rotation, setRotation] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const listener = (event) => setReduceMotion(event.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const spin = () => {
    if (reduceMotion) return;
    const turns = Math.floor(Math.random() * 3) + 2; // 2–4 turns for more satisfying spin
    setRotation((prev) => prev + 360 * turns);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      spin();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Clever Pixel fidget spinner. Press to spin."
      onClick={spin}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="
        inline-flex items-center justify-center
        rounded-lg bg-white shadow-md border border-slate-200
        p-2 cursor-pointer select-none
        transition-all duration-300 ease-out
        hover:shadow-xl hover:scale-110
        active:scale-95
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-blue)] focus-visible:ring-offset-2
      "
    >
      <div
        className={`
          grid grid-cols-2 grid-rows-2 gap-[3px]
          rounded-xl overflow-hidden
          transition-transform duration-700 ease-out
          ${isHovered ? 'scale-105' : ''}
        `}
        style={{ transform: reduceMotion ? "none" : `rotate(${rotation}deg)` }}
      >
        <div className="w-7 h-7 md:w-8 md:h-8 bg-[var(--cp-green)] transition-all duration-200 hover:brightness-110" />
        <div className="w-7 h-7 md:w-8 md:h-8 bg-[var(--cp-red)] transition-all duration-200 hover:brightness-110" />
        <div className="w-7 h-7 md:w-8 md:h-8 bg-[var(--cp-yellow)] transition-all duration-200 hover:brightness-110" />
        <div className="w-7 h-7 md:w-8 md:h-8 bg-[var(--cp-blue)] transition-all duration-200 hover:brightness-110" />
      </div>
    </div>
  );
};

