// Free weather from Open-Meteo (https://open-meteo.com): no API key, CORS-enabled.
import { useQuery } from "@tanstack/react-query";
import type { Location } from "./settings";

export type Weather = {
  tempNow: number;
  tempHigh: number;
  tempLow: number;
  precipitationChance: number | null;
  windMph: number;
  condition: string;
};

// WMO weather interpretation codes, as documented by Open-Meteo.
const CONDITIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms with hail",
  99: "Thunderstorms with hail",
};

async function fetchWeather({ latitude, longitude }: Location): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "1",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = await res.json();

  return {
    tempNow: Math.round(data.current.temperature_2m),
    tempHigh: Math.round(data.daily.temperature_2m_max[0]),
    tempLow: Math.round(data.daily.temperature_2m_min[0]),
    precipitationChance: data.daily.precipitation_probability_max?.[0] ?? null,
    windMph: Math.round(data.current.wind_speed_10m),
    condition: CONDITIONS[data.current.weather_code] ?? "Weather",
  };
}

export function useWeather(location: Location | null | undefined) {
  return useQuery({
    queryKey: ["weather", location?.latitude, location?.longitude],
    queryFn: () => fetchWeather(location!),
    enabled: Boolean(location),
    staleTime: 15 * 60_000,
  });
}

/** Weather sentence for the Home card, e.g. "Partly cloudy · 10% chance of rain · wind 6 mph". */
export function describeWeather(w: Weather) {
  const parts = [w.condition];
  if (w.precipitationChance !== null && w.precipitationChance >= 10) {
    parts.push(`${w.precipitationChance}% chance of precipitation`);
  }
  if (w.windMph >= 10) parts.push(`wind ${w.windMph} mph`);
  return parts.join(" · ");
}

export type PlaceResult = Location & { id: number };

/** City search via Open-Meteo's free geocoding API. */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ name: query, count: "5", language: "en", format: "json" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();
  return (data.results ?? []).map(
    (r: { id: number; name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      label: [r.name, r.admin1, r.country_code].filter(Boolean).join(", "),
    }),
  );
}

/** Browser geolocation as a promise. Rejects if the user declines. */
export function currentPosition(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't available in this browser"));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
          label: "Current location",
        }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "Location permission was denied" : "Couldn't get your location")),
      { timeout: 10_000, maximumAge: 60 * 60_000 },
    );
  });
}
