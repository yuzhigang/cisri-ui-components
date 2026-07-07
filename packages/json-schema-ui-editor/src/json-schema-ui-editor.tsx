import { useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@cisri/shadcn';
import { Settings2 } from 'lucide-react';
import { cn } from '@cisri/core';
import { JsonSchemaForm } from '@cisri/json-schema-form';
import type { JsonSchema } from '@cisri/json-schema-core';
import { setUiField, type UiSchema } from '@cisri/json-schema-ui-core';
import { FieldConfigPanel } from './field-config-panel';

export interface JsonSchemaUiEditorProps {
  schema: JsonSchema;
  uiSchema: UiSchema;
  onChange: (uiSchema: UiSchema) => void;
  formData?: unknown;
  readOnly?: boolean;
  className?: string;
}

export function JsonSchemaUiEditor({
  schema,
  uiSchema,
  onChange,
  formData,
  readOnly,
  className,
}: JsonSchemaUiEditorProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [previewValue, setPreviewValue] = useState<unknown>(formData);

  const handlePatch = useCallback(
    (path: string[], patch: Partial<UiSchema>) => {
      onChange(setUiField(uiSchema, path, patch));
    },
    [onChange, uiSchema]
  );

  const renderFieldActions = useCallback(
    (ctx: { path: string[]; uiSchema: UiSchema | undefined; schema: JsonSchema }) => {
      if (readOnly) return null;
      const key = ctx.path.join('.');
      return (
        <Popover
          open={openKey === key}
          onOpenChange={(o) =>
            o ? setOpenKey(key) : setOpenKey((cur) => (cur === key ? null : cur))
          }
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              aria-label={`配置字段 ${key}`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <FieldConfigPanel
              schema={ctx.schema}
              uiField={ctx.uiSchema}
              onPatch={(patch) => handlePatch(ctx.path, patch)}
            />
          </PopoverContent>
        </Popover>
      );
    },
    [readOnly, openKey, handlePatch]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <JsonSchemaForm
        schema={schema}
        uiSchema={uiSchema}
        value={previewValue}
        onChange={setPreviewValue}
        renderFieldActions={renderFieldActions}
      />
    </div>
  );
}