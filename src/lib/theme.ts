export const themes = [
  { id: 'moli', name: 'Mòlì', hanzi: '茉', mood: 'Бумага и тушь', swatch: ['#f6f3ea', '#171713', '#bf2d22', '#edf480'] },
  { id: 'void', name: 'Космос', hanzi: '宇', mood: 'Тьма, стекло, сияние', swatch: ['#07060d', '#f3f0ff', '#a78bfa', '#5eead4'] },
  { id: 'poster', name: 'Плакат', hanzi: '报', mood: 'Чёрное, белое, громко', swatch: ['#ffffff', '#000000', '#2f4bff', '#e6ff00'] },
  { id: 'manga', name: 'Манга', hanzi: '漫', mood: 'Комикс и конфеты', swatch: ['#ffd3e8', '#2b1055', '#ff3d8b', '#ffe14d'] },
] as const

export type Theme = (typeof themes)[number]
export type ThemeId = Theme['id']

export const isTheme = (id: unknown): id is ThemeId => themes.some((t) => t.id === id)
