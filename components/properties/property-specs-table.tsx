"use client"

import { useTranslations } from "next-intl"
import type { PropertyListing } from "@/types/property-listing"

interface PropertySpecsTableProps {
  listing: PropertyListing
}

export function PropertySpecsTable({ listing }: PropertySpecsTableProps) {
  const t = useTranslations("properties")

  const rows: { label: string; value: string }[] = [
    { label: t("specOperation"), value: t(`operation.${listing.operation}`) },
    { label: t("specType"), value: t(`propertyType.${listing.propertyType}`) },
  ]
  if (listing.rooms != null) rows.push({ label: t("specRooms"), value: String(listing.rooms) })
  if (listing.bathrooms != null) rows.push({ label: t("specBathrooms"), value: String(listing.bathrooms) })
  if (listing.coveredM2 != null) rows.push({ label: t("specCoveredM2"), value: `${listing.coveredM2} m²` })
  if (listing.totalM2 != null) rows.push({ label: t("specTotalM2"), value: `${listing.totalM2} m²` })
  if (listing.expenses != null) rows.push({ label: t("specExpenses"), value: String(listing.expenses) })
  rows.push({
    label: t("specLocation"),
    value: [listing.neighborhood, listing.city, listing.province].filter(Boolean).join(", ") || listing.locationLabel,
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
