export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyCRbKSOIc8um_dD0K814eFx7CLHLU3ZbBM",
    authDomain: "domek-14cdc.firebaseapp.com",
    databaseURL: "https://domek-14cdc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "domek-14cdc",
    storageBucket: "domek-14cdc.appspot.com",
    messagingSenderId: "351142617921",
    appId: "1:351142617921:web:93bb442bd0a66ea03b77c0",
    measurementId: "G-SGNY9ZJV6L"
  },
  // Shared family Google calendar that events are mirrored into. Copy it from
  // Google Calendar -> Settings for that calendar -> "Integrate calendar" -> Calendar ID
  // (looks like xxxxx@group.calendar.google.com). Not a secret, safe to commit.
  // While empty, the "Synchronizuj z Google" button reports that sync is not configured.
  googleCalendarId: "a12b10dadc72fccb38063f4bf4acafa097136ed595afa6efac9430d29ae2984d@group.calendar.google.com"
};
