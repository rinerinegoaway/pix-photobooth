import { useEffect, useState, useSyncExternalStore } from 'react'
import { RoomClient } from '../lib/room'

export function useRoom() {
  const [client] = useState(() => new RoomClient())
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot)

  // Leaving the screen always closes the socket, the peer connection and the data channel.
  useEffect(() => () => client.leave(), [client])

  return { client, snapshot }
}
