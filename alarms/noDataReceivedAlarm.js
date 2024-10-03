const { MQTT_RT_DATA } = require("../models/mqttModel");
const { smembersAsync } = require("../utils/redisClient");
const Alarm_SiteFailure = require("../models/alarmModel");
const Tenant = require("../mysql/tenantModel");
const Site = require("../mysql/siteModel");

async function saveAlarms(alarmData) {
  return new Promise(async (resolve, reject) => {
    let newAlarm; // Declare newAlarm here
    try {
      // Calculate the time range (current time and 12 minutes before)
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // Check if there's an existing entry for this site within the last 10 minutes
      const existingAlarm = await Alarm_SiteFailure.findOne({
        edotcoSID: alarmData.edotcoSID,
        tenantCode: alarmData.tenantCode,
        close_time: "NA",
        // createdAt: {
        //   $gte: thirtyMinutesAgo.toISOString(),
        //   $lte: now.toISOString(),
        // },
      });

      // If no entry exists, save the new alarm
      if (!existingAlarm) {
        newAlarm = new Alarm_SiteFailure(alarmData);
        await newAlarm.save();
        console.log(`Alarm saved for site: ${alarmData.edotcoSID}`);
      } else {
        console.log(
          `Alarm already exists for site: ${alarmData.edotcoSID} in the last 30 minutes.`
        );
      }
      resolve();
    } catch (error) {
      console.error("An error occurred while saving alarms:", error);
      reject(error);
    }
  });
}

//alarm close function when alarm condition disappeared
async function closeAlarm() {
  try {
    // Get the start of the current day
    const now = new Date();

    // Create a new Date object for the start of today in local time
    // let startOfToday = new Date(
    //   now.getFullYear(),
    //   now.getMonth(),
    //   now.getDate(),
    //   17,
    //   30,
    //   0,
    //   0
    // ); // Sets time to 9:30:00 AM local time

    // console.log("Start of day (local time):", startOfToday);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Set time to midnight of the current day
    let startOfFirstMinute = new Date(
      startOfToday.getTime() - startOfToday.getTimezoneOffset() * 60000
    ).toISOString();
    console.log(
      "========================================startofday=======",
      startOfFirstMinute
    );
    // Find all alarms with an open_time before today and close_time as "NA"
    const existingAlarms = await Alarm_SiteFailure.find({
      open_time: { $gt: startOfFirstMinute },
      close_time: "NA",
    });

    console.log("Alarms to close:", existingAlarms);

    //let now = new Date();
    let alarmCloseTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString();
    console.log("==========================now  ", alarmCloseTime);

    if (existingAlarms.length > 0) {
      // Loop through each alarm and update the close_time
      for (const alarm of existingAlarms) {
        alarm.close_time = alarmCloseTime; // Set the close time to the current time
        await alarm.save(); // Save the changes to the database
        console.log("Alarm closed:", alarm);
      }
    } else {
      console.log("No alarms found to close for previous days.");
    }
  } catch (error) {
    console.error("An error occurred while closing alarms:", error);
  }
}

// async function closeAlarm(customid, alarm_id) {
//   try {
//     console.log("customid:", customid, "alarm_id:", alarm_id);
//     const existingAlarms = await Alarm_SiteFailure.find({
//       alarm_id: alarm_id,
//       customid: customid,
//       close_time: "NA",
//     });
//     console.log("existingAlarms:", existingAlarms);
//     if (existingAlarms) {
//       existingAlarms.forEach(async (alarm) => {
//         alarm.close_time = new Date().toLocaleString();
//         await alarm.save();
//         console.log("Alarm closed:", alarm);
//       });
//     }
//   } catch (error) {
//     console.error("An error occurred while closing alarms:", error);
//   }
// }

//get tenants
async function getTenants() {
  try {
    const members = await smembersAsync("tenants_set");
    return members;
  } catch (error) {
    console.error("An error occurred in redis:", error);
    throw new Error(error);
  }
}

async function getZeroCountTenants() {
  const today = new Date(); // current date

  // Create a new Date object for yesterday's date
  let startOfDay = new Date(today);
  console.log("======= start === ", startOfDay);
  let start = new Date(
    startOfDay.getTime() - startOfDay.getTimezoneOffset() * 60000
  ).toISOString(); // for aggregation
  console.log("=======start: " + start);

  // Get 10 minutes before `start`
  let thirtyMinutesBefore = new Date(
    new Date(start).getTime() - 30 * 60 * 1000
  ).toISOString();

  console.log("======= 10 Minutes Before: " + thirtyMinutesBefore);

  try {
    const members = await getTenants();
    //const members = ["31211242C0470", "31211242C0472", "31211242C0435"];

    // Create the index to optimize the query
    await MQTT_RT_DATA.collection.createIndex(
      { customid: 1, time: 1 },
      { background: true }
    );

    const tenantCounts = await MQTT_RT_DATA.aggregate([
      {
        $addFields: {
          timeDate: {
            $dateFromString: {
              dateString: {
                $concat: [
                  { $substr: ["$time", 0, 4] }, // Year
                  "-",
                  { $substr: ["$time", 4, 2] }, // Month
                  "-",
                  { $substr: ["$time", 6, 2] }, // Day
                  "T",
                  { $substr: ["$time", 8, 2] }, // Hour
                  ":",
                  { $substr: ["$time", 10, 2] }, // Minute
                  ":",
                  { $substr: ["$time", 12, 2] }, // Second
                ],
              },
              format: "%Y-%m-%dT%H:%M:%S",
            },
          },
        },
      },
      {
        $match: {
          customid: { $in: members },
          timeDate: {
            $lte: new Date(start),
            $gte: new Date(thirtyMinutesBefore), // "2024-08-29T10:06:00.772Z"
          },
        },
      },
      {
        $group: {
          _id: "$customid", // Group by tenant ID
          count: { $sum: 1 }, // Count documents in each group
        },
      },
      {
        $project: {
          tenant: "$_id",
          count: 1,
          _id: 0, // Exclude _id from the result
        },
      },
    ]);

    // Create a map of tenant IDs with default counts of 0
    const tenantMap = new Map(members.map((tenant) => [tenant, 0]));

    // Update counts based on aggregation results
    tenantCounts.forEach(({ tenant, count }) => {
      tenantMap.set(tenant, count);
    });

    // Convert the map to an array of results
    const totalResult = Array.from(tenantMap, ([tenant, count]) => ({
      tenant,
      count,
    }));
    //console.log("total======== ", totalResult);

    // Filter tenants with count of 0
    const zeroCountTenants = totalResult.filter((item) => item.count === 0);
    //console.log("+++++++++++ zero ===== ", zeroCountTenants);
    // Extract only the tenant IDs
    const zeroCountTenantIds = zeroCountTenants.map((item) => item.tenant);
    //console.log(zeroCountTenantIds);
    console.log("------------------- finish ------");
    return zeroCountTenantIds;
  } catch (error) {
    throw new Error(error);
  }
}

async function closeSitesNotInEdotcoSIDs(groupedTenants) {
  try {
    // Extract the tenantCodes values from the groupedTenants object
    const tenantCodes = Object.values(groupedTenants).flatMap(
      (tenant) => tenant.tenantCodes
    );
    //console.log("All Tenant Codes:", tenantCodes);

    // Find all site failures that are not in the tenantCodes and have an open failure (close_time is "NA")
    const openFailures = await Alarm_SiteFailure.find({
      tenantCode: { $nin: tenantCodes }, // Not in the edotcoSIDs list
      close_time: "NA", // Open failures only
    });
    console.log("open failures: ", openFailures);

    let now = new Date();
    let alarmCloseTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString();
    console.log("==========================now  ", alarmCloseTime);

    // Iterate over each open failure and update its close_time
    for (const failure of openFailures) {
      failure.close_time = alarmCloseTime; // Set the current time
      //failure.time_to_close = new Date() - new Date(failure.open_time); // Calculate duration
      await failure.save();
      console.log("Alarm closed : ", failure.edotcoSID);
    }
  } catch (error) {
    console.error("Error closing sites not in edotcoSIDs array:", error);
  }
}

// async function closeSitesNotInEdotcoSIDs(edotcoSIDs) {
//   try {
//     // Extract the edotcoSID keys from the edotcoSIDs map
//     const edotcoSIDList = Array.from(edotcoSIDs.keys());

//     // Find all site failures that are not in the edotcoSIDList and have an open failure (close_time is "NA")
//     const openFailures = await Alarm_SiteFailure.find({
//       edotcoSID: { $nin: edotcoSIDList }, // Not in the edotcoSIDs map keys
//       close_time: "NA", // Open failures only
//     });

//     // Iterate over each open failure and update its close_time
//     for (const failure of openFailures) {
//       failure.close_time = new Date(); // Set the current time
//       //failure.time_to_close = new Date() - new Date(failure.open_time); // Calculate duration
//       await failure.save();
//       console.log("Alarm closed:", failure.edotcoSID);
//     }
//   } catch (error) {
//     console.error("Error closing sites not in edotcoSIDs map:", error);
//   }
// }

async function getZeroCountEdotcoSIDs(tenantIds) {
  try {
    ///////////////////////////////////////////////////////////////////////////////////////////
    // Find all tenants matching the tenantIds
    // const tenants = await Tenant.findAll({ where: { tenantCode: tenantIds } });

    // // // Create a Set to store unique sIds
    // const uniqueSIds = new Set();

    // // // Iterate over tenants to add only unique sIds to the Set
    // tenants.forEach((tenant) => {
    //   uniqueSIds.add(tenant.sId);
    // });
    // console.log("=========uniqueSids==== ", uniqueSIds);
    // // Convert the Set back to an array if needed
    // const tenantSIdsArray = Array.from(uniqueSIds);

    // const sites = await Site.findAll({ where: { id: tenantSIdsArray } });

    // const siteIds = sites.map((site) => ({ edotcoSID: site.id }));

    // console.log(siteIds);
    //return edotcoSIDs;
    /////////////////////////////////////////////////////////////////////////////////////

    // console.log("==============tenants =========== ", tenants);
    // const groupedTenants = tenants.reduce((acc, tenant) => {
    //   const { sId, tenantCode } = tenant.dataValues;
    //   if (!acc[sId]) {
    //     acc[sId] = [];
    //   }
    //   acc[sId].push(tenantCode);
    //   return acc;
    // }, {});

    // console.log("============tenants ====== ", groupedTenants);
    // return groupedTenants;
    // Create a Map to store the mapping of sId to tenantCodes
    // const sIdsWithTenants = new Map();

    // // Iterate over tenants to map each sId to its relevant tenantCode
    // tenants.forEach((tenant) => {
    //   if (!sIdsWithTenants.has(tenant.sId)) {
    //     sIdsWithTenants.set(tenant.sId, new Set());
    //   }
    //   sIdsWithTenants.get(tenant.sId).add(tenant.tenantCode);
    // });
    // //console.log("=========tenantSidsMap==== ", sIdsWithTenants);
    // return sIdsWithTenants;

    // Find all tenants matching the tenantIds
    const tenants = await Tenant.findAll({ where: { tenantCode: tenantIds } });

    // Extract unique sIds from the tenants
    const uniqueSIds = [...new Set(tenants.map((tenant) => tenant.sId))];

    // Find sites based on the extracted unique sIds
    const sites = await Site.findAll({ where: { id: uniqueSIds } });

    // Map the site IDs to edotcoSIDs
    //const siteIds = sites.map((site) => ({ edotcoSID: site.edotcoSID }));

    const siteIds = sites.reduce((acc, site) => {
      acc[site.id] = site.edotcoSID;
      return acc;
    }, {});

    //console.log("Site IDs:", siteIds);

    // Group tenants by sId and map tenantCodes along with edotcoSID
    const groupedTenants = tenants.reduce((acc, { sId, tenantCode }) => {
      if (!acc[sId]) acc[sId] = { tenantCodes: [], edotcoSID: null };

      // Add the tenantCode to the tenantCodes array for this sId
      acc[sId].tenantCodes.push(tenantCode);

      // Map sId to its corresponding edotcoSID
      acc[sId].edotcoSID = siteIds[sId] || null; // Lookup edotcoSID for sId from siteIds

      return acc;
    }, {});

    //console.log("Grouped Tenants by sId:", groupedTenants);

    return groupedTenants;
  } catch (error) {
    console.error("Error retrieving tenants sIds:", error);
    throw new Error(`Error retrieving tenants sIds: ${error.message}`);
  }
}

async function processAlarms(groupedTenants) {
  if (groupedTenants) {
    // Iterate through each tenant group
    for (const [sId, tenantData] of Object.entries(groupedTenants)) {
      const { edotcoSID, tenantCodes } = tenantData;
      // Iterate through each tenant code
      for (const tenantCode of tenantCodes) {
        console.log(
          `Processing edotcoSID: ${edotcoSID} with tenantCode: ${tenantCode}`
        );

        let now = new Date();
        let alarmOpenTime = new Date(
          now.getTime() - now.getTimezoneOffset() * 60000
        ).toISOString();
        console.log("==========================now  ", alarmOpenTime);

        const alarmData = {
          alarm_id: 10,
          source: "MQTT_RT_DATA",
          category: "MQTT_RT_DATA Site data",
          alarm_name: "Site data not found",
          priority: "critical",
          edotcoSID: sId,
          siteID: edotcoSID,
          tenantCode: tenantCode,
          open_time: alarmOpenTime,
        };
        console.log("Alarm data: ", alarmData);

        try {
          // Save the alarm data asynchronously
          await saveAlarms(alarmData);
        } catch (error) {
          console.error(
            `Error saving alarm for edotcoSID: ${edotcoSID}, tenantCode: ${tenantCode}`,
            error
          );
        }
      }
    }
  }
}

async function getAlarm() {
  const tenants = await getZeroCountTenants();
  const groupedTenants = await getZeroCountEdotcoSIDs(tenants);
  //console.log("========edotcoSids ==", groupedTenants);
  await closeSitesNotInEdotcoSIDs(groupedTenants);
  await closeAlarm();

  const currentDate = new Date();
  console.log("========================", currentDate);

  // Call the function with groupedTenants object
  await processAlarms(groupedTenants);

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // if (edotcoSIDs) {
  //   edotcoSIDs.forEach(async ({ edotcoSID }) => {
  //     const alarmData = {
  //       alarm_id: 10,
  //       source: "MQTT_RT_DATA",
  //       category: "MQTT_RT_DATA Site data",
  //       alarm_name: "Site data not found",
  //       priority: "major",
  //       edotcoSID: edotcoSID,
  //       open_time: new Date(),
  //     };
  //     await saveAlarms(alarmData);
  //   });
  // }
}

module.exports = { getZeroCountEdotcoSIDs, saveAlarms, closeAlarm, getAlarm };
