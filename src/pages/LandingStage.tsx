import { Link } from 'react-router-dom'
import { Companion3D } from '../components/Companion3D'
import { ArrowRight } from '../components/icons'
import { Logo } from '../components/Logo'
import { companions } from '../data/companions'
import { useApp } from '../lib/store'

const ticker = ['150 слов', '学', '4 тона', '中', 'HSK 1', '文', '5 минут в день', '好']

/** One-screen landing used by the alternative designs: a stage, a headline, one action. */
export default function LandingStage() {
  const onboarded = useApp((s) => s.onboarded)
  const to = onboarded ? '/learn' : '/welcome'
  return (
    <div className="stage">
      <header className="stage-top">
        <Logo />
        <Link to={to} className="stage-enter">{onboarded ? 'Продолжить' : 'Войти'}</Link>
      </header>
      <main className="stage-main">
        <span className="stage-hanzi" aria-hidden="true">学中文</span>
        <h1 className="stage-title"><span>Китайский</span><span>играючи<i>.</i></span></h1>
        <Companion3D ids={companions.map((c) => c.id)} className="stage-cast" accent="#a78bfa" />
        <Link to={to} className="stage-cta">{onboarded ? 'К уроку' : 'Начать'} <span><ArrowRight size={22} /></span></Link>
      </main>
      <div className="stage-ticker" aria-hidden="true">
        <div className="marquee">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((item, i) => <span key={i}>{item}</span>)}
        </div>
      </div>
    </div>
  )
}
