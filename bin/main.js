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
    this.db = new sqlite3.Database(saveDir + 'memojs.sqlite3')
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

class AppBase {
  readLines() {
    return new Promise(resolve => {
      console.log('Type text:')
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
}


class App extends AppBase {
  constructor(tableName) {
    super()
    this.db = new DB(tableName)
    this.db.init()
    this.db.createTable()
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
  async showMemos() {
    const titles = await this.db.all()
    titles.forEach(title => { console.log(title) })
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
  const argv = require('minimist')(process.argv.slice(2))
  if (Object.keys(argv).length > 2) {
    throw "Expected only one argument. '-h', '-n', '-l', '-r' or '-d'"
  }
  if (Object.keys(argv).length < 2) {
    app.createMemo()
    return
  }
  else if ('h' in argv) {
    console.log("usage:\n  -n, メモの新規作成\n  -l, メモの一覧\n  -r, メモの閲覧\n  -d, メモの削除")
  } else if ('n' in argv) {
    app.createMemo()  // 作成
  } else if ('l' in argv) {
    app.showMemos()  // 一覧
  } else if ('r' in argv) {
    app.readMemo()  // 参照
  } else if ('d' in argv) {
    app.deleteMemo()  // 削除
  } else {
    console.log("usage:\n  -n, メモの新規作成\n  -l, メモの一覧\n  -r, メモの閲覧\n  -d, メモの削除")
  }
}

main()