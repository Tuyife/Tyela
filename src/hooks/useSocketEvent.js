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

export default useSocketEvent
