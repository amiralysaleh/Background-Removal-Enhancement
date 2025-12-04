import { GeneratedImage } from "../types";

/**
 * Adds a white stroke/outline to a transparent image to create a sticker effect.
 * This runs entirely in the browser using the Canvas API.
 */
export const addStickerStroke = async (
  imageBase64: string, 
  thickness: number = 8, 
  color: string = '#FFFFFF'
): Promise<GeneratedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Add padding to accommodate the stroke so it doesn't get cut off
        const padding = thickness * 2 + 10;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // 1. Create a Silhouette (solid color shape of the image)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
           reject(new Error("Could not get temp canvas context"));
           return;
        }

        // Draw original image
        tempCtx.drawImage(img, 0, 0);
        // Change all opaque pixels to the stroke color
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = color;
        tempCtx.fillRect(0, 0, img.width, img.height);

        // 2. Draw the stroke by drawing the silhouette repeatedly in a circle
        // This simulates a "stroke" or "dilation" operation
        const borderSteps = 36; // Number of copies to draw (higher = smoother corners)
        
        for (let i = 0; i < borderSteps; i++) {
            const angle = (i * 2 * Math.PI) / borderSteps;
            const x = (Math.cos(angle) * thickness) + padding;
            const y = (Math.sin(angle) * thickness) + padding;
            
            ctx.drawImage(tempCanvas, x, y);
        }

        // Fill the gaps inside the stroke (optional, makes it solid)
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tempCanvas, padding, padding);

        // 3. Draw the original image on top in the center
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, padding, padding);

        // 4. Return result
        const finalBase64 = canvas.toDataURL('image/png').split(',')[1];
        resolve({
          data: finalBase64,
          mimeType: 'image/png'
        });

      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for sticker processing."));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
};