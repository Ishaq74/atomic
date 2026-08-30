import { z } from "astro/zod";

export const serviceAttributeDefinitionTypeSchema = z.enum(["STRING", "NUMBER", "BOOLEAN", "SELECT"]);

export const serviceAttributeValueInputSchema = z.object({
  stringValue: z.string().trim().max(5000).optional().nullable(),
  numberValue: z.number().int().optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
  selectedValue: z.string().trim().max(500).optional().nullable(),
});

export type ServiceAttributeDefinitionType = z.infer<typeof serviceAttributeDefinitionTypeSchema>;
export type ServiceAttributeValueInput = z.input<typeof serviceAttributeValueInputSchema>;

export function validateServiceAttributeValue(
  input: ServiceAttributeValueInput,
  type: ServiceAttributeDefinitionType,
  options: readonly string[] = [],
): void {
  const value = serviceAttributeValueInputSchema.parse(input);
  const present = [
    value.stringValue !== null && value.stringValue !== undefined,
    value.numberValue !== null && value.numberValue !== undefined,
    value.booleanValue !== null && value.booleanValue !== undefined,
    value.selectedValue !== null && value.selectedValue !== undefined,
  ];
  if (present.filter(Boolean).length !== 1) throw new Error("Exactly one attribute value is required.");
  if (type === "STRING" && !present[0]) throw new Error("Expected a string attribute value.");
  if (type === "NUMBER" && !present[1]) throw new Error("Expected a numeric attribute value.");
  if (type === "BOOLEAN" && !present[2]) throw new Error("Expected a boolean attribute value.");
  if (type === "SELECT") {
    if (!present[3]) throw new Error("Expected a selected attribute value.");
    if (!options.includes(value.selectedValue!)) throw new Error("Selected value is not one of the allowed options.");
  }
}
