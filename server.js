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
				let ids = items[3].split(" ")
				let andMore = ""
				const maxChunk = 10
				if(ids.length > maxChunk){
					andMore = `... and ${ids.length - maxChunk} other puzzle(s)`
					ids = ids.slice(0, maxChunk)
				}
				return {
					index0: i,
					index1: i + 1,			
					fullIndex0: from + i,
					fullIndex1: from + i + 1,
					rank: parseInt(items[0]),
					username: items[1],
					num: parseInt(items[2]),
					ids: ids,
					andMore: andMore
				}
			}))
		}
	})
}
	
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
	
app.get("/", (req, res) => {
	let username = req.query.getpuzzles
	const toplistPageStr = req.query.toplistPage
	
	let found = null
	
	if(username){
		found = lookupUsername(username)
		logDiscord(`getpuzzles of ${username}`)
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
		
	logDiscord(`get toplist page ${page}`)

	getToplistPage(page).then(
		puzzles => {
			res.render('toplist.html', {
				page: page,
				nextPage: page + 1,
				prevPage: page - 1,
				title: `amgilp - Toplist Page ${page} - Are my games in lichess puzzles ?`,
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