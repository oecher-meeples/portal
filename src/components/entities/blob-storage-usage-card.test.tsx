import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BlobStorageUsageCard } from "@/components/entities/blob-storage-usage-card";

afterEach(() => {
  cleanup();
});

describe("BlobStorageUsageCard", () => {
  it("shows the ok tone below 80%", () => {
    render(
      <BlobStorageUsageCard
        usage={{ used: 1_000_000, limit: 5_000_000_000, percent: 0.02 }}
      />,
    );

    expect(screen.getByText("Im grünen Bereich")).toBeInTheDocument();
  });

  it("shows the warning tone from 80%", () => {
    render(
      <BlobStorageUsageCard
        usage={{ used: 4_000_000_000, limit: 5_000_000_000, percent: 80 }}
      />,
    );

    expect(screen.getByText("Wird knapp")).toBeInTheDocument();
  });

  it("shows the critical tone from 95%", () => {
    render(
      <BlobStorageUsageCard
        usage={{ used: 4_800_000_000, limit: 5_000_000_000, percent: 96 }}
      />,
    );

    expect(screen.getByText("Fast voll")).toBeInTheDocument();
    expect(screen.getByText("96.0 %")).toBeInTheDocument();
  });
});
