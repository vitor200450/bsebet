import { useState, useCallback } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { X, Check, ZoomIn } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onMediaLoaded = (mediaSize: { width: number; height: number }) => {
    // Calculate the zoom level required to fit the image in the crop area
    // Use Math.max to "Contain" the image (fit the larger dimension)
    // REVERT: Use rendered width/height (mediaSize.width) because zoom applies to rendered size.
    // Removing animation fixes the "Unstable Dimensions" issue where rendered size was incorrect initially.
    const fitZoom = 250 / Math.max(mediaSize.width, mediaSize.height);

    // Set minZoom strictly to fitZoom.
    setMinZoom(fitZoom);

    // Auto-set zoom to fit on load
    setZoom(fitZoom);
  };

  const onCropCompleteHandler = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return "";
    }

    // Enforce a fixed output size (e.g., 512x512) to prevent massive canvases
    // when zooming out (which causes browser freeze and tiny images)
    const OUTPUT_SIZE = 512;

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    // Use natural dimensions! image.width might be 0 for non-DOM images
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;

    console.log("Cropping:", {
      pixelCrop,
      imgWidth,
      imgHeight,
      OUTPUT_SIZE,
    });

    // Calculate the scale factor between the "world" crop and our fixed canvas
    const scale = OUTPUT_SIZE / pixelCrop.width;

    // Calculate the destination coordinates for the image
    // We want the crop origin (pixelCrop.x, pixelCrop.y) to be at (0,0) on the canvas.
    // So the image origin (0,0) must me shifted by (-pixelCrop.x, -pixelCrop.y).
    // We then scale everything to fit the 512px box.
    const destX = -pixelCrop.x * scale;
    const destY = -pixelCrop.y * scale;
    const destWidth = imgWidth * scale;
    const destHeight = imgHeight * scale;

    console.log("Draw Params:", {
      destX,
      destY,
      destWidth,
      destHeight,
      scale,
    });

    // Draw the entire image at the calculated position.
    // The canvas will automatically clip whatever falls outside its bounds (0,0 to 512,512).
    ctx.drawImage(image, destX, destY, destWidth, destHeight);

    return new Promise((resolve) => {
      // Use toDataURL for Base64 (needed for backend) and image/png for transparency
      const base64 = canvas.toDataURL("image/png");
      resolve(base64);
    });
  };

  const handleSave = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg border-[3px] border-black shadow-[8px_8px_0_0_#000] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#ffc700] border-b-[3px] border-black p-4 flex items-center justify-between">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-black flex items-center gap-2">
            <span className="material-symbols-outlined">crop</span>
            AJUSTAR FOTO
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-80 bg-[#e6e6e6]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={3}
            aspect={1}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={onZoomChange}
            onMediaLoaded={onMediaLoaded}
            restrictPosition={false}
            cropSize={{ width: 250, height: 250 }}
            style={{
              containerStyle: { background: "#e6e6e6" },
              cropAreaStyle: {
                border: "3px solid black",
                boxShadow: "0 0 0 9999em rgba(0, 0, 0, 0.5)",
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="p-6 flex flex-col gap-4 bg-white">
          <div className="flex items-center gap-3">
            <ZoomIn size={20} className="text-black" strokeWidth={2.5} />
            <input
              type="range"
              value={zoom}
              min={minZoom}
              max={3}
              step={0.01}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer border-2 border-black"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 font-black uppercase text-sm border-[3px] border-black bg-white text-black hover:bg-gray-100 transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 font-black uppercase text-sm border-[3px] border-black bg-[#ccff00] text-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={4} />
              CONFIRMAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
