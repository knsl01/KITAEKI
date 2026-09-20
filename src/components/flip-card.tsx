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
      className={cn("group relative h-full w-full [perspective:1000px]", className)}
      onDoubleClick={() => setFlipped(!flipped)}
    >
      <div
        className={cn(
          "relative h-full w-full transition-all duration-700 [transform-style:preserve-3d]",
          flipped ? "[transform:rotateY(180deg)]" : ""
        )}
      >
        {/* Front */}
        <div className="w-full [backface-visibility:hidden]">
          {front}
        </div>
        
        {/* Back */}
        <div className="absolute top-0 left-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </div>
  );
}
