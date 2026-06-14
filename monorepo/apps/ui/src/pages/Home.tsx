import AnalyticsPreview from "@/components/AnalyticsPreview";
import Preview from "@/components/Preview";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { listPhotos, togglePhotoLike } from "@/services/photosService";
import { PhotoData } from "@/types";
import { ChartNoAxesColumn, Heart } from "lucide-react";
import { useEffect, useState } from "react";

function transformer(
  photo: PhotoData,
  index: number,
  setSelectedPhoto: (photo: PhotoData | null) => void,
  setSelectedAnalyticsPhoto: (photo: PhotoData | null) => void,
  isLoggedIn: boolean,
  onLike: (photo: PhotoData) => void,
) {
  return (
    <div
      key={index}
      className="mb-6 break-inside-avoid rounded-xl overflow-hidden group relative text-left"
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => setSelectedPhoto(photo)}
      >
        <img
          src={index % 2 === 0 ? photo.small : photo.large}
          alt={photo.title}
          className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
        />
      </button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute left-2 top-2 size-8 opacity-90"
        aria-label={`View analytics for ${photo.title}`}
        onClick={() => setSelectedAnalyticsPhoto(photo)}
      >
        <ChartNoAxesColumn className="size-4" />
      </Button>
      {isLoggedIn && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 size-8 opacity-90"
          aria-label={photo.likedByCurrentUser ? "Unlike photo" : "Like photo"}
          onClick={() => onLike(photo)}
        >
          <Heart
            className="size-4"
            fill={photo.likedByCurrentUser ? "currentColor" : "none"}
          />
        </Button>
      )}
      <button
        type="button"
        className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 duration-700 text-left"
        onClick={() => setSelectedPhoto(photo)}
      >
        <div className="text-white text-sm font-semibold">{photo.title}</div>
        <div className="text-white/80 text-xs">{photo.description}</div>
        {photo.authorNickname && (
          <div className="text-white/80 text-xs">by {photo.authorNickname}</div>
        )}
      </button>
    </div>
  );
}

const noMatches = () => (
  <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
    No matches. Try a different search.
  </div>
);

type HomeProps = {
  searchText: string;
};

const Home = ({ searchText }: HomeProps) => {
  const { isLoggedIn } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [selectedAnalyticsPhoto, setSelectedAnalyticsPhoto] =
    useState<PhotoData | null>(null);
  const [bucketPhotos, setBucketPhotos] = useState<PhotoData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPhotos = async () => {
      try {
        const photos = await listPhotos(searchText);
        if (!cancelled) setBucketPhotos(photos);
      } catch {
        if (!cancelled) setBucketPhotos([]);
      }
    };

    loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [searchText]);

  if (bucketPhotos === null) {
    return <div className="max-w-5xl mx-auto p-4 pt-0">Loading...</div>;
  }

  const handleLike = async (photo: PhotoData) => {
    try {
      const response = await togglePhotoLike(photo.id);
      setBucketPhotos((photos) =>
        photos?.map((item) =>
          item.id === photo.id
            ? { ...item, likedByCurrentUser: response.liked }
            : item,
        ) ?? null,
      );
    } catch {
      // The photos service remains the source of truth; a failed click leaves local state alone.
    }
  };

  const transformedImages = bucketPhotos.map((photo: PhotoData, index: number) =>
    transformer(
      photo,
      index,
      setSelectedPhoto,
      setSelectedAnalyticsPhoto,
      isLoggedIn,
      handleLike,
    ),
  );

  return (
    <div className="max-w-5xl mx-auto p-4 pt-0">
      {!bucketPhotos.length && noMatches()}

      {!selectedPhoto && !selectedAnalyticsPhoto && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-6">
          {transformedImages}
        </div>
      )}

      {selectedPhoto && (
        <Preview
          selectedPhoto={selectedPhoto}
          setSelectedPhoto={setSelectedPhoto}
        />
      )}

      {selectedAnalyticsPhoto && (
        <AnalyticsPreview
          selectedPhoto={selectedAnalyticsPhoto}
          setSelectedPhoto={setSelectedAnalyticsPhoto}
        />
      )}
    </div>
  );
};

export default Home;
