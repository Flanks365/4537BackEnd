const express = require('express');
const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = 8080;

class Database {
  constructor() {
      this.connection = null;
  }

  async connect() {
      if (!this.connection) {
          try {
              console.log('Attempting to connect to database...');
              this.connection = await mysql.createConnection({
                  host: process.env.HOST,
                  user: process.env.USER,
                  password: process.env.PASSWORD,
                  database: process.env.DATABASE,
                  port: process.env.PORT_DB
              });
              console.log('Database connection successful');
          } catch (err) {
              console.error('Error connecting to database:', err);
          }
      }
  }

  async close() {
      if (this.connection) {
          try {
              console.log('Closing database connection...');
              await this.connection.end();
              this.connection = null;
              console.log('Database connection closed');
          } catch (err) {
              console.error('Error closing database connection:', err);
          }
      }
  }

  async selectQuery(query) {
      await this.connect();
      console.log(`Executing SELECT query: ${query}`);
      try {
          const [results] = await this.connection.execute(query);
          console.log('SELECT query result:', results);
          return results;
      } catch (err) {
          console.error('Error executing SELECT query:', err);
          throw err;
      } finally {
          await this.close();
      }
  }

  async insertQuery(query) {
      await this.connect();
      console.log(`Executing INSERT query: ${query}`);
      try {
          const [results] = await this.connection.execute(query);
          console.log('INSERT query result:', results);
          return results;
      } catch (err) {
          console.error('Error executing INSERT query:', err);
          throw err;
      } finally {
          await this.close();
      }
  }

  async updateQuery(query) {
      await this.connect();
      console.log(`Executing UPDATE query: ${query}`);
      try {
          const [results] = await this.connection.execute(query);
          console.log('UPDATE query result:', results);
          return results;
      } catch (err) {
          console.error('Error executing UPDATE query:', err);
          throw err;
      } finally {
          await this.close();
      }
  }

  async deleteQuery(query) {
      await this.connect();
      console.log(`Executing DELETE query: ${query}`);
      try {
          const [results] = await this.connection.execute(query);
          console.log('DELETE query result:', results);
          return results;
      } catch (err) {
          console.error('Error executing DELETE query:', err);
          throw err;
      } finally {
          await this.close();
      }
  }
}

const db = new Database();

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


app.get('/', async (req, res) => {
  console.log("GET /");
  try {
    const results = await db.selectQuery('SELECT * FROM users');
    res.json({
      message: 'Database connection and query successful!',
      data: results
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});
