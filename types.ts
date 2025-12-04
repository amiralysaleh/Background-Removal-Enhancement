export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT = "3:4",
  LANDSCAPE = "4:3",
  MOBILE_PORTRAIT = "9:16",
  WIDE = "16:9"
}

export interface GeneratedImage {
  data: string; // base64 string
  mimeType: string;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
}