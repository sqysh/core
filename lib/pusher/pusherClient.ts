import Pusher from 'pusher-js'

// One browser-wide Pusher connection, reused by every component. Creating a new
// Pusher() per component opens a socket each time and thrashes under Fast Refresh
// ("already in CLOSING or CLOSED state"). A singleton keeps one stable socket.
let client: Pusher | null = null

export function getPusherClient(): Pusher {
  if (!client) {
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    })
  }
  return client
}
