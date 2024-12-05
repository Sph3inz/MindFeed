import { Clock } from 'lucide-react';

const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
        <Clock className="w-5 h-5 animate-spin" />
        <div>
          <div className="text-lg">One moment.</div>
          <div className="text-sm text-gray-400">I'm saving this for you.</div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
