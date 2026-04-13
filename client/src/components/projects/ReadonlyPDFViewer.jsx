import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ScrollText, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';

export default function ReadonlyPDFViewer({ fileUrl, title }) {
  if (!fileUrl) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>No manuscript has been published for this project yet.</AlertDescription>
      </Alert>
    );
  }

  // Prepend #toolbar=0 to disable standard download/print buttons in browsers
  const viewerUrl = fileUrl.includes('#') ? fileUrl : `${fileUrl}#toolbar=0`;

  return (
    <Card className="flex flex-col h-[800px] shadow-sm">
      <CardHeader className="py-4 border-b bg-muted/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          {title || 'Approved Manuscript'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative bg-slate-50">
        {/* Anti-right-click overlay (pointer-events-none won't block scroll but lets events pass to iframe. A generic div catching onContextMenu protects the iframe boundary) */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none" 
          onContextMenu={(e) => e.preventDefault()}
          aria-hidden="true"
        />
        <iframe
          src={viewerUrl}
          title="Manuscript PDF Viewer"
          className="w-full h-full border-0 rounded-b-lg"
          onContextMenu={(e) => e.preventDefault()}
          sandbox="allow-scripts allow-same-origin"
        />
      </CardContent>
    </Card>
  );
}
