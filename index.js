const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const cors = require('cors');
// const bodyParser = require('body-parser');

const app = express();

// app.use(bodyParser.json())
app.use(express.json());
app.use(cors());

const { Client } = require('pg');
const exp = require('constants');

function getDBClient(){
  return new Client({
    connectionString: process.env.DATABASE_URL,
    // host:"localhost",
    // database: "test"
    ssl: {
      rejectUnauthorized: false
    }})
}

function getNextSampleFromResults(results, sample_number){
  //given the current sample_number, we want to return the smallest sample number greater than sample_number
  //if this does not exist, return the smallest sample number less than sample_number
  //it is guaranteeed that results is non empty and sample_number is not in results

  let left = 100;
  let right = 100;
  let res_store = {};

  for (let i = 0; i < results.length; i++) {
    const num = parseInt(results[i]['sample_number']);
    if (num < sample_number){
      left = num < left ? num:left;
    } else {
      right = num < right ? num:right;
    }
    res_store[num] = results[i];
  }

  const retNum = right < 100 ? right : left;
  const retFolder = res_store[retNum]['sample_folder'];
  const order = res_store[retNum]['top_order'];

  return {
    sample_number: retNum,
    sample_folder: retFolder,
    top_order: order
  }

}

app.get('/', function(req, response){
  // const client = getDBClient();
  // client.connect();
  
  // let resp = "temp";

  // client.query('SELECT * from test_table;', (err, res) => {
  //   if (err) throw err;
    
  //   resp = res.rows[0]['sample'] + ' ' + res.rows[1]['sample'] + ' ' + res.rows[2]['sample'] + ' ';
  //   response.send(resp)
  //   client.end();
  // });
  response.send("maa lee ooooooo");

});

app.get('/current', function(req, response){
  const client = getDBClient();
  client.connect();

  const coder = req.query['coder'].toLowerCase();

  client.query('SELECT * from current_sample WHERE coder = \''+coder+'\';', (err, res) => {
    if (err) throw err;
    
    if (res.rows.length < 1){
      //send first sample by default
      response.send({
        sample_folder: 'FFmpeg-FFmpeg-commit-02f909dc24b1f05cfbba75077c7707b905e63cd2',
        sample_number: '1',
        all_done: 'no'
      })
    } else {
      response.send({
        sample_folder: res.rows[0]['sample_folder'],
        sample_number: res.rows[0]['sample_number'],
        all_done: res.rows[0]['all_done'],
        top_order: res.rows[0]['top_order']
      })
    }
    client.end();
  });

});


app.get('/get-sample', function(req, response){
  const client = getDBClient();
  client.connect();

  const coder = req.query['coder'];
  const sample_number = req.query['num']; //not the best, but assume front end sends valid sample number

  client.query('SELECT * from samples WHERE sample_number = \''+sample_number+'\';')
  .then((res) => {
    let new_current = {};
    if (res.rows.length < 1){
      //send first sample by default
      new_current = {
        sample_folder: 'FFmpeg-FFmpeg-commit-02f909dc24b1f05cfbba75077c7707b905e63cd2',
        sample_number: '1',
        top_order: 'N'
      }
    } else {
      new_current = {
        sample_folder: res.rows[0]['sample_folder'],
        sample_number: res.rows[0]['sample_number'],
        top_order: res.rows[0]['top_order']
      }
    }
    //update current sample to the sample that was retrieved
    const update_query = "UPDATE current_sample SET sample_number = \'"+
    new_current.sample_number +
      "\', sample_folder =  \'"+
      new_current.sample_folder +
      "\', top_order = \'"+
      new_current.top_order +
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
      sample_number: res.rows[0]['sample_number'],
      all_done: res.rows[0]['all_done'],
      top_order: res.rows[0]['top_order']
    });
  })
  .catch((err) => {throw err})
  .then((res) => {
    client.end()});

});

app.post('/store-response', function(req, response){
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

  client.query(update_query)
  .then((res) => {
    //update current sample, first get next sample

    console.log('first then, res --> ', res);
    if (sample_number === 86 ) {
      return client.query('SELECT * from '+result_table+' where result = \'X\' OR sample_number = \'87\';');
    } 

    return client.query('SELECT * from '+result_table+' where result = \'X\' OR sample_number = \''+((sample_number+1)%87).toString()+'\';');
  })
  .then((res) => {
    //res should contain all samples not yet addressed by coder
    //update current sample with the next sample

    console.log('second then, res --> ', res);
    let temp_arr = []

    //loop below removes 'sample_number + 1' from results if it has already been addressed by the coder
    for (let i=0; i<res.rows.length; i++){
      if(res.rows[i].sample_number !== (sample_number+1).toString()){
        temp_arr.push(res.rows[i])
      } else {
        if (res.rows[i].result === 'X'){
          temp_arr.push(res.rows[i])
        }
      }
    }

    let update_query = '';
    if (temp_arr.length > 0){
      
      const next = getNextSampleFromResults(temp_arr, sample_number);

     update_query = "UPDATE current_sample SET sample_number = \'"+
      next['sample_number']+
      "\', sample_folder =  \'"+
      next['sample_folder']+
      "\', top_order = \'"+
      next['top_order']+
      "\' WHERE coder = \'"+coder+"\';";

    } else {
      //no next unadressed value, only one element in res.rows --> update all_done field in current_sample table and set current to the next successive value
      
      // update_query = `UPDATE current_sample SET sample_number = '1', sample_folder = 'FFmpeg-FFmpeg-commit-02f909dc24b1f05cfbba75077c7707b905e63cd2',
      //                 all_done = 'yes' WHERE coder = '` +coder+"\';";

      update_query = "UPDATE current_sample SET sample_number = \'"+
      res.rows[0]['sample_number']+
      "\', sample_folder =  \'"+
      res.rows[0]['sample_folder']+
      "\', top_order = \'"+
      res.rows[0]['top_order']+
      "\', all_done = 'yes' WHERE coder = \'"+coder+"\';";
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
      sample_number: res.rows[0]['sample_number'],
      all_done: res.rows[0]['all_done'],
      top_order: res.rows[0]['top_order']
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
      "\', top_order = \'"+
      res.rows[0]['top_order']+
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
      sample_number: res.rows[0]['sample_number'],
      all_done: res.rows[0]['all_done'],
      top_order: res.rows[0]['top_order']
    });
  })
  .catch((err) => {throw err})
  .then((res) => {
    console.log('final then, res --> ', res);
    client.end()});
    

});
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));