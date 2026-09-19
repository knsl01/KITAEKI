"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

type EditContextValue = { editing: boolean; setEditing: (value: boolean) => void };

const EditContext = createContext<EditContextValue>({ editing: false, setEditing: () => {} });

/** Membagikan status "sedang mengatur widget" antara tombol di banner dan papan widget. */
export function DashboardEditProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const value = useMemo(() => ({ editing, setEditing }), [editing]);
  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}

export function useDashboardEdit() {
  return useContext(EditContext);
}

/** Tombol pembuka mode atur widget, dipasang di banner. */
export function EditWidgetsButton() {
  const { editing, setEditing } = useDashboardEdit();

  return (
    <button
      type="button"
      disabled={editing}
      onClick={() => setEditing(true)}
      className={cn(
        "icon-lift flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        editing ? "bg-white text-neutral-900" : "bg-white/10 text-white hover:bg-white/20"
      )}
    >
      <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{editing ? "Sedang mengatur" : "Atur widget"}</span>
      <span className="sr-only sm:hidden">Atur widget</span>
    </button>
  );
}
