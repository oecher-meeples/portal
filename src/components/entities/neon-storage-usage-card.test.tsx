import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NeonStorageUsageCard } from "@/components/entities/neon-storage-usage-card";

afterEach(() => {
  cleanup();
});

describe("NeonStorageUsageCard (#240)", () => {
  it("shows the ok tone below 75%", () => {
    render(
      <NeonStorageUsageCard
        usage={{ used: 1_000_000, limit: 429_496_729, percent: 0.23 }}
      />,
    );

    expect(screen.getByText("Im grünen Bereich")).toBeInTheDocument();
  });

  it("shows the warning tone from 75%", () => {
    render(
      <NeonStorageUsageCard
        usage={{ used: 322_122_547, limit: 429_496_729, percent: 75 }}
      />,
    );

    expect(screen.getByText("Wird knapp")).toBeInTheDocument();
  });

  it("shows the critical tone from 90%", () => {
    render(
      <NeonStorageUsageCard
        usage={{ used: 400_000_000, limit: 429_496_729, percent: 93.1 }}
      />,
    );

    expect(screen.getByText("Fast voll")).toBeInTheDocument();
    expect(screen.getByText("93.1 %")).toBeInTheDocument();
  });

  it("shows the branch-scope caveat", () => {
    render(
      <NeonStorageUsageCard
        usage={{ used: 1_000_000, limit: 429_496_729, percent: 0.23 }}
      />,
    );

    expect(screen.getByText(/Zeigt nur diesen Branch/)).toBeInTheDocument();
  });
});
