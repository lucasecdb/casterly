// eslint-disable-next-line
/// <reference path="./global.d.ts" />

import { ChildProcess, spawn } from 'child_process'
import { dirname, join } from 'path'

interface RunOptions {
  stdout?: boolean
  stderr?: boolean
}

export const runCasterlyCmd = (
  argv: string[],
  directory: string,
  { stdout = false, stderr = true }: RunOptions = {}
) => {
  const cwd = dirname(require.resolve('casterly/package.json'))
  const casterlyBin = join(cwd, 'lib', 'bin', 'casterly')

  return new Promise<ChildProcess | void>((resolve, reject) => {
    let alreadyResolved = false
    const serverProcess = spawn('node', [casterlyBin, ...argv], {
      cwd: directory,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const handleStdout = (data: any) => {
      const message = data.toString() as string

      if (/compiled successfully/.test(message)) {
        if (!alreadyResolved) {
          alreadyResolved = true
          resolve(serverProcess)
        }
      }

      if (stdout) {
        process.stdout.write(data)
      }
    }

    const handleStderr = (data: any) => {
      if (stderr) {
        process.stderr.write(data)
      }
    }

    serverProcess.stdout.on('data', handleStdout)

    serverProcess.stderr.on('data', handleStderr)

    serverProcess.on('close', () => {
      serverProcess.stdout.removeListener('data', handleStdout)
      serverProcess.stderr.removeListener('data', handleStderr)

      if (alreadyResolved) {
        return
      }
      alreadyResolved = true
      resolve()
    })

    serverProcess.on('error', reject)
  })
}

interface TestServerHandle {
  casterlyProcess: ChildProcess | void
  serverProcess: ChildProcess
}

export const startServer = async (
  projectDirectory: string,
  port = 3000
): Promise<TestServerHandle> => {
  const casterlyProcess = await runCasterlyCmd(['watch'], projectDirectory)

  const serverProcess = spawn(
    'node',
    [join(__dirname, 'servers', 'express-server')],
    { env: { ...process.env, PORT: port.toString() }, cwd: projectDirectory }
  )

  await new Promise<void>((resolve, reject) => {
    let resolved = false

    const handleStdout = (data: any) => {
      const message = data.toString() as string

      if (/🎬 server started/.test(message) && !resolved) {
        resolved = true
        resolve()
      }
    }

    serverProcess.stdout.on('data', handleStdout)

    const handleStderr = (data: any) => {
      process.stderr.write(data)
    }

    serverProcess.stderr.on('data', handleStderr)

    serverProcess.on('close', () => {
      serverProcess.stdout.removeListener('data', handleStdout)
      serverProcess.stderr.removeListener('data', handleStderr)

      if (!resolved) {
        resolved = true
        resolve()
      }
    })

    serverProcess.on('error', reject)
  })

  return { casterlyProcess, serverProcess }
}

export const killServer = async (handle?: TestServerHandle) => {
  if (!handle) {
    return
  }

  const { casterlyProcess, serverProcess } = handle

  if (casterlyProcess) {
    casterlyProcess.kill('SIGTERM')
  }

  serverProcess.kill('SIGTERM')
}
