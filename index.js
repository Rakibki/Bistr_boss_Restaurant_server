const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 4500;

const app = express()

app.use(cors())
app.use(express.json())


app.get("/", (req, res) => {
    res.send("bistro boss server")
})


app.listen(port, () => {
    console.log(`bistro boss server is running port: ${port}`);
})