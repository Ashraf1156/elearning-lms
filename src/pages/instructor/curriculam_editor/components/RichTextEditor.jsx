import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Link } from '@tiptap/extension-link'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { motion, AnimatePresence } from "framer-motion";
import {
    Maximize2, Minimize2, Type, Image as ImageIcon, Table as TableIcon,
    Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
    AlignRight, AlignJustify, List, ListOrdered, Link as LinkIcon,
    MinusSquare, Undo2, Redo2, Trash2, Palette, Heading1, Heading2,
    Heading3, Plus, Minus, Columns, Rows, Merge, Split, Upload,
    ArrowLeft, ArrowRight, Save, X, ExternalLink, WrapText,
    Maximize, Minimize, Move, Type as TypeIcon, ZoomIn, ZoomOut,
    RotateCw, Download, Copy, Crop, Settings, Loader2
} from "lucide-react";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Slider } from "../../../../components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { useToast } from "../../../../contexts/ToastComponent";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";

// Cloudinary Upload Function
const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "elearning-lms");
    formData.append("cloud_name", "djiplqjqu");

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/djiplqjqu/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
};

// Table Modal Component
function TableModal({
    show,
    onClose,
    onInsert,
    onAddRow,
    onAddColumn,
    onDeleteRow,
    onDeleteColumn,
    onMergeCells,
    onSplitCell,
    editor
}) {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [hasHeader, setHasHeader] = useState(true);
    const [cellBgColor, setCellBgColor] = useState('#ffffff');
    const [borderColor, setBorderColor] = useState('#000000');

    if (!show) return null;

    const isTableActive = editor?.isActive('table');

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isTableActive ? 'Edit Table' : 'Insert Table'}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="insert" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="insert">Insert</TabsTrigger>
                        <TabsTrigger value="format" disabled={!isTableActive}>Format</TabsTrigger>
                    </TabsList>

                    <TabsContent value="insert" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rows">Rows</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="rows"
                                        type="number"
                                        value={rows}
                                        onChange={(e) => setRows(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                        min="1"
                                        max="10"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setRows(Math.max(1, rows - 1))}
                                    >
                                        <Minus size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setRows(Math.min(10, rows + 1))}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="columns">Columns</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="columns"
                                        type="number"
                                        value={cols}
                                        onChange={(e) => setCols(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                        min="1"
                                        max="10"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCols(Math.max(1, cols - 1))}
                                    >
                                        <Minus size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCols(Math.min(10, cols + 1))}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={hasHeader}
                                    onChange={(e) => setHasHeader(e.target.checked)}
                                    className="rounded"
                                />
                                Include header row
                            </Label>
                        </div>

                        <div className="p-4 border rounded-lg">
                            <div className="text-center text-sm text-muted-foreground mb-2">
                                Preview
                            </div>
                            <div className="border rounded overflow-hidden">
                                {Array.from({ length: rows + (hasHeader ? 1 : 0) }).map((_, rowIndex) => (
                                    <div key={rowIndex} className="flex border-b last:border-b-0">
                                        {Array.from({ length: cols }).map((_, colIndex) => (
                                            <div
                                                key={colIndex}
                                                className={`flex-1 h-8 border-r last:border-r-0 flex items-center justify-center text-xs
                                                    ${rowIndex === 0 && hasHeader ? 'bg-muted font-medium' : 'bg-background'}`}
                                            >
                                                {rowIndex === 0 && hasHeader ? 'Header' : 'Cell'}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="format" className="space-y-4">
                        {isTableActive && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Rows</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddRow('above')}
                                                className="flex-1"
                                            >
                                                <Rows size={14} className="mr-1" />
                                                Add Above
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddRow('below')}
                                                className="flex-1"
                                            >
                                                <Rows size={14} className="mr-1" />
                                                Add Below
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onDeleteRow}
                                                className="text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Columns</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddColumn('left')}
                                                className="flex-1"
                                            >
                                                <Columns size={14} className="mr-1" />
                                                Add Left
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddColumn('right')}
                                                className="flex-1"
                                            >
                                                <Columns size={14} className="mr-1" />
                                                Add Right
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onDeleteColumn}
                                                className="text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cells</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onMergeCells}
                                                className="flex-1"
                                            >
                                                <Merge size={14} className="mr-1" />
                                                Merge
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onSplitCell}
                                                className="flex-1"
                                            >
                                                <Split size={14} className="mr-1" />
                                                Split
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Cell Background</Label>
                                        <Input
                                            type="color"
                                            value={cellBgColor}
                                            onChange={(e) => {
                                                setCellBgColor(e.target.value);
                                                if (editor) {
                                                    editor.chain().focus().setCellAttribute('backgroundColor', e.target.value).run();
                                                }
                                            }}
                                            className="h-8"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Border Color</Label>
                                    <Input
                                        type="color"
                                        value={borderColor}
                                        onChange={(e) => {
                                            setBorderColor(e.target.value);
                                            if (editor) {
                                                editor.chain().focus().setCellAttribute('borderColor', e.target.value).run();
                                            }
                                        }}
                                        className="h-8"
                                    />
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    {!isTableActive ? (
                        <Button
                            type="button"
                            onClick={() => {
                                onInsert(rows, cols, hasHeader);
                                onClose();
                            }}
                        >
                            Insert Table
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Available fonts
const FONT_FAMILIES = [
    { name: "Default", value: "inherit" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Times New Roman", value: "'Times New Roman', serif" },
    { name: "Courier New", value: "'Courier New', monospace" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
    { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
    { name: "Impact", value: "Impact, sans-serif" },
    { name: "Tahoma", value: "Tahoma, sans-serif" },
];

// Font sizes with labels
const FONT_SIZES = [
    { label: "Small", value: "12px" },
    { label: "Normal", value: "14px" },
    { label: "Medium", value: "16px" },
    { label: "Large", value: "18px" },
    { label: "X-Large", value: "20px" },
    { label: "XX-Large", value: "24px" },
    { label: "XXX-Large", value: "28px" },
    { label: "Huge", value: "32px" },
];

// Color palette
const COLORS = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
    "#ff00ff", "#00ffff", "#ff9900", "#9900ff", "#0099ff", "#ff0099",
    "#666666", "#999999", "#cccccc", "#333333"
];

// Common sizes for quick selection
const QUICK_SIZES = [
    { label: "25%", width: "25%", height: "auto" },
    { label: "50%", width: "50%", height: "auto" },
    { label: "75%", width: "75%", height: "auto" },
    { label: "100%", width: "100%", height: "auto" },
    { label: "Small", width: "200px", height: "auto" },
    { label: "Medium", width: "400px", height: "auto" },
    { label: "Large", width: "600px", height: "auto" },
];

export default function RichTextEditor({
    content,
    onChange,
    onClose,
    navigation,
    showNavigation = true
}) {
    const [fullscreen, setFullscreen] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showImageSettings, setShowImageSettings] = useState(false);
    const [currentLink, setCurrentLink] = useState({ url: "", text: "" });
    const [imageUploading, setImageUploading] = useState(false);
    const [imageData, setImageData] = useState({
        url: "",
        alt: "",
        title: "",
        width: "100%",
        height: "auto",
        align: "center",
    });
    const [fontSize, setFontSize] = useState("16px");
    const [wordWrap, setWordWrap] = useState(true);
    const [selectedImageNode, setSelectedImageNode] = useState(null);
    const [uploadedImages, setUploadedImages] = useState({}); // Store Cloudinary URLs
    const [tempImageUrl, setTempImageUrl] = useState(null); // Store temp blob URLs
    const fileInputRef = useRef(null);
    const { toast } = useToast();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-disc pl-6 space-y-1',
                    },
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-decimal pl-6 space-y-1',
                    },
                },
                paragraph: {
                    HTMLAttributes: {
                        class: 'mb-4 leading-relaxed',
                    },
                },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-4 border-gray-300 pl-4 my-4 italic',
                    },
                },
                codeBlock: {
                    HTMLAttributes: {
                        class: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm my-4',
                    },
                },
                horizontalRule: {
                    HTMLAttributes: {
                        class: 'my-8 border-t border-gray-300',
                    },
                },
            }),
            Placeholder.configure({
                placeholder: 'Start typing here...',
            }),
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        src: {
                            default: null,
                        },
                        alt: {
                            default: '',
                        },
                        title: {
                            default: '',
                        },
                        width: {
                            default: '100%',
                            parseHTML: element => {
                                const width = element.getAttribute('width');
                                const styleWidth = element.style.width;
                                return width || styleWidth || '100%';
                            },
                            renderHTML: attributes => {
                                if (attributes.width && attributes.width !== '100%') {
                                    return {
                                        width: attributes.width,
                                        style: `width: ${attributes.width}; height: ${attributes.height || 'auto'}; max-height: ${attributes.maxHeight || 'none'}; max-width: 100%;`
                                    }
                                }
                                return {
                                    style: `max-width: 100%; height: ${attributes.height || 'auto'}; max-height: ${attributes.maxHeight || 'none'};`
                                }
                            }
                        },
                        height: {
                            default: 'auto',
                            parseHTML: element => {
                                const height = element.getAttribute('height');
                                const styleHeight = element.style.height;
                                return height || styleHeight || 'auto';
                            },
                        },
                        maxHeight: {
                            default: 'none',
                            parseHTML: element => {
                                const style = element.style.maxHeight;
                                return style || 'none';
                            },
                            renderHTML: attributes => {
                                if (attributes.maxHeight && attributes.maxHeight !== 'none') {
                                    return {
                                        style: `max-height: ${attributes.maxHeight};`
                                    }
                                }
                                return {};
                            }
                        },
                        align: {
                            default: 'center',
                            parseHTML: element => element.getAttribute('data-align') || element.style.float || 'center',
                            renderHTML: attributes => {
                                let style = '';
                                if (attributes.align === 'left') {
                                    style = 'float: left; margin-right: 1.5rem; margin-left: 0; margin-top: 0.5rem; margin-bottom: 0.5rem;';
                                } else if (attributes.align === 'right') {
                                    style = 'float: right; margin-left: 1.5rem; margin-right: 0; margin-top: 0.5rem; margin-bottom: 0.5rem;';
                                } else if (attributes.align === 'center') {
                                    style = 'display: block; margin-left: auto; margin-right: auto; float: none; margin-top: 1rem; margin-bottom: 1rem;';
                                }
                                return {
                                    'data-align': attributes.align,
                                    style: style
                                };
                            }
                        },
                        class: {
                            default: 'editor-image',
                            parseHTML: element => element.getAttribute('class') || 'editor-image',
                        },
                        dataId: {
                            default: null,
                            parseHTML: element => element.getAttribute('data-id'),
                            renderHTML: attributes => {
                                if (attributes.dataId) {
                                    return {
                                        'data-id': attributes.dataId
                                    };
                                }
                                return {};
                            }
                        },
                        dataTemp: {
                            default: false,
                            parseHTML: element => element.getAttribute('data-temp') === 'true',
                            renderHTML: attributes => {
                                if (attributes.dataTemp) {
                                    return {
                                        'data-temp': 'true'
                                    };
                                }
                                return {};
                            }
                        }
                    }
                }
            }).configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'editor-image rounded-lg transition-all duration-200 cursor-move shadow-md',
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'prose-table min-w-full divide-y divide-gray-200 my-6',
                },
            }),
            TableRow,
            TableCell.configure({
                HTMLAttributes: {
                    class: 'px-4 py-3 border border-gray-200',
                },
            }),
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50 border border-gray-200',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
            TextStyle.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        fontSize: {
                            default: null,
                            parseHTML: element => element.style.fontSize,
                            renderHTML: attributes => {
                                if (!attributes.fontSize) {
                                    return {};
                                }
                                return {
                                    style: `font-size: ${attributes.fontSize}`,
                                };
                            },
                        },
                    };
                },
            }),
            Color,
            FontFamily,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            HorizontalRule,
            Underline,
        ],
        content: content || '<p>Start typing here...</p>',
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            if (newContent !== content) {
                onChange(newContent);
            }
        },
        onSelectionUpdate: ({ editor }) => {
            const selection = editor.state.selection;
            const node = editor.state.doc.nodeAt(selection.from);

            if (node && node.type.name === 'image') {
                setSelectedImageNode(node);
                setImageData({
                    url: node.attrs.src || '',
                    alt: node.attrs.alt || '',
                    title: node.attrs.title || '',
                    width: node.attrs.width || '100%',
                    height: node.attrs.height || 'auto',
                    maxHeight: node.attrs.maxHeight || 'none',
                    align: node.attrs.align || 'center',
                });
            } else {
                setSelectedImageNode(null);
            }
        },
        editorProps: {
            attributes: {
                // FIXED: Remove line breaks and extra spaces from class string
                class: `min-h-[400px] p-6 focus:outline-none prose prose-lg max-w-none ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap'} prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-700 dark:prose-em:text-gray-300 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-code:text-gray-800 dark:prose-code:text-gray-200 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-img:rounded-lg prose-img:shadow-md prose-table:divide-gray-200 dark:prose-table:divide-gray-700 prose-th:text-gray-700 dark:prose-th:text-gray-300 prose-td:text-gray-600 dark:prose-td:text-gray-400`,
            },
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '<p>Start typing here...</p>');
        }
    }, [editor, content]);

    const applyFontSize = (size) => {
        if (!editor) return;

        setFontSize(size);
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        } else {
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        }
    };

    const clearFontSize = () => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
            editor.chain().focus().unsetMark('textStyle', 'fontSize').run();
        } else {
            editor.chain().focus().unsetMark('textStyle', 'fontSize').run();
        }

        setFontSize("16px");
    };

    const toggleWordWrap = () => {
        setWordWrap(!wordWrap);
        toast({
            title: !wordWrap ? "Word Wrap Enabled" : "Word Wrap Disabled",
            description: !wordWrap ? "Text will now wrap to next line" : "Text will now stay on one line",
            variant: "default",
        });
    };

    // UPDATED: Handle image upload with Cloudinary - Only upload once
    const handleImageUpload = async (file) => {
        if (!file) return;

        setImageUploading(true);
        try {
            // Create temporary preview URL
            const tempUrl = URL.createObjectURL(file);
            setTempImageUrl(tempUrl);

            // Insert temporary placeholder image
            editor.chain().focus().setImage({
                src: tempUrl,
                alt: file.name,
                title: file.name,
                width: imageData.width,
                height: imageData.height,
                align: imageData.align,
                class: 'editor-image uploading',
                dataTemp: true // Mark as temporary
            }).run();

            // Upload to Cloudinary
            console.log("📤 Uploading image to Cloudinary...");
            const cloudinaryUrl = await uploadToCloudinary(file);
            console.log("✅ Cloudinary URL:", cloudinaryUrl);

            // Store the Cloudinary URL
            const imageId = Date.now().toString();
            setUploadedImages(prev => ({
                ...prev,
                [imageId]: {
                    url: cloudinaryUrl,
                    fileName: file.name
                }
            }));

            // Find and update all temporary images with this file name to use Cloudinary URL
            if (editor) {
                const { tr } = editor.state;
                let foundTemp = false;

                // Find and update all nodes in the document
                editor.state.doc.descendants((node, pos) => {
                    if (node.type.name === 'image' &&
                        node.attrs.src === tempUrl &&
                        node.attrs.dataTemp === true) {

                        tr.setNodeMarkup(pos, null, {
                            ...node.attrs,
                            src: cloudinaryUrl,
                            dataTemp: false,
                            dataId: imageId
                        });
                        foundTemp = true;
                    }
                });

                if (foundTemp) {
                    editor.view.dispatch(tr);
                }
            }

            // Update image data with Cloudinary URL
            setImageData({
                ...imageData,
                url: cloudinaryUrl,
                alt: imageData.alt || file.name,
                title: imageData.title || file.name,
            });

            toast({
                title: "Success",
                description: "Image uploaded to Cloudinary successfully",
                variant: "default",
            });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({
                title: "Error",
                description: "Failed to upload image to Cloudinary",
                variant: "destructive",
            });

            // Remove temporary image if upload failed
            if (editor) {
                editor.chain().focus().deleteSelection().run();
            }
        } finally {
            setImageUploading(false);
            setShowImageUpload(false);
            // Clean up temporary URL after a delay
            setTimeout(() => {
                if (tempImageUrl) {
                    URL.revokeObjectURL(tempImageUrl);
                    setTempImageUrl(null);
                }
            }, 1000);
        }
    };

    // UPDATED: Update selected image - Don't re-upload, just update properties
    const updateSelectedImage = (updates) => {
        if (!selectedImageNode || !editor) return;

        // Get the current image ID if it exists
        const imageId = selectedImageNode.attrs.dataId;

        // Only update attributes, preserve the existing src
        const newAttrs = {
            ...selectedImageNode.attrs,
            ...updates
        };

        // If we have an image ID and it exists in uploadedImages, preserve the Cloudinary URL
        if (imageId && uploadedImages[imageId]) {
            newAttrs.src = uploadedImages[imageId].url;
        }

        editor.chain().focus().updateAttributes('image', newAttrs).run();

        setImageData(prev => ({ ...prev, ...updates }));

        toast({
            title: "Updated",
            description: "Image properties updated",
            variant: "default",
        });
    };

    // UPDATED: Insert image from URL (could be Cloudinary URL)
    const handleInsertImageFromUrl = () => {
        if (!imageData.url) {
            toast({
                title: "Error",
                description: "Please enter an image URL",
                variant: "destructive",
            });
            return;
        }

        // Generate a unique ID for this image
        const imageId = Date.now().toString();

        // If it looks like a Cloudinary URL, store it
        if (imageData.url.includes('cloudinary.com')) {
            setUploadedImages(prev => ({
                ...prev,
                [imageId]: {
                    url: imageData.url,
                    fileName: imageData.alt || 'uploaded-image'
                }
            }));
        }

        editor.chain().focus().setImage({
            src: imageData.url,
            alt: imageData.alt || "Image",
            title: imageData.title || "",
            width: imageData.width,
            height: imageData.height,
            align: imageData.align,
            class: 'editor-image',
            dataId: imageId,
            dataTemp: false
        }).run();

        toast({
            title: "Success",
            description: "Image inserted successfully",
            variant: "default",
        });

        setShowImageUpload(false);
        setImageData({
            url: "",
            alt: "",
            title: "",
            width: "100%",
            height: "auto",
            align: "center",
        });
    };

    const centerImage = () => {
        updateSelectedImage({ align: 'center' });
    };

    const alignImageLeft = () => {
        updateSelectedImage({ align: 'left' });
    };

    const alignImageRight = () => {
        updateSelectedImage({ align: 'right' });
    };

    const resizeImage = (width, height = "auto") => {
        updateSelectedImage({ width, height });
    };

    const setMaxHeight = (maxHeight) => {
        updateSelectedImage({ maxHeight });
    };

    const resetImageSize = () => {
        updateSelectedImage({
            width: "100%",
            height: "auto",
            maxHeight: "none"
        });
    };

    const insertTable = (rows, cols, hasHeader = true) => {
        editor.chain().focus().insertTable({
            rows,
            cols,
            withHeaderRow: hasHeader
        }).run();
    };

    const addRow = (position = 'below') => {
        if (position === 'above') {
            editor.chain().focus().addRowBefore().run();
        } else {
            editor.chain().focus().addRowAfter().run();
        }
    };

    const addColumn = (position = 'right') => {
        if (position === 'left') {
            editor.chain().focus().addColumnBefore().run();
        } else {
            editor.chain().focus().addColumnAfter().run();
        }
    };

    const deleteRow = () => {
        editor.chain().focus().deleteRow().run();
    };

    const deleteColumn = () => {
        editor.chain().focus().deleteColumn().run();
    };

    const mergeCells = () => {
        editor.chain().focus().mergeCells().run();
    };

    const splitCell = () => {
        editor.chain().focus().splitCell().run();
    };

    const handleInsertLink = () => {
        if (!currentLink.url) {
            toast({
                title: "Error",
                description: "Please enter a URL",
                variant: "destructive",
            });
            return;
        }

        if (editor) {
            if (currentLink.text) {
                editor.chain().focus().insertContent(`<a href="${currentLink.url}" target="_blank" rel="noopener noreferrer">${currentLink.text}</a>`).run();
            } else {
                const selectedText = editor.state.selection.content().content.firstChild?.text || 'Link';
                editor.chain().focus().setLink({
                    href: currentLink.url,
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }).run();
            }

            toast({
                title: "Success",
                description: "Link inserted successfully",
                variant: "default",
            });

            setCurrentLink({ url: "", text: "" });
            setShowLinkModal(false);
        }
    };

    const handleRemoveLink = () => {
        if (editor) {
            editor.chain().focus().unsetLink().run();
            toast({
                title: "Success",
                description: "Link removed",
                variant: "default",
            });
        }
    };

    const clearContent = () => {
        if (window.confirm("Are you sure you want to clear all content?")) {
            editor.chain().focus().clearContent().run();
            // Also clear uploaded images tracking
            setUploadedImages({});
            toast({
                title: "Cleared",
                description: "Content cleared",
                variant: "default",
            });
        }
    };

    const handleSave = () => {
        if (editor) {
            const finalContent = editor.getHTML();
            console.log("💾 Saving content from RTE:", finalContent);
            console.log("📁 Uploaded images:", uploadedImages);
            onChange(finalContent);
            toast({
                title: "Saved",
                description: "Content saved successfully",
                variant: "default",
            });
            onClose();
        }
    };

    const handlePrevious = () => {
        if (navigation?.onPrevious) {
            navigation.onPrevious();
        }
    };

    const handleNext = () => {
        if (navigation?.onNext) {
            navigation.onNext();
        }
    };

    // Add global styles
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .tiptap {
                ${wordWrap ? 'word-wrap: break-word; white-space: pre-wrap;' : 'white-space: nowrap;'}
                line-height: 1.75;
                font-size: 16px;
                color: #374151;
            }
            
            .tiptap.dark {
                color: #d1d5db;
            }
            
            .tiptap span[style*="font-size"] {
                display: inline;
            }
            
            .tiptap img.editor-image {
                max-width: 100%;
                height: auto;
                border-radius: 0.75rem;
                margin: 1.5rem 0;
                transition: all 0.3s ease;
                cursor: move;
                object-fit: contain;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            
            .tiptap img.editor-image:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            
            .tiptap img.editor-image.uploading {
                opacity: 0.7;
                position: relative;
            }
            
            .tiptap img.editor-image.uploading::after {
                content: "Uploading...";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .tiptap img.editor-image[data-align="left"] {
                float: left;
                margin-right: 2rem;
                margin-left: 0;
                margin-top: 0.75rem;
                margin-bottom: 0.75rem;
            }
            
            .tiptap img.editor-image[data-align="right"] {
                float: right;
                margin-left: 2rem;
                margin-right: 0;
                margin-top: 0.75rem;
                margin-bottom: 0.75rem;
            }
            
            .tiptap img.editor-image[data-align="center"] {
                display: block;
                margin-left: auto;
                margin-right: auto;
                float: none;
                margin-top: 1.5rem;
                margin-bottom: 1.5rem;
            }
            
            .tiptap img.ProseMirror-selectednode {
                outline: 3px solid #3b82f6;
                box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.1);
                border-radius: 0.75rem;
            }
            
            .tiptap table {
                border-collapse: collapse;
                margin: 2rem 0;
                overflow: hidden;
                table-layout: auto;
                width: 100%;
                border-radius: 0.5rem;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            }
            
            .tiptap td,
            .tiptap th {
                border: 1px solid #e5e7eb;
                padding: 0.75rem 1rem;
                position: relative;
                vertical-align: top;
            }
            
            .tiptap th {
                background-color: #f9fafb;
                font-weight: 600;
                color: #374151;
                text-align: left;
            }
            
            .tiptap .selectedCell:after {
                background: rgba(59, 130, 246, 0.1);
                content: "";
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                pointer-events: none;
                position: absolute;
                z-index: 2;
            }
            
            .tiptap .column-resize-handle {
                background-color: #3b82f6;
                bottom: -2px;
                pointer-events: none;
                position: absolute;
                right: -2px;
                top: 0;
                width: 4px;
                border-radius: 2px;
            }
            
            .tiptap p {
                margin-bottom: 1.25rem;
                line-height: 1.75;
            }
            
            .tiptap p:last-child {
                margin-bottom: 0;
            }
            
            .tiptap ul, .tiptap ol {
                margin: 1.25rem 0;
                padding-left: 1.5rem;
            }
            
            .tiptap ul {
                list-style-type: disc;
            }
            
            .tiptap ol {
                list-style-type: decimal;
            }
            
            .tiptap li {
                margin: 0.5rem 0;
                line-height: 1.75;
            }
            
            .tiptap li > p {
                margin: 0;
            }
            
            .tiptap a {
                color: #2563eb;
                text-decoration: underline;
                cursor: pointer;
                transition: color 0.2s ease;
                font-weight: 500;
            }
            
            .tiptap a:hover {
                color: #1d4ed8;
                text-decoration: none;
            }
            
            .tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5, .tiptap h6 {
                margin-top: 2rem;
                margin-bottom: 1rem;
                font-weight: 700;
                line-height: 1.25;
                color: #111827;
            }
            
            .tiptap.dark h1, .tiptap.dark h2, .tiptap.dark h3, 
            .tiptap.dark h4, .tiptap.dark h5, .tiptap.dark h6 {
                color: #f9fafb;
            }
            
            .tiptap h1 { 
                font-size: 2.25rem;
                letter-spacing: -0.025em;
            }
            
            .tiptap h2 { 
                font-size: 1.875rem;
                letter-spacing: -0.025em;
            }
            
            .tiptap h3 { 
                font-size: 1.5rem;
                letter-spacing: -0.025em;
            }
            
            .tiptap h4 { 
                font-size: 1.25rem;
                font-weight: 600;
            }
            
            .tiptap h5 { 
                font-size: 1.125rem;
                font-weight: 600;
            }
            
            .tiptap h6 { 
                font-size: 1rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .tiptap blockquote {
                border-left: 4px solid #d1d5db;
                padding-left: 1.5rem;
                margin: 1.5rem 0;
                font-style: italic;
                color: #6b7280;
            }
            
            .tiptap blockquote p {
                margin: 0.5rem 0;
            }
            
            .tiptap code {
                background-color: #f3f4f6;
                padding: 0.25rem 0.5rem;
                border-radius: 0.375rem;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 0.875em;
            }
            
            .tiptap pre {
                background-color: #1f2937;
                color: #f9fafb;
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin: 1.5rem 0;
            }
            
            .tiptap pre code {
                background-color: transparent;
                padding: 0;
                color: inherit;
                font-size: 0.875em;
            }
            
            .tiptap hr {
                border: none;
                border-top: 2px solid #e5e7eb;
                margin: 2rem 0;
            }
            
            .tiptap strong {
                font-weight: 700;
                color: #111827;
            }
            
            .tiptap em {
                font-style: italic;
            }
            
            .tiptap u {
                text-decoration: underline;
            }
            
            .whitespace-nowrap {
                overflow-x: auto;
            }
            
            .tiptap .is-empty::before {
                content: attr(data-placeholder);
                float: left;
                color: #9ca3af;
                pointer-events: none;
                height: 0;
                font-style: italic;
            }
            
            /* Custom text colors */
            .tiptap .text-red { color: #dc2626; }
            .tiptap .text-blue { color: #2563eb; }
            .tiptap .text-green { color: #059669; }
            .tiptap .text-yellow { color: #d97706; }
            .tiptap .text-purple { color: #7c3aed; }
            .tiptap .text-pink { color: #db2777; }
            .tiptap .text-indigo { color: #4f46e5; }
            .tiptap .text-teal { color: #0d9488; }
            .tiptap .text-orange { color: #ea580c; }
            
            /* Custom backgrounds */
            .tiptap .bg-highlight {
                background-color: #fef3c7;
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
            }
            
            .tiptap .bg-blue-light {
                background-color: #dbeafe;
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
            }
            
            .tiptap .bg-green-light {
                background-color: #d1fae5;
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, [wordWrap]);

    if (!editor) {
        return <div className="flex items-center justify-center h-64 text-gray-500">Loading editor...</div>;
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`fixed inset-0 z-[60] bg-background ${fullscreen ? '' : 'flex items-center justify-center p-4'}`}
            >
                <div className={`${fullscreen ? 'h-full' : 'w-full max-w-6xl max-h-[90vh]'} flex flex-col bg-card rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800`}>
                    <Toolbar
                        editor={editor}
                        fullscreen={fullscreen}
                        fontSize={fontSize}
                        wordWrap={wordWrap}
                        selectedImageNode={selectedImageNode}
                        onToggleFullscreen={() => setFullscreen(!fullscreen)}
                        onShowImageUpload={() => setShowImageUpload(true)}
                        onShowTableModal={() => setShowTableModal(true)}
                        onShowLinkModal={() => {
                            const selectedText = editor.state.selection.content().content.firstChild?.text || '';
                            setCurrentLink(prev => ({ ...prev, text: selectedText }));
                            setShowLinkModal(true);
                        }}
                        onShowImageSettings={() => setShowImageSettings(true)}
                        onRemoveLink={handleRemoveLink}
                        onClearContent={clearContent}
                        onClose={onClose}
                        onSave={handleSave}
                        onToggleWordWrap={toggleWordWrap}
                        onApplyFontSize={applyFontSize}
                        onClearFontSize={clearFontSize}
                        onCenterImage={centerImage}
                        onAlignImageLeft={alignImageLeft}
                        onAlignImageRight={alignImageRight}
                        onResizeImage={resizeImage}
                        onResetImageSize={resetImageSize}
                    />

                    <div className="flex-1 overflow-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <EditorContent editor={editor} />
                    </div>

                    {showNavigation && navigation && (
                        <NavigationBar
                            current={navigation.current}
                            previous={navigation.previous}
                            next={navigation.next}
                            onPrevious={handlePrevious}
                            onNext={handleNext}
                            isFirst={navigation.isFirst}
                            isLast={navigation.isLast}
                        />
                    )}
                </div>
            </motion.div>

            <ImageUploadModal
                show={showImageUpload}
                onClose={() => setShowImageUpload(false)}
                onUpload={handleImageUpload}
                uploading={imageUploading}
                fileInputRef={fileInputRef}
                imageData={imageData}
                onImageDataChange={setImageData}
                onInsert={handleInsertImageFromUrl}
            />

            <ImageSettingsModal
                show={showImageSettings}
                onClose={() => setShowImageSettings(false)}
                imageData={imageData}
                onImageDataChange={updateSelectedImage}
                selectedImageNode={selectedImageNode}
                onCenterImage={centerImage}
                onAlignImageLeft={alignImageLeft}
                onAlignImageRight={alignImageRight}
                onResizeImage={resizeImage}
                onSetMaxHeight={setMaxHeight}
                onResetImageSize={resetImageSize}
            />

            <TableModal
                show={showTableModal}
                onClose={() => setShowTableModal(false)}
                onInsert={insertTable}
                onAddRow={addRow}
                onAddColumn={addColumn}
                onDeleteRow={deleteRow}
                onDeleteColumn={deleteColumn}
                onMergeCells={mergeCells}
                onSplitCell={splitCell}
                editor={editor}
            />

            <LinkModal
                show={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                link={currentLink}
                onLinkChange={setCurrentLink}
                onInsert={handleInsertLink}
                editor={editor}
            />
        </>
    );
}

// Main Toolbar Component
function Toolbar({
    editor,
    fullscreen,
    fontSize,
    wordWrap,
    selectedImageNode,
    onToggleFullscreen,
    onShowImageUpload,
    onShowTableModal,
    onShowLinkModal,
    onShowImageSettings,
    onRemoveLink,
    onClearContent,
    onClose,
    onSave,
    onToggleWordWrap,
    onApplyFontSize,
    onClearFontSize,
    onCenterImage,
    onAlignImageLeft,
    onAlignImageRight,
    onResizeImage,
    onResetImageSize
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <Undo2 size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <Redo2 size={16} />
                </Button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleWordWrap}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${wordWrap ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                    title={wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                >
                    <WrapText size={16} />
                </Button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <TypeIcon size={16} />
                            <span className="text-xs font-medium">{fontSize.replace('px', '')}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 items-center gap-3">
                                <Label htmlFor="font-size" className="text-sm font-medium">Font Size</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="font-size"
                                        type="text"
                                        value={fontSize}
                                        onChange={(e) => onApplyFontSize(e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="16px"
                                    />
                                    <span className="text-xs text-gray-500">px</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[12, 14, 16, 18].map((size) => (
                                    <Button
                                        key={size}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onApplyFontSize(`${size}px`)}
                                        className={`text-xs ${fontSize === `${size}px` ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                                    >
                                        {size}
                                    </Button>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[20, 24, 28, 32].map((size) => (
                                    <Button
                                        key={size}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onApplyFontSize(`${size}px`)}
                                        className={`text-xs ${fontSize === `${size}px` ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                                    >
                                        {size}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onApplyFontSize('16px')}
                                    className="flex-1 text-xs border-gray-300 dark:border-gray-600"
                                >
                                    Reset Default
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onClearFontSize}
                                    className="flex-1 text-xs border-gray-300 dark:border-gray-600"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <Select
                    value={editor.getAttributes('heading')?.level?.toString() || 'p'}
                    onValueChange={(value) => {
                        if (value === 'p') {
                            editor.chain().focus().setParagraph().run();
                        } else {
                            editor.chain().focus().toggleHeading({ level: parseInt(value) }).run();
                        }
                    }}
                >
                    <SelectTrigger className="w-28 h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectItem value="p" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Normal</SelectItem>
                        <SelectItem value="1" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <div className="flex items-center gap-2">
                                <Heading1 size={14} />
                                <span className="font-bold">Heading 1</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="2" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <div className="flex items-center gap-2">
                                <Heading2 size={14} />
                                <span className="font-bold">Heading 2</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="3" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <div className="flex items-center gap-2">
                                <Heading3 size={14} />
                                <span className="font-bold">Heading 3</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="4" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Heading 4</SelectItem>
                        <SelectItem value="5" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Heading 5</SelectItem>
                        <SelectItem value="6" className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Heading 6</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={editor.getAttributes('textStyle')?.fontFamily || 'inherit'}
                    onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
                >
                    <SelectTrigger className="w-36 h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-64">
                        {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value} className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <span style={{ fontFamily: font.value }}>{font.name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <Bold size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <Italic size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('underline') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <UnderlineIcon size={16} />
                </Button>

                <ColorPicker editor={editor} />

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <AlignLeft size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <AlignCenter size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <AlignRight size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <AlignJustify size={16} />
                </Button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bulletList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <List size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('orderedList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <ListOrdered size={16} />
                </Button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <MinusSquare size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onShowLinkModal}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('link') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <LinkIcon size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onShowImageUpload}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    <ImageIcon size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onShowTableModal}
                    className={`hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('table') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
                >
                    <TableIcon size={16} />
                </Button>

                {selectedImageNode && (
                    <>
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onShowImageSettings}
                            title="Image Settings"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <Settings size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onCenterImage}
                            title="Center Image"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <AlignCenter size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onAlignImageLeft}
                            title="Align Image Left"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <AlignLeft size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onAlignImageRight}
                            title="Align Image Right"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <AlignRight size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onResizeImage("50%")}
                            title="Resize to 50%"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <ZoomOut size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onResizeImage("100%")}
                            title="Resize to 100%"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <ZoomIn size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onResetImageSize}
                            title="Reset Image Size"
                            className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <RotateCw size={16} />
                        </Button>
                    </>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearContent}
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                    <Trash2 size={16} />
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleFullscreen}
                    className="hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    size="sm"
                    onClick={onSave}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                >
                    <Save size={16} className="mr-2" />
                    Save
                </Button>
            </div>
        </div>
    );
}

// Color Picker Component
function ColorPicker({ editor }) {
    const [showPicker, setShowPicker] = useState(false);
    const currentColor = editor.getAttributes('textStyle').color || '#000000';

    return (
        <div className="relative">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPicker(!showPicker)}
                style={{ color: currentColor }}
                className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
                <Palette size={16} />
            </Button>

            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 w-56"
                    >
                        <div className="grid grid-cols-6 gap-2 mb-3">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        editor.chain().focus().setColor(color).run();
                                        setShowPicker(false);
                                    }}
                                    title={color}
                                />
                            ))}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Custom Color</Label>
                            <Input
                                type="color"
                                value={currentColor}
                                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                                className="w-full h-8"
                            />
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    editor.chain().focus().unsetColor().run();
                                    setShowPicker(false);
                                }}
                                className="w-full text-xs"
                            >
                                Reset to Default
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Image Upload Modal with Cloudinary support
function ImageUploadModal({
    show,
    onClose,
    onUpload,
    uploading,
    fileInputRef,
    imageData,
    onImageDataChange,
    onInsert
}) {
    if (!show) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Set filename as default alt text
            onImageDataChange({ ...imageData, alt: file.name, title: file.name });
            onUpload(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            onImageDataChange({ ...imageData, alt: file.name, title: file.name });
            onUpload(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Insert Image</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Upload to Cloudinary or insert from URL
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
                        <TabsTrigger value="upload" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">Upload</TabsTrigger>
                        <TabsTrigger value="url" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">From URL</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4 mt-4">
                        <div
                            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <Upload className="mx-auto h-14 w-14 text-gray-400 dark:text-gray-500 mb-3" />
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Drag & drop or click to upload
                            </p>
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading to Cloudinary...
                                    </>
                                ) : "Select Image"}
                            </Button>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                                Images will be uploaded to Cloudinary
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                Supported formats: JPG, PNG, GIF, WebP, SVG
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="url" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="image-url" className="text-sm font-medium">Image URL</Label>
                            <Input
                                id="image-url"
                                placeholder="https://res.cloudinary.com/... or any image URL"
                                value={imageData.url}
                                onChange={(e) => onImageDataChange({ ...imageData, url: e.target.value })}
                                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                Enter a Cloudinary URL or any public image URL
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="alt-text" className="text-sm font-medium">Alt Text</Label>
                            <Input
                                id="alt-text"
                                placeholder="Description for accessibility"
                                value={imageData.alt}
                                onChange={(e) => onImageDataChange({ ...imageData, alt: e.target.value })}
                                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                Important for screen readers and SEO
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title-text" className="text-sm font-medium">Title (Optional)</Label>
                            <Input
                                id="title-text"
                                placeholder="Image title"
                                value={imageData.title}
                                onChange={(e) => onImageDataChange({ ...imageData, title: e.target.value })}
                                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="image-width" className="text-sm font-medium">Width</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="image-width"
                                        placeholder="e.g., 300px or 50%"
                                        value={imageData.width}
                                        onChange={(e) => onImageDataChange({ ...imageData, width: e.target.value })}
                                        className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image-height" className="text-sm font-medium">Height</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="image-height"
                                        placeholder="e.g., 200px or auto"
                                        value={imageData.height}
                                        onChange={(e) => onImageDataChange({ ...imageData, height: e.target.value })}
                                        className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image-align" className="text-sm font-medium">Alignment</Label>
                            <Select
                                value={imageData.align}
                                onValueChange={(value) => onImageDataChange({ ...imageData, align: value })}
                            >
                                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                                    <SelectValue placeholder="Alignment" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <SelectItem value="left" className="hover:bg-gray-100 dark:hover:bg-gray-700">Left</SelectItem>
                                    <SelectItem value="center" className="hover:bg-gray-100 dark:hover:bg-gray-700">Center</SelectItem>
                                    <SelectItem value="right" className="hover:bg-gray-100 dark:hover:bg-gray-700">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {imageData.url && (
                            <div className="mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Preview:</div>
                                <img
                                    src={imageData.url}
                                    alt="Preview"
                                    className={`mx-auto rounded-lg ${imageData.align === 'left' ? 'float-left mr-4' : imageData.align === 'right' ? 'float-right ml-4' : 'mx-auto'}`}
                                    style={{
                                        width: imageData.width,
                                        height: imageData.height,
                                        maxWidth: '100%'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const errorDiv = document.createElement('div');
                                        errorDiv.className = 'text-sm text-red-600 text-center mt-2';
                                        errorDiv.textContent = 'Failed to load image preview';
                                        e.target.parentNode.appendChild(errorDiv);
                                    }}
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={uploading}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onInsert}
                        disabled={!imageData.url || uploading}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                    >
                        Insert Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Image Settings Modal
function ImageSettingsModal({
    show,
    onClose,
    imageData,
    onImageDataChange,
    selectedImageNode,
    onCenterImage,
    onAlignImageLeft,
    onAlignImageRight,
    onResizeImage,
    onSetMaxHeight,
    onResetImageSize
}) {
    if (!show || !selectedImageNode) return null;

    const getSizeText = (size) => {
        if (size === 'auto') return 'auto';
        if (size.includes('%')) return size;
        if (size.includes('px')) return size;
        return size;
    };

    return (
        <Dialog open={show} onOpenChange={onClose} className="max-h-[50vh] overflow-y-auto">
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Image Settings</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Adjust the properties of the selected image
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium">Alignment</Label>
                        <div className="flex gap-2 mt-2">
                            <Button
                                type="button"
                                variant={imageData.align === 'left' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onImageDataChange({ align: 'left' })}
                                className="flex-1 border-gray-300 dark:border-gray-600"
                            >
                                <AlignLeft size={16} className="mr-2" />
                                Left
                            </Button>
                            <Button
                                type="button"
                                variant={imageData.align === 'center' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onImageDataChange({ align: 'center' })}
                                className="flex-1 border-gray-300 dark:border-gray-600"
                            >
                                <AlignCenter size={16} className="mr-2" />
                                Center
                            </Button>
                            <Button
                                type="button"
                                variant={imageData.align === 'right' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onImageDataChange({ align: 'right' })}
                                className="flex-1 border-gray-300 dark:border-gray-600"
                            >
                                <AlignRight size={16} className="mr-2" />
                                Right
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Quick Sizes</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            {QUICK_SIZES.slice(0, 4).map((size) => (
                                <Button
                                    key={size.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onImageDataChange({ width: size.width, height: size.height })}
                                    className={`border-gray-300 dark:border-gray-600 ${imageData.width === size.width && imageData.height === size.height ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : ''}`}
                                >
                                    {size.label}
                                </Button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {QUICK_SIZES.slice(4).map((size) => (
                                <Button
                                    key={size.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onImageDataChange({ width: size.width, height: size.height })}
                                    className={`border-gray-300 dark:border-gray-600 ${imageData.width === size.width && imageData.height === size.height ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : ''}`}
                                >
                                    {size.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="custom-width" className="text-sm font-medium">Width</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-width"
                                    placeholder="e.g., 300px or 50%"
                                    value={imageData.width}
                                    onChange={(e) => onImageDataChange({ width: e.target.value })}
                                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="custom-height" className="text-sm font-medium">Height</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-height"
                                    placeholder="e.g., 200px or auto"
                                    value={imageData.height}
                                    onChange={(e) => onImageDataChange({ height: e.target.value })}
                                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Quick Actions</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onResetImageSize}
                                className="flex-1 border-gray-300 dark:border-gray-600"
                            >
                                <RotateCw size={16} className="mr-2" />
                                Reset All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onImageDataChange({ width: "100%", height: "auto", maxHeight: "none" })}
                                className="flex-1 border-gray-300 dark:border-gray-600"
                            >
                                <Maximize size={16} className="mr-2" />
                                Full Width
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Preview</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                            Image will appear as: {getSizeText(imageData.width)} × {getSizeText(imageData.height)}
                            {(imageData.maxHeight && imageData.maxHeight !== 'none') && ` (max height: ${imageData.maxHeight})`}
                        </div>
                        <div className="border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-900 min-h-[120px] flex items-center justify-center">
                            <div className={`inline-block ${imageData.align === 'left' ? 'float-left mr-4' : imageData.align === 'right' ? 'float-right ml-4' : 'mx-auto'}`}>
                                <div
                                    className="bg-blue-100 dark:bg-blue-900/30 rounded border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center overflow-hidden"
                                    style={{
                                        width: '200px',
                                        height: '150px',
                                        maxHeight: imageData.maxHeight && imageData.maxHeight !== 'none' ? '120px' : '150px',
                                        maxWidth: '100%'
                                    }}
                                >
                                    <div className="text-xs text-blue-600 dark:text-blue-400 text-center p-2">
                                        <div>Image Preview</div>
                                        <div className="text-[10px] mt-1">
                                            {getSizeText(imageData.width)} × {getSizeText(imageData.height)}
                                        </div>
                                        {imageData.maxHeight && imageData.maxHeight !== 'none' && (
                                            <div className="text-[10px]">
                                                Max: {imageData.maxHeight}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                    >
                        Apply Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Link Modal Component
function LinkModal({ show, onClose, link, onLinkChange, onInsert, editor }) {
    if (!show) return null;

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Insert Link</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Add a link to your content
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="link-text" className="text-sm font-medium">Link Text</Label>
                        <Input
                            id="link-text"
                            placeholder="Click here"
                            value={link.text}
                            onChange={(e) => onLinkChange({ ...link, text: e.target.value })}
                            className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            Text that will be displayed as the link
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link-url" className="text-sm font-medium">URL</Label>
                        <Input
                            id="link-url"
                            placeholder="https://example.com"
                            value={link.url}
                            onChange={(e) => onLinkChange({ ...link, url: e.target.value })}
                            className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            The web address the link will point to
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 dark:border-gray-600"
                                defaultChecked
                            />
                            Open in new tab
                        </Label>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onInsert}
                        disabled={!link.url}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                    >
                        Insert Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Navigation Bar Component
function NavigationBar({
    current,
    previous,
    next,
    onPrevious,
    onNext,
    isFirst,
    isLast
}) {
    return (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex-1">
                {previous && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onPrevious}
                        disabled={isFirst}
                        className="gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft size={16} />
                        <div className="text-left">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Previous</div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{previous.title}</div>
                        </div>
                    </Button>
                )}
            </div>

            <div className="px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {current?.title || "Current Content"}
            </div>

            <div className="flex-1 flex justify-end">
                {next && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onNext}
                        disabled={isLast}
                        className="gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Next</div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{next.title}</div>
                        </div>
                        <ArrowRight size={16} />
                    </Button>
                )}
            </div>
        </div>
    );
}