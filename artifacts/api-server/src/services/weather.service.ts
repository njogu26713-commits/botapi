/**
 * Weather service using OpenWeatherMap API.
 */
import axios from "axios";
import NodeCache from "node-cache";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  sunrise: Date;
  sunset: Date;
}

export async function getWeather(city: string): Promise<WeatherData> {
  const cacheKey = `weather:${city.toLowerCase()}`;
  const cached = cache.get<WeatherData>(cacheKey);
  if (cached) return cached;

  if (!config.weatherApiKey) {
    throw new Error("Weather API key not configured. Set WEATHER_API_KEY.");
  }

  try {
    const res = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: {
        q: city,
        appid: config.weatherApiKey,
        units: "metric",
      },
      timeout: 8000,
    });

    const d = res.data;
    const data: WeatherData = {
      city: d.name,
      country: d.sys.country,
      temperature: Math.round(d.main.temp),
      feelsLike: Math.round(d.main.feels_like),
      humidity: d.main.humidity,
      windSpeed: Math.round(d.wind.speed * 3.6), // m/s → km/h
      description: d.weather[0]?.description ?? "",
      icon: d.weather[0]?.icon ?? "",
      sunrise: new Date(d.sys.sunrise * 1000),
      sunset: new Date(d.sys.sunset * 1000),
    };

    cache.set(cacheKey, data);
    return data;
  } catch (err: any) {
    logger.error({ err, city }, "Weather API error");
    if (err.response?.status === 404) {
      throw new Error(`City "${city}" not found.`);
    }
    throw new Error("Failed to fetch weather data. Try again later.");
  }
}

export function formatWeather(w: WeatherData): string {
  const emojiMap: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "⛅",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌦️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️",
  };

  const icon = emojiMap[w.icon] ?? "🌡️";
  const time = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    `${icon} *Weather in ${w.city}, ${w.country}*\n\n` +
    `🌡️ Temperature: *${w.temperature}°C* (feels like ${w.feelsLike}°C)\n` +
    `📝 Condition: ${w.description}\n` +
    `💧 Humidity: ${w.humidity}%\n` +
    `💨 Wind: ${w.windSpeed} km/h\n` +
    `🌅 Sunrise: ${time(w.sunrise)}\n` +
    `🌇 Sunset: ${time(w.sunset)}`
  );
}
