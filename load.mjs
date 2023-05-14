const ONE_DAY_IN_MS = 24 * 3600 * 1000;
const start = new Date().valueOf() - ONE_DAY_IN_MS;
const end = new Date().valueOf() + ONE_DAY_IN_MS;

// const resp = await fetch(
//   "https://www.smard.de/nip-download-manager/nip/download/market-data",
//   {
//     headers: {
//       "content-type": "application/json",
//     },
//     body: JSON.stringify({
//       request_form: [
//         {
//           format: "CSV",
//           moduleIds: [8004169],
//           region: "DE-LU",
//           timestamp_from: start,
//           timestamp_to: end,
//           type: "discrete",
//           language: "de",
//           resolution: "quarterhour",
//         },
//       ],
//     }),
//     method: "POST",
//   }
// );

// console.log(await resp.text());

const today = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
console.log(today);
