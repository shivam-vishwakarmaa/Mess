const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TZ = process.env.TZ || "Asia/Kolkata";

function todayKey() {
  return dayjs().tz(APP_TZ).format("YYYY-MM-DD");
}

function nowInTz() {
  return dayjs().tz(APP_TZ);
}

function normalizeDateKey(dateKey) {
  return dayjs.tz(dateKey, "YYYY-MM-DD", APP_TZ).format("YYYY-MM-DD");
}

function toExpireAt(dateKey) {
  return dayjs.tz(dateKey, "YYYY-MM-DD", APP_TZ).add(30, "day").toDate();
}

function daysSince(dateObj) {
  if (!dateObj) return 0;
  const joined = dayjs(dateObj).tz(APP_TZ).startOf("day");
  const now = dayjs().tz(APP_TZ).startOf("day");
  return now.diff(joined, "day");
}

module.exports = {
  APP_TZ,
  dayjs,
  daysSince,
  normalizeDateKey,
  nowInTz,
  toExpireAt,
  todayKey
};
