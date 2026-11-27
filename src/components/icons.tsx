import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 24, children, ...props }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>
}

function line(d: string) {
  return (props: P) => <Icon {...props}><path d={d} /></Icon>
}

export const FlameIcon = line('M12 22a7 7 0 0 0 7-7c0-4-2-6-4-8 0 2-1 3-2 4 0-4-2-7-4-9 1 5-4 8-4 13a7 7 0 0 0 7 7Z M10 21c-2-2-1-5 2-7 3 2 4 5 2 7')
export const GemIcon = line('M6 3h12l4 6-10 12L2 9Z M2 9h20 M10 3 7 9l5 12 5-12-3-6')
export const BoltIcon = line('m13 2-9 12h7l-1 8 10-12h-7z')
export const CloseIcon = line('m6 6 12 12 M18 6 6 18')
export const LockIcon = line('M7 11V7a5 5 0 0 1 10 0v4 M5 11h14v10H5z M12 15v2')
export const CheckIcon = line('m5 12 4 4L19 6')
export const StarIcon = line('m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z')
export const TrophyIcon = line('M8 3h8v7a4 4 0 0 1-8 0z M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4 M12 14v5m-5 2h10m-8-2h6')
export const BookIcon = line('M12 6c-3-3-7-2-10-2v15c4 0 7-.5 10 2 3-2.5 6-2 10-2V4c-3 0-7-1-10 2v15')
export const SnowIcon = line('M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7 M9 4l3 3 3-3m-6 16 3-3 3 3')
export const SparkIcon = line('M12 2c.7 5.2 2.8 7.3 8 8-5.2.7-7.3 2.8-8 8-.7-5.2-2.8-7.3-8-8 5.2-.7 7.3-2.8 8-8Z M19 17v4m-2-2h4')
export const SproutIcon = line('M12 21v-9M4 6c5 0 8 3 8 8-5 0-8-3-8-8Zm16-3c-5 0-8 3-8 8 5 0 8-3 8-8ZM6 21h12')
export const CalendarIcon = line('M3 5h18v16H3z M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5')
export const MedalIcon = line('M9 11 5 3h4l3 6 3-6h4l-4 8 M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z')
export const PenIcon = line('m4 20 4-1L20 7l-3-3L5 16l-1 4Z M14 7l3 3')
export const TargetIcon = line('M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 9-9m-5 0h5v5')
export const MusicIcon = line('M8 18V6l12-3v13 M8 18c0 3-5 3-5 0 0-2 5-3 5 0Zm12-2c0 3-5 3-5 0 0-2 5-3 5 0Z')
export const BulbIcon = line('M9 18h6m-5 3h4 M9 15c0-2-3-3-3-7a6 6 0 1 1 12 0c0 4-3 5-3 7Z')
export const ClockIcon = line('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2')
export const RefreshIcon = line('M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5m-4 5a8 8 0 0 0 14 4l3-3m0 5v-5h-5')
export const HeadphonesIcon = line('M3 14v-2a9 9 0 0 1 18 0v2 M3 14h4v6H4a1 1 0 0 1-1-1zm18 0h-4v6h3a1 1 0 0 0 1-1z')
export const MicIcon = line('M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5 11a7 7 0 0 0 14 0m-7 7v4m-3 0h6')
export const SpeechIcon = line('M3 4h18v13H9l-6 4V4Z M7 9h10m-10 4h7')
export const ArrowRight = line('M5 12h14m-6-6 6 6-6 6')
export const ArrowUpRight = line('M7 17 17 7M8 7h9v9')

export function HeartIcon({ empty, ...props }: P & { empty?: boolean }) {
  return <Icon opacity={empty ? 0.4 : 1} {...props}><path d="M20.8 8.6c0 4.7-8.8 10.3-8.8 10.3S3.2 13.3 3.2 8.6a4.4 4.4 0 0 1 8.8-1 4.4 4.4 0 0 1 8.8 1Z" /></Icon>
}

export function SpeakerIcon({ slow, ...props }: P & { slow?: boolean }) {
  return <Icon {...props}><path d="M3 9h4l5-4v14l-5-4H3z M16 9a4 4 0 0 1 0 6" />{!slow && <path d="M19 6a8 8 0 0 1 0 12" />}</Icon>
}

const achievementIcons = {
  sprout: SproutIcon, gem: GemIcon, flame: FlameIcon, calendar: CalendarIcon, book: BookIcon,
  star: StarIcon, bolt: BoltIcon, trophy: TrophyIcon, pen: PenIcon, medal: MedalIcon,
  target: TargetIcon, music: MusicIcon,
}

export type AchievementSymbol = keyof typeof achievementIcons

export function AchievementIcon({ symbol, ...props }: P & { symbol: AchievementSymbol }) {
  const Symbol = achievementIcons[symbol]
  return <Symbol {...props} />
}
