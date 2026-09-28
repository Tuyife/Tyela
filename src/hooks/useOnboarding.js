import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../lib/api.js'
import { STEPS } from '../components/OnboardingTutorial/steps/index.js'

const LS_KEY = 'tyelaTutorialSeen'

// ---- Retake bus ------------------------------------------------------
// The "Learn the tutorial" button on Profile calls requestTutorialStart().
// If Dashboard is mounted it receives the request immediately; otherwise
// the request is stored and replayed when Dashboard mounts again.
let pendingRequest = false
let subscriber = null
let autoShown = false

export function requestTutorialStart() {
  if (subscriber) {
    subscriber()
  } else {
    pendingRequest = true
  }
}

export default function useOnboarding() {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)

  const showTutorial = useCallback(() => {
    setCurrent(0)
    setVisible(true)
    if (!started && localStorage.getItem('tyelaToken')) {
      setStarted(true)
      apiPost('/api/tutorial/start').catch(() => {})
    }
  }, [started])

  // Register as the bus subscriber while Dashboard is mounted and replay
  // any retake request that arrived while Dashboard was unmounted.
  useEffect(() => {
    subscriber = () => {
      setCurrent(0)
      setVisible(true)
    }
    if (pendingRequest) {
      pendingRequest = false
      queueMicrotask(() => subscriber && subscriber())
    }
    return () => {
      subscriber = null
    }
  }, [])

  // Decide whether a first-time user should see the tutorial.
  useEffect(() => {
    let cancelled = false
    if (visible || autoShown) return undefined

    const token = localStorage.getItem('tyelaToken')
    if (!token) {
      if (localStorage.getItem(LS_KEY) !== 'done') {
        autoShown = true
        queueMicrotask(() => {
          if (!cancelled) showTutorial()
        })
      }
      return undefined
    }

    apiGet('/api/tutorial/status')
      .then((s) => {
        if (cancelled || autoShown) return
        const shouldShow =
          s && s.canRetakeEverytime === true && !s.tutorialCompleted && !s.tutorialSkipped
        if (shouldShow) {
          autoShown = true
          showTutorial()
        }
      })
      .catch(() => {
        if (cancelled || autoShown) return
        if (localStorage.getItem(LS_KEY) !== 'done') {
          autoShown = true
          showTutorial()
        }
      })

    return () => {
      cancelled = true
    }
  }, [visible, showTutorial])

  const nextStep = useCallback(() => {
    setCurrent((c) => Math.min(STEPS.length - 1, c + 1))
  }, [])

  const completeTutorial = useCallback(() => {
    setVisible(false)
    try {
      localStorage.setItem(LS_KEY, 'done')
    } catch {
      /* ignore */
    }
    if (localStorage.getItem('tyelaToken')) {
      apiPost('/api/tutorial/complete').catch(() => {})
    }
  }, [])

  const skipTutorial = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY, 'done')
    } catch {
      /* ignore */
    }
    setVisible(false)
    if (localStorage.getItem('tyelaToken')) {
      apiPost('/api/tutorial/skip').catch(() => {})
    }
  }, [])

  return {
    visible,
    current,
    total: STEPS.length,
    step: STEPS[current],
    nextStep,
    completeTutorial,
    skipTutorial
  }
}