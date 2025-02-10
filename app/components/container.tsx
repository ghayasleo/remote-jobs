import { cn } from "@/app/lib/cn";
import { HTMLAttributes, ReactNode, memo } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const Container = memo(function Container({
  children,
  className,
  ...props
}: ContainerProps) {
  return (
    <div className={cn("mx-auto px-7 md:container", className)} {...props}>
      {children}
    </div>
  );
});

export default Container;
