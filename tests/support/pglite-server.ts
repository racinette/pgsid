import net from 'node:net'
import type { PGlite } from '@electric-sql/pglite'

// Serves one PGlite session over the PostgreSQL wire protocol, so a network driver such as
// node-postgres talks to the same backend the tests inspect directly. PGlite answers the startup
// message itself; the server only declines encryption and frames messages.
export async function servePglite(db: PGlite): Promise<{ port: number; close(): Promise<void> }> {
  let chain = Promise.resolve()
  const sockets = new Set<net.Socket>()
  const server = net.createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    // A client process that exits without Terminate, with a reply still in flight, resets the
    // connection; that ends its session like Terminate does. Any other socket error is a failure.
    socket.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ECONNRESET' && error.code !== 'EPIPE') throw error
    })
    let buffer = Buffer.alloc(0)
    let started = false
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      const messages: Buffer[] = []
      for (;;) {
        if (!started) {
          if (buffer.length < 8) break
          const length = buffer.readUInt32BE(0)
          if (buffer.length < length) break
          const code = buffer.readUInt32BE(4)
          const message = buffer.subarray(0, length)
          buffer = buffer.subarray(length)
          if (length === 8 && (code === 80877103 || code === 80877104)) {
            socket.write('N')
            continue
          }
          started = true
          messages.push(message)
          continue
        }
        if (buffer.length < 5) break
        const length = buffer.readUInt32BE(1) + 1
        if (buffer.length < length) break
        const message = buffer.subarray(0, length)
        buffer = buffer.subarray(length)
        if (message[0] === 0x58) {
          socket.end()
          return
        }
        messages.push(message)
      }
      if (!messages.length) return
      const batch = new Uint8Array(Buffer.concat(messages))
      // The server answers each Sync and each simple query with one ReadyForQuery. PGlite also
      // sends one straight after an error in the extended protocol, which a driver would read as
      // the answer to a Sync it has not reached.
      const ready = messages.filter((message) => message[0] === 0x53 || message[0] === 0x51).length
      chain = chain.then(async () => {
        const reply = trimReady(Buffer.from(await db.execProtocolRaw(batch)), ready)
        if (reply.length && !socket.destroyed) socket.write(reply)
      })
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    port: (server.address() as net.AddressInfo).port,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resolve())
      }),
  }
}

// The reply without the ReadyForQuery messages beyond `ready` that directly follow an error.
function trimReady(reply: Buffer, ready: number): Buffer {
  const messages: Buffer[] = []
  for (let offset = 0; offset + 5 <= reply.length;) {
    const length = reply.readUInt32BE(offset + 1) + 1
    messages.push(reply.subarray(offset, offset + length))
    offset += length
  }
  let extra = messages.filter((message) => message[0] === 0x5a).length - ready
  const kept = messages.filter((message, index) => {
    if (extra > 0 && message[0] === 0x5a && messages[index - 1]?.[0] === 0x45) {
      extra--
      return false
    }
    return true
  })
  return Buffer.concat(kept)
}
