import { useEffect, useRef, useState } from "react";

export type CameraCaptureStatus =
  "idle" | "starting" | "ready" | "no-camera-access";

/**
 * Encapsulates camera access and still-frame capture via `getUserMedia` +
 * Canvas — no barcode decoding, unlike {@link import("@/components/ui/use-code-scanner").useCodeScanner}
 * which this deliberately does not reuse (#108, different concern: a photo,
 * not a code). A manual file upload must always stay available alongside this hook.
 */
export function useCameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraCaptureStatus>("idle");

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus("idle");
  }

  async function start() {
    if (!videoRef.current) return;

    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("ready");
    } catch {
      setStatus("no-camera-access");
    }
  }

  async function capture(): Promise<File | null> {
    const video = videoRef.current;
    if (!video || status !== "ready") return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.92),
    );
    if (!blob) return null;

    return new File([blob], `aufnahme-${Date.now()}.webp`, {
      type: "image/webp",
    });
  }

  useEffect(() => stop, []);

  return { videoRef, status, start, stop, capture };
}
