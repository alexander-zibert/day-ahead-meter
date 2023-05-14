/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
}

const hourToMs = (s: string) => {
  const [hour, minute] = s.split(":");
  return (Number(hour) * 3600 + Number(minute) * 60) * 1000;
};

const parseData = (txt: string) => {
  return txt
    .split("\n")
    .slice(1)
    .map((line) => {
      return line.trim().split(";");
    })
    .filter((parts) => parts.length === 4)
    .map(([date, start, end, value]) => {
      return {
        date,
        start: hourToMs(start),
        end: hourToMs(end),
        value: Number(value.replace(",", ".")),
      };
    });
};

const getToday = (date: Date) => {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const beginingOfDay = (date: Date, timeZone: string) => {
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

const getData = async function (date: Date) {
  const start = date.valueOf() - 1 * 3600 * 1000;
  const end = date.valueOf() + 25 * 3600 * 1000;

  return fetch(
    "https://www.smard.de/nip-download-manager/nip/download/market-data",
    {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        request_form: [
          {
            format: "CSV",
            moduleIds: [8004169],
            region: "DE-LU",
            timestamp_from: start,
            timestamp_to: end,
            type: "discrete",
            language: "de",
            resolution: "quarterhour",
          },
        ],
      }),
      method: "POST",
    }
  );
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const date = new Date(Number(searchParams.get("date")));
    const startOfDate = beginingOfDay(date, "Europe/Berlin");
    const today = getToday(date);

    const cacheKey = new Request(
      `https://test.com/?date=${startOfDate.toISOString()}`,
      request
    );
    console.log(cacheKey);
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    if (response) {
      console.log("cache hit for", cacheKey.url);
      return response;
    }

    const fetchedResponse = await getData(startOfDate);

    const data = await fetchedResponse.text();

    const json = JSON.stringify({
      date: startOfDate.valueOf(),
      data: parseData(data)
        .filter(({ date }) => date === today)
        .map(({ start, end, value }) => ({ start, end, value })),
    });

    const resp = new Response(json, {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Cache-Control": "s-maxage=2592000",
      },
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  },
};
