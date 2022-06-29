// const express = require('express')
// const path = require('path')
// const PORT = process.env.PORT || 5000

// express()
//   .use(express.static(path.join(__dirname, 'public')))
//   .set('views', path.join(__dirname, 'views'))
//   .set('view engine', 'ejs')
//   .get('/', (req, res) => res.render('pages/index'))
//   .listen(PORT, () => console.log(`Listening on ${ PORT }`))


// const { Client } = require('pg');

// const client = new Client({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// client.connect();

// client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
//   if (err) throw err;
//   for (let row of res.rows) {
//     console.log(JSON.stringify(row));
//   }
//   client.end();
// });

  // const fs = require('fs');
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

const app = express();

const { Client } = require('pg');

// const client = new Client({
//   // connectionString: process.env.DATABASE_URL,
//   host:"localhost",
//   database: "test"
//   // ssl: {
//   //   rejectUnauthorized: false
//   // }
// });

// client.connect();

let body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>HTML 5 Boilerplate</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
  <script src="index.js"></script>
    <h1>Test heading here!!</h1>
    <h2 id='holder'></h2>
    <button type="button" id="next-button">Click here for next line</button>
  </body>
</html>`;

app.get('/', function(req, res){
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // host:"localhost",
    // database: "test"
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  client.connect();
  
  let resp = "temp";

  client.query('SELECT * from test_table;', (err, res) => {
    if (err) throw err;
    
    resp = res.rows[0]['sample'] + ' ' + res.rows[1]['sample'] + ' ' + res.rows[2]['sample'] + ' ';
    client.end();
  });


  res.send(resp)
});

// app.get('/books', function(req, res){


// });

// app.post('/books-new', function(req, res){
    

// });

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));