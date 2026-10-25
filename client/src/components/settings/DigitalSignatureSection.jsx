import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/services/authService';
import { SettingSection } from './SettingsShared';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import { toast } from 'sonner';
import { PenTool, CheckCircle2, ShieldCheck, Save, Trash2, FileSignature } from 'lucide-react';

function formatFullName(user) {
  if (!user) return '';
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean);
  return parts.join(' ').trim();
}

export default function DigitalSignatureSection() {
  const { user, fetchUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(!user?.digitalSignature);
  const [signatureDraft, setSignatureDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fullName = formatFullName(user);
  const roleLabel =
    user?.role === 'instructor'
      ? 'Instructor'
      : user?.facultyRole === 'chair'
        ? 'REC / Chair'
        : user?.facultyRole === 'adviser'
          ? 'Capstone Adviser'
          : user?.role === 'student'
            ? 'Proponent'
            : 'Faculty Member';

  const handleSave = async () => {
    if (!signatureDraft) {
      toast.error('Please draw or type your signature before saving.');
      return;
    }

    try {
      setIsSaving(true);
      await userService.updateMe({ digitalSignature: signatureDraft });
      await fetchUser();
      toast.success('Official digital signature saved to your account settings!');
      setIsEditing(false);
      setSignatureDraft(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save digital signature.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await userService.updateMe({ digitalSignature: null });
      await fetchUser();
      toast.success('Digital signature removed.');
      setIsEditing(true);
      setSignatureDraft(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete digital signature.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SettingSection
      icon={PenTool}
      title="Institutional Digital Signature"
      description="Configure and manage your official digital signature. Once saved, you can endorse Action Done Matrices and capstone approval sheets with a single click."
      badge={user?.digitalSignature ? 'Configured' : 'Not Set'}
    >
      <div className="space-y-6">
        {/* State 1: Active Saved Signature Card */}
        {user?.digitalSignature && !isEditing ? (
          <Card className="space-y-6 border-border bg-card/60 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Active Verified Signature
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Ready for one-click Action Done Matrix endorsements and institutional sign-offs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs gap-1.5"
                >
                  <FileSignature className="h-3.5 w-3.5 text-primary" /> Change Signature
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove your digital signature?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the saved signature from your account. You will need to create
                        and save a new signature before using it for Action Done Matrix endorsements
                        or approval sheets.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep signature</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        Remove signature
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Signature Preview Block (Matching Institutional Hierarchy) */}
            <Card className="mx-auto flex max-w-md flex-col items-center justify-center space-y-2 border-border/40 bg-muted/20 p-6">
              <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
                Official Signature Preview
              </span>

              {/* Top: Digital Signature Image */}
              <div className="h-16 flex items-center justify-center">
                <img
                  src={user.digitalSignature}
                  alt="Saved Digital Signature"
                  className="max-h-14 max-w-[260px] object-contain filter drop-shadow-xs"
                />
              </div>

              {/* Middle: Bold Printed Legal Name */}
              <p className="font-bold text-sm uppercase tracking-wide text-foreground">
                {fullName ? String(fullName).toUpperCase() : 'LEGAL FULL NAME'}
              </p>

              {/* Bottom: Horizontal Underline & Designation */}
              <div className="my-0.5 w-full max-w-[240px] border-b border-border" />
              <p className="text-xs text-muted-foreground">
                Signature over Printed Name of {roleLabel}
              </p>

              {/* Verified Stamp */}
              <div className="pt-2">
                <Badge variant="success" className="gap-1 px-2 py-0.5 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Configured in Account
                </Badge>
              </div>
            </Card>
          </Card>
        ) : (
          /* State 2: Signature Pad / Creator */
          <Card className="space-y-4 border-border bg-card/60 p-5">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {user?.digitalSignature ? 'Update Your Signature' : 'Create Your Digital Signature'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Draw your signature on the white canvas below or use the &quot;Type to Sign&quot;
                mode to generate an elegant cursive script.
              </p>
            </div>

            <SignaturePad
              value={user?.digitalSignature || null}
              defaultSignatoryName={fullName}
              onChange={(dataUrl) => setSignatureDraft(dataUrl)}
              onClear={() => setSignatureDraft(null)}
              height={170}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground">
                Your signature is securely stored and exported as a transparent PNG.
              </p>

              <div className="flex items-center gap-2">
                {user?.digitalSignature && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setSignatureDraft(null);
                    }}
                    disabled={isSaving}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !signatureDraft}
                  loading={isSaving}
                  loadingText="Saving..."
                  className="h-8 text-xs gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save Signature
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </SettingSection>
  );
}
