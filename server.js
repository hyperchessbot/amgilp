const express = require('express')
const app = express()
const PORT = parseInt(process.env.PORT || 3000)

app.get('/', (req, res) => {
  res.send('amgilp')
})

app.listen(PORT, () => {
  console.log(`amgilp server listening at ${PORT}`)
})