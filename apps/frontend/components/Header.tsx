"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, User, ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const getRouteDetails = () => {
    if (pathname === "/") {
      return {
        title: "Dashboard",
        breadcrumbs: [
          { label: "Home", href: "/" },
        ],
      };
    } else if (pathname === "/groups") {
      return {
        title: "My Groups",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "My Groups", href: "/groups" },
        ],
      };
    } else if (pathname === "/library") {
      return {
        title: "My Library",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "My Library", href: "/library" },
        ],
      };
    } else if (pathname === "/settings") {
      return {
        title: "Settings",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "Settings", href: "/settings" },
        ],
      };
    } else if (pathname.startsWith("/assignments/create")) {
      return {
        title: "Create Assessment",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "Assignments", href: "/assignments" },
          { label: "Create", href: "/assignments/create" },
        ],
      };
    } else if (pathname.match(/^\/assignments\/[^\/]+$/)) {
      return {
        title: "View Assessment",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "Assignments", href: "/assignments" },
          { label: "Details", href: pathname },
        ],
      };
    } else {
      return {
        title: "Assignments",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "Assignments", href: "/assignments" },
        ],
      };
    }
  };

  const { title, breadcrumbs } = getRouteDetails();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between font-sans sticky top-0 z-20">
      {/* Breadcrumbs & Title */}
      <div className="flex items-center">
        <button onClick={() => router.back()} className="mr-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-brand-secondary hover:text-brand-dark" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col justify-center">
          <nav className="flex items-center space-x-1 text-xs text-brand-secondary mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.label} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-3 h-3 mx-1 text-gray-400" />}
                <Link href={crumb.href} className="hover:text-brand-orange transition-colors">
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
          <h1 className="text-lg font-bold text-brand-dark leading-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Notifications & Avatar */}
      <div className="flex items-center space-x-4">
        {/* Bell with red dot */}
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-brand-secondary hover:text-brand-dark">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User avatar */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-semibold">
            JD
          </div>
          <div className="hidden md:flex items-center space-x-1">
            <div className="text-left">
              <p className="text-xs font-semibold text-brand-dark leading-none">
                John Doe
              </p>
              <p className="text-[10px] text-brand-secondary mt-0.5">
                Teacher
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#6B7280] ml-1" />
          </div>
        </div>
      </div>
    </header>
  );
}
