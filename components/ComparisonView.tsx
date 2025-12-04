import React, { useState } from 'react';
import { Download, Check, X, Maximize2, Grid, Sun, Moon, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ComparisonViewProps {
  originalImage: string; // full data URL
  generatedImage: string; // full data URL
  onClose: () => void;
  onUseAsInput: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ originalImage, generatedImage, onClose, onUseAsInput }) => {
  const [viewMode, setViewMode] = useState<'split' | 'toggle'>('split');
  const [showOriginal, setShowOriginal] = useState(false);
  const [bgMode, setBgMode] = useState<'checker' | 'white' | 'black'>('checker');

  const handleDownload = (format: 'png' | 'jpeg') => {
    const link = document.createElement('a');
    link.href = generatedImage;
    
    if (format === 'jpeg' && generatedImage.startsWith('data:image/png')) {
       // Convert to jpeg
       const img = new Image();
       img.src = generatedImage;
       img.onload = () => {
         const canvas = document.createElement('canvas');
         canvas.width = img.width;
         canvas.height = img.height;
         const ctx = canvas.getContext('2d');
         if(ctx) {
            // Fill white background for JPEG transparency issues
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0,0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.download = `edited-image-${Date.now()}.jpg`;
            link.click();
         }
       }
       return;
    }

    link.download = `edited-image-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.click();
  };

  const getBgStyle = () => {
    switch (bgMode) {
      case 'white': return { backgroundColor: '#ffffff' };
      case 'black': return { backgroundColor: '#000000' };
      case 'checker': 
      default:
        return { 
          backgroundImage: `linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          backgroundColor: '#0f172a'
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
        <h3 className="font-semibold text-white">Result</h3>
        <div className="flex gap-2">
           <div className="flex bg-slate-800 rounded-lg p-1 mr-2 border border-slate-700">
              <button onClick={() => setBgMode('checker')} className={`p-1.5 rounded ${bgMode === 'checker' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Checkerboard">
                <Grid className="w-4 h-4" />
              </button>
              <button onClick={() => setBgMode('white')} className={`p-1.5 rounded ${bgMode === 'white' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`} title="White Background">
                <Sun className="w-4 h-4" />
              </button>
              <button onClick={() => setBgMode('black')} className={`p-1.5 rounded ${bgMode === 'black' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Black Background">
                <Moon className="w-4 h-4" />
              </button>
           </div>
           <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'split' ? 'toggle' : 'split')}>
              <Maximize2 className="w-4 h-4 mr-2"/> {viewMode === 'split' ? 'Single View' : 'Split View'}
           </Button>
           <Button variant="ghost" size="sm" onClick={onClose}>
             <X className="w-4 h-4" />
           </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 transition-colors duration-300"
           style={getBgStyle()}>
        
        {viewMode === 'split' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
            <div className="relative flex flex-col h-full rounded-lg overflow-hidden border border-slate-600/50 shadow-xl">
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-xs rounded text-white z-10 backdrop-blur-sm">Original</div>
                <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
            </div>
            <div className="relative flex flex-col h-full rounded-lg overflow-hidden border border-blue-500/30 shadow-xl shadow-blue-500/10">
                <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-xs rounded text-white z-10 shadow-lg">Edited</div>
                <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center"
               onMouseDown={() => setShowOriginal(true)}
               onMouseUp={() => setShowOriginal(false)}
               onMouseLeave={() => setShowOriginal(false)}
               onTouchStart={() => setShowOriginal(true)}
               onTouchEnd={() => setShowOriginal(false)}
          >
            <img 
              src={showOriginal ? originalImage : generatedImage} 
              alt="Result" 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-sm text-white pointer-events-none backdrop-blur-sm shadow-lg border border-white/10">
              Hold to see original
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <Button 
          variant="secondary" 
          onClick={onUseAsInput}
          className="w-full md:w-auto border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-400 text-blue-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Edit This Result
        </Button>

        <div className="flex items-center justify-center gap-3 w-full md:w-auto">
          <span className="text-slate-400 text-sm hidden sm:inline">Download:</span>
          <Button variant="secondary" onClick={() => handleDownload('png')}>
            <Download className="w-4 h-4 mr-2" /> PNG
          </Button>
          <Button variant="secondary" onClick={() => handleDownload('jpeg')}>
            <Download className="w-4 h-4 mr-2" /> JPG
          </Button>
        </div>
      </div>
    </div>
  );
};