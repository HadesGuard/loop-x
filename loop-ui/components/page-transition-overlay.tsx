"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function PageTransitionOverlay() {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  useEffect(() => {
    if (prevPathname !== pathname) {
      setIsTransitioning(true)
      // Very short overlay to prevent flash, but not block content
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
      setPrevPathname(pathname)
      return () => clearTimeout(timer)
    }
  }, [pathname, prevPathname])

  // Don't show overlay if it's been more than 50ms
  if (!isTransitioning) return null

  return <div className="page-transition-overlay active" />
}

