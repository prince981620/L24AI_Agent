const LoadingSpinner = () => (
  <div className="flex items-center space-x-2">
    <div className="flex space-x-1.5">
      <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    </div>
  </div>
);

export default LoadingSpinner;
