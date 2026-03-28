export const APP_CONFIG = {
  version: "0.0.0", // إلياس يغيرها لاحقًا
  calculation: {
    method: 4, // Umm al-Qura
    school: 0   // جمهور/حنبلي (ظل مثله)
  },
  duha: {
    startOffsetMinutesAfterSunrise: 15,
    endOffsetMinutesBeforeDhuhr: 10
  },
  ui: {
    timeFormat12h: true, // عرض 12 ساعة ص/م
    defaultCity: { city: "Riyadh", country: "SA" }
  }
};
