const express = require('express')
const log = require('./logging')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const bodyParser = require('body-parser')

const COMMANDSFILE = 'commands.bin'

const DEFAULT_PAUSE = 5000
const COMMAND_PAUSE = 4000
const ERROR_PAUSE = 10000

let g_data = {
  pointer: 0,
  programs: [{
    name: 'example',
    commands: [0, 31, 16, 64, 95, 152, 128, 152, 101, 0, 95, 133, 69, 31, 95, 152, 69]
  }]
}

let g_queueCache = []

function flashNextProgram () {
  try {
    let pause = DEFAULT_PAUSE

    if (g_data.pointer < g_data.programs.length) {
      const program = g_data.programs[g_data.pointer]

      g_data.pointer += 1
      g_queueCache = []

      log.debug('start processing program \'' + program.name + '\'')
      fs.writeFileSync(COMMANDSFILE, Buffer.from(program.commands), 'utf8')

      program.commands.forEach((command, index) => {
        if (index !== 0 && (command & 32) === 0) {
          pause += COMMAND_PAUSE
        }
      })

      try {
        const stdout = execSync('avrdude -C +avrdude.conf -p t2313 -U eeprom:w:' + COMMANDSFILE + ':r')
        log.debug('avrdude stdout: ' + stdout)
        log.debug('program flashed, next flash on ' + pause + 'ms')
        setTimeout(flashNextProgram, pause)
      } catch (e) {
        log.error('error executing avrdude: ' + JSON.stringify(e))
      }
    } else {
      log.debug('no new programs, retry on ' + pause + 'ms')
      setTimeout(flashNextProgram, pause)
    }
  } catch (e) {
    const pause = ERROR_PAUSE
    log.error('an error occurred: ' + JSON.stringify(e) + ', retry on ' + pause + 'ms')
    setTimeout(flashNextProgram, pause)
  }
}
flashNextProgram()

const app = express()
app.use(express.static(path.join(__dirname, 'static')))
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendFile('index.html')
})

app.get('/api/queue', (req, res) => {
  if (g_queueCache.length == 0) {
    const FLASHED = 0
    const PENDING = 1

    g_data.programs.forEach((program, index) => {
      g_queueCache.push({
        name: program.name,
        commands: program.commands.length,
        status: index < g_data.pointer ? FLASHED : PENDING
      })
    })
  }

  res.status(200).json(g_queueCache)
  log.debug('response sent: ' + JSON.stringify(g_queueCache))
})

app.post('/api/queue', (req, res) => {
  const program = req.body
  log.debug('data received: ' + JSON.stringify(program))

  g_data.programs.push(program)
  g_queueCache = []
})

app.listen(8080, () => {
  log.debug('listening on *:8080')
})
