"use client";
import React from "react";
import { useSeating } from "./useSeating";
import AppHeader from "@/components/AppHeader";
import SizeControls from "@/components/SizeControls";
import NameInputControls from "@/components/NameInputControls";
import AccommodationsPanel from "@/components/AccommodationsPanel";
import PresetControls from "@/components/PresetControls";
import Toolbar from "@/components/Toolbar";
import SeatingBoard from "@/components/SeatingBoard";
import UnassignedNames from "@/components/UnassignedNames";
import HelpPanel from "@/components/HelpPanel";
import CustomDialogs from "@/components/CustomDialogs";
import RevealBar from "@/components/RevealBar";
import Toasts from "@/components/Toasts";

export default function SeatingArranger() {
  const s = useSeating();

  return (
    <main className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-[1320px] mx-auto">
        <AppHeader s={s} />

        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
          <aside className="flex flex-col gap-4 no-print lg:sticky lg:top-6">
            <SizeControls s={s} />
            <NameInputControls s={s} />
            <AccommodationsPanel s={s} />
            <PresetControls s={s} />
          </aside>

          <div className="flex flex-col gap-4 print-area">
            <Toolbar s={s} />
            <SeatingBoard s={s} />
            <UnassignedNames s={s} />
            <HelpPanel />
          </div>
        </div>
      </div>

      <CustomDialogs s={s} />
      <RevealBar s={s} />
      <Toasts s={s} />
    </main>
  );
}
