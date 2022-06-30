const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
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

// function getCurrentSample(coder){
//   console.log('inside get current sample function');
//   console.log('SELECT * from current_sample WHERE coder = \''+coder+'\';');

//   const tclient = getDBClient();
//   tclient.connect();

//   tclient.query('SELECT * from current_sample WHERE coder = \''+coder+'\';', (err, res) => {
//     console.log('AAA query response ---> ', res);
    
//     if (err){
//       console.log('error!!!!!!');
//       throw err;
//     }

//     if (res.rows.length < 1){
//       tclient.end();

//       //send first sample by default
//       return {
//         sample_folder: 'FFmpeg-FFmpeg-commit-02f909dc24b1f05cfbba75077c7707b905e63cd2',
//         sample_number: 1
//             }
//     }

//     tclient.end();
//     return {
//       sample_folder: res.rows[0]['sample_folder'],
//       sample_number: parseInt(res.rows[0]['sample_number'])
//           }

//   });
// }

// function getNextSample(coder){
//   const client = getDBClient();
//   client.connect();

//   const current = getCurrentSample(coder, client);

//   if (current['sample_number'] >= 87) {
//     return {sample_folder: 'done', sample_number: 0}
//   } else {

//     client.query('SELECT * from samples WHERE sample_number = \''+(current['sample_number'] + 1).toString()+'\';', (err, res) => {
//       if (err) throw err;
    
//       if (res.rows.length < 1){
//         client.end();
//         return {sample_folder: 'done', sample_number: 0}
//       }

//       client.end();
//       return {
//         sample_folder: res.rows[0]['sample_folder'],
//         sample_number: parseInt(res.rows[0]['sample_number'])
//             }
  
//     });

//   }

// }

// function updateCurrentSample(coder){
//   const client = getDBClient();
//   client.connect();

//   const next_sample = getNextSample(coder, client);

//   const update_query = "UPDATE current_sample SET sample_number = \'"+
//   next_sample['sample_number'].toString()+
//   "\', sample_folder =  \'"+
//   next_sample['sample_folder']+
//   "\' WHERE coder = \'"+coder+"\';"

//   client.query(update_query, (err, res) => {
//     if (err) throw err;
    
//     client.end();
//   });

// }

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
      response.send({
        sample_folder: res.rows[0]['sample_folder'],
        sample_number: res.rows[0]['sample_number']
      })
    }
    client.end();
  });

});

app.post('/store-response', bodyParser.json(), function(req, response){
  const client = getDBClient();
  client.connect();

  console.log('request body -->', req.body);

  const coder = req.body['coder'].toLowerCase();
  
  const sample = req.body['sample_folder'];

  const sample_number = parseInt(req.body['sample_number']);
  
  let result = req.body['result'].toUpperCase();

  result = result === 'A' || result === 'B' || result === 'C' ? result : 'C';

  const result_table = coder+'_results';

  const update_query = "UPDATE "+result_table+" SET result = \'"+result+"\' WHERE sample_folder = \'"+sample+"\';"

  console.log('update query -->', update_query);


  // client.query(update_query, (err, res) => {
  //   if (err) throw err;
    
  //   console.log('query response -->', res);

  //   const current = getCurrentSample(coder);

  //   console.log('current is ---> ', current);

  //   if (sample === current['sample_folder']){
  //     updateCurrentSample(coder);
  //     const new_current = getCurrentSample(coder);
  //     response.send(new_current['sample_folder'])
  //   } else {
  //     response.send(current['sample_folder'])
  //   }

  //   client.end();
  // });

  client.query(update_query)
  .then((res) => {
    //update current sample, first get next sample

    console.log('first then, res --> ', res);
    if (sample_number >= 87) {
      return {sample_folder: 'done', sample_number: 0};
    } else {
      return client.query('SELECT * from samples WHERE sample_number = \''+(sample_number + 1).toString()+'\';');
    }
  })
  .then((res) => {
    //result from get next sample should be here (either 'done' or an actual sample)

    console.log('second then, res --> ', res);
    let update_query = '';
    if (res['rows']){
      //actual value
     update_query = "UPDATE current_sample SET sample_number = \'"+
      res['rows'][0]['sample_number']+
      "\', sample_folder =  \'"+
      res['rows'][0]['sample_folder']+
      "\' WHERE coder = \'"+coder+"\';";

    } else {
      //no next value
      update_query = "UPDATE current_sample SET sample_number = '0', sample_folder = 'done' WHERE coder = \'"+coder+"\';";
    }
    return client.query(update_query);
  })
  .then((res) => {
    //make query to get new current sample

    console.log('third then, res --> ', res);
    return client.query('SELECT * from current_sample WHERE coder = \''+coder+'\';');
  })
  .then((res) => {

    console.log('fourth then (response), res --> ', res);
    response.send({
      sample_folder: res.rows[0]['sample_folder'],
      sample_number: res.rows[0]['sample_number']
    });
  })
  .catch((err) => {throw err})
  .then((res) => {
    console.log('final then, res --> ', res);
    client.end()});
    

});


app.post('/previous', function(req, response){
  //get previous sample, moves current sample to previous sample
  const client = getDBClient();
  client.connect();

  console.log('request body -->', req.body);

  const coder = req.body['coder'].toLowerCase();
  
  // const sample = req.body['sample_folder'];

  const sample_number = parseInt(req.body['sample_number']);

  if (sample_number <= 1 || sample_number >= 88) {
    response.send("no-previous-sample")
    return;
  }

  client.query('SELECT * from samples WHERE sample_number = \''+(sample_number - 1).toString()+'\';')
  .then((res) => {
    //result from selecting previou sample should be here --> use to update current sample
    const update_query = "UPDATE current_sample SET sample_number = \'"+
      res['rows'][0]['sample_number']+
      "\', sample_folder =  \'"+
      res['rows'][0]['sample_folder']+
      "\' WHERE coder = \'"+coder+"\';";

    return client.query(update_query);
  })
  .then((res) => {
    //current_sample table has been updated --> make query to get new current sample 
    return client.query('SELECT * from current_sample WHERE coder = \''+coder+'\';');
  })
  .then((res) => {
    //response should contain current sample --> send to client
    response.send({
      sample_folder: res.rows[0]['sample_folder'],
      sample_number: res.rows[0]['sample_number']
    });
  })
  .catch((err) => {throw err})
  .then((res) => {
    console.log('final then, res --> ', res);
    client.end()});
    

});
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));