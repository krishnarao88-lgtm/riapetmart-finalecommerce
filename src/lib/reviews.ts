import { supabaseUrl } from "@/lib/site";

export const reviewImageUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/review-images/${path}`;
