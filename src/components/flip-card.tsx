"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function FlipCard({
  front,
  back,
  className,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={cn("group relative h-full w-full overflow-hidden [isolation:isolate] [perspective:1000px]", className)}
      onDoubleClick={() => setFlipped(!flipped)}
    >
      <div
        className={cn(
        "relative grid h-full w-full touch-manipulation transition-transform duration-700 [transform-style:preserve-3d]",
          flipped ? "[transform:rotateY(180deg)]" : ""
        )}
      >
        {/* Front */}
        <div className="flip-card-face relative col-start-1 row-start-1 h-full w-full overflow-hidden">
          {front}
        </div>
        
        {/* Back */}
        <div className="flip-card-face absolute inset-0 h-full w-full overflow-hidden [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </div>
  );
}
