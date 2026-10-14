type ArcImage = { src: string; alt: string };

type Panel = {
  /** Tâm khung trong hệ tọa độ viewBox 1440×560. */
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Độ nghiêng (độ); âm = nghiêng sang trái. */
  rotate: number;
};

/**
 * Bố cục đo từ ảnh vòng cung ở hero GoFundMe (quy về khung 1440px): khung giữa thẳng,
 * hai khung bên nghiêng ±11,3° và thấp hơn, cạnh trên/dưới phình như đặt trên một vòng tròn.
 */
const PANELS: [Panel, Panel, Panel] = [
  { cx: 225, cy: 292, width: 410, height: 430, rotate: -11.3 },
  { cx: 720, cy: 232, width: 570, height: 427, rotate: 0 },
  { cx: 1215, cy: 292, width: 410, height: 430, rotate: 11.3 },
];

const RADIUS = 40;
const BULGE = 12;

/** Khung bo góc có cạnh trên phình lên và cạnh dưới phình xuống, tâm tại (0, 0). */
function panelPath(width: number, height: number): string {
  const a = width / 2;
  const c = height / 2;
  const r = RADIUS;
  const b = BULGE * 2;
  return [
    `M ${-a + r} ${-c}`,
    `Q 0 ${-c - b} ${a - r} ${-c}`,
    `Q ${a} ${-c} ${a} ${-c + r}`,
    `L ${a} ${c - r}`,
    `Q ${a} ${c} ${a - r} ${c}`,
    `Q 0 ${c + b} ${-a + r} ${c}`,
    `Q ${-a} ${c} ${-a} ${c - r}`,
    `L ${-a} ${-c + r}`,
    `Q ${-a} ${-c} ${-a + r} ${-c}`,
    "Z",
  ].join(" ");
}

/** Ba ảnh xếp theo vòng cung (trái · giữa · phải); màn hình rộng thì hai ảnh bên tràn khỏi mép. */
export function HeroArc({ images }: { images: [ArcImage, ArcImage, ArcImage] }) {
  return (
    <div className="hero-arc">
      <svg viewBox="0 0 1440 560" preserveAspectRatio="xMidYMin slice" role="group" aria-label="Hình ảnh các dự án cộng đồng">
        <defs>
          {PANELS.map((panel, index) => (
            <clipPath id={`hero-arc-clip-${index}`} key={index} clipPathUnits="userSpaceOnUse">
              <path d={panelPath(panel.width, panel.height)} />
            </clipPath>
          ))}
        </defs>
        {PANELS.map((panel, index) => {
          const image = images[index];
          return (
            <g key={image.src} transform={`translate(${panel.cx} ${panel.cy}) rotate(${panel.rotate})`}>
              <image
                href={image.src}
                x={-panel.width / 2}
                y={-panel.height / 2 - BULGE}
                width={panel.width}
                height={panel.height + BULGE * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#hero-arc-clip-${index})`}
              >
                <title>{image.alt}</title>
              </image>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
