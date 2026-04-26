import { useState } from "react"
import { motion } from "framer-motion"
import "./switch.css"

const Switch = ({ checked = false, onCheckedChange }) => {
  const [isChecked, setIsChecked] = useState(checked)

  const handleToggle = () => {
    const newValue = !isChecked
    setIsChecked(newValue)
    onCheckedChange?.(newValue)
  }

  return (
    <motion.button
      role="switch"
      aria-checked={isChecked}
      onClick={handleToggle}
      className="app-switch"
      style={{
        background: isChecked ? "#1F2937" : "#D1D5DB",
      }}
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
    >
      <motion.span
        className="app-switch-knob"
        style={{
          background: isChecked ? "#FDE047" : "#374151",
        }}
        animate={{ x: isChecked ? 20 : 4 }}
        transition={{ type: "spring", stiffness: 700, damping: 30, bounce: 0 }}
      >
        {isChecked && (
          <motion.div
            className="app-switch-glow"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.02 }}
          />
        )}
      </motion.span>
    </motion.button>
  )
}

export default Switch
