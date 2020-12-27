const express = require('express')
const app = express()
const PORT = parseInt(process.env.PORT || "3000")
const path = require('path')
const fs = require('fs')
const fetch = require('node-fetch')
const stringSimilarity = require('string-similarity')
const exec = require('child_process').exec

const serverUrl = process.env.SERVER_URL || "https://amgilp.herokuapp.com"

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

const puzzles = fs.readFileSync("leaderboard.csv").toString().replace(/\r/g, "").split("\n").slice(1)

const usernames = {}

let i = 0
puzzles.forEach(puzzle => {
	const [rank, username, num, ids] =  puzzle.split(",")
	
	if(username){
		usernames[username.toLowerCase()] = {
			fullIndex0: i,
			fullIndex1: i + 1,			
			username: username,
			rank: parseInt(rank),
			num: parseInt(num),
			puzzleIds: ids.split(" ")
		}
	}
	
	i++
})

fs.writeFileSync("strsim/usernames.txt", Object.keys(usernames).map(username => usernames[username].username).join("\n"))

///////////////////////////////////////////////////////////////////////

function getToplistPage(page, all){
	return new Promise((resolve, reject) => {
		const from = (page - 1) * TOPLIST_PAGE_SIZE		
		const len = puzzles.length
		const to = Math.min(page * TOPLIST_PAGE_SIZE, len)
		const maxAllowedPage = Math.floor(len / TOPLIST_PAGE_SIZE)
		
		if(page > maxAllowedPage){
			reject(`toplist page out of range ( maximum allowed page is ${maxAllowedPage} )`)						
		}else{
			resolve(puzzles.slice(from, to).map((csv, i) => {
				const items = csv.split(",")
				let ids = items[3].split(" ")
				let andMore = ""
				const maxChunk = all ? 10000 : 10
				
				if(ids.length > maxChunk){
					andMore = `... and ${ids.length - maxChunk} more puzzle(s)`
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
					andMore: andMore || undefined
				}
			}))
		}
	})
}
	
function getBestMatch(username, found){return new Promise(resolve => {	
	if(!username){
		resolve(null)
		
		return
	}
	
	if(found){
		resolve(found.username)
		
		return 
	}
	
	const cwd = `${path.join(__dirname, "strsim")}`
	const command = `${cwd}/strsim ${username}`
		
	exec(command, {
		cwd: cwd
	}, (error, stdout, stderr) => {		
		const matches = JSON.parse(stdout)
		
		resolve(matches[matches.length - 1])
	})
})}
	
app.get('/', (req, res) => {
	let username = req.query.getpuzzles
	const toplistPageStr = req.query.toplistPage
	
	if(toplistPageStr){
		res.redirect(`/toplist/?page=${toplistPageStr}`)
		
		return
	}
	
	let found = null
	
	if(username) found = usernames[username.toLowerCase()]
	
	getBestMatch(username, found).then(bestMatch => {
		if(username){
			logDiscord(`getpuzzles of ${username} ( <${serverUrl}> )`)
		}
		
		res.render('nunjucks.html', {
			username: username,
			found: found,		
			foundJsonStr: JSON.stringify(found, null, 2),		
			bestMatch: bestMatch
		})
	})
})

function determinePage(pageStr){	
	if(!pageStr) return 1
	const page = parseInt(pageStr)	
	if(isNaN(page)) return 1
	if(page < 1) return 1
	return page
}

function getQueryPage(req){
	return determinePage(req.query.page)
}

app.get("/toplist", (req, res) => {
	const page = getQueryPage(req)
		
	logDiscord(`get toplist page ${page} ( <${serverUrl}> )`)

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

app.get('/api/toplist', (req, res) => {
	res.set('Content-Type', 'application/json')
	
	const page = getQueryPage(req)
	
	logDiscord(`api get toplist page ${page} ( <${serverUrl}> )`)
	
	getToplistPage(page, true).then(
		records => {
			res.send(JSON.stringify({
				status: "ok",
				page: page,
				records: records
			}))
		},
		err => res.send(JSON.stringify({
			status: err,
			page: page,
			records: []
		}))
	)
})

app.get('/api/users', (req, res) => {
	res.set('Content-Type', 'application/json')
	
	if(!req.query.usernames){
		res.send(JSON.stringify({
			status: "usernames required",
			records: []
		}))
		
		return
	}
	
	const search = req.query.usernames.split(",")
	
	logDiscord(`api get users ${search} ( <${serverUrl}> )`)
	
	const records = search.map(username => usernames[username.toLowerCase()]).filter(item => typeof item != "undefined")
	
	res.send(JSON.stringify({
		status: "ok",
		records: records
	}))
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

app.get('/api', (req, res) => {
	res.redirect("https://github.com/hyperchessbot/amgilp#api")
})

app.use("/", express.static(path.join(__dirname, "/")))

app.listen(PORT, _ => {
 	console.log(`amgilp nunjucks server listening at ${PORT}`)
})
