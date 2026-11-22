import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/** Public capability marker used to verify the backend before packaging iOS. */
export async function GET() {
  return NextResponse.json({
    appId: "ar.com.servido.app",
    apiVersion: 2,
    capabilities: ["account-deletion", "content-reports", "user-blocking"],
  }, { headers: { "Cache-Control": "no-store" } })
}
