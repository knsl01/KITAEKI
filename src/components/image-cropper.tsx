"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import getCroppedImg from "@/lib/cropImage";
import { Loader2 } from "lucide-react";

type ImageCropperProps = {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropCompleteAction: (croppedBlob: Blob) => Promise<void>;
  aspect?: number;
};

export function ImageCropper({
  isOpen,
  imageSrc,
  onClose,
  onCropCompleteAction,
  aspect = 16 / 9,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    try {
      setIsProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (croppedBlob) {
        await onCropCompleteAction(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sesuaikan Foto</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 bg-black/10 rounded-md overflow-hidden min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-muted-foreground w-12">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Potong & Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
