import { useEffect, useRef } from 'react'
import { getSocket } from '../socket.js'

// Subscribe to a socket event from any screen.
//
// The socket doesn't exist the moment a screen mounts: on reload, UserProvider
// restores it in an effect that runs after its children mount, so a listener
// bound once at mount can silently never fire. This binds as soon as the
// socket shows up, and rebinds if the instance is ever replaced.
const useSocketEvent = (event, handler) => {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    let bound = null
    const listener = (payload) => handlerRef.current(payload)

    const attach = () => {
      const socket = getSocket()
      if (!socket || socket === bound) return
      if (bound) bound.off(event, listener)
      bound = socket
      bound.on(event, listener)
    }

    attach()
    const timer = setInterval(attach, 2000)
    const onConnect = () => attach()
    const current = getSocket()
    if (current) current.on('connect', onConnect)

    return () => {
      clearInterval(timer)
      if (current) current.off('connect', onConnect)
      if (bound) bound.off(event, listener)
    }
  }, [event])
}

// Same idea for a whole map of events. Handlers are read through a ref, so the
// map can be rebuilt on every render with fresh state without rebinding.
const useSocketEvents = (handlers) => {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  const namesKey = Object.keys(handlers).join('|')

  useEffect(() => {
    let bound = null
    const listeners = new Map()
    Object.keys(handlers).forEach((name) => {
      listeners.set(name, (payload) => {
        const fn = handlersRef.current[name]
        if (fn) fn(payload)
      })
    })

    const attach = () => {
      const socket = getSocket()
      if (!socket || socket === bound) return
      if (bound) listeners.forEach((fn, name) => bound.off(name, fn))
      bound = socket
      listeners.forEach((fn, name) => bound.on(name, fn))
    }

    attach()
    const timer = setInterval(attach, 2000)

    return () => {
      clearInterval(timer)
      if (bound) listeners.forEach((fn, name) => bound.off(name, fn))
    }
  }, [namesKey])
}

export { useSocketEvent, useSocketEvents }
export default useSocketEvent
