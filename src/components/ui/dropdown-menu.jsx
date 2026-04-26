import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import * as React from "react"
import { CheckIcon, ChevronRightIcon, DotFilledIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import "./dropdown-menu.css"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef(
  ({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn("dm-sub-trigger", inset && "dm-inset", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="dm-sub-chevron" />
    </DropdownMenuPrimitive.SubTrigger>
  )
)
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn("dm-sub-content", className)}
      {...props}
    />
  )
)
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef(
  ({ className, sideOffset = 4, onPointerDown, onPointerDownOutside, onCloseAutoFocus, ...props }, ref) => {
    const isCloseFromMouse = React.useRef(false)

    const handlePointerDown = React.useCallback((e) => {
      isCloseFromMouse.current = true
      onPointerDown?.(e)
    }, [onPointerDown])

    const handlePointerDownOutside = React.useCallback((e) => {
      isCloseFromMouse.current = true
      onPointerDownOutside?.(e)
    }, [onPointerDownOutside])

    const handleCloseAutoFocus = React.useCallback((e) => {
      if (onCloseAutoFocus) return onCloseAutoFocus(e)
      if (!isCloseFromMouse.current) return
      e.preventDefault()
      isCloseFromMouse.current = false
    }, [onCloseAutoFocus])

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn("dm-content", className)}
          onPointerDown={handlePointerDown}
          onPointerDownOutside={handlePointerDownOutside}
          onCloseAutoFocus={handleCloseAutoFocus}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    )
  }
)
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef(
  ({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn("dm-item", inset && "dm-inset", className)}
      {...props}
    />
  )
)
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef(
  ({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn("dm-checkbox-item", className)}
      checked={checked}
      {...props}
    >
      <span className="dm-item-indicator">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="dm-check-icon" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
)
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn("dm-radio-item", className)}
      {...props}
    >
      <span className="dm-item-indicator">
        <DropdownMenuPrimitive.ItemIndicator>
          <DotFilledIcon className="dm-dot-icon" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
)
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef(
  ({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn("dm-label", inset && "dm-inset", className)}
      {...props}
    />
  )
)
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn("dm-separator", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({ className, ...props }) => (
  <span className={cn("dm-shortcut", className)} {...props} />
)
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
