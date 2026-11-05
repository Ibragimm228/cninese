import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { speak } from '../lib/speech'
import { useApp } from '../lib/store'
import { SpeakerIcon } from './icons'

export function SpeakButton({
  text,
  size = 'md',
  slow,
  className,
  autoFocus,
}: {
  text: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  slow?: boolean
  className?: string
  autoFocus?: boolean
}) {
  const rate = useApp((s) => s.settings.speechRate)
  const [playing, setPlaying] = useState(false)
  const dims = { sm: 'size-9', md: 'size-12', lg: 'size-16', xl: 'size-28' }[size]
  const icon = { sm: 18, md: 24, lg: 32, xl: 56 }[size]
  return (
    <motion.button
      type="button"
      autoFocus={autoFocus}
      whileTap={{ scale: 0.92 }}
      onClick={async (e) => {
        e.stopPropagation()
        setPlaying(true)
        await speak(text, slow ? rate * 0.6 : rate)
        setPlaying(false)
      }}
      className={clsx(
        'btn3d relative grid shrink-0 place-items-center rounded-2xl bg-sky text-white normal-case',
        dims,
        playing && 'brightness-110',
        className,
      )}
      style={{ ['--btn-shadow' as string]: '#2557c2' }}
      aria-label={slow ? 'Прослушать медленно' : 'Прослушать'}
    >
      <SpeakerIcon size={icon} slow={slow} />
      {playing && <span className="pulse-ring absolute inset-0 rounded-2xl text-sky" />}
    </motion.button>
  )
}
