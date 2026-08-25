"use client";

import { useState } from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils/cn";

export type SegmentedSliderOption<T extends string> = {
  value: T;
  label: string;
};

/** Fine-grained steps between two adjacent options — makes dragging feel
 * smooth (the thumb isn't limited to jumping between just the option
 * count's worth of stops) while the value still only ever settles on one
 * of `options` once released. */
const STEPS_PER_OPTION = 100;

/**
 * Discrete horizontal slider over a small, fixed set of string values.
 * Labels sit above the track (start/middle/.../end) and double as click
 * targets — the one nearest the thumb is highlighted in the accent color.
 * There is no "none" state, the value is always one of `options`.
 *
 * Internally the track uses a fine-grained range so dragging feels smooth;
 * on release the thumb snaps to the nearest option and `onChange` fires
 * once with that option's value — not on every intermediate pixel while
 * dragging. Callers typically wire this to a server action; firing on
 * every drag step would flood it with calls. A label click commits
 * immediately, as does a keyboard step (Home/End jump to the first/last
 * option, Shift+Arrow moves a full option at a time).
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
  const max = (options.length - 1) * STEPS_PER_OPTION;

  function indexToPosition(index: number) {
    return Math.max(0, index) * STEPS_PER_OPTION;
  }

  function positionToIndex(position: number) {
    return Math.min(
      options.length - 1,
      Math.max(0, Math.round(position / STEPS_PER_OPTION)),
    );
  }

  const committedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const committedPosition = indexToPosition(committedIndex);

  const [draftPosition, setDraftPosition] = useState(committedPosition);
  // Adjust state during render (React-recommended, no Effect) when the
  // external value changes — e.g. after a server response confirms it.
  const [prevCommittedPosition, setPrevCommittedPosition] =
    useState(committedPosition);
  if (committedPosition !== prevCommittedPosition) {
    setPrevCommittedPosition(committedPosition);
    setDraftPosition(committedPosition);
  }

  const nearestIndex = positionToIndex(draftPosition);

  function commit(index: number) {
    const option = options[index];
    setDraftPosition(indexToPosition(index));
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
            onClick={() => commit(i)}
            className={cn(
              "text-muted-foreground text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              i === nearestIndex && "text-primary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <SliderPrimitive.Root
        value={draftPosition}
        min={0}
        max={max}
        step={1}
        largeStep={STEPS_PER_OPTION}
        disabled={disabled}
        onValueChange={setDraftPosition}
        onValueCommitted={(position) => commit(positionToIndex(position))}
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
