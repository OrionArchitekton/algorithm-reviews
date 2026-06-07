import { generateObject } from "ai";
import type { z } from "zod";
import { type Tier, getModel, modelMode } from "./model";

/**
 * Structured-output helper. In mock mode it returns the supplied deterministic
 * value (offline tests + the guaranteed demo path); in live mode it calls the
 * model with a zod schema. A model/parse error degrades to the mock value so a
 * single flaky call never kills the run.
 */
export async function genObject<T>(opts: {
  tier: Tier;
  schema: z.ZodType<T>;
  system?: string;
  prompt: string;
  mock: () => T;
  /** Force the deterministic mock regardless of env (used by the /demo route). */
  forceMock?: boolean;
}): Promise<T> {
  if (opts.forceMock || modelMode() === "mock") return opts.mock();
  try {
    const { object } = await generateObject({
      model: getModel(opts.tier),
      schema: opts.schema,
      system: opts.system,
      prompt: opts.prompt,
      temperature: 0,
    });
    return object;
  } catch (err) {
    console.warn(`genObject(${opts.tier}) fell back to mock:`, err);
    return opts.mock();
  }
}
