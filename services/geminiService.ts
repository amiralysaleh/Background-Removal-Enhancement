import { GoogleGenAI } from "@google/genai";
import { AspectRatio, GeneratedImage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface EditImageParams {
  imageBase64: string;
  imageMimeType: string;
  prompt: string;
  aspectRatio: AspectRatio;
}

export const editImageWithGemini = async ({
  imageBase64,
  imageMimeType,
  prompt,
  aspectRatio,
}: EditImageParams): Promise<GeneratedImage> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini.");
    }

    const parts = candidates[0].content.parts;
    let foundImage: GeneratedImage | null = null;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        foundImage = {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
        break;
      }
    }

    if (!foundImage) {
      const textPart = parts.find(p => p.text);
      if (textPart) {
        throw new Error(`Model returned text instead of image: ${textPart.text}`);
      }
      throw new Error("No image data found in response.");
    }

    return foundImage;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to process image with Gemini.");
  }
};

/**
 * Removes background using a robust Multi-Pass Algorithm:
 * 1. Smart Background Detection (Corner Sampling)
 * 2. Flood Fill (DFS) - Removes connected background
 * 3. Island Cleanup - Removes isolated background spots
 * 4. Edge Despill - Neutralizes green halos on subject borders
 */
export const removeBackgroundWithChromaKey = async ({
  imageBase64,
  imageMimeType,
}: { imageBase64: string, imageMimeType: string }): Promise<GeneratedImage> => {
  
  // 1. Generate image on a high-contrast Green Screen
  const prompt = "Isolate the main subject. Place the subject on a solid, flat, NEON GREEN background (Hex Code: #00FF00). IMPORTANT: The subject must be 100% opaque. Do not cast shadows on the background. Do not use gradients. The background must be pure RGB (0, 255, 0). Keep all subject details intact. Do not erode edges.";
  
  const generated = await editImageWithGemini({
    imageBase64,
    imageMimeType,
    prompt,
    aspectRatio: AspectRatio.SQUARE 
  });

  // 2. Process image to remove green pixels
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;
      const totalPixels = width * height;

      // --- Step A: Smart Background Detection ---
      const corners = [0, width-1, (height-1)*width, width*height-1];
      let rBg = 0, gBg = 255, bBg = 0; 
      let maxGreenness = -Infinity;
      
      corners.forEach(idx => {
          const pixelIdx = idx * 4;
          const r = data[pixelIdx];
          const g = data[pixelIdx + 1];
          const b = data[pixelIdx + 2];
          
          // Heuristic: How dominant is the green channel?
          const greenness = g - Math.max(r, b);
          
          if (greenness > maxGreenness) {
              maxGreenness = greenness;
              rBg = r;
              gBg = g;
              bBg = b;
          }
      });
      
      // --- Step B: Configuration ---
      const floodTolerance = 96; // Slightly increased for tighter cut
      const floodToleranceSq = floodTolerance * floodTolerance;
      const islandTolerance = 50; 
      const islandToleranceSq = islandTolerance * islandTolerance;
      
      const isCloseColor = (r: number, g: number, b: number, toleranceSq: number) => {
          const dr = r - rBg;
          const dg = g - gBg;
          const db = b - bBg;
          return (dr*dr + dg*dg + db*db) < toleranceSq;
      };

      const isGreenDominant = (r: number, g: number, b: number) => {
          return g > r && g > b;
      };

      // --- Step C: Pass 1 - Flood Fill (DFS) ---
      const stack: number[] = [];
      const visited = new Uint8Array(totalPixels); 
      
      const pushIfBg = (x: number, y: number) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const idx = y * width + x;
          if (visited[idx]) return;
          
          const pIdx = idx * 4;
          const r = data[pIdx];
          const g = data[pIdx+1];
          const b = data[pIdx+2];

          if (isCloseColor(r, g, b, floodToleranceSq) && isGreenDominant(r, g, b)) {
              stack.push(idx);
              visited[idx] = 1; 
          }
      };

      // Seed borders
      for (let x = 0; x < width; x++) { pushIfBg(x, 0); pushIfBg(x, height - 1); }
      for (let y = 0; y < height; y++) { pushIfBg(0, y); pushIfBg(width - 1, y); }
      
      while (stack.length > 0) {
          const idx = stack.pop()!;
          const pIdx = idx * 4;
          data[pIdx + 3] = 0; 

          const x = idx % width;
          const y = Math.floor(idx / width);

          pushIfBg(x + 1, y);
          pushIfBg(x - 1, y);
          pushIfBg(x, y + 1);
          pushIfBg(x, y - 1);
      }

      // --- Step D: Pass 2 - Strict Global Cleanup (Islands) ---
      for (let i = 0; i < totalPixels; i++) {
          const pIdx = i * 4;
          if (data[pIdx+3] > 0) { 
             const r = data[pIdx];
             const g = data[pIdx+1];
             const b = data[pIdx+2];
             
             if (isCloseColor(r, g, b, islandToleranceSq) && isGreenDominant(r, g, b)) {
                 data[pIdx+3] = 0; 
             }
          }
      }

      // --- Step E: Pass 3 - Edge Despill (Anti-Halo) ---
      // This step identifies opaque pixels that are adjacent to transparent ones.
      // If those edge pixels are green-dominant, we neutralize the color to gray/black/white.
      
      const dataCopy = new Uint8ClampedArray(data); // Read-only snapshot for neighbor checks

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const pIdx = idx * 4;
          
          // Skip if transparent
          if (data[pIdx + 3] === 0) continue;

          // Check neighbors to see if this is an edge pixel
          let isEdge = false;
          // Up, Down, Left, Right
          const neighbors = [
            (y - 1) * width + x,
            (y + 1) * width + x,
            y * width + (x - 1),
            y * width + (x + 1)
          ];

          for (const nIdx of neighbors) {
            if (nIdx >= 0 && nIdx < totalPixels) {
              // If neighbor is transparent, this is an edge
              if (dataCopy[nIdx * 4 + 3] === 0) {
                isEdge = true;
                break;
              }
            }
          }

          if (isEdge) {
             const r = data[pIdx];
             const g = data[pIdx+1];
             const b = data[pIdx+2];

             // If Green is dominant on the edge, it's likely a halo artifact.
             if (g > r && g > b) {
                 // Despill: Clamp Green channel to the max of Red and Blue.
                 // This effectively turns neon green into neutral grey/white, matching the subject luminosity.
                 const newVal = Math.max(r, b);
                 data[pIdx + 1] = newVal;

                 // Optional: Very slight feathering to smooth jagged edges
                 // data[pIdx + 3] = 230; 
             }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      
      const finalBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve({
        data: finalBase64,
        mimeType: 'image/png'
      });
    };
    img.onerror = () => reject(new Error("Failed to load generated image for processing"));
    img.src = `data:${generated.mimeType};base64,${generated.data}`;
  });
};