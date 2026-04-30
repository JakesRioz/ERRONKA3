const mariadb = require('mariadb');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

async function datuakAteraMariaDB() {
    const pool = mariadb.createPool({ //connection mysql
        host: 'localhost', 
        user: 'root', 
        password: '',
        database: 'toll3'
    });

    let conn;
    try {
        conn = await pool.getConnection(); //connect msql
        const folderPath = path.join(__dirname, 'exports_mariadb');
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);



        const gaur = new Date();
        //atzoko egune hartu (hau scripte gaur ejekutaukoda 8:10en (aurreko egunekuk 8:00pasetandi) atzoko datu danakin)
        gaur.setDate(gaur.getDate() - 1); //get previous day


        const year = gaur.getFullYear();
        const month = String(gaur.getMonth() + 1).padStart(2, '0'); // months go from 0 to 11
        const day = String(gaur.getDate()).padStart(2, '0');

        var bateratu = `${year}-${month}-${day}`; 

        //egun konkretu bateko datuk pasau nahibadi
        //bateratu = "2026-02-25";
        

        // sql query
        const query = `
            SELECT 
                DATE_FORMAT(toll.day, '%Y-%m-%d') as day, 
                toll.hour, 
                area.areaName, 
                toll.booth, 
                vehicle.type, 
                ROUND((toll.countPerVehicleType * 100.0 / toll.totalVehiclesInHour), 2) AS vehiclePercentage 
            FROM toll 
            INNER JOIN area ON toll.tollArea = area.areaId 
            INNER JOIN vehicle ON toll.vehicleType = vehicle.vehicleId 
            WHERE toll.day = ? 
            ORDER BY toll.day, toll.hour, toll.booth, vehicle.type;
        `;

        const rows = await conn.query(query, [bateratu]);



        // delete array metadata of mqsl
        const results = JSON.parse(JSON.stringify(rows));

        // routes of the archives
        //const jsonPath = path.join(folderPath, `${bateratu}_json.json`);
        const jsonPath = path.join(folderPath, `${bateratu}_json.json`);
        //const csvPath = path.join(folderPath, `${bateratu}_csv.csv`);
        const csvPath = path.join(folderPath, `${bateratu}_csv.csv`);

        // save JSON
        fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

        // save CSV
        const json2csvParser = new Parser({ delimiter: ';' });
        const csv = json2csvParser.parse(results);
        fs.writeFileSync(csvPath, csv);


    } catch (err) {
        console.error(err);
    } finally {
        if (conn) conn.release();
        pool.end();
    }
}

datuakAteraMariaDB();