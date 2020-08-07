const discord = require('discord.js')
const cron = require('cron')
const rp = require('request-promise')
const fs = require('fs')
const moment = require('moment')
const $ = require('cheerio')
const lodash = require('lodash')


const bot = new discord.Client()
const token = 'NzQwMTg3NDY4NzExNTkxOTY2.XylXTA.evCNOEo2TvNrueAqcgSRstoD8Qk'
const PREFIX = '!'
const url = 'https://pl3.darkorbit.com/index.es?profile=6nPGm&profileCheck=JSXal&lang=pl'
const job = cron.job('0 */12 * * *', updateAllUsers(false))


let timeNow = () => moment().format('YYYY-MM-DD hh:mm:ss')
let dateNow = () => moment().format('YYYY-MM-DD')
let log = (data) => {
    fs.appendFileSync('./do-profiler.log', timeNow() + ' ' + data + '\n')
}


bot.on('ready', () => {
    console.log("The Bot is online")
    log('The Bot is online')
})


bot.on('message', msg => {
    if (msg.content.indexOf(PREFIX) != 0)
        return 0

    log('New order: ' + msg.content + '(' + msg.author.username + ')')    
    let args = msg.content.substring(PREFIX.length).split(" ")

    switch (args[0]) {
        case "ping":
            msg.channel.send("pong")
            break

        case "dodaj":
        case "obserwuj":
            if (args.length > 1)
                addUser(msg, args[1])
            else
                msg.channel.send("Daj mi link do profilu")
            break

        case "skomentuj":
            // addComment(msg, args[1], args)
            msg.channel.send("To jeszcze nie działa")

        case "szczegóły":
        case "historia":
            if (args.length > 1)
                printUser(msg, args[1])
            else
                msg.channel.send("Daj mi link do profilu albo nick")
            break

        case "wszystkie":
        case "wszyscy":
            printAllUsers(msg)
            break

        case "aktualizuj":
            updateAllUsers(msg)
            break

        case "":
        case "komendy":
            msg.channel.send(
                '"!obserwuj <link do profilu>" - dodaj gracza do obserwowanych\n "!historia <link do profilu>" - wyświetl historię nicków gracza\n "!historia <nick>" - wyświetl historię nicków gracza\n "!wszyscy" - wyświetla wszystkie zapisane konta i historie\n "!aktualizuj" - aktualizuje nicki wszystkich obserwowanych'
            )
            break
        default:
            msg.channel.send("Nie ponimaju :(")
    }
})


function addUser (msg, link) {
    let profiles = JSON.parse(fs.readFileSync('./profiles.json'))

    rp(link)
        .then(function(html) {
            let nickname = $('#nickname', html).text().trim()

            if (lodash.filter(profiles, { history : [{ "nick" : nickname }]}).length > 0) {
                msg.channel.send("Już obserwuję tego gracza")
                printUser(msg, nickname)
                log('The player ' + nickname + ' is already followed')
                return 0
            }

            profiles.push({
                "nick" : nickname,
                "link" : link,
                "author" : msg.author.username,
                "description" : "",
                "history" : [
                    {
                        "nick" : nickname,
                        "date" : (new Date()).toLocaleDateString()
                    }
                ]
            })
            
            fs.writeFileSync('./profiles.json' ,JSON.stringify(profiles))
            msg.channel.send('Aha, obserwuję ' + nickname)
            log('Followe new player ' + nickname)
        })
        .catch(function(error){
            console.log("error" + error)
            msg.channel.send("Coś nie zadziałało, niech Maksim sprawdzi co poszło nie tak")
            log('Error occured: ' + error)
        })
}

function addComment (msg, user, args) {

}

function printUser (msg, userdata) {
    const profiles = JSON.parse(fs.readFileSync('./profiles.json'))

    let profile = lodash.filter(profiles, { history : [{ "nick" : userdata }]})
    if (profile.length == 0)
        profile = lodash.filter(profiles, { "link" : userdata })
    
    if (profile.length > 0) {
        for (i=0; i < profile.length; i++) {
            let history = addEsc(profile[i]['nick'])
            for (j=0; j < profile[i]['history'].length; j++) {
                history += "\nod " + profile[i]['history'][j]['date'] + " jako " + addEsc(profile[i]['history'][j]['nick'])
            }
            msg.channel.send(history)
            log('Send profile ' + profile[i]['nick'])
        }
    } else {
        msg.channel.send("Jeszcze nie obserwuj takiego gracza")
        log('Not found user profile: ' + userdata)
    }
}

function printAllUsers (msg) {
    const profiles = JSON.parse(fs.readFileSync('./profiles.json'))

    let iteration = 0
    let history = ""
    for (i=0; i < profiles.length; i++) {
        iteration++
        history += "\n" + addEsc(profiles[i]['nick'])
        historyLen = profiles[i]['history'].length
        if (profiles[i]['nick'] != profiles[i]['history'][historyLen-1]['nick'])
            history += " (aktualnie: " + addEsc(profiles[i]['history'][historyLen-1]['nick']) + ")"

        // for (j=0; j < profiles[i]['history'].length; j++) {
        //     history += "\nod " + profiles[i]['history'][j]['date'] + " jako " + profiles[i]['history'][j]['nick']
        // }
        if (iteration >= 20) {
            msg.channel.send(history)
            history = ""
            iteration = 0
        }
    }
    msg.channel.send(history)
    log('Send all followed users')
}

async function updateAllUsers (msg) {
    const profiles = JSON.parse(fs.readFileSync('./profiles.json'))

    for (i=0; i < profiles.length; i++) {
        historyLen = profiles[i]['history'].length
        lastNick = profiles[i]['history'][historyLen-1]['nick']
        link = profiles[i]['link']

        await rp(link)
            .then(function (html) {
                let nickname = $('#nickname', html).text().trim()

                if (nickname != lastNick)
                    profiles[i]['history'].push(
                        {
                            "nick" : nickname,
                            "date" : (new Date()).toLocaleDateString()
                        }
                    )
            })
            .catch(function(error){
                console.log("error" + error);
                if (msg)
                    msg.channel.send("Coś nie zadziałało, niech Maksim sprawdzi co poszło nie tak")
                log('Error occured: ' + error)
            })
    }
    
    fs.writeFileSync('./profiles.json' ,JSON.stringify(profiles))
    if (msg)
        msg.channel.send("Wszystkie profile już aktualne")
    log('Update all profiles')
}

function addEsc (nick) {
    return nick.split("_").join("\\_").split("*").join("\\*")
}


bot.login(token)
