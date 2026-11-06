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
      chain = chain.then(async () => {
        const reply = await db.execProtocolRaw(batch)
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
