import { motion } from "framer-motion";
import { hoverLift, tUI, tFast, press } from "./motion";

// Motion-enhanced card component
// Usage: <MCard className="card">...</MCard>
export const MCard = motion.div;

// Motion-enhanced button component  
// Usage: <MButton className="btn-primary">Save</MButton>
export const MButton = motion.button;

// Pre-configured card with hover lift
// Usage: <CardLift className="card">...</CardLift>
export function CardLift({ children, className, ...props }) {
  return (
    <MCard
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={hoverLift}
      transition={tUI}
      className={className}
      {...props}
    >
      {children}
    </MCard>
  );
}

// Pre-configured button with press effect
// Usage: <ButtonPress className="btn-primary">Save</ButtonPress>
export function ButtonPress({ children, className, onClick, type, disabled, ...props }) {
  return (
    <MButton
      whileTap={disabled ? undefined : "tap"}
      variants={press}
      transition={tFast}
      className={className}
      onClick={onClick}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </MButton>
  );
}
