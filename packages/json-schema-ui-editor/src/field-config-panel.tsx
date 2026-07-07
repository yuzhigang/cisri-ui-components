import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@cisri/shadcn';
import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema, UiWidget } from '@cisri/json-schema-ui-core';
import { isPrimitiveField, widgetsForSchema } from './ui-editor-utils';

export interface FieldConfigPanelProps {
  schema: JsonSchema;
  uiField: UiSchema | undefined;
  onPatch: (patch: Partial<UiSchema>) => void;
}

export function FieldConfigPanel({ schema, uiField, onPatch }: FieldConfigPanelProps) {
  const primitive = isPrimitiveField(schema);
  const widgets = widgetsForSchema(schema);
  const labelValue = typeof uiField?.['ui:label'] === 'string' ? uiField['ui:label'] : '';
  const hideLabel = uiField?.['ui:label'] === false;

  return (
    <div className="space-y-3">
      {widgets.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="ui-cfg-widget">Widget</Label>
          <Select
            value={(uiField?.['ui:widget'] as UiWidget | undefined) ?? widgets[0]}
            onValueChange={(v) => onPatch({ 'ui:widget': v as UiWidget })}
          >
            <SelectTrigger id="ui-cfg-widget" aria-label="widget">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {widgets.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-label">Label</Label>
        <Input
          id="ui-cfg-label"
          autoComplete="off"
          value={labelValue}
          onChange={(e) => onPatch({ 'ui:label': e.target.value || undefined })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="ui-cfg-hide-label"
          aria-label="隐藏 label"
          checked={hideLabel}
          onCheckedChange={(c) => onPatch({ 'ui:label': c ? false : undefined })}
        />
        <Label htmlFor="ui-cfg-hide-label">隐藏 label</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-help">Help</Label>
        <Input
          id="ui-cfg-help"
          autoComplete="off"
          value={(uiField?.['ui:help'] as string | undefined) ?? ''}
          onChange={(e) => onPatch({ 'ui:help': e.target.value || undefined })}
        />
      </div>
      {primitive && (
        <div className="space-y-1">
          <Label htmlFor="ui-cfg-placeholder">Placeholder</Label>
          <Input
            id="ui-cfg-placeholder"
            autoComplete="off"
            value={(uiField?.['ui:placeholder'] as string | undefined) ?? ''}
            onChange={(e) => onPatch({ 'ui:placeholder': e.target.value || undefined })}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch
          id="ui-cfg-hidden"
          aria-label="隐藏字段"
          checked={uiField?.['ui:hidden'] === true}
          onCheckedChange={(c) => onPatch({ 'ui:hidden': c })}
        />
        <Label htmlFor="ui-cfg-hidden">隐藏字段</Label>
      </div>
      {primitive && (
        <div className="flex items-center gap-2">
          <Switch
            id="ui-cfg-disabled"
            aria-label="禁用"
            checked={uiField?.['ui:disabled'] === true}
            onCheckedChange={(c) => onPatch({ 'ui:disabled': c })}
          />
          <Label htmlFor="ui-cfg-disabled">禁用</Label>
        </div>
      )}
      {primitive && (
        <div className="flex items-center gap-2">
          <Switch
            id="ui-cfg-readonly"
            aria-label="只读"
            checked={uiField?.['ui:readonly'] === true}
            onCheckedChange={(c) => onPatch({ 'ui:readonly': c })}
          />
          <Label htmlFor="ui-cfg-readonly">只读</Label>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-classnames">Class names</Label>
        <Input
          id="ui-cfg-classnames"
          autoComplete="off"
          value={(uiField?.['ui:classNames'] as string | undefined) ?? ''}
          onChange={(e) => onPatch({ 'ui:classNames': e.target.value || undefined })}
        />
      </div>
    </div>
  );
}