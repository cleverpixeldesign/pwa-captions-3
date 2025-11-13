import { useEffect, useState } from "react";

export const CleverFidgetSpinner = () => {
  const [rotation, setRotation] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

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
    const turns = Math.floor(Math.random() * 3) + 1; // 1–3 turns
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
      className="
        inline-flex items-center justify-center
        rounded-full bg-white shadow-md border border-slate-200
        p-1 cursor-pointer select-none
        transition-shadow duration-300 ease-out
        hover:shadow-lg
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
      "
    >
      <div
        className={`
          grid grid-cols-2 grid-rows-2 gap-[2px]
          rounded-xl overflow-hidden
          transition-transform duration-500 ease-out
        `}
        style={{ transform: reduceMotion ? "none" : `rotate(${rotation}deg)` }}
      >
        <div className="w-6 h-6 md:w-7 md:h-7 bg-emerald-400" />
        <div className="w-6 h-6 md:w-7 md:h-7 bg-rose-500" />
        <div className="w-6 h-6 md:w-7 md:h-7 bg-amber-400" />
        <div className="w-6 h-6 md:w-7 md:h-7 bg-blue-600" />
      </div>
    </div>
  );
};

