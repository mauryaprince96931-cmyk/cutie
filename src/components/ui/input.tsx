import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full rounded-[12px] border border-[rgba(0,0,0,0.15)] bg-[#fffafc] px-4 py-3 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-[#ffb3c6] focus-visible:ring-2 focus-visible:ring-[#ffb3c6]/20 outline-none transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

export { Input }
