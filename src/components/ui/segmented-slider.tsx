"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils/cn";

export type SegmentedSliderOption<T extends string> = {
  value: T;
  label: string;
};

/**
 * Discrete horizontal slider over a small, fixed set of string values.
 * Labels sit above the track (start/middle/.../end) and double as click
 * targets — the active one is highlighted in the accent color. Dragging the
 * thumb or clicking a label both set the value; there is no "none" state,
 * the value is always one of `options`.
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
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  function handleValueChange(nextIndex: number) {
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
            onClick={() => onChange(option.value)}
            className={cn(
              "text-muted-foreground text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              i === index && "text-primary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <SliderPrimitive.Root
        value={index}
        min={0}
        max={options.length - 1}
        step={1}
        disabled={disabled}
        onValueChange={handleValueChange}
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
