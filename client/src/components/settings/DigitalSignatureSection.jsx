import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/services/authService';
import { SettingSection } from './SettingsShared';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  PenTool,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Save,
  Trash2,
  Loader2,
  FileSignature,
} from 'lucide-react';

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
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Remove
                </Button>
              </div>
            </div>

            {/* Signature Preview Block (Matching Institutional Hierarchy) */}
            <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-border/40 rounded-lg max-w-md mx-auto space-y-2">
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
              <div className="w-full max-w-[240px] border-b border-black dark:border-border my-0.5" />
              <p className="text-xs text-muted-foreground">
                Signature over Printed Name of {roleLabel}
              </p>

              {/* Verified Stamp */}
              <div className="pt-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 py-0.5 px-2"
                >
                  <CheckCircle2 className="h-3 w-3" /> Configured in Account
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Signature Pad / Creator */
          <div className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
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
                  className="h-8 text-xs gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" /> Save Signature
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingSection>
  );
}
