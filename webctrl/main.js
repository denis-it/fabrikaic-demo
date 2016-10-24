const express = require('express')
const log = require('./logging')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

const DATAFILE = 'data.json'
const COMMANDSFILE = 'commands.bin'

const DEFAULT_PAUSE = 5000
const COMMAND_PAUSE = 4000
const ERROR_PAUSE = 10000

function flashNextProgram () {
  try {
    let pause = DEFAULT_PAUSE

    const data = JSON.parse(fs.readFileSync(DATAFILE, 'utf8'))
    if (data.pointer < data.programs.length) {
      const program = data.programs[data.pointer]

      data.pointer += 1
      fs.writeFileSync(DATAFILE, JSON.stringify(data), 'utf8')

      log.debug('start processing program \'' + program.name + '\'')
      fs.writeFileSync(COMMANDSFILE, Buffer.from(program.commands), 'utf8')

      program.commands.forEach((command, index) => {
        if (index !== 0 && command & 32 === 0) {
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

function getState (info) {
  return '[' + Math.floor(Math.random() * 1000) + '] ' + info + ' | '
}

app.get('/', (req, res) => {
  const state = getState(req.url)
  const result = {
    status: 'ok'
  }
  res.sendFile('index.html')
  log.debug(state + 'response sent: ' + JSON.stringify(result))
})

app.get('/queue', (req, res) => {
  const state = getState(req.url)
  const result = {
    status: 'ok',
    data: [{
      name: 'program_1',
      commands: 322,
      status: 0
    }, {
      name: 'program_2',
      commands: 2,
      status: 1
    }, {
      name: 'program_3',
      commands: 20,
      status: 2
    }]
  }
  res.status(200).json(result)
  log.debug(state + 'response sent: ' + JSON.stringify(result))
})

app.listen(8080, () => {
  log.debug('listening on *:8080')
})
