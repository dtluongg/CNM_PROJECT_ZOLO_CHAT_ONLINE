const mongoose = require('mongoose');

const urlConnect = process.env.mongoDB_ZoloChatCluster;

const connectMongoAtlas = async () => {
    try{
        await mongoose.connect(urlConnect);
        console.log('Ket noi toi mongodb Atlas thanh cong');
    }catch(error){
        console.log('Ket noi that bai.', error.message);
    }
}

module.exports = connectMongoAtlas;