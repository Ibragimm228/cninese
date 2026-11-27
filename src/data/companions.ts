export const companions = [
  { id: 'chrollo', name: 'Куроро Люцифер', series: 'Hunter × Hunter', color: '#c7b7f7', ink: '#242033', hair: '#292437', eyes: '#685882', glyph: '影' },
  { id: 'kuroko', name: 'Тэцуя Куроко', series: 'Kuroko no Basket', color: '#a9dff5', ink: '#192d43', hair: '#75c9ef', eyes: '#3e90b7', glyph: '水' },
  { id: 'ichigo', name: 'Ичиго Куросаки', series: 'Bleach', color: '#ffc179', ink: '#342328', hair: '#ff8b37', eyes: '#8c482b', glyph: '火' },
  { id: 'anya', name: 'Аня Форджер', series: 'SPY × FAMILY', color: '#f8bad2', ink: '#3b2639', hair: '#f28eb6', eyes: '#377e6b', glyph: '心' },
] as const

export type Companion = (typeof companions)[number]
export type CompanionId = Companion['id']

export function companionFor(id: CompanionId) {
  return companions.find((companion) => companion.id === id) ?? companions[0]
}
