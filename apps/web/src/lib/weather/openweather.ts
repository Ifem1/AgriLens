import type { WeatherSnapshot } from "@/types/database";

const BASE_URL = "https://api.openweathermap.org/data/2.5";

export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) throw new Error("OpenWeatherMap API key not configured");

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
    fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=8`),
  ]);

  if (!currentRes.ok) throw new Error("Failed to fetch weather data");

  const current = await currentRes.json();
  const forecast = forecastRes.ok ? await forecastRes.json() : null;

  const rainProbability = forecast
    ? Math.round((forecast.list?.[0]?.pop ?? 0) * 100)
    : 0;

  return {
    temperature: Math.round(current.main.temp),
    humidity: current.main.humidity,
    wind_speed: Math.round(current.wind.speed * 3.6),
    condition: current.weather?.[0]?.description ?? "unknown",
    rain_probability: rainProbability,
    location: current.name ?? `${lat},${lon}`,
    fetched_at: new Date().toISOString(),
  };
}
