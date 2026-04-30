const { MongoClient } = require('mongodb');
const { Parser } = require('json2csv'); //csv-ra pasau ahal ixeteko
const fs = require('fs'); //idatzi ahal ixeteko edo
const path = require('path'); //karpeta batera atara ahal ixeteko emaitza

//csv erabili ahal ixeteko hau einbida ariña!!! npm install json2csv
async function datuakAtera() {
    const client = new MongoClient("mongodb://localhost:27017");  // server connection


    //the folder were therewill be saved
    const folderPath = path.join(__dirname, 'exports_mongodb'); 
    var ixena = '_json';
    var ixena2 = '_csv';
    /*var jsonPath = '';
    var csvPath = '';*/


    try {
        await client.connect();
        const db = client.db('toll');  // database name
        const collection = db.collection('toll'); // collection name


        //gaurko egune zeindan atara (UTC formatu: 2026-02-25T12:56:21.353Z)
        //const fechaCompleta = new Date().toISOString();
        //get data:
        const gaur = new Date();


        //atzoko eguneko datuk bialdukodi, 8:00 sartzendizenez azkenak 8:10 ejekutaukoda
        gaur.setDate(gaur.getDate() - 1);
        

        //get date values
        const urti = gaur.getFullYear();
        const hilli = String(gaur.getMonth() + 1).padStart(2, '0');
        const egune = String(gaur.getDate()).padStart(2, '0');
        var bateratu = `${urti}-${hilli}-${egune}`; //probak ein nahibotaz var ipiniot
        
        //data espezifiko bateko datuk nahibadi
        //bateratu = `${urti}-${'02'}-${'25'}`; //aldatu nahibadi hemen aldatu
        console.log(bateratu);
        ixena = bateratu + ixena + '.json';
        ixena2 = bateratu + ixena2 + '.csv';


        
        


        //specify from 00:00:00,000 to 23:59:59,999
        const gaurkoEguneHasiera = new Date(bateratu + 'Z'); //z-gaz utc modun interpretetako ordu lokal modun barik
        gaurkoEguneHasiera.setUTCHours(0, 0, 0, 0);

        const gaurkoEguneAmaiera = new Date(bateratu + 'Z');
        gaurkoEguneAmaiera.setUTCHours(23, 59, 59, 999);


        //ikusi ondo dauen
        console.log(gaurkoEguneHasiera.toISOString());
        console.log(gaurkoEguneAmaiera.toISOString());

        // egun bateko datu danak
        const results = await collection.aggregate([ //the query
            { $match: { timestamp: { $gte: gaurkoEguneHasiera, $lte: gaurkoEguneAmaiera } } },
            //{ $group: { _id: "$vehicleType", count: { $sum: 1 } } }
        ]).toArray();


        //Gorde fitxategi baten
        const jsonPath = path.join(folderPath, ixena);
        fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));




        //csv-ntzat
        const csvPath = path.join(folderPath, ixena2);
        const json2csvParser = new Parser({ delimiter: ';' }); //bestelan ,-gaz delimitetandau
            const csv = json2csvParser.parse(results);
            fs.writeFileSync(csvPath, csv);







    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

//execute function
datuakAtera();
