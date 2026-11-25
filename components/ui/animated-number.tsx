"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useSpring, useTransform } from "framer-motion"

interface AnimatedNumberProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedNumber({ value, className, duration = 1 }: AnimatedNumberProps) {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const spring = useSpring(0, { duration: duration * 1000 })
  const display = useTransform(spring, (current) => Math.round(current))

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true)
          spring.set(value)
        }
      },
      { threshold: 0.1 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [spring, value, isInView])

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  )
}
