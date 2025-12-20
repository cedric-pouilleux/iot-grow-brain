/**
 * useCardColors
 * 
 * Centralized color logic for sensor card components.
 * Maps color names to Tailwind classes for consistent theming.
 */
import { computed, type ComputedRef } from 'vue'

type CardColor = 'emerald' | 'orange' | 'amber' | 'blue' | 'violet' | 'pink' | 'cyan' | 'gray'

interface CardColorClasses {
  // Text colors
  valueColorClass: ComputedRef<string>
  darkerColorClass: ComputedRef<string>
  lightValueColorClass: ComputedRef<string>
  darkerValueColorClass: ComputedRef<string>
  
  // Background colors
  themeBgClass: ComputedRef<string>
  openBgClass: ComputedRef<string>
  activeItemBgClass: ComputedRef<string>
  
  // Hover colors
  hoverBgClass: ComputedRef<string>
  ctaHoverBgClass: ComputedRef<string>
  
  // Effects
  hoverShadowColor: ComputedRef<string>
}

export function useCardColors(color: ComputedRef<string> | string): CardColorClasses {
  const colorValue = computed(() => typeof color === 'string' ? color : color.value)

  // Main value text color
  const valueColorClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'text-emerald-600',
      orange: 'text-orange-500',
      amber: 'text-amber-500',
      blue: 'text-blue-500',
      violet: 'text-violet-500',
      pink: 'text-pink-500',
      cyan: 'text-cyan-500',
      gray: 'text-gray-400',
    }
    return map[colorValue.value] || 'text-gray-800'
  })

  // Lighter color for CTA icon when panel is open
  const darkerColorClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'text-emerald-300',
      orange: 'text-orange-300',
      amber: 'text-amber-300',
      blue: 'text-blue-300',
      violet: 'text-violet-300',
      pink: 'text-pink-300',
      cyan: 'text-cyan-300',
      gray: 'text-gray-300',
    }
    return map[colorValue.value] || 'text-gray-300'
  })

  // Light color for units in minimalist mode
  const lightValueColorClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'text-emerald-400 dark:text-emerald-400',
      orange: 'text-orange-400 dark:text-orange-400',
      amber: 'text-amber-400 dark:text-amber-400',
      blue: 'text-blue-400 dark:text-blue-400',
      violet: 'text-violet-400 dark:text-violet-400',
      pink: 'text-pink-400 dark:text-pink-400',
      cyan: 'text-cyan-400 dark:text-cyan-400',
      gray: 'text-gray-400 dark:text-gray-400',
    }
    return map[colorValue.value] || 'text-gray-400'
  })

  // Darker color for title in minimalist mode (one shade darker than value)
  const darkerValueColorClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'text-emerald-700 dark:text-emerald-300',
      orange: 'text-orange-700 dark:text-orange-300',
      amber: 'text-amber-700 dark:text-amber-300',
      blue: 'text-blue-700 dark:text-blue-300',
      violet: 'text-violet-700 dark:text-violet-300',
      pink: 'text-pink-700 dark:text-pink-300',
      cyan: 'text-cyan-700 dark:text-cyan-300',
      gray: 'text-gray-700 dark:text-gray-300',
    }
    return map[colorValue.value] || 'text-gray-700'
  })

  // Theme background for dropdown
  const themeBgClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'bg-emerald-500',
      orange: 'bg-orange-500',
      amber: 'bg-amber-500',
      blue: 'bg-blue-500',
      violet: 'bg-violet-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500',
      gray: 'bg-gray-500',
    }
    return map[colorValue.value] || 'bg-gray-500'
  })

  // Background when card is selected/open
  const openBgClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'bg-emerald-500 dark:bg-emerald-900/40',
      orange: 'bg-orange-500 dark:bg-orange-900/40',
      amber: 'bg-amber-500 dark:bg-amber-900/40',
      blue: 'bg-blue-500 dark:bg-blue-900/40',
      violet: 'bg-violet-500 dark:bg-violet-900/40',
      pink: 'bg-pink-500 dark:bg-pink-900/40',
      cyan: 'bg-cyan-500 dark:bg-cyan-900/40',
      gray: 'bg-gray-500 dark:bg-gray-700',
    }
    return map[colorValue.value] || 'bg-white dark:bg-gray-800'
  })

  // Active dropdown item background (600 shade)
  const activeItemBgClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'bg-emerald-600 hover:bg-emerald-600',
      orange: 'bg-orange-600 hover:bg-orange-600',
      amber: 'bg-amber-600 hover:bg-amber-600',
      blue: 'bg-blue-600 hover:bg-blue-600',
      violet: 'bg-violet-600 hover:bg-violet-600',
      pink: 'bg-pink-600 hover:bg-pink-600',
      cyan: 'bg-cyan-600 hover:bg-cyan-600',
      gray: 'bg-gray-600 hover:bg-gray-600',
    }
    return map[colorValue.value] || 'bg-gray-600 hover:bg-gray-600'
  })

  // Hover for non-active dropdown items
  const hoverBgClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'hover:bg-emerald-600',
      orange: 'hover:bg-orange-600',
      amber: 'hover:bg-amber-600',
      blue: 'hover:bg-blue-600',
      violet: 'hover:bg-violet-600',
      pink: 'hover:bg-pink-600',
      cyan: 'hover:bg-cyan-600',
      gray: 'hover:bg-gray-600',
    }
    return map[colorValue.value] || 'hover:bg-gray-600'
  })

  // CTA button hover
  const ctaHoverBgClass = computed(() => {
    const map: Record<string, string> = {
      emerald: 'hover:bg-emerald-500',
      orange: 'hover:bg-orange-500',
      amber: 'hover:bg-amber-500',
      blue: 'hover:bg-blue-500',
      violet: 'hover:bg-violet-500',
      pink: 'hover:bg-pink-500',
      cyan: 'hover:bg-cyan-500',
      gray: 'hover:bg-gray-500',
    }
    return map[colorValue.value] || 'hover:bg-gray-500'
  })

  // Shadow color for hover glow effect
  const hoverShadowColor = computed(() => {
    const map: Record<string, string> = {
      emerald: 'rgba(16, 185, 129, 0.4)',
      orange: 'rgba(249, 115, 22, 0.4)',
      amber: 'rgba(245, 158, 11, 0.4)',
      blue: 'rgba(59, 130, 246, 0.4)',
      violet: 'rgba(139, 92, 246, 0.4)',
      pink: 'rgba(236, 72, 153, 0.4)',
      cyan: 'rgba(6, 182, 212, 0.4)',
      gray: 'rgba(156, 163, 175, 0.3)',
    }
    return map[colorValue.value] || 'rgba(0, 0, 0, 0.2)'
  })

  return {
    valueColorClass,
    darkerColorClass,
    lightValueColorClass,
    darkerValueColorClass,
    themeBgClass,
    openBgClass,
    activeItemBgClass,
    hoverBgClass,
    ctaHoverBgClass,
    hoverShadowColor,
  }
}
