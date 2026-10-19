import { z } from "zod";

/**
 * Accept minute-precision and second-precision UTC timestamps, matching the
 * inputs accepted before Zod 4.6 made seconds mandatory.
 */
export const utcDateTimeSchema = z.string().datetime().or(z.string().datetime({ precision: -1 }));
