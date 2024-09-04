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
      const twelveMinutesAgo = new Date(now.getTime() - 12 * 60 * 1000);

      // Check if there's an existing entry for this site within the last 10 minutes
      const existingAlarm = await Alarm_SiteFailure.findOne({
        edotcoSID: alarmData.edotcoSID,
        createdAt: {
          $gte: twelveMinutesAgo.toISOString(),
          $lte: now.toISOString(),
        },
      });

      // If no entry exists, save the new alarm
      if (!existingAlarm) {
        newAlarm = new Alarm_SiteFailure(alarmData);
        await newAlarm.save();
        console.log(`Alarm saved for site: ${alarmData.edotcoSID}`);
      } else {
        console.log(
          `Alarm already exists for site: ${alarmData.edotcoSID} in the last 10 minutes.`
        );
      }
    } catch (error) {
      console.error("An error occurred while saving alarms:", error);
      reject(error);
    }
  });
}

//alarm close function when alarm condition disappeared
async function closeAlarm(customid, alarm_id) {
  try {
    console.log("customid:", customid, "alarm_id:", alarm_id);
    const existingAlarms = await Alarm_SiteFailure.find({
      alarm_id: alarm_id,
      customid: customid,
      close_time: "NA",
    });
    console.log("existingAlarms:", existingAlarms);
    if (existingAlarms) {
      existingAlarms.forEach(async (alarm) => {
        alarm.close_time = new Date().toLocaleString();
        await alarm.save();
        console.log("Alarm closed:", alarm);
      });
    }
  } catch (error) {
    console.error("An error occurred while closing alarms:", error);
  }
}

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
  let tenMinutesBefore = new Date(
    new Date(start).getTime() - 10 * 60 * 1000
  ).toISOString();

  console.log("======= 10 Minutes Before: " + tenMinutesBefore);

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
            $gte: new Date(tenMinutesBefore), // "2024-08-29T10:06:00.772Z"
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

async function closeSitesNotInEdotcoSIDs(edotcoSIDs) {
  try {
    // Extract the edotcoSID values from the array of objects
    const edotcoSIDList = edotcoSIDs.map((item) => item.edotcoSID);

    // Find all site failures that are not in the edotcoSIDList and have an open failure (close_time is "NA")
    const openFailures = await Alarm_SiteFailure.find({
      edotcoSID: { $nin: edotcoSIDList }, // Not in the edotcoSIDs list
      close_time: "NA", // Open failures only
    });

    // Iterate over each open failure and update its close_time
    for (const failure of openFailures) {
      failure.close_time = new Date(); // Set the current time
      //failure.time_to_close = new Date() - new Date(failure.open_time); // Calculate duration
      await failure.save();
      console.log("Alarm closed : ", failure.edotcoSID);
    }
  } catch (error) {
    console.error("Error closing sites not in edotcoSIDs array:", error);
  }
}

async function getZeroCountEdotcoSIDs(tenantIds) {
  try {
    // Find all tenants matching the tenantIds
    const tenants = await Tenant.findAll({ where: { tenantCode: tenantIds } });

    // Create a Set to store unique sIds
    const uniqueSIds = new Set();

    // Iterate over tenants to add only unique sIds to the Set
    tenants.forEach((tenant) => {
      uniqueSIds.add(tenant.sId);
    });

    // Convert the Set back to an array if needed
    const tenantSIdsArray = Array.from(uniqueSIds);

    const sites = await Site.findAll({ where: { id: tenantSIdsArray } });

    const edotcoSIDs = sites.map((site) => ({ edotcoSID: site.edotcoSID }));

    console.log(edotcoSIDs);
    return edotcoSIDs;
  } catch (error) {
    console.error("Error retrieving tenants sIds:", error);
    throw new Error(`Error retrieving tenants sIds: ${error.message}`);
  }
}

async function getAlarm() {
  const tenants = await getZeroCountTenants();
  const edotcoSIDs = await getZeroCountEdotcoSIDs(tenants);

  closeSitesNotInEdotcoSIDs(edotcoSIDs);

  if (edotcoSIDs) {
    edotcoSIDs.forEach(async ({ edotcoSID }) => {
      const alarmData = {
        alarm_id: 10,
        source: "MQTT_RT_DATA",
        category: "MQTT_RT_DATA Site data",
        alarm_name: "Site data not found",
        priority: "major",
        edotcoSID: edotcoSID,
      };
      await saveAlarms(alarmData);
    });
  }
}

module.exports = { getZeroCountEdotcoSIDs, saveAlarms, closeAlarm, getAlarm };
