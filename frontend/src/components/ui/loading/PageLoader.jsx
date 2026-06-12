const PageLoader = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    
    {/* Spinning ring */}
    <div className="relative w-14 h-14">
      {/* Background ring */}
      <div className="absolute inset-0 rounded-full border-4 border-green-100"></div>
      {/* Spinning ring */}
      <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center p-2"><img src="/gstu_logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" /></div>
    </div>
    
    <p className="text-gray-500 text-sm animate-pulse">
      {message}
    </p>
  </div>
);

export default PageLoader;
