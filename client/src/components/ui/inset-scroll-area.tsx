import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

interface InsetScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  viewportClassName?: string;
  scrollbarClassName?: string;
  scrollbarTopClassName?: string;
  scrollbarBottomClassName?: string;
}

const InsetScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  InsetScrollAreaProps
>(
  (
    {
      className,
      viewportClassName,
      scrollbarClassName,
      scrollbarTopClassName = "top-12",
      scrollbarBottomClassName = "bottom-3",
      children,
      ...props
    },
    ref
  ) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className={cn("h-full w-full", viewportClassName)}>
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation="vertical"
      className={cn(
        "absolute right-0 w-2.5 touch-none select-none p-[1px]",
        scrollbarTopClassName,
        scrollbarBottomClassName,
        scrollbarClassName
      )}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-black/30 hover:bg-black/45 transition-colors" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));

InsetScrollArea.displayName = "InsetScrollArea";

export { InsetScrollArea };
