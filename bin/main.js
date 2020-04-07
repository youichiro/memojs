#! /usr/bin/env node
const sqlite3 = require('sqlite3')
const fs = require('fs')

class DB {
  constructor(tableName) {
    this.tableName = tableName || 'memos'
  }
  init() {
    const saveDir = process.env.HOME + "/.npm/"
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir)
    }
    this.db = new sqlite3.Database(saveDir + 'memomemo.sqlite3')
  }
  async createTable() {
    return new Promise((resolve, reject) => {
      try {
        this.db.serialize(() => {
          this.db.run(
            `CREATE TABLE IF NOT EXISTS ${this.tableName} (
            title text primary key, text text)`
            )
        })
        return resolve()
      } catch (err) {
        return reject(err)
      }
    })
  }
  async save(memo) {
    return new Promise((resolve, reject) => {
      try {
        this.db.run(
          `INSERT OR REPLACE INTO ${this.tableName}
          (title, text) values ($title, $text)`,
          memo.title, memo.text
        )
        return resolve()
      } catch (err) {
        return reject(err)
      }
    })
  }
  async all() {
    const result = []
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.all(`SELECT title, text FROM ${this.tableName}`,
        (err, rows) => {
          if (err) return reject(err)
          rows.forEach(row => { result.push(row.title) })
          return resolve(result)
        })
      })
    })
  }
  async find(title) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT title, text FROM ${this.tableName} WHERE title = ?`,
        [title],
        (err, row) => {
          if (err) return reject(err)
          return resolve(new Memo(row.title, row.text))
      })
    })
  }
  async delete(title) {
    return new Promise((resolve, reject) => {
      try {
        this.db.run(`DELETE FROM ${this.tableName} WHERE title = $title`, title)
        return resolve()
      } catch (err) {
        return reject(err)
      }
    })
  }
}

class Memo {
  constructor(title, text) {
    this.title = title
    this.text = text
  }
}

class App {
  constructor(tableName) {
    this.db = new DB(tableName)
    this.db.init()
    this.db.createTable()
  }
  readLines() {
    return new Promise(resolve => {
      let lines = []
      const reader = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })
      reader.on('line', (line) => {
        lines.push(line);
      })
      reader.on('close', () => {
        resolve(lines)
      })
    })
  }
  async createMemo() {
    const lines = await this.readLines()
    if (lines.length > 0) {
      const title = lines[0]
      const text = lines.join('\n')
      const memo = new Memo(title, text)
      await this.db.save(memo)
      console.log(`created memo: ${title}`)
    }
  }
  selectCLI(titles, message) {
    return new Promise(resolve => {
      const { Select } = require('enquirer')
      const prompt = new Select({
        name: 'memos',
        message: message,
        choices: titles
      })
      prompt.run()
        .then(answer => {
          resolve(answer)
        })
        .catch(console.error)
    })
  }
  async showMemos() {
    const titles = await this.db.all()
    titles.forEach(title => { console.log('- ' + title) })
  }
  async readMemo() {
    const titles = await this.db.all()
    if (titles.length == 0) { return }
    const answer = await this.selectCLI(titles, 'Choose a memo you want to see')
    const memo = await this.db.find(answer)
    console.log(memo.text)
  }
  async deleteMemo() {
    const titles = await this.db.all()
    if (titles.length == 0) { return }
    const answer = await this.selectCLI(titles, 'Choose a memo you want to delete')
    await this.db.delete(answer)
    console.log(`deleted memo: ${answer}`)
  }
}

async function main() {
  const app = new App('memos')
  const usage = "Usage: memomemo [text] [<options>]\n\nOptions:\n  -n\tcreate a memo\n  -l\tlist up memos\n  -r\tread a memo\n  -d\tdelete a memo"
  const argv = require('minimist')(process.argv.slice(2))
  if (Object.keys(argv).length > 2) {
    throw "Expected only one argument. '-h', '-n', '-l', '-r' or '-d'"
  }
  if (Object.keys(argv).length < 2) {
    app.createMemo()
    return
  }
  else if ('h' in argv) {
    console.log(usage)
  } else if ('n' in argv) {
    app.createMemo()
  } else if ('l' in argv) {
    app.showMemos()
  } else if ('r' in argv) {
    app.readMemo()
  } else if ('d' in argv) {
    app.deleteMemo()
  } else {
    console.log(usage)
  }
}

main()
