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
const cors = require('cors');

const app = express();

app.use(express.json())
app.use(cors())

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

function getDBClient(){
  return new Client({
    connectionString: process.env.DATABASE_URL,
    // host:"localhost",
    // database: "test"
    ssl: {
      rejectUnauthorized: false
    }})
}

function getCurrentSample(coder, client){
  client.query('SELECT * from current_sample WHERE coder = \''+coder+'\';', (err, res) => {
    if (err) throw err;
  
    if (res.rows.length < 1){
      //send first sample by default
      return {
        sample_folder: 'FFmpeg-FFmpeg-commit-02f909dc24b1f05cfbba75077c7707b905e63cd2',
        sample_number: 1
            }
    }
    return {
      sample_folder: res.rows[0]['sample_folder'],
      sample_number: parseInt(res.rows[0]['sample_number'])
          }

  });
}

function getNextSample(coder, client){

  const current = getCurrentSample(coder, client);

  if (current['sample_number'] >= 87) {
    return {sample_folder: 'done', sample_number: 0}
  } else {

    client.query('SELECT * from samples WHERE sample_number = \''+(current['sample_number'] + 1).toString()+'\';', (err, res) => {
      if (err) throw err;
    
      if (res.rows.length < 1){
        return {sample_folder: 'done', sample_number: 0}
      }

      return {
        sample_folder: res.rows[0]['sample_folder'],
        sample_number: parseInt(res.rows[0]['sample_number'])
            }
  
    });

  }

}

function updateCurrentSample(coder, client){
  const next_sample = getNextSample(coder, client);

  const update_query = "UPDATE current_sample SET sample_number = \'"+
  next_sample['sample_number'].toString()+
  "\', sample_folder =  \'"+
  next_sample['sample_folder']+
  "\' WHERE coder = \'"+coder+"\';"

  client.query(update_query, (err, res) => {
    if (err) throw err;
  });

}

app.get('/', function(req, response){
  const client = getDBClient();
  client.connect();
  
  let resp = "temp";

  client.query('SELECT * from test_table;', (err, res) => {
    if (err) throw err;
    
    resp = res.rows[0]['sample'] + ' ' + res.rows[1]['sample'] + ' ' + res.rows[2]['sample'] + ' ';
    response.send(resp)
    client.end();
  });


  // res.send(resp)
});

app.get('/current', function(req, response){
  const client = getDBClient();
  client.connect();

  const coder = req.query['coder'].toLowerCase();

  client.query('SELECT * from current_sample WHERE coder = \''+coder+'\';', (err, res) => {
    if (err) throw err;
    
    // resp = res.rows[0]['sample'] + ' ' + res.rows[1]['sample'] + ' ' + res.rows[2]['sample'] + ' ';
    if (res.rows.length < 1){
      //send first sample by default
      response.send('FFmpeg-FFmpeg-commit-02f909dc24b1f05cfbba75077c7707b905e63cd2')
    } else {
      response.send(res.rows[0]['sample_folder'])
    }
    client.end();
  });

});

app.post('/store-response', function(req, response){
  const client = getDBClient();
  client.connect();

  console.log('request body -->', req.body);

  const coder = req.body['coder'].toLowerCase();
  
  const sample = req.body['sample'];
  
  let result = req.body['result'].toUpperCase();

  result = result === 'A' || result === 'B' || result === 'C' ? result : 'C';

  const result_table = coder+'_results';

  const update_query = "UPDATE "+result_table+" SET result = \'"+result+"\' WHERE sample_folder = \'"+sample+"\';"

  console.log('update query -->', update_query);


  client.query(update_query, (err, res) => {
    if (err) throw err;
    
    console.log('query response -->', res);

    const current = getCurrentSample(coder, client)
    if (sample === current['sample_folder']){
      updateCurrentSample(coder, client);
      const new_current = getCurrentSample(coder, client);
      response.send(new_current['sample_folder'])
    } else {
      response.send(current['sample_folder'])
    }

    client.end();
  });
    

});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));