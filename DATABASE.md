SQL

sql queries:  
    • the general query:  
      SELECT toll.day, toll.hour, area.areaName, toll.booth, vehicle.type, toll.countPerVehicleType, toll.totalVehiclesInHour FROM toll INNER JOIN area ON toll.tollArea \= area.areaId INNER JOIN vehicle ON toll.vehicleType \= vehicle.vehicleId ORDER BY toll.day, toll.hour, toll.booth, vehicle.type;

    • the general query (from mongodb to mysql) but shown with percentages instead:  
      SELECT toll.day, toll.hour, area.areaName, toll.booth, vehicle.type, (toll.countPerVehicleType \* 100.0 / toll.totalVehiclesInHour) AS vehiclePercentage FROM toll INNER JOIN area ON toll.tollArea \= area.areaId INNER JOIN vehicle ON toll.vehicleType \= vehicle.vehicleId ORDER BY toll.day, toll.hour, toll.booth, vehicle.type;

    • vehicles per area:  
      SELECT area.areaName, SUM(toll.countPerVehicleType) as total FROM toll INNER JOIN area ON toll.tollArea \= area.areaId GROUP BY area.areaName;  
    • vehicles per area on a given day:  
      SELECT area.areaName, SUM(toll.countPerVehicleType) as total FROM toll INNER JOIN area ON toll.tollArea \= area.areaId WHERE toll.day \>= '2026-04-22' AND toll.day \<= '2026-04-23' GROUP BY area.areaName;  
    • inactive booths on the last 15 minutes:  
      SELECT  alerts.booth,  area.areaName,  alerts.lastActivity FROM alerts INNER JOIN area ON alerts.tollArea \= area.areaId WHERE alerts.lastActivity \< NOW() \- INTERVAL 15 MINUTE;  
    • vehicles per booth:  
      SELECT  toll.booth,  area.areaName, SUM(toll.countPerVehicleType) as total FROM toll  INNER JOIN area ON toll.tollArea \= area.areaId GROUP BY toll.booth, area.areaName ORDER BY area.areaName ASC;  
    • vehicles per booth on a given day:  
      SELECT toll.booth, area.areaName, SUM(toll.countPerVehicleType) as total FROM toll INNER JOIN area ON toll.tollArea \= area.areaId WHERE toll.day \>= '2026-04-22' AND toll.day \<= '2026-04-23' GROUP BY toll.booth, area.areaName ORDER BY area.areaName ASC;

MONGODB QUERIES

db.toll.aggregate(\[  
  {  
    $group: {  
      \_id: {  
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
        day: "$\_id.day",  
        hour: "$\_id.hour",  
        area: "$\_id.area",  
        tollBooth: "$\_id.tollBooth"  
      },  
      output: {  
        totalVehiclesInHour: { $sum: "$count" }  
      }  
    }  
  },  
  {  
    $project: {  
      \_id: 0,  
      day: "$\_id.day",  
      hour: "$\_id.hour",  
      area: "$\_id.area",  
      tollBooth: "$\_id.tollBooth",  
      vehicleType: "$\_id.vehicleType",  
      count: "$count",  
      totalVehiclesInHour: 1  
    }  
  }  
\])

mongodb queries  
egun espezifiko batekuk ikusteko  
    • the query for json:  
      db.toll.aggregate(\[  
 {  
    $match: {  
      timestamp: {   
        $gte: ISODate("2026-02-25T00:00:00.000Z"),   
        $lte: ISODate("2026-02-25T23:59:59.999Z")   
      }  
    }  
  }  
\])  
      kontsultin scripte mongodb\_tik\_json\_csv\_era\_js.js  
    • batazbesteko ibilgailu kantitati (ate danetaku)  
      db.toll.aggregate(\[  
        {  
          $group: {  
            \_id: "$tollBooth",  
            total: { $sum: 1 }  
          }  
        },  
        {  
          $group: {  
            \_id: null,  
            avgTolls: { $avg: "$total" }  
          }  
        }  
      \])  
    • Projectegaz dokumentu bakotxeko beran paymentMethoda array baten sartzenda, eta gero unwindegaz barriro ataratenda. Gero payment method bakotxa agrupau  
      db.toll.aggregate(\[  
        {  
          $project: {  
            paymentArray: \["$paymentMethod"\]  
          }  
        },  
        { $unwind: "$paymentArray" },  
        {  
          $group: {  
            \_id: "$paymentArray",  
            total: { $sum: 1 }  
          }  
        }  
      \])  
    • peak hour per day  
      db.toll.aggregate(\[  
        {  
          $project: {  
            day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },  
            hour: { $hour: "$timestamp" }  
          }  
        },  
        {  
          $group: {  
            \_id: { day: "$day", hour: "$hour" },  
            total: { $sum: 1 }  
          }  
        },  
        { $sort: { total: \-1 } }  
      \])  
    • funtzi;oie trafikun nibelan arabera klasifiketako\>  
      db.toll.aggregate(\[  
        {  
          $match: {  
            timestamp: {  
              $gte: ISODate("2026-04-22T07:00:00.000Z"),  
              $lt: ISODate("2026-04-22T08:00:00.000Z")  
            }  
          }  
        },  
        {  
          $group: {  
            \_id: "$tollArea",  
            total: { $sum: 1 }  
          }  
        },  
        {  
          $addFields: {  
            trafficLevel: {  
              $switch: {  
                branches: \[  
                  { case: { $gt: \["$total", 1000\] }, then:"HIGH" },  
                  { case: { $gt: \["$total", 500\] }, then:"MEDIUM" }  
                \],  
                default: "LOW"  
              }  
            }  
          }  
        }  
      \])  
    • ordainketa metodun inguruko datuk\>  
      db.toll.aggregate(\[  
        {  
          $group: {  
            \_id: "$paymentMethod",  
            count: { $sum: 1 }  
          }  
        },  
        {  
          $group: {  
            \_id: null,  
            total: { $sum: "$count" },  
            methods: { $push: "$$ROOT" }  
          }  
        },  
        { $unwind: "$methods" },  
        {  
          $project: {  
            method: "$methods.\_id",  
            count: "$methods.count",  
            percentage: {  
              $multiply: \[  
                { $divide: \["$methods.count", "$total"\] },  
                100  
              \]  
            }  
          }  
        }  
      \])

