const { createRequestHandler } = require('@casterly/express')
const express = require('express')

const app = express()

app.use(createRequestHandler())

app.listen(process.env.PORT || 3000, () => {
  console.log('🎬 server started')
})
