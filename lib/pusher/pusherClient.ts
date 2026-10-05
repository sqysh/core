import 'client-only'
import Pusher from 'pusher-js'

type PusherGlobal = typeof globalThis & { __pusherClient?: Pusher }
const g = globalThis as PusherGlobal

/**
 * One client for the whole tab, created on first use and cached on globalThis so hot reload doesn't
 * leave extra sockets open. Browser only: client components also render on the server, where a
 * module-level client would open an idle socket on every warm function instance.
 */
export function getPusherClient() {
  if (typeof window === 'undefined')
    throw new Error('getPusherClient is browser only; call it inside an effect or event handler')

  if (!g.__pusherClient) {
    g.__pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    })
  } else if (['disconnected', 'failed'].includes(g.__pusherClient.connection.state)) {
    // Closed because the last channel was released. Reconnecting resubscribes every channel still held,
    // so a page that subscribes just after another page let go still gets its events
    g.__pusherClient.connect()
  }

  return g.__pusherClient
}

/**
 * Lets go of a channel, and closes the socket once nothing is subscribed, so a visitor on a page
 * with no live updates isn't holding a connection open.
 */
export function releaseChannel(channelName: string) {
  const client = g.__pusherClient
  if (!client) return

  // Unsubscribing sends a message, which throws on a socket that's already closing, so in that case
  // the channel is only dropped locally
  if (client.connection.state === 'connected') client.unsubscribe(channelName)
  else client.channels.remove(channelName)

  if (client.allChannels().length === 0) client.disconnect()
}
