<template>
  <fieldset>
    <legend>Wähle einen Tag</legend>

    <input type="radio" id="one" value="today" v-model="state" />
    <label for="one">Heute</label>

    <input type="radio" id="two" value="tomorrow" v-model="state" />
    <label for="two">Morgen</label>
  </fieldset>

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

const beginingOfDay = (date, timeZone) => {
  const parts = Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  if (!parts) {
    return new Date();
  }
  const hour = Number(parts.find((i) => i.type === "hour")?.value);
  const minute = Number(parts.find((i) => i.type === "minute")?.value);
  const second = Number(parts.find((i) => i.type === "second")?.value);
  return new Date(
    1000 *
      Math.floor(
        (date.valueOf() - hour * 3600000 - minute * 60000 - second * 1000) /
          1000
      )
  );
};

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

const getData = async function (state) {
  const date =
    state === "today"
      ? new Date().valueOf()
      : new Date().valueOf() + 24 * 3600 * 1000;
  const ts = beginingOfDay(date).valueOf();
  const data = await fetch(
    `https://day-ahead-meter.alexander-zibert.workers.dev/?date=${ts}`
  ).then((resp) => resp.json());
  return data;
};

export default {
  data() {
    return { data: [], date: null, state: "today" };
  },
  watch: {
    async state(newState) {
      const data = await getData(newState);
      this.date = data.date;
      this.data = data.data;
    },
  },
  async mounted() {
    const data = await getData(this.state);
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
