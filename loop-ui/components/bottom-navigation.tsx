"use client"

import { Home, Compass, Plus, MessageCircle, User, Bell } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useTransition, useEffect } from "react"

interface BottomNavigationProps {
  currentPage: "home" | "discover" | "upload" | "inbox" | "profile"
  onNavigate: (page: string) => void
  isAuthenticated: boolean
  unreadCount?: number
  onNotificationClick?: () => void
}

export function BottomNavigation({
  currentPage,
  onNavigate,
  isAuthenticated,
  unreadCount = 0,
  onNotificationClick,
}: BottomNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Prefetch pages on mount and hover
  useEffect(() => {
    router.prefetch("/")
    router.prefetch("/discover")
  }, [router])

  const handleUploadClick = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    startTransition(() => {
    router.push("/studio/upload")
    })
  }

  const handleNavigate = (page: string) => {
    // Prefetch immediately
    if (page === "/") {
      router.prefetch("/")
    } else if (page === "/discover") {
      router.prefetch("/discover")
    }
    
    // Use requestAnimationFrame to ensure smooth transition
    requestAnimationFrame(() => {
      startTransition(() => {
        onNavigate(page)
      })
    })
  }

  const handleMouseEnter = (page: string) => {
    if (page === "/") {
      router.prefetch("/")
    } else if (page === "/discover") {
      router.prefetch("/discover")
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 z-40 py-2 px-4 will-change-transform bottom-navigation">
      <div className="flex items-center justify-around max-w-xl mx-auto">
        <button 
          onClick={() => handleNavigate("/")} 
          onMouseEnter={() => handleMouseEnter("/")}
          className="flex flex-col items-center gap-0.5 py-1 px-3 transition-opacity disabled:opacity-50"
          disabled={isPending || pathname === "/"}
        >
          <Home className={`w-6 h-6 ${currentPage === "home" ? "text-white" : "text-neutral-400"}`} />
          <span className={`text-[10px] ${currentPage === "home" ? "text-white" : "text-neutral-400"}`}>Home</span>
        </button>

        <button 
          onClick={() => handleNavigate("/discover")} 
          onMouseEnter={() => handleMouseEnter("/discover")}
          className="flex flex-col items-center gap-0.5 py-1 px-3 transition-opacity disabled:opacity-50"
          disabled={isPending || pathname === "/discover"}
        >
          <Compass className={`w-6 h-6 ${currentPage === "discover" ? "text-white" : "text-neutral-400"}`} />
          <span className={`text-[10px] ${currentPage === "discover" ? "text-white" : "text-neutral-400"}`}>
            Discover
          </span>
        </button>

        <button onClick={handleUploadClick} className="relative -mt-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/50">
            <Plus className="w-6 h-6 text-white" />
          </div>
        </button>

        <button
          onClick={() => (onNotificationClick ? onNotificationClick() : handleNavigate("/inbox"))}
          className="relative flex flex-col items-center gap-0.5 py-1 px-3 transition-opacity disabled:opacity-50"
          disabled={isPending}
        >
          <div className="relative">
            <Bell className={`w-6 h-6 ${currentPage === "inbox" ? "text-white" : "text-neutral-400"}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${currentPage === "inbox" ? "text-white" : "text-neutral-400"}`}>
            Notifications
          </span>
        </button>

        <button 
          onClick={() => handleNavigate("profile")} 
          className="flex flex-col items-center gap-0.5 py-1 px-3 transition-opacity disabled:opacity-50"
          disabled={isPending}
        >
          <User className={`w-6 h-6 ${currentPage === "profile" ? "text-white" : "text-neutral-400"}`} />
          <span className={`text-[10px] ${currentPage === "profile" ? "text-white" : "text-neutral-400"}`}>
            Profile
          </span>
        </button>
      </div>
    </div>
  )
}
