export type Weather = { temp: number; emoji: string; label: string } | null;

// WMO weather codes → emoji + words
function describe(code: number, isDay: boolean): { emoji: string; label: string } {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code <= 2) return { emoji: isDay ? "🌤️" : "☁️", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Cloudy" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Foggy" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Rain" };
  if (code >= 71 && code <= 77) return { emoji: "❄️", label: "Snow" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "Showers" };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "Snow showers" };
  if (code >= 95) return { emoji: "⛈️", label: "Thunderstorm" };
  return { emoji: "🌡️", label: "" };
}

export async function getWeather(lat: number | null, lon: number | null): Promise<Weather> {
  if (lat == null || lon == null) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { current?: { temperature_2m: number; weather_code: number; is_day: number } };
    if (!j.current) return null;
    const d = describe(j.current.weather_code, j.current.is_day === 1);
    return { temp: Math.round(j.current.temperature_2m), ...d };
  } catch {
    return null;
  }
}
