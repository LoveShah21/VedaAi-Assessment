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
  Sparkles, 
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
  const [settings, setSettings] = useState<{ schoolName: string; city: string } | null>(null);

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

    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/settings`);
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.warn("Failed to fetch settings in sidebar:", err);
      }
    };

    fetchGroupsCount();
    fetchSettings();
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
    <aside 
      className="w-full h-full lg:h-[calc(100vh-24px)] lg:w-[304px] bg-[#FFFFFF] border-r border-gray-150 lg:border-none flex flex-col justify-between items-center p-6 gap-8 z-30 font-sans lg:absolute lg:left-3 lg:top-3 lg:rounded-2xl lg:shadow-[0px_16px_48px_rgba(0,0,0,0.12),0px_32px_48px_rgba(0,0,0,0.2)] select-none"
    >
      {/* Top Group */}
      <div className="w-full flex flex-col gap-6">
        {/* Brand Logo */}
        <div className="flex items-center justify-start px-2">
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="VedaAI Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-[#1A1A1A] font-bold text-xl tracking-tight">
              VedaAI
            </span>
          </Link>
        </div>

        {/* Action Button: Create New */}
        <div className="w-full">
          <Link href="/assignments/create">
            <button className="w-full py-2.5 px-4 bg-[#1A1A1A] hover:bg-black active:scale-95 transition-all text-white font-bricolage font-semibold rounded-full flex items-center justify-center space-x-2 text-sm shadow-md border-2 border-[#F15A22]">
              <Sparkles className="w-4 h-4 text-[#F15A22]" />
              <span>Create Assignment</span>
            </button>
          </Link>
        </div>

        {/* Nav Menu */}
        <nav className="w-full flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gray-150/70 text-[#1A1A1A] font-bold shadow-sm"
                    : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1A1A] font-medium"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-[18px] h-[18px] ${isActive ? "text-[#1A1A1A]" : "text-gray-400"}`} />
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
      </div>

      {/* Bottom Group */}
      <div className="w-full flex flex-col gap-4">
        {/* Settings Link */}
        <Link
          href="/settings"
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            pathname === "/settings"
              ? "bg-gray-150/70 text-[#1A1A1A] font-bold shadow-sm"
              : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1A1A] font-medium"
          }`}
        >
          <Settings className={`w-[18px] h-[18px] ${pathname === "/settings" ? "text-[#1A1A1A]" : "text-gray-400"}`} />
          <span>Settings</span>
        </Link>

        {/* School Profile Card */}
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-150/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center overflow-hidden relative">
              <img 
                src="/Component 1-1.png" 
                alt="School Icon" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <School className="w-5 h-5 text-green-600 absolute" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#1A1A1A] truncate">
                {settings?.schoolName || "Delhi Public School"}
              </p>
              <p className="text-[10px] text-brand-secondary truncate font-semibold">
                {settings?.city || "Bokaro Steel City"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
