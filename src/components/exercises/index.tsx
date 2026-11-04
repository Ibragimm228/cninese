import type { Exercise } from '../../lib/exercises'
import { BuildEx } from './Build'
import { ChoiceEx, FillEx, ListenEx, ToneEx } from './Choice'
import type { ExResult } from './common'
import { IntroEx } from './Intro'
import { MatchEx } from './Match'
import { WriteEx } from './Write'

export type { ExResult }

export function ExerciseView({
  ex,
  locked,
  onChange,
}: {
  ex: Exercise
  locked: boolean
  onChange: (r: ExResult | null) => void
}) {
  switch (ex.type) {
    case 'intro':
      return <IntroEx ex={ex} locked={locked} onChange={onChange} />
    case 'choice':
      return <ChoiceEx ex={ex} locked={locked} onChange={onChange} />
    case 'listen':
      return <ListenEx ex={ex} locked={locked} onChange={onChange} />
    case 'tone':
      return <ToneEx ex={ex} locked={locked} onChange={onChange} />
    case 'fill':
      return <FillEx ex={ex} locked={locked} onChange={onChange} />
    case 'build':
      return <BuildEx ex={ex} locked={locked} onChange={onChange} />
    case 'match':
      return <MatchEx ex={ex} locked={locked} onChange={onChange} />
    case 'write':
      return <WriteEx ex={ex} locked={locked} onChange={onChange} />
  }
}
