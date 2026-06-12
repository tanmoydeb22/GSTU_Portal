const SplashScreen = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center z-50">
    
    {/* Logo */}
    <div className="relative mb-6">
      {/* Outer ring animation */}
      <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-30 scale-150"></div>
      
      {/* Logo circle */}
      <div className="relative w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center animate-[bounce_2s_ease-in-out_infinite] p-2">
        <img src="/gstu_logo.png" alt="GSTU Logo" className="w-full h-full object-contain rounded-xl" />
      </div>
    </div>

    {/* University name */}
    <h1 className="text-2xl font-bold text-gray-900 text-center leading-tight mb-1">
      GSTU Portal
    </h1>
    <p className="text-gray-500 text-sm text-center mb-8">
      Gopalganj Science & Technology University
    </p>

    {/* Loading dots */}
    <div className="flex gap-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2.5 h-2.5 bg-green-500 rounded-full"
          style={{
            animation: `bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
    </div>
  </div>
);

export default SplashScreen;
