"use client";

import { useState } from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils/cn";

export type SegmentedSliderOption<T extends string> = {
  value: T;
  label: string;
};

/**
 * Discrete horizontal slider over a small, fixed set of string values.
 * Labels sit above the track (start/middle/.../end) and double as click
 * targets — the active one is highlighted in the accent color. There is no
 * "none" state, the value is always one of `options`.
 *
 * `onChange` fires once per interaction — on drag release (snapped to the
 * nearest step) or on a label click — not on every intermediate pixel while
 * dragging. Callers typically wire this to a server action; firing on every
 * drag step would flood it with calls. The thumb still follows the pointer
 * smoothly during the drag via local draft state.
 */
export function SegmentedSlider<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  options: SegmentedSliderOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const committedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [draftIndex, setDraftIndex] = useState(committedIndex);
  // Adjust state during render (React-recommended, no Effect) when the
  // external value changes — e.g. after a server response confirms it.
  const [prevCommittedIndex, setPrevCommittedIndex] = useState(committedIndex);
  if (committedIndex !== prevCommittedIndex) {
    setPrevCommittedIndex(committedIndex);
    setDraftIndex(committedIndex);
  }

  function handleValueCommitted(nextIndex: number) {
    const option = options[nextIndex];
    if (option) onChange(option.value);
  }

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        {options.map((option, i) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              setDraftIndex(i);
              onChange(option.value);
            }}
            className={cn(
              "text-muted-foreground text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              i === draftIndex && "text-primary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <SliderPrimitive.Root
        value={draftIndex}
        min={0}
        max={options.length - 1}
        step={1}
        disabled={disabled}
        onValueChange={setDraftIndex}
        onValueCommitted={handleValueCommitted}
      >
        <SliderPrimitive.Control className="flex w-full items-center py-1">
          <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full rounded-full">
            <SliderPrimitive.Indicator className="bg-primary absolute h-full rounded-full" />
            <SliderPrimitive.Thumb className="border-primary bg-background focus-visible:ring-ring/50 block size-4 rounded-full border-2 shadow-sm outline-none focus-visible:ring-3" />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
}
