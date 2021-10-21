// eslint-disable-next-line
/// <reference path="./global.d.ts" />

const { spawn } = require('child_process')
const { dirname, join } = require('path')

const getPort = require('get-port')

function findPort() {
  return getPort()
}

const runCasterlyCmd = async (
  argv,
  directory,
  { stdout = false, stderr = true, port, prod = false } = {}
) => {
  const cwd = dirname(require.resolve('casterly/package.json'))
  const casterlyBin = join(cwd, 'lib', 'bin', 'casterly')

  return new Promise((resolve, reject) => {
    let alreadyResolved = false
    const casterlyProcess = spawn('node', [casterlyBin, ...argv], {
      cwd: directory,
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: prod ? 'production' : 'development',
        IS_TEST: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const handleStdout = (data) => {
      const message = data.toString()

      if (/compiled successfully/.test(message) && !alreadyResolved) {
        alreadyResolved = true
        resolve(casterlyProcess)
      }

      if (stdout) {
        process.stdout.write(data)
      }
    }

    const handleStderr = (data) => {
      if (stderr) {
        process.stderr.write(data)
      }
    }

    casterlyProcess.stdout.on('data', handleStdout)

    casterlyProcess.stderr.on('data', handleStderr)

    casterlyProcess.on('close', () => {
      casterlyProcess.stdout.removeListener('data', handleStdout)
      casterlyProcess.stderr.removeListener('data', handleStderr)

      if (alreadyResolved) {
        return
      }
      alreadyResolved = true
      resolve(casterlyProcess)
    })

    casterlyProcess.on('error', reject)
  })
}

const startServerProcess = async ({
  serverFilename,
  port,
  buildServerPort,
  directory,
  prod,
  debug = false,
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

  await new Promise((resolve, reject) => {
    let resolved = false

    const handleStdout = (data) => {
      const message = data.toString()

      if (/🎬 server started/.test(message) && !resolved) {
        resolved = true
        resolve()
      }

      if (debug) {
        process.stdout.write(data)
      }
    }

    serverProcess.stdout.on('data', handleStdout)

    const handleStderr = (data) => {
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

const startServer = async (projectDirectory, port, { prod = false } = {}) => {
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

const killProcess = (proc) => {
  proc.kill('SIGTERM')

  if (proc.exitCode != null) {
    return Promise.resolve()
  }

  const closePromise = new Promise((resolve) => {
    proc.on('close', () => {
      resolve()
    })
  })

  return closePromise
}

const killServer = async (handle) => {
  if (!handle) {
    return
  }

  const { casterlyProcess, serverProcess } = handle

  if (casterlyProcess) {
    await killProcess(casterlyProcess)
  }

  await killProcess(serverProcess)
}

module.exports = {
  findPort,
  runCasterlyCmd,
  killServer,
  startServer,
}
