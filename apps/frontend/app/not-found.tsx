import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F4F4]">
      <span style={{ fontSize: 'clamp(6rem, 15vw, 10rem)', fontWeight: 700, color: '#F15A22', lineHeight: 1 }}>
        404
      </span>
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mt-4 mb-2">Page not found</h1>
      <p className="text-[#6B7280] mb-8 text-center max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/assignments"
        className="bg-[#1A1A1A] text-white rounded-full px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        ← Go to Assignments
      </Link>
    </div>
  );
}
