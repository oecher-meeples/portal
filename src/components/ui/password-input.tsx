"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const LONG_PRESS_MS = 350;

/**
 * Passwort-Input mit Augen-Button im Feld (#633).
 * - Kurzer Tap: Passwort dauerhaft sichtbar, erneuter Tap versteckt es wieder.
 * - Longpress (nur im versteckten Zustand): Passwort sichtbar, solange der
 *   Button gedrückt bleibt; beim Loslassen wieder versteckt.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const [pinned, setPinned] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    didLongPress.current = false;
    if (pinned) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    timer.current = setTimeout(() => {
      didLongPress.current = true;
      setPeeking(true);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    clearTimer();
    setPeeking(false);
  }

  function handleClick() {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    setPinned((value) => !value);
  }

  const visible = pinned || peeking;
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        aria-label={pinned ? "Passwort verbergen" : "Passwort anzeigen"}
        aria-pressed={pinned}
        onPointerDown={handlePointerDown}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onClick={handleClick}
        onContextMenu={(event) => event.preventDefault()}
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-1 my-auto flex size-6 touch-none items-center justify-center rounded-md outline-none select-none focus-visible:ring-3"
      >
        <Icon className="size-4" />
      </button>
    </div>
  );
}

/** Field + PasswordInput. */
export function PasswordField({
  id,
  label,
  hint,
  fieldClassName,
  ...inputProps
}: Omit<ComponentProps<typeof Input>, "type"> & {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  fieldClassName?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} className={fieldClassName}>
      <PasswordInput id={id} {...inputProps} />
    </Field>
  );
}
