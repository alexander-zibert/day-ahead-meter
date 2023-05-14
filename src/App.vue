<template>
  <h2>Datum</h2>
  {{ formatDate(date) }}
  <h2>Volatilität</h2>
  <div>
    q80 / q20:
    {{ Math.round((quantile(0.8, data) / quantile(0.2, data)) * 100) / 100 }}
  </div>
  <div>
    q90 / q10:
    {{ Math.round((quantile(0.9, data) / quantile(0.1, data)) * 100) / 100 }}
  </div>

  <h2>Beste Zeiträume Strom zu verbrauchen</h2>
  <div>10%: {{ formatMoney(quantile(0.1, data) / 1000) }} / kWh</div>
  <ul>
    <li v-for="range in lowEntries(0.1, data)" :key="range.start">
      {{ formatHour(date + range.start) }} {{ formatHour(date + range.end) }}
    </li>
  </ul>
  <div>20%: {{ formatMoney(quantile(0.2, data) / 1000) }} / kWh</div>
  <ul>
    <li v-for="range in lowEntries(0.2, data)" :key="range.start">
      {{ formatHour(date + range.start) }} {{ formatHour(date + range.end) }}
    </li>
  </ul>
  <div>30%: {{ formatMoney(quantile(0.3, data) / 1000) }} / kWh</div>
  <ul>
    <li v-for="range in lowEntries(0.3, data)" :key="range.start">
      {{ formatHour(date + range.start) }} {{ formatHour(date + range.end) }}
    </li>
  </ul>

  <h2>Schlechteste Zeiträume Strom zu verbrauchen</h2>
  <div>90%: {{ formatMoney(quantile(0.9, data) / 1000) }} / kWh</div>
  <ul>
    <li v-for="range in highEntries(0.9, data)" :key="range.start">
      {{ formatHour(date + range.start) }} {{ formatHour(date + range.end) }}
    </li>
  </ul>
  <div>80%: {{ formatMoney(quantile(0.8, data) / 1000) }} / kWh</div>
  <ul>
    <li v-for="range in highEntries(0.8, data)" :key="range.start">
      {{ formatHour(date + range.start) }} {{ formatHour(date + range.end) }}
    </li>
  </ul>
  <div>70%: {{ formatMoney(quantile(0.7, data) / 1000) }} / kWh</div>
  <ul>
    <li v-for="range in highEntries(0.7, data)" :key="range.start">
      {{ formatHour(date + range.start) }} {{ formatHour(date + range.end) }}
    </li>
  </ul>
</template>
<script>
const quantile = (q, arr) => {
  const copy = [...arr];
  copy.sort((a, b) => a - b);
  const length = Math.ceil(arr.length * q);
  return copy[length];
};

const hourFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

const moneyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const combineRanges = (data) => {
  if (data.length === 0) {
    return [];
  }
  const ranges = [{ ...data[0] }];
  for (const entry of data.slice(1)) {
    const lastRange = ranges[ranges.length - 1];
    if (entry.start === lastRange.end) {
      lastRange.end = entry.end;
    } else {
      ranges.push({ ...entry });
    }
  }
  return ranges;
};

export default {
  data() {
    return { data: [], date: null };
  },
  async mounted() {
    const data = await fetch(
      `https://day-ahead-meter.alexander-zibert.workers.dev/?date=${new Date().valueOf()}`
    ).then((resp) => resp.json());
    console.log(data);
    this.date = data.date;
    this.data = data.data;
  },
  methods: {
    formatHour(ts) {
      return hourFormatter.format(new Date(ts));
    },
    formatDate(ts) {
      return dateFormatter.format(new Date(ts));
    },
    formatMoney(n) {
      return moneyFormatter.format(n);
    },
    quantile(q, data) {
      return quantile(
        q,
        data.map(({ value }) => value)
      );
    },
    lowEntries(q, data) {
      const qs = quantile(
        q,
        data.map(({ value }) => value)
      );
      const filteredData = data.filter(({ value }) => value < qs);
      return combineRanges(filteredData);
    },
    highEntries(q, data) {
      const qs = quantile(
        q,
        data.map(({ value }) => value)
      );
      const filteredData = data.filter(({ value }) => value >= qs);
      return combineRanges(filteredData);
    },
  },
};
</script>
<style></style>
