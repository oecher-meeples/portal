import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export type ScannerStatus =
  "idle" | "starting" | "scanning" | "no-camera-access" | "no-code-detected";

/**
 * Encapsulates camera access and QR/barcode decoding via @zxing/browser — chosen
 * over the native BarcodeDetector API because it also works on iOS Safari.
 * A manual input field must always stay available alongside this hook.
 */
export function useCodeScanner({
  onDetected,
}: {
  onDetected: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  }

  async function start() {
    if (!videoRef.current) return;

    setStatus("starting");
    const reader = new BrowserMultiFormatReader();

    try {
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            onDetected(result.getText());
            return;
          }
          if (error) {
            setStatus((current) =>
              current === "scanning" ? "no-code-detected" : current,
            );
          }
        },
      );
      controlsRef.current = controls;
      setStatus("scanning");
    } catch {
      setStatus("no-camera-access");
    }
  }

  useEffect(() => stop, []);

  return { videoRef, status, start, stop };
}
