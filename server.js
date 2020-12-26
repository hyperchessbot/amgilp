const express = require('express')
const app = express()
const PORT = parseInt(process.env.PORT || 3000)
const path = require('path')
const fs = require('fs')
const fetch = require('node-fetch')

require('nunjucks').configure('templates', {
    autoescape: false,
    express: app
})

try{
	require('dotenv').config()	
}catch(err){}

console.log(process.env)

///////////////////////////////////////////////////////////////////////
// https://discord.js.org/#/

const Discord = require('discord.js')
const discordClient = new Discord.Client()

let sendDiscord = (channelName, message) => {
	console.log("discord client not ready for sending", channelName, message)
}

discordClient.on('ready', _ => {
	console.log(`Discord bot logged in as ${discordClient.user.tag}!`)
	
	sendDiscord = (channelName, message) => {
		const channel = discordClient.channels.cache.find(channel => channel.name === channelName)
		
		channel.send(message)
	}
	
	if(process.env.SEND_LOGIN_MESSAGE) sendDiscord("bot-log", "bot logged in")
})

discordClient.on('message', msg => {
	if (msg.content === 'ping') {
		msg.reply('pong!')
	}
})

if(process.env.DISCORD_BOT_TOKEN){
	discordClient.login(process.env.DISCORD_BOT_TOKEN)
}

function logDiscord(msg){
	if(process.env.LOG_DISCORD){
		sendDiscord("bot-log", msg)
	}
}

///////////////////////////////////////////////////////////////////////

const TOPLIST_PAGE_SIZE = 100

const puzzles = fs.readFileSync("leaderboard.csv").toString().split("\n").slice(1)

function genToplistPage(records){
	const template = fs.readFileSync(path.join(__dirname, "toplist.html")).toString().replace("xxx", "`" + records + "`")
	return template
}

function getToplistPage(page){
	return new Promise((resolve, reject) => {
		const from = (page - 1) * TOPLIST_PAGE_SIZE		
		const len = puzzles.length
		const to = Math.min(page * TOPLIST_PAGE_SIZE, len)
		const maxAllowedPage = Math.floor(len / TOPLIST_PAGE_SIZE)
		if(page > maxAllowedPage){
			reject(`toplist page out of range ( maximum allowed page is ${maxAllowedPage} ) `)						
		}else{
			resolve(puzzles.slice(from, to).map((csv, i) => {
				const items = csv.split(",")
				return {
					index0: i,
					index1: i + 1,
					rank: parseInt(items[0]),
					username: items[1],
					num: parseInt(items[2]),
					ids: items[3].split(" ")
				}
			}))
		}
	})
}

app.get('/', (req, res) => {
	let username = req.query.getpuzzles
	const toplistPageStr = req.query.toplistPage
	
	if(username){
		logDiscord(`getpuzzles of ${username}`)
		
		const matcher = new RegExp(`([0-9]+),(${username}),([0-9]+),(.*)`, "i")
		const ups = puzzles.find(line => line.match(matcher))
		if(ups){
			console.log(ups)
			const m = ups.match(matcher)
			const rank = m[1]
			username = m[2]
			const num = m[3]
			const puzzleIds = m[4].split(" ")
			const puzzleUrls = puzzleIds.map(puzzleId => `<a target="_blank" rel="noopener noreferrer" href="https://lichess.org/training/${puzzleId}">${puzzleId}</a>`).join("<br>")

			res.send(`wow , <b style="color:#070">${username}</b> has games in puzzles , rank <b style="color:#00f">${rank}</b> , number of puzzles <b style="color:#707">${num}</b><hr>${puzzleUrls}`)	
		}else{
			res.send(`meh ... , user <b style="color: #700">${username}</b> was not found in puzzles database`)
		}
	}else if(toplistPageStr){		
		logDiscord(`get toplist page ${toplistPageStr}`)
		
		const toplistPage = parseInt(toplistPageStr)
		getToplistPage(toplistPage).then(
			records => res.send(genToplistPage(records)),
			err => res.send(err)
		)
	}else{
		res.sendFile(path.join(__dirname, "index.html"))		
	}
})
	
function lookupUsername(username){
	const matcher = new RegExp(`([0-9]+),(${username}),([0-9]+),(.*)`, "i")
	const ups = puzzles.find(line => line.match(matcher))
	
	if(ups){		
		const m = ups.match(matcher)		
		return {
			rank: parseInt(m[1]),
			username: m[2],
			num: parseInt(m[3]),
			puzzleIds: m[4].split(" ")
		}
	}else{
		return null
	}
}
	
app.get("/nunjucks", (req, res) => {
	let username = req.query.getpuzzles
	const toplistPageStr = req.query.toplistPage
	
	let found = null
	
	if(username){
		found = lookupUsername(username)
	}
		
	res.render('nunjucks.html', {
		username: username,
		found: found,		
		foundJsonStr: JSON.stringify(found, null, 2),
		toplistPageStr: toplistPageStr
	})
})
	
app.get("/toplist", (req, res) => {
	const pageStr = req.query.page || "1"
	const page = parseInt(pageStr)
	if(isNaN(page)) page = 1
	getToplistPage(page).then(
		puzzles => {
			res.render('toplist.html', {
				page: page,
				puzzles: puzzles
			})
		},
		err => res.send(err)
	)
})
	
app.get("/puzzle", (req, res) => {
	const id = req.query.id
	fetch(`https://lichess.org/training/${id}`).then(response => response.text().then(content => {		
		const m = content.match("lichess.load.then...=>.LichessPuzzle.(.*)")		
		const blob = JSON.parse(m[1].replace(")})</script></body></html>", ""))
		const blobJson = JSON.stringify(blob, null, 2)
		res.send(blobJson)
	}))
})

app.use("/", express.static(path.join(__dirname, "/")))

app.listen(PORT, _ => {
 	console.log(`amgilp nunjucks server listening at ${PORT}`)
})