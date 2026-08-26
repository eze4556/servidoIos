"use client"

import { useTranslations } from "next-intl"
import type { VehicleListing } from "@/types/vehicle-listing"

interface VehicleSpecsTableProps {
  listing: VehicleListing
}

export function VehicleSpecsTable({ listing }: VehicleSpecsTableProps) {
  const t = useTranslations("vehicles")

  const rows: { label: string; value: string }[] = [
    { label: t("specMake"), value: listing.make },
    { label: t("specModel"), value: listing.model },
    { label: t("specYear"), value: String(listing.year) },
    { label: t("specType"), value: t(`vehicleType.${listing.vehicleType}`) },
    { label: t("specCondition"), value: t(`condition.${listing.condition}`) },
  ]

  if (listing.mileageKm != null) {
    rows.push({ label: t("specMileage"), value: `${listing.mileageKm.toLocaleString()} km` })
  }
  if (listing.fuelType) rows.push({ label: t("specFuel"), value: t(`fuel.${listing.fuelType}`) })
  if (listing.transmission) {
    rows.push({ label: t("specTransmission"), value: t(`transmission.${listing.transmission}`) })
  }
  if (listing.color) rows.push({ label: t("specColor"), value: listing.color })
  if (listing.doors) rows.push({ label: t("specDoors"), value: String(listing.doors) })
  if (listing.engine) rows.push({ label: t("specEngine"), value: listing.engine })
  rows.push({
    label: t("specLocation"),
    value: [listing.city, listing.province].filter(Boolean).join(", ") || listing.locationLabel,
  })

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 lg:rounded-3xl">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-servido-950/[0.04] last:border-0">
              <th className="w-2/5 bg-servido-50/60 px-4 py-3 text-left font-medium text-servido-800 lg:px-5 lg:py-3.5">
                {row.label}
              </th>
              <td className="bg-white px-4 py-3 text-servido-950 lg:px-5 lg:py-3.5">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
