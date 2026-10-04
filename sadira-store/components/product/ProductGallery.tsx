"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

export interface ProductGalleryProps {
  name: string;
  images: string[];
  videoSrc?: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAutoSelect: (index: number) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
}

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
const pageVisible = () => document.visibilityState === "visible";
const serverMotion = () => true;
const serverVisibility = () => false;

/**
 * Main photo (whole product visible: object-contain in a 4:5 frame) with a
 * thumbnail strip — beside it on desktop, below it on mobile. Controlled by
 * the parent so option selectors (e.g. scarf design) can switch the photo.
 */
export function ProductGallery({ name, images, videoSrc, activeIndex, onSelect, onAutoSelect, playing, onPlayingChange }: ProductGalleryProps) {
  const count = images.length;
  const [hovered, setHovered] = useState(false);
  const [showingVideo, setShowingVideo] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribeMotion, reducedMotion, serverMotion);
  const visible = useSyncExternalStore(subscribeVisibility, pageVisible, serverVisibility);
  const go = (step: number) => onSelect((activeIndex + step + count) % count);
  useEffect(() => {
    if (showingVideo || !playing || reduceMotion || !visible || hovered || count <= 1) return;
    const timer = window.setTimeout(() => onAutoSelect((activeIndex + 1) % count), 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, count, playing, reduceMotion, visible, hovered, showingVideo, onAutoSelect]);

  return (
    // items-start: stop the row stretching the main frame past its 4:5 ratio.
    // max-w on tablet so the stacked photo doesn't get taller than the screen.
    <div className="flex min-w-0 w-full flex-col gap-3 md:mx-auto md:max-w-xl lg:max-w-none lg:flex-row-reverse lg:items-start lg:gap-4"
      onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={event => {
        if (!(event.target as HTMLElement).closest('[aria-label="Pause slideshow"], [aria-label="Play slideshow"]')) onPlayingChange(false);
      }}>
      <div className="relative aspect-[4/5] min-w-0 w-full overflow-hidden rounded-2xl border border-line bg-blush/40 lg:flex-1">
        {showingVideo && videoSrc ? (
          <video
            key={videoSrc}
            aria-label={`${name} product video`}
            controls
            playsInline
            preload="none"
            poster={images[0]}
            className="absolute inset-0 h-full w-full object-contain"
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser cannot play this video. <a href={videoSrc}>Open product video</a>.
          </video>
        ) : <Image
          key={images[activeIndex]}
          src={images[activeIndex]}
          alt={`${name} product image ${activeIndex + 1}`}
          fill
          loading="eager"
          fetchPriority={activeIndex === 0 ? "high" : "auto"}
          sizes="(min-width: 1440px) 680px, (min-width: 1024px) 48vw, 100vw"
          className="object-contain"
        />}
        {!showingVideo && count > 1 && (
          <>
            {!reduceMotion && <IconButton
              label={playing ? "Pause slideshow" : "Play slideshow"}
              icon={playing ? <Pause /> : <Play />}
              variant="soft" size="sm"
              onClick={() => onPlayingChange(!playing)}
              className="absolute bottom-3 left-3 z-10 bg-white/85"
            />}
            <IconButton
              label="Previous image"
              icon={<ChevronLeft />}
              variant="soft"
              size="sm"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/85"
            />
            <IconButton
              label="Next image"
              icon={<ChevronRight />}
              variant="soft"
              size="sm"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/85"
            />
            <p className="absolute right-3 bottom-3 rounded-full bg-white/85 px-2.5 py-1 text-xs text-foreground tabular-nums">
              <span className="sr-only">Image </span>
              {activeIndex + 1} / {count}
            </p>
          </>
        )}
      </div>

      {(count > 1 || videoSrc) && (
        <ul
          aria-label={`${name} images`}
          className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:w-[76px] lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {videoSrc && <li className="shrink-0">
            <button
              type="button"
              aria-label={`Watch ${name} video`}
              aria-current={showingVideo ? "true" : undefined}
              onClick={() => { onPlayingChange(false); setShowingVideo(true); }}
              className={cn(
                "relative flex aspect-[4/5] w-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 bg-blush text-primary-dark lg:w-full",
                showingVideo ? "border-primary-dark" : "border-transparent hover:border-primary/60",
              )}
            >
              <Play aria-hidden="true" className="size-5" />
              <span className="text-xs font-medium">Video</span>
            </button>
          </li>}
          {images.map((src, index) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                aria-label={`View image ${index + 1} of ${name}`}
                aria-current={!showingVideo && index === activeIndex ? "true" : undefined}
                onClick={() => { setShowingVideo(false); onSelect(index); }}
                className={cn(
                  "relative block aspect-[4/5] w-16 overflow-hidden rounded-lg border-2 bg-blush/40 transition-colors lg:w-full",
                  !showingVideo && index === activeIndex ? "border-primary-dark" : "border-transparent hover:border-primary/60",
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}

        </ul>
      )}
    </div>
  );
}
