import fs, { promises as fsp } from 'fs'

const fileExists = async (filePath: string) => {
  try {
    await fsp.access(filePath, fs.constants.F_OK)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }

    throw err
  }
}

export default fileExists
