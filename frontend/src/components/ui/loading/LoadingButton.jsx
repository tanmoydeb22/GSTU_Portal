const LoadingButton = ({ 
  loading, 
  children, 
  onClick, 
  className = "",
  ...props 
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`
      relative flex items-center justify-center gap-2
      bg-green-600 text-white px-6 py-2.5 rounded-lg
      font-medium transition-all duration-200
      hover:bg-green-700 active:scale-95
      disabled:opacity-70 disabled:cursor-not-allowed
      ${className}
    `}
    {...props}
  >
    {loading ? (
      <>
        <svg 
          className="animate-spin h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>Please wait...</span>
      </>
    ) : children}
  </button>
);

export default LoadingButton;
