import { PhotoData } from "@/types";

interface PreviewProps {
  selectedPhoto: PhotoData;
  setSelectedPhoto: (selectedPhoto: PhotoData | null) => void;
}

const Preview = ({ selectedPhoto, setSelectedPhoto }: PreviewProps) => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-black p-4">
      <img
        className="w-full h-full object-contain"
        src={selectedPhoto.large}
        alt={selectedPhoto.title}
      />
      <button
        className="absolute top-5 right-5 z-10 flex items-center justify-center w-10 h-10 text-4xl font-bold opacity-40 hover:opacity-100 transition-opacity rounded-full bg-white/90 text-black"
        onClick={() => setSelectedPhoto(null)}
      >
        <span className="-translate-y-0.5">×</span>
      </button>
    </div>
  );
};

export default Preview;
