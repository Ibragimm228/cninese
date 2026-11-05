import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const base = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' })

export const FlameIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2c1 3.5 5.5 6 5.5 11a5.5 5.5 0 1 1-11 0c0-2.3 1.2-3.9 2.4-5 .2 1.6 1 2.7 2.1 3.2C10.6 8.4 11 5 12 2Z" fill="#FF9F1C" />
    <path d="M12 12c.6 1.6 2.6 2.6 2.6 5a2.6 2.6 0 1 1-5.2 0c0-1.5.9-2.5 1.6-3 .1.6.4 1 .9 1.2 0-1.2-.1-2.2.1-3.2Z" fill="#FFD166" />
  </svg>
)

export const GemIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill="#3D7BF7" />
    <path d="M2 9h20L12 21 2 9Z" fill="#2557C2" />
    <path d="M8 9l4 12 4-12-4-6-4 6Z" fill="#7FA8FF" opacity=".8" />
  </svg>
)

export const HeartIcon = ({ size, empty, ...p }: P & { empty?: boolean }) => (
  <svg {...base(size)} {...p}>
    <path
      d="M12 21s-8-5.2-8-11.2C4 6.6 6.4 4 9.3 4c1.2 0 2.1.6 2.7 1.4C12.6 4.6 13.5 4 14.7 4 17.6 4 20 6.6 20 9.8 20 15.8 12 21 12 21Z"
      fill={empty ? '#D8D0C0' : '#E5484D'}
    />
    {!empty && <ellipse cx="8.5" cy="8.5" rx="1.6" ry="2.2" fill="#fff" opacity=".45" transform="rotate(-30 8.5 8.5)" />}
  </svg>
)

export const BoltIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#F2B33D" />
  </svg>
)

const stroke = { stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" {...stroke} strokeWidth={2.8} />
  </svg>
)

export const SpeakerIcon = ({ size, slow, ...p }: P & { slow?: boolean }) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" fill="currentColor" />
    {slow ? (
      <path d="M16 9.5c.8.7 1.2 1.6 1.2 2.5s-.4 1.8-1.2 2.5" {...stroke} />
    ) : (
      <>
        <path d="M15.5 9c.9.8 1.4 1.9 1.4 3s-.5 2.2-1.4 3" {...stroke} />
        <path d="M18.3 6.5C19.9 7.9 21 9.9 21 12s-1.1 4.1-2.7 5.5" {...stroke} />
      </>
    )}
  </svg>
)

export const LockIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...stroke} strokeWidth={2.6} />
  </svg>
)

export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" {...stroke} strokeWidth={3.2} />
  </svg>
)

export const StarIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9L12 2.8Z" fill="currentColor" />
  </svg>
)

export const TrophyIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" fill="currentColor" />
    <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" {...stroke} />
    <path d="M10 14h4v3h-4zM7 21h10l-1-4H8l-1 4Z" fill="currentColor" />
  </svg>
)

export const BookIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13V4Z" fill="currentColor" />
  </svg>
)

export const ArrowRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" {...stroke} />
  </svg>
)

export const ArrowUpRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 17 17 7M8 7h9v9" {...stroke} />
  </svg>
)

export const SnowIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" stroke="#5BC0F8" strokeWidth={2.4} strokeLinecap="round" />
  </svg>
)

export const SparkIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2c.6 4.8 2.2 6.9 7 8-4.8 1.1-6.4 3.2-7 8-.6-4.8-2.2-6.9-7-8 4.8-1.1 6.4-3.2 7-8Z" fill="currentColor" />
  </svg>
)
