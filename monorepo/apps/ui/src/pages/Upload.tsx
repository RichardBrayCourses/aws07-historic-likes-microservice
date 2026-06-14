import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadPhoto } from "@/services/photosService";

const Upload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a photo first.");
      return;
    }
    if (!imageName.trim()) {
      setError("Add a title first.");
      return;
    }

    setIsUploading(true);
    setMessage("");
    setError("");

    try {
      await uploadPhoto(
        selectedFile,
        imageName.trim(),
        imageDescription.trim() || null,
      );
      setMessage("Uploaded photo");
      setSelectedFile(null);
      setImageName("");
      setImageDescription("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 pt-0">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Upload photo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add artwork details and send the image to the gallery.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <Input
            value={imageName}
            maxLength={40}
            disabled={isUploading}
            placeholder="Artwork title"
            onChange={(event) => setImageName(event.target.value)}
          />
          <Input
            value={imageDescription}
            maxLength={120}
            disabled={isUploading}
            placeholder="Description"
            onChange={(event) => setImageDescription(event.target.value)}
          />
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={isUploading}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setMessage("");
              setError("");
            }}
          />

          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              {selectedFile.name} -{" "}
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || !imageName.trim()}
          >
            <UploadIcon />
            {isUploading ? "Uploading..." : "Upload photo"}
          </Button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Upload;
