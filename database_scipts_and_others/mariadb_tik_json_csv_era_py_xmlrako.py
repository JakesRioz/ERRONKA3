import os
import json
from datetime import datetime, timedelta
import mysql.connector
import pandas as pd

def datuak_atera_mariadb():

    #hau martxan ipintteko bidinak instalau: pip install mysql-connector-python pandas
    #programi ejekutetako: python mariadb_tik_json_csv_era_py.py

    # connection sql
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'toll3'
    }

    # folder path
    folder_path = os.path.join(os.path.dirname(__file__), 'exports_mariadb')
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    conn = None
    try:
        # connect sql
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True) # dictionary=True emaitzak hiztegi moduan jasotzeko

        # get yesterday day
        gaur = datetime.now() - timedelta(days=1)
        bateratu = gaur.strftime('%Y-%m-%d')
        
        # SQL Kontsulta
        query = """
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
            WHERE toll.day = %s 
            ORDER BY toll.day, toll.hour, toll.booth, vehicle.type;
        """

        cursor.execute(query, (bateratu,))
        results = cursor.fetchall()

        if not results:
            print(f"Ez da daturik aurkitu egun honetarako: {bateratu}")
            return

        # archive name
        json_path = os.path.join(folder_path, f"{bateratu}_json.json")
        csv_path = os.path.join(folder_path, f"{bateratu}_csv.csv")

        # save JSON
        # pass decimal to float on mysql
        for row in results:
            for key, value in row.items():
                if hasattr(value, 'to_eng_string'): # Decimal bada
                    row[key] = float(value)

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        # save csv
        df = pd.DataFrame(results)
        df.to_csv(csv_path, sep=';', index=False, encoding='utf-8')


    except mysql.connector.Error as err:
        print(f"Errorea: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    datuak_atera_mariadb()
