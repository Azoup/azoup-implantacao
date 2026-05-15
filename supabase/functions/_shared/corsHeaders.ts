/** CORS padrão das Edge Functions calendar-* (browser + preflight OPTIONS). */
export const calendarFunctionCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
