
function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col h-2 sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-slate-600 font-medium">
              MentalBreakdown
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ©{new Date().getFullYear()} | V.1.2.1.1 (Beta) Created by Tawich P.
            </p>
          </div>
          <div className="flex items-center space-x-5">
            <a
              href="https://github.com/Homesick-prod/breakdown"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 text-slate-400 hover:text-slate-600 transition-colors"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}