function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-bg">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🌲</div>
        <h1 className="text-2xl font-bold text-forest-primary mb-2">
          Forest Family
        </h1>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-forest-primary rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-forest-primary rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-forest-primary rounded-full animate-bounce delay-200" />
        </div>
        <p className="text-gray-600 mt-4">加载中...</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
