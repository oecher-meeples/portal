import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { notifyCodeDetected } from "@/components/ui/scan-feedback";

// Nur die hier tatsächlich gebrauchten Formate erkennen: QR (OM-BOX-XXXX-Lagereinheiten)
// und EAN-13/EAN-8 (Spiele). Ohne diese Einschränkung versucht der Reader bei jedem Frame
// alle Barcode-Formate (Micro QR, Aztec, Codabar, PDF417, …), was die Erkennung unzuverlässig macht.
const HINTS = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8],
  ],
]);

// Ein liegengelassener Barcode wird sonst bei jedem Video-Frame erneut erkannt —
// dieselbe Erkennung innerhalb dieses Fensters ignorieren wir, ein neuer Code
// (oder derselbe nach Ablauf) löst wieder aus.
const REDETECT_COOLDOWN_MS = 1500;

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
  const lastDetectionRef = useRef<{ text: string; at: number } | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [justDetected, setJustDetected] = useState(false);

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  }

  async function start() {
    if (!videoRef.current) return;

    setStatus("starting");
    const reader = new BrowserMultiFormatReader(HINTS);

    try {
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            const now = Date.now();
            const last = lastDetectionRef.current;
            if (
              last &&
              last.text === text &&
              now - last.at < REDETECT_COOLDOWN_MS
            ) {
              return;
            }
            lastDetectionRef.current = { text, at: now };

            notifyCodeDetected();
            setJustDetected(true);
            onDetected(text);
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

  useEffect(() => {
    if (!justDetected) return;
    const timeout = window.setTimeout(() => setJustDetected(false), 600);
    return () => window.clearTimeout(timeout);
  }, [justDetected]);

  return { videoRef, status, start, stop, justDetected };
}
