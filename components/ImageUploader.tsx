import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 data and mime type
      // result format: "data:image/jpeg;base64,/9j/4AAQSk..."
      const matches = result.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        onImageSelected(matches[2], matches[1]);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div 
      className={`relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer group
        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800/50'}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
        accept="image/*"
      />
      
      <div className="flex flex-col items-center space-y-4 text-slate-400 group-hover:text-slate-200 transition-colors">
        <div className="p-4 rounded-full bg-slate-800 shadow-xl">
          <Upload className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="font-medium text-lg">Click or drag image here</p>
          <p className="text-sm text-slate-500 mt-1">Supports JPG, PNG, WEBP</p>
        </div>
      </div>
    </div>
  );
};