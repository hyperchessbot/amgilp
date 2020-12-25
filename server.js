const express = require('express')
const app = express()
const PORT = parseInt(process.env.PORT || 3000)
const path = require('path')
const fs = require('fs')

const puzzles = fs.readFileSync("leaderboard.csv").toString().split("\n")

app.get('/', (req, res) => {
	let username = req.query.getpuzzles
	if(username){
		const matcher = new RegExp(`([0-9]+),${username},([0-9]+),(.*)`)
		const ups = puzzles.find(line => line.match(matcher))
		if(ups){
			console.log(ups)
			const m = ups.match(matcher)
			const rank = m[1]
			const num = m[2]
			const puzzleIds = m[3].split(" ")
			const puzzleUrls = puzzleIds.map(puzzleId => `<a target="_blank" rel="noopener noreferrer" href="https://lichess.org/training/${puzzleId}">${puzzleId}</a>`).join("<br>")

			res.send(`${username} found , rank ${rank} , number of puzzles ${num}<hr>${puzzleUrls}`)	
		}else{
			res.send("user ${username} was not found in puzzles database")
		}
	}else{
		res.sendFile(path.join(__dirname, "index.html"))		
	}
})

app.use("/", express.static(path.join(__dirname, "/")))

app.listen(PORT, () => {
  console.log(`amgilp server listening at ${PORT}`)
})