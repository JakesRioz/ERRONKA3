import mysql.connector
from pymongo import MongoClient
from datetime import datetime, timedelta
from apscheduler.schedulers.blocking import BlockingScheduler

#for using this program>
# pip install pymongo mysql-connector-python apscheduler

# connect mongo
def get_connections():
    mongo_client = MongoClient('mongodb://localhost:27017')
    sql_conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='toll3'
    )
    return mongo_client, sql_conn

def bialdu_datuk(minutu_atzera):
    mongo_client, sql_conn = get_connections() #connect databases
    try:

        #get time for qyuerie
        orain = datetime.now()
        hasiera_data = orain - timedelta(minutes=minutu_atzera)

        db = mongo_client['toll']
        
        # query
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": hasiera_data, "$lte": orain}
                }
            },
            {
                "$group": {
                    "_id": {
                        "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                        "hour": {"$hour": "$timestamp"},
                        "area": "$tollArea",
                        "tollBooth": "$tollBooth",
                        "vehicleType": "$vehicleType"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$setWindowFields": {
                    "partitionBy": {
                        "day": "$_id.day",
                        "hour": "$_id.hour",
                        "area": "$_id.area",
                        "booth": "$_id.tollBooth"
                    },
                    "output": {
                        "totalVehiclesInHour": {"$sum": "$count"}
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "day": "$_id.day",
                    "hour": "$_id.hour",
                    "area": "$_id.area",
                    "booth": "$_id.tollBooth",
                    "vehicleType": "$_id.vehicleType",
                    "count": "$count",
                    "totalVehiclesInHour": 1
                }
            }
        ]

        stats = list(db['toll'].aggregate(pipeline))

        if stats:
            cursor = sql_conn.cursor()
            # values for sql
            valuess = [
                (s['day'], s['hour'], s['area'], s['booth'], s['vehicleType'], s['count'], s['totalVehiclesInHour'])
                for s in stats
            ]
            
            sql = """REPLACE INTO toll 
                     (day, hour, tollArea, booth, vehicleType, countPerVehicleType, totalVehiclesInHour) 
                     VALUES (%s, %s, %s, %s, %s, %s, %s)"""
            
            cursor.executemany(sql, valuess)
            sql_conn.commit()
            cursor.close()

    except Exception as err:
        print(f"Errorea Toll-en: {err}")
    finally:
        mongo_client.close()
        sql_conn.close()

# --- PROGRAMAZIOA (CRON) ---
scheduler = BlockingScheduler()

# 08:00etan: previous day miutes (1080 minutes)
scheduler.add_job(lambda: bialdu_datuk(1080), 'cron', hour=8, minute=0)

# 08:24 eta 08:48 (every 24 minutes)
scheduler.add_job(lambda: bialdu_datuk(24), 'cron', hour=8, minute='24,48')

# 09:00 - 11:59: 24 minutes
scheduler.add_job(lambda: bialdu_datuk(24), 'cron', hour='9-11', minute='*/24')

# 12:00 - 13:59: 15 minutes
scheduler.add_job(lambda: bialdu_datuk(15), 'cron', hour='12-13', minute='*/15')

# at 14:00
scheduler.add_job(lambda: bialdu_datuk(15), 'cron', hour=14, minute=0)

if __name__ == "__main__":
    # Execute when pc boots
    bialdu_datuk(60)
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        pass
