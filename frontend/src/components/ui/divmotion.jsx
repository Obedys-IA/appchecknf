import React from "react";
import { cn } from "../../lib/utils";

export const DivMotion = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "transition-transform duration-200 ease-out will-change-transform hover:translate-y-[1px] hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};