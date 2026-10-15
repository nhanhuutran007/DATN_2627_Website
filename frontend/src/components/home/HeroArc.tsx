type ArcImage = { src: string; alt: string };

/**
 * Hình học đo từ vòng cung ảnh ở hero GoFundMe (khung 1440px): mỗi ảnh là một hình quạt
 * của vành khăn tâm O(0, 0), bán kính ngoài 1206 và trong 984; các ảnh cách nhau 15°
 * và mỗi ảnh chiếm 14°, nên khe giữa hai ảnh đều nhau dọc theo cạnh xuyên tâm.
 */
const OUTER_RADIUS = 1206;
const INNER_RADIUS = 984;
const STEP_DEG = 15;
const SPAN_DEG = 14;
const CORNER = 28;

/** Khung bao sát 3 ảnh (trái · giữa · phải), gốc tại tâm vòng tròn; SVG trải trọn bề ngang màn hình. */
const VIEW_BOX = "-466 -1210 932 304";

function point(radius: number, angle: number): string {
  return `${(radius * Math.sin(angle)).toFixed(2)} ${(-radius * Math.cos(angle)).toFixed(2)}`;
}

/** Hình quạt đối xứng quanh trục đứng, bo góc bằng đường cong bậc hai. */
function sectorPath(): string {
  const h = ((SPAN_DEG / 2) * Math.PI) / 180;
  const ro = OUTER_RADIUS;
  const ri = INNER_RADIUS;
  const r = CORNER;
  return [
    `M ${point(ro, -h + r / ro)}`,
    `A ${ro} ${ro} 0 0 1 ${point(ro, h - r / ro)}`,
    `Q ${point(ro, h)} ${point(ro - r, h)}`,
    `L ${point(ri + r, h)}`,
    `Q ${point(ri, h)} ${point(ri, h - r / ri)}`,
    `A ${ri} ${ri} 0 0 0 ${point(ri, -h + r / ri)}`,
    `Q ${point(ri, -h)} ${point(ri + r, -h)}`,
    `L ${point(ro - r, -h)}`,
    `Q ${point(ro, -h)} ${point(ro, -h + r / ro)}`,
    "Z",
  ].join(" ");
}

const SECTOR = sectorPath();
const HALF_SPAN = ((SPAN_DEG / 2) * Math.PI) / 180;
/** Khung ảnh phủ trọn hình quạt (góc dưới của quạt thấp hơn đáy cung trong). */
const HALF_WIDTH = OUTER_RADIUS * Math.sin(HALF_SPAN);
const IMAGE_HEIGHT = OUTER_RADIUS - INNER_RADIUS * Math.cos(HALF_SPAN);

/** Ba ảnh xếp hình quạt trên một vòng tròn lớn, ngay dưới các nút ở hero. */
export function HeroArc({ images }: { images: [ArcImage, ArcImage, ArcImage] }) {
  return (
    <div className="hero-arc">
      <svg viewBox={VIEW_BOX} role="group" aria-label="Hình ảnh các dự án cộng đồng">
        <defs>
          <clipPath id="hero-arc-clip" clipPathUnits="userSpaceOnUse">
            <path d={SECTOR} />
          </clipPath>
        </defs>
        {images.map((image, index) => (
          <g key={image.src} transform={`rotate(${(index - 1) * STEP_DEG})`}>
            <image
              href={image.src}
              x={-HALF_WIDTH}
              y={-OUTER_RADIUS}
              width={HALF_WIDTH * 2}
              height={IMAGE_HEIGHT}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#hero-arc-clip)"
            >
              <title>{image.alt}</title>
            </image>
          </g>
        ))}
      </svg>
    </div>
  );
}
