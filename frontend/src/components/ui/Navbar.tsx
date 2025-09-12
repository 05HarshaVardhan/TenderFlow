// src/components/Navbar.tsx

"use client";

import { useRouter } from "next/router";
import { destroyCookie } from "nookies";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavbarProps {
  userName: string; // User's name for the avatar fallback
}

export function Navbar({ userName }: NavbarProps) {
  const router = useRouter();
  const currentPath = router.pathname; // e.g., /tenders/all, /tenders, /dashboard

  const handleSignOut = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include", // Important for sending the JWT cookie
      });
      sessionStorage.removeItem("welcomeToastShown");
      destroyCookie(null, "jwt", { path: "/" }); // Clear the client-side cookie
      toast.success("You have been signed out.");
      router.push("/auth/login"); // Redirect to login page
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  // Define navigation links
  const navLinks = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "My Tenders", path: "/tenders" },
    { label: "Tenders", path: "/tenders/all" },
    { label: "Applications", path: "/applications" },
  ];

  return (
    <header className="bg-background px-6 py-4 border-b border-muted flex items-center justify-between shadow-sm">
      <div
        onClick={() => router.push("/dashboard")}
        className="text-xl font-bold tracking-tight cursor-pointer text-primary"
      >
        TenderFlow.
      </div>

      <nav className="hidden md:flex gap-6 ml-10 items-center text-sm font-medium">
        {navLinks.map((link) => {
          let isActive = false;

          // Prefer exact match for top-level navigation items
          if (currentPath === link.path) {
            isActive = true;
          }
          // Special handling for "My Tenders" to also activate for nested routes like /tenders/123
          // but NOT for /tenders/all
          else if (link.path === "/tenders" && currentPath.startsWith("/tenders/") && !currentPath.startsWith("/tenders/all")) {
             isActive = true;
          }

          // For the "Tenders" (all) link, ensure it only matches exactly /tenders/all
          // (This is implicitly covered by the exact match above for link.path="/tenders/all")

          return (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              className={`px-1 pb-[2px] transition-colors border-b-2 ${
                isActive
                  ? "text-primary font-semibold border-primary"
                  : "text-muted-foreground border-transparent hover:text-primary hover:border-primary/50"
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* User Avatar and Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full w-9 h-9 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar>
            <AvatarFallback>
              {/* Displays the first letter of the user's name, or 'U' if not available */}
              {userName && typeof userName === 'string' && userName.length > 0
                ? userName.charAt(0).toUpperCase()
                : 'U'}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border border-border">
          <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}