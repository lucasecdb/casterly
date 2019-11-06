import { NextFunction, Request, Response } from 'express'

import * as Log from '../../output/log'

const error = () => async (_: Request, res: Response, next: NextFunction) => {
  try {
    await next()
  } catch (err) {
    Log.error('An error ocurred while trying to server-side render')
    console.error(err)

    res.status(500)
    res.send('Internal Server Error')
  }
}

export default error
