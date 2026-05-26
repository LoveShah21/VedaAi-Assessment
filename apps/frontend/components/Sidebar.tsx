import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAssignmentStore } from "../store/useAssignmentStore";
import { 
  FileText, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  PlusCircle, 
  School,
  Wrench
} from "lucide-react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Sidebar() {
  const pathname = usePathname();
  const assignments = useAssignmentStore((state) => state.assignments);
  const count = assignments.length;

  const [groupsCount, setGroupsCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchGroupsCount = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/groups`);
        if (res.data && Array.isArray(res.data)) {
          setGroupsCount(res.data.length);
        } else if (res.data && typeof res.data.count === 'number') {
          setGroupsCount(res.data.count);
        }
      } catch (err) {
        console.warn("Failed to fetch groups count in sidebar, defaulting to 3.", err);
        setGroupsCount(3); // Fallback standard default
      }
    };
    fetchGroupsCount();
    
    // Periodically update groups count
    const interval = setInterval(fetchGroupsCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { 
      name: "Home", 
      href: "/", 
      icon: LayoutDashboard 
    },
    { 
      name: "Assignments", 
      href: "/assignments", 
      icon: FileText,
      badge: count > 0 ? count : undefined
    },
    { 
      name: "My Groups", 
      href: "/groups", 
      icon: Users,
      badge: groupsCount !== undefined && groupsCount > 0 ? groupsCount : undefined
    },
    { 
      name: "My Library", 
      href: "/library", 
      icon: BookOpen 
    },
    { 
      name: "AI Teacher's Toolkit",
      href: "/toolkit",
      icon: Wrench
    },
  ];

  return (
    <aside className="w-[260px] bg-brand-sidebar border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-30 font-sans">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-orange to-[#ff7d4d] flex items-center justify-center text-white font-extrabold text-lg">
            V
          </div>
          <span className="text-[#1A1A1A] font-bold text-xl tracking-tight">
            Veda<span className="text-brand-orange">AI</span>
          </span>
        </Link>
      </div>

      {/* Action Button: Create New */}
      <div className="p-4">
        <Link href="/assignments/create">
          <button className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-orange to-[#ff7d4d] hover:brightness-105 active:scale-95 transition-all text-white font-semibold rounded-full shadow-sm shadow-orange-500/10 flex items-center justify-center space-x-2 text-sm">
            <PlusCircle className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? "bg-gray-100 text-[#1A1A1A] font-semibold"
                  : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1A1A]"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#1A1A1A]" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-brand-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-full transition-all">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings Link and School Profile at Bottom */}
      <div className="border-t border-gray-100 bg-white">
        <Link
          href="/settings"
          className={`flex items-center space-x-3 px-6 py-3.5 text-sm font-medium transition-all ${
            pathname === "/settings"
              ? "bg-gray-100 text-[#1A1A1A] font-semibold"
              : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1A1A]"
          }`}
        >
          <Settings className={`w-4.5 h-4.5 ${pathname === "/settings" ? "text-[#1A1A1A]" : "text-gray-400"}`} />
          <span>Settings</span>
        </Link>

        {/* School Profile Card */}
        <div className="p-4 border-t border-gray-150 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-brand-orange">
              <School className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1A1A1A] truncate">
                Veda Intl School
              </p>
              <p className="text-[10px] text-brand-secondary truncate">
                Partner School
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" title="Live status" />
          </div>
        </div>
      </div>
    </aside>
  );
}
