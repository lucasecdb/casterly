const { createRequestHandler } = require('@casterly/express')
const express = require('express')

const app = express()

app.use(createRequestHandler())

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log('🎬 server started at http://localhost:' + port + '/')
})
