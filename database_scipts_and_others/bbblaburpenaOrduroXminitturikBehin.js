const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

// Datubase konexio funtzio orokorra
async function getConnections() {
    const mongoClient = new MongoClient('mongodb://localhost:27017');
    const sqlConnection = await mysql.createConnection({ //connection setting
        host: 'localhost', user: 'root', password: '', database: 'toll3'
    });
    await mongoClient.connect(); //connect sql
    return { mongoClient, sqlConnection };
}

async function bialduDatuk(minutuAtzera) {
    const { mongoClient, sqlConnection } = await getConnections(); //connect two databses
    try {

        //getting the date for match, actual and previous
        const orain = new Date(); //now
        const hasieraData = new Date(orain.getTime() - minutuAtzera * 60000); //before



        const db = mongoClient.db('toll');
        const stats = await db.collection('toll').aggregate([ //query
            {
                // to get the registers according to the frequnecy of cron
                $match: {
                    timestamp: { $gte: hasieraData, $lte: orain }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                        hour: { $hour: "$timestamp" },
                        area: "$tollArea",
                        tollBooth: "$tollBooth",
                        vehicleType: "$vehicleType"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $setWindowFields: {
                    partitionBy: { 
                        day: "$_id.day", 
                        hour: "$_id.hour", 
                        area: "$_id.area", 
                        booth: "$_id.booth" 
                    },
                    output: {
                        totalVehiclesInHour: { $sum: "$count" }
                    }
                }
            },

            {
                $project: {
                    _id: 0, day: "$_id.day", hour: "$_id.hour", area: "$_id.area",
                    booth: "$_id.tollBooth", vehicleType: "$_id.vehicleType", count: "$count", totalVehiclesInHour: 1
                }
            }
        ]).toArray();

        if (stats.length > 0) {
            const valores = stats.map(s => [s.day, s.hour, s.area, s.booth, s.vehicleType, s.count, s.totalVehiclesInHour]); //get obatined information
            //REPLACE ipinibida, lehen dauezan registrutan idazteko (24 minittuko frekuentzixan idatziezkero adibidez gero registro bardiñin ezingozan idatzi)
            //const sql = `INSERT INTO toll (day, hour, area, booth, vehicleType, countPerVehicleType) 
            const sql = `REPLACE INTO toll (day, hour, tollArea, booth, vehicleType, countPerVehicleType, totalVehiclesInHour) 
                         VALUES ?`;
                         //hau ezta biher replace ipinioalako
                        //  VALUES ? ON DUPLICATE KEY UPDATE countPerVehicleType = VALUES(countPerVehicleType)`;
            await sqlConnection.query(sql, [valores]);
        }
    } catch (err) { console.error("Errorea Toll-en:", err); }
    finally { await mongoClient.close(); await sqlConnection.end(); }
}

//EXPLANATIONS ABOUT REPLACE INTO ON THE COMMENTED SECTION>



// 2. PROZESUA: ALERTS (15 minuturo beti)
/*async function bialduAlertak() {
    const { mongoClient, sqlConnection } = await getConnections();
    try {
        const db = mongoClient.db('toll');
        const alertsData = await db.collection('toll').aggregate([
            { $sort: { timestamp: -1 } },
            { $group: { _id: "$tollBooth", lastActivity: { $first: "$timestamp" }, area: { $first: "$tollArea" } } }
        ]).toArray();

        if (alertsData.length > 0) {
            const valores = alertsData.map(a => [a._id, a.lastActivity, a.area]);
            //const sql = `INSERT INTO alerts (booth, lastActivity, area) 


             //WE NEED REPLACE INTO BECAUSE IF THERE HAPPENED TO BE THE SAME REGISTER 
             // (SAME BOOTH AND AREA, WE WOULD NOT BE ABLE TO DELETE THE OLD REGISTER AND INSERT THE NEW ONE 
             // (WHAT WE NEED TO DO: IF THERE EXIST THE REEGISTER UPDATE IT WITH RIGHT INFORMATION, IF DOESNT EXIST JUST INSERT))

            const sql = `REPLACE INTO alerts (booth, lastActivity, tollArea)
                         VALUES ?`;
                         // VALUES ? ON DUPLICATE KEY UPDATE lastActivity = VALUES(lastActivity)`;
            await sqlConnection.query(sql, [valores]);
        }
    } catch (err) { console.error("Errorea Alerts-en:", err); }
    finally { await mongoClient.close(); await sqlConnection.end(); }
}*/

// --- PROGRAMAZIOA (CRON) ---

// ALERTS: 15 minuturo beti
//cron.schedule('*/15 * * * *', () => bialduAlertak());




//LEhen
// TOLL: Ordutegi baldintzak
// 08:00 - 12:00 -> 24 minuturo
//cron.schedule('*/24 8-11 * * *', () => bialduDatuk());

// 12:00 - 14:00 -> 15 minuturo
//cron.schedule('*/15 12-13 * * *', () => bialduDatuk());

// Beste orduetan -> Goizeko 08:00etan
/*cron.schedule('0 8 * * *', () => {
    const h = new Date().getHours();
    if (h < 8 || h >= 12) bialduDatuk();
});*/


//Oin
// 08:00 - 11:59 (24 min). 8retan hastenda ordun lehengo 3.ak eztau euki zentzurik
//cron.schedule('*/24 8-11 * * *', () => bialduDatuk());


cron.schedule('0 8 * * *', () => bialduDatuk(1080)); //at 8 oclock, but has to be sent with previous days minutes

// 08:24 - 11:59: every 24 (08:24, 08:48...)
cron.schedule('24,48 8 * * *', () => bialduDatuk(24)); //starting at 8:24, until 8:59
cron.schedule('*/24 9-11 * * *', () => bialduDatuk(24)); //from 9 to 11:59


// 12:00 - 13:45 (15 min)
cron.schedule('*/15 12-13 * * *', () => bialduDatuk(15));

// 14:00 (aurreku 14retan ezta ejekutetan)
cron.schedule('0 14 * * *', () => bialduDatuk(15));






// for executimg when the pc boots
bialduDatuk(60);
//bialduAlertak();

/*
BESTALAN EJEKUTAU NAHIBOT:
node bbblaburpenaOrduroXminitturikBehin.js
*/