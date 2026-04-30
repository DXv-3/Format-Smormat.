import React from 'react';
import { Loader2 } from 'lucide-react';

const DotLoader: React.FC = () => {
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
    </div>
  );
};

export default DotLoader;
