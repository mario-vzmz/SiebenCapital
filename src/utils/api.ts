export const apiUrl = (path: string) => {
  const base = process.env.RELAY_URL || ''
  return `${base}${path}`
}
