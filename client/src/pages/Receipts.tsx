import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function Receipts() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.documents.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation();
  const extractMutation = trpc.documents.extractData.useMutation();
  const updateMutation = trpc.documents.update.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp|gif)$/) && file.type !== 'application/pdf') {
      toast.error('Please upload an image (JPG, PNG, WebP, GIF) or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (!base64) {
          toast.error('Failed to read file');
          return;
        }

        // Upload file
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          fileType: 'receipt',
          mimeType: file.type,
          fileData: base64,
        });

        toast.success('Receipt uploaded successfully');

        // Automatically extract data
        setProcessing(result.id);
        try {
          await extractMutation.mutateAsync({
            documentId: result.id,
            fileUrl: result.url,
          });
          toast.success('Receipt data extracted successfully');
          utils.documents.list.invalidate();
        } catch (error) {
          toast.error('Failed to extract receipt data');
          console.error(error);
        } finally {
          setProcessing(null);
        }

        utils.documents.list.invalidate();
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload receipt');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        status: status as 'pending' | 'processed' | 'verified' | 'rejected',
      });
      toast.success('Status updated');
      utils.documents.list.invalidate();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Receipts & Invoices</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage receipts with AI-powered OCR extraction
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Receipt</CardTitle>
          <CardDescription>
            Drag and drop or click to upload. Supports JPG, PNG, WebP, GIF, and PDF files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
          <CardDescription>
            {documents?.length || 0} receipts uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {doc.provider || doc.fileName}
                      </TableCell>
                      <TableCell className="currency">
                        {doc.currency} {(doc.amount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>{doc.category || '-'}</TableCell>
                      <TableCell>{doc.jurisdiction || '-'}</TableCell>
                      <TableCell>
                        {processing === doc.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs">Processing...</span>
                          </div>
                        ) : (
                          <Select
                            value={doc.status}
                            onValueChange={(value) => handleStatusChange(doc.id, value)}
                          >
                            <SelectTrigger className={`w-32 text-xs status-${doc.status}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processed">Processed</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No receipts uploaded yet</p>
              <p className="text-sm mt-1">Upload your first receipt to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
