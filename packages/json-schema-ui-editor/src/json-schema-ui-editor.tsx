import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema } from '@cisri/json-schema-ui-core';

export interface JsonSchemaUiEditorProps {
  schema: JsonSchema;
  uiSchema: UiSchema;
  onChange: (uiSchema: UiSchema) => void;
  formData?: unknown;
  readOnly?: boolean;
  className?: string;
}

export function JsonSchemaUiEditor(_: JsonSchemaUiEditorProps) {
  return null;
}