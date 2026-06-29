export type JsonSchemaType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
export interface JsonSchema {
    type?: JsonSchemaType;
    title?: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
}
export interface JsonSchemaEditorProps {
    value: JsonSchema;
    onChange: (value: JsonSchema) => void;
    className?: string;
}
export declare function JsonSchemaEditor({ value, onChange, className, }: JsonSchemaEditorProps): import("react").JSX.Element;
//# sourceMappingURL=json-schema-editor.d.ts.map