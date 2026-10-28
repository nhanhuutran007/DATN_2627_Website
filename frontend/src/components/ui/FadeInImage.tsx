"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Ảnh hiện dần khi tải xong (như ảnh thẻ kết quả của GoFundMe) thay vì bật ra đột ngột.
 * Ảnh đã có sẵn trong bộ nhớ đệm trước khi React chạy cũng được hiện ngay.
 */
export function FadeInImage({ alt, className, onLoad, onError, ...props }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <Image
      {...props}
      alt={alt}
      ref={ref}
      className={`fade-in-image${loaded ? " is-loaded" : ""}${className ? ` ${className}` : ""}`}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        setLoaded(true);
        onError?.(event);
      }}
    />
  );
}
