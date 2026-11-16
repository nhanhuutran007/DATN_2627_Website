"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useMemo } from "react";
import {
  AutoImage,
  AutoLink,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  FileRepository,
  Heading,
  Image,
  ImageCaption,
  ImageInsert,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Italic,
  Link,
  List,
  Paragraph,
  PasteFromOffice,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
  type Editor,
  type EditorConfig,
  type ViewDocumentClipboardInputEvent,
} from "ckeditor5";
import viTranslations from "ckeditor5/translations/vi.js";
import "ckeditor5/ckeditor5.css";

import { resolveMediaUrl } from "@/lib/api";
import { uploadImage, validateImageFile } from "@/lib/api/media";

/** Ảnh chèn vào nội dung được tải lên kho media của hệ thống, HTML chỉ lưu link. */
function MediaUploadAdapter(editor: Editor) {
  editor.plugins.get(FileRepository).createUploadAdapter = (loader) => ({
    upload: async () => {
      const file = await loader.file;
      if (!file) throw new Error("Không đọc được file ảnh.");
      const invalid = validateImageFile(file);
      if (invalid) throw invalid;
      const uploaded = await uploadImage(file, "campaign_image");
      return { default: resolveMediaUrl(uploaded.url) };
    },
    abort: () => {},
  });
}

/** Thẻ không phải nội dung: CKEditor không hiểu nên giữ lại phần chữ bên trong thành đoạn văn. */
const NON_CONTENT_BLOCKS = /<(style|script|title|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const NON_CONTENT_VOID = /<(meta|link|base)\b[^>]*>/gi;

/** Bỏ CSS/script đi kèm HTML được dán (từ trang web, Word, trợ lý chat…) trước khi CKEditor chuyển thành nội dung. */
function stripNonContentHtml(html: string): string {
  return html.replace(NON_CONTENT_BLOCKS, "").replace(NON_CONTENT_VOID, "");
}

/**
 * Dán nội dung kèm thẻ `<style>` từng làm cả khối CSS hiện thành chữ trong "Kế hoạch sử dụng vốn"
 * (TC_CAMP_010). Làm sạch HTML ở bước `clipboardInput`, trước khi CKEditor chuyển sang view.
 */
function StripPastedStyles(editor: Editor) {
  editor.editing.view.document.on<ViewDocumentClipboardInputEvent>(
    "clipboardInput",
    (_event, data) => {
      const html = data.dataTransfer.getData("text/html");
      if (!html) return;
      const cleaned = stripNonContentHtml(html);
      if (cleaned !== html) data.content = cleaned;
    },
    { priority: "high" },
  );
}

const CONFIG: EditorConfig = {
  licenseKey: "GPL",
  language: "vi",
  translations: [viTranslations],
  plugins: [
    Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, Link, AutoLink,
    List, BlockQuote, Table, TableToolbar, PasteFromOffice,
    Image, ImageUpload, ImageInsert, AutoImage, ImageCaption, ImageStyle, ImageToolbar,
  ],
  extraPlugins: [MediaUploadAdapter, StripPastedStyles],
  toolbar: {
    items: [
      "undo", "redo", "|", "heading", "|", "bold", "italic", "underline", "strikethrough", "|",
      "link", "insertImage", "insertTable", "blockQuote", "|", "bulletedList", "numberedList",
    ],
    shouldNotGroupWhenFull: false,
  },
  heading: {
    options: [
      { model: "paragraph", title: "Đoạn văn", class: "ck-heading_paragraph" },
      { model: "heading3", view: "h3", title: "Tiêu đề", class: "ck-heading_heading3" },
      { model: "heading4", view: "h4", title: "Tiêu đề nhỏ", class: "ck-heading_heading4" },
    ],
  },
  image: {
    toolbar: ["imageTextAlternative", "toggleImageCaption", "|", "imageStyle:inline", "imageStyle:block", "imageStyle:side"],
    insert: { integrations: ["upload", "url"] },
  },
  table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
  link: { defaultProtocol: "https://" },
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

/** Trình soạn thảo định dạng (CKEditor 5): kiểu chữ, danh sách, liên kết, ảnh, bảng. */
export default function RichTextEditor({ value, onChange, placeholder, disabled }: Props) {
  const config = useMemo(() => ({ ...CONFIG, placeholder }), [placeholder]);
  return (
    <div className="rich-editor">
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value}
        disabled={disabled}
        onChange={(_, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
