"use client";

import { useState } from "react";
import { PillToggle } from "@/components/ui/pill-toggle";

const AMOUNTS = [
  { label: "5 â‚¬", value: "5" },
  { label: "15 â‚¬", value: "15" },
  { label: "30 â‚¬", value: "30" },
  { label: "Frei", value: "frei" },
];

export function DonationAmountPicker() {
  const [selected, setSelected] = useState("15");

  return (
    <PillToggle options={AMOUNTS} value={selected} onChange={setSelected} />
  );
}
