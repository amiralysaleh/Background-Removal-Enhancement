import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { editImageWithGemini, removeBackgroundWithChromaKey } from './services/geminiService';
import { addStickerStroke } from './services/imageProcessing';
import { AspectRatio } from './types';
import { Wand2, Image as ImageIcon, Trash2, Maximize, Layers, Eraser, Sparkles, ScanLine, Stamp } from 'lucide-react';

interface ImageState {
  data: string; // base64
  mimeType: string;
}

function App() {
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [generatedImage, setGeneratedImage] = useState<ImageState | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the source of the generated image to determine if it has transparency
  const [generatedBy, setGeneratedBy] = useState<'remove-bg' | 'gemini' | 'sticker' | null>(null);
  // Track if the current original input is suitable for stickers (has transparency)
  const [isInputTransparent, setIsInputTransparent] = useState(false);

  const handleImageSelected = (base64: string, mimeType: string) => {
    setOriginalImage({ data: base64, mimeType });
    setGeneratedImage(null);
    setError(null);
    setIsInputTransparent(false); // Reset transparency flag for new uploads
    setGeneratedBy(null);
  };

  const handleUseResultAsInput = () => {
    if (generatedImage) {
      setOriginalImage(generatedImage);
      
      // If the generated image came from background removal or sticker creation, 
      // we assume the new input has transparency.
      if (generatedBy === 'remove-bg' || generatedBy === 'sticker') {
        setIsInputTransparent(true);
      } else {
        // Standard generation might lose transparency or create a full frame image
        setIsInputTransparent(false);
      }

      setGeneratedImage(null);
      setPrompt('');
      setError(null);
      setGeneratedBy(null);
    }
  };

  const handleStickerEffect = async () => {
    if (!originalImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const result = await addStickerStroke(originalImage.data, 8, '#FFFFFF');
        setGeneratedImage(result);
        setGeneratedBy('sticker');
    } catch (err: any) {
        setError("Failed to create sticker. Ensure the image has a transparent background first.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerate = async (overridePrompt?: string, useChromaKey = false) => {
    if (!originalImage) return;
    
    const promptToUse = overridePrompt || prompt;
    
    // For normal generation, we need a prompt. For chroma key (bg removal), the service handles the prompt internally.
    if (!useChromaKey && !promptToUse.trim()) {
      setError("Please enter a description of how you want to edit the image.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result;
      
      if (useChromaKey) {
        // Special workflow for background removal
        result = await removeBackgroundWithChromaKey({
          imageBase64: originalImage.data,
          imageMimeType: originalImage.mimeType,
        });
        setGeneratedBy('remove-bg');
      } else {
        // Standard generation
        result = await editImageWithGemini({
          imageBase64: originalImage.data,
          imageMimeType: originalImage.mimeType,
          prompt: promptToUse,
          aspectRatio: aspectRatio,
        });
        setGeneratedBy('gemini');
      }

      setGeneratedImage({
        data: result.data,
        mimeType: result.mimeType,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong while generating the image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setPrompt('');
    setError(null);
    setIsInputTransparent(false);
    setGeneratedBy(null);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-400 rounded-lg shadow-lg shadow-yellow-400/20">
               <Wand2 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Background Removal & Enhancement</h1>
              <p className="text-xs text-slate-400">Gemini 2.5 Flash Image</p>
            </div>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            AI-Powered
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Visuals */}
        <div className="flex-1 flex flex-col gap-6 min-h-[400px]">
          {error && (
             <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg animate-fade-in flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-red-500" />
               {error}
             </div>
          )}

          {!originalImage ? (
            <div className="flex-1 flex items-center justify-center">
               <div className="w-full max-w-xl">
                 <ImageUploader onImageSelected={handleImageSelected} />
               </div>
            </div>
          ) : !generatedImage ? (
            <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden relative flex items-center justify-center p-8">
              <img 
                src={`data:${originalImage.mimeType};base64,${originalImage.data}`} 
                alt="Original" 
                className="max-w-full max-h-[600px] object-contain shadow-2xl rounded-lg"
              />
              <button 
                onClick={handleReset}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-red-900/80 text-white rounded-full transition-colors backdrop-blur-sm"
                title="Remove Image"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-[500px]">
              <ComparisonView 
                originalImage={`data:${originalImage.mimeType};base64,${originalImage.data}`}
                generatedImage={`data:${generatedImage.mimeType};base64,${generatedImage.data}`}
                onClose={() => setGeneratedImage(null)}
                onUseAsInput={handleUseResultAsInput}
              />
            </div>
          )}
        </div>

        {/* Right Column: Controls */}
        <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
          
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Controls
            </h2>

            <div className="space-y-8">
              {/* Output Dimensions */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-blue-400" />
                  Output Dimensions
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.values(AspectRatio).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-1 py-2 text-xs rounded-md border transition-all ${
                        aspectRatio === ratio 
                        ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-lg shadow-blue-900/50 scale-105' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart Tools */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Smart Tools
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleGenerate("Remove background", true)}
                    className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 hover:border-pink-500/50 border border-slate-600/50 rounded-lg transition-all group"
                  >
                    <div className="p-2 bg-pink-500/20 rounded-md text-pink-400 group-hover:scale-110 transition-transform shadow-inner">
                      <Eraser className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-200 group-hover:text-white">Remove Background</div>
                      <div className="text-xs text-slate-400">Smart Auto-Masking (Green Screen)</div>
                    </div>
                  </button>

                  {/* Make Sticker Button - Only visible if input has transparency */}
                  {isInputTransparent && (
                    <button 
                      onClick={handleStickerEffect}
                      className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 hover:border-indigo-500/50 border border-slate-600/50 rounded-lg transition-all group animate-fade-in"
                    >
                      <div className="p-2 bg-indigo-500/20 rounded-md text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                        <Stamp className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-slate-200 group-hover:text-white">Make Sticker</div>
                        <div className="text-xs text-slate-400">Add white border stroke</div>
                      </div>
                    </button>
                  )}

                  <button 
                    onClick={() => {
                        // Very strict prompt for lossless enhancement
                        const p = "Enhance resolution and sharpness only. Do not change ANY details. Do not add anything. Do not remove anything. Keep the exact same subject, same colors, same composition. Just make it look higher quality.";
                        setPrompt(p);
                        handleGenerate(p, false);
                    }}
                    className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 hover:border-green-500/50 border border-slate-600/50 rounded-lg transition-all group"
                  >
                    <div className="p-2 bg-green-500/20 rounded-md text-green-400 group-hover:scale-110 transition-transform shadow-inner">
                      <Maximize className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-200 group-hover:text-white">Lossless Enhance</div>
                      <div className="text-xs text-slate-400">Smart Upscale (Strict Detail)</div>
                    </div>
                  </button>
                  
                </div>
              </div>

              {/* Text Prompt */}
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <label className="text-sm font-medium text-slate-300">Detailed Instructions</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your edit (e.g. 'Add a neon sign' or 'Apply a retro filter')"
                  className="w-full h-28 bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Generate Button */}
              <Button 
                onClick={() => handleGenerate()} 
                className="w-full py-4 text-lg font-semibold shadow-xl shadow-blue-900/20 hover:shadow-blue-900/40 transform transition-all active:scale-[0.98]"
                disabled={!originalImage || (!prompt && isLoading)}
                isLoading={isLoading}
              >
                {isLoading ? 'Processing...' : 'Generate Result'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;