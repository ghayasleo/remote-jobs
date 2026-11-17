import { cn } from "@/app/lib/cn";
import { HTMLAttributes, ReactNode, memo } from "react";
import { tableWidth } from "../lib/table-col";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const Container = memo(function Container({
  children,
  className,
  ...props
}: ContainerProps) {
  return (
    <div className={cn("mx-auto px-7 box-content", `max-w-[${tableWidth}px]`, className)} {...props}>
      {children}
    </div>
  );
});

export default Container;
