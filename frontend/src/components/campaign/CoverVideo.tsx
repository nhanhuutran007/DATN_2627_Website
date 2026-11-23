"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { VideoPlayer } from "@/components/campaign/VideoPlayer";

type CoverVideoProps = {
  url: string;
  title: string;
};

/**
 * Nút ▶ phủ lên ảnh bìa (như Kickstarter); bấm thì phát video ngay trong khung ảnh bìa.
 * Chưa bấm thì chưa tải trình phát/video nên trang vẫn nhẹ.
 */
export function CoverVideo({ url, title }: CoverVideoProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return <VideoPlayer url={url} title={`Video giới thiệu: ${title}`} autoplay className="cover-video-player" />;
  }
  return (
    <button className="cover-video-play" type="button" onClick={() => setPlaying(true)} aria-label={`Xem video giới thiệu dự án ${title}`}>
      <span className="cover-video-icon" aria-hidden="true">
        <Icon name="play" size={30} />
      </span>
      <span className="cover-video-label">Xem video</span>
    </button>
  );
}
