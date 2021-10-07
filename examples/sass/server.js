const { createRequestHandler } = require('@casterly/express')
const express = require('express')

const app = express()

app.use(createRequestHandler())

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000')
})
