import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';

interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
  resizable: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: string; height?: string }) => ReturnType;
    };
  }
}

const ResizableImageComponent = ({ node, updateAttributes }: any) => {
  const { src, alt, title, width, height } = node.attrs;

  const handleResize = (event: React.MouseEvent<HTMLDivElement>, edge: string) => {
    event.preventDefault();
    
    const container = event.currentTarget.parentElement;
    const image = container?.querySelector('img');
    if (!image || !container) return;

    const startX = event.pageX;
    const startY = event.pageY;
    const startWidth = container.offsetWidth;
    const startHeight = container.offsetHeight;
    const containerLeft = container.getBoundingClientRect().left;
    const containerTop = container.getBoundingClientRect().top;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let maintainAspectRatio = e.shiftKey;
      const aspectRatio = startWidth / startHeight;

      // Handle horizontal resizing
      if (edge.includes('right')) {
        newWidth = startWidth + (e.pageX - startX);
      } else if (edge.includes('left')) {
        newWidth = startWidth - (e.pageX - startX);
      }

      // Handle vertical resizing
      if (edge.includes('bottom')) {
        newHeight = startHeight + (e.pageY - startY);
      } else if (edge.includes('top')) {
        newHeight = startHeight - (e.pageY - startY);
      }

      // Maintain aspect ratio if shift is held
      if (maintainAspectRatio) {
        if (edge.includes('left') || edge.includes('right')) {
          newHeight = newWidth / aspectRatio;
        } else if (edge.includes('top') || edge.includes('bottom')) {
          newWidth = newHeight * aspectRatio;
        }
      }

      // Enforce minimum size
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(50, newHeight);

      // Update the image attributes
      updateAttributes({
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className="relative inline-block group" 
      style={{ 
        width, 
        height,
        display: 'inline-flex',
        alignItems: 'center',
        margin: '0 4px'
      }}
    >
      <img
        src={src}
        alt={alt}
        title={title}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          verticalAlign: 'middle'
        }}
        className="rounded-lg"
      />
      
      {/* Corner handles */}
      <div className="absolute w-3 h-3 bg-white border border-gray-400 rounded-full opacity-0 group-hover:opacity-100 cursor-se-resize right-0 bottom-0 z-10"
           onMouseDown={(e) => handleResize(e, 'right-bottom')} />
      <div className="absolute w-3 h-3 bg-white border border-gray-400 rounded-full opacity-0 group-hover:opacity-100 cursor-sw-resize left-0 bottom-0 z-10"
           onMouseDown={(e) => handleResize(e, 'left-bottom')} />
      <div className="absolute w-3 h-3 bg-white border border-gray-400 rounded-full opacity-0 group-hover:opacity-100 cursor-ne-resize right-0 top-0 z-10"
           onMouseDown={(e) => handleResize(e, 'right-top')} />
      <div className="absolute w-3 h-3 bg-white border border-gray-400 rounded-full opacity-0 group-hover:opacity-100 cursor-nw-resize left-0 top-0 z-10"
           onMouseDown={(e) => handleResize(e, 'left-top')} />

      {/* Edge handles */}
      <div className="absolute h-3 w-1 bg-white border border-gray-400 opacity-0 group-hover:opacity-100 cursor-ew-resize left-0 top-1/2 -translate-y-1/2 z-10"
           onMouseDown={(e) => handleResize(e, 'left')} />
      <div className="absolute h-3 w-1 bg-white border border-gray-400 opacity-0 group-hover:opacity-100 cursor-ew-resize right-0 top-1/2 -translate-y-1/2 z-10"
           onMouseDown={(e) => handleResize(e, 'right')} />
      <div className="absolute w-3 h-1 bg-white border border-gray-400 opacity-0 group-hover:opacity-100 cursor-ns-resize top-0 left-1/2 -translate-x-1/2 z-10"
           onMouseDown={(e) => handleResize(e, 'top')} />
      <div className="absolute w-3 h-1 bg-white border border-gray-400 opacity-0 group-hover:opacity-100 cursor-ns-resize bottom-0 left-1/2 -translate-x-1/2 z-10"
           onMouseDown={(e) => handleResize(e, 'bottom')} />
    </div>
  );
};

export const ResizableImage = Node.create<ImageOptions>({
  name: 'resizableImage',

  addOptions() {
    return {
      inline: true, // Changed to true to allow text wrapping
      allowBase64: true,
      HTMLAttributes: {},
      resizable: true,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: '300px', // Default width
      },
      height: {
        default: 'auto',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom as HTMLElement;
          
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.style.width || '300px',
            height: element.style.height || 'auto',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default ResizableImage;
