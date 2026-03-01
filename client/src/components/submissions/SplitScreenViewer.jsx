import { useState } from "react";
import { ArrowLeftRight, X, Maximize2, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function DocumentPanel({ url, label }) {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 text-muted-foreground">
        <p className="text-sm">No document selected</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:brightness-[0.95]">
      <iframe
        src={url}
        title={label}
        className="w-full h-full"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

export default function SplitScreenViewer({
  leftUrl,
  rightUrl,
  leftLabel = "Document A",
  rightLabel = "Document B",
  onClose,
}) {
  const [swapped, setSwapped] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState(null); // null = split, "left" | "right"

  const docA = swapped ? { url: rightUrl, label: rightLabel } : { url: leftUrl, label: leftLabel };
  const docB = swapped ? { url: leftUrl, label: leftLabel } : { url: rightUrl, label: rightLabel };

  const bothEmpty = !leftUrl && !rightUrl;

  if (bothEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] rounded-lg border bg-card text-card-foreground">
        <Columns2 className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">
          Select two documents to compare side-by-side.
        </p>
      </div>
    );
  }

  const isSplit = focusedPanel === null;

  const toggleFocus = (panel) => {
    setFocusedPanel((prev) => (prev === panel ? null : panel));
  };

  const renderPanel = (doc, side) => {
    const isVisible = isSplit || focusedPanel === side;
    if (!isVisible) return null;

    return (
      <div
        className={`flex flex-col border bg-card text-card-foreground rounded-lg overflow-hidden
          ${isSplit ? "md:w-1/2 w-full" : "w-full"}
          min-h-[500px] h-full`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-card">
          <Badge variant="outline" className="text-xs font-medium truncate">
            {doc.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => toggleFocus(side)}
            title={isSplit ? "Expand" : "Back to split"}
          >
            {isSplit ? <Maximize2 className="h-3.5 w-3.5" /> : <Columns2 className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Document area — Canvas Rule: white bg, slight dim in dark */}
        <div className="flex-1 min-h-0">
          <DocumentPanel url={doc.url} label={doc.label} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSwapped((s) => !s)}
            className="gap-1.5 text-xs"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Swap
          </Button>

          {!isSplit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusedPanel(null)}
              className="gap-1.5 text-xs"
            >
              <Columns2 className="h-3.5 w-3.5" />
              Split View
            </Button>
          )}
        </div>

        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Panels */}
      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        {renderPanel(docA, "left")}
        {renderPanel(docB, "right")}
      </div>
    </div>
  );
}
