import { ChevronDownIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"

export function SelectDropdown({
  value,
  onValueChange,
  options,
  triggerClassName,
  align = "start",
  placeholder = "Select…",
}) {
  const selected = options.find(o => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("select-trigger", triggerClassName)}>
          <span className="select-trigger-label">{selected?.label ?? placeholder}</span>
          <ChevronDownIcon className="select-trigger-chevron" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map(opt => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
