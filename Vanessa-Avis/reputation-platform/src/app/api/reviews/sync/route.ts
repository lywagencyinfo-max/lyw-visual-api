import { NextResponse } from "next/server";
import { listAllReviews, computeRatingDropAlert } from "@/lib/reviews/store";

export const runtime = "nodejs";

/**
 * Tire la liste des avis depuis le Google Business Profile connecté, ou
 * depuis les avis d'exemple (src/data/mockReviews.ts) si non configuré.
 * Ne publie ni ne modifie jamais rien — lecture seule.
 */
export async function GET() {
  const { reviews, backend } = await listAllReviews();
  const ratingDropAlert = await computeRatingDropAlert();
  return NextResponse.json({ reviews, backend, ratingDropAlert, syncedAt: new Date().toISOString() });
}
