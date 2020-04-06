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

module.exports = { DB, Memo }
