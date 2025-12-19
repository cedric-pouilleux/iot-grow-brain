/**
 * useCountUp - Animate number changes with smooth counting effect
 * 
 * A lightweight Vue composable for animating numeric value transitions.
 * No external dependencies - uses native requestAnimationFrame.
 */
import { ref, watch, type Ref } from 'vue'

interface CountUpOptions {
  /** Animation duration in milliseconds (default: 500) */
  duration?: number
  /** Easing function (default: easeOutExpo) */
  easing?: (t: number) => number
  /** Number of decimal places (default: auto-detect) */
  decimals?: number
  /** Minimum change to trigger animation (default: 0.01) */
  threshold?: number
}

// Easing function: exponential ease-out for natural deceleration
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/**
 * Composable to animate a numeric value when it changes
 * 
 * @param sourceValue - Reactive reference to the source value
 * @param options - Animation configuration
 * @returns displayValue - Reactive reference to the animated display value
 */
export function useCountUp(
  sourceValue: Ref<number | undefined | null>,
  options: CountUpOptions = {}
): Ref<number | undefined | null> {
  const {
    duration = 500,
    easing = easeOutExpo,
    decimals,
    threshold = 0.01
  } = options

  const displayValue = ref<number | undefined | null>(sourceValue.value)
  let animationId: number | null = null
  let startValue = sourceValue.value ?? 0
  let targetValue = sourceValue.value ?? 0
  let startTime: number | null = null

  // Detect decimal places from a number
  const getDecimalPlaces = (num: number): number => {
    if (decimals !== undefined) return decimals
    const str = num.toString()
    const decimalIndex = str.indexOf('.')
    if (decimalIndex === -1) return 0
    return str.length - decimalIndex - 1
  }

  // Cancel any ongoing animation
  const cancelAnimation = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    startTime = null
  }

  // Animation frame handler
  const animate = (timestamp: number) => {
    if (startTime === null) startTime = timestamp
    
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easing(progress)
    
    const currentValue = startValue + (targetValue - startValue) * easedProgress
    const decimalPlaces = getDecimalPlaces(targetValue)
    
    // Round to appropriate decimal places
    displayValue.value = Number(currentValue.toFixed(decimalPlaces))
    
    if (progress < 1) {
      animationId = requestAnimationFrame(animate)
    } else {
      // Ensure we end exactly on target
      displayValue.value = targetValue
      animationId = null
      startTime = null
    }
  }

  // Watch for changes and animate
  watch(sourceValue, (newVal, oldVal) => {
    // Handle undefined/null values
    if (newVal === undefined || newVal === null) {
      cancelAnimation()
      displayValue.value = newVal
      return
    }
    
    // If previous value was undefined/null, set directly without animation
    if (oldVal === undefined || oldVal === null) {
      displayValue.value = newVal
      startValue = newVal
      targetValue = newVal
      return
    }
    
    // Check if change is significant enough to animate
    const change = Math.abs(newVal - oldVal)
    if (change < threshold) {
      displayValue.value = newVal
      return
    }
    
    // Start animation
    cancelAnimation()
    startValue = displayValue.value ?? oldVal
    targetValue = newVal
    animationId = requestAnimationFrame(animate)
  }, { immediate: true })

  return displayValue
}
