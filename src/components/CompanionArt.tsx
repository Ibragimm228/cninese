import type { Companion, CompanionId } from '../data/companions'

const hair: Record<CompanionId, string> = {
  chrollo: 'M28 68 22 49 26 35 38 27 38 23 52 20 63 16 79 21 93 19 107 30 120 35 124 56 116 75 107 50 100 46 89 42 76 43 63 40 52 46 41 51 34 80Z',
  kuroko: 'M28 84 22 63 17 57 23 56 17 46 30 46 25 37 41 33 38 24 53 28 64 19 65 25 83 20 95 27 111 26 106 34 124 40 120 48 130 54 118 67 119 81 107 65 103 54 94 65 93 47 83 57 68 67 72 48 57 59 40 71 42 56Z',
  ichigo: 'M27 83 23 65 15 59 26 51 17 44 35 40 27 30 46 30 48 19 62 24 67 12 76 23 92 17 92 29 109 24 105 38 124 35 118 48 132 49 121 60 125 74 114 83 106 57 89 64 95 46 73 62 77 47 58 65 60 50 42 70 43 56Z',
  anya: 'M30 91 21 74 22 53Q23 22 72 22T123 54L125 84 114 96 107 71 101 51 88 64 90 45 70 64 73 45 52 62 54 51 40 69 36 96Z',
}

export function CompanionArt({ companion, className }: { companion: Companion; className?: string }) {
  const { id, ink, color, eyes } = companion
  return (
    <svg className={className} viewBox="0 0 144 144" fill="none" aria-hidden="true">
      <ellipse cx="72" cy="133" rx="40" ry="7" fill={ink} opacity=".16" />
      <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M49 118q-10 4-11 13 3 6 22 2l7-13m28-2q10 4 11 13-3 6-22 2l-7-13" fill={ink} />
        <path d="M51 101q-12 7-14 19 1 6 9 4l9-8m38-15q12 7 14 19-1 6-9 4l-9-8" fill={color} />
        <path d="M51 99q21-8 42 0l5 24q-26 13-52 0Z" fill={id === 'kuroko' ? '#f7f4ed' : ink} />
        <path d="m59 102 13 15 13-15m-13 15v11" stroke={color} />
        <path d="M32 68c-15-7-19 17 0 20m80-20c15-7 19 17 0 20" fill="#f3ba98" />
        <path d="M30 59q5-31 42-31t42 31l-1 22q-2 25-41 28-39-3-41-28Z" fill="#ffdab7" />
        <path d={hair[id]} fill={companion.hair} />
        {id === 'anya' && <path d="m22 51 3-25 17 5-2 12Zm82-8-2-12 17-5 3 25Z" fill="#5b3854" />}
        {id === 'chrollo' && <path d="M72 48v13m-5-8h10" stroke={eyes} />}
        <path d="m44 68 12-2m32 0 12 2" />
        <path d="M45 76q6-5 12 0m30 0q6-5 12 0" />
        <ellipse cx="52" cy="81" rx={id === 'anya' ? 6 : 4.8} ry="7" fill={eyes} strokeWidth="1.6" />
        <ellipse cx="92" cy="81" rx={id === 'anya' ? 6 : 4.8} ry="7" fill={eyes} strokeWidth="1.6" />
        <path d="M72 88v1m-6 6q6 5 12 0" strokeWidth="2" />
      </g>
      <path d="M40 90h8m48 0h8" stroke="#e97c83" strokeWidth="3" strokeLinecap="round" opacity=".65" />
      <circle cx="53" cy="78" r="1.5" fill="white" />
      <circle cx="93" cy="78" r="1.5" fill="white" />
    </svg>
  )
}
