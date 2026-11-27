import { lazy, Suspense, useLayoutEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Learn from './pages/Learn'
import { useApp } from './lib/store'
import { ThemeSwitcher } from './components/ThemeSwitcher'

const Landing = lazy(() => import('./pages/Landing'))
const LandingStage = lazy(() => import('./pages/LandingStage'))
const Welcome = lazy(() => import('./pages/Welcome'))
const Practice = lazy(() => import('./pages/Practice'))
const Characters = lazy(() => import('./pages/Characters'))
const Tones = lazy(() => import('./pages/Tones'))
const Exam = lazy(() => import('./pages/Exam'))
const League = lazy(() => import('./pages/League'))
const Profile = lazy(() => import('./pages/Profile'))
const LessonRoute = lazy(() => import('./pages/Lesson').then((m) => ({ default: m.LessonRoute })))
const PracticeRoute = lazy(() => import('./pages/Lesson').then((m) => ({ default: m.PracticeRoute })))

function Loader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper">
      <span className="animate-pulse font-brush text-6xl text-red">学</span>
    </div>
  )
}

function AppRoutes() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  const classic = useApp((s) => !s.theme || s.theme === 'moli')

  useLayoutEffect(() => {
    if (navigationType !== 'POP' && !hash) window.scrollTo(0, 0)
  }, [pathname, hash, navigationType])

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={classic ? <Landing /> : <LandingStage />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/lesson/:id" element={<LessonRoute />} />
        <Route path="/practice/:mode" element={<PracticeRoute />} />
        <Route element={<AppShell />}>
          <Route path="/learn" element={<Learn />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/tones" element={<Tones />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/league" element={<League />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ThemeSwitcher />
        <AppRoutes />
      </BrowserRouter>
    </MotionConfig>
  )
}
