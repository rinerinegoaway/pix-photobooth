import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { ClientMessage, ServerMessage } from '../src/lib/protocol.ts'

let base = ''
let stop: () => void = () => {}

beforeAll(async () => {
  process.env.PORT = '0'
  const mod = await import('./index.ts')
  base = `127.0.0.1:${mod.server.port}`
  stop = () => void mod.server.stop(true)
})

afterAll(() => stop())

class Client {
  ws: WebSocket
  inbox: ServerMessage[] = []
  waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = []

  constructor() {
    this.ws = new WebSocket(`ws://${base}/ws`)
    this.ws.onmessage = event => {
      const message = JSON.parse(String(event.data)) as ServerMessage
      const index = this.waiters.findIndex(waiter => waiter.match(message))
      if (index >= 0) this.waiters.splice(index, 1)[0].resolve(message)
      else this.inbox.push(message)
    }
  }

  opened() {
    return new Promise<void>(resolve => {
      if (this.ws.readyState === 1) resolve()
      else this.ws.onopen = () => resolve()
    })
  }

  send(message: ClientMessage) {
    this.ws.send(JSON.stringify(message))
  }

  next<T extends ServerMessage['t']>(type: T, timeout = 6000): Promise<Extract<ServerMessage, { t: T }>> {
    const match = (m: ServerMessage) => m.t === type
    const queued = this.inbox.findIndex(match)
    if (queued >= 0) return Promise.resolve(this.inbox.splice(queued, 1)[0] as Extract<ServerMessage, { t: T }>)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), timeout)
      this.waiters.push({
        match,
        resolve: message => {
          clearTimeout(timer)
          resolve(message as Extract<ServerMessage, { t: T }>)
        },
      })
    })
  }
}

async function makeRoom() {
  const host = new Client()
  await host.opened()
  host.send({ t: 'create', name: 'Host' })
  const hostJoin = await host.next('joined')
  const guest = new Client()
  await guest.opened()
  guest.send({ t: 'join', room: hostJoin.room, name: 'Guest' })
  const guestJoin = await guest.next('joined')
  await host.next('peer-joined')
  return { host, guest, hostJoin, guestJoin }
}

describe('rooms', () => {
  test('creates unpredictable room ids and pairs two people', async () => {
    const { hostJoin, guestJoin, host, guest } = await makeRoom()
    expect(hostJoin.room).toMatch(/^[A-Z0-9]{16}$/)
    expect(hostJoin.role).toBe('host')
    expect(guestJoin.role).toBe('guest')
    expect(guestJoin.other?.name).toBe('Host')
    host.ws.close()
    guest.ws.close()
  })

  test('rejects a third participant and unknown rooms', async () => {
    const { hostJoin, host, guest } = await makeRoom()
    const third = new Client()
    await third.opened()
    third.send({ t: 'join', room: hostJoin.room, name: 'Third' })
    expect((await third.next('error')).code).toBe('room-full')
    third.send({ t: 'join', room: 'NOPENOPENOPENOPE', name: 'x' })
    expect((await third.next('error')).code).toBe('not-found')
    for (const c of [host, guest, third]) c.ws.close()
  })

  test('relays signals only to the other participant', async () => {
    const { host, guest } = await makeRoom()
    host.send({ t: 'signal', data: { k: 'offer', sdp: 'v=0' } })
    const relayed = await guest.next('signal')
    expect(relayed.data).toEqual({ k: 'offer', sdp: 'v=0' })
    host.ws.close()
    guest.ws.close()
  })

  test('refuses to resume a seat with the wrong secret', async () => {
    const { hostJoin, host, guest } = await makeRoom()
    const intruder = new Client()
    await intruder.opened()
    intruder.send({
      t: 'join',
      room: hostJoin.room,
      name: 'Eve',
      resume: { peer: hostJoin.peer, secret: 'wrong', mediaIntact: false },
    })
    expect((await intruder.next('error')).code).toBe('not-allowed')
    for (const c of [host, guest, intruder]) c.ws.close()
  })

  test('resumes a dropped seat with the right secret', async () => {
    const { hostJoin, host, guest } = await makeRoom()
    host.ws.close()
    expect((await guest.next('peer-status')).connected).toBe(false)
    const again = new Client()
    await again.opened()
    again.send({
      t: 'join',
      room: hostJoin.room,
      name: 'Host',
      resume: { peer: hostJoin.peer, secret: hostJoin.secret, mediaIntact: true },
    })
    const joined = await again.next('joined')
    expect(joined.role).toBe('host')
    expect((await guest.next('peer-joined')).mediaIntact).toBe(true)
    again.ws.close()
    guest.ws.close()
  })

  test('refuses a countdown until both sides are ready, then coordinates capture', async () => {
    const { host, guest } = await makeRoom()
    host.send({ t: 'countdown', shot: 0 })
    expect((await host.next('error')).code).toBe('not-ready')

    host.send({ t: 'ready', ready: true })
    guest.send({ t: 'ready', ready: true })
    await host.next('ready-state')
    await guest.next('ready-state')

    host.send({ t: 'countdown', shot: 2 })
    const a = await host.next('countdown')
    const b = await guest.next('countdown')
    expect(a.cid).toBe(b.cid)
    expect(a.captureAt).toBe(b.captureAt)
    expect(a.shot).toBe(2)
    expect(a.captureAt - a.startsAt).toBe(3000)

    guest.send({ t: 'countdown', shot: 1 })
    expect((await guest.next('error')).code).toBe('busy')

    await new Promise(resolve => setTimeout(resolve, a.captureAt - Date.now()))
    host.send({ t: 'captured', cid: a.cid })
    guest.send({ t: 'captured', cid: a.cid })
    expect((await host.next('shot-complete')).cid).toBe(a.cid)
    expect((await guest.next('shot-complete')).cid).toBe(a.cid)
    host.ws.close()
    guest.ws.close()
  }, 15000)

  test('reports a failed shot when one side never acknowledges', async () => {
    const { host, guest } = await makeRoom()
    host.send({ t: 'ready', ready: true })
    guest.send({ t: 'ready', ready: true })
    await host.next('ready-state')
    await guest.next('ready-state')
    host.send({ t: 'countdown', shot: 0 })
    const countdown = await host.next('countdown')
    await guest.next('countdown')
    await new Promise(resolve => setTimeout(resolve, countdown.captureAt - Date.now()))
    host.send({ t: 'captured', cid: countdown.cid })
    const failed = await host.next('shot-failed', 8000)
    expect(failed.missingPeer).toBe(true)
    host.ws.close()
    guest.ws.close()
  }, 15000)

  test('cancels the countdown when a participant leaves', async () => {
    const { host, guest } = await makeRoom()
    host.send({ t: 'ready', ready: true })
    guest.send({ t: 'ready', ready: true })
    await host.next('ready-state')
    await guest.next('ready-state')
    host.send({ t: 'countdown', shot: 0 })
    await host.next('countdown')
    await guest.next('countdown')
    guest.send({ t: 'leave' })
    expect((await host.next('cancelled')).reason).toContain('left')
    await host.next('peer-left')
    host.ws.close()
    guest.ws.close()
  })

  test('rejects malformed input without crashing', async () => {
    const client = new Client()
    await client.opened()
    client.ws.send('not json')
    expect((await client.next('error')).code).toBe('bad-message')
    client.send({ t: 'countdown', shot: 0 })
    expect((await client.next('error')).code).toBe('not-allowed')
    client.ws.close()
  })
})
