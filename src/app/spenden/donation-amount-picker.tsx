"use client";

import { useState } from "react";
import { PillToggle } from "@/components/shared/pill-toggle";

const AMOUNTS = [
  { label: "5 €", value: "5" },
  { label: "15 €", value: "15" },
  { label: "30 €", value: "30" },
  { label: "Frei", value: "frei" },
];

export function DonationAmountPicker() {
  const [selected, setSelected] = useState("15");

  return (
    <PillToggle options={AMOUNTS} value={selected} onChange={setSelected} />
  );
}
