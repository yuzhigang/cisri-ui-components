/**
 * 表单 widget 标识（RJSF 核心子集）。
 */
export type UiWidget =
  | 'text'
  | 'textarea'
  | 'password'
  | 'color'
  | 'date'
  | 'updown'
  | 'range'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'hidden';

/**
 * uiSchema：与 JsonSchema 并行的 UI 提示（RJSF 风格 ui:* 键）。
 * 嵌套：object 各 property 名 → UiSchema；array 的 'items' → UiSchema。
 */
export interface UiSchema {
  'ui:widget'?: UiWidget;
  'ui:options'?: Record<string, unknown>;
  'ui:label'?: string | false;
  'ui:help'?: string;
  'ui:placeholder'?: string;
  'ui:order'?: string[];
  'ui:hidden'?: boolean;
  'ui:disabled'?: boolean;
  'ui:readonly'?: boolean;
  'ui:classNames'?: string;
  'ui:autofocus'?: boolean;
  [property: string]: unknown;
}