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
        toolbar: "undo redo | blocks | bold italic underline | bullist numlist | link image table | blockquote | code",
        content_style: "body { font-family: 'Be Vietnam Pro', Arial, sans-serif; font-size: 16px; line-height: 1.7; padding: 12px; }",
      }}
    />
  );
}
