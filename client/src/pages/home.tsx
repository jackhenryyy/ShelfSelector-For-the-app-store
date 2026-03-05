import { useEffect, useMemo, useState } from "react";
import { useQueueAlbums, useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { openInMusicService } from "@/lib/spotify";
import { Album } from "@shared/schema";
import { BlurredBackground } from "@/components/ui/blurred-background";
import { AlbumFilterSort, FilterOption } from "@/components/ui/album-filter-sort";
import { EditableGenre } from "@/components/ui/editable-genre";
import { Dices } from "lucide-react";

function getBrightnessFromImageUrl(imageUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(128);

        const w = 24;
        const h = 24;
        canvas.width = w;
        canvas.height = h;

        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let total = 0;
        const count = w * h;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        resolve(total / count);
      } catch {
        resolve(128);
      }
    };

    img.onerror = () => resolve(128);
    img.src = imageUrl;
  });
}

export default function HomePage() {
  const [shuffleSource, setShuffleSource] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [filteredSource, setFilteredSource] = useState<any[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const [coverBrightness, setCoverBrightness] = useState<number>(128);

  const { queueAlbums, getRandomQueueAlbum } = useQueueAlbums();
  const { noSkipsAlbums, getRandomNoSkipsAlbum } = useNoSkipsAlbums();

  useEffect(() => {
    let sourceData = shuffleSource ? noSkipsAlbums || [] : queueAlbums || [];

    if (Object.keys(filterOptions).length > 0) {
      sourceData = sourceData.filter((item) => {
        if (filterOptions.genre && item.album.genre !== filterOptions.genre) return false;
        return true;
      });
    }

    setFilteredSource(sourceData);
  }, [queueAlbums, noSkipsAlbums, shuffleSource, filterOptions]);

  useEffect(() => {
    handleShuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSource]);

  useEffect(() => {
    if (!currentAlbum?.imageUrl) return;
    getBrightnessFromImageUrl(currentAlbum.imageUrl).then(setCoverBrightness);
  }, [currentAlbum?.imageUrl]);

  const isCoverBright = useMemo(() => coverBrightness >= 140, [coverBrightness]);

  // Detect web vs native using the <html> class set in main.tsx
  const isWeb = useMemo(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("web");
  }, []);

  const diceColorClass = useMemo(() => {
    return isCoverBright ? "text-black" : "text-white";
  }, [isCoverBright]);

  // LOGO: auto-contrast + subtle shadow
  const logoColorClass = useMemo(() => {
    return isCoverBright
      ? "text-black drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)]"
      : "text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]";
  }, [isCoverBright]);

  // LOGO "SLIDER" (px): + moves DOWN, - moves UP (only affects the logo)
  const logoNudgeY = 30;

  const handleShuffle = () => {
    let album: Album | null = null;

    if (filteredSource.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredSource.length);
      album = filteredSource[randomIndex]?.album ?? null;
    } else if (shuffleSource && noSkipsAlbums && noSkipsAlbums.length > 0) {
      const noSkipsAlbum = getRandomNoSkipsAlbum();
      album = noSkipsAlbum?.album ?? null;
    } else if (!shuffleSource && queueAlbums && queueAlbums.length > 0) {
      const queueAlbum = getRandomQueueAlbum();
      album = queueAlbum?.album ?? null;
    }

    setCurrentAlbum(album);
  };

  const handleDiceShuffle = () => {
    setIsRolling(true);
    handleShuffle();
    window.setTimeout(() => setIsRolling(false), 500);
  };

  const handleOpenInMusicService = () => {
    if (currentAlbum) openInMusicService(currentAlbum);
  };

  const getUniqueGenres = () => {
    const allAlbums = [...(queueAlbums || []), ...(noSkipsAlbums || [])];
    const genresSet = new Set<string>();
    allAlbums.forEach((item) => {
      if (item.album.genre) genresSet.add(item.album.genre);
    });
    return Array.from(genresSet);
  };

  const DiceButton = (
    <button
      type="button"
      data-tutorial="shuffle-btn"
      onClick={handleDiceShuffle}
      className={[
        "p-2",
        "bg-transparent border-0",
        "active:scale-[0.98] transition-transform",
        !isCoverBright
          ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
          : "drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]",
      ].join(" ")}
      aria-label="shuffle"
      title="shuffle"
    >
      <Dices className={`w-12 h-12 ${diceColorClass} ${isRolling ? "dice-roll" : ""}`} />
    </button>
  );

  return (
    <Layout hideNav={false}>
      <style>{`
        @keyframes diceRoll {
          0% { transform: rotate(0deg) scale(1); }
          35% { transform: rotate(140deg) scale(1.08); }
          70% { transform: rotate(280deg) scale(1.03); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .dice-roll {
          animation: diceRoll 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
      `}</style>

      <div className="relative w-full h-[100dvh] overflow-hidden">
        {/* Background pinned */}
        <div className="fixed inset-0 z-0">
          {currentAlbum && <BlurredBackground imageUrl={currentAlbum.imageUrl} blurPx={4} />}
        </div>

        {/* Content */}
        <div
          className="relative z-10 h-full flex flex-col overflow-hidden"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 4px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)",
          }}
        >
          {/* Top controls */}
          <div className="w-full max-w-md mx-auto px-4">
            <div className="flex items-center justify-center relative">
              <h1
                data-tutorial="shelf-logo"
                className={["text-lg font-mono text-center mt-1 mb-2", logoColorClass].join(" ")}
                style={{ transform: `translateY(${logoNudgeY}px)` }}
              >
                t h e&nbsp;&nbsp;s h e l f
              </h1>
            </div>

            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="flex translate-y-[40px] scale-[0.92] origin-top">
                <button
                  className={`px-4 py-2 border border-black ${
                    !shuffleSource ? "bg-green-300" : "bg-white"
                  } text-black font-mono text-sm`}
                  onClick={() => setShuffleSource(false)}
                >
                  the queue
                </button>

                <button
                  className={`px-4 py-2 border border-black border-l-0 ${
                    shuffleSource ? "bg-green-300" : "bg-white"
                  } text-black font-mono text-sm`}
                  onClick={() => setShuffleSource(true)}
                >
                  no skips
                </button>
              </div>
            </div>
          </div>

          {/* Album + left-aligned genre button */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-start px-4 -mt-[1px]">
            {/* Genre button */}
            <div data-tutorial="genre-filter-btn" className="w-full flex justify-center mt-7 mb-1 translate-y-[20px] relative z-[5000] pointer-events-auto">
              <div className="w-[22rem] sm:w-[26rem] flex justify-start">
                <AlbumFilterSort
                  onFilterChange={setFilterOptions}
                  showFilterOptions={true}
                  showGenreOnly={true}
                  totalCount={filteredSource.length}
                  uniqueGenres={getUniqueGenres()}
                  triggerStyle="text"
                  triggerTextClassName={
                    isCoverBright
                      ? "text-black"
                      : "text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]"
                  }
                />
              </div>
            </div>

            {/* Album + plaque */}
            <div className="mt-3 translate-y-[6px] relative z-[10] w-full flex flex-col items-center">
              {currentAlbum ? (
                <>
                  {/* Album art container is relative so WEB dice can sit top-right */}
                  <div data-tutorial="album-card" className="relative w-[22rem] sm:w-[26rem] shadow-md">
                    <div className="cursor-pointer" onClick={handleOpenInMusicService}>
                      <AlbumArt src={currentAlbum.imageUrl} alt={currentAlbum.name} size="large" />
                    </div>

                    {/* WEB ONLY: dice goes top-right over the album */}
                    {isWeb && (
                      <div className="absolute -top-14 -right-2 z-[3000] pointer-events-auto">
                        {DiceButton}
                      </div>
                    )}
                  </div>

                  {/* Text plaque */}
                  <div className="mt-3 w-full max-w-md mx-auto">
                    <div className="border border-black bg-white/85 backdrop-blur-sm px-3 py-2 text-center">
                      <h2 className="text-sm sm:text-base font-mono font-bold uppercase text-black">
                        {currentAlbum.name}
                      </h2>
                      <p className="text-xs font-mono font-bold text-black/80">
                        {currentAlbum.artist}
                      </p>

                      <div className="mt-1">
                        <div className="text-black font-mono font-bold flex justify-center">
                          <EditableGenre
                            albumId={currentAlbum.id}
                            genre={currentAlbum.genre}
                            className="justify-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-64 h-64 bg-gray-100 flex flex-col items-center justify-center p-2 text-center">
                  <p className="font-mono text-xs text-gray-500 mb-2">No albums available</p>
                  <p className="font-mono text-xs text-gray-500">Add albums to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NATIVE ONLY: keep dice fixed near bottom (app stays the same) */}
        {!isWeb && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[2000]"
            style={{
              bottom: "calc(env(safe-area-inset-bottom) + 90px)",
            }}
          >
            {DiceButton}
          </div>
        )}
      </div>
    </Layout>
  );
}
