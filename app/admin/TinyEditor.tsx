"use client";

import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/autolink";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/image";
import "tinymce/plugins/table";
import "tinymce/plugins/code";
import "tinymce/plugins/wordcount";
import "tinymce/skins/ui/oxide/skin.min.css";

export function TinyEditor({ value, onChange }: { value: string; onChange: (content: string) => void }) {
  return (
    <Editor
      licenseKey="gpl"
      value={value}
      onEditorChange={onChange}
      init={{
        height: 420,
        menubar: true,
        skin: false,
        content_css: false,
        plugins: "autolink link lists image table code wordcount",
        toolbar: "undo redo | blocks fontfamily fontsize | bold italic underline | bullist numlist | link image table | blockquote | code",
        font_family_formats:
          "Be Vietnam Pro='Be Vietnam Pro',sans-serif; JetBrains Mono='JetBrains Mono',monospace; Arial=Arial,sans-serif; Times New Roman='Times New Roman',serif",
        content_style: `
          @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
          body {
            font-family: 'Be Vietnam Pro', Arial, sans-serif;
            font-size: 16px;
            font-weight: 400;
            line-height: 1.7;
            padding: 12px;
          }
          p { font-weight: 400; }
          code, pre { font-family: 'JetBrains Mono', monospace; }
        `,
      }}
    />
  );
}
