import fs, { promises as fsp } from 'fs'

export const fileExists = async (filePath: string) => {
  try {
    await fsp.access(filePath, fs.constants.F_OK)
    return true
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return false
    }

    throw err
  }
}

export const fileExistsSync = (filePath: string) => {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return false
    }

    throw err
  }
}
