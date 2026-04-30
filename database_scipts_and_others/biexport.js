const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function exekutatuScriptak() {
    try {
        //execute this two scripts
        const { stdout: out1 } = await exec('node mongodb_tik_json_csv_era_js.js');
        const { stdout: out2 } = await exec('node mariadb_tik_json_csv_era_js.js');
        //const { stdout: out1 } = await exec('python mongodb_tik_json_csv_era_py.py');
        //const { stdout: out2 } = await exec('python mariadb_tik_json_csv_era_py.py');



        //take todays date and use to name the sql dump
        const gaur = new Date();
        const dataFormatua = gaur.getFullYear() + '_' + 
                             String(gaur.getMonth() + 1).padStart(2, '0') + '_' + 
                             String(gaur.getDate()).padStart(2, '0');
        
        //the dump final name
        const fitxategiIzena = `${dataFormatua}_backup.sql`;
        const helburuBidea = `F:\\erronkak\\erronka3sql_backup\\${fitxategiIzena}`; //route + name



        const mysqlCommand = `cd /d C:\\xampp\\mysql\\bin && mysqldump -u root --password="" toll2 > "${helburuBidea}"`; //do the dump
        const { stdout: out3 } = await exec(mysqlCommand);


    } catch (err) {
        console.error('Errore bat gertatu da:', err);
    }
}

exekutatuScriptak();
