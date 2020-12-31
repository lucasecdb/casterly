// eslint-disable-next-line
/// <reference path="./global.d.ts" />

import { ChildProcess, spawn } from 'child_process'
import { dirname, join } from 'path'

import getPort from 'get-port'

export function findPort() {
  return getPort()
}

interface RunOptions {
  stdout?: boolean
  stderr?: boolean
  prod?: boolean
  port?: number
}

export const runCasterlyCmd = async (
  argv: string[],
  directory: string,
  { stdout = false, stderr = true, port, prod = false }: RunOptions = {}
) => {
  const cwd = dirname(require.resolve('casterly/package.json'))
  const casterlyBin = join(cwd, 'lib', 'bin', 'casterly')

  return new Promise<ChildProcess | void>((resolve, reject) => {
    let alreadyResolved = false
    const serverProcess = spawn('node', [casterlyBin, ...argv], {
      cwd: directory,
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: prod ? 'production' : 'development',
      },
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

const startServerProcess = async ({
  serverFilename,
  port,
  buildServerPort,
  directory,
  prod,
  debug = false,
}: {
  serverFilename: string
  port: number
  buildServerPort: number
  directory: string
  prod: boolean
  debug?: boolean
}) => {
  const serverProcess = spawn(
    'node',
    [join(__dirname, 'servers', serverFilename)],
    {
      env: {
        ...process.env,
        PORT: port.toString(),
        BUILD_SERVER_PORT: buildServerPort.toString(),
        NODE_ENV: prod ? 'production' : 'development',
      },
      cwd: directory,
    }
  )

  await new Promise<void>((resolve, reject) => {
    let resolved = false

    const handleStdout = (data: any) => {
      const message = data.toString() as string

      if (/🎬 server started/.test(message) && !resolved) {
        resolved = true
        resolve()
      }

      if (debug) {
        process.stdout.write(data)
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

  return serverProcess
}

interface TestServerHandle {
  casterlyProcess: ChildProcess | void
  serverProcess: ChildProcess
}

interface StartServerOptions {
  prod?: boolean
}

export const startServer = async (
  projectDirectory: string,
  port: number,
  { prod = false }: StartServerOptions = {}
): Promise<TestServerHandle> => {
  const casterlyPort = await findPort()

  const casterlyProcess = await runCasterlyCmd(
    [prod ? 'build' : 'watch'],
    projectDirectory,
    {
      prod,
      port: casterlyPort,
      stdout: !!process.env.DEBUG_TEST,
    }
  )

  const serverProcess = await startServerProcess({
    serverFilename: 'express-server',
    port,
    buildServerPort: casterlyPort,
    prod,
    directory: projectDirectory,
    debug: !!process.env.DEBUG_TEST,
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
