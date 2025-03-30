const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.HOST,
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      port: process.env.PORT_DB,
      connectionLimit: 10, // Adjust based on your needs
    });
  }

  async connect() {
    try {
      console.log('Getting a connection from the pool...');
      this.connection = await this.pool.getConnection();
      console.log('Database connection successful');
    } catch (err) {
      console.error('Error connecting to database:', err);
      throw err;
    }
  }

  async close() {
    if (this.connection) {
      try {
        console.log('Releasing database connection...');
        this.connection.release();
        this.connection = null;
        console.log('Database connection released');
      } catch (err) {
        console.error('Error releasing database connection:', err);
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

module.exports = Database;
