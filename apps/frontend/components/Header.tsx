"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, User } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();

  // Generate Breadcrumbs & Title based on Route
  const getRouteDetails = () => {
    if (pathname.startsWith("/assignments/create")) {
      return {
        title: "Create Assessment",
        breadcrumbs: [
          { label: "Home", href: "/assignments" },
          { label: "Assignments", href: "/assignments" },
          { label: "Create", href: "/assignments/create" },
        ],
      };
    } else if (pathname.match(/^\/assignments\/[^\/]+$/)) {
      return {
        title: "View Assessment",
        breadcrumbs: [
          { label: "Home", href: "/assignments" },
          { label: "Assignments", href: "/assignments" },
          { label: "Details", href: pathname },
        ],
      };
    } else {
      return {
        title: "Assignments",
        breadcrumbs: [
          { label: "Home", href: "/assignments" },
          { label: "Assignments", href: "/assignments" },
        ],
      };
    }
  };

  const { title, breadcrumbs } = getRouteDetails();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between font-sans sticky top-0 z-20">
      {/* Breadcrumbs & Title */}
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
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-brand-dark leading-none">
              John Doe
            </p>
            <p className="text-[10px] text-brand-secondary mt-0.5">
              Teacher
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
