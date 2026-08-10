import catalog from "@/data/vehicle-catalog.json"

export const VEHICLE_MAKES = Object.keys(catalog.makes).sort((a, b) => a.localeCompare(b, "es"))

export const ARGENTINA_PROVINCES = catalog.provinces

export function modelsForMake(make: string): string[] {
  const models = catalog.makes[make as keyof typeof catalog.makes]
  return models ? [...models] : ["Otro"]
}
