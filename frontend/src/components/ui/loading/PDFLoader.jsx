const PDFLoader = ({ fileName }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center">
      
      {/* Animated PDF icon */}
      <div className="relative w-20 h-20 mx-auto mb-5">
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        {/* Spinning ring around icon */}
        <div className="absolute inset-0 rounded-2xl border-4 border-red-200 border-t-red-500 animate-spin"></div>
      </div>

      <h3 className="font-bold text-gray-900 text-lg mb-1">
        Generating PDF
      </h3>
      <p className="text-gray-500 text-sm mb-5">
        {fileName}
      </p>

      {/* Animated progress steps */}
      <div className="space-y-2 text-left">
        {[
          'Fetching student data...',
          'Building document...',
          'Finalizing PDF...'
        ].map((step, i) => (
          <div key={i} 
            className="flex items-center gap-2 text-sm opacity-0"
            style={{
              animation: `fadeIn 0.5s ease forwards`,
              animationDelay: `${i * 0.8}s`
            }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin flex-shrink-0">
            </div>
            <span className="text-gray-600">{step}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PDFLoader;
