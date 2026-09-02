"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils/cn";

/**
 * Zwei-Knoten-Bereichsschieberegler (#214-Folge) — fachfrei, nimmt nur Min/
 * Max/Wertebereich entgegen. Welche Größe gefiltert wird (Bewertung,
 * Erstveröffentlichungsjahr, …) entscheidet der Aufrufer.
 */
export function RangeSlider({
  min,
  max,
  step,
  value,
  onValueChange,
  onValueCommitted,
  getAriaLabel,
  className,
}: {
  min: number;
  max: number;
  /** @default 1 */
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  /** Fires once per drag/keystroke instead of on every intermediate step —
   * use this to trigger expensive follow-up work (e.g. a navigation). */
  onValueCommitted?: (value: [number, number]) => void;
  /** e.g. `(index) => (index === 0 ? "Von" : "Bis")` — required for screen readers. */
  getAriaLabel: (index: number) => string;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={(next) => onValueChange(next as [number, number])}
      onValueCommitted={(next) => onValueCommitted?.(next as [number, number])}
      className={cn("relative flex w-full items-center py-2", className)}
    >
      <SliderPrimitive.Control className="flex w-full items-center py-2">
        <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full grow rounded-full">
          <SliderPrimitive.Indicator className="bg-primary absolute h-full rounded-full" />
          <SliderPrimitive.Thumb
            index={0}
            getAriaLabel={getAriaLabel}
            className="border-primary bg-background focus-visible:ring-ring/50 block size-4 rounded-full border-2 shadow-sm outline-none focus-visible:ring-[3px]"
          />
          <SliderPrimitive.Thumb
            index={1}
            getAriaLabel={getAriaLabel}
            className="border-primary bg-background focus-visible:ring-ring/50 block size-4 rounded-full border-2 shadow-sm outline-none focus-visible:ring-[3px]"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

/**
 * Ein-Knoten-Schieberegler (#214-Folge) — für Filter, die eine exakte Größe
 * treffen sollen (z. B. "unterstützt genau N Spieler"), statt eines Von/Bis-
 * Bereichs.
 */
export function SingleSlider({
  min,
  max,
  step,
  value,
  onValueChange,
  onValueCommitted,
  getAriaLabel,
  className,
  /** #253: manche Filter (z. B. Spieleranzahl) treffen einen exakten Wert,
   * kein Von/Bis — der gefüllte Track suggeriert dort fälschlich einen
   * Bereich von `min` bis `value`. `true` blendet den Indikator aus, nur
   * der Thumb-Punkt bleibt sichtbar. @default false */
  hideTrackFill = false,
}: {
  min: number;
  max: number;
  /** @default 1 */
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  /** Fires once per drag/keystroke instead of on every intermediate step —
   * use this to trigger expensive follow-up work (e.g. a navigation). */
  onValueCommitted?: (value: number) => void;
  getAriaLabel: () => string;
  className?: string;
  hideTrackFill?: boolean;
}) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={(next) => onValueChange(next as number)}
      onValueCommitted={(next) => onValueCommitted?.(next as number)}
      className={cn("relative flex w-full items-center py-2", className)}
    >
      <SliderPrimitive.Control className="flex w-full items-center py-2">
        <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full grow rounded-full">
          {!hideTrackFill && (
            <SliderPrimitive.Indicator className="bg-primary absolute h-full rounded-full" />
          )}
          <SliderPrimitive.Thumb
            getAriaLabel={getAriaLabel}
            className="border-primary bg-background focus-visible:ring-ring/50 block size-4 rounded-full border-2 shadow-sm outline-none focus-visible:ring-[3px]"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
