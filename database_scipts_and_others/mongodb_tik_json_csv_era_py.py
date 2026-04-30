import os
import json
from datetime import datetime, timedelta
from pymongo import MongoClient
import pandas as pd

def datuak_atera():

    #hau erabiltteko honek instalaubidi: pip install pymongo pandas
    #programi ejekutetako: python mongodb_tik_json_csv_era_py.py
    # Zerbitzarira konexioa
    client = MongoClient("mongodb://localhost:27017")
    
    # Karpetin bidi
    folder_path = os.path.join(os.path.dirname(__file__), 'exports_mongodb')
    
    # ensure folder exists
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    try:
        db = client['toll']  # Database name
        collection = db['toll']  # collection name

        # calculate previous day
        gaur = datetime.utcnow() - timedelta(days=1)
        bateratu = gaur.strftime('%Y-%m-%d')
        

        # prepare the name for the archives
        ixena_json = f"{bateratu}_json.json"
        ixena_csv = f"{bateratu}_csv.csv"

        # from 00:00:00 to 23:59:59 (UTC)
        hasiera = datetime.strptime(f"{bateratu} 00:00:00", "%Y-%m-%d %H:%M:%S")
        amaiera = datetime.strptime(f"{bateratu} 23:59:59", "%Y-%m-%d %H:%M:%S")

        # query to execute
        query = {"timestamp": {"$gte": hasiera, "$lte": amaiera}}
        results = list(collection.find(query))

        if not results:
            print("Ez da daturik aurkitu egun horretarako.")
            return

        # save as JSON
        json_path = os.path.join(folder_path, ixena_json)
        # pass mongos objectid to string
        for doc in results:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            if 'timestamp' in doc:
                doc['timestamp'] = doc['timestamp'].isoformat(timespec='milliseconds')

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        # 2. save as csv
        csv_path = os.path.join(folder_path, ixena_csv)
        df = pd.DataFrame(results)
        df.to_csv(csv_path, sep=';', index=False, encoding='utf-8')


    except Exception as e:
        print(f"Errorea: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    datuak_atera()
