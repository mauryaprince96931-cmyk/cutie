import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-primary/20",
        "data-[size=default]:h-[24px] data-[size=default]:w-[44px]", 
        "data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]",
        "data-checked:bg-[#f7a0b8] data-unchecked:bg-[rgba(90,58,66,0.2)]",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 hover:brightness-105",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white ring-0 transition-transform shadow-[0_2px_6px_rgba(0,0,0,0.15)]",
          "group-data-[size=default]/switch:size-[18px]",
          "group-data-[size=sm]/switch:size-[10px]",
          "group-data-[size=default]/switch:data-checked:translate-x-[23px]",
          "group-data-[size=sm]/switch:data-checked:translate-x-[12px]",
          "group-data-[size=default]/switch:data-unchecked:translate-x-[3px]",
          "group-data-[size=sm]/switch:data-unchecked:translate-x-[3px]",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
