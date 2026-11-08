const mongoose = require('mongoose');
const dns = require('dns');
const MyConstants = require('./MyConstants');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const uri = `mongodb://thiennhan105295_db_user:tI0L6iYthsRB9VBN@ac-ouc4nhb-shard-00-00.jhxfi1p.mongodb.net:27017,ac-ouc4nhb-shard-00-01.jhxfi1p.mongodb.net:27017,ac-ouc4nhb-shard-00-02.jhxfi1p.mongodb.net:27017/qrmenu?ssl=true&replicaSet=atlas-uxsdbp-shard-0&authSource=admin`;

mongoose.connect(uri)
  .then(() => {
    console.log('>>> Connected to MongoDB Atlas successfully: ' + MyConstants.DB_DATABASE);
  })
  .catch((err) => {
    console.error('>>> MongoDB Connection Error:', err);
  });