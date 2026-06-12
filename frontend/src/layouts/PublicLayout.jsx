import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
         style={{ backgroundImage: "url('/campus.jpg')" }}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-brand-900/10 to-brand-950/40" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 animate-fade-in">
          {/* Logo with clean white backing and subtle glow */}
          <div className="inline-flex mb-4 relative">
            <div className="absolute -inset-4 bg-white/20 rounded-2xl blur-xl" />
            <div className="relative p-1 bg-white shadow-xl rounded-2xl border border-gray-100">
              <img src="/gstu_logo.png" alt="GSTU Logo" className="h-20 w-20 object-contain rounded-xl" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">GSTU Portal</h1>
          <p className="text-white/90 text-xs md:text-sm mt-1.5 font-medium drop-shadow-md">Gopalganj Science & Technology University</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
