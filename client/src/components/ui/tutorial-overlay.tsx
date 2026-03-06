import { useState, useEffect, useCallback, useRef } from "react";

interface TutorialStep {
  target: string; // data-tutorial attribute value
  text: string;
  placement?: "top" | "bottom" | "left" | "right";
  isFinal?: boolean;
  finalButtonText?: string;
}

const STEPS: TutorialStep[] = [
  {
    target: "shelf-logo",
    text: "welcome to the shelf! here's a quick tour.",
    placement: "bottom",
  },
  {
    target: "add-album-btn",
    text: "add albums to your shelf by searching spotify.",
    placement: "bottom",
  },
  {
    target: "sort-btn",
    text: "sort your shelf by different options.",
    placement: "bottom",
  },
  {
    target: "genre-filter-btn",
    text: "filter by genre.",
    placement: "bottom",
  },
  {
    target: "shuffle-btn",
    text: "shuffle picks a random album from your shelf.",
    placement: "top",
  },
  {
    target: "album-card",
    text: "tap an album to listen on your music service.",
    placement: "top",
  },
  {
    target: "nav-queue",
    text: "your queue shows what you're listening to next.",
    placement: "top",
  },
  {
    target: "nav-noskips",
    text: "no skips is your hall of fame — albums you'd listen to front to back.",
    placement: "top",
  },
  {
    target: "nav-list",
    text: "the list tracks every album you've reviewed.",
    placement: "top",
  },
  {
    target: "top25-btn",
    text: "create your top 25 songs of the year.",
    placement: "bottom",
  },
  {
    target: "account-btn",
    text: "connect spotify here to unlock currently playing and top 25 features.",
    placement: "bottom",
  },
  {
    target: "shelf-logo",
    text: "you're all set! enjoy the shelf.",
    placement: "bottom",
    isFinal: true,
    finalButtonText: "let's go!",
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const current = STEPS[step];

  const findNextVisibleStep = useCallback((fromStep: number): number => {
    for (let i = fromStep; i < STEPS.length; i++) {
      const el = document.querySelector(`[data-tutorial="${STEPS[i].target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        // Element must be visible (not hidden or zero-sized)
        if (r.width > 0 && r.height > 0) return i;
      }
    }
    return -1; // No visible steps remaining
  }, []);

  // On step change, find target or skip to next visible
  useEffect(() => {
    const visibleStep = findNextVisibleStep(step);
    if (visibleStep < 0) {
      onComplete();
      return;
    }
    if (visibleStep !== step) {
      setStep(visibleStep);
      return;
    }

    const el = document.querySelector(`[data-tutorial="${STEPS[step].target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [step, findNextVisibleStep, onComplete]);

  // Position tooltip relative to rect
  useEffect(() => {
    if (!rect || !tooltipRef.current) return;

    const pad = 12;
    const tW = tooltipRef.current.offsetWidth;
    const tH = tooltipRef.current.offsetHeight;
    const placement = current.placement || "bottom";

    let top = 0;
    let left = 0;

    if (placement === "bottom") {
      top = rect.bottom + pad;
      left = rect.left + rect.width / 2 - tW / 2;
    } else if (placement === "top") {
      top = rect.top - tH - pad;
      left = rect.left + rect.width / 2 - tW / 2;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - tH / 2;
      left = rect.right + pad;
    } else {
      top = rect.top + rect.height / 2 - tH / 2;
      left = rect.left - tW - pad;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - tW - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - tH - 12));

    setTooltipPos({ top, left });
  }, [rect, current.placement]);

  // Re-measure on resize/scroll
  useEffect(() => {
    const remeasure = () => {
      const el = document.querySelector(`[data-tutorial="${current.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [current.target]);

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      onComplete();
    } else {
      setTooltipPos(null);
      setRect(null);
      setStep(step + 1);
    }
  };

  const cutoutPad = 6;
  const ready = !!rect && !!tooltipPos;

  return (
    <div className="fixed inset-0 z-[10000]" style={{ visibility: ready ? "visible" : "hidden" }}>
      {/* Dark overlay with cutout */}
      {rect && (
        <>
          <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 1 }}>
            <defs>
              <mask id="tutorial-cutout">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - cutoutPad}
                  y={rect.top - cutoutPad}
                  width={rect.width + cutoutPad * 2}
                  height={rect.height + cutoutPad * 2}
                  rx="4"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.6)"
              mask="url(#tutorial-cutout)"
            />
          </svg>

          {/* Highlight border */}
          <div
            className="fixed border-2 border-green-400 rounded pointer-events-none"
            style={{
              top: rect.top - cutoutPad,
              left: rect.left - cutoutPad,
              width: rect.width + cutoutPad * 2,
              height: rect.height + cutoutPad * 2,
              zIndex: 2,
            }}
          />
        </>
      )}

      {/* Click blocker - prevents interacting with underlying UI */}
      <div className="fixed inset-0" style={{ zIndex: 2 }} />

      {/* Tooltip — always rendered so the ref can be measured */}
      <div
        ref={tooltipRef}
        className="fixed bg-white border-2 border-black font-mono p-4 shadow-lg"
        style={{
          top: tooltipPos?.top ?? -9999,
          left: tooltipPos?.left ?? -9999,
          zIndex: 3,
          maxWidth: "min(280px, calc(100vw - 24px))",
        }}
      >
        <p className="text-sm mb-4">{current.text}</p>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onComplete}
            className="text-xs text-black/50 hover:text-black"
          >
            skip tour
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-1.5 border border-black bg-green-300 font-mono text-xs hover:opacity-80"
          >
            {current.isFinal ? current.finalButtonText : "next"}
          </button>
        </div>
        <div className="text-[10px] text-black/40 mt-2 text-center">
          {step + 1} / {STEPS.length}
        </div>
      </div>
    </div>
  );
}
